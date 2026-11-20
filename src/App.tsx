import { useCallback, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ArchiveDrawer, SidebarArchive } from './components/ArchivePanel';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { LeadStory } from './components/LeadStory';
import { MarketSnapshot } from './components/MarketSnapshot';
import { Masthead } from './components/Masthead';
import { PwaStatusBanner } from './components/PwaStatusBanner';
import { TodayCalendar } from './components/TodayCalendar';
import { WatchlistRadar } from './components/WatchlistRadar';
import { useEditionData } from './hooks/useEditionData';
import type { SignalFilterPreset } from './types/edition';

export default function App() {
  const {
    archiveIndex,
    selectedDate,
    edition,
    loadingIndex,
    loadingEdition,
    error,
    isOffline,
    selectEdition,
    reload,
  } = useEditionData();

  // Výchozí filtr: pouze Signál (skóre 3–5)
  const [filterPreset, setFilterPreset] = useState<SignalFilterPreset>('signal');
  const [activeTickerFilter, setActiveTickerFilter] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);

  const handleSelectEdition = useCallback(
    (date: string) => {
      setActiveTickerFilter(null);
      setFilterPreset('signal');
      selectEdition(date);
    },
    [selectEdition]
  );

  const handleSelectTickerFromLead = useCallback((ticker: string) => {
    setActiveTickerFilter((prev) => (prev === ticker ? null : ticker));
    const radarEl = document.getElementById('watchlist-radar');
    if (radarEl) {
      radarEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (loadingIndex && !edition) {
    return (
      <div className="min-h-screen bg-ft-paper flex flex-col items-center justify-center px-4 text-center">
        <p className="font-serif text-2xl sm:text-3xl font-semibold text-ft-ink">
          US Market Morning Brief
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ft-claret animate-pulse">
          Načítám ranní vydání…
        </p>
      </div>
    );
  }

  if (error && !edition) {
    return (
      <div className="min-h-screen bg-ft-paper flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md bg-ft-card border border-ft-ink border-t-[3px] border-t-ft-claret p-6">
          <h1 className="font-serif text-2xl font-semibold text-ft-ink">
            Vydání se nepodařilo načíst
          </h1>
          <p className="mt-2 text-sm text-ft-muted">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-5 inline-flex items-center gap-2 border border-ft-ink bg-ft-ink text-ft-paper px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-ft-claret hover:border-ft-claret transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  if (!edition) return null;

  return (
    <div className="min-h-screen bg-ft-paper text-ft-ink flex flex-col">
      <PwaStatusBanner isOffline={isOffline} />

      <Masthead
        meta={edition.meta}
        archiveCount={archiveIndex.length}
        isOffline={isOffline}
        onOpenArchive={() => setArchiveOpen(true)}
      />

      <MarketSnapshot items={edition.market_snapshot} />

      {/* Hlavní redakční obsah: desktop 2 sloupce (hlavní tok + boční sloupec), mobil 1 sloupec */}
      <main className="flex-1 mx-auto w-full max-w-editorial px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loadingEdition && (
          <div className="mb-4 border border-ft-border bg-ft-surface px-3 py-1.5 text-xs text-ft-muted">
            Načítám vybrané vydání…
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Levý / hlavní novinový sloupec */}
          <div className="lg:col-span-8 space-y-8 lg:pr-6 lg:border-r lg:border-ft-border">
            <ExecutiveSummary payload={edition.notification_payload} />

            <LeadStory
              story={edition.lead_story}
              activeTickerFilter={activeTickerFilter}
              onSelectTicker={handleSelectTickerFromLead}
            />

            <WatchlistRadar
              updates={edition.watchlist_updates}
              filterPreset={filterPreset}
              onChangeFilterPreset={setFilterPreset}
              activeTickerFilter={activeTickerFilter}
              onClearTickerFilter={() => setActiveTickerFilter(null)}
            />
          </div>

          {/* Pravý boční sloupec: Kalendář a Archiv */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            <TodayCalendar calendar={edition.today_calendar} />

            <SidebarArchive
              items={archiveIndex}
              selectedDate={selectedDate}
              onSelect={handleSelectEdition}
            />
          </aside>
        </div>
      </main>

      {/* Redakční patička */}
      <footer className="mt-12 border-t-2 border-ft-ink bg-ft-surface">
        <div className="mx-auto max-w-editorial px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ft-muted">
          <div className="font-serif text-sm font-semibold text-ft-ink">
            US Market Morning Brief
          </div>
          <div>
            Pouze informační redakční přehled — nepředstavuje investiční doporučení.
          </div>
          <div className="font-mono text-[11px]">
            Vydání {edition.meta.edition_date} · {edition.meta.generated_at_cet}
          </div>
        </div>
      </footer>

      <ArchiveDrawer
        isOpen={archiveOpen}
        items={archiveIndex}
        selectedDate={selectedDate}
        onSelect={handleSelectEdition}
        onClose={() => setArchiveOpen(false)}
      />
    </div>
  );
}
