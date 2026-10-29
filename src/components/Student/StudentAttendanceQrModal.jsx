import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import api from '../../api/client';
import {
  getDeviceName,
  getOrCreateHardwareKeyPair,
  rotateHardwareKeyPair,
  saveOfflineCredentialBundle,
  getOfflineCredentialBundle,
  clearOfflineCredentialBundle,
  buildDynamicQrPayload,
  calculateHaversineMeters,
  TOTP_STEP_SECONDS
} from '../../utils/totpHelper';
import { useSocketEvent } from '../../contexts/SocketContext';
import { playAttendanceSuccessChime, playAttendanceErrorChime } from '../../utils/audio';
import { formatPHT12Hour } from '../../utils/timeFormat';

const TIME_STEP = TOTP_STEP_SECONDS; // 30-second rolling TOTP window

export default function StudentAttendanceQrModal({ isOpen = true, onClose, isFullPage = false }) {
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState(null);
  const [todayLog, setTodayLog] = useState(null);
  const [liveAlert, setLiveAlert] = useState(null);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(TIME_STEP);
  const [livePstTime, setLivePstTime] = useState('');
  const [isShielded, setIsShielded] = useState(false);

  // Network & Offline Mode State
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isOfflineVaultMode, setIsOfflineVaultMode] = useState(false);

  // Device Binding & 6-Digit Gmail OTP Re-binding State
  const [deviceMismatchData, setDeviceMismatchData] = useState(null);
  const [otpStep, setOtpStep] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'verifying'
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpInfo, setOtpInfo] = useState(null);
  const [otpCountdownSec, setOtpCountdownSec] = useState(0);
  const [showChangeDeviceConfirm, setShowChangeDeviceConfirm] = useState(false);

  // Live High-Accuracy GPS Telemetry State (Online Mode)
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('acquiring'); // 'acquiring' | 'ready' | 'denied' | 'low_accuracy'
  const [gpsErrorMsg, setGpsErrorMsg] = useState('');

  const canvasRef = useRef(null);
  const lastGeneratedStepRef = useRef(0);
  const lastSignedLocKeyRef = useRef('');
  const timerRef = useRef(null);
  const prevLogRef = useRef(null);
  const gpsLocationRef = useRef(null);
  const hardwareKeyRef = useRef(null);

  // Track online/offline status transitions
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // High-accuracy GPS location watcher (when modal is open)
  useEffect(() => {
    if (!isOpen) {
      setGpsLocation(null);
      gpsLocationRef.current = null;
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('denied');
      setGpsErrorMsg('Geolocation is not supported on this browser.');
      return;
    }

    setGpsStatus('acquiring');
    setGpsErrorMsg('');

    const onGeoSuccess = (pos) => {
      const coords = {
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
        acc: Math.round(pos.coords.accuracy || 0),
        ts: Math.floor(Date.now() / 1000)
      };
      gpsLocationRef.current = coords;
      setGpsLocation(coords);

      if (coords.acc > 150) {
        setGpsStatus('low_accuracy');
        setGpsErrorMsg(`Low GPS accuracy (±${coords.acc}m). Move near a window or outdoors for <150m accuracy.`);
      } else {
        setGpsStatus('ready');
        setGpsErrorMsg('');
      }
    };

    const onGeoError = (err) => {
      setGpsStatus('denied');
      if (err.code === 1) {
        setGpsErrorMsg('Location permission denied. Please enable High-Accuracy Location on your Android phone.');
      } else {
        setGpsErrorMsg('Acquiring GPS signal... Ensure phone Location Services are turned on.');
      }
    };

    const watchId = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 12000
    });

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOpen]);

  // Listen to Socket.IO device_rebound event: if another device binds this student's account, unbind locally
  useSocketEvent('device_rebound', async (payload) => {
    const localDeviceId = hardwareKeyRef.current?.deviceId;
    if (payload?.new_device_id && localDeviceId && payload.new_device_id !== localDeviceId) {
      await clearOfflineCredentialBundle();
      setCredentials(null);
      setDeviceMismatchData({
        status: 'device_mismatch',
        requires_otp: true,
        registered_device_name: payload.device_label || 'Another Android Phone',
        current_device_name: getDeviceName(),
        message: 'Your attendance QR was just bound to another phone. Verify via 6-digit Gmail OTP to re-bind this device.'
      });
    }
  });

  // Fallback to Offline Vault in IndexedDB when phone has no internet connection
  const loadOfflineVaultCredentials = useCallback(async (keyPair) => {
    const offlineState = await getOfflineCredentialBundle(keyPair?.deviceId);
    if (offlineState && !offlineState.expired && !offlineState.deviceMismatch && offlineState.record) {
      setIsOfflineVaultMode(true);
      setDeviceMismatchData(null);
      setCredentials(offlineState.record);
      setError('');
      return true;
    }

    if (offlineState?.deviceMismatch) {
      setDeviceMismatchData({
        status: 'device_mismatch',
        requires_otp: true,
        registered_device_name: offlineState.record?.registered_device_name || 'Registered Phone',
        current_device_name: getDeviceName(),
        message:
          'This phone does not match your registered attendance device. Connect to the internet and complete 6-digit Gmail OTP verification to re-bind.'
      });
      return false;
    }

    if (offlineState?.expired) {
      setError(
        'Your offline attendance security secret has expired (72-hour limit). Please connect to the internet briefly to refresh your device-bound credentials.'
      );
      return false;
    }

    setError(
      'Offline Mode Unavailable: This phone has not been bound while online yet. Connect to the internet once to register your device keypair.'
    );
    return false;
  }, []);

  // Fetch or register cryptographic device keypair & TOTP credentials
  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    setError('');
    setOtpError('');
    setIsOfflineVaultMode(false);

    try {
      const keyPair = await getOrCreateHardwareKeyPair(false);
      hardwareKeyRef.current = keyPair;
      const deviceName = getDeviceName();

      // If browser is offline right now, immediately attempt offline IndexedDB vault
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await loadOfflineVaultCredentials(keyPair);
        setLoading(false);
        return;
      }

      const res = await api.post('/student/attendance/register-device', {
        device_id: keyPair.deviceId,
        device_token: keyPair.deviceId,
        public_key_spki: keyPair.publicKeySpki,
        public_key_jwk: keyPair.publicKeyJwk,
        device_label: deviceName,
        device_name: deviceName
      });

      if (res.success && res.data) {
        if (res.data.status === 'device_mismatch' || res.data.requires_otp) {
          setCredentials(null);
          setDeviceMismatchData(res.data);
          if (res.data.todayLog) {
            setTodayLog(res.data.todayLog);
            prevLogRef.current = res.data.todayLog;
          }
        } else {
          setDeviceMismatchData(null);
          setCredentials(res.data);
          await saveOfflineCredentialBundle(res.data);
          if (res.data.todayLog) {
            setTodayLog(res.data.todayLog);
            prevLogRef.current = res.data.todayLog;
          }
        }
      } else if (res.isNetworkError) {
        await loadOfflineVaultCredentials(keyPair);
      } else {
        if (res.status === 404 && res.message?.toLowerCase().includes('student profile not found')) {
          setError('Student profile not found for this account. Please log in with a registered student intern account.');
        } else {
          setError(res.message || 'Failed to initialize attendance credentials.');
        }
      }
    } catch (err) {
      const keyPair = hardwareKeyRef.current || (await getOrCreateHardwareKeyPair(false));
      const loadedOffline = await loadOfflineVaultCredentials(keyPair);
      if (!loadedOffline) {
        setError(err.message || 'Network error retrieving attendance token.');
      }
    } finally {
      setLoading(false);
    }
  }, [loadOfflineVaultCredentials]);

  useEffect(() => {
    if (isOpen) {
      fetchCredentials();
    } else {
      setCredentials(null);
      setDeviceMismatchData(null);
      setLiveAlert(null);
      setError('');
      setOtpStep('idle');
      setOtpCode('');
      setOtpError('');
      setShowChangeDeviceConfirm(false);
      setIsShielded(false);
      lastGeneratedStepRef.current = 0;
    }
  }, [isOpen, fetchCredentials]);

  // OTP 5-minute countdown timer
  useEffect(() => {
    if (otpCountdownSec <= 0) return;
    const t = setInterval(() => {
      setOtpCountdownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [otpCountdownSec]);

  // Real-time live polling while modal is open and online: detects the exact second HR scans the intern's QR
  useEffect(() => {
    if (!isOpen || !isOnline || !credentials) return;

    const pollAttendanceStatus = async () => {
      try {
        const res = await api.get('/student/attendance');
        if (res.success && res.data) {
          const freshLog = res.data.todayLog;
          const prev = prevLogRef.current;

          if (freshLog?.time_in && (!prev || !prev.time_in)) {
            try { playAttendanceSuccessChime(); } catch (_) {}
            setLiveAlert({
              type: 'success',
              action: 'time_in',
              title: 'Time-In Recorded Successfully!',
              message: `You clocked in at ${formatPHT12Hour(freshLog.time_in)} (${freshLog.time_in_status === 'late' ? 'Late Arrival' : 'On-Time'}). Have a productive shift!`
            });
            prevLogRef.current = freshLog;
            setTodayLog(freshLog);
          } else if (freshLog?.time_out && (!prev || !prev.time_out)) {
            try { playAttendanceSuccessChime(); } catch (_) {}
            setLiveAlert({
              type: 'success',
              action: 'time_out',
              title: 'Time-Out Recorded Successfully!',
              message: `You clocked out at ${formatPHT12Hour(freshLog.time_out)} (${freshLog.hours_rendered || 0} hrs credited). Training shift finalized!`
            });
            prevLogRef.current = freshLog;
            setTodayLog(freshLog);
          } else if (freshLog) {
            prevLogRef.current = freshLog;
            setTodayLog(freshLog);
          }
        }
      } catch (_) {}
    };

    const pollInterval = setInterval(pollAttendanceStatus, 2500);
    return () => clearInterval(pollInterval);
  }, [isOpen, isOnline, credentials]);

  // Anti-screenshot & Tab visibility listener: shield QR code when unfocused/switching apps
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      setIsShielded(document.hidden);
    };
    const handleWindowBlur = () => setIsShielded(true);
    const handleWindowFocus = () => setIsShielded(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isOpen]);

  // Render signed v2 QR code onto canvas
  const renderQr = useCallback(async (secret, studentId, deviceId, mode, locationObj) => {
    if (!canvasRef.current || !secret || !studentId || !deviceId) return;

    try {
      const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const effectiveMode = !isMobileDevice ? 'web_unverified' : mode;

      const payload = await buildDynamicQrPayload({
        secret,
        studentId,
        deviceId,
        mode: effectiveMode,
        location: locationObj
      });
      await QRCode.toCanvas(canvasRef.current, payload, {
        width: 224,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
      lastGeneratedStepRef.current = Math.floor(Date.now() / 1000 / TIME_STEP);
      lastSignedLocKeyRef.current = locationObj
        ? `${locationObj.lat},${locationObj.lng}`
        : 'none';
    } catch (err) {
      console.error('QR code generation error:', err);
    }
  }, []);

  // Live timer tick: updates countdown, live millisecond watermark, and regenerates QR on 30s step or fresh GPS lock
  useEffect(() => {
    if (!isOpen || loading || !credentials || isShielded) return;

    // Force immediate render when canvas mounts after loading finishes
    lastGeneratedStepRef.current = 0;

    const currentMode = !isOnline || isOfflineVaultMode ? 'offline' : 'online';

    const tick = () => {
      const now = new Date();
      const pstStr =
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + `.${String(now.getMilliseconds()).padStart(3, '0')}`;
      setLivePstTime(pstStr);

      const nowSec = Math.floor(now.getTime() / 1000);
      const currentStep = Math.floor(nowSec / TIME_STEP);
      const remaining = TIME_STEP - (nowSec % TIME_STEP);
      setSecondsLeft(remaining);

      const loc = gpsLocationRef.current;
      const locKey = loc ? `${loc.lat},${loc.lng}` : 'none';

      // Regenerate if 30s TOTP window rolled over, not rendered yet, or GPS lock just arrived
      if (
        currentStep !== lastGeneratedStepRef.current ||
        lastGeneratedStepRef.current === 0 ||
        (lastSignedLocKeyRef.current === 'none' && locKey !== 'none')
      ) {
        renderQr(
          credentials.totp_secret,
          credentials.student_id,
          credentials.device_id || credentials.device_token,
          currentMode,
          loc
        );
      }
    };

    tick();
    timerRef.current = setInterval(tick, 150);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, loading, credentials, isShielded, isOnline, isOfflineVaultMode, renderQr]);

  // Step 1 of Device Re-binding: Request 6-digit OTP to Student's Gmail
  const handleRequestDeviceOtp = async (rotateKey = false) => {
    if (!isOnline) {
      setOtpError('You must be connected to the internet to request a Gmail verification OTP.');
      return;
    }

    setOtpStep('sending');
    setOtpError('');
    try {
      const keyPair = rotateKey
        ? await rotateHardwareKeyPair()
        : hardwareKeyRef.current || (await getOrCreateHardwareKeyPair(false));
      hardwareKeyRef.current = keyPair;
      const deviceName = getDeviceName();

      const res = await api.post('/student/attendance/request-device-otp', {
        device_id: keyPair.deviceId,
        public_key_spki: keyPair.publicKeySpki,
        public_key_jwk: keyPair.publicKeyJwk,
        device_label: deviceName
      });

      if (res.success) {
        setOtpStep('sent');
        setOtpInfo(res.data || {});
        setOtpCountdownSec(res.data?.expires_in_seconds || 300);
        setOtpCode(res.data?.dev_otp_preview || '');
        if (showChangeDeviceConfirm) {
          setShowChangeDeviceConfirm(false);
          setCredentials(null);
          setDeviceMismatchData({
            status: 'device_mismatch',
            requires_otp: true,
            registered_device_name: credentials?.registered_device_name || deviceName,
            current_device_name: deviceName,
            masked_email: res.data?.masked_email,
            message: 'Enter the 6-digit OTP sent to your Gmail to bind your new cryptographic device key.'
          });
        }
      } else {
        setOtpStep('idle');
        setOtpError(res.message || 'Failed to send verification OTP.');
      }
    } catch (err) {
      setOtpStep('idle');
      setOtpError(err.message || 'Network error requesting OTP.');
    }
  };

  // Step 2 of Device Re-binding: Verify 6-digit OTP and bind new device keypair
  const handleVerifyDeviceOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanedOtp = String(otpCode).trim();
    if (!/^\d{6}$/.test(cleanedOtp)) {
      setOtpError('Please enter the 6-digit numeric OTP sent to your Gmail.');
      return;
    }

    setOtpStep('verifying');
    setOtpError('');

    try {
      const keyPair = hardwareKeyRef.current || (await getOrCreateHardwareKeyPair(false));
      const deviceName = getDeviceName();

      const res = await api.post('/student/attendance/verify-device-otp', {
        otp_code: cleanedOtp,
        device_id: keyPair.deviceId,
        public_key_spki: keyPair.publicKeySpki,
        public_key_jwk: keyPair.publicKeyJwk,
        device_label: deviceName
      });

      if (res.success && res.data) {
        try { playAttendanceSuccessChime(); } catch (_) {}
        await saveOfflineCredentialBundle(res.data);
        setDeviceMismatchData(null);
        setOtpStep('idle');
        setOtpCode('');
        setCredentials(res.data);
        setLiveAlert({
          type: 'success',
          title: 'New Device Bound Successfully!',
          message: `This phone (${deviceName}) is now cryptographically bound to your account. Your previous device has been unbound.`
        });
      } else {
        try { playAttendanceErrorChime(); } catch (_) {}
        setOtpStep('sent');
        setOtpError(res.message || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      setOtpStep('sent');
      setOtpError(err.message || 'Failed to verify OTP.');
    }
  };

  if (!isOpen) return null;

  // Calculate live distance to organization workplace geofence if configured
  const geofence = credentials?.workplaceGeofence;
  const hasGeofenceCoords = geofence && geofence.latitude != null && geofence.longitude != null;
  const isGeofenceActive = Boolean(geofence?.configured || hasGeofenceCoords);
  const liveDistanceMeters =
    isGeofenceActive && gpsLocation
      ? calculateHaversineMeters(
          gpsLocation.lat,
          gpsLocation.lng,
          geofence.latitude,
          geofence.longitude
        )
      : null;
  const allowedRadiusMeters = geofence?.radius_meters || 100;
  const isInsideGeofence =
    liveDistanceMeters !== null ? liveDistanceMeters <= allowedRadiusMeters : true;

  return (
    <div
      className={
        isFullPage
          ? 'min-h-[100dvh] w-full bg-surface flex flex-col select-none'
          : 'fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:p-4 bg-surface md:bg-black/75 md:backdrop-blur-md animate-fade-in select-none'
      }
    >
      <div
        className={
          isFullPage
            ? 'bg-surface w-full min-h-[100dvh] flex flex-col relative'
            : 'bg-surface w-full h-[100dvh] md:h-auto md:max-w-[420px] md:max-h-[92dvh] md:rounded-3xl md:border md:border-outline-variant md:shadow-2xl overflow-hidden flex flex-col relative'
        }
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Pinned Header (Native Full-Screen Top Bar on Mobile / Standalone Page) */}
        <div className="shrink-0 px-4 sm:px-5 py-3.5 bg-gradient-to-b from-vibrant-orange/10 to-transparent border-b border-outline-variant flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={onClose}
              className={`${
                isFullPage ? 'inline-flex' : 'inline-flex md:hidden'
              } items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface shrink-0 cursor-pointer transition-colors`}
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back</span>
            </button>
            <div
              className={`${
                isFullPage ? 'hidden sm:flex' : 'hidden md:flex'
              } w-10 h-10 rounded-2xl bg-vibrant-orange text-white items-center justify-center shadow-md shrink-0`}
            >
              <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-on-surface truncate">
                  Dynamic Attendance QR
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                    !isOnline || isOfflineVaultMode
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      !isOnline || isOfflineVaultMode
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                  {!isOnline || isOfflineVaultMode ? 'Offline Vault' : 'Online GPS'}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                ECDSA P-256 Hardware-Signed • 30s TOTP
              </p>
            </div>
          </div>
          {!isFullPage && (
            <button
              type="button"
              onClick={onClose}
              className="hidden md:flex w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[19px]">close</span>
            </button>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div
          className={`flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 flex flex-col items-center text-center space-y-3.5 ${
            isFullPage ? 'max-w-md w-full mx-auto pb-8' : ''
          }`}
        >
          {/* Real-time Scan Confirmation Toast / Live Alert */}
          {liveAlert && (
            <div
              className={`w-full p-3 rounded-2xl text-white shadow-lg animate-fade-in flex items-start justify-between gap-2.5 text-left ${
                liveAlert.type === 'success'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400'
                  : 'bg-gradient-to-r from-red-600 to-rose-600 border border-red-400'
              }`}
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="material-symbols-outlined text-[22px] shrink-0 mt-0.5">
                  {liveAlert.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-black text-xs sm:text-sm truncate">{liveAlert.title}</h4>
                  <p className="text-[11px] text-white/95 leading-snug">{liveAlert.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLiveAlert(null)}
                className="w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center shrink-0 text-white cursor-pointer"
                title="Dismiss"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            </div>
          )}

          {/* Today's Shift Live Status Indicator */}
          {!deviceMismatchData && (
            <div className="w-full">
              {todayLog?.time_out ? (
                <div className="p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-2 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="material-symbols-outlined text-emerald-600 text-[22px] shrink-0">verified</span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                        Today&apos;s Shift: Completed
                      </span>
                      <p className="text-xs font-bold text-emerald-950 dark:text-emerald-100 truncate">
                        In: {formatPHT12Hour(todayLog.time_in)} • Out: {formatPHT12Hour(todayLog.time_out)}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-600 text-white shrink-0">
                    {todayLog.hours_rendered || 0} hrs
                  </span>
                </div>
              ) : todayLog?.time_in ? (
                <div className="p-2.5 sm:p-3 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-2 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                        Currently Timed-In (Active Shift)
                      </span>
                      <p className="text-xs font-bold text-emerald-950 dark:text-emerald-100 truncate">
                        In at {formatPHT12Hour(todayLog.time_in)} ({todayLog.time_in_status === 'late' ? 'Late' : 'On-Time'})
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-vibrant-orange text-white shrink-0">
                    Scan Out
                  </span>
                </div>
              ) : (
                <div className="p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-2 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0">schedule</span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                        Awaiting Time-In
                      </span>
                      <p className="text-xs font-bold text-amber-950 dark:text-amber-100 truncate">
                        Present this live QR at the HR desk scanner
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-600 text-white shrink-0">
                    Scan In
                  </span>
                </div>
              )}
            </div>
          )}

          {/* LOADING STATE */}
          {loading ? (
            <div className="py-12 space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-vibrant-orange border-t-transparent mx-auto"></div>
              <p className="text-xs font-bold text-on-surface-variant">
                Verifying WebCrypto ECDSA P-256 hardware keypair...
              </p>
            </div>
          ) : deviceMismatchData ? (
            /* DEVICE MISMATCH -> 6-DIGIT GMAIL OTP RE-BINDING FLOW */
            <div className="w-full p-4 bg-surface-container-low rounded-2xl border-2 border-amber-500/40 text-left space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">phonelink_lock</span>
                </div>
                <div className="min-w-0">
                  <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-600 text-white">
                    Attendance Blocked • Unbound Device
                  </span>
                  <h4 className="font-bold text-sm text-on-surface mt-1">
                    Device Verification Required (6-Digit OTP)
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                    {deviceMismatchData.message ||
                      'Your attendance account is currently locked to another phone. Verify with a 6-digit OTP sent to your Gmail to bind this device.'}
                  </p>
                </div>
              </div>

              {/* Device Comparison Box */}
              <div className="p-3 bg-surface rounded-xl border border-outline-variant space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-on-surface-variant font-medium shrink-0">Registered Phone:</span>
                  <span className="font-bold text-on-surface truncate">
                    {deviceMismatchData.registered_device_name || 'Previous Android Device'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-outline-variant/60 pt-1.5">
                  <span className="text-on-surface-variant font-medium shrink-0">This Device:</span>
                  <span className="font-bold text-vibrant-orange truncate">
                    {deviceMismatchData.current_device_name || getDeviceName()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-outline-variant/60 pt-1.5">
                  <span className="text-on-surface-variant font-medium shrink-0">OTP Recipient:</span>
                  <span className="font-mono font-bold text-on-surface truncate">
                    {deviceMismatchData.masked_email || 'Registered Gmail'}
                  </span>
                </div>
              </div>

              {otpError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-300 font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span>{otpError}</span>
                </div>
              )}

              {otpStep === 'idle' || otpStep === 'sending' ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={otpStep === 'sending' || !isOnline}
                    onClick={() => handleRequestDeviceOtp(false)}
                    className="w-full py-2.5 px-4 bg-vibrant-orange hover:bg-deep-orange disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">mail_lock</span>
                    <span className="truncate">
                      {otpStep === 'sending'
                        ? 'Sending 6-Digit OTP...'
                        : `Send 6-Digit OTP (${deviceMismatchData.masked_email || 'Gmail'})`}
                    </span>
                  </button>
                  {!isOnline && (
                    <p className="text-[11px] text-amber-600 font-semibold text-center">
                      Please connect to Wi-Fi or mobile data to complete OTP device binding.
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleVerifyDeviceOtp} className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2">
                    <span className="truncate">
                      OTP sent to <strong>{otpInfo?.masked_email || deviceMismatchData.masked_email || 'Gmail'}</strong>
                    </span>
                    <span className="font-mono font-bold shrink-0">
                      {Math.floor(otpCountdownSec / 60)}:
                      {String(otpCountdownSec % 60).padStart(2, '0')}
                    </span>
                  </div>

                  {otpInfo?.dev_otp_preview && (
                    <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-900 dark:text-amber-200 font-mono text-center">
                      Dev/Fallback OTP Code: <strong className="tracking-widest">{otpInfo.dev_otp_preview}</strong>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Enter 6-Digit Gmail OTP (Max 5 Attempts)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full text-center font-mono text-xl font-black tracking-[0.4em] py-2.5 px-3 rounded-xl bg-surface border-2 border-outline-variant focus:border-vibrant-orange outline-none text-on-surface"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={otpStep === 'verifying'}
                      onClick={() => handleRequestDeviceOtp(false)}
                      className="px-3 py-2.5 bg-surface hover:bg-surface-container-high border border-outline-variant rounded-xl text-xs font-bold text-on-surface transition-colors cursor-pointer shrink-0"
                    >
                      Resend
                    </button>
                    <button
                      type="submit"
                      disabled={otpStep === 'verifying' || otpCode.length !== 6}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">verified_user</span>
                      <span className="truncate">
                        {otpStep === 'verifying'
                          ? 'Verifying...'
                          : 'Verify & Bind Device'}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : error ? (
            <div className="py-8 space-y-3 max-w-xs">
              <span className="material-symbols-outlined text-4xl text-error">lock_clock</span>
              <p className="text-sm font-bold text-error">{error}</p>
              <button
                type="button"
                onClick={fetchCredentials}
                className="px-4 py-2 bg-vibrant-orange text-white rounded-xl text-xs font-bold shadow-md hover:bg-deep-orange cursor-pointer"
              >
                Retry Handshake
              </button>
            </div>
          ) : (
            <>
              {/* Online GPS Geofence Telemetry Pill */}
              <div className="w-full">
                {!isOnline || isOfflineVaultMode ? (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">
                        wifi_off
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-amber-900 dark:text-amber-200 block truncate">
                          Offline Mode • Device-Bound Secret Active
                        </span>
                        <span className="text-[10px] text-amber-800 dark:text-amber-300 block truncate">
                          HR scanner queues your signed QR locally and validates on sync.
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 text-[11px] ${
                      gpsStatus === 'acquiring'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                        : !isInsideGeofence || gpsStatus === 'denied' || gpsStatus === 'low_accuracy'
                        ? 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`material-symbols-outlined text-[18px] shrink-0 ${
                          gpsStatus === 'acquiring'
                            ? 'text-amber-600 animate-spin'
                            : !isInsideGeofence || gpsStatus === 'denied' || gpsStatus === 'low_accuracy'
                            ? 'text-red-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {gpsStatus === 'acquiring'
                          ? 'progress_activity'
                          : gpsStatus === 'ready' && isInsideGeofence
                          ? 'my_location'
                          : 'location_searching'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold block truncate">
                          {gpsStatus === 'acquiring'
                            ? 'Acquiring High-Accuracy GPS...'
                            : gpsStatus === 'denied'
                            ? 'GPS Required for Online Attendance'
                            : gpsStatus === 'low_accuracy'
                            ? `Low GPS Accuracy (±${gpsLocation?.acc}m)`
                            : isGeofenceActive && liveDistanceMeters !== null
                            ? isInsideGeofence
                              ? `Within Workplace Geofence (${Math.round(liveDistanceMeters)}m / ${allowedRadiusMeters}m)`
                              : `Outside Workplace Geofence (${Math.round(liveDistanceMeters)}m away; max ${allowedRadiusMeters}m)`
                            : `High-Accuracy GPS Locked (±${gpsLocation?.acc || 0}m)`}
                        </span>
                        {gpsErrorMsg && (
                          <span className="text-[10px] opacity-90 block truncate">{gpsErrorMsg}</span>
                        )}
                      </div>
                    </div>
                    {gpsLocation && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-black/10 dark:bg-white/10 shrink-0">
                        ±{gpsLocation.acc}m
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Structured Dynamic QR Security Pass Card */}
              <div className="w-full max-w-[300px] bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
                {/* Top Ticket Metadata Strip */}
                <div className="w-full flex justify-between items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[9px] font-mono font-bold text-slate-600 uppercase select-none">
                  <span className="truncate">
                    {credentials?.student_number || 'INTERN'} • {credentials?.full_name || 'STUDENT'}
                  </span>
                  <span className="text-vibrant-orange font-extrabold shrink-0">
                    {!isOnline || isOfflineVaultMode ? 'OFFLINE' : 'ONLINE GPS'}
                  </span>
                </div>

                {/* Square QR Matrix Frame */}
                <div className="relative flex items-center justify-center p-3 bg-white">
                  <div className="w-[224px] h-[224px] flex items-center justify-center relative">
                    <canvas
                      ref={canvasRef}
                      className={`!w-[224px] !h-[224px] block rounded-lg transition-all duration-300 pointer-events-none ${
                        isShielded ? 'blur-xl opacity-30' : ''
                      }`}
                    />
                  </div>

                  {/* Shield Overlay when user unfocuses or takes screenshots */}
                  {isShielded && (
                    <div
                      onClick={() => setIsShielded(false)}
                      className="absolute inset-2 bg-slate-900/90 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-4 text-white text-center cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-3xl text-vibrant-orange mb-1 animate-bounce">
                        shield
                      </span>
                      <p className="font-bold text-xs">Security Shield Active</p>
                      <p className="text-[10px] text-slate-300 mt-1">
                        Dynamic QR is shielded while window is unfocused.
                      </p>
                      <span className="mt-2.5 px-3 py-1 bg-vibrant-orange text-white rounded-lg text-[10px] font-bold">
                        Tap to Reveal QR
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Watermark Strip */}
                <div className="w-full flex justify-between items-center gap-2 px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[9px] font-mono text-slate-600 font-semibold select-none">
                  <span className="truncate">{livePstTime || 'PST UTC+8'}</span>
                  <span className="shrink-0 font-bold text-slate-700">30s Rolling TOTP</span>
                </div>
              </div>

              {/* Circular Countdown Progress Bar */}
              <div className="w-full flex items-center justify-between gap-3 bg-surface-container-low px-3.5 py-2 rounded-2xl border border-outline-variant">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                    <svg className="w-9 h-9 -rotate-90" viewBox="0 0 40 40">
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
                        strokeDashoffset={
                          2 * Math.PI * 16 - (secondsLeft / TIME_STEP) * (2 * Math.PI * 16)
                        }
                        strokeLinecap="round"
                        className="text-vibrant-orange transition-all duration-150"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-mono font-black text-on-surface">
                      {secondsLeft}s
                    </span>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">
                      Rotating in {secondsLeft}s
                    </p>
                    <p className="text-[10px] text-on-surface-variant truncate">
                      Single-use Nonce • Signed by Device Keypair
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-vibrant-orange/10 text-vibrant-orange text-[10px] font-mono font-bold shrink-0">
                  v2 TOTP
                </span>
              </div>

              {/* Hardware Device Binding Footer / Inline Re-bind Confirmation */}
              {showChangeDeviceConfirm ? (
                <div className="w-full p-4 bg-surface-container-low rounded-2xl border border-amber-500/40 text-left space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-2xl text-amber-600 shrink-0">
                      phonelink_lock
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-on-surface">
                        Re-bind Attendance Device Key?
                      </h4>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                        Rotates your ECDSA P-256 hardware keypair and sends a 6-digit verification OTP to your registered Gmail.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowChangeDeviceConfirm(false)}
                      className="px-3.5 py-2 bg-surface-container rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={otpStep === 'sending' || !isOnline}
                      onClick={() => handleRequestDeviceOtp(true)}
                      className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">mail_lock</span>
                      <span>{otpStep === 'sending' ? 'Sending OTP...' : 'Send Gmail OTP'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full pt-2 flex items-center justify-between gap-2 text-[11px] text-on-surface-variant border-t border-outline-variant">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="material-symbols-outlined text-[15px] text-emerald-600 shrink-0">
                      verified_user
                    </span>
                    <span
                      className="truncate font-medium"
                      title={credentials?.registered_device_name || getDeviceName()}
                    >
                      Bound: {credentials?.registered_device_name || getDeviceName()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChangeDeviceConfirm(true)}
                    className="px-2.5 py-1 rounded-lg bg-vibrant-orange/10 hover:bg-vibrant-orange/20 text-[10px] text-vibrant-orange font-bold shrink-0 transition-colors cursor-pointer"
                  >
                    Re-bind OTP
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
