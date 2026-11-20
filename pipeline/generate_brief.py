"""
Hlavní skript ranní pipeline pro US Market Morning Brief.

1. Načte seznam tickerů z `config/watchlist.json`.
2. Stáhne deterministická tržní data (yfinance) a čerstvé RSS titulky.
3. Zavolá Gemini API (`google-genai` Interactions API s Google Search groundingem
   a striktním JSON schématem dle Pydantic modelů).
4. Zvaliduje kompletní `EditionData`, uloží `public/data/editions/{YYYY-MM-DD}.json`
   a aktualizuje `public/data/index.json`.

Použití:
    python pipeline/generate_brief.py
    python pipeline/generate_brief.py --date 2026-11-20 --model gemini-4-hydrogen
    python pipeline/generate_brief.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import requests
from google import genai

from fetch_market_data import MarketContext, fetch_all_context
from schemas import (
    EditionData,
    EditionIndexItem,
    EditionMeta,
    EditorialGenerationOutput,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent
WATCHLIST_PATH = REPO_ROOT / "config" / "watchlist.json"
DATA_DIR = REPO_ROOT / "public" / "data"
EDITIONS_DIR = DATA_DIR / "editions"
INDEX_PATH = DATA_DIR / "index.json"

DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-4-hydrogen"]
SEC_USER_AGENT = (
    os.environ.get("SEC_USER_AGENT", "").strip()
    or "USMarketMorningBrief brief@example.com"
)
PRAGUE_TZ = ZoneInfo("Europe/Prague")
MAX_ARCHIVE_EDITIONS = 90


SYSTEM_INSTRUCTION = """\
Jsi šéfredaktor a seniorní tržní analytik českého ranního finančního deníku "US Market Morning Brief" \
ve stylu Financial Times (FT). Tvým úkolem je připravit precizní, faktický, analyticky ostrý ranní \
briefing z amerických finančních trhů v přirozené, kultivované češtině.

Zásady redakční kvality:
1. Žádná vata, žádné generické fráze typu "investoři bedlivě sledují". Uváděj konkrétní čísla, příčiny, \
   mechanismy přenosu (sazby -> valuace -> sektory) a efekty druhého řádu.
2. Používej české formátování čísel v textu (desetinná čárka, např. 4,48 %, +0,89 %).
3. Každý ticker ze zadaného watchlistu posuď objektivně podle jeho skutečného zpravodajského významu \
   za posledních 24–48 hodin a přiřaď mu `signal_score` od 1 do 5:
   - 5: Kritická fundamentální událost (výsledky, změna výhledu, M&A, zásadní regulační zásah).
   - 4: Silný signál s přímým dopadem na investiční tezi.
   - 3: Relevantní sektorový nebo firemní signál hodný pozornosti.
   - 2: Slabý rutinní kontext bez dopadu na tezi.
   - 1: Čistý tržní šum nebo bezvýznamná zpráva (pokud o tickeru nejsou žádné zásadní zprávy).
   Buď přísný — nadsazování skóre ničí hodnotu filtru signál/šum!
4. `notification_payload.has_critical_watchlist_event` nastav na `true` POUZE tehdy, pokud má alespoň \
   jedna položka v `watchlist_updates` hodnotu `signal_score` >= 4.
5. V `today_calendar` uveď dnešní důležité americké makroekonomické události (časy převedené do CET/CEST \
   ve formátu HH:MM) a případné dnešní výsledky firem z watchlistu či klíčových tržních lídrů.
6. Vždy používej reálné, existující URL zdrojů z poskytnutých RSS titulků, SEC EDGAR hlášení nebo \
   výsledků vyhledávání. Nikdy si URL nevymýšlej.
7. Pravidla pro oficiální hlášení SEC EDGAR (`sec_filings`):
   - Oficiální hlášení v `sec_filings` ber jako **primární zdroj s nejvyšší prioritou**.
   - **Form 8-K** (zejména položky `1.01` materiální smlouva, `2.02` výsledky, `5.02` změna vedení) \
     spáruj s tržním/zpravodajským kontextem a přiřaď mu téměř vždy `signal_score` 4 nebo 5.
   - **Form 4** (insider obchody) zmiňuj jen tehdy, pokud jde v kontextu zpráv o neobvyklý nebo \
     významný nákup/prodej, jinak ho neřaď mezi vysoký signál.
   - Do pole `sources` u příslušného `watchlist_updates` vždy vlož přímý odkaz na SEC dokument \
     s názvem např. `"SEC EDGAR 8-K"` nebo `"SEC EDGAR Form 4"`.
