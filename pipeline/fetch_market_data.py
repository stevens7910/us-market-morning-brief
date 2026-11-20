"""
Deterministický sběr tržních dat (yfinance) a zpravodajských titulků (RSS)
pro vstupní kontext AI redakce. Nevyžaduje žádné placené API klíče.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any

import feedparser
import requests
import yfinance as yf

from schemas import MarketSnapshotItem

logger = logging.getLogger(__name__)

# Konfigurace tržní lišty (symbol na frontendu, Yahoo ticker, popisek, zda jde o výnos v %)
SNAPSHOT_SPECS: list[tuple[str, str, str, bool]] = [
    ("SPX", "^GSPC", "S&P 500", False),
    ("NDX", "^NDX", "Nasdaq 100", False),
    ("DJI", "^DJI", "Dow Jones", False),
    ("RUT", "^RUT", "Russell 2000", False),
    ("US10Y", "^TNX", "US 10Y Yield", True),
    ("VIX", "^VIX", "CBOE VIX", False),
    ("DXY", "DX-Y.NYB", "US Dollar Index", False),
]

MACRO_RSS_FEEDS: list[tuple[str, str]] = [
    ("CNBC Top News", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114"),
    ("CNBC Markets", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258"),
    ("MarketWatch Top Stories", "https://feeds.content.dowjones.io/public/rss/mw_topstories"),
    ("Yahoo Finance News", "https://finance.yahoo.com/news/rssindex"),
]

USER_AGENT = "USMarketMorningBrief/1.0 (+https://github.com)"


@dataclass
class NewsHeadline:
    source: str
    title: str
    url: str
    published_utc: str
    ticker: str | None = None


@dataclass
class WatchlistQuote:
    ticker: str
    company_name: str
    sector: str
    price: float | None = None
    change_pct: float | None = None
    upcoming_earnings: str | None = None


@dataclass
class MarketContext:
    market_snapshot: list[MarketSnapshotItem] = field(default_factory=list)
    watchlist_quotes: list[WatchlistQuote] = field(default_factory=list)
    macro_headlines: list[NewsHeadline] = field(default_factory=list)
    watchlist_headlines: dict[str, list[NewsHeadline]] = field(default_factory=dict)


def format_czech_number(value: float, decimals: int = 2) -> str:
    """Formátuje číslo v českém stylu (mezera jako oddělovač tisíců, čárka jako desetinná)."""
    formatted = f"{value:,.{decimals}f}"
    return formatted.replace(",", " ").replace(".", ",")


def _get_last_two_closes(yf_ticker: str) -> tuple[float, float] | None:
    try:
        hist = yf.Ticker(yf_ticker).history(period="5d", interval="1d", auto_adjust=False)
        if hist is None or hist.empty:
            return None
        closes = hist["Close"].dropna()
        if len(closes) < 2:
            return None
        prev_close = float(closes.iloc[-2])
        last_close = float(closes.iloc[-1])
        return last_close, prev_close
    except Exception as exc:
        logger.warning("Nepodařilo se stáhnout historii pro %s: %s", yf_ticker, exc)
        return None


def fetch_market_snapshot() -> list[MarketSnapshotItem]:
    """Stáhne poslední uzavřené hodnoty a denní změny pro hlavní US tržní ukazatele."""
    items: list[MarketSnapshotItem] = []

    for symbol, yf_ticker, label, is_yield in SNAPSHOT_SPECS:
        pair = _get_last_two_closes(yf_ticker)
        if pair is None:
            logger.warning("Přeskakuji %s (%s) — chybí data.", symbol, yf_ticker)
            continue

        last_val, prev_val = pair
        if is_yield:
            # ^TNX na Yahoo Finance je přímo v procentech (např. 4.48)
            change_bp = round((last_val - prev_val) * 100.0, 1)
            items.append(
                MarketSnapshotItem(
                    symbol=symbol,
                    label=label,
                    value=f"{format_czech_number(last_val, 2)} %",
                    change_bp=change_bp,
                )
            )
        else:
            change_pct = round(((last_val - prev_val) / prev_val) * 100.0, 2) if prev_val else 0.0
            items.append(
                MarketSnapshotItem(
                    symbol=symbol,
                    label=label,
                    value=format_czech_number(last_val, 2),
                    change_pct=change_pct,
                )
            )

    return items


def fetch_watchlist_quotes(tickers: list[str]) -> list[WatchlistQuote]:
    """Stáhne základní kontext (cena, denní změna, název, sektor) pro tickery z watchlistu."""
    quotes: list[WatchlistQuote] = []

    for raw_ticker in tickers:
        ticker = raw_ticker.strip().upper()
        if not ticker:
            continue

        price: float | None = None
        change_pct: float | None = None
        company_name = ticker
        sector = "Nezařazeno"
        upcoming_earnings: str | None = None

        try:
            tk = yf.Ticker(ticker)
            pair = _get_last_two_closes(ticker)
            if pair is not None:
                last_val, prev_val = pair
                price = round(last_val, 2)
                if prev_val:
                    change_pct = round(((last_val - prev_val) / prev_val) * 100.0, 2)

            info: dict[str, Any] = tk.info or {}
            company_name = info.get("shortName") or info.get("longName") or ticker
            sector = info.get("sector") or "Nezařazeno"

            cal = tk.calendar
            if isinstance(cal, dict) and cal.get("Earnings Date"):
                edates = cal["Earnings Date"]
                if isinstance(edates, list) and edates:
                    upcoming_earnings = str(edates[0])
        except Exception as exc:
            logger.warning("Částečná chyba při načítání metadat pro %s: %s", ticker, exc)

        quotes.append(
            WatchlistQuote(
                ticker=ticker,
                company_name=company_name,
                sector=sector,
                price=price,
                change_pct=change_pct,
                upcoming_earnings=upcoming_earnings,
            )
        )

    return quotes


def _parse_rss_feed(
    url: str,
    source_name: str,
    max_items: int = 8,
    max_age_hours: int = 36,
    ticker: str | None = None,
) -> list[NewsHeadline]:
    headlines: list[NewsHeadline] = []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)

    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=12)
        resp.raise_for_status()
        parsed = feedparser.parse(resp.content)
    except Exception as exc:
        logger.warning("Nepodařilo se načíst RSS %s (%s): %s", source_name, url, exc)
        return headlines

    for entry in parsed.entries:
        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        if not title or not link:
            continue

        published_dt: datetime | None = None
        published_raw = entry.get("published") or entry.get("updated") or ""
        if published_raw:
            try:
                published_dt = parsedate_to_datetime(published_raw)
                if published_dt.tzinfo is None:
                    published_dt = published_dt.replace(tzinfo=timezone.utc)
            except Exception:
                published_dt = None

        if published_dt is not None and published_dt < cutoff:
            continue

        headlines.append(
            NewsHeadline(
                source=source_name,
                title=title,
                url=link,
                published_utc=(
                    published_dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
                    if published_dt
                    else "recent"
                ),
                ticker=ticker,
            )
        )
        if len(headlines) >= max_items:
            break

    return headlines


def fetch_all_context(tickers: list[str]) -> MarketContext:
    """Shromáždí kompletní tržní snapshot, kotace watchlistu a čerstvé RSS titulky."""
    logger.info("Stahuji tržní snapshot (yfinance)...")
    snapshot = fetch_market_snapshot()

    logger.info("Stahuji data pro watchlist (%d tickerů)...", len(tickers))
    quotes = fetch_watchlist_quotes(tickers)

    logger.info("Stahuji makro RSS titulky...")
    macro_headlines: list[NewsHeadline] = []
    seen_titles: set[str] = set()
    for name, url in MACRO_RSS_FEEDS:
        for item in _parse_rss_feed(url, name, max_items=6):
            key = item.title.lower()
            if key not in seen_titles:
                seen_titles.add(key)
                macro_headlines.append(item)

    logger.info("Stahuji RSS titulky pro jednotlivé tickery watchlistu...")
    watchlist_headlines: dict[str, list[NewsHeadline]] = {}
    for raw_ticker in tickers:
        ticker = raw_ticker.strip().upper()
        rss_url = (
            f"https://feeds.finance.yahoo.com/rss/2.0/headline"
            f"?s={ticker}&region=US&lang=en-US"
        )
        watchlist_headlines[ticker] = _parse_rss_feed(
            rss_url,
            source_name=f"Yahoo Finance ({ticker})",
            max_items=5,
            max_age_hours=48,
            ticker=ticker,
        )

    return MarketContext(
        market_snapshot=snapshot,
        watchlist_quotes=quotes,
        macro_headlines=macro_headlines,
        watchlist_headlines=watchlist_headlines,
    )
