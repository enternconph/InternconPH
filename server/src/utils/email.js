/**
 * Server-side Email Validation and Normalization Utility
 * Standardized across all InternConPH backend services
 */

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Normalizes an email string:
 * - Returns '' for non-strings
 * - Trims leading and trailing whitespace
 * - Lowercases only the part after the last "@" (preserving local part casing)
 * 
 * @param {any} input 
 * @returns {string} Normalized email string
 */
export function normalizeEmail(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  const lastAtIndex = trimmed.lastIndexOf('@');
  if (lastAtIndex === -1) return trimmed;
  const localPart = trimmed.slice(0, lastAtIndex);
  const domainPart = trimmed.slice(lastAtIndex + 1).toLowerCase();
  return `${localPart}@${domainPart}`;
}

/**
 * Validates whether an email string is structurally valid:
 * - Must be a non-empty string
 * - Max length of 254 characters
 * - Must match EMAIL_REGEX
 * 
 * @param {any} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}
