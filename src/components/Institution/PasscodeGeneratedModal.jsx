import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Animated Modal that celebrates and prominently reveals a newly generated Staff Passcode.
 */
export default function PasscodeGeneratedModal({
  isOpen,
  onClose,
  data, // { access_code, staff_number, position, program_name, intended_email, expires_at, permissions }
  onViewLedger
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
  const staffNumber = data.staff_number || '';
  const positionLabel = (() => {
    switch (data.position) {
      case 'ojt_supervisor': return 'OJT Supervisor / Adviser';
      case 'registrar': return 'Registrar';
      case 'guidance_counselor': return 'Guidance Counselor';
      case 'dean': return 'College Dean';
      default: return data.position || 'Staff Coordinator';
    }
  })();

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
    const registerUrl = `${window.location.origin}/register/staff`;
    const inviteDeptOrProg = data.intended_department
      ? `🏛️ Assigned Academic Department: ${data.intended_department} (All Department Programs)\n`
      : data.program_name
      ? `📚 Assigned Program: ${data.program_name}\n`
      : '🌐 Assigned Scope: All Programs / Institution-Wide\n';

    const inviteText = `🏛️ INTERNCONPH — DIRECTOR STAFF INVITATION
--------------------------------------------------
You have been invited by the Institution Director to register as a Faculty Coordinator on internconPH.

📋 Assigned Position: ${positionLabel}
🆔 Required Staff ID: ${staffNumber}
🔑 Director Passcode: ${accessCode}
⏳ Valid Until: ${formatExpiry(data.expires_at)}
${inviteDeptOrProg}🔗 Registration Link: ${registerUrl}

Instructions:
1. Open the registration link above.
2. Enter your Director Passcode [${accessCode}] and Staff ID [${staffNumber}].
3. Complete your account details to activate your coordinator dashboard.
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
          className="relative w-full max-w-lg bg-surface rounded-3xl shadow-[0_25px_60px_-15px_rgba(255,107,0,0.3)] border border-outline-variant overflow-hidden z-10 my-8"
        >
          {/* Animated Glowing Top Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-vibrant-orange to-deep-orange animate-pulse" />

          {/* Header with Sparkle Badge */}
          <div className="pt-8 pb-4 px-6 text-center relative overflow-hidden">
            {/* Background Decorative Sparkles */}
            <div className="absolute top-2 left-1/4 w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-60" />
            <div className="absolute top-8 right-1/4 w-3 h-3 rounded-full bg-vibrant-orange animate-pulse opacity-70" />
            <div className="absolute top-4 right-8 w-2 h-2 rounded-full bg-pinoy-green animate-ping opacity-50" />

            {/* Radiant Key Badge with Bounce */}
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute -inset-3 rounded-3xl bg-vibrant-orange/20 filter blur-lg animate-pulse" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-vibrant-orange to-deep-orange flex items-center justify-center text-white shadow-lg shadow-vibrant-orange/40 relative transform hover:rotate-6 transition-transform">
                <span className="material-symbols-outlined text-[32px] animate-bounce">
                  key
                </span>
              </div>
              <span className="material-symbols-outlined text-amber-400 text-[20px] absolute -top-1 -right-2 animate-spin duration-1000">
                auto_awesome
              </span>
            </div>

            <h2 className="text-2xl font-black text-on-surface tracking-tight">
              Passcode Generated!
            </h2>
            <p className="text-xs text-on-surface-variant mt-1 max-w-xs mx-auto">
              The official Director authorization passcode for this staff member is active and ready to share.
            </p>
          </div>

          {/* Main Passcode Showcase Box */}
          <div className="px-6 py-2">
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-surface-container border-2 border-dashed border-vibrant-orange/50 relative group">
              <div className="flex items-center justify-between text-[11px] font-bold text-vibrant-orange uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">verified_user</span>
                  Director Passcode
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-vibrant-orange text-white font-bold">
                  Active Credential
                </span>
              </div>

              {/* Code Display */}
              <div className="flex items-center justify-between gap-2 py-2">
                <span className="font-mono text-xl sm:text-2xl md:text-3xl font-black text-on-surface tracking-wider select-all break-all">
                  {accessCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 ${copiedCode
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

              <p className="text-[11px] text-on-surface-variant/80 border-t border-outline-variant/40 pt-2.5 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>Passcode must match Staff ID upon registration.</span>
                <span className="font-semibold text-vibrant-orange">Expires: {formatExpiry(data.expires_at)}</span>
              </p>
            </div>
          </div>

          {/* Passcode Assignment Details */}
          <div className="px-4 sm:px-6 py-3 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Target Staff ID
                </span>
                <span className="font-mono font-bold text-on-surface text-sm mt-0.5 block truncate">
                  {staffNumber}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Assigned Position
                </span>
                <span className="font-bold text-on-surface text-xs mt-0.5 block truncate">
                  {positionLabel}
                </span>
              </div>
            </div>

            {data.intended_department ? (
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="text-[11px] font-bold text-on-surface-variant">Assigned Department:</span>
                <span className="font-bold text-vibrant-orange text-left sm:text-right truncate max-w-full sm:max-w-[240px]">
                  {data.intended_department}
                </span>
              </div>
            ) : data.program_name ? (
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="text-[11px] font-bold text-on-surface-variant">Assigned Program:</span>
                <span className="font-bold text-on-surface text-left sm:text-right truncate max-w-full sm:max-w-[240px]">
                  {data.program_name}
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="text-[11px] font-bold text-on-surface-variant">Assigned Scope:</span>
                <span className="font-bold text-on-surface text-left sm:text-right truncate max-w-full sm:max-w-[240px]">
                  All Programs / Institution-Wide
                </span>
              </div>
            )}

            {data.intended_email && (
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="text-[11px] font-bold text-on-surface-variant">Reserved Email:</span>
                <span className="font-bold text-on-surface text-left sm:text-right truncate max-w-full sm:max-w-[240px]">
                  {data.intended_email}
                </span>
              </div>
            )}

            {/* Permissions Summary Pills */}
            {data.permissions && (
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                  Granted Capabilities
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {data.permissions.can_verify_students && (
                    <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px] font-medium flex items-center gap-1 border border-outline-variant/40">
                      <span className="material-symbols-outlined text-[12px] text-pinoy-green">check_circle</span>
                      Verify Students
                    </span>
                  )}
                  {data.permissions.can_manage_ojt_records && (
                    <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px] font-medium flex items-center gap-1 border border-outline-variant/40">
                      <span className="material-symbols-outlined text-[12px] text-pinoy-green">check_circle</span>
                      Manage OJT Hours
                    </span>
                  )}
                  {data.permissions.can_handle_grievances && (
                    <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px] font-medium flex items-center gap-1 border border-outline-variant/40">
                      <span className="material-symbols-outlined text-[12px] text-pinoy-green">check_circle</span>
                      Grievances
                    </span>
                  )}
                  {data.permissions.can_approve_job_offers && (
                    <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px] font-medium flex items-center gap-1 border border-outline-variant/40">
                      <span className="material-symbols-outlined text-[12px] text-pinoy-green">check_circle</span>
                      Approve Job Offers
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-5 border-t border-outline-variant bg-surface-container-low/70 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleCopyInvite}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 ${copiedInvite
                  ? 'bg-pinoy-green/10 text-pinoy-green border-pinoy-green/30'
                  : 'bg-surface hover:bg-surface-container text-on-surface border-outline-variant/60'
                }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {copiedInvite ? 'check' : 'forward_to_inbox'}
              </span>
              <span>{copiedInvite ? 'Full Invite Copied!' : 'Copy Invitation Text'}</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {onViewLedger && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewLedger();
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:text-vibrant-orange hover:bg-vibrant-orange/10 transition-colors"
                >
                  View Ledger
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
