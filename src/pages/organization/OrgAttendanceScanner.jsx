import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { playAttendanceSuccessChime, playAttendanceErrorChime } from '../../utils/audio';
import { formatPHT12Hour } from '../../utils/timeFormat';

const OFFLINE_QUEUE_STORAGE_KEY = 'interncon_hr_offline_scans_v1';
const SYNC_CHANNEL_NAME = 'interncon_attendance_sync';
const LAST_SCAN_STORAGE_KEY = 'interncon_last_qr_scan_ts';

function notifyCrossTabAttendanceUpdate(payload = {}) {
  const ts = String(Date.now());
  try {
    localStorage.setItem(LAST_SCAN_STORAGE_KEY, ts);
  } catch (_) {}
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
      ch.postMessage({ type: 'ATTENDANCE_UPDATED', ts, ...payload });
      ch.close();
    }
  } catch (_) {}
}

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

function parseQrTelemetry(payload) {
  if (!payload || typeof payload !== 'string') return null;
  let loc = null;
  let studentId = null;
  let mode = 'online';

  if (payload.startsWith('v2|')) {
    const parts = payload.split('|');
    studentId = parts[1] || null;
    mode = parts[6] || 'online';
    const locStr = parts[7] || '';
    if (locStr && locStr !== 'none') {
      const p = locStr.split(',');
      if (p.length >= 2 && !isNaN(Number(p[0])) && !isNaN(Number(p[1]))) {
        loc = {
          lat: Number(Number(p[0]).toFixed(6)),
          lng: Number(Number(p[1]).toFixed(6)),
          acc: p[2] && !isNaN(Number(p[2])) ? Math.round(Number(p[2])) : null,
          ts: p[3] && !isNaN(Number(p[3])) ? parseInt(p[3], 10) : null
        };
      }
    }
  } else if (payload.startsWith('{')) {
    try {
      const json = JSON.parse(payload);
      studentId = json.sid || json.student_id;
      mode = json.mode || 'online';
      if (json.loc) {
        loc = {
          lat: Number(Number(json.loc.lat).toFixed(6)),
          lng: Number(Number(json.loc.lng).toFixed(6)),
          acc: json.loc.acc != null ? Math.round(Number(json.loc.acc)) : null,
          ts: json.loc.ts != null ? parseInt(json.loc.ts, 10) : null
        };
      }
    } catch (_) {}
  }

  return { studentId, mode, loc, rawPayload: payload };
}

function calcHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLon = toRad(Number(lon2) - Number(lon1));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(Number(lat1))) *
      Math.cos(toRad(Number(lat2))) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function OrgAttendanceScanner() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [scannerActive, setScannerActive] = useState(false);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTimePHT, setCurrentTimePHT] = useState('');
  const [currentDatePHT, setCurrentDatePHT] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Network & Offline Scan Queue State
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineQueue, setOfflineQueue] = useState(() => readOfflineQueue());
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Organization Workplace Geofence State
  const [geofenceConfig, setGeofenceConfig] = useState(null);
  const [calibratingGeofence, setCalibratingGeofence] = useState(false);
  const scannerGpsRef = useRef(null);

  // Manual Coordinates Dialog State (for workstations/PCs without GPS chips)
  const [showManualCoordsModal, setShowManualCoordsModal] = useState(false);
  const [manualCoordsInput, setManualCoordsInput] = useState({
    latitude: '',
    longitude: '',
    radius: 100
  });
  const [savingManualCoords, setSavingManualCoords] = useState(false);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const resetTimerRef = useRef(null);
  const qrRegionId = 'hr-attendance-qr-reader';

  // Dedicated tab title for easy identification on extended monitors
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'HR Attendance Desk Scanner • InternconPH';
    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Track Fullscreen Kiosk state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (_) {}
  };

  const handleCopyScannerUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2200);
    } catch (_) {}
  };

  // High-accuracy scanner terminal GPS watcher
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    let watchId;
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          scannerGpsRef.current = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            acc: Math.round(pos.coords.accuracy || 0)
          };
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
  }, []);

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

  // Load workplace geofence configuration on mount
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
    setOfflineQueue(readOfflineQueue());
    fetchGeofenceConfig();
  }, [fetchGeofenceConfig]);

  useEffect(() => {
    if (geofenceConfig) {
      setManualCoordsInput({
        latitude: geofenceConfig.latitude != null ? String(geofenceConfig.latitude) : '',
        longitude: geofenceConfig.longitude != null ? String(geofenceConfig.longitude) : '',
        radius: Number(geofenceConfig.geofence_radius_meters) || 100
      });
    }
  }, [geofenceConfig]);

  // Calibrate workplace geofence coordinates using HR terminal's GPS position
  const handleCalibrateGeofence = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setCalibratingGeofence(true);

    const saveCoords = async (pos) => {
      try {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy || 0);

        if (acc > 100) {
          setCalibratingGeofence(false);
          const goManual = window.confirm(
            `This computer's location is only approximate (±${acc}m, Wi-Fi/IP based), so it was NOT saved as the office pin.\n\n` +
              `Recommended: scan a student's phone QR at the desk, then click "Use This Phone's GPS as Office Pin" in the inspector, ` +
              `or paste exact coordinates from Google Maps.\n\nOpen manual coordinate entry now?`
          );
          if (goManual) setShowManualCoordsModal(true);
          return;
        }

        const res = await api.post('/org/attendance/geofence', {
          latitude: lat,
          longitude: lng,
          geofence_radius_meters: geofenceConfig?.geofence_radius_meters || 100,
          enforce_geofence: true
        });
        if (res.success && res.data) {
          setGeofenceConfig({
            ...geofenceConfig,
            ...res.data,
            latitude: lat,
            longitude: lng,
            configured: true,
            enforce_geofence: true
          });
          alert(
            `Office GPS locked at (${lat.toFixed(4)}, ${lng.toFixed(4)}). Student attendance within ${
              geofenceConfig?.geofence_radius_meters || 100
            }m is now strictly enforced.`
          );
        } else {
          alert(res.message || 'Failed to update workplace geofence.');
        }
      } catch (err) {
        alert(err.message || 'Error calibrating workplace geofence.');
      } finally {
        setCalibratingGeofence(false);
      }
    };

    const handleFinalError = (err) => {
      setCalibratingGeofence(false);
      let errorMsg = 'Unable to determine GPS location.';
      if (err.code === 1) {
        errorMsg =
          'Location permission denied by your browser. Please click the padlock or site settings in your URL bar to allow Location.';
      } else if (err.code === 2) {
        errorMsg = 'Location unavailable: Windows Location Services may be disabled on this PC.';
      } else if (err.code === 3) {
        errorMsg =
          'Location request timed out. Desktop PCs without GPS satellite hardware often cannot acquire a direct fix.';
      }

      const enterManual = window.confirm(
        `${errorMsg}\n\nWould you like to enter your office coordinates or paste them from Google Maps instead?`
      );
      if (enterManual) {
        setShowManualCoordsModal(true);
      }
    };

    navigator.geolocation.getCurrentPosition(
      saveCoords,
      (firstErr) => {
        if (firstErr.code === 3 || firstErr.code === 2) {
          navigator.geolocation.getCurrentPosition(saveCoords, handleFinalError, {
            enableHighAccuracy: false,
            maximumAge: 300000,
            timeout: 10000
          });
          return;
        }
        handleFinalError(firstErr);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 5000 }
    );
  };

  const handlePasteCoords = (e) => {
    const text = e.clipboardData ? e.clipboardData.getData('text') : '';
    if (text && text.includes(',')) {
      const parts = text.split(',').map((p) => p.trim());
      if (parts.length >= 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
        e.preventDefault();
        setManualCoordsInput((prev) => ({
          ...prev,
          latitude: parts[0],
          longitude: parts[1]
        }));
      }
    }
  };

  const handleSaveManualCoords = async (e) => {
    e?.preventDefault?.();
    const lat = parseFloat(manualCoordsInput.latitude);
    const lng = parseFloat(manualCoordsInput.longitude);
    const rad = parseInt(manualCoordsInput.radius, 10) || 100;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert('Please enter a valid latitude (-90 to 90).');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      alert('Please enter a valid longitude (-180 to 180).');
      return;
    }

    if (lat > 25 && lng < 25) {
      alert(
        `Latitude and Longitude appear to be SWAPPED!\n\nYou entered:\nLatitude: ${lat}\nLongitude: ${lng}\n\nIn the Philippines (e.g. Davao is ~7.1° N, 125.6° E), Latitude must be ~4°–21° and Longitude must be ~116°–127°.\n\nPlease swap the values.`
      );
      return;
    }

    setSavingManualCoords(true);
    try {
      const res = await api.post('/org/attendance/geofence', {
        latitude: lat,
        longitude: lng,
        geofence_radius_meters: rad,
        enforce_geofence: true
      });
      if (res.success && res.data) {
        setGeofenceConfig({
          ...geofenceConfig,
          ...res.data,
          latitude: lat,
          longitude: lng,
          configured: true,
          enforce_geofence: true
        });
        setShowManualCoordsModal(false);
        alert(`Office coordinates locked at (${lat.toFixed(4)}, ${lng.toFixed(4)}) with a ${rad}m radius.`);
      } else {
        alert(res.message || 'Failed to save coordinates.');
      }
    } catch (err) {
      alert(err.message || 'Error saving coordinates.');
    } finally {
      setSavingManualCoords(false);
    }
  };

  const handleUsePhoneAsOfficePin = async (phoneCoords) => {
    if (!phoneCoords || phoneCoords.lat == null || phoneCoords.lng == null) return;
    const radius = Number(geofenceConfig?.geofence_radius_meters) || 100;
    const ok = window.confirm(
      `Set the office pin to this phone's GPS location?\n\n` +
        `Lat: ${phoneCoords.lat}\nLng: ${phoneCoords.lng}\nAccuracy: ±${phoneCoords.acc ?? '?'}m\nRadius: ${radius}m\n\n` +
        `Only do this if the phone is physically at your office right now.`
    );
    if (!ok) return;
    try {
      const res = await api.post('/org/attendance/geofence', {
        latitude: phoneCoords.lat,
        longitude: phoneCoords.lng,
        geofence_radius_meters: radius,
        enforce_geofence: true
      });
      if (res.success) {
        setGeofenceConfig({
          ...geofenceConfig,
          ...(res.data || {}),
          latitude: phoneCoords.lat,
          longitude: phoneCoords.lng,
          configured: true,
          enforce_geofence: true
        });
        alert('Office pin updated from the phone GPS. Ask the student to show a fresh QR and scan again.');
        handleResetForNextIntern();
      } else {
        alert(res.message || 'Failed to update office pin.');
      }
    } catch (err) {
      alert(err.message || 'Failed to update office pin.');
    }
  };

  const handleClearGeofence = async () => {
    if (!window.confirm('Disable workplace geofence? Student scans will be accepted from any location.')) return;
    try {
      const res = await api.post('/org/attendance/geofence', {
        latitude: null,
        longitude: null,
        enforce_geofence: false
      });
      if (res.success) {
        setGeofenceConfig({
          ...geofenceConfig,
          latitude: null,
          longitude: null,
          enforce_geofence: false,
          configured: false
        });
        alert('Workplace geofence disabled. Intern attendance scans are now allowed from any location.');
      }
    } catch (err) {
      alert(err.message || 'Failed to clear geofence.');
    }
  };

  // Helper to append to session activity log
  const addRecentScan = (entry) => {
    setRecentScans((prev) => [entry, ...prev].slice(0, 8));
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

        if (res.data.synced_count > 0) {
          notifyCrossTabAttendanceUpdate({ syncedCount: res.data.synced_count });
        }
      }
    } catch (_) {
      // Keep queue intact if network fails again
    } finally {
      setSyncingOffline(false);
    }
  }, [syncingOffline]);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && !syncingOffline) {
      handleSyncOfflineScans();
    }
  }, [isOnline, offlineQueue.length, syncingOffline, handleSyncOfflineScans]);

  // Live PHT Clock & Date ticker
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        setCurrentTimePHT(
          now.toLocaleTimeString('en-US', {
            timeZone: 'Asia/Manila',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          })
        );
        setCurrentDatePHT(
          now.toLocaleDateString('en-US', {
            timeZone: 'Asia/Manila',
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        );
      } catch (_) {
        setCurrentTimePHT(new Date().toLocaleTimeString());
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getWarningDiagnostic = (message) => {
    const msg = String(message || '').toLowerCase();

    if (msg.includes('low gps accuracy') || msg.includes('gps location required') || msg.includes('missing gps')) {
      return {
        category: 'LOW_GPS_ACCURACY',
        title: 'Insufficient or Missing GPS Telemetry',
        icon: 'location_disabled',
        badge: 'GPS Telemetry Required',
        color: 'amber',
        explanation:
          'The student’s phone has not yet locked onto satellite GPS, or location permissions were restricted. Online attendance requires high-accuracy GPS coordinates.',
        actionStep:
          'Instruct the student to ensure Location (GPS) is turned ON with "Precise" accuracy on their phone, wait for the GPS Locked badge, and present the updated QR.'
      };
    }

    if (msg.includes('outside workplace geofence') || msg.includes('outside geofence') || msg.includes('away from')) {
      return {
        category: 'OUTSIDE_GEOFENCE',
        title: 'Outside Workplace Geofence Radius',
        icon: 'wrong_location',
        badge: 'Haversine Geofence Violation',
        color: 'red',
        explanation:
          'The student’s high-accuracy GPS location is outside your organization’s allowed geofence radius. Online attendance requires physical presence at the workplace.',
        actionStep:
          'Ensure the intern is physically at your office desk with High-Accuracy Location enabled, or click "Auto-Calibrate GPS" / "Edit Coords" above if your office location moved.'
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
          'If the student got a new phone, they must tap "Re-bind OTP" on their screen and verify the 6-digit Gmail OTP to bind their new device.'
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
          'Instruct the intern to pull down to refresh or wait for the next 30s rotation on their mobile app, then present the active code immediately.'
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
          'Instruct the student to open their InternconPH mobile app while online to initialize and pair their mobile device.'
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
      try {
        playAttendanceErrorChime();
      } catch (_) {}
      setScanResult({ type: 'error', message: msg });
      setScanFeedback({ status: 'failed', action: null, message: msg });
      return;
    }

    const existingQueue = readOfflineQueue();
    const nonceKey = parsed.n || `v1_${parsed.sid}_${qrTs}`;
    if (existingQueue.some((item) => item.nonce === nonceKey)) {
      const msg = 'Offline Replay Rejected: This QR nonce is already in the offline sync queue.';
      try {
        playAttendanceErrorChime();
      } catch (_) {}
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

    try {
      playAttendanceSuccessChime();
    } catch (_) {}
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

  const buildScanTelemetry = (parsedQr, serverRes) => {
    const serverPhoneCoords = serverRes?.telemetry?.phone_coords;
    const phoneCoords = serverPhoneCoords
      ? {
          lat: serverPhoneCoords.latitude,
          lng: serverPhoneCoords.longitude,
          acc: serverPhoneCoords.accuracy_meters,
          ts: serverPhoneCoords.timestamp
        }
      : parsedQr?.loc || null;

    const serverOrgCoords = serverRes?.telemetry?.org_coords;
    const orgCoords = serverOrgCoords
      ? {
          lat: serverOrgCoords.latitude,
          lng: serverOrgCoords.longitude,
          radius: serverOrgCoords.radius_meters
        }
      : geofenceConfig?.latitude != null && geofenceConfig?.longitude != null
      ? {
          lat: Number(geofenceConfig.latitude),
          lng: Number(geofenceConfig.longitude),
          radius: Number(geofenceConfig.geofence_radius_meters) || 100
        }
      : null;

    let distanceMeters = serverRes?.distance_meters ?? serverRes?.telemetry?.distance_meters ?? null;
    if (distanceMeters === null && phoneCoords?.lat != null && orgCoords?.lat != null) {
      distanceMeters = calcHaversineDistance(phoneCoords.lat, phoneCoords.lng, orgCoords.lat, orgCoords.lng);
    }

    let source = 'VERIFIED';
    let diagnosisText = '';

    if (serverRes?.success && phoneCoords) {
      source = 'VERIFIED';
      diagnosisText = `GPS Telemetry Verified: Phone is at (${phoneCoords.lat.toFixed(6)}, ${phoneCoords.lng.toFixed(6)}), ${
        distanceMeters !== null ? Math.round(distanceMeters) + 'm from office' : 'inside perimeter'
      }.`;
    } else if (!phoneCoords) {
      source = 'APP';
      diagnosisText =
        'Error Origin: MOBILE APP. The student phone encoded "loc = none" into the QR payload. High-accuracy GPS was not locked or location permissions were restricted in the phone app.';
    } else if (phoneCoords.acc && phoneCoords.acc > 50) {
      source = 'APP';
      diagnosisText = `Error Origin: MOBILE APP. The phone reported a GPS accuracy of ±${phoneCoords.acc}m, which exceeds the allowed 50m limit. The student should step near an open area or window to get satellite lock.`;
    } else if (orgCoords && distanceMeters !== null && distanceMeters > orgCoords.radius) {
      source = 'WEB';
      diagnosisText = `Discrepancy Origin: WEB / SAVED OFFICE COORDINATES. The mobile app IS successfully transmitting valid GPS coordinates (${phoneCoords.lat.toFixed(6)}, ${phoneCoords.lng.toFixed(6)}), but the measured distance is ${Math.round(
        distanceMeters
      )}m away from the saved office pin (${
        orgCoords.radius
      }m radius). Click "Auto-Calibrate GPS" or "Edit Coords" above to update the workplace coordinates to your current position.`;
    } else if (serverRes?.success) {
      source = 'VERIFIED';
      diagnosisText = `GPS Telemetry Verified: Phone is at (${phoneCoords.lat.toFixed(6)}, ${phoneCoords.lng.toFixed(6)}), ${
        distanceMeters !== null ? Math.round(distanceMeters) + 'm from office' : 'inside perimeter'
      }.`;
    } else {
      source = 'APP';
      diagnosisText = serverRes?.message || 'Verification issue.';
    }

    return {
      phoneCoords,
      orgCoords,
      distanceMeters,
      source,
      diagnosisText,
      mode: parsedQr?.mode || 'online'
    };
  };

  const handleProcessPayload = async (rawPayload) => {
    if (isProcessingRef.current || isStoppingRef.current) return;
    isProcessingRef.current = true;
    setLoading(true);
    setScanResult(null);

    const parsedQr = parseQrTelemetry(rawPayload);

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

      const telemetry = buildScanTelemetry(parsedQr, res);

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
          message: errMsg,
          telemetry
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
          data: res.data,
          telemetry
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

        notifyCrossTabAttendanceUpdate({
          action: res.action,
          studentId: res.data?.student_id
        });

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
          message: failMsg,
          telemetry
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
      const telemetry = buildScanTelemetry(parsedQr, null);
      setScanResult({
        type: 'error',
        message: netMsg,
        telemetry
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
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 3500);
    }
  };

  // Safely stop camera hardware and detach Html5Qrcode
  const stopScannerSafely = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

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

  // Enumerate cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(
            (d) =>
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
  }, []);

  // Start / pause Camera QR Scanner
  useEffect(() => {
    if (cameraPaused) {
      stopScannerSafely();
      return;
    }

    setCameraError('');
    isProcessingRef.current = false;
    let isMounted = true;

    const startScanner = async () => {
      try {
        await stopScannerSafely();
        await new Promise((r) => setTimeout(r, 180));
        if (!isMounted || !document.getElementById(qrRegionId)) return;

        const html5QrCode = new Html5Qrcode(qrRegionId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 20,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.9);
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
          () => {}
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
  }, [cameraPaused, selectedCameraId, stopScannerSafely]);

  // Ensure camera tracks release cleanly if tab is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopScannerSafely();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [stopScannerSafely]);

  const handleResetForNextIntern = () => {
    setScanResult(null);
    setScanFeedback(null);
    isProcessingRef.current = false;
  };

  const warningDiagnostic =
    scanResult?.type === 'error' ? getWarningDiagnostic(scanResult.message) : null;

  const orgDisplayName =
    user?.organization_name || user?.company_name || user?.display_name || user?.full_name || 'HR Premises Terminal';

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-surface-container-low text-on-surface flex flex-col">
      {/* Scoped CSS for edge-to-edge video coverage & laser reticle */}
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
        #hr-attendance-qr-reader canvas,
        #hr-attendance-qr-reader img,
        #hr-attendance-qr-reader__dashboard,
        #hr-attendance-qr-reader__header_message {
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
        @keyframes qrLaserSweep {
          0%, 100% { top: 8%; opacity: 0.95; }
          50% { top: 88%; opacity: 0.95; }
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

      {/* Top Dedicated Extended-Monitor Kiosk Bar */}
      <header className="sticky top-0 z-30 bg-surface-container-lowest/95 backdrop-blur-xl border-b border-outline-variant px-4 sm:px-6 py-3 shadow-soft shrink-0">
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Unified InternconPH Brand + Scanner Terminal Identity */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <img
                src="/logo.png"
                alt="InternconPH Logo"
                className="h-8 sm:h-9 w-auto object-contain shrink-0"
                decoding="async"
              />
              <div className="flex flex-col text-left">
                <span className="text-lg sm:text-xl font-bold tracking-tight leading-tight text-on-surface">
                  interncon<span className="text-[#F59E0B]">ph</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-teal-500 uppercase leading-none mt-0.5">
                  INTERNSHIP CONNECTIVITY
                </span>
              </div>
            </div>

            <div className="hidden md:block h-8 w-px bg-outline-variant shrink-0" />

            <div className="hidden md:flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-vibrant-orange text-white flex items-center justify-center shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-bold text-sm sm:text-base text-on-surface truncate">
                    HR Attendance Desk Scanner
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-tint text-accent-text border border-brand-teal/40 tracking-wide">
                    Extended Monitor Terminal
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant truncate">
                  {orgDisplayName} • Physical premises validation • Automated Time-In & Time-Out
                </p>
              </div>
            </div>
          </div>

          {/* Right: Live PHT Clock, Network Pill, Copy URL, Fullscreen Kiosk, Theme, Dashboard Link */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Live PHT Clock */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-container border border-outline-variant">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-right leading-tight">
                <span className="font-mono font-bold text-xs sm:text-sm text-on-surface block">
                  {currentTimePHT} <span className="text-[10px] text-teal-500">PHT</span>
                </span>
                {currentDatePHT && (
                  <span className="text-[10px] text-on-surface-variant block">{currentDatePHT}</span>
                )}
              </div>
            </div>

            {/* Copy Dedicated URL */}
            <button
              type="button"
              onClick={handleCopyScannerUrl}
              className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy dedicated scanner URL for extended monitor"
            >
              <span className="material-symbols-outlined text-[17px] text-teal-500">
                {copiedUrl ? 'check' : 'link'}
              </span>
              <span className="hidden xl:inline">{copiedUrl ? 'URL Copied' : 'Copy Scanner URL'}</span>
            </button>

            {/* Fullscreen Kiosk Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen Kiosk Mode for Extended Monitor'}
            >
              <span className="material-symbols-outlined text-[18px] text-vibrant-orange">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
              <span className="hidden lg:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme Mode"
            >
              <span className="material-symbols-outlined text-[20px] block">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Return / Open Dashboard */}
            <Link
              to="/dashboard/organization/ojt"
              className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors"
              title="Go to Deployed Interns & DTR Dashboard"
            >
              <span className="material-symbols-outlined text-[17px]">dashboard</span>
              <span className="hidden sm:inline">DTR Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Widescreen Extended Monitor Workspace */}
      <main className="flex-1 w-full max-w-[1680px] mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Optical Camera Scanner Bay (lg:col-span-5) */}
        <section className="lg:col-span-5 bg-surface rounded-3xl border border-outline-variant shadow-soft p-4 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            {/* Camera Header Status & Controls */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2 font-bold text-on-surface">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    cameraPaused
                      ? 'bg-slate-400'
                      : scannerActive
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500'
                  }`}
                />
                <span>
                  {cameraPaused
                    ? 'Camera Paused'
                    : scannerActive
                    ? 'Camera Feed Active'
                    : 'Initializing Hardware...'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {cameras.length > 1 && (
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                      videocam
                    </span>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="text-[11px] font-medium bg-surface-container rounded-lg border border-outline-variant px-2 py-1 text-on-surface outline-none focus:ring-1 focus:ring-vibrant-orange cursor-pointer max-w-[160px] truncate"
                    >
                      {cameras.map((c, idx) => (
                        <option key={c.id} value={c.id}>
                          {c.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setCameraPaused((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-[11px] font-bold text-on-surface flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {cameraPaused ? 'play_arrow' : 'pause'}
                  </span>
                  <span>{cameraPaused ? 'Resume' : 'Pause'}</span>
                </button>
              </div>
            </div>

            {/* High-Tech Camera Viewport */}
            <div
              className={`relative bg-[#030807] rounded-2xl overflow-hidden aspect-[4/3] max-h-[58vh] w-full flex items-center justify-center border-2 transition-all duration-300 shadow-xl ${
                scanFeedback?.status === 'success'
                  ? 'border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.5)]'
                  : scanFeedback?.status === 'failed'
                  ? 'border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.5)]'
                  : 'border-outline-variant/80 hover:border-vibrant-orange/60'
              }`}
            >
              <div id={qrRegionId} className="w-full h-full" />

              {/* Laser scanline animation */}
              {scannerActive && !cameraError && !cameraPaused && (
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
              <div className="absolute inset-5 sm:inset-7 pointer-events-none z-10 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div
                    className={`w-8 h-8 border-t-3 border-l-3 rounded-tl-lg transition-colors ${
                      scanFeedback?.status === 'success'
                        ? 'border-emerald-400'
                        : scanFeedback?.status === 'failed'
                        ? 'border-red-400'
                        : 'border-vibrant-orange/80'
                    }`}
                  />
                  <div
                    className={`w-8 h-8 border-t-3 border-r-3 rounded-tr-lg transition-colors ${
                      scanFeedback?.status === 'success'
                        ? 'border-emerald-400'
                        : scanFeedback?.status === 'failed'
                        ? 'border-red-400'
                        : 'border-vibrant-orange/80'
                    }`}
                  />
                </div>

                <div className="self-center flex items-center justify-center opacity-40">
                  <div className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white/70 rounded-full" />
                  </div>
                </div>

                <div className="flex justify-between">
                  <div
                    className={`w-8 h-8 border-b-3 border-l-3 rounded-bl-lg transition-colors ${
                      scanFeedback?.status === 'success'
                        ? 'border-emerald-400'
                        : scanFeedback?.status === 'failed'
                        ? 'border-red-400'
                        : 'border-vibrant-orange/80'
                    }`}
                  />
                  <div
                    className={`w-8 h-8 border-b-3 border-r-3 rounded-br-lg transition-colors ${
                      scanFeedback?.status === 'success'
                        ? 'border-emerald-400'
                        : scanFeedback?.status === 'failed'
                        ? 'border-red-400'
                        : 'border-vibrant-orange/80'
                    }`}
                  />
                </div>
              </div>

              {/* Paused Overlay */}
              {cameraPaused && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white space-y-3 bg-[#030807]/90 p-6 text-center backdrop-blur-xs">
                  <span className="material-symbols-outlined text-4xl text-amber-400">pause_circle</span>
                  <p className="text-sm font-bold">Camera Feed Paused</p>
                  <button
                    type="button"
                    onClick={() => setCameraPaused(false)}
                    className="px-4 py-2 rounded-xl bg-vibrant-orange hover:bg-deep-orange text-white text-xs font-bold cursor-pointer"
                  >
                    Resume Optical Scanner
                  </button>
                </div>
              )}

              {/* Camera Startup Spinner */}
              {!scannerActive && !cameraError && !cameraPaused && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white space-y-2 bg-[#030807]/80 p-4 text-center backdrop-blur-xs">
                  <div className="animate-spin rounded-full h-9 w-9 border-3 border-vibrant-orange border-t-transparent" />
                  <p className="text-xs font-bold tracking-wide">Connecting Optical Camera Feed...</p>
                </div>
              )}

              {/* Camera Hardware Permission Error */}
              {cameraError && !cameraPaused && (
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
            <div className="p-3.5 bg-surface-container rounded-2xl border border-outline-variant text-xs text-on-surface-variant flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-vibrant-orange shrink-0">
                center_focus_strong
              </span>
              <span>
                Align the intern&apos;s live dynamic QR within the reticle. The terminal auto-captures and verifies in ~0.5 seconds.
              </span>
            </div>
          </div>

          {/* Separation of Duties Policy Note */}
          <div className="pt-2">
            <div className="p-3.5 bg-surface-container rounded-2xl border border-outline-variant flex items-start gap-2.5 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px] text-emerald-600 shrink-0 mt-0.5">
                verified_user
              </span>
              <div className="space-y-0.5 text-[11px]">
                <p className="font-bold text-on-surface">Dedicated Extended-Monitor Terminal</p>
                <p className="leading-relaxed">
                  Drag this tab to your secondary desk monitor and click <strong>Fullscreen</strong>. Every verified Time-In and Time-Out automatically syncs live to your main HR Dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Live Verification Status, Geofence, Telemetry & Session Activity (lg:col-span-7) */}
        <section className="lg:col-span-7 bg-surface rounded-3xl border border-outline-variant shadow-soft p-4 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Desk Section Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-vibrant-orange">
                  badge
                </span>
                <span className="font-bold text-xs uppercase tracking-wider text-on-surface">
                  Cryptographic Attendance Verification & Telemetry
                </span>
              </div>

              {loading ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Verifying Cryptographic TOTP...</span>
                </span>
              ) : scanResult?.type === 'success' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Scan Confirmed</span>
                </span>
              ) : scanResult?.type === 'error' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-600 border border-red-500/30">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  <span>Verification Blocked</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-surface-container text-on-surface-variant border border-outline-variant">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>{isOnline ? 'Standby • Ready for QR' : 'Offline Mode • Local Queue Active'}</span>
                </span>
              )}
            </div>

            {/* Workplace Geofence Status & Calibration Bar */}
            {(() => {
              const isGeofenceActive = Boolean(
                geofenceConfig?.configured ||
                  (geofenceConfig?.latitude != null &&
                    geofenceConfig?.longitude != null &&
                    geofenceConfig?.enforce_geofence !== false)
              );

              return (
                <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        isGeofenceActive ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {isGeofenceActive ? 'where_to_vote' : 'add_location_alt'}
                    </span>
                    <div>
                      <span className="font-bold text-on-surface text-xs block">
                        {isGeofenceActive
                          ? `Workplace Geofence Active (${geofenceConfig.geofence_radius_meters || 100}m Radius)`
                          : 'Workplace Geofence Disabled / Not Set'}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        {isGeofenceActive
                          ? `Coords: ${Number(geofenceConfig.latitude).toFixed(4)}, ${Number(
                              geofenceConfig.longitude
                            ).toFixed(4)} • Co-location Enforced`
                          : 'Scans will be accepted from anywhere unless GPS coordinates are calibrated.'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      disabled={calibratingGeofence || !isOnline}
                      onClick={handleCalibrateGeofence}
                      className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-container-high border border-outline-variant text-[11px] font-bold text-on-surface flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                      title="Auto-detect current GPS/Wi-Fi location"
                    >
                      <span className="material-symbols-outlined text-[14px] text-vibrant-orange">
                        my_location
                      </span>
                      <span>
                        {calibratingGeofence
                          ? 'Detecting GPS...'
                          : isGeofenceActive
                          ? 'Auto-Calibrate GPS'
                          : 'Auto-Detect GPS'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={calibratingGeofence || !isOnline}
                      onClick={() => setShowManualCoordsModal(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-container-high border border-outline-variant text-[11px] font-bold text-on-surface flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                      title="Manually type or paste office coordinates from Google Maps"
                    >
                      <span className="material-symbols-outlined text-[14px] text-blue-600">
                        edit_location_alt
                      </span>
                      <span>{isGeofenceActive ? 'Edit Coords' : 'Enter Coords'}</span>
                    </button>

                    {isGeofenceActive && (
                      <button
                        type="button"
                        onClick={handleClearGeofence}
                        className="px-2.5 py-1.5 rounded-xl text-error hover:bg-rose-50 dark:hover:bg-red-950/30 border border-error/20 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        title="Disable workplace geofence check"
                      >
                        <span className="material-symbols-outlined text-[14px]">location_off</span>
                        <span>Clear Geofence</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Offline Scan Queue & Sync Banner */}
            {(offlineQueue.length > 0 || !isOnline) && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs">
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
                    className="px-3 py-1.5 rounded-xl bg-vibrant-orange hover:bg-deep-orange disabled:opacity-50 text-white text-[11px] font-bold shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">sync</span>
                    <span>{syncingOffline ? 'Syncing...' : `Sync Now (${offlineQueue.length})`}</span>
                  </button>
                )}
              </div>
            )}

            {/* STATE 1: IDLE / WAITING FOR QR */}
            {!loading && !scanResult && (
              <div className="p-8 bg-surface-container-low rounded-2xl border border-outline-variant/80 text-center space-y-5 py-12">
                <div className="w-16 h-16 rounded-2xl bg-orange-tint text-accent-text mx-auto flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-4xl">sensors</span>
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h2 className="font-bold text-lg text-on-surface">Scanner Ready for Intern</h2>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                    Present your live dynamic QR code from the InternconPH mobile app in front of the camera to automatically log Time-In or Time-Out.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2 max-w-lg mx-auto">
                  <div className="p-3 bg-surface rounded-xl border border-outline-variant/60 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-on-surface">
                      <span className="material-symbols-outlined text-[16px] text-vibrant-orange">
                        update
                      </span>
                      <span>Auto Time In/Out</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Automatically detects whether the intern is clocking in for arrival or clocking out for departure.
                    </p>
                  </div>

                  <div className="p-3 bg-surface rounded-xl border border-outline-variant/60 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-on-surface">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">
                        lock_clock
                      </span>
                      <span>Rolling 30s TOTP + GPS</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Hardware-bound ECDSA & single-use nonces block screenshot sharing and remote proxying.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STATE 2: LOADING / CRYPTOGRAPHIC VERIFICATION */}
            {loading && (
              <div className="p-8 bg-surface-container rounded-2xl border border-vibrant-orange/40 text-center space-y-4 py-14 animate-fade-in shadow-inner">
                <div className="animate-spin rounded-full h-12 w-12 border-3 border-vibrant-orange border-t-transparent mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-on-surface">
                    Verifying Cryptographic TOTP Signature...
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Validating student identity, registered device token, and workplace geofence telemetry.
                  </p>
                </div>
              </div>
            )}

            {/* STATE 3: SUCCESS RESULT */}
            {scanResult?.type === 'success' && (
              <div className="p-5 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 via-surface-container-low to-surface-container text-on-surface shadow-lg animate-fade-in space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
                      <span className="material-symbols-outlined text-[28px]">check_circle</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white">
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
                      <h4 className="font-bold text-lg text-emerald-900 dark:text-emerald-200 mt-0.5">
                        {scanResult.action === 'time_in'
                          ? 'Time-In Logged Successfully'
                          : 'Time-Out Logged Successfully'}
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetForNextIntern}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px] text-emerald-600">
                      refresh
                    </span>
                    <span>Next Intern</span>
                  </button>
                </div>

                {scanResult.data && (
                  <div className="p-4 bg-surface rounded-xl border border-outline-variant/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                        Intern Identity
                      </span>
                      <p className="font-bold text-base text-on-surface">
                        {scanResult.data.student_name}
                      </p>
                      <p className="text-xs font-mono text-on-surface-variant">
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
                      <p className="text-xs text-on-surface-variant">
                        Supervisor: {scanResult.data.mentor_name || 'Assigned Workplace Mentor'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">
                    info
                  </span>
                  <span className="leading-relaxed">
                    {scanResult.action === 'time_in'
                      ? "Intern's daily attendance entry is created and synced to your HR Dashboard."
                      : 'Shift completed. Rendered training hours have been automatically recorded and credited.'}
                  </span>
                </div>

                {scanResult.telemetry && (
                  <div className="p-3.5 rounded-xl bg-surface border border-outline-variant text-xs space-y-2.5">
                    <div className="flex items-center justify-between font-bold border-b border-outline-variant/60 pb-2">
                      <span className="flex items-center gap-1.5 text-on-surface">
                        <span className="material-symbols-outlined text-[16px] text-vibrant-orange">radar</span>
                        <span>GPS Telemetry & Source Inspector</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono border bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200">
                        ✅ GPS Co-Location Verified
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60">
                        <span className="font-bold text-on-surface-variant flex items-center gap-1 mb-1">
                          <span className="material-symbols-outlined text-[14px] text-teal-500">smartphone</span>
                          <span>Phone GPS (Decoded from QR):</span>
                        </span>
                        {scanResult.telemetry.phoneCoords ? (
                          <div className="space-y-0.5 font-mono">
                            <div>Lat: <span className="font-bold text-on-surface">{scanResult.telemetry.phoneCoords.lat}</span></div>
                            <div>Lng: <span className="font-bold text-on-surface">{scanResult.telemetry.phoneCoords.lng}</span></div>
                            <div>Accuracy: <span className="font-bold text-emerald-600">±{scanResult.telemetry.phoneCoords.acc ?? '?'}m</span></div>
                          </div>
                        ) : (
                          <div className="text-on-surface-variant font-mono">Co-located (Offline Vault / Terminal)</div>
                        )}
                      </div>

                      <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60">
                        <span className="font-bold text-on-surface-variant flex items-center gap-1 mb-1">
                          <span className="material-symbols-outlined text-[14px] text-vibrant-orange">apartment</span>
                          <span>Organization Office Pin:</span>
                        </span>
                        {scanResult.telemetry.orgCoords ? (
                          <div className="space-y-0.5 font-mono">
                            <div>Lat: <span className="font-bold text-on-surface">{scanResult.telemetry.orgCoords.lat}</span></div>
                            <div>Lng: <span className="font-bold text-on-surface">{scanResult.telemetry.orgCoords.lng}</span></div>
                            <div>Allowed Radius: <span className="font-bold text-on-surface">{scanResult.telemetry.orgCoords.radius}m</span></div>
                          </div>
                        ) : (
                          <div className="text-on-surface-variant font-mono">No Geofence Set (Disabled)</div>
                        )}
                      </div>
                    </div>

                    {scanResult.telemetry.distanceMeters !== null && (
                      <div className="p-2 rounded-lg bg-surface-container flex items-center justify-between text-[11px]">
                        <span className="text-on-surface-variant font-medium">Computed Haversine Distance:</span>
                        <span className="font-bold font-mono text-emerald-600">
                          {scanResult.telemetry.distanceMeters} meters (Within Radius)
                        </span>
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-[11px] leading-relaxed">
                      <span className="font-bold text-on-surface">Inspector Verdict: </span>
                      <span className="text-on-surface-variant">{scanResult.telemetry.diagnosisText}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STATE 4: FAILED RESULT WITH DIAGNOSTIC EXPLANATION */}
            {scanResult?.type === 'error' && warningDiagnostic && (
              <div className="p-5 rounded-2xl border-2 border-red-500/50 bg-gradient-to-br from-red-500/10 via-surface-container-low to-surface-container text-on-surface shadow-lg animate-fade-in space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-md shrink-0">
                      <span className="material-symbols-outlined text-[28px]">gpp_bad</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-600 text-white">
                          REJECTED
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
                          {warningDiagnostic.badge}
                        </span>
                      </div>
                      <h4 className="font-bold text-lg text-red-950 dark:text-red-200 mt-0.5">
                        {warningDiagnostic.title}
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetForNextIntern}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px] text-vibrant-orange">
                      refresh
                    </span>
                    <span>Retry Scan</span>
                  </button>
                </div>

                <div className="p-3 bg-surface rounded-xl border border-red-500/20 text-xs text-red-700 dark:text-red-300 font-medium">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <span className="material-symbols-outlined text-[15px]">error_outline</span>
                    <span>System Rejection Message:</span>
                  </div>
                  <p className="leading-relaxed pl-5">{scanResult.message}</p>
                </div>

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

                {scanResult.telemetry && (
                  <div className="p-3.5 rounded-xl bg-surface border-2 border-outline-variant text-xs space-y-2.5">
                    <div className="flex items-center justify-between font-bold border-b border-outline-variant/60 pb-2">
                      <span className="flex items-center gap-1.5 text-on-surface">
                        <span className="material-symbols-outlined text-[16px] text-vibrant-orange">radar</span>
                        <span>GPS Telemetry & Source Inspector</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono border ${
                          scanResult.telemetry.source === 'APP'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                            : scanResult.telemetry.source === 'WEB'
                            ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200'
                            : 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-200'
                        }`}
                      >
                        {scanResult.telemetry.source === 'APP'
                          ? '📱 Problem in Mobile App'
                          : scanResult.telemetry.source === 'WEB'
                          ? '🏢 Problem in Web / Org Pin'
                          : '⚠️ Verification Rejected'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60">
                        <span className="font-bold text-on-surface-variant flex items-center gap-1 mb-1">
                          <span className="material-symbols-outlined text-[14px] text-teal-500">smartphone</span>
                          <span>Phone GPS (Decoded from QR):</span>
                        </span>
                        {scanResult.telemetry.phoneCoords ? (
                          <div className="space-y-0.5 font-mono">
                            <div>Lat: <span className="font-bold text-on-surface">{scanResult.telemetry.phoneCoords.lat}</span></div>
                            <div>Lng: <span className="font-bold text-on-surface">{scanResult.telemetry.phoneCoords.lng}</span></div>
                            <div>Accuracy: <span className="font-bold text-emerald-600">±{scanResult.telemetry.phoneCoords.acc ?? '?'}m</span></div>
                          </div>
                        ) : (
                          <div className="text-red-600 font-bold font-mono">
                            ⚠️ No GPS in QR (loc = &apos;none&apos;)
                            <div className="text-[10px] text-on-surface-variant font-normal mt-0.5">
                              The phone generated this QR code without satellite coordinates.
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60">
                        <span className="font-bold text-on-surface-variant flex items-center gap-1 mb-1">
                          <span className="material-symbols-outlined text-[14px] text-vibrant-orange">apartment</span>
                          <span>Organization Office Pin:</span>
                        </span>
                        {scanResult.telemetry.orgCoords ? (
                          <div className="space-y-0.5 font-mono">
                            <div>Lat: <span className="font-bold text-on-surface">{scanResult.telemetry.orgCoords.lat}</span></div>
                            <div>Lng: <span className="font-bold text-on-surface">{scanResult.telemetry.orgCoords.lng}</span></div>
                            <div>Allowed Radius: <span className="font-bold text-on-surface">{scanResult.telemetry.orgCoords.radius}m</span></div>
                          </div>
                        ) : (
                          <div className="text-on-surface-variant font-mono">No Geofence Set (Disabled)</div>
                        )}
                      </div>
                    </div>

                    {scanResult.telemetry.distanceMeters !== null && (
                      <div className="p-2 rounded-lg bg-surface-container flex items-center justify-between text-[11px]">
                        <span className="text-on-surface-variant font-medium">Computed Haversine Distance:</span>
                        <span className="font-bold font-mono text-on-surface">
                          {scanResult.telemetry.distanceMeters} meters
                          {scanResult.telemetry.orgCoords?.radius && (
                            <span
                              className={
                                scanResult.telemetry.distanceMeters <= scanResult.telemetry.orgCoords.radius
                                  ? ' text-emerald-600'
                                  : ' text-red-600 font-bold'
                              }
                            >
                              {' '}
                              ({scanResult.telemetry.distanceMeters <= scanResult.telemetry.orgCoords.radius
                                ? 'Within Radius'
                                : 'Outside Allowed Perimeter'})
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-[11px] leading-relaxed">
                      <span className="font-bold text-on-surface">Inspector Verdict: </span>
                      <span className="text-on-surface-variant">{scanResult.telemetry.diagnosisText}</span>
                    </div>

                    {scanResult.telemetry.source === 'WEB' &&
                      scanResult.telemetry.phoneCoords &&
                      (scanResult.telemetry.phoneCoords.acc == null ||
                        scanResult.telemetry.phoneCoords.acc <= 50) && (
                        <button
                          type="button"
                          onClick={() => handleUsePhoneAsOfficePin(scanResult.telemetry.phoneCoords)}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">my_location</span>
                          <span>Use This Phone&apos;s GPS as Office Pin</span>
                        </button>
                      )}
                  </div>
                )}
              </div>
            )}

            {/* Session Scan History */}
            {recentScans.length > 0 && (
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant space-y-2.5">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="p-2.5 bg-surface rounded-xl border border-outline-variant/60 flex items-center justify-between gap-2 text-[11px]"
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
                          <span className="text-[10px] text-on-surface-variant truncate block">
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

          {/* Bottom Status Bar */}
          <div className="pt-3 border-t border-outline-variant flex items-center justify-between gap-2">
            <span className="text-xs text-on-surface-variant font-medium">
              {cameraPaused
                ? '⏸️ Optical scanning engine paused'
                : scannerActive
                ? '🟢 Optical scanning engine live • Syncing across tabs'
                : 'Connecting camera hardware...'}
            </span>

            {scanResult && (
              <button
                type="button"
                onClick={handleResetForNextIntern}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-all border border-outline-variant cursor-pointer"
              >
                Clear Display
              </button>
            )}
          </div>
        </section>
      </main>

      {/* Manual Coordinates Input Modal Overlay */}
      {showManualCoordsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-3xl border border-outline-variant shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">pin_drop</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-on-surface">Set Office GPS Coordinates</h4>
                  <p className="text-[11px] text-on-surface-variant">Manual workplace geofence configuration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualCoordsModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant space-y-1.5 border border-outline-variant/60">
              <div className="font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-emerald-600">info</span>
                <span>How to copy coordinates from Google Maps:</span>
              </div>
              <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
                <li>
                  Open{' '}
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-vibrant-orange underline font-semibold"
                  >
                    maps.google.com
                  </a>{' '}
                  in a new tab
                </li>
                <li>Right-click directly on your office building</li>
                <li>
                  Click the top coordinates (e.g.{' '}
                  <code className="bg-surface px-1 rounded font-mono">14.5995, 120.9842</code>) to copy
                </li>
                <li>Paste directly into the Latitude field below!</li>
              </ol>
            </div>

            {(() => {
              const inputLat = parseFloat(manualCoordsInput.latitude);
              const inputLng = parseFloat(manualCoordsInput.longitude);
              const isCoordsSwapped = !isNaN(inputLat) && !isNaN(inputLng) && inputLat > 25 && inputLng < 25;
              const hasValidPin =
                !isNaN(inputLat) &&
                !isNaN(inputLng) &&
                inputLat >= -90 &&
                inputLat <= 90 &&
                inputLng >= -180 &&
                inputLng <= 180;

              return (
                <>
                  {isCoordsSwapped && (
                    <div className="p-2.5 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200 animate-pulse">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
                        <span className="text-[11px]">
                          <strong>Swapped Coordinates Detected:</strong> In the Philippines, Latitude must be ~4°–21°.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setManualCoordsInput({
                            ...manualCoordsInput,
                            latitude: manualCoordsInput.longitude,
                            longitude: manualCoordsInput.latitude
                          })
                        }
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shrink-0 cursor-pointer shadow-xs"
                      >
                        Swap Lat &amp; Lng
                      </button>
                    </div>
                  )}

                  {hasValidPin && !isCoordsSwapped && (
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        Verify your office location:
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${inputLat},${inputLng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-vibrant-orange hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        <span>
                          View Pin on Google Maps ({inputLat.toFixed(4)}, {inputLng.toFixed(4)})
                        </span>
                      </a>
                    </div>
                  )}
                </>
              );
            })()}

            <form onSubmit={handleSaveManualCoords} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-on-surface mb-1">
                  Latitude <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14.599512"
                  value={manualCoordsInput.latitude}
                  onChange={(e) => setManualCoordsInput({ ...manualCoordsInput, latitude: e.target.value })}
                  onPaste={handlePasteCoords}
                  className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-hidden focus:border-vibrant-orange font-mono"
                />
                <span className="text-[10px] text-on-surface-variant block mt-0.5">
                  Tip: Pasting &quot;lat, lng&quot; here autofills both coordinates
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface mb-1">
                  Longitude <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 120.984214"
                  value={manualCoordsInput.longitude}
                  onChange={(e) => setManualCoordsInput({ ...manualCoordsInput, longitude: e.target.value })}
                  onPaste={handlePasteCoords}
                  className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-hidden focus:border-vibrant-orange font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface mb-1">
                  Geofence Radius
                </label>
                <select
                  value={manualCoordsInput.radius}
                  onChange={(e) =>
                    setManualCoordsInput({ ...manualCoordsInput, radius: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-hidden focus:border-vibrant-orange"
                >
                  <option value={50}>50 meters (Compact Office / Single Floor)</option>
                  <option value={100}>100 meters (Standard Workplace Radius)</option>
                  <option value={200}>200 meters (Large Building / Compound)</option>
                  <option value={500}>500 meters (University / Corporate Campus)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualCoordsModal(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingManualCoords}
                  className="px-4 py-1.5 bg-vibrant-orange hover:bg-deep-orange text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingManualCoords ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      <span>Save Office Geofence</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

