import { useEffect } from 'react';
import { AlertTriangle, Archive, Check, X } from 'lucide-react';
import type { EditionIndexItem } from '../types/edition';
import { formatCzechDateShort, getRegimeBadgeStyle } from '../utils/format';

interface ArchiveListProps {
  items: EditionIndexItem[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

function ArchiveList({ items, selectedDate, onSelect }: ArchiveListProps) {
  return (
    <ul className="divide-y divide-ft-border">
      {items.map((item) => {
        const isCurrent = item.edition_date === selectedDate;
        const regimeStyle = getRegimeBadgeStyle(item.market_regime);

        return (
          <li key={item.edition_date}>
            <button
              type="button"
              onClick={() => onSelect(item.edition_date)}
              className={`w-full text-left py-3 px-2.5 transition-colors ${
                isCurrent
                  ? 'bg-ft-card border-l-[3px] border-l-ft-claret'
                  : 'hover:bg-ft-wheat/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-xs font-semibold text-ft-ink flex items-center gap-1.5">
                  {formatCzechDateShort(item.edition_date)}
                  {isCurrent && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-ft-claret">
                      <Check className="h-3 w-3" />
                      Aktuální
                    </span>
                  )}
                </span>
                {item.has_critical_watchlist_event && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-ft-claret"
                    title="Obsahuje kritickou událost na watchlistu"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Kritické
                  </span>
                )}
              </div>

              <p className="font-serif text-sm font-medium text-ft-ink leading-snug line-clamp-2">
                {item.headline}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${regimeStyle.bg} ${regimeStyle.text} ${regimeStyle.border}`}
                >
                  {item.market_regime}
                </span>
                {item.affected_tickers.slice(0, 4).map((ticker) => (
                  <span
                    key={ticker}
                    className="font-mono text-[10px] text-ft-muted bg-ft-paper border border-ft-border px-1 py-0.5"
                  >
                    {ticker}
                  </span>
                ))}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface SidebarArchiveProps {
  items: EditionIndexItem[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

export function SidebarArchive({
  items,
  selectedDate,
  onSelect,
}: SidebarArchiveProps) {
  return (
    <section
      aria-labelledby="sidebar-archive-heading"
      className="bg-ft-surface border border-ft-border border-t-2 border-t-ft-ink p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-ft-border">
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-ft-claret" />
          <h2
            id="sidebar-archive-heading"
            className="text-xs font-bold uppercase tracking-[0.14em] text-ft-ink"
          >
            Archiv vydání
          </h2>
        </div>
        <span className="font-mono text-[11px] text-ft-muted">
          {items.length} vydání
        </span>
      </div>

      <ArchiveList
        items={items}
        selectedDate={selectedDate}
        onSelect={onSelect}
      />
    </section>
  );
}

interface ArchiveDrawerProps {
  isOpen: boolean;
  items: EditionIndexItem[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
  onClose: () => void;
}

export function ArchiveDrawer({
  isOpen,
  items,
  selectedDate,
  onSelect,
  onClose,
}: ArchiveDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ft-ink/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="relative z-10 w-full max-w-md bg-ft-paper border-l-2 border-ft-ink h-full flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ft-ink bg-ft-surface">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-ft-claret" />
            <h2
              id="archive-drawer-title"
              className="font-serif text-xl font-semibold text-ft-ink"
            >
              Archiv ranních vydání
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavřít archiv"
            className="p-1.5 border border-ft-border text-ft-ink hover:border-ft-ink hover:bg-ft-paper transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          <ArchiveList
            items={items}
            selectedDate={selectedDate}
            onSelect={(date) => {
              onSelect(date);
              onClose();
            }}
          />
        </div>

        <div className="px-5 py-3 border-t border-ft-border bg-ft-surface text-[11px] text-ft-muted">
          Vydání jsou kešována pro offline čtení přes Service Worker (NetworkFirst).
        </div>
      </div>
    </div>
  );
}
