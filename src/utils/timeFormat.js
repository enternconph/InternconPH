/**
 * System-wide Time & Date Formatting Utility for InternConPH
 * Defaults to 24-Hour Clock (Military Time: 00:00 - 23:59)
 */

export const DEFAULT_TIME_FORMAT = '24h'; // '24h' (Military) | '12h' (Standard AM/PM)

export function getTimeFormatPreference() {
  if (typeof window === 'undefined') return DEFAULT_TIME_FORMAT;
  return localStorage.getItem('interncon_time_format') || DEFAULT_TIME_FORMAT;
}

export function setTimeFormatPreference(format) {
  const resolved = format === '12h' ? '12h' : '24h';
  if (typeof window !== 'undefined') {
    localStorage.setItem('interncon_time_format', resolved);
    window.dispatchEvent(new CustomEvent('interncon_time_format_changed', { detail: { format: resolved } }));
  }
  return resolved;
}

export function parseDateSafe(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);

  const s = String(dateInput).trim();
  if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const isoString = s.replace(' ', 'T');
  const d = new Date(isoString);
  return isNaN(d.getTime()) ? new Date(s) : d;
}

/**
 * Format time with the user's preferred format (24h default)
 * @param {Date|string|number} dateInput 
 * @param {Object} [options]
 * @param {boolean} [options.showSeconds=false]
 * @param {string} [options.format] Force '24h' or '12h'
 * @returns {string} Formatted time string, e.g. "14:30:00" or "02:30:00 PM"
 */
export function formatTime(dateInput, options = {}) {
  const d = parseDateSafe(dateInput);
  if (!d || isNaN(d.getTime())) return '';

  const format = options.format || getTimeFormatPreference();
  const is24h = format === '24h';
  const showSeconds = options.showSeconds !== undefined ? options.showSeconds : false;

  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  if (is24h) {
    const hours24 = String(hours).padStart(2, '0');
    return showSeconds ? `${hours24}:${minutes}:${seconds}` : `${hours24}:${minutes}`;
  } else {
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const paddedHours12 = String(hours12).padStart(2, '0');
    return showSeconds
      ? `${paddedHours12}:${minutes}:${seconds} ${period}`
      : `${paddedHours12}:${minutes} ${period}`;
  }
}

/**
 * Format full Date & Time with the user's preferred format (24h default)
 * @param {Date|string|number} dateInput 
 * @param {Object} [options]
 * @param {boolean} [options.showSeconds=false]
 * @param {string} [options.dateStyle='short'|'medium'|'full']
 * @returns {string} Formatted date & time, e.g. "Sep 25, 2026, 14:30"
 */
export function formatDateTime(dateInput, options = {}) {
  const d = parseDateSafe(dateInput);
  if (!d || isNaN(d.getTime())) return '';

  const dateOptions = {
    month: options.dateStyle === 'short' ? 'numeric' : 'short',
    day: 'numeric',
    year: 'numeric'
  };

  const formattedDate = d.toLocaleDateString('en-US', dateOptions);
  const formattedTime = formatTime(d, options);

  return `${formattedDate}, ${formattedTime}`;
}

/**
 * Format timestamp for live clocks or military display tags
 * @param {Date|string|number} dateInput
 * @returns {string} e.g. "1430H" or "14:30:00"
 */
export function formatMilitaryTimeTag(dateInput, withSeconds = true) {
  const d = parseDateSafe(dateInput);
  if (!d || isNaN(d.getTime())) return '';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return withSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}${minutes}H`;
}
