import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { MarketSnapshotItem } from '../types/edition';
import { formatSnapshotChange, getSnapshotTrendClass } from '../utils/format';

interface MarketSnapshotProps {
  items: MarketSnapshotItem[];
}

export function MarketSnapshot({ items }: MarketSnapshotProps) {
  if (!items.length) return null;

  return (
    <section
      aria-label="Přehled amerických trhů"
      className="bg-ft-surface border-b border-ft-ink"
    >
      <div className="mx-auto max-w-editorial px-4 sm:px-6 lg:px-8">
        <div className="flex items-stretch overflow-x-auto no-scrollbar divide-x divide-ft-border -mx-4 px-4 sm:mx-0 sm:px-0">
          {items.map((item) => {
            const { text, direction } = formatSnapshotChange(item);
            const trendClass = getSnapshotTrendClass(item.symbol, direction);

            return (
              <div
                key={item.symbol}
                className="flex-none min-w-[148px] sm:min-w-[162px] lg:flex-1 py-2.5 px-3 first:pl-0 last:pr-0 flex flex-col justify-between gap-0.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ft-muted truncate">
                    {item.label}
                  </span>
                  <span className="font-mono text-[10px] text-ft-muted/80">
                    {item.symbol}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-ft-ink tabular-nums">
                    {item.value}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 font-mono text-xs font-medium tabular-nums ${trendClass}`}
                  >
                    {direction === 'up' && <TrendingUp className="h-3 w-3" />}
                    {direction === 'down' && <TrendingDown className="h-3 w-3" />}
                    {direction === 'flat' && <Minus className="h-3 w-3" />}
                    {text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