8. Výstup musí 100% dodržet zadané JSON schéma.
"""


def get_ticker_to_cik_map() -> dict[str, str]:
    """Stáhne veřejný SEC převodník ticker -> 10místný CIK doplněný nulami zleva."""
    url = "https://www.sec.gov/files/company_tickers.json"
    headers = {"User-Agent": SEC_USER_AGENT, "Accept": "application/json"}
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        payload = resp.json()
        mapping: dict[str, str] = {}
        for entry in payload.values():
            ticker = str(entry.get("ticker", "")).strip().upper()
            cik_raw = entry.get("cik_str")
            if ticker and cik_raw is not None:
                mapping[ticker] = str(cik_raw).zfill(10)
        return mapping
    except Exception as exc:
        logger.warning("Nepodařilo se stáhnout SEC company_tickers.json: %s", exc)
        return {}


def fetch_sec_filings(
    watchlist: list[str],
    cutoff_date_str: str,
) -> dict[str, list[dict[str, Any]]]:
    """Stáhne čerstvá SEC EDGAR hlášení (Form 8-K a Form 4) pro tickery z watchlistu."""
    logger.info("Stahuji primární hlášení SEC EDGAR (od %s)...", cutoff_date_str)
    ticker_to_cik = get_ticker_to_cik_map()
    if not ticker_to_cik:
        return {}

    headers = {"User-Agent": SEC_USER_AGENT, "Accept": "application/json"}
    results: dict[str, list[dict[str, Any]]] = {}

    for idx, raw_ticker in enumerate(watchlist):
        ticker = raw_ticker.strip().upper()
        cik = ticker_to_cik.get(ticker)
        if not cik:
            logger.debug("SEC CIK nenalezen pro ticker %s.", ticker)
            continue

        if idx > 0:
            time.sleep(0.15)  # Dodržení SEC rate limitu (max 10 req/s)

        sub_url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        try:
            resp = requests.get(sub_url, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            recent = data.get("filings", {}).get("recent", {})

            forms = recent.get("form", [])
            filing_dates = recent.get("filingDate", [])
            accession_numbers = recent.get("accessionNumber", [])
            primary_docs = recent.get("primaryDocument", [])
            items_list = recent.get("items", [])

            matched: list[dict[str, Any]] = []
            limit = min(30, len(forms), len(filing_dates), len(accession_numbers), len(primary_docs))
            cik_int = int(cik)

            for i in range(limit):
                filing_date = str(filing_dates[i])
                if filing_date < cutoff_date_str:
                    break

                form = str(forms[i]).strip()
                if form not in ("8-K", "4"):
                    continue

                accession_clean = str(accession_numbers[i]).replace("-", "")
                primary_doc = str(primary_docs[i]).strip()
                doc_url = (
                    f"https://www.sec.gov/Archives/edgar/data/"
                    f"{cik_int}/{accession_clean}/{primary_doc}"
                )
                sec_items = items_list[i] if i < len(items_list) else []
                if isinstance(sec_items, str):
                    sec_items = [s.strip() for s in sec_items.split(",") if s.strip()]

                matched.append(
                    {
                        "form": form,
                        "filing_date": filing_date,
                        "sec_items": sec_items,
                        "url": doc_url,
                    }
                )

            if matched:
                results[ticker] = matched
                logger.info("SEC EDGAR %s: nalezeno %d hlášení (8-K / Form 4).", ticker, len(matched))
        except Exception as exc:
            logger.warning("Chyba při stahování SEC hlášení pro %s (CIK %s): %s", ticker, cik, exc)
            continue

    return results


def load_watchlist(path: Path = WATCHLIST_PATH) -> list[str]:
    if not path.exists():
        raise FileNotFoundError(f"Konfigurace watchlistu nenalezena: {path}")
    raw = json.loads(path.read_text(encoding="utf-8"))
    tickers = raw.get("tickers", [])
    if not isinstance(tickers, list) or not tickers:
        raise ValueError(f"Soubor {path} musí obsahovat neprázdné pole 'tickers'.")
    return [str(t).strip().upper() for t in tickers if str(t).strip()]


def build_prompt(
    edition_date: str,
    generated_at_cet: str,
    tickers: list[str],
    ctx: MarketContext,
    sec_filings: dict[str, list[dict[str, Any]]],
) -> str:
    snapshot_lines = [
        f"- {item.label} ({item.symbol}): {item.value} "
        f"({'%+.1f bp' % item.change_bp if item.change_bp is not None else '%+.2f%%' % (item.change_pct or 0.0)})"
        for item in ctx.market_snapshot
    ]

    quote_lines = []
    for q in ctx.watchlist_quotes:
        price_str = f"${q.price:.2f}" if q.price is not None else "N/A"
        chg_str = f"{q.change_pct:+.2f}%" if q.change_pct is not None else "N/A"
        earn_str = f" | nejbližší výsledky: {q.upcoming_earnings}" if q.upcoming_earnings else ""
        quote_lines.append(
            f"- {q.ticker} ({q.company_name}, sektor: {q.sector}): {price_str} ({chg_str}){earn_str}"
        )

    macro_lines = [
        f"- [{h.published_utc}] ({h.source}) {h.title} — {h.url}"
        for h in ctx.macro_headlines[:18]
    ]

    wl_news_blocks: list[str] = []
    for ticker in tickers:
        items = ctx.watchlist_headlines.get(ticker, [])
        if not items:
            wl_news_blocks.append(f"### {ticker}\n- Žádné čerstvé RSS titulky za posledních 48 h (ověř přes Google Search).")
        else:
            lines = [f"- [{h.published_utc}] {h.title} — {h.url}" for h in items]
            wl_news_blocks.append(f"### {ticker}\n" + "\n".join(lines))

    sec_payload_json = json.dumps({"sec_filings": sec_filings}, ensure_ascii=False, indent=2)

    return f"""\
