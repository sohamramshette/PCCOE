/**
 * Formatting Utilities for Environmental Digital Twin
 */

export function formatNumber(val: number | null | undefined, decimals: number = 2): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '—';
  }
  return Number(val).toFixed(decimals);
}

// Canonical analytical period: 2025-02-18 00:00:00 UTC through 2026-09-24 23:00:00 UTC
export const CANONICAL_START_UTC = '2025-02-18T00:00:00Z';
export const CANONICAL_END_UTC = '2026-09-24T23:00:00Z';

/**
 * Normalizes an ISO date string to ensure it is interpreted as UTC.
 * Prevents browser local time zone shifts (e.g. IST +05:30 shifting 18 Feb 00:00 to 17 Feb 18:30).
 */
export function parseUtcDate(isoString?: string | null): Date {
  if (!isoString) return new Date(NaN);
  let s = String(isoString).trim();
  if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T');
  }
  // If string lacks timezone offset (e.g. "2025-02-18T00:00:00"), append 'Z'
  if (!s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
    s = s + 'Z';
  }
  return new Date(s);
}

/**
 * Validates whether an observation timestamp falls strictly within the project's
 * canonical analytical period.
 */
export function isWithinCanonicalPeriod(isoString?: string | null): boolean {
  if (!isoString) return false;
  const d = parseUtcDate(isoString);
  if (isNaN(d.getTime())) return false;
  const start = new Date(CANONICAL_START_UTC).getTime();
  const end = new Date(CANONICAL_END_UTC).getTime();
  return d.getTime() >= start && d.getTime() <= end;
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = parseUtcDate(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString('en-IN', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' UTC';
  } catch {
    return String(isoString);
  }
}

export function formatDateTimeIST(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = parseUtcDate(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' IST';
  } catch {
    return String(isoString);
  }
}

export interface AqiCategory {
  label: string;
  color: string;
  textColor: string;
  bgLight: string;
}

/**
 * Indian National Air Quality Index (NAQI) for PM2.5 (ug/m3)
 */
export function getPm25AqiCategory(pm25: number | null | undefined): AqiCategory {
  if (pm25 === null || pm25 === undefined || isNaN(pm25)) {
    return {
      label: 'No Data',
      color: '#94a3b8',
      textColor: '#cbd5e1',
      bgLight: 'rgba(148, 163, 184, 0.1)',
    };
  }

  if (pm25 <= 30) {
    return {
      label: 'Good',
      color: '#10b981',
      textColor: '#34d399',
      bgLight: 'rgba(16, 185, 129, 0.12)',
    };
  }
  if (pm25 <= 60) {
    return {
      label: 'Satisfactory',
      color: '#84cc16',
      textColor: '#a3e635',
      bgLight: 'rgba(132, 204, 22, 0.12)',
    };
  }
  if (pm25 <= 90) {
    return {
      label: 'Moderate',
      color: '#eab308',
      textColor: '#fde047',
      bgLight: 'rgba(234, 179, 8, 0.12)',
    };
  }
  if (pm25 <= 120) {
    return {
      label: 'Poor',
      color: '#f97316',
      textColor: '#fb923c',
      bgLight: 'rgba(249, 115, 22, 0.12)',
    };
  }
  if (pm25 <= 250) {
    return {
      label: 'Very Poor',
      color: '#ef4444',
      textColor: '#f87171',
      bgLight: 'rgba(239, 68, 68, 0.12)',
    };
  }
  return {
    label: 'Severe',
    color: '#991b1b',
    textColor: '#fca5a5',
    bgLight: 'rgba(153, 27, 27, 0.2)',
  };
}
