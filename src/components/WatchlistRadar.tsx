import { useMemo } from 'react';
import {
  ChevronDown,
  Filter,
  Radar,
  Target,
  X,
} from 'lucide-react';
import type {
  Sentiment,
  SignalFilterPreset,
  SignalScore,
  WatchlistUpdate,
} from '../types/edition';
import { getSentimentLabel, getSignalLabel } from '../utils/format';
import { SourceLinkBadge } from './SourceLinkBadge';

interface WatchlistRadarProps {
  updates: WatchlistUpdate[];
  filterPreset: SignalFilterPreset;
  onChangeFilterPreset: (preset: SignalFilterPreset) => void;
  activeTickerFilter: string | null;
  onClearTickerFilter: () => void;
}

function getMinScore(preset: SignalFilterPreset): number {
  switch (preset) {
    case 'critical':
      return 4;
    case 'signal':
      return 3;
    case 'all':
      return 1;
  }
}

function formatHiddenCountCzech(count: number): string {
  if (count === 1) return '1 skrytou zprávu';
  if (count >= 2 && count <= 4) return `${count} skryté zprávy`;
  return `${count} skrytých zpráv`;
}

function getSentimentStyles(sentiment: Sentiment): string {
  switch (sentiment) {
    case 'Bullish':
      return 'bg-ft-positive-tint text-ft-positive border-ft-positive/30';
    case 'Bearish':
      return 'bg-ft-negative-tint text-ft-negative border-ft-negative/30';
    case 'Neutral':
      return 'bg-ft-paper text-ft-muted border-ft-border';
  }
}

function SignalMeter({ score }: { score: SignalScore }) {
  const activeColor =
    score >= 4
      ? 'bg-ft-claret'
      : score === 3
        ? 'bg-ft-ink'
        : 'bg-ft-muted/60';

  return (
    <div
      className="inline-flex items-center gap-1.5"
      title={`Skóre signálu ${score}/5 — ${getSignalLabel(score)}`}
    >
      <div className="flex items-end gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((level) => (
          <span
            key={level}
            className={`w-1.5 transition-colors ${
              level <= score ? activeColor : 'bg-ft-border'
            }`}
            style={{ height: `${8 + level * 2}px` }}
          />
        ))}
      </div>
      <span
        className={`font-mono text-xs font-semibold tabular-nums ${
          score >= 4
            ? 'text-ft-claret'
            : score === 3
              ? 'text-ft-ink'
              : 'text-ft-muted'
        }`}
      >
        {score}/5
      </span>
    </div>
  );
}

