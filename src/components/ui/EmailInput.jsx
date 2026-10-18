import React, { useState, useEffect, useRef, useId, forwardRef } from 'react';
import { validateEmail, normalizeEmail, getDomainSuggestion } from '../../utils/email';

/**
 * Reusable, accessible Email Input component
 * - Validates on blur and on submit
 * - Trims whitespace automatically on blur
 * - Dynamically re-validates on change after an error appears (clearing error when fixed)
 * - Accessible inline error (role="alert", aria-invalid, aria-describedby)
 * - Shows interactive "Did you mean ...?" correction for common domain typos
 * - Uses type="text" with inputMode="email" and autoComplete="email"
 */
const EmailInput = forwardRef(function EmailInput(
  {
    value = '',
    onChange,
    onBlur,
    error: externalError,
    onErrorChange,
    required = true,
    placeholder = 'name@university.edu.ph',
    label,
    id,
    name = 'email',
    dataField = 'email',
    className = '',
    disabled = false,
    showIcon = false,
    icon = 'mail',
    ringColor = 'vibrant-orange',
    helpText,
    autoComplete = 'off',
    dataLpignore = 'true'
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;

  const [internalError, setInternalError] = useState(null);
  const [hasErrorState, setHasErrorState] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const localRef = useRef(null);
  const activeRef = ref || localRef;

  // Resolve current active error (external or internal)
  const currentError = externalError !== undefined ? externalError : internalError;

  const updateError = (newError) => {
    setInternalError(newError);
    if (newError) {
      setHasErrorState(true);
    }
    if (onErrorChange) {
      onErrorChange(newError);
    }
  };

  // Check suggestion whenever value changes
  useEffect(() => {
    if (value && typeof value === 'string') {
      const typoCorrection = getDomainSuggestion(value);
      setSuggestion(typoCorrection);
    } else {
      setSuggestion(null);
    }
  }, [value]);

  const handleChange = (e) => {
    const rawVal = e.target.value;
    
    // Call parent onChange
    if (onChange) {
      onChange(e);
    }

    // After an error has appeared, re-validate on every change so it clears as soon as fixed
    if (hasErrorState || currentError) {
      const validationError = validateEmail(rawVal, { required });
      updateError(validationError);
      if (!validationError) {
        setHasErrorState(false);
      }
    }
  };

  const handleBlur = (e) => {
    const rawVal = e.target.value;
    const trimmed = (rawVal || '').trim();

    // Trim whitespace on blur if needed
    if (trimmed !== rawVal) {
      if (onChange) {
        // Create synthetic event or mutate target value
        e.target.value = trimmed;
        onChange(e);
      }
    }

    // Validate on blur
    const validationError = validateEmail(trimmed, { required });
    updateError(validationError);

    // Check typo suggestion
    const typoCorrection = getDomainSuggestion(trimmed);
    setSuggestion(typoCorrection);

    if (onBlur) {
      onBlur(e);
    }
  };

  const handleApplySuggestion = (suggestedEmail) => {
    if (onChange) {
      // Create synthetic event for compatibility with forms expecting e.target.value
      const syntheticEvent = {
        target: { name, value: suggestedEmail, dataset: { field: dataField } },
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      onChange(syntheticEvent);
    }
    setSuggestion(null);
    updateError(null);
    setHasErrorState(false);
    if (activeRef?.current) {
      activeRef.current.focus();
    }
  };

  const hasError = Boolean(currentError);

  const baseInputStyle = hasError
    ? '!border-red-500 !ring-2 !ring-red-500/40 bg-red-50/15 dark:bg-red-950/20 animate-field-shake field-error-glow'
    : `border-outline-variant focus:ring-2 focus:ring-${ringColor} focus:border-${ringColor}`;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {showIcon && (
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">
            {icon}
          </span>
        )}

        <input
          ref={activeRef}
          id={inputId}
          name={name}
          data-field={dataField}
          type="text"
          inputMode="email"
          autoComplete={autoComplete}
          data-lpignore={dataLpignore}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={`w-full ${showIcon ? 'pl-11' : 'px-4'} py-3 rounded-xl border text-sm outline-none transition-all ${baseInputStyle} ${className}`}
        />
      </div>

      {/* Inline accessible error message */}
      {hasError && (
        <div
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-bold mt-1.5 animate-fadeIn"
        >
          <span className="material-symbols-outlined text-[15px] shrink-0 text-red-500">error</span>
          <span>{currentError}</span>
        </div>
      )}

      {/* Did you mean suggestion prompt */}
      {suggestion && (
        <div className="mt-1.5 text-xs text-vibrant-orange font-medium flex items-center gap-1.5 animate-fadeIn">
          <span className="material-symbols-outlined text-[15px] shrink-0">lightbulb</span>
          <span>Did you mean </span>
          <button
            type="button"
            onClick={() => handleApplySuggestion(suggestion)}
            className="font-bold underline hover:text-deep-orange focus:outline-none focus:ring-1 focus:ring-vibrant-orange rounded px-1 transition-colors"
          >
            {suggestion}
          </button>
          <span>?</span>
        </div>
      )}

      {helpText && !hasError && !suggestion && (
        <p className="text-[11px] text-on-surface-variant mt-1">{helpText}</p>
      )}
    </div>
  );
});

export default EmailInput;
