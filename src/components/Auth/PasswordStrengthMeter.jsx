import React from 'react';
import { getPasswordStrength } from '../../utils/password';

/**
 * Reusable Password Strength Meter
 * Shows a dynamic bar and label (Weak, Good, Strong) identical to Change Account Password.
 */
export default function PasswordStrengthMeter({ password, className = '' }) {
  if (!password) return null;

  const strength = getPasswordStrength(password);

  return (
    <div className={`mt-2 space-y-1 ${className}`}>
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-on-surface-variant font-medium">Strength:</span>
        <span className="font-bold text-on-surface">{strength.label}</span>
      </div>
      <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${strength.color}`}
          style={{ width: `${strength.score}%` }}
        ></div>
      </div>
    </div>
  );
}