export function WatchlistRadar({
  updates,
  filterPreset,
  onChangeFilterPreset,
  activeTickerFilter,
  onClearTickerFilter,
}: WatchlistRadarProps) {
  const sortedUpdates = useMemo(
    () => [...updates].sort((a, b) => b.signal_score - a.signal_score),
    [updates]
  );

  const counts = useMemo(() => {
    const critical = updates.filter((u) => u.signal_score >= 4).length;
    const signal = updates.filter((u) => u.signal_score >= 3).length;
    const noise = updates.filter((u) => u.signal_score <= 2).length;
    return { critical, signal, noise, total: updates.length };
  }, [updates]);

  const minScore = getMinScore(filterPreset);

  const visibleUpdates = useMemo(() => {
    if (activeTickerFilter) {
      return sortedUpdates.filter(
        (u) => u.ticker.toUpperCase() === activeTickerFilter.toUpperCase()
      );
    }
    return sortedUpdates.filter((u) => u.signal_score >= minScore);
  }, [sortedUpdates, minScore, activeTickerFilter]);

  const hiddenNoiseCount = useMemo(() => {
    if (activeTickerFilter || filterPreset === 'all') return 0;
    return updates.filter((u) => u.signal_score <= 2).length;
  }, [updates, filterPreset, activeTickerFilter]);

  const hiddenBelowThresholdCount = useMemo(() => {
    if (activeTickerFilter || filterPreset === 'all') return 0;
    return updates.filter((u) => u.signal_score < minScore).length;
  }, [updates, minScore, filterPreset, activeTickerFilter]);

  const presets: Array<{
    id: SignalFilterPreset;
    label: string;
    count: number;
  }> = [
    { id: 'critical', label: 'Kritické (4–5)', count: counts.critical },
    { id: 'signal', label: 'Signál (3–5)', count: counts.signal },
    { id: 'all', label: 'Vše včetně šumu (1–5)', count: counts.total },
  ];

  return (
    <section
      id="watchlist-radar"
      aria-labelledby="watchlist-radar-heading"
      className="pt-8 border-t-2 border-ft-ink"
    >
      {/* Záhlaví sekce */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radar className="h-4 w-4 text-ft-claret" />
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-ft-claret">
              Watchlist & Sektorový radar
            </span>
          </div>
          <h2
            id="watchlist-radar-heading"
            className="font-serif text-2xl sm:text-3xl font-semibold text-ft-ink"
          >
            Signály podle relevance
          </h2>
        </div>

        {/* Ovládací lišta filtrů */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filtr podle skóre signálu"
        >
          <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-ft-muted mr-1">
            <Filter className="h-3 w-3" />
            Filtr:
          </span>
          {presets.map((preset) => {
            const isActive = !activeTickerFilter && filterPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  if (activeTickerFilter) onClearTickerFilter();
                  onChangeFilterPreset(preset.id);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                  isActive
                    ? 'bg-ft-claret text-white border-ft-claret'
                    : 'bg-ft-surface text-ft-ink border-ft-border hover:border-ft-ink'
                }`}
              >
                {preset.label}{' '}
                <span className="font-mono text-[11px] opacity-80">
                  ({preset.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aktivní filtr konkrétního tickeru (z Lead Story) */}
      {activeTickerFilter && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-ft-claret-tint border border-ft-claret/30 px-3.5 py-2 text-xs">
          <span className="text-ft-ink">
            Filtrováno podle tickeru{' '}
            <strong className="font-mono font-bold text-ft-claret">
              ${activeTickerFilter}
            </strong>
          </span>
          <button
            type="button"
            onClick={onClearTickerFilter}
            className="inline-flex items-center gap-1 font-semibold text-ft-claret hover:text-ft-claret-dark"
          >
            <X className="h-3.5 w-3.5" />
            Zrušit filtr
          </button>
        </div>
      )}

      {/* Seznam karet */}
      {visibleUpdates.length === 0 ? (
        <div className="bg-ft-surface border border-ft-border p-6 text-center">
          <p className="font-serif text-base text-ft-muted">
            {activeTickerFilter
              ? `Pro ticker $${activeTickerFilter} není v tomto vydání žádná samostatná zpráva na watchlistu.`
              : 'V zvoleném pásmu skóre nejsou pro toto vydání žádné položky.'}
          </p>
          {activeTickerFilter && (
            <button
              type="button"
              onClick={onClearTickerFilter}
              className="mt-3 text-xs font-semibold uppercase tracking-wider text-ft-claret underline underline-offset-2"
            >
              Zobrazit všechny signály
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleUpdates.map((item) => {
            const isNoise = item.signal_score <= 2;
            const isCritical = item.signal_score >= 4;

            return (
              <article
                key={`${item.ticker}-${item.headline}`}
                className={`border transition-colors p-4 sm:p-5 ${
                  isNoise
                    ? 'bg-ft-surface/70 border-ft-border opacity-90'
                    : isCritical
                      ? 'bg-ft-card border-ft-ink border-l-[3px] border-l-ft-claret'
                      : 'bg-ft-card border-ft-border'
                }`}
              >
                {/* Hlavička karty: ticker, firma, sektor, sentiment, signal_score */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-ft-border/80">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-ft-ink bg-ft-paper border border-ft-ink/20 px-2 py-0.5">
                      {item.ticker}
                    </span>
                    <span className="text-sm font-semibold text-ft-ink">
                      {item.company_name}
                    </span>
                    <span className="text-ft-border" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-xs text-ft-muted">{item.sector}</span>
                    <span className="hidden sm:inline text-ft-border" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-ft-claret">
                      {item.event_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getSentimentStyles(
                        item.sentiment
                      )}`}
                    >
                      {getSentimentLabel(item.sentiment)}
                    </span>
                    <SignalMeter score={item.signal_score} />
                  </div>
                </div>

                {/* Titulek a analýza */}
                <h3 className="font-serif text-lg sm:text-xl font-semibold text-ft-ink leading-snug mb-2.5">
                  {item.headline}
                </h3>

                <p className="text-sm leading-relaxed text-ft-ink/90 max-w-prose">
                  {item.analysis}
                </p>

                {/* Dopad na investiční tezi */}
                <div className="mt-4 bg-ft-surface border border-ft-border px-3.5 py-2.5 flex items-start gap-2.5">
                  <Target className="h-4 w-4 text-ft-claret flex-none mt-0.5" />
                  <div className="text-xs sm:text-[13px] leading-relaxed">
                    <span className="font-bold uppercase tracking-wider text-ft-ink mr-1.5">
                      Dopad na tezi:
                    </span>
                    <span className="text-ft-ink">{item.thesis_impact}</span>
                  </div>
                </div>

                {/* Zdroje */}
                {item.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-ft-border/60 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                    <span className="text-[11px] uppercase tracking-wider text-ft-muted">
                      Zdroje:
                    </span>
                    {item.sources.map((src) => (
                      <SourceLinkBadge key={src.url} source={src} />
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Decentní tlačítko pod seznamem pro odhalení skrytého šumu (skóre 1–2) */}
      {!activeTickerFilter && hiddenBelowThresholdCount > 0 && (
        <div className="mt-5 pt-4 border-t border-dashed border-ft-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-ft-muted">
            {filterPreset === 'signal'
              ? `Odfiltrováno ${formatHiddenCountCzech(hiddenNoiseCount)} s nízkou informační hodnotou (skóre 1–2).`
              : `Skryto ${formatHiddenCountCzech(hiddenBelowThresholdCount)} se skóre pod 4 (včetně ${hiddenNoiseCount} se šumem 1–2).`}
          </p>
          <button
            type="button"
            onClick={() => onChangeFilterPreset('all')}
            className="inline-flex items-center gap-1.5 border border-ft-border bg-ft-surface px-3.5 py-1.5 text-xs font-medium text-ft-muted hover:border-ft-ink hover:text-ft-ink transition-colors"
          >
            <span>
              {filterPreset === 'signal'
                ? `Zobrazit ${formatHiddenCountCzech(hiddenNoiseCount)} se šumem (skóre 1–2)`
                : `Zobrazit vše včetně šumu (+${hiddenBelowThresholdCount})`}
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}
