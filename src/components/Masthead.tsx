import { Archive, Clock, WifiOff } from 'lucide-react';
import type { EditionMeta } from '../types/edition';
import { formatCzechDateLong, getRegimeBadgeStyle } from '../utils/format';

interface MastheadProps {
  meta: EditionMeta;
  archiveCount: number;
  isOffline: boolean;
  onOpenArchive: () => void;
}

export function Masthead({
  meta,
  archiveCount,
  isOffline,
  onOpenArchive,
}: MastheadProps) {
  const regimeStyle = getRegimeBadgeStyle(meta.market_regime);

  return (
    <header className="bg-ft-paper">
      <div className="mx-auto max-w-editorial px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* Horní utility pruh */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-ft-border text-xs text-ft-muted">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold uppercase tracking-[0.12em] text-ft-claret">
              Ranní vydání · US Trhy
            </span>
            <span className="hidden sm:inline text-ft-border" aria-hidden="true">
              |
            </span>
            <time
              dateTime={meta.edition_date}
              className="font-medium text-ft-ink"
            >
              {formatCzechDateLong(meta.edition_date)}
            </time>
            {isOffline && (
              <span className="inline-flex items-center gap-1 border border-ft-amber/40 bg-ft-amber-tint px-2 py-0.5 text-[11px] font-medium text-ft-amber">
                <WifiOff className="h-3 w-3" />
                Offline režim
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 font-mono text-[11px] text-ft-muted">
              Vygenerováno {meta.generated_at_cet}
            </span>
            <button
              type="button"
              onClick={onOpenArchive}
              className="inline-flex items-center gap-1.5 border border-ft-ink bg-ft-surface px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ft-ink transition-colors hover:bg-ft-ink hover:text-ft-paper focus:outline-none focus:ring-2 focus:ring-ft-claret"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Archiv</span>
              <span className="font-mono text-[11px] opacity-75">
                ({archiveCount})
              </span>
            </button>
          </div>
        </div>

        {/* Hlavní novinový masthead */}
        <div className="py-5 sm:py-6 text-center">
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tight text-ft-ink leading-none">
            US Market Morning Brief
          </h1>
          <p className="mt-2 font-serif italic text-sm sm:text-base text-ft-muted">
            Strukturovaný redakční souhrn dění na amerických finančních trzích před otevřením Evropy
          </p>
        </div>

        {/* Meta lišta pod názvem vydání */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 border-t border-ft-border text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${regimeStyle.bg} ${regimeStyle.text} ${regimeStyle.border}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${regimeStyle.dot}`} />
              Režim: {meta.market_regime}
            </span>

            <span className="inline-flex items-center gap-1.5 text-ft-muted">
              <Clock className="h-3.5 w-3.5 text-ft-muted" />
              <span>
                Doba čtení:{' '}
                <strong className="font-mono font-semibold text-ft-ink">
                  {meta.reading_time_minutes} min
                </strong>
              </span>
            </span>
          </div>

          <div className="font-mono text-[11px] text-ft-muted md:hidden">
            {meta.generated_at_cet}
          </div>
          <div className="hidden md:block text-[11px] uppercase tracking-[0.14em] text-ft-muted">
            Wall Street · Makro · Watchlist Radar
          </div>
        </div>

        {/* Typická dvojitá FT linka */}
        <div className="ft-double-rule" aria-hidden="true" />
      </div>
    </header>
  );
}
