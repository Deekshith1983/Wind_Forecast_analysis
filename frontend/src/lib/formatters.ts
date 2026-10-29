/**
 * Explicit formatting helpers for numbers, MW capacity, and UTC dates.
 */

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
  try {
    const d = new Date(dateStr);
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
  try {
    const d = new Date(dateStr);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getUTCMonth()]}`;
  } catch {
    return dateStr;
  }
}