Připrav kompletní ranní vydání **US Market Morning Brief** pro datum **{edition_date}** (generováno v {generated_at_cet}).

Použij poskytnutá tvrdá tržní data, primární SEC EDGAR hlášení (`sec_filings`) a RSS přehled níže, a doplň je \
aktuálním vyhledáním přes nástroj Google Search (zejména pro ověření dnešního US makro kalendáře, výsledkové \
sezóny a nejčerstvějších nočních/after-hours zpráv k tickerům z watchlistu).

## Sledovaný watchlist (vyhodnoť všechny tickery)
{", ".join(tickers)}

## Tržní snapshot (poslední uzávěrka US trhů)
{chr(10).join(snapshot_lines) or "- Data ze snapshotu nebyla dostupná, ověř aktuální uzávěrku přes vyhledávání."}

## Kotace watchlistu
{chr(10).join(quote_lines)}

## Primární hlášení SEC EDGAR (nejvyšší priorita)
```json
{sec_payload_json}
```

## Čerstvé makro & tržní RSS titulky
{chr(10).join(macro_lines) or "- Žádné RSS titulky, vyhledej hlavní dění na US trzích."}

## RSS titulky podle tickerů z watchlistu
{chr(10).join(wl_news_blocks)}

Vygeneruj validní JSON dle schématu `EditorialGenerationOutput`.
"""


def generate_editorial_with_gemini(
    prompt: str,
    model: str,
    enable_search: bool = True,
) -> EditorialGenerationOutput:
    """Zavolá Gemini Interactions API se strukturovaným výstupem, Google Search groundingem
    a automatickým fallbackem na lehčí modely při vyčerpání kvóty (HTTP 429)."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "Chybí proměnná prostředí GEMINI_API_KEY. Nastav ji lokálně nebo v GitHub Secrets."
        )

    client = genai.Client(api_key=api_key)

    # Sestavíme seznam kandidátů: primární model + fallbacky (bez duplicit)
    models_to_try = [model] + [m for m in FALLBACK_MODELS if m != model]
    attempts: list[tuple[str, bool]] = []
    for m in models_to_try:
        if enable_search:
            attempts.append((m, True))
        attempts.append((m, False))

    last_error: Exception | None = None
    for candidate_model, use_search in attempts:
        request_kwargs: dict = {
            "model": candidate_model,
            "system_instruction": SYSTEM_INSTRUCTION,
            "input": prompt,
            "response_format": {
                "type": "text",
                "mime_type": "application/json",
                "schema": EditorialGenerationOutput.model_json_schema(),
            },
            "store": False,
        }
        if use_search:
            request_kwargs["tools"] = [{"type": "google_search"}]

        logger.info(
            "Volám Gemini Interactions API (model=%s, google_search=%s)...",
            candidate_model,
            use_search,
        )
        try:
            interaction = client.interactions.create(**request_kwargs)
            output_text = interaction.output_text
            if not output_text:
                raise RuntimeError(
                    f"Gemini vrátil prázdný výstup (status={getattr(interaction, 'status', 'unknown')})."
                )
            return EditorialGenerationOutput.model_validate_json(output_text)
        except Exception as exc:
            last_error = exc
            err_msg = str(exc)
            is_quota_or_unavailable = any(
                token in err_msg.lower()
                for token in ("429", "too_many_requests", "quota", "not_found", "404", "permission")
            )
            if is_quota_or_unavailable:
                logger.warning(
                    "Model %s (google_search=%s) selhal (%s). Zkouším další variantu...",
                    candidate_model,
                    use_search,
                    type(exc).__name__,
                )
                continue
            raise

    assert last_error is not None
    raise last_error


