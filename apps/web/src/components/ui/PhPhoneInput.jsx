import React, { useState, useEffect, useId } from 'react';

/**
 * Validates whether a string is a valid Philippine mobile number.
 * Formats supported: +63 9XX XXX XXXX, 09XXXXXXXXX, +639XXXXXXXXX, 9XXXXXXXXX
 */
export function isValidPhMobile(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  // Matches 10 digits starting with 9, 11 digits starting with 09, or 12 digits starting with 639
  if (digits.length === 10 && digits.startsWith('9')) return true;
  if (digits.length === 11 && digits.startsWith('09')) return true;
  if (digits.length === 12 && digits.startsWith('639')) return true;
  return false;
}

/**
 * Validates whether a string is a valid Philippine landline number.
 * Typically 8 digits (Metro Manila Area 02) or 7 digits (Provincial Area 0XX)
 */
export function isValidPhLandline(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  // 63 + area code + local (e.g. 63 2 8123 4567 = 11 digits, or 63 32 123 4567 = 11 digits)
  // or national 02 8123 4567 (10 digits) or provincial 0XX 123 4567 (10 digits)
  if (digits.length >= 8 && digits.length <= 12) return true;
  return false;
}

/**
 * Validates Philippine phone (mobile or landline).
 */
export function isValidPhPhone(phone, allowLandline = false) {
  if (!phone) return false;
  if (isValidPhMobile(phone)) return true;
  if (allowLandline && isValidPhLandline(phone)) return true;
  return false;
}

/**
 * Normalizes input to canonical Philippine display format: "+63 9XX XXX XXXX"
 */
