import { useCallback, useEffect, useState } from 'react';
import type { EditionData, EditionIndexItem } from '../types/edition';

interface UseEditionDataReturn {
  archiveIndex: EditionIndexItem[];
  selectedDate: string | null;
  edition: EditionData | null;
  loadingIndex: boolean;
  loadingEdition: boolean;
  error: string | null;
  isOffline: boolean;
  selectEdition: (editionDate: string) => void;
  reload: () => void;
}

function getDateFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const queryDate = params.get('edition');
  if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
    return queryDate;
  }
  const hashMatch = window.location.hash.match(/^#\/?(\d{4}-\d{2}-\d{2})$/);
  return hashMatch ? hashMatch[1] : null;
}

export function useEditionData(): UseEditionDataReturn {
  const [archiveIndex, setArchiveIndex] = useState<EditionIndexItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => getDateFromUrl());
  const [edition, setEdition] = useState<EditionData | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<boolean>(true);
  const [loadingEdition, setLoadingEdition] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [reloadTick, setReloadTick] = useState<number>(0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Načtení seznamu dostupných vydání (./data/index.json)
  useEffect(() => {
    let cancelled = false;

    async function fetchIndex() {
      setLoadingIndex(true);
      setError(null);
      try {
        const res = await fetch('./data/index.json', {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          throw new Error(`Nepodařilo se načíst archiv vydání (HTTP ${res.status}).`);
        }
        const data = (await res.json()) as EditionIndexItem[];
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Archiv vydání je prázdný.');
        }

        const sorted = [...data].sort((a, b) =>
          b.edition_date.localeCompare(a.edition_date)
        );

        if (!cancelled) {
          setArchiveIndex(sorted);
          setSelectedDate((prev) => {
            if (prev && sorted.some((item) => item.edition_date === prev)) {
              return prev;
            }
            return sorted[0].edition_date;
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Nepodařilo se načíst seznam vydání.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingIndex(false);
        }
      }
    }

    void fetchIndex();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  // Načtení konkrétního denního vydání (./data/editions/{YYYY-MM-DD}.json)
  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;

    async function fetchEdition(dateStr: string) {
      setLoadingEdition(true);
      setError(null);
      try {
        const res = await fetch(`./data/editions/${dateStr}.json`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          throw new Error(`Vydání pro datum ${dateStr} nebylo nalezeno (HTTP ${res.status}).`);
        }
        const data = (await res.json()) as EditionData;
        if (!cancelled) {
          setEdition(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : `Nepodařilo se načíst vydání ${dateStr}.`
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingEdition(false);
        }
      }
    }

    void fetchEdition(selectedDate);
    return () => {
      cancelled = true;
    };
  }, [selectedDate, reloadTick]);

  const selectEdition = useCallback((editionDate: string) => {
    setSelectedDate(editionDate);
    const url = new URL(window.location.href);
    url.searchParams.set('edition', editionDate);
    window.history.replaceState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const reload = useCallback(() => {
    setReloadTick((t) => t + 1);
  }, []);

  return {
    archiveIndex,
    selectedDate,
    edition,
    loadingIndex,
    loadingEdition,
    error,
    isOffline,
    selectEdition,
    reload,
  };
}
