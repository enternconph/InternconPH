import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../api/client';
import { playAttendanceSuccessChime, playAttendanceErrorChime } from '../../utils/audio';
import { formatPHT12Hour } from '../../utils/timeFormat';

export default function HrAttendanceScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const qrRegionId = 'hr-attendance-qr-reader';

  // Helper to append to session activity log
  const addRecentScan = (entry) => {
    setRecentScans((prev) => [entry, ...prev].slice(0, 5));
  };

  // Process QR Payload via backend API
  const handleProcessPayload = async (rawPayload) => {
    if (isProcessingRef.current || isStoppingRef.current) return;
    isProcessingRef.current = true;
    setLoading(true);
    setScanResult(null);

    const currentTimeLabel = new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    try {
      const res = await api.post('/org/attendance/scan-qr', {
        qr_payload: rawPayload
      });

      if (res.status === 404) {
        try { playAttendanceErrorChime(); } catch (_) {}
        const errMsg = 'The attendance QR scanner service is currently updating. Please wait ~15-30 seconds and try again.';
        setScanResult({
          type: 'error',
          message: errMsg
        });
        setScanFeedback({ status: 'failed', action: null, message: errMsg });
        addRecentScan({
          id: Date.now(),
          status: 'failed',
          action: 'error',
          internName: 'Unknown Intern',
          detail: 'Service updating',
          time: currentTimeLabel
        });
      } else if (res.success) {
        try { playAttendanceSuccessChime(); } catch (_) {}
        setScanResult({
          type: 'success',
          action: res.action,
          message: res.message,
          data: res.data
        });
        setScanFeedback({
          status: 'success',
          action: res.action,
          intern: res.data?.student_name,
          time: res.action === 'time_in' ? formatPHT12Hour(res.data?.time_in) : formatPHT12Hour(res.data?.time_out)
        });
        addRecentScan({
          id: Date.now(),
          status: 'success',
          action: res.action,
          internName: res.data?.student_name,
          studentNumber: res.data?.student_number,
          detail: res.action === 'time_in'
            ? `In: ${formatPHT12Hour(res.data?.time_in)} (${res.data?.time_in_status === 'late' ? 'Late' : 'On-Time'})`
            : `Out: ${formatPHT12Hour(res.data?.time_out)} (${res.data?.hours_rendered || 0} hrs)`,
          time: currentTimeLabel
        });
        // Real-time automatic background refresh
        if (onScanSuccess) {
          onScanSuccess(res);
        }
      } else {
        try { playAttendanceErrorChime(); } catch (_) {}
        const failMsg = res.message || 'Verification failed. QR is invalid or expired.';
        setScanResult({
          type: 'error',
          message: failMsg
        });
        setScanFeedback({ status: 'failed', action: null, message: failMsg });
        addRecentScan({
          id: Date.now(),
          status: 'failed',
          action: 'error',
          internName: 'Verification Failed',
          detail: failMsg,
          time: currentTimeLabel
        });
      }
    } catch (err) {
      try { playAttendanceErrorChime(); } catch (_) {}
      const netMsg = err.message || 'Network error scanning QR code.';
      setScanResult({
        type: 'error',
        message: netMsg
      });
      setScanFeedback({ status: 'failed', action: null, message: netMsg });
      addRecentScan({
        id: Date.now(),
        status: 'failed',
        action: 'error',
        internName: 'Network Error',
        detail: netMsg,
        time: currentTimeLabel
      });
    } finally {
      setLoading(false);
      // Wait 3.5 seconds before allowing next scan to avoid duplicate scans
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 3500);
    }
  };

  // Safely stop camera hardware and detach Html5Qrcode
  const stopScannerSafely = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    // 1. Explicitly stop media tracks on any active video elements
    try {
      const container = document.getElementById(qrRegionId);
      if (container) {
        const videos = container.getElementsByTagName('video');
        for (let i = 0; i < videos.length; i++) {
          if (videos[i].srcObject) {
            const stream = videos[i].srcObject;
            stream.getTracks().forEach((track) => {
              try { track.stop(); } catch (_) {}
            });
            videos[i].srcObject = null;
          }
        }
      }
    } catch (_) {}

    // 2. Stop and clear Html5Qrcode instance
    if (scannerRef.current) {
      const instance = scannerRef.current;
      scannerRef.current = null;
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
      } catch (e) {
        // Silent ignore stopping error
      }
      try {
        instance.clear();
      } catch (e) {
        // Silent ignore clear error
      }
    }

    setScannerActive(false);
    isStoppingRef.current = false;
  }, [qrRegionId]);

  // Start Camera QR Scanner
  useEffect(() => {
    if (!isOpen) {
      stopScannerSafely();
      return;
    }

    setCameraError('');
    setClosing(false);
    isProcessingRef.current = false;
    let isMounted = true;

    const startScanner = async () => {
      try {
        // Wait for DOM element to exist
        await new Promise((r) => setTimeout(r, 180));
        if (!isMounted || !document.getElementById(qrRegionId)) return;

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
            if (!isProcessingRef.current && isMounted) {
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
          setCameraError(err.message || 'Unable to access camera. Please allow camera permissions in your browser.');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScannerSafely();
    };
  }, [isOpen, stopScannerSafely]);

  // Clean state on modal close
  const handleClose = async () => {
    if (closing) return;
    setClosing(true);
    await stopScannerSafely();
    setScanResult(null);
    onClose();
    setClosing(false);
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
            disabled={closing}
            className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors disabled:opacity-50"
            title="Close scanner"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Dedicated Full Camera Scanner View with Dynamic Status Glow */}
          <div className="space-y-2">
            <div
              className={`relative bg-black rounded-2xl overflow-hidden aspect-square max-h-[300px] mx-auto flex items-center justify-center border-4 transition-all duration-300 shadow-inner ${
                scanFeedback?.status === 'success'
                  ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.55)]'
                  : scanFeedback?.status === 'failed'
                  ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.55)]'
                  : 'border-dashed border-vibrant-orange/50'
              }`}
            >
              <div id={qrRegionId} className="w-full h-full"></div>

              {/* Real-time Viewfinder Status Overlay Banner */}
              {scanFeedback && (
                <div
                  className={`absolute top-3 inset-x-3 z-20 py-2 px-3 rounded-xl backdrop-blur-md text-white flex items-center justify-between shadow-lg transition-all animate-fade-in ${
                    scanFeedback.status === 'success'
                      ? 'bg-emerald-600/95 border border-emerald-400'
                      : 'bg-red-600/95 border border-red-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-[22px] shrink-0">
                      {scanFeedback.status === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <div className="text-left truncate">
                      <p className="text-xs font-black uppercase tracking-wide">
                        {scanFeedback.status === 'success'
                          ? scanFeedback.action === 'time_in'
                            ? 'Time-In Successful'
                            : 'Time-Out Successful'
                          : 'Attendance Scan Failed'}
                      </p>
                      <p className="text-[10px] text-white/90 truncate">
                        {scanFeedback.status === 'success'
                          ? `${scanFeedback.intern || 'Intern'} • ${scanFeedback.time || ''}`
                          : scanFeedback.message}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-mono uppercase font-black px-2 py-0.5 rounded-full shrink-0 ${
                      scanFeedback.status === 'success' ? 'bg-white text-emerald-700' : 'bg-white text-red-700'
                    }`}
                  >
                    {scanFeedback.status === 'success' ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>
              )}

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
                  <p className="text-[11px] text-white/70">Please check browser camera permissions.</p>
                </div>
              )}
            </div>
            <p className="text-center text-[11px] text-on-surface-variant">
              Position intern's live dynamic QR code within the camera frame. Attendance logs automatically.
            </p>
          </div>

          {/* Loading Indicator during camera scan verification */}
          {loading && (
            <div className="p-3 bg-surface-container rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-vibrant-orange animate-pulse">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-vibrant-orange border-t-transparent"></div>
              <span>Verifying TOTP signature and recording attendance...</span>
            </div>
          )}

          {/* High-Visibility Scan Results Card */}
          {scanResult && (
            <div
              className={`p-4 rounded-2xl border transition-all animate-fade-in ${
                scanResult.type === 'success'
                  ? 'bg-emerald-50/95 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-950 dark:text-emerald-100 shadow-sm'
                  : 'bg-red-50/95 dark:bg-red-950/40 border-red-500/50 text-red-950 dark:text-red-100 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`material-symbols-outlined text-[28px] shrink-0 mt-0.5 ${
                    scanResult.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {scanResult.type === 'success' ? 'check_circle' : 'cancel'}
                </span>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          scanResult.type === 'success'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {scanResult.type === 'success' ? 'SUCCESS' : 'FAILED'}
                      </span>
                      <h4 className="font-bold text-sm">
                        {scanResult.type === 'success'
                          ? scanResult.action === 'time_in'
                            ? 'Time-In Recorded Successfully'
                            : 'Time-Out Recorded Successfully'
                          : 'Attendance Verification Failed'}
                      </h4>
                    </div>
                    {scanResult.data?.action && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono ${
                          scanResult.data.action === 'time_in'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200'
                            : 'bg-orange-tint text-vibrant-orange border border-vibrant-orange/30'
                        }`}
                      >
                        {scanResult.data.action === 'time_in' ? 'CLOCK-IN' : 'CLOCK-OUT'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed font-medium">{scanResult.message}</p>

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
                            ? formatPHT12Hour(scanResult.data.time_in)
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

          {/* Session Attendance Activity Log (Last 5 scans) */}
          {recentScans.length > 0 && (
            <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-vibrant-orange">history</span>
                  <span>Session Scan History</span>
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant">Last {recentScans.length} scans</span>
              </div>
              <div className="space-y-1.5">
                {recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-2 bg-surface rounded-xl border border-outline-variant/60 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`material-symbols-outlined text-[16px] shrink-0 ${
                          scan.status === 'success' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {scan.status === 'success' ? 'check_circle' : 'cancel'}
                      </span>
                      <div className="truncate">
                        <span className="font-bold text-on-surface truncate block">{scan.internName}</span>
                        <span className="text-[10px] text-on-surface-variant block">{scan.detail}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono ${
                          scan.status === 'success'
                            ? scan.action === 'time_in'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-orange-tint text-vibrant-orange'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {scan.status === 'success' ? (scan.action === 'time_in' ? 'IN' : 'OUT') : 'FAIL'}
                      </span>
                      <span className="text-[9px] text-on-surface-variant block font-mono">{scan.time}</span>
                    </div>
                  </div>
                ))}
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
            {closing ? 'Stopping camera...' : scannerActive ? '🟢 Scanner ready for next intern' : 'Scanner inactive'}
          </span>
          <button
            type="button"
            onClick={handleClose}
            disabled={closing}
            className="px-5 py-2 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
          >
            {closing ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                <span>Closing...</span>
              </>
            ) : (
              <span>Done</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
