"""
Pydantic v2 modely, které 100% odpovídají TypeScript rozhraním v `src/types/edition.ts`.
Zajišťují striktní validaci výstupu z Gemini API před uložením do `public/data/`.
"""

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator


SignalScore = Literal[1, 2, 3, 4, 5]
Sentiment = Literal["Bullish", "Bearish", "Neutral"]
MacroImportance = Literal["High", "Medium", "Low"]


class EditionIndexItem(BaseModel):
    edition_date: str = Field(description="Datum vydání ve formátu YYYY-MM-DD.")
    headline: str = Field(description="Hlavní titulek vydání v češtině.")
    market_regime: str = Field(
        description="Krátký anglický název tržního režimu, např. 'Selective Risk-On', 'Risk-Off', 'Cautious / Rates-Driven'."
    )
    affected_tickers: list[str] = Field(
        description="Seznam 3–6 hlavních tickerů zasažených dnešním příběhem."
    )
    has_critical_watchlist_event: bool = Field(
        description="True, pokud má alespoň jedna zpráva na watchlistu signal_score >= 4."
    )


class EditionMeta(BaseModel):
    edition_date: str = Field(description="Datum vydání ve formátu YYYY-MM-DD.")
    generated_at_cet: str = Field(description="Čas vygenerování v CET/CEST, např. '06:42 CET'.")
    market_regime: str = Field(
        description="Krátký název tržního režimu, např. 'Selective Risk-On', 'Cautious / Rates-Driven', 'Risk-Off'."
    )
    headline: str = Field(description="Hlavní titulek dne v češtině (shodný s lead_story.title).")
    reading_time_minutes: int = Field(
        ge=1, le=15, description="Odhadovaná doba čtení v minutách (obvykle 3 až 6)."
    )


class NotificationPayload(BaseModel):
    short_title: str = Field(
        description="Krátký úderný souhrnný titulek pro 30s přehled (max ~80 znaků)."
    )
    top_bullets: list[str] = Field(
        min_length=3,
        max_length=3,
        description="Přesně 3 klíčové odrážky dne v češtině (konkrétní čísla, příčiny a dopady).",
    )
    has_critical_watchlist_event: bool = Field(
        description="True, pokud má alespoň jedna položka v watchlist_updates signal_score >= 4."
    )


class MarketSnapshotItem(BaseModel):
    symbol: str = Field(description="Krátký symbol, např. SPX, NDX, DJI, RUT, US10Y, VIX, DXY.")
    label: str = Field(description="Čitelný název instrumentu, např. 'S&P 500', 'US 10Y Yield'.")
    value: str = Field(description="Naformátovaná hodnota v českém formátu, např. '6 142,80' nebo '4,48 %'.")
    change_pct: Optional[float] = Field(
        default=None, description="Denní procentuální změna (např. 0.42 pro +0,42 %)."
    )
    change_bp: Optional[float] = Field(
        default=None, description="Denní změna v bazických bodech pro výnosy dluhopisů (např. 6.2)."
    )


class SourceLink(BaseModel):
    name: str = Field(description="Název zdroje, např. 'Financial Times — Markets' nebo 'Reuters'.")
    url: str = Field(description="Platná URL adresa zdroje začínající https://.")


class LeadStory(BaseModel):
    title: str = Field(description="Velký redakční titulek hlavního příběhu dne v češtině.")
    summary_paragraphs: list[str] = Field(
        min_length=2,
        max_length=4,
        description="3 čtivé analytické odstavce ve stylu Financial Times v češtině.",
    )
    second_order_effects: list[str] = Field(
        min_length=2,
        max_length=4,
        description="2 až 3 konkrétní efekty druhého řádu na sektory, sazby, měny nebo watchlist.",
    )
    affected_tickers: list[str] = Field(
        min_length=1,
        max_length=8,
        description="Seznam tickerů zasažených hlavním příběhem (VELKÝMI PÍSMENY, bez znaku $).",
    )
    sources: list[SourceLink] = Field(
        min_length=1,
        max_length=5,
        description="Seznam primárních zdrojů s názvem a URL.",
    )

    @field_validator("affected_tickers")
    @classmethod
    def normalize_tickers(cls, tickers: list[str]) -> list[str]:
        return [t.strip().upper().lstrip("$") for t in tickers if t.strip()]


