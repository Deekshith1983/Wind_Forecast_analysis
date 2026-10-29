/**
 * Explicit formatting helpers for numbers, MW capacity, and UTC dates.
 * Fully compatible with Apple Safari and Google Chrome date parsers.
 */

/**
 * Safely parse date strings across all browsers (including Safari on macOS/iOS).
 * Safari fails on space-separated datetime strings like '2026-01-01 00:00:00'.
 */
export function parseDateSafe(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  let s = String(dateStr).trim();
  // Standardize "YYYY-MM-DD HH:mm:ss" to ISO "YYYY-MM-DDTHH:mm:ss"
  if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T');
  }
  // If no timezone indicator is present, explicitly append UTC 'Z' for UK settlement periods
  if (!s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
    s += 'Z';
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
  return d;
}

export function formatMW(val: number | null | undefined, includeSign = false): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const formatted = val.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (includeSign && val > 0) {
    return `+${formatted} MW`;
  }
  return `${formatted} MW`;
}

export function formatNumber(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${val.toFixed(2)}%`;
}

export function formatUTCDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = parseDateSafe(dateStr);
  if (!d) return dateStr;
  try {
    const day = String(d.getUTCDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${mins} UTC`;
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = parseDateSafe(dateStr);
  if (!d) return dateStr;
  try {
    const day = String(d.getUTCDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getUTCMonth()]}`;
  } catch {
    return dateStr;
  }
}

