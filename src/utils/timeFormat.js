/**
 * System-wide Time & Date Formatting Utility for InternConPH
 * Universal Standard: 12-Hour Clock (Standard AM/PM)
 */

export const DEFAULT_TIME_FORMAT = '12h'; // 12-Hour Clock (Standard AM/PM)

export function getTimeFormatPreference() {
  if (typeof window === 'undefined') return DEFAULT_TIME_FORMAT;
  // Always enforce 12-hour AM/PM standard
  const stored = localStorage.getItem('interncon_time_format');
  if (stored === '24h') {
    localStorage.setItem('interncon_time_format', '12h');
  }
  return '12h';
}

export function setTimeFormatPreference(format = '12h') {
  if (typeof window !== 'undefined') {
    localStorage.setItem('interncon_time_format', '12h');
    window.dispatchEvent(new CustomEvent('interncon_time_format_changed', { detail: { format: '12h' } }));
  }
  return '12h';
}

export function parseDateSafe(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);

  const s = String(dateInput).trim();

  // Support standalone time strings e.g. "14:30", "08:15:00", "8:00"
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const parts = s.split(':').map(Number);
    const d = new Date();
    d.setHours(parts[0], parts[1], parts[2] || 0, 0);
    return d;
  }

  if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const isoString = s.replace(' ', 'T');
  const d = new Date(isoString);
  return isNaN(d.getTime()) ? new Date(s) : d;
}

/**
 * Format time to 12-Hour Clock (Standard AM/PM)
 * @param {Date|string|number} dateInput 
 * @param {Object} [options]
 * @param {boolean} [options.showSeconds=false]
 * @returns {string} Formatted time string, e.g. "02:30 PM" or "08:15 AM"
 */
export function formatTime(dateInput, options = {}) {
  const d = parseDateSafe(dateInput);
  if (!d || isNaN(d.getTime())) return '';

  const showSeconds = options.showSeconds !== undefined ? options.showSeconds : false;
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const paddedHours12 = String(hours12).padStart(2, '0');

  return showSeconds
    ? `${paddedHours12}:${minutes}:${seconds} ${period}`
    : `${paddedHours12}:${minutes} ${period}`;
}

/**
 * Format full Date & Time in 12-Hour format (Standard AM/PM)
 * @param {Date|string|number} dateInput 
 * @param {Object} [options]
 * @param {boolean} [options.showSeconds=false]
 * @param {string} [options.dateStyle='short'|'medium'|'full']
 * @returns {string} Formatted date & time, e.g. "Oct 22, 2026, 02:30 PM"
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
 * Standalone 12-Hour time string formatter for table displays and chips
 * @param {string|Date} timeInput e.g. "14:30:00" -> "02:30 PM"
 */
export function formatPHT12Hour(timeInput) {
  if (!timeInput) return '—';
  const formatted = formatTime(timeInput);
  return formatted || String(timeInput);
}
