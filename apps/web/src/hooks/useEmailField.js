import { useState, useRef, useCallback } from 'react';
import { validateEmail, getDomainSuggestion } from '../utils/email';

/**
 * Reusable hook for email field validation and interaction
 * 
 * @param {Object} options
 * @param {string} [options.initialValue='']
 * @param {boolean} [options.required=true]
 * @param {Function} [options.onValueChange]
 * @returns {Object}
 */
export function useEmailField({ initialValue = '', required = true, onValueChange } = {}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);
  const [hasErrorState, setHasErrorState] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const inputRef = useRef(null);

  const validate = useCallback((valToTest = value) => {
    const trimmed = typeof valToTest === 'string' ? valToTest.trim() : '';
    const err = validateEmail(trimmed, { required });
    setError(err);
    if (err) {
      setHasErrorState(true);
      inputRef.current?.focus();
    } else {
      setHasErrorState(false);
    }
    return !err;
  }, [value, required]);

  const handleChange = useCallback((newVal) => {
    const val = typeof newVal === 'string' ? newVal : newVal?.target?.value ?? '';
    setValue(val);
    if (onValueChange) onValueChange(val);

    // If an error is already displayed, re-validate immediately on change
    if (hasErrorState || error) {
      const err = validateEmail(val.trim(), { required });
      setError(err);
      if (!err) {
        setHasErrorState(false);
      }
    }

    // Dynamic typo suggestion
    const typoSugg = getDomainSuggestion(val);
    setSuggestion(typoSugg);
  }, [hasErrorState, error, required, onValueChange]);

  const handleBlur = useCallback((e) => {
    const rawVal = e?.target?.value !== undefined ? e.target.value : value;
    const trimmed = (rawVal || '').trim();

    if (trimmed !== value) {
      setValue(trimmed);
      if (onValueChange) onValueChange(trimmed);
    }

    const err = validateEmail(trimmed, { required });
    setError(err);
    if (err) {
      setHasErrorState(true);
    }

    const typoSugg = getDomainSuggestion(trimmed);
    setSuggestion(typoSugg);
  }, [value, required, onValueChange]);

  const applySuggestion = useCallback((suggestedVal) => {
    const val = suggestedVal || suggestion;
    if (!val) return;
    setValue(val);
    if (onValueChange) onValueChange(val);
    setSuggestion(null);
    setError(null);
    setHasErrorState(false);
    inputRef.current?.focus();
  }, [suggestion, onValueChange]);

  return {
    value,
    setValue,
    error,
    setError,
    suggestion,
    inputRef,
    validate,
    handleChange,
    handleBlur,
    applySuggestion
  };
}