def update_archive_index(edition: EditionData) -> list[EditionIndexItem]:
    """Vloží nebo aktualizuje záznam vydání v `public/data/index.json`."""
    existing: list[EditionIndexItem] = []
    if INDEX_PATH.exists():
        raw_items = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
        existing = [EditionIndexItem.model_validate(item) for item in raw_items]

    new_item = EditionIndexItem(
        edition_date=edition.meta.edition_date,
        headline=edition.meta.headline,
        market_regime=edition.meta.market_regime,
        affected_tickers=edition.lead_story.affected_tickers,
        has_critical_watchlist_event=edition.notification_payload.has_critical_watchlist_event,
    )

    by_date = {item.edition_date: item for item in existing}
    by_date[new_item.edition_date] = new_item

    sorted_items = sorted(
        by_date.values(),
        key=lambda x: x.edition_date,
        reverse=True,
    )[:MAX_ARCHIVE_EDITIONS]

    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(
        json.dumps([item.model_dump() for item in sorted_items], ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return sorted_items


def save_edition(edition: EditionData) -> Path:
    EDITIONS_DIR.mkdir(parents=True, exist_ok=True)
    target = EDITIONS_DIR / f"{edition.meta.edition_date}.json"
    target.write_text(
        json.dumps(edition.model_dump(exclude_none=True), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description="Generátor ranního vydání US Market Morning Brief.")
    parser.add_argument(
        "--date",
        default=None,
        help="Datum vydání ve formátu YYYY-MM-DD (výchozí: dnešní datum v Europe/Prague).",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Gemini model (výchozí: {DEFAULT_MODEL}).",
    )
    parser.add_argument(
        "--no-search",
        action="store_true",
        help="Vypne Google Search grounding tool (použije pouze RSS + yfinance data).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Pouze stáhne tržní/RSS data a vypíše souhrn bez volání Gemini API a bez zápisu.",
    )
    args = parser.parse_args()

    now_prague = datetime.now(PRAGUE_TZ)
    edition_date = args.date or now_prague.strftime("%Y-%m-%d")
    yesterday_str = (
        datetime.strptime(edition_date, "%Y-%m-%d") - timedelta(days=1)
    ).strftime("%Y-%m-%d")
    tz_abbr = now_prague.tzname() or "CET"
    generated_at_cet = f"{now_prague.strftime('%H:%M')} {tz_abbr}"

    tickers = load_watchlist()
    logger.info("Načten watchlist (%d tickerů): %s", len(tickers), ", ".join(tickers))

    ctx = fetch_all_context(tickers)
    sec_filings = fetch_sec_filings(tickers, yesterday_str)
    prompt = build_prompt(edition_date, generated_at_cet, tickers, ctx, sec_filings)

    if args.dry_run:
        logger.info(
            "DRY-RUN dokončen. Snapshot položek: %d, makro titulků: %d, SEC tickerů s hlášením: %d.",
            len(ctx.market_snapshot),
            len(ctx.macro_headlines),
            len(sec_filings),
        )
        print(prompt[:2500])
        return 0

    editorial = generate_editorial_with_gemini(
        prompt=prompt,
        model=args.model,
        enable_search=not args.no_search,
    )

    # Zajistíme 100% konzistenci příznaku has_critical_watchlist_event s daty
    has_critical = any(u.signal_score >= 4 for u in editorial.watchlist_updates)
    editorial.notification_payload.has_critical_watchlist_event = has_critical

    # Seřadíme watchlist_updates od nejvyššího signal_score
    sorted_updates = sorted(
        editorial.watchlist_updates,
        key=lambda u: u.signal_score,
        reverse=True,
    )

    edition = EditionData(
        meta=EditionMeta(
            edition_date=edition_date,
            generated_at_cet=generated_at_cet,
            market_regime=editorial.market_regime,
            headline=editorial.lead_story.title,
            reading_time_minutes=editorial.reading_time_minutes,
        ),
        notification_payload=editorial.notification_payload,
        market_snapshot=ctx.market_snapshot,
        lead_story=editorial.lead_story,
        watchlist_updates=sorted_updates,
        today_calendar=editorial.today_calendar,
    )

    edition_path = save_edition(edition)
    index_items = update_archive_index(edition)

    logger.info("Uloženo vydání: %s", edition_path)
    logger.info("Aktualizován archiv (%d vydání): %s", len(index_items), INDEX_PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main())