class WatchlistUpdate(BaseModel):
    ticker: str = Field(description="Ticker společnosti VELKÝMI PÍSMENY, např. NVDA.")
    company_name: str = Field(description="Oficiální název společnosti, např. 'NVIDIA Corporation'.")
    sector: str = Field(description="Sektor v češtině, např. 'Polovodiče', 'Energetika / Utility'.")
    signal_score: SignalScore = Field(
        description=(
            "Skóre relevance 1 až 5: "
            "5 = kritická fundamentální událost (výsledky, M&A, zásadní změna výhledu), "
            "4 = silný signál měnící tezi, "
            "3 = relevantní sektorový/firemní signál, "
            "2 = slabý rutinní kontext, "
            "1 = čistý tržní šum."
        )
    )
    sentiment: Sentiment = Field(description="Dopad na akcii: 'Bullish', 'Bearish' nebo 'Neutral'.")
    event_type: str = Field(
        description="Krátký štítek typu události v češtině, např. 'Výsledky & Výhled', 'Regulace', 'Tržní šum'."
    )
    headline: str = Field(description="Stručný redakční titulek události v češtině.")
    analysis: str = Field(
        description="Faktická analýza (2–4 věty) v češtině s konkrétními čísly a kontextem."
    )
    thesis_impact: str = Field(
        description="Jedna až dvě věty hodnotící konkrétní dopad na investiční tezi."
    )
    sources: list[SourceLink] = Field(
        min_length=1,
        max_length=3,
        description="Primární zdroje zprávy.",
    )

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, value: str) -> str:
        return value.strip().upper().lstrip("$")


class MacroEvent(BaseModel):
    time_cet: str = Field(description="Čas zveřejnění v CET/CEST ve formátu HH:MM, např. '14:30'.")
    event: str = Field(description="Název makroekonomické události v češtině (případně s anglickým termínem v závorce).")
    importance: MacroImportance = Field(description="Důležitost pro US trhy: 'High', 'Medium' nebo 'Low'.")
    consensus: str = Field(description="Tržní konsenzus v českém formátu (nebo '—' pokud není k dispozici).")
    previous: str = Field(description="Předchozí hodnota v českém formátu (nebo '—' pokud není k dispozici).")


class WatchlistEarning(BaseModel):
    ticker: str = Field(description="Ticker společnosti VELKÝMI PÍSMENY.")
    timing: str = Field(description="Časování reportu v češtině, např. 'Před otevřením (BMO)' nebo 'Po uzavření (AMC)'.")
    eps_estimate: str = Field(description="Odhadovaný EPS, např. '$1,18' nebo '—'.")

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, value: str) -> str:
        return value.strip().upper().lstrip("$")


class TodayCalendar(BaseModel):
    macro_events: list[MacroEvent] = Field(
        default_factory=list,
        description="Dnešní klíčové makroekonomické události v USA (časy převedené do CET/CEST).",
    )
    watchlist_earnings: list[WatchlistEarning] = Field(
        default_factory=list,
        description="Dnešní výsledky firem ze sledovaného watchlistu nebo hlavních tržních lídrů.",
    )


class EditorialGenerationOutput(BaseModel):
    """
    Schéma, které generuje Gemini (vše kromě deterministického market_snapshot a časových metadat).
    """

    market_regime: str = Field(
        description="Krátký anglický název tržního režimu, např. 'Selective Risk-On', 'Cautious / Rates-Driven', 'Risk-Off'."
    )
    reading_time_minutes: int = Field(
        ge=2, le=10, description="Odhadovaná doba čtení v minutách (obvykle 3 až 5)."
    )
    notification_payload: NotificationPayload
    lead_story: LeadStory
    watchlist_updates: list[WatchlistUpdate] = Field(
        min_length=1,
        description="Aktualizace pro sledované tickery z watchlistu seřazené od nejvyššího signal_score.",
    )
    today_calendar: TodayCalendar


class EditionData(BaseModel):
    """
    Kompletní struktura souboru `public/data/editions/{YYYY-MM-DD}.json`.
    100% odpovídá rozhraní `EditionData` v `src/types/edition.ts`.
    """

    meta: EditionMeta
    notification_payload: NotificationPayload
    market_snapshot: list[MarketSnapshotItem]
    lead_story: LeadStory
    watchlist_updates: list[WatchlistUpdate]
    today_calendar: TodayCalendar
