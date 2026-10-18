import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Animated Modal that celebrates and prominently displays a newly generated Workplace Mentor Access Passcode.
 */
export default function MentorPasscodeGeneratedModal({
  isOpen,
  onClose,
  data, // { access_code, target_identifier, department, organization_name, expires_at }
  onGenerateAnother
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCopiedCode(false);
      setCopiedInvite(false);
    }
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const accessCode = data.access_code || '';
  const identifier = data.target_identifier || '';
  const department = data.department || 'All Programs / General Supervision';
  const orgName = data.organization_name || 'Organization Partner';

  const formatExpiry = (exp) => {
    if (!exp) return '14 days';
    const d = new Date(exp);
    if (isNaN(d.getTime())) return exp;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleCopyCode = () => {
    if (!accessCode) return;
    navigator.clipboard.writeText(accessCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyInvite = () => {
    const registerUrl = `${window.location.origin}/register/mentor`;
    const inviteText = `🏢 INTERNCONPH — WORKPLACE MENTOR INVITATION
--------------------------------------------------
You have been invited by ${orgName} HR to register as a Workplace Mentor on internconPH.

🆔 Required Identifier (Employee ID or Email): ${identifier}
🔑 Access Passcode: ${accessCode}
🏛️ Assigned Department / Program: ${department}
⏳ Passcode Valid Until: ${formatExpiry(data.expires_at)}

🔗 Registration Link: ${registerUrl}

Quick Registration Steps:
1. Open the registration link above.
2. Enter your Access Passcode [${accessCode}] and Identifier [${identifier}].
3. Complete your mentor profile and submit for HR verification.
--------------------------------------------------`;

    navigator.clipboard.writeText(inviteText);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 3000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto custom-scrollbar">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="relative w-full max-w-lg bg-surface rounded-3xl shadow-[0_25px_60px_-15px_rgba(255,107,0,0.35)] border border-outline-variant overflow-hidden z-10 my-8"
        >
          {/* Animated Glowing Top Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-vibrant-orange to-deep-orange animate-pulse" />

          {/* Header with Sparkle Badge */}
          <div className="pt-7 pb-3 px-6 text-center relative overflow-hidden">
            {/* Background Decorative Sparkles */}
            <div className="absolute top-2 left-1/4 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping opacity-60" />
            <div className="absolute top-7 right-1/4 w-3 h-3 rounded-full bg-vibrant-orange animate-pulse opacity-70" />
            <div className="absolute top-4 right-8 w-2 h-2 rounded-full bg-pinoy-green animate-ping opacity-50" />

            {/* Radiant Key Badge with Bounce */}
            <div className="relative inline-flex items-center justify-center mb-3">
              <div className="absolute -inset-3 rounded-3xl bg-vibrant-orange/25 filter blur-lg animate-pulse" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-vibrant-orange to-deep-orange flex items-center justify-center text-white shadow-lg shadow-vibrant-orange/40 relative transform hover:rotate-6 transition-transform">
                <span className="material-symbols-outlined text-[34px] animate-bounce">
                  vpn_key
                </span>
              </div>
              <span className="material-symbols-outlined text-amber-400 text-[20px] absolute -top-1 -right-2 animate-spin duration-1000">
                auto_awesome
              </span>
            </div>

            <h2 className="text-2xl font-black text-on-surface tracking-tight">
              Mentor Passcode Generated!
            </h2>
            <p className="text-xs text-on-surface-variant mt-1 max-w-xs mx-auto">
              Official HR authorization passcode is active. Share this code with your workplace mentor to complete their registration.
            </p>
          </div>

          {/* Main Passcode Showcase Box */}
          <div className="px-6 py-2">
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-surface-container border-2 border-dashed border-vibrant-orange/60 relative group shadow-inner">
              <div className="flex items-center justify-between text-[11px] font-bold text-vibrant-orange uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">verified_user</span>
                  Official Mentor Passcode
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-vibrant-orange text-white font-bold animate-pulse">
                  Ready to Issue
                </span>
              </div>

              {/* Code Display */}
              <div className="flex items-center justify-between gap-2 py-2">
                <span className="font-mono text-2xl sm:text-3xl font-black text-on-surface tracking-widest select-all break-all">
                  {accessCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                    copiedCode
                      ? 'bg-pinoy-green text-white shadow-pinoy-green/30'
                      : 'bg-vibrant-orange hover:bg-deep-orange text-white shadow-vibrant-orange/30'
                  }`}
                  title="Copy Passcode to Clipboard"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedCode ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="text-[11px] text-on-surface-variant/80 border-t border-outline-variant/40 pt-2.5 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-vibrant-orange">badge</span>
                  <span>Must match Employee ID or Email upon registration.</span>
                </span>
                <span className="font-semibold text-vibrant-orange">Expires: {formatExpiry(data.expires_at)}</span>
              </div>
            </div>
          </div>

          {/* Passcode Assignment Details */}
          <div className="px-4 sm:px-6 py-2 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Designated Identifier
                </span>
                <span className="font-mono font-bold text-on-surface text-xs mt-0.5 block truncate" title={identifier}>
                  {identifier}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Intended Position
                </span>
                <span className="font-bold text-on-surface text-xs mt-0.5 block truncate">
                  Workplace Mentor / Supervisor
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="text-[11px] font-bold text-on-surface-variant">Assigned Department / OJT Program:</span>
              <span className="font-bold text-on-surface truncate text-right">{department}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 sm:p-6 bg-surface-container-lowest border-t border-outline-variant/60 space-y-2">
            <button
              type="button"
              onClick={handleCopyInvite}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-xs ${
                copiedInvite
                  ? 'bg-pinoy-green text-white border-pinoy-green shadow-pinoy-green/30'
                  : 'bg-surface hover:bg-surface-container text-on-surface border-outline-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {copiedInvite ? 'check_circle' : 'forward_to_inbox'}
              </span>
              <span>{copiedInvite ? 'Invitation Copied to Clipboard!' : 'Copy Full Mentor Invitation'}</span>
            </button>

            <div className="flex gap-2">
              {onGenerateAnother && (
                <button
                  type="button"
                  onClick={onGenerateAnother}
                  className="flex-1 py-2.5 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>+ Generate Another</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-vibrant-orange hover:bg-deep-orange text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Done & View Mentors</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
