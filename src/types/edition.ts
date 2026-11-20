export type SignalScore = 1 | 2 | 3 | 4 | 5;

export type Sentiment = 'Bullish' | 'Bearish' | 'Neutral';

export type MacroImportance = 'High' | 'Medium' | 'Low';

export interface EditionIndexItem {
  edition_date: string;
  headline: string;
  market_regime: string;
  affected_tickers: string[];
  has_critical_watchlist_event: boolean;
}

export interface EditionMeta {
  edition_date: string;
  generated_at_cet: string;
  market_regime: string;
  headline: string;
  reading_time_minutes: number;
}

export interface NotificationPayload {
  short_title: string;
  top_bullets: string[];
  has_critical_watchlist_event: boolean;
}

export interface MarketSnapshotItem {
  symbol: string;
  label: string;
  value: string;
  change_pct?: number;
  change_bp?: number;
}

export interface SourceLink {
  name: string;
  url: string;
}

export interface LeadStory {
  title: string;
  summary_paragraphs: string[];
  second_order_effects: string[];
  affected_tickers: string[];
  sources: SourceLink[];
}

export interface WatchlistUpdate {
  ticker: string;
  company_name: string;
  sector: string;
  signal_score: SignalScore;
  sentiment: Sentiment;
  event_type: string;
  headline: string;
  analysis: string;
  thesis_impact: string;
  sources: SourceLink[];
}

export interface MacroEvent {
  time_cet: string;
  event: string;
  importance: MacroImportance;
  consensus: string;
  previous: string;
}

export interface WatchlistEarning {
  ticker: string;
  timing: string;
  eps_estimate: string;
}

export interface TodayCalendar {
  macro_events: MacroEvent[];
  watchlist_earnings: WatchlistEarning[];
}

export interface EditionData {
  meta: EditionMeta;
  notification_payload: NotificationPayload;
  market_snapshot: MarketSnapshotItem[];
  lead_story: LeadStory;
  watchlist_updates: WatchlistUpdate[];
  today_calendar: TodayCalendar;
}

export type SignalFilterPreset = 'critical' | 'signal' | 'all';
