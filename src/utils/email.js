/**
 * Client-side Email Validation and Normalization Utility
 * Standardized across all InternConPH forms and registration portals
 */

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Common domain typos and their correct suggestions
 */
export const DOMAIN_TYPO_MAP = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'outlok.com': 'outlook.com'
};

/**
 * Normalizes an email string:
 * - Returns '' for non-strings
 * - Trims leading and trailing whitespace
 * - Lowercases only the domain portion after the last '@'
 * 
 * @param {any} input 
 * @returns {string}
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
 * Validates whether an email string adheres to structural requirements:
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

/**
 * Suggests a correction if a common domain typo is detected.
 * Returns suggested email string or null if no typo found.
 * 
 * @param {string} email 
 * @returns {string|null}
 */
export function getDomainSuggestion(email) {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim();
  const lastAtIndex = trimmed.lastIndexOf('@');
  if (lastAtIndex === -1) return null;
  const localPart = trimmed.slice(0, lastAtIndex);
  const domainPart = trimmed.slice(lastAtIndex + 1).toLowerCase();
  if (DOMAIN_TYPO_MAP[domainPart]) {
    return `${localPart}@${DOMAIN_TYPO_MAP[domainPart]}`;
  }
  return null;
}

/**
 * Validates an email input for UI form presentation.
 * Returns null if valid, or a user-facing error message string.
 * 
 * @param {any} email 
 * @param {Object} options 
 * @param {boolean} [options.required=true] 
 * @returns {string|null} Error message or null if valid
 */
export function validateEmail(email, { required = true } = {}) {
  if (typeof email !== 'string' || !email.trim()) {
    if (required) return 'Email is required.';
    return null;
  }
  const trimmed = email.trim();
  if (trimmed.length > 254) {
    return 'Email is too long.';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Enter a valid email address, like name@university.edu.ph.';
  }
  return null;
}
