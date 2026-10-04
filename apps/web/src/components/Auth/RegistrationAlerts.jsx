import React from 'react';
import { scrollToAndFocusField } from '../../utils/registrationValidation';

/**
 * Animated banner displayed at the top of registration forms when required fields are missing
 */
export function MissingFieldsBanner({ missingList, onClear }) {
  if (!missingList || missingList.length === 0) return null;

  return (
    <div className="p-4 mb-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-500/60 shadow-lg shadow-red-500/10 text-red-700 dark:text-red-300 animate-field-shake relative overflow-hidden transition-all">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-start gap-3 relative z-10">
        <div className="p-2 bg-red-500 text-white rounded-xl shadow-md shrink-0 mt-0.5 animate-bounce">
          <span className="material-symbols-outlined text-[20px]">notifications_active</span>
        </div>

        <div className="flex-grow">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2 text-red-800 dark:text-red-200">
              <span>Required Information Incomplete</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100">
                {missingList.length} Missing
              </span>
            </h4>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-200 text-xs font-bold p-1"
                title="Dismiss banner"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          <p className="text-xs text-red-600 dark:text-red-300 mt-1 leading-relaxed">
            Please fill in the required field(s) highlighted in red before submitting your registration. Click any badge below to jump directly to that field:
          </p>

          {/* Quick-jump badge chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {missingList.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => scrollToAndFocusField(item.key)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/60 hover:bg-red-200 dark:hover:bg-red-800 text-red-800 dark:text-red-200 text-[11px] font-bold transition-all border border-red-300 dark:border-red-700 active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-[13px]">arrow_downward</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline error message displayed immediately beneath a missing or invalid field
 */
export function FieldErrorMessage({ error }) {
  if (!error) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-bold mt-1.5 animate-fadeIn">
      <span className="material-symbols-outlined text-[15px] shrink-0 text-red-500">error</span>
      <span>{error}</span>
    </div>
  );
}

/**
 * Returns dynamic classes for an input/select/container based on whether it has an error
 */
export function getFieldValidationClass(hasError, baseClass = '', ringColor = 'vibrant-orange') {
  if (hasError) {
    return `${baseClass} !border-red-500 !ring-2 !ring-red-500/40 bg-red-50/15 dark:bg-red-950/20 animate-field-shake field-error-glow`;
  }
  return `${baseClass} border-outline-variant focus:ring-2 focus:ring-${ringColor}`;
}
