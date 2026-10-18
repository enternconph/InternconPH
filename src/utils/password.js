/**
 * Password utility functions
 */

/**
 * Calculates password strength score, label, and Tailwind color class.
 * Matches the algorithm used in UserSettingsPage (Change Account Password).
 * 
 * Criteria:
 * - Length >= 8: +1
 * - Length >= 12: +1
 * - Uppercase letter [A-Z]: +1
 * - Number [0-9]: +1
 * - Special character [^A-Za-z0-9]: +1
 * 
 * Rating:
 * - Score <= 1: Weak (20%, bg-red-500)
 * - Score 2-3: Good (60%, bg-amber-500)
 * - Score >= 4: Strong (100%, bg-pinoy-green)
 */
export const getPasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, label: 'None', color: 'bg-outline-variant' };
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 12) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (score <= 1) return { score: 20, label: 'Weak', color: 'bg-red-500' };
  if (score === 2 || score === 3) return { score: 60, label: 'Good', color: 'bg-amber-500' };
  return { score: 100, label: 'Strong', color: 'bg-pinoy-green' };
};
