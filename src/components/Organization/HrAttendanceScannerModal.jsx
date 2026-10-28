import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../api/client';
import { playAttendanceSuccessChime, playAttendanceErrorChime } from '../../utils/audio';
import { formatPHT12Hour } from '../../utils/timeFormat';

const OFFLINE_QUEUE_STORAGE_KEY = 'interncon_hr_offline_scans_v1';

function readOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeOfflineQueue(items) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(items));
  } catch (_) {}
}

export default function HrAttendanceScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [currentTimePHT, setCurrentTimePHT] = useState('');

  // Network & Offline Scan Queue State
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineQueue, setOfflineQueue] = useState(() => readOfflineQueue());
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Organization Workplace Geofence State
  const [geofenceConfig, setGeofenceConfig] = useState(null);
  const [calibratingGeofence, setCalibratingGeofence] = useState(false);
  const [scannerGps, setScannerGps] = useState(null);
  const scannerGpsRef = useRef(null);

  // High-accuracy scanner terminal GPS watcher
  useEffect(() => {
    if (!isOpen || typeof navigator === 'undefined' || !navigator.geolocation) return;

    let watchId;
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            acc: Math.round(pos.coords.accuracy || 0)
          };
          scannerGpsRef.current = loc;
          setScannerGps(loc);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    } catch (_) {}

    return () => {
      if (watchId !== undefined && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOpen]);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const resetTimerRef = useRef(null);
  const qrRegionId = 'hr-attendance-qr-reader';

  // Track browser online/offline transitions
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Load workplace geofence configuration when modal opens
  const fetchGeofenceConfig = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const res = await api.get('/org/attendance/geofence');
      if (res.success && res.data) {
        setGeofenceConfig(res.data);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      setOfflineQueue(readOfflineQueue());
      fetchGeofenceConfig();
    }
  }, [isOpen, fetchGeofenceConfig]);

  // Calibrate workplace geofence coordinates using HR terminal's current GPS position
  const handleCalibrateGeofence = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported on this browser.');
      return;
    }
    setCalibratingGeofence(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.post('/org/attendance/geofence', {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            geofence_radius_meters: geofenceConfig?.geofence_radius_meters || 100,
            enforce_geofence: true
          });
          if (res.success && res.data) {
            setGeofenceConfig({
              ...geofenceConfig,
              ...res.data,
              configured: true
            });
          } else {
            alert(res.message || 'Failed to update workplace geofence.');
          }
        } catch (err) {
          alert(err.message || 'Error calibrating workplace geofence.');
        } finally {
          setCalibratingGeofence(false);
        }
      },
      (err) => {
        setCalibratingGeofence(false);
        alert(err.message || 'Unable to read GPS location. Please allow browser location access.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  // Sync queued offline scans to backend when connection is restored
  const handleSyncOfflineScans = useCallback(async () => {
    const queue = readOfflineQueue();
    if (!queue.length || syncingOffline || !navigator.onLine) return;

    setSyncingOffline(true);
    try {
      const res = await api.post('/org/attendance/sync-offline', {
        scans: queue
      });

      if (res.success && res.data) {
        writeOfflineQueue([]);
        setOfflineQueue([]);

        const results = res.data.results || [];
        results.forEach((item) => {
          addRecentScan({
            id: Date.now() + Math.random(),
            status: item.status === 'synced' ? 'success' : 'failed',
            action: item.action || 'error',
            internName: item.student_name || `Student #${item.student_id || '?'}`,
            detail:
              item.status === 'synced'
                ? `Synced Offline (${item.action === 'time_in' ? 'Time-In' : 'Time-Out'})`
                : `Offline Sync Rejected: ${item.reason}`,
            time: 'Synced'
          });
        });

        if (onScanSuccess && res.data.synced_count > 0) {
          onScanSuccess(res);
        }
      }
    } catch (_) {
      // Keep queue intact if network fails again
    } finally {
      setSyncingOffline(false);
    }
  }, [syncingOffline, onScanSuccess]);

  // Auto-sync offline queue when browser transitions back online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && !syncingOffline) {
      handleSyncOfflineScans();
    }
  }, [isOnline, offlineQueue.length, syncingOffline, handleSyncOfflineScans]);

  // Live PHT Clock ticker
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        setCurrentTimePHT(timeStr);
      } catch (_) {
        setCurrentTimePHT(new Date().toLocaleTimeString());
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to append to session activity log
  const addRecentScan = (entry) => {
    setRecentScans((prev) => [entry, ...prev].slice(0, 5));
  };

  // Diagnostic warning explanation helper
  const getWarningDiagnostic = (message) => {
    const msg = String(message || '').toLowerCase();

    if (msg.includes('outside workplace geofence') || msg.includes('geofence') || msg.includes('away from')) {
      return {
        category: 'OUTSIDE_GEOFENCE',
        title: 'Outside Workplace Geofence Radius',
        icon: 'wrong_location',
        badge: 'Haversine Geofence Violation',
        color: 'red',
        explanation:
          'The student’s high-accuracy GPS location is outside your organization’s allowed geofence radius (default 100m). Online attendance requires physical presence at the workplace.',
        actionStep:
          'Ensure the intern is physically at your office desk with High-Accuracy Location enabled, or click "Calibrate Office GPS" above if your office location moved.'
      };
    }

    if (msg.includes('low gps accuracy') || msg.includes('gps location required')) {
      return {
        category: 'LOW_GPS_ACCURACY',
        title: 'Insufficient or Missing GPS Telemetry',
        icon: 'location_disabled',
        badge: 'GPS Accuracy Rejected',
        color: 'amber',
        explanation:
          'The student’s phone either blocked location access or reported a coarse cell-tower/IP location exceeding the accuracy threshold.',
        actionStep:
          'Instruct the student to enable High-Accuracy Location on their Android phone and refresh their QR modal.'
      };
    }

    if (msg.includes('suspicious gps jump') || msg.includes('spoofing') || msg.includes('mock location')) {
      return {
        category: 'IMPOSSIBLE_LOCATION_JUMP',
        title: 'Impossible GPS Velocity Jump Detected',
        icon: 'gpp_bad',
        badge: 'Anti-Spoofing Triggered',
        color: 'red',
        explanation:
          'Consecutive scans showed an impossible travel speed (>200 km/h), indicating potential GPS spoofing or mock-location software.',
        actionStep:
          'Instruct the intern to disable any mock-location or developer spoofing apps on their Android phone.'
      };
    }

    if (msg.includes('replay') || msg.includes('already scanned') || msg.includes('nonce')) {
      return {
        category: 'REPLAY_DETECTED',
        title: 'Replayed QR Nonce Rejected',
        icon: 'block',
        badge: 'Replay Attack Blocked',
        color: 'red',
        explanation:
          'Every dynamic QR payload includes a single-use cryptographic nonce. This exact QR code has already been scanned and consumed.',
        actionStep:
          'Wait for the student’s QR code to rotate to the next 30-second window before scanning again.'
      };
    }

    if (
      msg.includes('unregistered device') ||
      msg.includes('different phone') ||
      msg.includes('6-digit gmail otp') ||
      msg.includes('hardware device signature')
    ) {
      return {
        category: 'DEVICE_MISMATCH',
        title: 'Unbound Phone / Hardware Signature Mismatch',
        icon: 'phonelink_lock',
        badge: 'Device Binding Enforced',
        color: 'red',
        explanation:
          'This QR code was not signed by the ECDSA P-256 private key of the student’s registered Android device.',
        actionStep:
          'If the student got a new phone, they must tap "Send 6-Digit OTP to Gmail" on their screen and verify the OTP to re-bind their new device.'
      };
    }

    if (
      msg.includes('expired') ||
      msg.includes('totp') ||
      msg.includes('token') ||
      msg.includes('time-bound') ||
      msg.includes('signature')
    ) {
      return {
        category: 'EXPIRED_OR_STALE_QR',
        title: 'Expired Dynamic Security Token',
        icon: 'timer_off',
        badge: 'Time-Bound Token Expiry',
        color: 'amber',
        explanation:
          'Attendance QR codes dynamically refresh every 30 seconds to prevent attendance proxying and photo/screenshot sharing. This token was presented after its validity window elapsed.',
        actionStep:
          'Instruct the intern to pull down to refresh or tap "Regenerate QR" on their mobile app, then present the active code immediately.'
      };
    }

    if (
      msg.includes('not currently enrolled') ||
      msg.includes('not enrolled') ||
      msg.includes('placement') ||
      msg.includes('not found') ||
      msg.includes('unauthorized')
    ) {
      return {
        category: 'UNAUTHORIZED_PLACEMENT',
        title: 'Unassigned or Inactive Placement',
        icon: 'person_cancel',
        badge: 'Placement Mismatch',
        color: 'red',
        explanation:
          'This student does not have an active, ongoing internship registered with your organization in the InternConPH database.',
        actionStep:
          'Verify that the student was officially accepted into your organization and that their placement status is marked as "Ongoing".'
      };
    }

    if (
      msg.includes('already completed') ||
      msg.includes('already clocked out') ||
      msg.includes('completed their shift')
    ) {
      return {
        category: 'SHIFT_ALREADY_COMPLETED',
        title: 'Daily Shift Already Concluded',
        icon: 'event_available',
        badge: 'Shift Concluded',
        color: 'blue',
        explanation:
          'This intern has already recorded both Time-In and Time-Out for today. The attendance policy allows one automated shift cycle per training day.',
        actionStep:
          'If the student is working an authorized split shift or overtime, their workplace mentor can manually log or certify the extra hours.'
      };
    }

    if (
      msg.includes('credentials') ||
      msg.includes('device') ||
      msg.includes('not initialized') ||
      msg.includes('bound')
    ) {
      return {
        category: 'DEVICE_NOT_INITIALIZED',
        title: 'Unpaired Attendance Device',
        icon: 'phonelink_lock',
        badge: 'Security Device Registration',
        color: 'amber',
        explanation:
          'The student has not completed cryptographic device pairing on their phone. Attendance credentials must be generated on their registered handset.',
        actionStep:
          'Instruct the student to visit Student Dashboard > Attendance Settings to initialize and pair their mobile device.'
      };
    }

    return {
      category: 'GENERAL_VERIFICATION_FAILURE',
      title: 'Verification Rejected',
      icon: 'warning',
      badge: 'Security Validation Error',
      color: 'red',
      explanation:
        message || 'The submitted attendance payload failed cryptographic signature and placement verification.',
      actionStep:
        'Ensure the student displays their QR directly on screen with brightness set to 50% or higher. Hold steady 6-10 inches from camera.'
    };
  };

  // Queue an offline scan locally when HR desk has no internet connectivity
  const queueOfflineScanLocally = (rawPayload, currentTimeLabel) => {
    let parsed;
    try {
      parsed = JSON.parse(rawPayload.trim());
    } catch (_) {
      const msg = 'Malformed QR payload cannot be queued offline.';
      setScanResult({ type: 'error', message: msg });
      setScanFeedback({ status: 'failed', action: null, message: msg });
      return;
    }

    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);
    const qrTs = parseInt(parsed.ts, 10);

    if (!parsed.sid || isNaN(qrTs) || Math.abs(nowSec - qrTs) > 60) {
      const msg = 'Offline Scan Rejected: QR code timestamp is expired (>60s old at scan time).';
      try { playAttendanceErrorChime(); } catch (_) {}
      setScanResult({ type: 'error', message: msg });
      setScanFeedback({ status: 'failed', action: null, message: msg });
      return;
    }

    const existingQueue = readOfflineQueue();
    const nonceKey = parsed.n || `v1_${parsed.sid}_${qrTs}`;
    if (existingQueue.some((item) => item.nonce === nonceKey)) {
      const msg = 'Offline Replay Rejected: This QR nonce is already in the offline sync queue.';
      try { playAttendanceErrorChime(); } catch (_) {}
      setScanResult({ type: 'error', message: msg });
      setScanFeedback({ status: 'failed', action: null, message: msg });
      return;
    }

    const newEntry = {
      id: `off_${nowMs}_${Math.random().toString(36).slice(2, 7)}`,
      qr_payload: rawPayload,
      scanned_at_ms: nowMs,
      student_id: parsed.sid,
      nonce: nonceKey,
      timeLabel: currentTimeLabel
    };

    const updatedQueue = [...existingQueue, newEntry];
    writeOfflineQueue(updatedQueue);
    setOfflineQueue(updatedQueue);

    try { playAttendanceSuccessChime(); } catch (_) {}
    setScanResult({
      type: 'success',
      action: 'offline_queued',
      message: 'Offline Scan Captured & Queued! Will auto-verify ECDSA signature & TOTP when back online.',
      data: {
        student_name: `Student ID #${parsed.sid} (Offline Queue)`,
        student_id: parsed.sid,
        student_number: parsed.sid,
        action: 'offline_queued',
        time_in: currentTimeLabel,
        mentor_name: 'Pending Online Sync Verification'
      }
    });
    setScanFeedback({
      status: 'success',
      action: 'offline_queued',
      intern: `Student #${parsed.sid}`,
      time: currentTimeLabel
    });
    addRecentScan({
      id: nowMs,
      status: 'success',
      action: 'time_in',
      internName: `Student #${parsed.sid}`,
      detail: 'Queued Offline (Awaiting Sync)',
      time: currentTimeLabel
    });
  };

  // Process QR Payload via backend API (or local offline queue if HR terminal is offline)
  const handleProcessPayload = async (rawPayload) => {
    if (isProcessingRef.current || isStoppingRef.current) return;
    isProcessingRef.current = true;
    setLoading(true);
    setScanResult(null);

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    const currentTimeLabel = new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueOfflineScanLocally(rawPayload, currentTimeLabel);
      setLoading(false);
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 3500);
      return;
    }

    try {
      const curScannerGps = scannerGpsRef.current;
      const res = await api.post('/org/attendance/scan-qr', {
        qr_payload: rawPayload,
        scanner_lat: curScannerGps?.lat,
        scanner_lng: curScannerGps?.lng,
        scanner_acc: curScannerGps?.acc
      });

      if (res.isNetworkError) {
        queueOfflineScanLocally(rawPayload, currentTimeLabel);
      } else if (res.status === 404) {
        try {
          playAttendanceErrorChime();
        } catch (_) {}
        const errMsg =
          'The attendance QR scanner service is currently updating. Please wait ~15-30 seconds and try again.';
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
        try {
          playAttendanceSuccessChime();
        } catch (_) {}
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
          time:
            res.action === 'time_in'
              ? formatPHT12Hour(res.data?.time_in)
              : formatPHT12Hour(res.data?.time_out)
        });
        addRecentScan({
          id: Date.now(),
          status: 'success',
          action: res.action,
          internName: res.data?.student_name,
          studentNumber: res.data?.student_number,
          detail:
            res.action === 'time_in'
              ? `In: ${formatPHT12Hour(res.data?.time_in)} (${
                  res.data?.time_in_status === 'late' ? 'Late' : 'On-Time'
                })`
              : `Out: ${formatPHT12Hour(res.data?.time_out)} (${res.data?.hours_rendered || 0} hrs)`,
          time: currentTimeLabel
        });

        if (onScanSuccess) {
          onScanSuccess(res);
        }

        // Auto reset scan status after 7 seconds if no new scan
        resetTimerRef.current = setTimeout(() => {
          setScanFeedback(null);
        }, 7000);
      } else {
        try {
          playAttendanceErrorChime();
        } catch (_) {}
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
      try {
        playAttendanceErrorChime();
      } catch (_) {}
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
      // Wait 3.5 seconds cooldown before allowing next scan to avoid camera double-fire
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
              try {
                track.stop();
              } catch (_) {}
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
      } catch (_) {}
      try {
        instance.clear();
      } catch (_) {}
    }

    setScannerActive(false);
    isStoppingRef.current = false;
  }, [qrRegionId]);

  // Enumerate cameras when modal opens
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Pick environment or back camera by default if available
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('rear')
          );
          if (backCam) {
            setSelectedCameraId(backCam.id);
          } else {
            setSelectedCameraId(devices[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not enumerate cameras:', err);
      });
  }, [isOpen]);

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
        await stopScannerSafely();
        // Allow DOM container to render
        await new Promise((r) => setTimeout(r, 180));
        if (!isMounted || !document.getElementById(qrRegionId)) return;

        const html5QrCode = new Html5Qrcode(qrRegionId);
        scannerRef.current = html5QrCode;

        // Responsive full-view QR configuration with native hardware BarcodeDetector acceleration
        const config = {
          fps: 20,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.90);
            return { width: Math.max(260, edge), height: Math.max(260, edge) };
          },
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        const cameraSource = selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'environment' };

        await html5QrCode.start(
          cameraSource,
          config,
          (decodedText) => {
            if (!isProcessingRef.current && isMounted) {
              handleProcessPayload(decodedText);
            }
          },
          () => {
            // Frame tick - silent
          }
        );

        if (isMounted) setScannerActive(true);
      } catch (err) {
        console.warn('Camera scanner startup warning:', err);
        if (isMounted) {
          setCameraError(
            err.message || 'Unable to access camera. Please allow camera permissions in your browser.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScannerSafely();
    };
  }, [isOpen, selectedCameraId, stopScannerSafely]);

  // Reset scan display and allow immediate scan
  const handleResetForNextIntern = () => {
    setScanResult(null);
    setScanFeedback(null);
    isProcessingRef.current = false;
  };

  // Clean state on modal close
  const handleClose = async () => {
    if (closing) return;
    setClosing(true);
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    await stopScannerSafely();
    setScanResult(null);
    setScanFeedback(null);
    onClose();
    setClosing(false);
  };

  if (!isOpen) return null;

  const warningDiagnostic =
    scanResult?.type === 'error' ? getWarningDiagnostic(scanResult.message) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Scoped CSS to enforce edge-to-edge video coverage & holographic reticle */}
      <style>{`
        #hr-attendance-qr-reader {
          width: 100% !important;
          height: 100% !important;
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
          background-color: #030807 !important;
        }
        #hr-attendance-qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          object-position: center !important;
          position: absolute !important;
          inset: 0 !important;
          margin: auto !important;
          border-radius: inherit !important;
        }
        #hr-attendance-qr-reader canvas {
          display: none !important;
        }
        #hr-attendance-qr-reader img {
          display: none !important;
        }
        #hr-attendance-qr-reader__scan_region {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          position: relative !important;
          border: none !important;
        }
        #hr-attendance-qr-reader__scan_region video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: absolute !important;
          inset: 0 !important;
        }
        #hr-attendance-qr-reader__dashboard {
          display: none !important;
        }
        #hr-attendance-qr-reader__header_message {
          display: none !important;
        }

        @keyframes qrLaserSweep {
          0%, 100% {
            top: 8%;
            opacity: 0.95;
          }
          50% {
            top: 88%;
            opacity: 0.95;
          }
        }

        .qr-laser-beam {
          position: absolute;
          left: 10%;
          right: 10%;
          height: 3px;
          background: linear-gradient(90deg, transparent, rgba(255, 180, 51, 0.7), #FFB433, rgba(255, 180, 51, 0.7), transparent);
          box-shadow: 0 0 15px #FFB433, 0 0 30px rgba(255, 180, 51, 0.6);
          animation: qrLaserSweep 2.2s ease-in-out infinite;
          pointer-events: none;
          z-index: 15;
        }

        .qr-laser-beam-success {
          background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.8), #10b981, rgba(16, 185, 129, 0.8), transparent) !important;
          box-shadow: 0 0 18px #10b981, 0 0 35px rgba(16, 185, 129, 0.65) !important;
        }

        .qr-laser-beam-failed {
          background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.8), #ef4444, rgba(239, 68, 68, 0.8), transparent) !important;
          box-shadow: 0 0 18px #ef4444, 0 0 35px rgba(239, 68, 68, 0.65) !important;
        }
      `}</style>

      {/* Wider Executive Modal Shell (max-w-5xl) */}
      <div className="bg-surface rounded-3xl border border-outline-variant shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-vibrant-orange/15 via-surface-container-high/60 to-transparent border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-vibrant-orange text-white flex items-center justify-center shadow-md shrink-0">
              <span className="material-symbols-outlined text-[26px]">qr_code_scanner</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-on-surface">
                  HR Attendance Desk Scanner
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-tint text-vibrant-orange border border-vibrant-orange/30 tracking-wide">
                  HR Premises Terminal
                </span>
              </div>
              <p className="text-xs text-on-surface-variant flex items-center gap-2">
                <span>Physical premises validation • Automated Time-In & Time-Out</span>
                <span className="hidden sm:inline font-mono text-[11px] font-bold text-pinoy-green">
                  • {currentTimePHT} PHT
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={closing}
              className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
              title="Close scanner"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* 2-Column Wide Desk Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-outline-variant/70 overflow-y-auto">
          {/* LEFT COLUMN: Camera Scanner Bay (md:col-span-6 lg:col-span-5) */}
          <div className="p-4 sm:p-6 md:col-span-6 lg:col-span-5 space-y-4 bg-surface-container-lowest/50 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Camera Header Status & Controls */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-on-surface">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      scannerActive ? 'bg-pinoy-green animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span>{scannerActive ? 'Camera Feed Active' : 'Initializing Hardware...'}</span>
                </div>

                {cameras.length > 1 && (
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                      videocam
                    </span>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="text-[11px] font-medium bg-surface-container rounded-lg border border-outline-variant px-2 py-1 text-on-surface outline-none focus:ring-1 focus:ring-vibrant-orange cursor-pointer max-w-[150px] truncate"
                    >
                      {cameras.map((c, idx) => (
                        <option key={c.id} value={c.id}>
                          {c.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* High-Tech Camera Viewport with Futuristic HUD */}
              <div
                className={`relative bg-[#030807] rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-square md:aspect-[4/3] w-full flex items-center justify-center border-2 transition-all duration-300 shadow-xl ${
                  scanFeedback?.status === 'success'
                    ? 'border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.5)]'
                    : scanFeedback?.status === 'failed'
                    ? 'border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.5)]'
                    : 'border-outline-variant/80 hover:border-vibrant-orange/60'
                }`}
              >
                {/* The html5-qrcode video is injected here and forced to object-cover */}
                <div id={qrRegionId} className="w-full h-full" />

                {/* Laser scanline animation */}
                {scannerActive && !cameraError && (
                  <div
                    className={`qr-laser-beam ${
                      scanFeedback?.status === 'success'
                        ? 'qr-laser-beam-success'
                        : scanFeedback?.status === 'failed'
                        ? 'qr-laser-beam-failed'
                        : ''
                    }`}
                  />
                )}

                {/* Corner reticle targeting brackets HUD */}
                <div className="absolute inset-4 sm:inset-6 pointer-events-none z-10 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div
                      className={`w-7 h-7 border-t-3 border-l-3 rounded-tl-lg transition-colors ${
                        scanFeedback?.status === 'success'
                          ? 'border-emerald-400'
                          : scanFeedback?.status === 'failed'
                          ? 'border-red-400'
                          : 'border-vibrant-orange/80'
                      }`}
                    />
                    <div
                      className={`w-7 h-7 border-t-3 border-r-3 rounded-tr-lg transition-colors ${
                        scanFeedback?.status === 'success'
                          ? 'border-emerald-400'
                          : scanFeedback?.status === 'failed'
                          ? 'border-red-400'
                          : 'border-vibrant-orange/80'
                      }`}
                    />
                  </div>

                  {/* Center Target Indicator Crosshair */}
                  <div className="self-center flex items-center justify-center opacity-40">
                    <div className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white/70 rounded-full" />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <div
                      className={`w-7 h-7 border-b-3 border-l-3 rounded-bl-lg transition-colors ${
                        scanFeedback?.status === 'success'
                          ? 'border-emerald-400'
                          : scanFeedback?.status === 'failed'
                          ? 'border-red-400'
                          : 'border-vibrant-orange/80'
                      }`}
                    />
                    <div
                      className={`w-7 h-7 border-b-3 border-r-3 rounded-br-lg transition-colors ${
                        scanFeedback?.status === 'success'
                          ? 'border-emerald-400'
                          : scanFeedback?.status === 'failed'
                          ? 'border-red-400'
                          : 'border-vibrant-orange/80'
                      }`}
                    />
                  </div>
                </div>

                {/* Camera Startup Spinner */}
                {!scannerActive && !cameraError && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white space-y-2 bg-[#030807]/80 p-4 text-center backdrop-blur-xs">
                    <div className="animate-spin rounded-full h-9 w-9 border-3 border-vibrant-orange border-t-transparent" />
                    <p className="text-xs font-bold tracking-wide">Connecting Optical Camera Feed...</p>
                  </div>
                )}

                {/* Camera Hardware Permission Error */}
                {cameraError && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-error space-y-2 bg-[#030807]/95 p-6 text-center">
                    <span className="material-symbols-outlined text-4xl text-red-500">no_photography</span>
                    <p className="text-xs font-bold text-red-400">{cameraError}</p>
                    <p className="text-[11px] text-white/70">
                      Please allow camera device permissions in your browser address bar.
                    </p>
                  </div>
                )}
              </div>

              {/* Instructions under camera */}
              <div className="p-3 bg-surface-container rounded-xl border border-outline-variant text-[11px] text-on-surface-variant flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-vibrant-orange shrink-0">
                  center_focus_strong
                </span>
                <span>
                  Align the intern's live dynamic QR within the reticle. The system auto-captures and verifies in ~0.5 seconds.
                </span>
              </div>
            </div>

            {/* Separation of Duties Policy Note */}
            <div className="pt-2">
              <div className="p-3 bg-surface-container rounded-xl border border-outline-variant flex items-start gap-2.5 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] text-pinoy-green shrink-0 mt-0.5">
                  verified_user
                </span>
                <div className="space-y-0.5 text-[11px]">
                  <p className="font-bold text-on-surface">Automated Premises Attendance</p>
                  <p className="leading-relaxed">
                    HR staff oversees the physical scanner at desk premises to eliminate proxying. Completed Time-In and Time-Out shifts are automatically recorded and credited.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Indicator Desk, Diagnostic Explanations & Activity Feed (md:col-span-6 lg:col-span-7) */}
          <div className="p-4 sm:p-6 md:col-span-6 lg:col-span-7 space-y-4 bg-surface flex flex-col justify-between">
            <div className="space-y-4">
              {/* Desk Section Header */}
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-vibrant-orange">
                    badge
                  </span>
                  <span className="font-bold text-xs uppercase tracking-wider text-on-surface">
                    Verification & Verification Status
                  </span>
                </div>

                {/* Live Status Tag */}
                {loading ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Verifying Cryptographic TOTP...</span>
                  </span>
                ) : scanResult?.type === 'success' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-green-tint text-pinoy-green border border-pinoy-green/30 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-pinoy-green animate-pulse" />
                    <span>Scan Confirmed</span>
                  </span>
                ) : scanResult?.type === 'error' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-600 border border-red-500/30">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    <span>Verification Blocked</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-container text-on-surface-variant border border-outline-variant">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-pinoy-green' : 'bg-amber-500'}`} />
                    <span>{isOnline ? 'Standby • Ready for QR' : 'Offline Mode • Local Queue Active'}</span>
                  </span>
                )}
              </div>

              {/* Workplace Geofence Status & Calibration Bar */}
              <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      geofenceConfig?.configured ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {geofenceConfig?.configured ? 'where_to_vote' : 'add_location_alt'}
                  </span>
                  <div>
                    <span className="font-bold text-on-surface text-[11px] block">
                      {geofenceConfig?.configured
                        ? `Workplace Geofence Active (${geofenceConfig.geofence_radius_meters || 100}m Radius)`
                        : 'Workplace Geofence Not Calibrated Yet'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      {geofenceConfig?.configured
                        ? `Coords: ${Number(geofenceConfig.latitude).toFixed(4)}, ${Number(geofenceConfig.longitude).toFixed(4)} • Haversine Check On`
                        : 'Set your office GPS coordinates to enforce 100m Haversine proximity on student scans.'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={calibratingGeofence || !isOnline}
                  onClick={handleCalibrateGeofence}
                  className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-container-high border border-outline-variant text-[11px] font-bold text-on-surface flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px] text-vibrant-orange">
                    my_location
                  </span>
                  <span>
                    {calibratingGeofence
                      ? 'Calibrating GPS...'
                      : geofenceConfig?.configured
                      ? 'Recalibrate Office GPS'
                      : 'Set Office GPS (100m)'}
                  </span>
                </button>
              </div>

              {/* Offline Scan Queue & Sync Banner */}
              {(offlineQueue.length > 0 || !isOnline) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-amber-600">
                      cloud_sync
                    </span>
                    <div>
                      <span className="font-bold text-amber-950 dark:text-amber-200 block">
                        {offlineQueue.length > 0
                          ? `${offlineQueue.length} Offline Scan(s) Queued Locally`
                          : 'Scanner Offline Mode Active'}
                      </span>
                      <span className="text-[10px] text-amber-800 dark:text-amber-300">
                        {isOnline
                          ? 'Connection restored. Ready to re-validate ECDSA signatures, TOTP windows & nonces.'
                          : 'Scans are validated for freshness and stored locally until internet returns.'}
                      </span>
                    </div>
                  </div>
                  {offlineQueue.length > 0 && (
                    <button
                      type="button"
                      disabled={!isOnline || syncingOffline}
                      onClick={handleSyncOfflineScans}
                      className="px-3 py-1.5 rounded-lg bg-vibrant-orange hover:bg-deep-orange disabled:opacity-50 text-white text-[11px] font-bold shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">sync</span>
                      <span>{syncingOffline ? 'Syncing...' : `Sync Now (${offlineQueue.length})`}</span>
                    </button>
                  )}
                </div>
              )}

              {/* STATE 1: IDLE / WAITING FOR QR */}
              {!loading && !scanResult && (
                <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/80 text-center space-y-4 py-8">
                  <div className="w-14 h-14 rounded-2xl bg-orange-tint text-vibrant-orange mx-auto flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-3xl">sensors</span>
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <h4 className="font-bold text-base text-on-surface">Scanner Ready for Intern</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Instruct the intern to display their dynamic QR code from their mobile screen under the camera.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left pt-2 max-w-md mx-auto">
                    <div className="p-2.5 bg-surface rounded-xl border border-outline-variant/60 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-on-surface">
                        <span className="material-symbols-outlined text-[15px] text-vibrant-orange">
                          update
                        </span>
                        <span>Auto Time In/Out</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant leading-tight">
                        Automatically recognizes whether to check in or check out.
                      </p>
                    </div>

                    <div className="p-2.5 bg-surface rounded-xl border border-outline-variant/60 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-on-surface">
                        <span className="material-symbols-outlined text-[15px] text-pinoy-green">
                          lock_clock
                        </span>
                        <span>Rolling 30s TOTP</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant leading-tight">
                        Stops attendance proxying and photo screenshot sharing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STATE 2: LOADING / CRYPTOGRAPHIC VERIFICATION */}
              {loading && (
                <div className="p-6 bg-surface-container rounded-2xl border border-vibrant-orange/40 text-center space-y-4 py-10 animate-fade-in shadow-inner">
                  <div className="animate-spin rounded-full h-12 w-12 border-3 border-vibrant-orange border-t-transparent mx-auto" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-on-surface">
                      Verifying Cryptographic TOTP Signature...
                    </h4>
                    <p className="text-xs text-on-surface-variant">
                      Validating student identity, registered device token, and placement enrollment.
                    </p>
                  </div>
                </div>
              )}

              {/* STATE 3: SUCCESS RESULT (PROMINENT, EXPANDED & EXECUTIVE) */}
              {scanResult?.type === 'success' && (
                <div className="p-5 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 via-surface-container-low to-surface-container text-on-surface shadow-lg animate-fade-in space-y-4">
                  {/* Top Status Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
                        <span className="material-symbols-outlined text-[28px]">check_circle</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
                            SUCCESS
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono border ${
                              scanResult.action === 'time_in'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200'
                                : 'bg-orange-tint text-vibrant-orange border-vibrant-orange/40'
                            }`}
                          >
                            {scanResult.action === 'time_in' ? 'CLOCK-IN' : 'CLOCK-OUT'}
                          </span>
                        </div>
                        <h4 className="font-bold text-base sm:text-lg text-emerald-900 dark:text-emerald-200 mt-0.5">
                          {scanResult.action === 'time_in'
                            ? 'Time-In Logged Successfully'
                            : 'Time-Out Logged Successfully'}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetForNextIntern}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface transition-colors shadow-2xs cursor-pointer"
                      title="Ready for next intern"
                    >
                      <span className="material-symbols-outlined text-[15px] text-pinoy-green">
                        refresh
                      </span>
                      <span>Next Intern</span>
                    </button>
                  </div>

                  {/* Student Details Card */}
                  {scanResult.data && (
                    <div className="p-3.5 bg-surface rounded-xl border border-outline-variant/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                          Intern Identity
                        </span>
                        <p className="font-bold text-sm text-on-surface">
                          {scanResult.data.student_name}
                        </p>
                        <p className="text-[11px] font-mono text-on-surface-variant">
                          Student ID: #{scanResult.data.student_number || scanResult.data.student_id}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                          Shift Record & Timestamp
                        </span>
                        <p className="font-mono font-bold text-sm text-on-surface flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-vibrant-orange">
                            schedule
                          </span>
                          <span>
                            {scanResult.data.action === 'time_in'
                              ? `${formatPHT12Hour(scanResult.data.time_in)} (${
                                  scanResult.data.time_in_status === 'late' ? 'Late' : 'On-Time'
                                })`
                              : `${formatPHT12Hour(scanResult.data.time_out)} (${
                                  scanResult.data.hours_rendered
                                } hrs rendered)`}
                          </span>
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          Supervisor: {scanResult.data.mentor_name || 'Assigned Workplace Mentor'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Operational Next Steps Note */}
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">
                      info
                    </span>
                    <span className="leading-relaxed">
                      {scanResult.action === 'time_in'
                        ? "Intern's daily attendance entry is created. Shift counter is officially active."
                        : 'Shift completed. Rendered training hours have been automatically recorded and credited.'}
                    </span>
                  </div>
                </div>
              )}

              {/* STATE 4: FAILED RESULT WITH IN-DEPTH DIAGNOSTIC WARNING EXPLANATION */}
              {scanResult?.type === 'error' && warningDiagnostic && (
                <div className="p-5 rounded-2xl border-2 border-red-500/50 bg-gradient-to-br from-red-500/10 via-surface-container-low to-surface-container text-on-surface shadow-lg animate-fade-in space-y-4">
                  {/* Alert Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-md shrink-0">
                        <span className="material-symbols-outlined text-[28px]">gpp_bad</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-2xs">
                            REJECTED
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
                            {warningDiagnostic.badge}
                          </span>
                        </div>
                        <h4 className="font-bold text-base sm:text-lg text-red-950 dark:text-red-200 mt-0.5">
                          {warningDiagnostic.title}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetForNextIntern}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface transition-colors shadow-2xs cursor-pointer"
                      title="Try scan again"
                    >
                      <span className="material-symbols-outlined text-[15px] text-vibrant-orange">
                        refresh
                      </span>
                      <span>Retry Scan</span>
                    </button>
                  </div>

                  {/* System Error String */}
                  <div className="p-3 bg-surface rounded-xl border border-red-500/20 text-xs text-red-700 dark:text-red-300 font-medium">
                    <div className="flex items-center gap-1.5 font-bold mb-0.5">
                      <span className="material-symbols-outlined text-[15px]">error_outline</span>
                      <span>System Rejection Message:</span>
                    </div>
                    <p className="leading-relaxed pl-5">{scanResult.message}</p>
                  </div>

                  {/* Dedicated Warning Explanation Box */}
                  <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                      <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                      <span>Why Did This Happen?</span>
                    </div>
                    <p className="text-on-surface-variant leading-relaxed">
                      {warningDiagnostic.explanation}
                    </p>

                    <div className="pt-2 border-t border-amber-500/20 flex items-start gap-2 text-amber-900 dark:text-amber-200">
                      <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0 mt-0.5">
                        arrow_circle_right
                      </span>
                      <div>
                        <span className="font-bold">Recommended Resolution: </span>
                        <span>{warningDiagnostic.actionStep}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Session Scan History (Last 4 Scans) */}
              {recentScans.length > 0 && (
                <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-vibrant-orange">
                        history
                      </span>
                      <span>Session Scans Activity</span>
                    </span>
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      Last {recentScans.length} events
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {recentScans.slice(0, 4).map((scan) => (
                      <div
                        key={scan.id}
                        className="p-2 bg-surface rounded-xl border border-outline-variant/60 flex items-center justify-between gap-2 text-[11px]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`material-symbols-outlined text-[16px] shrink-0 ${
                              scan.status === 'success' ? 'text-emerald-600' : 'text-red-500'
                            }`}
                          >
                            {scan.status === 'success' ? 'check_circle' : 'cancel'}
                          </span>
                          <div className="truncate">
                            <span className="font-bold text-on-surface truncate block">
                              {scan.internName}
                            </span>
                            <span className="text-[10px] text-on-surface-variant block">
                              {scan.detail}
                            </span>
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
                            {scan.status === 'success'
                              ? scan.action === 'time_in'
                                ? 'IN'
                                : 'OUT'
                              : 'FAIL'}
                          </span>
                          <span className="text-[9px] text-on-surface-variant block font-mono">
                            {scan.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="pt-3 border-t border-outline-variant flex items-center justify-between gap-2">
              <span className="text-[11px] text-on-surface-variant font-medium">
                {closing
                  ? 'Releasing camera hardware...'
                  : scannerActive
                  ? '🟢 Optical scanning engine live'
                  : 'Scanner paused'}
              </span>

              <div className="flex items-center gap-2">
                {scanResult && (
                  <button
                    type="button"
                    onClick={handleResetForNextIntern}
                    className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-all border border-outline-variant cursor-pointer"
                  >
                    Clear Display
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={closing}
                  className="px-5 py-2 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {closing ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Closing...</span>
                    </>
                  ) : (
                    <span>Done</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
