import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff, X } from 'lucide-react';

interface PwaStatusBannerProps {
  isOffline: boolean;
}

export function PwaStatusBanner({ isOffline }: PwaStatusBannerProps) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.warn('Registrace Service Workeru selhala:', error);
    },
  });

  if (!needRefresh && !isOffline) return null;

  return (
    <div className="bg-ft-ink text-ft-paper text-xs border-b border-ft-ink">
      <div className="mx-auto max-w-editorial px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
        {needRefresh ? (
          <>
            <span className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-ft-wheat" />
              Je dostupná nová verze aplikace US Market Morning Brief.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void updateServiceWorker(true)}
                className="bg-ft-claret hover:bg-ft-claret-dark text-white px-2.5 py-1 font-semibold uppercase tracking-wider text-[11px] transition-colors"
              >
                Aktualizovat
              </button>
              <button
                type="button"
                onClick={() => setNeedRefresh(false)}
                aria-label="Zavřít oznámení"
                className="p-1 text-ft-wheat hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <span className="flex items-center gap-2">
            <WifiOff className="h-3.5 w-3.5 text-ft-wheat" />
            Jste offline — zobrazují se dříve stažená vydání z lokální mezipaměti.
          </span>
        )}
      </div>
    </div>
  );
}
