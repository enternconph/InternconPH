/**
 * Standard 12-Hour (AM/PM) Time Formatter for InternConPH Mobile
 */
export function formatTime12(timeInput) {
  if (!timeInput) return '—';
  try {
    const s = String(timeInput).trim();
    if (!s || s === '—') return '—';

    // If it contains AM or PM already, return as is
    if (/AM|PM/i.test(s)) return s;

    const parts = s.split(':');
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    if (isNaN(h)) return s;

    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const mPadded = String(m).padStart(2, '0');
    return `${h12}:${mPadded} ${period}`;
  } catch (_) {
    return String(timeInput);
  }
}

