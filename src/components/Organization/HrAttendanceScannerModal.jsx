import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../api/client';
import { playNotificationChime } from '../../utils/audio';

export default function HrAttendanceScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [useManualInput, setUseManualInput] = useState(false);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const qrRegionId = 'hr-attendance-qr-reader';

  // Process QR Payload via backend API
  const handleProcessPayload = async (rawPayload) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setLoading(true);
    setScanResult(null);

    try {
      const res = await api.post('/org/attendance/scan-qr', {
        qr_payload: rawPayload
      });

      try {
        playNotificationChime();
      } catch (_) {}

      if (res.status === 404) {
        setScanResult({
          type: 'error',
          message: 'The attendance QR scanner service is currently updating on Render. Please wait ~15-30 seconds and try again.'
        });
      } else if (res.success) {
        setScanResult({
          type: 'success',
          action: res.action,
          message: res.message,
          data: res.data
        });
        if (onScanSuccess) {
          onScanSuccess(res);
        }
      } else {
        setScanResult({
          type: 'error',
          message: res.message || 'Verification failed.'
        });
      }
    } catch (err) {
      setScanResult({
        type: 'error',
        message: err.message || 'Network error scanning QR code.'
      });
    } finally {
      setLoading(false);
      // Wait 3 seconds before allowing next scan to avoid duplicate scans
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 3000);
    }
  };

  // Start Camera QR Scanner
  useEffect(() => {
    if (!isOpen || useManualInput) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
          setScannerActive(false);
        });
      }
      return;
    }

    setCameraError('');
    let isMounted = true;

    const startScanner = async () => {
      try {
        // Wait for DOM element to exist
        await new Promise((r) => setTimeout(r, 150));
        if (!document.getElementById(qrRegionId)) return;

        const html5QrCode = new Html5Qrcode(qrRegionId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (!isProcessingRef.current) {
              handleProcessPayload(decodedText);
            }
          },
          () => {
            // QR code scanning frame tick - silent
          }
        );

        if (isMounted) setScannerActive(true);
      } catch (err) {
        console.warn('Camera scanner startup warning:', err);
        if (isMounted) {
          setCameraError(err.message || 'Unable to access camera. Please allow camera permissions or use manual scanner.');
          setUseManualInput(true);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
        });
      }
    };
  }, [isOpen, useManualInput]);

  // Clean state on modal close
  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {}).finally(() => {
        scannerRef.current = null;
      });
    }
    setScanResult(null);
    setManualCode('');
    onClose();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessPayload(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface rounded-3xl border border-outline-variant shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 pb-4 bg-gradient-to-b from-vibrant-orange/10 to-transparent border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-vibrant-orange text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span>HR Attendance Desk Scanner</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-tint text-vibrant-orange border border-vibrant-orange/20">
                  HR Role Exclusive
                </span>
              </h3>
              <p className="text-xs text-on-surface-variant">
                Physical premises scanner • Validates Time-In & Time-Out
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Mode Switcher: Camera vs Manual Gun */}
          <div className="flex items-center justify-between text-xs font-bold bg-surface-container p-1 rounded-2xl border border-outline-variant">
            <button
              type="button"
              onClick={() => { setUseManualInput(false); setCameraError(''); }}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
                !useManualInput
                  ? 'bg-surface text-vibrant-orange shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">videocam</span>
              <span>Camera Scanner</span>
            </button>
            <button
              type="button"
              onClick={() => setUseManualInput(true)}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
                useManualInput
                  ? 'bg-surface text-vibrant-orange shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">barcode_scanner</span>
              <span>Scanner Gun / Payload</span>
            </button>
          </div>

          {/* Scanner View Area */}
          {!useManualInput ? (
            <div className="space-y-2">
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-square max-h-[300px] mx-auto flex items-center justify-center border-2 border-dashed border-vibrant-orange/50 shadow-inner">
                <div id={qrRegionId} className="w-full h-full"></div>
                {!scannerActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-2 bg-black/60 p-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-3 border-vibrant-orange border-t-transparent"></div>
                    <p className="text-xs font-bold">Activating Camera Stream...</p>
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-error space-y-2 bg-black/90 p-4 text-center">
                    <span className="material-symbols-outlined text-3xl">no_photography</span>
                    <p className="text-xs font-bold">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => setUseManualInput(true)}
                      className="mt-2 px-3 py-1.5 bg-surface-container rounded-xl text-xs font-bold text-on-surface"
                    >
                      Use Manual Input
                    </button>
                  </div>
                )}
              </div>
              <p className="text-center text-[11px] text-on-surface-variant">
                Position intern's live dynamic QR code within the camera frame.
              </p>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-vibrant-orange">qr_code</span>
                  <span>Scanner Gun Input / Cryptographic Payload</span>
                </label>
                <textarea
                  rows="3"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste payload or scan with USB handheld barcode gun..."
                  className="w-full p-3 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface font-mono outline-none focus:ring-2 focus:ring-vibrant-orange resize-none"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !manualCode.trim()}
                className="w-full py-2.5 bg-vibrant-orange hover:bg-deep-orange disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Verifying Cryptographic Payload...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Process Attendance Scan</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Loading Indicator during camera scan verification */}
          {loading && !useManualInput && (
            <div className="p-3 bg-surface-container rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-vibrant-orange animate-pulse">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-vibrant-orange border-t-transparent"></div>
              <span>Verifying TOTP signature and locking attendance...</span>
            </div>
          )}

          {/* Scan Results Card */}
          {scanResult && (
            <div
              className={`p-4 rounded-2xl border transition-all animate-fade-in ${
                scanResult.type === 'success'
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-500/40 text-emerald-950 dark:text-emerald-100'
                  : 'bg-red-50/90 dark:bg-red-950/30 border-red-500/40 text-red-950 dark:text-red-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`material-symbols-outlined text-[26px] shrink-0 mt-0.5 ${
                    scanResult.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {scanResult.type === 'success' ? 'check_circle' : 'cancel'}
                </span>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="font-bold text-sm">
                      {scanResult.type === 'success'
                        ? scanResult.action === 'time_in'
                          ? 'Time-In Recorded!'
                          : 'Time-Out Recorded!'
                        : 'Attendance Verification Failed'}
                    </h4>
                    {scanResult.data?.action && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          scanResult.data.action === 'time_in'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-vibrant-orange text-white'
                        }`}
                      >
                        {scanResult.data.action === 'time_in' ? 'CLOCK IN' : 'CLOCK OUT'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed">{scanResult.message}</p>

                  {scanResult.data && (
                    <div className="pt-2 mt-2 border-t border-emerald-500/20 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-on-surface-variant block text-[10px]">Intern</span>
                        <span className="font-bold">{scanResult.data.student_name}</span>
                        <span className="text-[10px] text-on-surface-variant block">#{scanResult.data.student_number}</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant block text-[10px]">
                          {scanResult.data.action === 'time_in' ? 'Time-In (PST)' : 'Rendered Hours'}
                        </span>
                        <span className="font-bold font-mono">
                          {scanResult.data.action === 'time_in'
                            ? scanResult.data.time_in?.slice(0, 5)
                            : `${scanResult.data.hours_rendered} hrs`}
                        </span>
                        <span className="text-[10px] text-on-surface-variant block">
                          Supervisor: {scanResult.data.mentor_name}
                        </span>
                      </div>
                    </div>
                  )}

                  {scanResult.data?.action === 'time_out' && (
                    <div className="p-2 bg-emerald-100/60 dark:bg-emerald-900/40 rounded-xl text-[10px] text-emerald-800 dark:text-emerald-200 mt-2 flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-[14px] text-emerald-600">notification_important</span>
                      <span>Workplace mentor has been notified to validate this shift.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Operational Policy Note */}
          <div className="p-3 bg-surface-container rounded-2xl border border-outline-variant flex items-start gap-2.5 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-vibrant-orange shrink-0 mt-0.5">verified_user</span>
            <div className="space-y-0.5 text-[11px]">
              <p className="font-bold text-on-surface">HR Scanner & Mentor Separation of Duties</p>
              <p className="leading-relaxed">
                HR staff handles the physical scanner at premises to prevent attendance proxying. After student clock-out, workplace mentors validate and certify the shift hours.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
          <span className="text-[11px] text-on-surface-variant">
            {scannerActive ? '🟢 Scanner ready for next intern' : 'Scanner inactive'}
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-surface hover:bg-surface-container-high border border-outline-variant rounded-xl text-xs font-bold text-on-surface transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
