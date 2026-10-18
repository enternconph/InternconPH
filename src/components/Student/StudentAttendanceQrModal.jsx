import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import api from '../../api/client';
import { getOrCreateDeviceToken, resetLocalDeviceToken, getDeviceName, buildDynamicQrPayload } from '../../utils/totpHelper';

const TIME_STEP = 20; // QR rotates every 20 seconds

export default function StudentAttendanceQrModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(TIME_STEP);
  const [livePstTime, setLivePstTime] = useState('');
  const [isShielded, setIsShielded] = useState(false);
  const [resettingDevice, setResettingDevice] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const canvasRef = useRef(null);
  const lastGeneratedTsRef = useRef(0);
  const timerRef = useRef(null);

  // Fetch or register cryptographic credentials
  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const deviceToken = getOrCreateDeviceToken();
      const deviceName = getDeviceName();
      const res = await api.get(`/student/attendance/qr-credentials?device_token=${encodeURIComponent(deviceToken)}&device_name=${encodeURIComponent(deviceName)}`);
      if (res.success && res.data) {
        setCredentials(res.data);
      } else {
        if (res.status === 404 && res.message?.toLowerCase().includes('student profile not found')) {
          setError('Student profile not found for this account. Please log in with a registered student intern account.');
        } else if (res.status === 404) {
          setError('The attendance QR backend service is currently updating on Render. Please wait ~15-30 seconds and click Retry Handshake.');
        } else {
          setError(res.message || 'Failed to initialize attendance credentials.');
        }
      }
    } catch (err) {
      setError(err.message || 'Network error retrieving attendance token.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCredentials();
    } else {
      setCredentials(null);
      setError('');
      setIsShielded(false);
    }
  }, [isOpen, fetchCredentials]);

  // Anti-screenshot & Tab visibility listener: shield QR code when unfocused/switching apps
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsShielded(true);
      } else {
        setIsShielded(false);
      }
    };

    const handleWindowBlur = () => {
      setIsShielded(true);
    };

    const handleWindowFocus = () => {
      setIsShielded(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isOpen]);

  // Render QR code onto canvas
  const renderQr = useCallback(async (secret, studentId, deviceToken) => {
    if (!canvasRef.current || !secret || !studentId || !deviceToken) return;

    try {
      const payload = await buildDynamicQrPayload(secret, studentId, deviceToken);
      await QRCode.toCanvas(canvasRef.current, payload, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0f172a', // Slate 900
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
      lastGeneratedTsRef.current = Math.floor(Date.now() / 1000);
    } catch (err) {
      console.error('QR code generation error:', err);
    }
  }, []);

  // Live timer tick: updates countdown, live millisecond watermark, and regenerates QR on step
  useEffect(() => {
    if (!isOpen || !credentials || isShielded) return;

    const tick = () => {
      const now = new Date();
      // Format PST time with milliseconds
      const pstStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + `.${String(now.getMilliseconds()).padStart(3, '0')}`;
      setLivePstTime(pstStr);

      const nowSec = Math.floor(now.getTime() / 1000);
      const remaining = TIME_STEP - (nowSec % TIME_STEP);
      setSecondsLeft(remaining);

      // Regenerate if window rolled over or not rendered yet
      if (nowSec - lastGeneratedTsRef.current >= TIME_STEP || lastGeneratedTsRef.current === 0) {
        renderQr(credentials.totp_secret, credentials.student_id, credentials.device_token);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, credentials, isShielded, renderQr]);

  // Handle re-binding / resetting device
  const handleResetDevice = async () => {
    setResettingDevice(true);
    try {
      const newLocalToken = resetLocalDeviceToken();
      const deviceName = getDeviceName();
      const res = await api.post('/student/attendance/reset-device', {
        device_token: newLocalToken,
        device_name: deviceName
      });
      if (res.success && res.data) {
        setShowResetConfirm(false);
        fetchCredentials();
      } else {
        alert(res.message || 'Failed to re-bind device.');
      }
    } catch (err) {
      alert(err.message || 'Error resetting device token.');
    } finally {
      setResettingDevice(false);
    }
  };

  if (!isOpen) return null;

  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (secondsLeft / TIME_STEP) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="bg-surface rounded-3xl border border-outline-variant shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="p-5 pb-4 bg-gradient-to-b from-vibrant-orange/10 to-transparent border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-vibrant-orange text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-on-surface flex items-center gap-1.5">
                <span>Dynamic Attendance QR</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live Generating"></span>
              </h3>
              <p className="text-xs text-on-surface-variant">Time-bound TOTP • Device-locked</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          {loading ? (
            <div className="py-16 space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-vibrant-orange border-t-transparent mx-auto"></div>
              <p className="text-xs font-bold text-on-surface-variant">Initializing cryptographic device handshake...</p>
            </div>
          ) : error ? (
            <div className="py-8 space-y-3 max-w-xs">
              <span className="material-symbols-outlined text-4xl text-error">lock_clock</span>
              <p className="text-sm font-bold text-error">{error}</p>
              <button
                type="button"
                onClick={fetchCredentials}
                className="px-4 py-2 bg-vibrant-orange text-white rounded-xl text-xs font-bold shadow-md hover:bg-deep-orange"
              >
                Retry Handshake
              </button>
            </div>
          ) : (
            <>
              {/* Dynamic QR Canvas Container */}
              <div className="relative p-4 bg-white rounded-2xl shadow-inner border border-slate-200/80 group">
                <canvas 
                  ref={canvasRef} 
                  className={`rounded-xl transition-all duration-300 pointer-events-none ${isShielded ? 'blur-xl opacity-30' : ''}`}
                />

                {/* Moving live watermark across the canvas to discourage photography */}
                <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none overflow-hidden select-none">
                  <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-500/70 uppercase">
                    <span>{credentials?.student_number || 'INTERN'}</span>
                    <span>PST UTC+8</span>
                  </div>
                  <div className="text-center font-mono text-[10px] font-extrabold tracking-widest text-slate-600/40 rotate-[-18deg] select-none">
                    {credentials?.full_name?.toUpperCase()}
                  </div>
                  <div className="text-center font-mono text-[9px] font-bold text-slate-600/80 bg-white/70 py-0.5 rounded backdrop-blur-xs">
                    {livePstTime}
                  </div>
                </div>

                {/* Shield Overlay when user unfocuses or takes screenshots */}
                {isShielded && (
                  <div 
                    onClick={() => setIsShielded(false)}
                    className="absolute inset-0 bg-slate-900/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 text-white text-center cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-3xl text-vibrant-orange mb-1 animate-bounce">
                      shield
                    </span>
                    <p className="font-bold text-xs">Security Shield Active</p>
                    <p className="text-[10px] text-slate-300 mt-1">
                      Dynamic QR code is shielded while window is inactive or screen-capturing.
                    </p>
                    <span className="mt-3 px-3 py-1 bg-vibrant-orange text-white rounded-lg text-[10px] font-bold">
                      Click to Reveal
                    </span>
                  </div>
                )}
              </div>

              {/* Circular Countdown Progress Ring */}
              <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-2xl border border-outline-variant">
                <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                  <svg className="w-10 h-10 -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      className="text-surface-container-high"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 16}
                      strokeDashoffset={(2 * Math.PI * 16) - (secondsLeft / TIME_STEP) * (2 * Math.PI * 16)}
                      strokeLinecap="round"
                      className="text-vibrant-orange transition-all duration-150"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-mono font-black text-on-surface">
                    {secondsLeft}s
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-on-surface">
                    Rotating in {secondsLeft}s
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    Cryptographically valid for 20-30s
                  </p>
                </div>
              </div>

              {/* Instructions & Anti-Screenshot Policy */}
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-left flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  no_photography
                </span>
                <div className="space-y-0.5 text-[11px] text-amber-900 dark:text-amber-200">
                  <p className="font-bold">Anti-Screenshot Protection</p>
                  <p className="leading-relaxed text-[10px] text-amber-800 dark:text-amber-300">
                    Do not screenshot or forward this code. The Hiring Organization HR scanner at premises strictly rejects codes older than 30 seconds or scanned from non-registered devices.
                  </p>
                </div>
              </div>

              {/* Hardware Device Binding Info */}
              <div className="w-full pt-1 flex items-center justify-between text-[11px] text-on-surface-variant border-t border-outline-variant">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">devices</span>
                  <span className="truncate max-w-[200px]" title={credentials?.registered_device_name || getDeviceName()}>
                    {credentials?.registered_device_name || getDeviceName()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="text-[10px] text-vibrant-orange hover:underline font-bold shrink-0"
                >
                  Change Device
                </button>
              </div>
            </>
          )}
        </div>

        {/* Reset Device Confirmation Modal */}
        {showResetConfirm && (
          <div className="absolute inset-0 bg-surface/95 backdrop-blur-md p-6 flex flex-col justify-center items-center text-center z-20 space-y-3">
            <span className="material-symbols-outlined text-4xl text-amber-600">phonelink_lock</span>
            <h4 className="font-bold text-sm text-on-surface">Re-bind Attendance Device?</h4>
            <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
              This will generate a new cryptographic secret and link your attendance QR code to this current phone/browser.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={resettingDevice}
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-2 bg-surface-container rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resettingDevice}
                onClick={handleResetDevice}
                className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md"
              >
                {resettingDevice ? 'Re-binding...' : 'Confirm Re-bind'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
