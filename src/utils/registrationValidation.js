import { playMissingFieldsAlarm } from './audio';

/**
 * Checks if a value is considered empty for form validation
 */
export function isFieldEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (typeof value === 'number') return isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof File) return false;
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return false;
}

/**
 * Validates a collection of required field definitions.
 * If one or more required fields are missing:
 * - Prevents submission
 * - Plays the audio alert chime
 * - Identifies missing fields
 * - Smoothly scrolls to the first missing field and focuses it
 * 
 * @param {Array<{ key: string, label: string, value: any, customCheck?: (val: any) => boolean, errorMessage?: string }>} fields
 * @returns {{ isValid: boolean, errors: Record<string, string>, missingList: Array<{ key: string, label: string }>, firstMissingKey: string | null }}
 */
export function validateRequiredFields(fields) {
  const errors = {};
  const missingList = [];
  let firstMissingKey = null;

  for (const field of fields) {
    const isEmpty = field.customCheck ? !field.customCheck(field.value) : isFieldEmpty(field.value);

    if (isEmpty) {
      const msg = field.errorMessage || `${field.label} is required.`;
      errors[field.key] = msg;
      missingList.push({ key: field.key, label: field.label });
      if (!firstMissingKey) {
        firstMissingKey = field.key;
      }
    }
  }

  if (missingList.length > 0) {
    // 1. Trigger the alert alarm sound
    playMissingFieldsAlarm();

    // 2. Automatically locate, scroll to, and focus the first missing field
    if (firstMissingKey) {
      scrollToAndFocusField(firstMissingKey);
    }

    return {
      isValid: false,
      errors,
      missingList,
      firstMissingKey
    };
  }

  return {
    isValid: true,
    errors: {},
    missingList: [],
    firstMissingKey: null
  };
}

/**
 * Simple helper: plays alarm, highlights ONE specific field, and scrolls to it.
 * Use for inline client-side checks (e.g. password too short, passwords don't match).
 * 
 * @param {string} fieldKey - The field key (data-field attribute)
 * @param {string} label - Human-readable label
 * @param {string} errorMessage - Error message to display
 * @param {Function} setFieldErrors - React state setter
 * @param {Function} setMissingList - React state setter
 * @param {Function} setError - React state setter for general error
 */
export function setFieldValidationError(fieldKey, label, errorMessage, setFieldErrors, setMissingList, setError) {
  playMissingFieldsAlarm();
  setError(errorMessage);
  setFieldErrors((prev) => ({ ...prev, [fieldKey]: errorMessage }));
  setMissingList([{ key: fieldKey, label }]);
  scrollToAndFocusField(fieldKey);
}

/**
 * Smoothly scrolls to a field and places cursor/focus in it
 */
/**
 * Handles a server-side validation error (e.g. passcode mismatch, ID not found)
 * by playing the alarm, highlighting the relevant field(s), and scrolling to them.
 * 
 * @param {string} serverMessage - The error message returned from the server API
 * @param {Function} setFieldErrors - React state setter for fieldErrors
 * @param {Function} setMissingList - React state setter for missingList
 * @param {Function} setError - React state setter for the general error string
 * @param {Object} [fieldMapping] - Optional mapping of detection keywords to field keys/labels
 */
export function handleServerValidationError(
  serverMessage,
  setFieldErrors,
  setMissingList,
  setError,
  fieldMapping
) {
  const msg = (serverMessage || '').toLowerCase();

  // Default detection rules: map common server error patterns to field keys
  const defaultRules = [
    { patterns: ['access code', 'passcode', 'access_code', 'invalid.*code', 'expired.*code'], key: 'access_code', label: 'Passcode / Access Code' },
    { patterns: ['student id', 'student_number', 'student number'], key: 'student_number', label: 'Student ID' },
    { patterns: ['employee id', 'employee_id', 'staff id', 'staff_number'], key: 'company_employee_id', label: 'Employee ID' },
    { patterns: ['email.*already', 'email.*exist', 'duplicate.*email', 'email.*taken'], key: 'email', label: 'Email' },
    { patterns: ['password.*short', 'password.*weak', 'password.*length'], key: 'password', label: 'Password' }
  ];

  const rules = fieldMapping
    ? Object.entries(fieldMapping).map(([key, { patterns, label }]) => ({ patterns, key, label }))
    : defaultRules;

  const matchedErrors = {};
  const matchedList = [];
  let firstMatchedKey = null;

  for (const rule of rules) {
    const matched = rule.patterns.some((p) => {
      try {
        return new RegExp(p, 'i').test(msg);
      } catch {
        return msg.includes(p);
      }
    });

    if (matched) {
      matchedErrors[rule.key] = serverMessage;
      matchedList.push({ key: rule.key, label: rule.label });
      if (!firstMatchedKey) firstMatchedKey = rule.key;
    }
  }

  // Play alarm and set error state
  playMissingFieldsAlarm();
  setError(serverMessage);

  if (matchedList.length > 0) {
    setFieldErrors((prev) => ({ ...prev, ...matchedErrors }));
    setMissingList(matchedList);
    if (firstMatchedKey) {
      scrollToAndFocusField(firstMatchedKey);
    }
  }
}

export function scrollToAndFocusField(fieldKey) {
  setTimeout(() => {
    // Find candidate element by data-field, id, or name
    const selectors = [
      `[data-field="${fieldKey}"]`,
      `#${fieldKey}`,
      `[name="${fieldKey}"]`,
      `[data-field-container="${fieldKey}"]`
    ];

    let targetElement = null;
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        targetElement = el;
        break;
      }
    }

    if (targetElement) {
      // Smooth scroll into viewport center
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });

      // Find focusable input/select/button inside or focus target itself
      setTimeout(() => {
        let focusable = targetElement;
        if (
          targetElement.tagName !== 'INPUT' &&
          targetElement.tagName !== 'SELECT' &&
          targetElement.tagName !== 'TEXTAREA' &&
          targetElement.tagName !== 'BUTTON'
        ) {
          focusable = targetElement.querySelector('input, select, textarea, button') || targetElement;
        }

        if (focusable && typeof focusable.focus === 'function') {
          try {
            focusable.focus({ preventScroll: true });
          } catch (_) {
            focusable.focus();
          }
        }
      }, 350);
    }
  }, 50);
}
