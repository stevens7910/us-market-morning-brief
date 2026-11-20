import type { MarketSnapshotItem, Sentiment, SignalScore } from '../types/edition';

/**
 * Formátuje ISO datum YYYY-MM-DD do českého redakčního formátu, např. "Pátek 20. listopadu 2026".
 */
export function formatCzechDateLong(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return isoDate;
  }
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const formatted = new Intl.DateTimeFormat('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Formátuje ISO datum do kompaktního českého formátu, např. "20. 11. 2026".
 */
export function formatCzechDateShort(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return isoDate;
  }
  const [year, month, day] = parts;
  return `${day}. ${month}. ${year}`;
}

/**
 * Formátuje procentuální změnu nebo změnu v bazických bodech v českém stylu (čárka).
 */
export function formatSnapshotChange(item: MarketSnapshotItem): {
  text: string;
  direction: 'up' | 'down' | 'flat';
} {
  if (typeof item.change_bp === 'number') {
    const sign = item.change_bp > 0 ? '+' : '';
    const value = item.change_bp.toFixed(1).replace('.', ',');
    return {
      text: `${sign}${value} bp`,
      direction: item.change_bp > 0 ? 'up' : item.change_bp < 0 ? 'down' : 'flat',
    };
  }

  if (typeof item.change_pct === 'number') {
    const sign = item.change_pct > 0 ? '+' : '';
    const value = item.change_pct.toFixed(2).replace('.', ',');
    return {
      text: `${sign}${value} %`,
      direction: item.change_pct > 0 ? 'up' : item.change_pct < 0 ? 'down' : 'flat',
    };
  }

  return { text: '0,00 %', direction: 'flat' };
}

/**
 * Určuje barevnou třídu pro tržní položku.
 * U VIX a výnosů dluhopisů necháváme standardní barevnou konvenci kladná/záporná změna
 * (kladná = zelená/petrolejová, záporná = červená) pro konzistenci s číselným znaménkem,
 * s výjimkou VIX, kde pokles volatility je pro akciový trh pozitivní.
 */
export function getSnapshotTrendClass(
  symbol: string,
  direction: 'up' | 'down' | 'flat'
): string {
  if (direction === 'flat') return 'text-ft-muted';
  const inverted = symbol.toUpperCase() === 'VIX';
  if (inverted) {
    return direction === 'down' ? 'text-ft-positive' : 'text-ft-negative';
  }
  return direction === 'up' ? 'text-ft-positive' : 'text-ft-negative';
}

/**
 * Vrací styl a popisek pro tržní režim (market_regime).
 */
export function getRegimeBadgeStyle(regime: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const lower = regime.toLowerCase();
  if (lower.includes('risk-off') || lower.includes('bear') || lower.includes('stress')) {
    return {
      bg: 'bg-ft-negative-tint',
      text: 'text-ft-negative',
      border: 'border-ft-negative/30',
      dot: 'bg-ft-negative',
    };
  }
  if (lower.includes('risk-on') || lower.includes('bull') || lower.includes('expansion')) {
    return {
      bg: 'bg-ft-positive-tint',
      text: 'text-ft-positive',
      border: 'border-ft-positive/30',
      dot: 'bg-ft-positive',
    };
  }
  if (lower.includes('cautious') || lower.includes('mixed') || lower.includes('rates')) {
    return {
      bg: 'bg-ft-amber-tint',
      text: 'text-ft-amber',
      border: 'border-ft-amber/30',
      dot: 'bg-ft-amber',
    };
  }
  return {
    bg: 'bg-ft-claret-tint',
    text: 'text-ft-claret',
    border: 'border-ft-claret/30',
    dot: 'bg-ft-claret',
  };
}

export function getSentimentLabel(sentiment: Sentiment): string {
  switch (sentiment) {
    case 'Bullish':
      return 'Býčí';
    case 'Bearish':
      return 'Medvědí';
    case 'Neutral':
      return 'Neutrální';
  }
}

export function getSignalLabel(score: SignalScore): string {
  switch (score) {
    case 5:
      return 'Kritický signál';
    case 4:
      return 'Silný signál';
    case 3:
      return 'Relevantní signál';
    case 2:
      return 'Slabý signál / kontext';
    case 1:
      return 'Tržní šum';
  }
}