export function normalizePhMobile(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(0, 10);
  if (digits.length === 0) return '';
  
  if (digits.length <= 3) return `+63 ${digits}`;
  if (digits.length <= 6) return `+63 ${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

/**
 * Extracts raw 10 digits (without +63/0) for clean input editing.
 */
function extractMobileDigits(value) {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/**
 * Format raw 10 digits as "9XX XXX XXXX"
 */
function formatMobileDisplay(digits) {
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

/**
 * Modern, accessible Philippine Phone Input Component
 * Adheres to NTC standards: +63 9XX XXX XXXX
 */
export default function PhPhoneInput({
  value = '',
  onChange,
  required = false,
  label = 'Contact Phone',
  placeholder = '917 123 4567',
  allowLandline = false,
  error: externalError = '',
  disabled = false,
  name = 'phone',
  id,
  className = ''
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  // Determine initial mode (mobile vs landline)
  const isInitialLandline = allowLandline && value && !isValidPhMobile(value) && isValidPhLandline(value);
  const [phoneType, setPhoneType] = useState(isInitialLandline ? 'landline' : 'mobile');

  // Track raw user input
  const [mobileDigits, setMobileDigits] = useState(() => extractMobileDigits(value));
  const [landlineNumber, setLandlineNumber] = useState(() => (isInitialLandline ? value : ''));
  const [touched, setTouched] = useState(false);

  // Sync state if external value changes drastically
  useEffect(() => {
    if (phoneType === 'mobile') {
      const currentCanonical = mobileDigits ? `+63 ${formatMobileDisplay(mobileDigits)}` : '';
      if (value !== currentCanonical) {
        setMobileDigits(extractMobileDigits(value));
      }
    } else {
      if (value !== landlineNumber) {
        setLandlineNumber(value || '');
      }
    }
  }, [value, phoneType]);

  const handleMobileChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '');

    // Handle user pasting with 63 or 09
    if (raw.startsWith('639')) {
      raw = raw.slice(2);
    } else if (raw.startsWith('09')) {
      raw = raw.slice(1);
    } else if (raw.startsWith('0') && raw.length > 1) {
      raw = raw.slice(1);
    }

    // Limit to 10 digits
    const cleaned = raw.slice(0, 10);
    setMobileDigits(cleaned);
    setTouched(true);

    if (cleaned.length === 0) {
      onChange('');
    } else {
      // Store in canonical international Philippine format "+63 9XX XXX XXXX"
      onChange(`+63 ${formatMobileDisplay(cleaned)}`);
    }
  };

  const handleLandlineChange = (e) => {
    const raw = e.target.value;
    setLandlineNumber(raw);
    setTouched(true);
    onChange(raw);
  };

  const switchType = (newType) => {
    setPhoneType(newType);
    setTouched(false);
    if (newType === 'mobile') {
      onChange(mobileDigits ? `+63 ${formatMobileDisplay(mobileDigits)}` : '');
    } else {
      onChange(landlineNumber || '');
    }
  };

  // Validation feedback
  const isMobileValid = mobileDigits.length === 10 && mobileDigits.startsWith('9');
  const isMobileIncomplete = mobileDigits.length > 0 && mobileDigits.length < 10;
  const isInvalidPrefix = mobileDigits.length > 0 && !mobileDigits.startsWith('9');
  const isLandlineValid = isValidPhLandline(landlineNumber);

  let validationError = externalError;
  if (!validationError && touched) {
    if (required && ((phoneType === 'mobile' && !mobileDigits) || (phoneType === 'landline' && !landlineNumber))) {
      validationError = 'Philippine phone number is required.';
    } else if (phoneType === 'mobile') {
      if (isInvalidPrefix) {
        validationError = 'Philippine mobile numbers must start with 9 (e.g. 917 123 4567).';
      } else if (isMobileIncomplete) {
        validationError = `Incomplete mobile number (${10 - mobileDigits.length} more digits needed).`;
      }
    } else if (phoneType === 'landline') {
      if (landlineNumber && !isLandlineValid) {
        validationError = 'Please enter a valid Philippine landline number with area code (e.g. 02 8123 4567).';
      }
    }
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          {label} {required && <span className="text-error font-bold">*</span>}
        </label>

        {allowLandline && (
          <div className="flex items-center gap-1 text-[11px] bg-surface-container-high p-0.5 rounded-lg border border-outline-variant/40">
            <button
              type="button"
              onClick={() => switchType('mobile')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                phoneType === 'mobile'
                  ? 'bg-vibrant-orange text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              📱 Mobile
            </button>
            <button
              type="button"
              onClick={() => switchType('landline')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                phoneType === 'landline'
                  ? 'bg-vibrant-orange text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              ☎️ Landline
            </button>
          </div>
        )}
      </div>

      <div className="relative flex items-center">
        {/* Philippines Flag & Calling Code Badge */}
        <div className="absolute left-1 top-1 bottom-1 flex items-center gap-1.5 px-2.5 bg-surface-container-high/80 border-r border-outline-variant/50 rounded-l-lg text-xs font-bold text-on-surface select-none pointer-events-none">
          <span className="text-base" role="img" aria-label="Philippines Flag">🇵🇭</span>
          <span className="text-vibrant-orange font-mono font-bold">+63</span>
        </div>

        {/* Input */}
        {phoneType === 'mobile' ? (
          <input
            id={inputId}
            name={name}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            disabled={disabled}
            required={required}
            value={formatMobileDisplay(mobileDigits)}
            onChange={handleMobileChange}
            onBlur={() => setTouched(true)}
            placeholder={placeholder}
            maxLength={12} // "9XX XXX XXXX" is 12 chars with spaces
            className={`w-full pl-[82px] pr-9 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm font-medium tracking-wide outline-none transition-all placeholder:text-on-surface-variant/40 ${
              validationError
                ? 'border-error focus:ring-2 focus:ring-error/40 focus:border-error'
                : isMobileValid
                ? 'border-pinoy-green focus:ring-2 focus:ring-pinoy-green/40 focus:border-pinoy-green'
                : 'border-outline-variant focus:ring-2 focus:ring-vibrant-orange focus:border-vibrant-orange'
            }`}
          />
        ) : (
          <input
            id={inputId}
            name={name}
            type="tel"
            disabled={disabled}
            required={required}
            value={landlineNumber}
            onChange={handleLandlineChange}
            onBlur={() => setTouched(true)}
            placeholder="e.g. 02 8123 4567 or 032 123 4567"
            maxLength={20}
            className={`w-full pl-[82px] pr-9 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm font-medium tracking-wide outline-none transition-all placeholder:text-on-surface-variant/40 ${
              validationError
                ? 'border-error focus:ring-2 focus:ring-error/40 focus:border-error'
                : isLandlineValid
                ? 'border-pinoy-green focus:ring-2 focus:ring-pinoy-green/40 focus:border-pinoy-green'
                : 'border-outline-variant focus:ring-2 focus:ring-vibrant-orange focus:border-vibrant-orange'
            }`}
          />
        )}

        {/* Status Indicator Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          {phoneType === 'mobile' && isMobileValid && (
            <span className="material-symbols-outlined text-pinoy-green text-[18px]" title="Valid Philippine Mobile">
              check_circle
            </span>
          )}
          {phoneType === 'landline' && isLandlineValid && (
            <span className="material-symbols-outlined text-pinoy-green text-[18px]" title="Valid Philippine Landline">
              check_circle
            </span>
          )}
          {validationError && (
            <span className="material-symbols-outlined text-error text-[18px]" title="Invalid Philippine Phone Number">
              error
            </span>
          )}
        </div>
      </div>

      {/* Validation or Helper Message */}
      {validationError ? (
        <p className="text-[11px] font-medium text-error flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-[13px]">warning</span>
          {validationError}
        </p>
      ) : isMobileValid ? (
        <p className="text-[11px] font-medium text-pinoy-green flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-[13px]">verified</span>
          Valid Philippine mobile number (+63 {formatMobileDisplay(mobileDigits)})
        </p>
      ) : (
        <p className="text-[11px] text-on-surface-variant/70 flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-[13px]">info</span>
          {phoneType === 'mobile'
            ? 'Philippine mobile standard: 10 digits starting with 9 (e.g., +63 917 123 4567)'
            : 'Philippine landline standard: area code + local number (e.g. 02 8123 4567)'}
        </p>
      )}
    </div>
  );
}
