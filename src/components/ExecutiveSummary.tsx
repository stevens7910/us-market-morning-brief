import { AlertTriangle, Zap } from 'lucide-react';
import type { NotificationPayload } from '../types/edition';

interface ExecutiveSummaryProps {
  payload: NotificationPayload;
}

export function ExecutiveSummary({ payload }: ExecutiveSummaryProps) {
  return (
    <section
      aria-labelledby="executive-summary-heading"
      className="bg-ft-card border border-ft-ink border-t-[3px] border-t-ft-claret p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-ft-border">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-ft-claret" />
          <h2
            id="executive-summary-heading"
            className="text-xs font-bold uppercase tracking-[0.14em] text-ft-claret"
          >
            3 klíčové body dne · 30s přehled
          </h2>
        </div>

        {payload.has_critical_watchlist_event && (
          <span className="inline-flex items-center gap-1.5 bg-ft-claret text-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
            <AlertTriangle className="h-3 w-3" />
            Kritická událost na watchlistu
          </span>
        )}
      </div>

      {payload.short_title && (
        <p className="font-serif text-lg sm:text-xl font-semibold text-ft-ink mb-3.5 leading-snug">
          {payload.short_title}
        </p>
      )}

      <ol className="space-y-3">
        {payload.top_bullets.map((bullet, idx) => (
          <li
            key={idx}
            className="flex items-start gap-3 text-sm sm:text-[15px] leading-relaxed text-ft-ink"
          >
            <span className="font-mono text-xs font-bold text-ft-claret bg-ft-claret-tint border border-ft-claret/20 px-1.5 py-0.5 mt-0.5 flex-none">
              0{idx + 1}
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
