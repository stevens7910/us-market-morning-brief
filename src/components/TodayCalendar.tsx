import { Calendar, DollarSign } from 'lucide-react';
import type { MacroImportance, TodayCalendar as TodayCalendarType } from '../types/edition';

interface TodayCalendarProps {
  calendar: TodayCalendarType;
}

function ImportanceBadge({ importance }: { importance: MacroImportance }) {
  switch (importance) {
    case 'High':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ft-claret bg-ft-claret-tint border border-ft-claret/30 px-1.5 py-0.5">
          Vysoká
        </span>
      );
    case 'Medium':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ft-amber bg-ft-amber-tint border border-ft-amber/30 px-1.5 py-0.5">
          Střední
        </span>
      );
    case 'Low':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-ft-muted bg-ft-paper border border-ft-border px-1.5 py-0.5">
          Nízká
        </span>
      );
  }
}

export function TodayCalendar({ calendar }: TodayCalendarProps) {
  return (
    <section
      aria-labelledby="today-calendar-heading"
      className="bg-ft-surface border border-ft-border border-t-2 border-t-ft-ink p-4 sm:p-5"
    >
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-ft-border">
        <Calendar className="h-4 w-4 text-ft-claret" />
        <h2
          id="today-calendar-heading"
          className="text-xs font-bold uppercase tracking-[0.14em] text-ft-ink"
        >
          Dnešní kalendář (CET)
        </h2>
      </div>

      {/* Makro události */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ft-muted mb-2.5">
          Makroekonomická data
        </h3>

        {calendar.macro_events.length === 0 ? (
          <p className="text-xs text-ft-muted italic">
            Žádné významné makro události pro dnešní den.
          </p>
        ) : (
          <ul className="divide-y divide-ft-border">
            {calendar.macro_events.map((ev, idx) => (
              <li key={`${ev.time_cet}-${idx}`} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold text-ft-ink tabular-nums">
                    {ev.time_cet} CET
                  </span>
                  <ImportanceBadge importance={ev.importance} />
                </div>
                <p className="text-xs sm:text-[13px] font-medium text-ft-ink leading-snug">
                  {ev.event}
                </p>
                <div className="mt-1.5 flex items-center gap-4 font-mono text-[11px] text-ft-muted">
                  <span>
                    Konsenzus:{' '}
                    <strong className="text-ft-ink font-semibold">
                      {ev.consensus}
                    </strong>
                  </span>
                  <span>
                    Minulý:{' '}
                    <span className="text-ft-ink/80">{ev.previous}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Výsledky firem z watchlistu */}
      <div className="mt-5 pt-4 border-t border-ft-border">
        <div className="flex items-center gap-1.5 mb-2.5">
          <DollarSign className="h-3.5 w-3.5 text-ft-claret" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ft-muted">
            Výsledky na watchlistu
          </h3>
        </div>

        {calendar.watchlist_earnings.length === 0 ? (
          <p className="text-xs text-ft-muted italic">
            Dnes nereportuje žádný sledovaný titul.
          </p>
        ) : (
          <ul className="divide-y divide-ft-border">
            {calendar.watchlist_earnings.map((item) => (
              <li
                key={item.ticker}
                className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-ft-ink mr-2">
                    {item.ticker}
                  </span>
                  <span className="text-[11px] text-ft-muted">{item.timing}</span>
                </div>
                <div className="font-mono text-xs text-ft-ink tabular-nums">
                  <span className="text-[10px] text-ft-muted mr-1">EPS:</span>
                  <strong>{item.eps_estimate}</strong>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
