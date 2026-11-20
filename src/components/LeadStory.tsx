import { ArrowRight, ExternalLink, Layers } from 'lucide-react';
import type { LeadStory as LeadStoryType } from '../types/edition';

interface LeadStoryProps {
  story: LeadStoryType;
  activeTickerFilter: string | null;
  onSelectTicker: (ticker: string) => void;
}

export function LeadStory({
  story,
  activeTickerFilter,
  onSelectTicker,
}: LeadStoryProps) {
  return (
    <article aria-labelledby="lead-story-heading" className="pt-2">
      {/* Sekční štítek */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-ft-claret">
          Hlavní příběh dne
        </span>
        <span className="flex-1 h-px bg-ft-border" aria-hidden="true" />
      </div>

      {/* Velký redakční serifový titulek */}
      <h2
        id="lead-story-heading"
        className="font-serif text-2xl sm:text-4xl font-semibold text-ft-ink leading-[1.15] tracking-tight mb-5"
      >
        {story.title}
      </h2>

      {/* Čtivé odstavce s optimální šířkou řádku */}
      <div className="max-w-prose space-y-4 font-serif text-[17px] sm:text-[18px] leading-[1.72] text-ft-ink">
        {story.summary_paragraphs.map((paragraph, idx) => (
          <p
            key={idx}
            className={idx === 0 ? 'editorial-lead-paragraph' : undefined}
          >
            {paragraph}
          </p>
        ))}
      </div>

      {/* Samostatný vizuálně oddělený box: Efekty druhého řádu */}
      {story.second_order_effects.length > 0 && (
        <div className="mt-7 bg-ft-surface border border-ft-border border-l-[3px] border-l-ft-ink p-5">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-ft-claret" />
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ft-ink">
              Efekty druhého řádu
            </h3>
          </div>
          <ul className="space-y-2.5">
            {story.second_order_effects.map((effect, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-sm leading-relaxed text-ft-ink"
              >
                <ArrowRight className="h-4 w-4 text-ft-claret flex-none mt-0.5" />
                <span>{effect}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Zasažené tickery + Primární zdroje */}
      <div className="mt-6 pt-4 border-t border-ft-border flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Klikatelné štítky zasažených tickerů */}
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-ft-muted mb-2">
            Zasažené tickery (kliknutím filtrujete radar)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {story.affected_tickers.map((ticker) => {
              const isSelected = activeTickerFilter === ticker;
              return (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => onSelectTicker(ticker)}
                  className={`font-mono text-xs font-semibold px-2.5 py-1 border transition-colors ${
                    isSelected
                      ? 'bg-ft-claret text-white border-ft-claret'
                      : 'bg-ft-surface text-ft-ink border-ft-border hover:border-ft-ink hover:bg-ft-wheat'
                  }`}
                >
                  ${ticker}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primární zdroje */}
        {story.sources.length > 0 && (
          <div className="sm:text-right">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-ft-muted mb-2">
              Primární zdroje
            </span>
            <ul className="flex flex-wrap sm:justify-end gap-x-4 gap-y-1.5">
              {story.sources.map((src) => (
                <li key={src.url}>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-ft-claret hover:text-ft-claret-dark underline decoration-ft-claret/40 underline-offset-2"
                  >
                    <span>{src.name}</span>
                    <ExternalLink className="h-3 w-3 flex-none" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
