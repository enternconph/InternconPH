import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Animated,
  AppState,
  PermissionsAndroid,
  Platform,
  Linking,
  KeyboardAvoidingView,
  ScrollView,
  SafeAreaView,
  StatusBar,
  BackHandler,
  useWindowDimensions
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Geolocation from '@react-native-community/geolocation';
import {
  ShieldAlert,
  RotateCw,
  X,
  ArrowLeft,
  Smartphone,
  Clock,
  Lock,
  CheckCircle2,
  MapPin
} from 'lucide-react-native';
import api from '../api/client';
import { colors } from '../utils/theme';
import { formatTime12 } from '../utils/timeUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getOrCreateDeviceToken,
  saveOfflineCredentials,
  loadOfflineCredentials,
  clearOfflineCredentials,
  getDeviceName,
  buildDynamicQrPayload,
  calculateHaversineMeters,
  TOTP_STEP_SECONDS
} from '../utils/totpHelper';

const ROTATION_INTERVAL = TOTP_STEP_SECONDS; // 30-second TOTP rotation
const DEVICE_STORAGE_KEY = '@internconph_attendance_device_token';

export default function AttendanceQrModal({ visible = true, onClose, onBack }) {
  const handleNavigateBack = useCallback(() => {
    if (onBack) onBack();
    else if (onClose) onClose();
  }, [onBack, onClose]);

  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const qrSize = winHeight < 700
    ? 200
    : Math.min(248, Math.max(204, winWidth - 104));

  const [loading, setLoading] = useState(true);
  const [qrSecret, setQrSecret] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [deviceToken, setDeviceToken] = useState(null);
  const [qrPayload, setQrPayload] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(ROTATION_INTERVAL);
  const [deviceBound, setDeviceBound] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [watermarkPst, setWatermarkPst] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [todayLog, setTodayLog] = useState(null);
  const [scanNotice, setScanNotice] = useState(null);
  const [workplaceGeofence, setWorkplaceGeofence] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsErrorStatus, setGpsErrorStatus] = useState(null); // 'permission_denied' | 'provider_disabled' | null

  // Device Mismatch & 6-Digit Gmail OTP State
  const [deviceMismatchData, setDeviceMismatchData] = useState(null);
  const [otpStep, setOtpStep] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'verifying'
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpCountdownSec, setOtpCountdownSec] = useState(0);
  const [devOtpPreview, setDevOtpPreview] = useState(null);
  const [pendingOtpToken, setPendingOtpToken] = useState(null);

  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  const prevLogRef = useRef(null);
  const gpsCoordsRef = useRef(null);
  const qrSecretRef = useRef(null);
  const studentIdRef = useRef(null);
  const deviceTokenRef = useRef(null);
  const isOfflineRef = useRef(false);
  const qrLocRef = useRef(null); // GPS fix embedded in the QR currently on screen

  const regenerateQr = useCallback(
    async (
      sec = qrSecretRef.current,
      sId = studentIdRef.current,
      dTok = deviceTokenRef.current,
      mode = isOfflineRef.current ? 'offline' : 'online',
      resetProgress = true
    ) => {
      if (!sec || !sId || !dTok) return;
      try {
        const nowMs = Date.now();
        const baseLoc = gpsCoordsRef.current;
        const activeLoc =
          baseLoc && (!baseLoc.receivedAtMs || nowMs - baseLoc.receivedAtMs <= 120000)
            ? { ...baseLoc, ts: Math.floor(nowMs / 1000) }
            : baseLoc;
        qrLocRef.current = activeLoc;
        const freshPayload = await buildDynamicQrPayload(sec, sId, dTok, {
          mode,
          location: activeLoc
        });
        setQrPayload(freshPayload);
        if (resetProgress) {
          progressAnim.setValue(1);
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: ROTATION_INTERVAL * 1000,
            useNativeDriver: false
          }).start();
        }
      } catch (e) {
        console.warn('QR regeneration error:', e);
      }
    },
    [progressAnim]
  );

  const handleCancelManualRebind = useCallback(() => {
    setPendingOtpToken(null);
    setDeviceMismatchData(null);
    setOtpStep('idle');
    setOtpCode('');
    setOtpError('');
    setDevOtpPreview(null);
    if (qrSecretRef.current && studentIdRef.current && deviceTokenRef.current) {
      regenerateQr(
        qrSecretRef.current,
        studentIdRef.current,
        deviceTokenRef.current,
        isOfflineRef.current ? 'offline' : 'online',
        false
      );
    }
  }, [regenerateQr]);

  // Android Hardware / Gesture Back button support for Full-Screen navigation
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (deviceMismatchData?.isManualRebind) {
        handleCancelManualRebind();
        return true;
      }
      handleNavigateBack();
      return true;
    });
    return () => sub.remove();
  }, [visible, deviceMismatchData, handleCancelManualRebind, handleNavigateBack]);

  // Request Android high-accuracy GPS location via native Geolocation module
  useEffect(() => {
    if (!visible) return;
    let watchId = null;
    let heartbeatId = null;
    let fallbackTimer = null;

    async function startLocationTracking() {
      try {
        if (Platform.OS === 'android') {
          try {
            const granted = await PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
            ]);
            const fine =
              granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
              PermissionsAndroid.RESULTS.GRANTED;
            const coarse =
              granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
              PermissionsAndroid.RESULTS.GRANTED;
            if (!fine && !coarse) {
              console.warn('GPS location permissions denied by user');
              setGpsErrorStatus('permission_denied');
              return;
            }
            setGpsErrorStatus(null);
          } catch (permErr) {
            console.warn('Error requesting location permissions:', permErr);
          }
        }

        Geolocation.setRNConfiguration({
          skipPermissionRequests: false,
          authorizationLevel: 'whenInUse',
          locationProvider: 'playServices'
        });

        const updateCoords = (pos) => {
          if (!pos || !pos.coords) return;
          setGpsErrorStatus(null);
          const nowMs = Date.now();
          const rawTs = Number(pos.timestamp);
          const isValidEpochMs =
            !isNaN(rawTs) && rawTs > 1700000000000 && rawTs <= nowMs + 60000;
          const fixMs = isValidEpochMs && nowMs - rawTs <= 25000 ? rawTs : nowMs;
          const loc = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            acc: Math.round(pos.coords.accuracy || 0),
            ts: Math.floor(fixMs / 1000),
            receivedAtMs: nowMs
          };

          const prev = gpsCoordsRef.current;
          if (prev && loc.ts < prev.ts) return;

          gpsCoordsRef.current = loc;
          setGpsCoords(loc);

          const qrLoc = qrLocRef.current;
          const nowSec = Math.floor(nowMs / 1000);
          const shouldRefresh =
            !qrLoc ||
            nowSec - qrLoc.ts > 8 ||
            (qrLoc.acc != null && loc.acc + 8 < qrLoc.acc);

          const sec = qrSecretRef.current;
          const sId = studentIdRef.current;
          const dTok = deviceTokenRef.current;
          const off = isOfflineRef.current;
          if (shouldRefresh && sec && sId && dTok) {
            regenerateQr(sec, sId, dTok, off ? 'offline' : 'online', false);
          }
        };

        const highAccuracyOpts = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 10000
        };

        Geolocation.getCurrentPosition(
          updateCoords,
          (err) => {
            console.warn('High-accuracy GPS fix failed or timed out:', err);
            if (err?.code === 2) {
              setGpsErrorStatus('provider_disabled');
            }
            Geolocation.getCurrentPosition(
              updateCoords,
              (fallbackErr) => {
                console.warn('Fallback location fix also failed:', fallbackErr);
                if (fallbackErr?.code === 2) {
                  setGpsErrorStatus('provider_disabled');
                }
              },
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
            );
          },
          highAccuracyOpts
        );

        fallbackTimer = setTimeout(() => {
          if (!gpsCoordsRef.current) {
            Geolocation.getCurrentPosition(
              updateCoords,
              () => {},
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
            );
          }
        }, 3500);

        watchId = Geolocation.watchPosition(
          updateCoords,
          (err) => {
            console.warn('Geolocation watchPosition error:', err);
            if (err?.code === 2) {
              setGpsErrorStatus('provider_disabled');
            }
          },
          {
            enableHighAccuracy: true,
            distanceFilter: 0,
            interval: 2000,
            fastestInterval: 1000,
            maximumAge: 5000
          }
        );

        heartbeatId = setInterval(() => {
          Geolocation.getCurrentPosition(updateCoords, () => {}, highAccuracyOpts);
        }, 8000);
      } catch (err) {
        console.warn('Location tracking start error:', err);
      }
    }

    startLocationTracking();

    return () => {
      try {
        if (fallbackTimer !== null) clearTimeout(fallbackTimer);
        if (heartbeatId !== null) clearInterval(heartbeatId);
        if (watchId !== null) {
          Geolocation.clearWatch(watchId);
        }
      } catch (_) {}
    };
  }, [visible, regenerateQr]);

  // OTP countdown timer (5 minutes = 300s)
  useEffect(() => {
    if (otpCountdownSec <= 0) return;
    const id = setInterval(() => {
      setOtpCountdownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [otpCountdownSec]);

  const startCountdown = useCallback(
    (secretArg, sIdArg, devTokenArg, modeArg = 'online') => {
      clearInterval(timerRef.current);
      const nowSec = Math.floor(Date.now() / 1000);
      const initialRem = ROTATION_INTERVAL - (nowSec % ROTATION_INTERVAL);
      setSecondsRemaining(initialRem);
      progressAnim.setValue(initialRem / ROTATION_INTERVAL);

      Animated.timing(progressAnim, {
        toValue: 0,
        duration: initialRem * 1000,
        useNativeDriver: false
      }).start();

      timerRef.current = setInterval(() => {
        const now = new Date();
        const pstStr = now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour12: true,
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit'
        });
        setWatermarkPst(`${pstStr} PST`);

        const curSec = Math.floor(now.getTime() / 1000);
        const rem = ROTATION_INTERVAL - (curSec % ROTATION_INTERVAL);
        setSecondsRemaining(rem);

        if (rem === ROTATION_INTERVAL) {
          regenerateQr(secretArg, sIdArg, devTokenArg, modeArg, true);
        }
      }, 1000);
    },
    [progressAnim, regenerateQr]
  );

  // Initialize Credentials & Register Device (with full offline support & OTP device binding)
  useEffect(() => {
    if (!visible) {
      setDeviceMismatchData(null);
      setOtpStep('idle');
      setOtpCode('');
      setOtpError('');
      return;
    }

    let isMounted = true;

    async function initCredentials() {
      setLoading(true);
      setErrorMessage('');
      setOtpError('');

      const devToken = await getOrCreateDeviceToken();
      const devName = getDeviceName();
      if (isMounted) setDeviceToken(devToken);

      try {
        const res = await api.post('/student/attendance/register-device', {
          device_id: devToken,
          device_token: devToken,
          device_label: devName,
          device_name: devName
        });

        if (res.success && res.data) {
          if (res.data.todayLog && isMounted) {
            setTodayLog(res.data.todayLog);
            prevLogRef.current = res.data.todayLog;
          }
          if (res.data.workplaceGeofence && isMounted) {
            setWorkplaceGeofence(res.data.workplaceGeofence);
          }

          // Case A: Unregistered Phone -> Block QR & Require 6-Digit Gmail OTP
          if (res.data.status === 'device_mismatch' || res.data.requires_otp) {
            await clearOfflineCredentials();
            if (isMounted) {
              setQrSecret(null);
              setQrPayload('');
              setDeviceMismatchData({
                ...res.data,
                current_device_name: devName,
                masked_email: res.data.masked_email || 'Registered Student Email'
              });
              setLoading(false);
            }
            return;
          }

          // Case B: Bound Device -> Save 72h offline vault & generate signed v2 QR
          const secret = res.data.qrSecret || res.data.totp_secret;
          const sId = res.data.studentId || res.data.student_id;
          const sName = res.data.studentName || res.data.full_name || 'OJT Student';
          const activeDevToken = res.data.device_id || res.data.deviceToken || devToken;

          if (activeDevToken !== devToken) {
            await AsyncStorage.setItem(DEVICE_STORAGE_KEY, activeDevToken);
          }

          await saveOfflineCredentials({
            studentId: sId,
            studentName: sName,
            qrSecret: secret,
            deviceToken: activeDevToken,
            secret_expires_at: res.data.secret_expires_at,
            workplaceGeofence: res.data.workplaceGeofence
          });

          qrSecretRef.current = secret;
          studentIdRef.current = sId;
          deviceTokenRef.current = activeDevToken;
          isOfflineRef.current = false;

          if (isMounted) {
            setDeviceMismatchData(null);
            setDeviceToken(activeDevToken);
            setStudentId(sId);
            setStudentName(sName);
            setQrSecret(secret);
            setDeviceBound(true);
            setIsOffline(false);
            setErrorMessage('');
          }

          if (gpsCoordsRef.current) {
            const initialPayload = await buildDynamicQrPayload(secret, sId, activeDevToken, {
              mode: 'online',
              location: (qrLocRef.current = gpsCoordsRef.current)
            });
            if (isMounted) {
              setQrPayload(initialPayload);
              setLoading(false);
              startCountdown(secret, sId, activeDevToken, 'online');
            }
          } else {
            if (isMounted) {
              setQrPayload('');
              setLoading(false);
              startCountdown(secret, sId, activeDevToken, 'online');
            }
          }
        }
      } catch (err) {
        console.warn('Online credentials fetch failed, checking offline vault:', err);
        const offlineVault = await loadOfflineCredentials(devToken);

        if (offlineVault && !offlineVault.expired && !offlineVault.deviceMismatch && offlineVault.cached) {
          const c = offlineVault.cached;
          qrSecretRef.current = c.qrSecret;
          studentIdRef.current = c.studentId;
          deviceTokenRef.current = c.deviceToken;
          isOfflineRef.current = true;

          if (isMounted) {
            setDeviceMismatchData(null);
            setDeviceToken(c.deviceToken);
            setStudentId(c.studentId);
            setStudentName(c.studentName || 'OJT Student');
            setQrSecret(c.qrSecret);
            setWorkplaceGeofence(c.workplaceGeofence || null);
            setDeviceBound(true);
            setIsOffline(true);
          }
          const cachedPayload = await buildDynamicQrPayload(c.qrSecret, c.studentId, c.deviceToken, {
            mode: 'offline',
            location: (qrLocRef.current = gpsCoordsRef.current)
          });
          if (isMounted) {
            setQrPayload(cachedPayload);
            setLoading(false);
            startCountdown(c.qrSecret, c.studentId, c.deviceToken, 'offline');
          }
        } else if (offlineVault?.deviceMismatch) {
          if (isMounted) {
            setErrorMessage(
              'This phone does not match your registered attendance device. Connect to the internet and complete 6-digit Gmail OTP verification.'
            );
            setLoading(false);
          }
        } else if (offlineVault?.expired) {
          if (isMounted) {
            setErrorMessage(
              'Your 72-hour offline attendance secret has expired. Please connect to the internet briefly to refresh your device credentials.'
            );
            setLoading(false);
          }
        } else if (isMounted) {
          setErrorMessage(
            err.message || 'Please connect online at least once to bind your attendance device.'
          );
          setLoading(false);
        }
      }
    }

    initCredentials();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        setQrPayload('');
      } else if (
        nextAppState === 'active' &&
        qrSecretRef.current &&
        studentIdRef.current &&
        deviceTokenRef.current
      ) {
        regenerateQr(
          qrSecretRef.current,
          studentIdRef.current,
          deviceTokenRef.current,
          isOfflineRef.current ? 'offline' : 'online'
        );
      }
    });

    return () => {
      isMounted = false;
      clearInterval(timerRef.current);
      subscription.remove();
    };
  }, [visible, regenerateQr, startCountdown]);

  // Live attendance polling while QR screen is active
  useEffect(() => {
    if (!visible || isOffline || deviceMismatchData) {
      setScanNotice(null);
      return;
    }

    let isSubscribed = true;

    const checkAttendance = async () => {
      try {
        const res = await api.get('/student/attendance');
        if (res.success && res.data && isSubscribed) {
          const fresh = res.data.todayLog;
          const prev = prevLogRef.current;

          if (fresh?.time_in && (!prev || !prev.time_in)) {
            setScanNotice({
              type: 'success',
              action: 'time_in',
              title: 'TIME-IN SUCCESSFUL!',
              message: `You clocked in at ${formatTime12(fresh.time_in)} (${fresh.time_in_status === 'late' ? 'Late Arrival' : 'On-Time'}). Have a productive shift!`
            });
            prevLogRef.current = fresh;
            setTodayLog(fresh);
          } else if (fresh?.time_out && (!prev || !prev.time_out)) {
            setScanNotice({
              type: 'success',
              action: 'time_out',
              title: 'TIME-OUT SUCCESSFUL!',
              message: `You clocked out at ${formatTime12(fresh.time_out)} (${fresh.hours_rendered || 0} hrs credited). Shift is complete!`
            });
            prevLogRef.current = fresh;
            setTodayLog(fresh);
          } else if (fresh) {
            prevLogRef.current = fresh;
            setTodayLog(fresh);
          }
        }
      } catch (_) {}
    };

    checkAttendance();
    const pollId = setInterval(checkAttendance, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(pollId);
    };
  }, [visible, isOffline, deviceMismatchData]);

  const generateCandidateToken = () => {
    const chars = '0123456789abcdef';
    let out = '';
    for (let i = 0; i < 40; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return `andr_${out}`;
  };

  // Open manual OTP re-bind screen inline without overwriting active AsyncStorage token yet
  const handleOpenManualRebind = () => {
    const devName = getDeviceName();
    const candidate = generateCandidateToken();
    setPendingOtpToken(candidate);
    setOtpStep('idle');
    setOtpCode('');
    setOtpError('');
    setDevOtpPreview(null);
    setDeviceMismatchData({
      status: 'manual_rebind',
      isManualRebind: true,
      requires_otp: true,
      registered_device_name: devName,
      current_device_name: devName,
      masked_email: 'Registered Student Email',
      message:
        'Rotate your hardware device key via a 6-digit email OTP. Your current binding stays active if you cancel.'
    });
  };

  // Request 6-digit Gmail OTP
  const handleRequestDeviceOtp = async (rotateToken = false) => {
    setOtpStep('sending');
    setOtpError('');
    try {
      const targetToken = rotateToken
        ? pendingOtpToken || generateCandidateToken()
        : pendingOtpToken || deviceToken || (await getOrCreateDeviceToken());
      if (rotateToken || deviceMismatchData?.isManualRebind) {
        setPendingOtpToken(targetToken);
      } else {
        setDeviceToken(targetToken);
      }
      const devName = getDeviceName();

      const res = await api.post('/student/attendance/request-device-otp', {
        device_id: targetToken,
        device_token: targetToken,
        device_label: devName
      });

      if (res.success) {
        setOtpStep('sent');
        setOtpCountdownSec(res.data?.expires_in_seconds || 300);
        setOtpCode(res.data?.dev_otp_preview || '');
        if (res.data?.dev_otp_preview) {
          setDevOtpPreview(res.data.dev_otp_preview);
        }
        setDeviceMismatchData((prev) => ({
          ...(prev || {}),
          status: prev?.status || 'device_mismatch',
          requires_otp: true,
          registered_device_name: prev?.registered_device_name || devName,
          current_device_name: devName,
          masked_email: res.data?.masked_email || prev?.masked_email || 'your registered email',
          message:
            prev?.message ||
            'Enter the 6-digit verification code sent to your email to bind this phone.'
        }));
      } else {
        setOtpStep('idle');
        setOtpError(res.message || 'Failed to send verification OTP.');
      }
    } catch (err) {
      setOtpStep('idle');
      setOtpError(err.message || 'Network error requesting OTP.');
    }
  };

  // Verify 6-digit Gmail OTP and bind this Android phone
  const handleVerifyDeviceOtp = async () => {
    const cleaned = String(otpCode).trim();
    if (!/^\d{6}$/.test(cleaned)) {
      setOtpError('Please enter the 6-digit numeric verification code.');
      return;
    }

    setOtpStep('verifying');
    setOtpError('');

    try {
      const devName = getDeviceName();
      const targetToken = pendingOtpToken || deviceToken;
      const res = await api.post('/student/attendance/verify-device-otp', {
        otp_code: cleaned,
        device_id: targetToken,
        device_token: targetToken,
        device_label: devName
      });

      if (res.success && res.data) {
        const secret = res.data.qrSecret || res.data.totp_secret;
        const sId = res.data.studentId || res.data.student_id;
        const sName = res.data.studentName || res.data.full_name || 'OJT Student';
        const activeDevToken = res.data.device_id || res.data.deviceToken || targetToken;

        await AsyncStorage.setItem(DEVICE_STORAGE_KEY, activeDevToken);

        await saveOfflineCredentials({
          studentId: sId,
          studentName: sName,
          qrSecret: secret,
          deviceToken: activeDevToken,
          secret_expires_at: res.data.secret_expires_at,
          workplaceGeofence: res.data.workplaceGeofence
        });

        qrSecretRef.current = secret;
        studentIdRef.current = sId;
        deviceTokenRef.current = activeDevToken;
        isOfflineRef.current = false;

        setPendingOtpToken(null);
        setDeviceMismatchData(null);
        setOtpStep('idle');
        setOtpCode('');
        setDevOtpPreview(null);
        setDeviceToken(activeDevToken);
        setStudentId(sId);
        setStudentName(sName);
        setQrSecret(secret);
        setDeviceBound(true);
        setIsOffline(false);
        if (res.data.todayLog) {
          setTodayLog(res.data.todayLog);
          prevLogRef.current = res.data.todayLog;
        }

        if (gpsCoordsRef.current) {
          const initialPayload = await buildDynamicQrPayload(secret, sId, activeDevToken, {
            mode: 'online',
            location: (qrLocRef.current = gpsCoordsRef.current)
          });
          setQrPayload(initialPayload);
        } else {
          setQrPayload('');
        }
        startCountdown(secret, sId, activeDevToken, 'online');

        setScanNotice({
          type: 'success',
          title: 'DEVICE KEY BOUND!',
          message: `This phone (${devName}) is now securely bound to your account.`
        });
      } else {
        setOtpStep('sent');
        setOtpError(res.message || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      setOtpStep('sent');
      setOtpError(err.message || 'Invalid or expired OTP code.');
    }
  };

  if (!visible) return null;

  const hasGeofenceCoords =
    workplaceGeofence &&
    workplaceGeofence.latitude != null &&
    workplaceGeofence.longitude != null;
  const isGeofenceActive = Boolean(workplaceGeofence?.configured || hasGeofenceCoords);

  const liveDistanceMeters =
    isGeofenceActive && gpsCoords
      ? calculateHaversineMeters(
          gpsCoords.lat,
          gpsCoords.lng,
          workplaceGeofence.latitude,
          workplaceGeofence.longitude
        )
      : null;

  const allowedRadiusMeters = workplaceGeofence?.radius_meters || 100;
  const isInsideWorkplace =
    liveDistanceMeters !== null ? liveDistanceMeters <= allowedRadiusMeters : true;

  return (
    <SafeAreaView style={styles.fullScreenRoot}>
      <StatusBar barStyle="light-content" backgroundColor="#193631" />

      {/* Top Native Full-Screen Navigation Bar */}
      <View style={styles.topAppBar}>
        <TouchableOpacity
          onPress={deviceMismatchData?.isManualRebind ? handleCancelManualRebind : handleNavigateBack}
          style={styles.backBtn}
          activeOpacity={0.75}
        >
          <ArrowLeft size={19} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenterCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Dynamic Attendance QR
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            30s Rolling TOTP • CHED Biometrics
          </Text>
        </View>

        <View
          style={[
            styles.modeBadgePill,
            isOffline ? styles.modeBadgeOffline : styles.modeBadgeOnline
          ]}
        >
          <View
            style={[
              styles.modeStatusDot,
              { backgroundColor: isOffline ? '#FFB433' : '#10B981' }
            ]}
          />
          <Text
            style={[
              styles.modeBadgeText,
              { color: isOffline ? '#FFB433' : '#6EE7B7' }
            ]}
          >
            {isOffline ? 'OFFLINE' : 'ONLINE'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flexBody}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Verifying hardware device binding...</Text>
          </View>
        ) : deviceMismatchData ? (
          /* FULL-SCREEN 6-DIGIT EMAIL OTP RE-BINDING FLOW */
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.otpScrollContent}
          >
            <View style={styles.otpBannerCard}>
              <View style={styles.otpIconBadge}>
                <ShieldAlert size={22} color="#FFB433" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.otpBadge}>
                  {deviceMismatchData.isManualRebind
                    ? 'DEVICE KEY ROTATION'
                    : 'ATTENDANCE LOCKED • NEW PHONE'}
                </Text>
                <Text style={styles.otpTitle}>Re-bind Device via OTP</Text>
              </View>
            </View>

            <Text style={styles.otpDesc}>
              {deviceMismatchData.message ||
                'Your attendance account is locked to another handset. Verify via a 6-digit email OTP to bind this phone and unbind the previous device.'}
            </Text>

            <View style={styles.deviceCompareBox}>
              <View style={styles.deviceCompareRow}>
                <Text style={styles.deviceCompareLabel}>Bound Device</Text>
                <Text style={styles.deviceCompareVal} numberOfLines={1} ellipsizeMode="tail">
                  {deviceMismatchData.registered_device_name || 'Previous Android Phone'}
                </Text>
              </View>
              <View style={styles.deviceCompareDivider} />
              <View style={styles.deviceCompareRow}>
                <Text style={styles.deviceCompareLabel}>This Phone</Text>
                <Text
                  style={[styles.deviceCompareVal, { color: '#FFB433' }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {deviceMismatchData.current_device_name || getDeviceName()}
                </Text>
              </View>
              <View style={styles.deviceCompareDivider} />
              <View style={styles.deviceCompareRow}>
                <Text style={styles.deviceCompareLabel}>OTP Recipient</Text>
                <Text style={styles.deviceCompareVal} numberOfLines={1} ellipsizeMode="middle">
                  {deviceMismatchData.masked_email || 'Registered Email'}
                </Text>
              </View>
            </View>

            {otpError ? (
              <View style={styles.otpErrorBanner}>
                <Text style={styles.otpErrorText}>{otpError}</Text>
              </View>
            ) : null}

            {otpStep === 'idle' || otpStep === 'sending' ? (
              <View style={styles.otpActionStack}>
                <TouchableOpacity
                  onPress={() => handleRequestDeviceOtp(Boolean(deviceMismatchData.isManualRebind))}
                  disabled={otpStep === 'sending'}
                  style={[styles.otpPrimaryBtn, otpStep === 'sending' && { opacity: 0.7 }]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.otpPrimaryBtnText}>
                    {otpStep === 'sending' ? 'Sending 6-Digit OTP...' : 'Send 6-Digit OTP Code'}
                  </Text>
                </TouchableOpacity>

                {deviceMismatchData.isManualRebind ? (
                  <TouchableOpacity
                    onPress={handleCancelManualRebind}
                    disabled={otpStep === 'sending'}
                    style={styles.otpGhostBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.otpGhostBtnText}>Cancel & Keep Current Binding</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={styles.otpVerifyStack}>
                <View style={styles.otpTimerPill}>
                  <Clock size={13} color="#80CBC4" />
                  <Text style={styles.otpTimerLabel}>
                    Code sent • Expires in {Math.floor(otpCountdownSec / 60)}:
                    {String(otpCountdownSec % 60).padStart(2, '0')}
                  </Text>
                </View>

                {devOtpPreview ? (
                  <View style={styles.devOtpBox}>
                    <Text style={styles.devOtpLabel}>Verification Code (Auto-Detected)</Text>
                    <Text style={styles.devOtpValue}>{devOtpPreview}</Text>
                  </View>
                ) : null}

                <TextInput
                  value={otpCode}
                  onChangeText={(txt) => setOtpCode(txt.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.otpInput}
                />

                <View style={styles.otpBtnRow}>
                  <TouchableOpacity
                    onPress={() => handleRequestDeviceOtp(Boolean(deviceMismatchData.isManualRebind))}
                    disabled={otpStep === 'verifying'}
                    style={styles.otpSecondaryBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.otpSecondaryBtnText}>Resend</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleVerifyDeviceOtp}
                    disabled={otpStep === 'verifying' || otpCode.length !== 6}
                    style={[
                      styles.otpPrimaryBtn,
                      { flex: 1, opacity: otpCode.length === 6 ? 1 : 0.5 }
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.otpPrimaryBtnText}>
                      {otpStep === 'verifying' ? 'Verifying...' : 'Verify & Bind Phone'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {deviceMismatchData.isManualRebind ? (
                  <TouchableOpacity
                    onPress={handleCancelManualRebind}
                    disabled={otpStep === 'verifying'}
                    style={styles.otpGhostBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.otpGhostBtnText}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </ScrollView>
        ) : errorMessage ? (
          <View style={styles.errorContainer}>
            <ShieldAlert size={48} color={colors.danger} />
            <Text style={styles.errorTitle}>Attendance Security Notice</Text>
            <Text style={styles.errorDesc}>{errorMessage}</Text>
            <TouchableOpacity onPress={handleNavigateBack} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.screenScrollContent}
          >
            {/* Real-time Scan Confirmation Notice */}
            {scanNotice && (
              <View
                style={[
                  styles.scanNoticeCard,
                  scanNotice.type === 'success' ? styles.scanNoticeSuccess : styles.scanNoticeError
                ]}
              >
                <View style={styles.scanNoticeRow}>
                  <CheckCircle2 size={20} color="#ffffff" />
                  <View style={styles.scanNoticeTextGroup}>
                    <Text style={styles.scanNoticeTitle}>{scanNotice.title}</Text>
                    <Text style={styles.scanNoticeMessage}>{scanNotice.message}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setScanNotice(null)}
                    style={styles.scanNoticeCloseBtn}
                  >
                    <X size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Today's Shift Live Status Indicator */}
            <View style={styles.shiftStatusContainer}>
              {todayLog?.time_out ? (
                <View style={[styles.shiftStatusCard, styles.shiftCardSuccess]}>
                  <CheckCircle2 size={19} color="#34D399" />
                  <View style={styles.shiftStatusTexts}>
                    <Text style={[styles.shiftStatusLabel, styles.textSuccess]}>
                      TODAY&apos;S SHIFT COMPLETED
                    </Text>
                    <Text style={styles.shiftStatusDesc} numberOfLines={2}>
                      In: {formatTime12(todayLog.time_in)} • Out: {formatTime12(todayLog.time_out)}
                    </Text>
                  </View>
                  <View style={[styles.shiftActionPill, { backgroundColor: '#059669' }]}>
                    <Text style={styles.shiftActionPillText}>{todayLog.hours_rendered || 0} hrs</Text>
                  </View>
                </View>
              ) : todayLog?.time_in ? (
                <View style={[styles.shiftStatusCard, styles.shiftCardActive]}>
                  <View style={styles.livePulseDot} />
                  <View style={styles.shiftStatusTexts}>
                    <Text style={[styles.shiftStatusLabel, styles.textSuccess]}>
                      TIMED-IN • ACTIVE SHIFT
                    </Text>
                    <Text style={styles.shiftStatusDesc} numberOfLines={2}>
                      In at {formatTime12(todayLog.time_in)} (
                      {todayLog.time_in_status === 'late' ? 'Late' : 'On-Time'})
                    </Text>
                  </View>
                  <View style={[styles.shiftActionPill, { backgroundColor: '#FFB433' }]}>
                    <Text style={[styles.shiftActionPillText, { color: '#193631' }]}>SCAN OUT</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.shiftStatusCard, styles.shiftCardAwaiting]}>
                  <Clock size={18} color="#FFB433" />
                  <View style={styles.shiftStatusTexts}>
                    <Text style={[styles.shiftStatusLabel, styles.textWarning]}>
                      AWAITING TIME-IN
                    </Text>
                    <Text style={styles.shiftStatusDesc} numberOfLines={2}>
                      Present this live QR pass to the HR desk scanner
                    </Text>
                  </View>
                  <View style={[styles.shiftActionPill, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.shiftActionPillText}>SCAN IN</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Full-Width High-Contrast White QR Security Pass Ticket */}
            <View style={styles.qrTicketCard}>
              {/* Ticket Top Metadata Strip */}
              <View style={styles.qrTicketHeader}>
                <Text style={styles.qrTicketIdText} numberOfLines={1}>
                  {studentName
                    ? `${studentName.toUpperCase()} • #${studentId}`
                    : `INTERN #${studentId || '---'}`}
                </Text>
                <Text style={styles.qrTicketPstText} numberOfLines={1}>
                  {watermarkPst || 'PST UTC+8'}
                </Text>
              </View>

              {/* Ticket QR Matrix Area */}
              <View style={[styles.qrMatrixBody, { minHeight: qrSize + 40 }]}>
                {!isOffline && !gpsCoords ? (
                  <View style={[styles.gpsLockingBox, { minHeight: qrSize }]}>
                    {gpsErrorStatus === 'provider_disabled' ? (
                      <>
                        <View style={[styles.gpsStateIconCircle, { backgroundColor: '#FEF3C7' }]}>
                          <MapPin size={28} color="#D97706" />
                        </View>
                        <Text style={styles.gpsLockingTitle}>Location Switched OFF</Text>
                        <Text style={styles.gpsLockingSubtitle}>
                          Turn ON Phone Location in Quick Settings to generate your attendance QR.
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            if (Platform.OS === 'android') {
                              Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(
                                () => Linking.openSettings()
                              );
                            } else {
                              Linking.openSettings();
                            }
                          }}
                          style={styles.gpsOpenSettingsBtn}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.gpsOpenSettingsBtnText}>Turn ON Location</Text>
                        </TouchableOpacity>
                      </>
                    ) : gpsErrorStatus === 'permission_denied' ? (
                      <>
                        <View style={[styles.gpsStateIconCircle, { backgroundColor: '#FEE2E2' }]}>
                          <ShieldAlert size={28} color="#DC2626" />
                        </View>
                        <Text style={styles.gpsLockingTitle}>Location Permission Required</Text>
                        <Text style={styles.gpsLockingSubtitle}>
                          Allow Precise Location so your QR can verify workplace geofence presence.
                        </Text>
                        <TouchableOpacity
                          onPress={() => Linking.openSettings()}
                          style={styles.gpsOpenSettingsBtn}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.gpsOpenSettingsBtnText}>Open App Settings</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <ActivityIndicator size="large" color="#D97706" />
                        <Text style={styles.gpsLockingTitle}>Locking Workplace GPS...</Text>
                        <Text style={styles.gpsLockingSubtitle}>
                          Acquiring Google Fused Location & satellite coordinates. Your QR will
                          appear automatically.
                        </Text>
                      </>
                    )}
                  </View>
                ) : qrPayload ? (
                  <View style={styles.qrMatrixCenter}>
                    <QRCode
                      value={qrPayload}
                      size={qrSize}
                      color="#0F172A"
                      backgroundColor="#FFFFFF"
                    />
                  </View>
                ) : (
                  <View style={[styles.gpsLockingBox, { minHeight: qrSize }]}>
                    <ActivityIndicator size="large" color="#D97706" />
                    <Text style={styles.gpsLockingTitle}>Generating Dynamic QR...</Text>
                  </View>
                )}
              </View>

              {/* Ticket Footer Bar (GPS Precision + Countdown) */}
              <View style={styles.qrTicketFooter}>
                <View
                  style={[
                    styles.gpsLockedPill,
                    isOffline
                      ? styles.gpsPillOffline
                      : gpsCoords
                      ? styles.gpsPillReady
                      : styles.gpsPillAcquiring
                  ]}
                >
                  <CheckCircle2
                    size={13}
                    color={isOffline ? '#B45309' : gpsCoords ? '#047857' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.gpsLockedPillText,
                      { color: isOffline ? '#B45309' : gpsCoords ? '#047857' : '#475569' }
                    ]}
                    numberOfLines={1}
                  >
                    {isOffline
                      ? 'Offline Vault'
                      : gpsCoords
                      ? `GPS ±${gpsCoords.acc || 0}m`
                      : 'Acquiring GPS'}
                  </Text>
                </View>

                <View style={styles.timerInlinePill}>
                  <RotateCw size={13} color="#B45309" />
                  <Text style={styles.timerInlineText}>
                    Rotates in <Text style={styles.timerInlineCount}>{secondsRemaining}s</Text>
                  </Text>
                </View>
              </View>

              {/* Edge-to-Edge Animated Progress Track */}
              <View style={styles.progressBarTrack}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]}
                />
              </View>
            </View>

            {/* Geofence & Hardware Security Telemetry Card */}
            <View style={styles.badgeCard}>
              {/* Geofence / Security Row */}
              <View style={styles.badgeRow}>
                <View style={styles.badgeLeftShrink}>
                  <View style={styles.badgeIconBox}>
                    {isOffline ? (
                      <Lock size={15} color="#FFB433" />
                    ) : (
                      <MapPin
                        size={15}
                        color={gpsErrorStatus || !isInsideWorkplace ? '#F87171' : '#34D399'}
                      />
                    )}
                  </View>
                  <Text style={styles.badgeLabel}>
                    {isOffline ? 'Offline Sync' : 'Workplace Geofence'}
                  </Text>
                </View>

                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.badgeValueFlex,
                    gpsErrorStatus || !isInsideWorkplace
                      ? { color: '#FCA5A5' }
                      : gpsCoords
                      ? { color: '#6EE7B7' }
                      : { color: colors.textSecondary }
                  ]}
                  onPress={() => {
                    if (gpsErrorStatus === 'permission_denied') Linking.openSettings();
                    else if (gpsErrorStatus === 'provider_disabled' && Platform.OS === 'android') {
                      Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() =>
                        Linking.openSettings()
                      );
                    }
                  }}
                >
                  {gpsErrorStatus === 'permission_denied'
                    ? 'Permission Denied • Tap'
                    : gpsErrorStatus === 'provider_disabled'
                    ? 'GPS OFF • Tap to Enable'
                    : isOffline
                    ? 'Signed • Queues at HR Desk'
                    : liveDistanceMeters !== null
                    ? isInsideWorkplace
                      ? `Within Radius (${Math.round(liveDistanceMeters)}m / ${allowedRadiusMeters}m)`
                      : `Outside (${Math.round(liveDistanceMeters)}m > ${allowedRadiusMeters}m)`
                    : gpsCoords
                    ? `Locked (±${gpsCoords.acc || 0}m)`
                    : 'Locking Satellites...'}
                </Text>
              </View>

              <View style={styles.divider} />

              {/* Hardware Lock + Re-bind Row */}
              <View style={styles.badgeRow}>
                <View style={styles.badgeLeftFlex}>
                  <View style={styles.badgeIconBox}>
                    <Smartphone size={15} color="#80CBC4" />
                  </View>
                  <View style={styles.badgeTextCol}>
                    <View style={styles.badgeTitleInline}>
                      <Text style={styles.badgeLabel} numberOfLines={1}>
                        Hardware Lock
                      </Text>
                      <View style={styles.boundChip}>
                        <View style={styles.statusDot} />
                        <Text style={styles.boundChipText}>
                          {deviceBound ? 'Bound' : 'Active'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.badgeSublabel} numberOfLines={1}>
                      Single-use nonce • Device TOTP key
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleOpenManualRebind}
                  style={styles.rebindBtn}
                  activeOpacity={0.8}
                >
                  <RotateCw size={12} color="#FFB433" />
                  <Text style={styles.rebindBtnText}>Re-bind OTP</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreenRoot: {
    flex: 1,
    backgroundColor: '#193631'
  },
  flexBody: {
    flex: 1
  },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(18, 40, 36, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    gap: 10
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    flexShrink: 0
  },
  backBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  headerCenterCol: {
    flex: 1,
    minWidth: 0
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: '#80CBC4',
    fontWeight: '600',
    marginTop: 1
  },
  modeBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0
  },
  modeBadgeOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.35)'
  },
  modeBadgeOffline: {
    backgroundColor: 'rgba(255, 180, 51, 0.15)',
    borderColor: 'rgba(255, 180, 51, 0.38)'
  },
  modeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  modeBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  screenScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
    width: '100%'
  },
  otpScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 14
  },
  otpBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 180, 51, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.3)',
    borderRadius: 18,
    padding: 14
  },
  otpIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 180, 51, 0.16)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  otpBadge: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFB433',
    letterSpacing: 0.7,
    marginBottom: 2
  },
  otpTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  otpDesc: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18
  },
  deviceCompareBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 10
  },
  deviceCompareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  deviceCompareDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)'
  },
  deviceCompareLabel: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    flexShrink: 0
  },
  deviceCompareVal: {
    flex: 1,
    fontSize: 11.5,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'right'
  },
  otpErrorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  otpErrorText: {
    fontSize: 11.5,
    color: '#FCA5A5',
    fontWeight: '700',
    textAlign: 'center'
  },
  otpActionStack: {
    width: '100%',
    gap: 10,
    marginTop: 4
  },
  otpVerifyStack: {
    width: '100%',
    gap: 12
  },
  otpTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: 'rgba(128, 203, 196, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(128, 203, 196, 0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  otpTimerLabel: {
    fontSize: 11.5,
    color: '#80CBC4',
    fontWeight: '700'
  },
  devOtpBox: {
    backgroundColor: 'rgba(255, 180, 51, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.4)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center'
  },
  devOtpLabel: {
    color: '#FFB433',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  devOtpValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4
  },
  otpInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    borderWidth: 1.5,
    borderColor: '#FFB433',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  otpBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  otpPrimaryBtn: {
    backgroundColor: '#FFB433',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  otpPrimaryBtnText: {
    color: '#193631',
    fontSize: 13.5,
    fontWeight: '900'
  },
  otpSecondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  otpSecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700'
  },
  otpGhostBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  otpGhostBtnText: {
    color: '#80CBC4',
    fontSize: 12.5,
    fontWeight: '700'
  },
  errorContainer: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.danger
  },
  errorDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)'
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  qrTicketCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8
  },
  qrTicketHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  qrTicketIdText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.4
  },
  qrTicketPstText: {
    flexShrink: 0,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  qrMatrixBody: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  qrMatrixCenter: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  qrTicketFooter: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  gpsLockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    flexShrink: 1
  },
  gpsPillReady: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  gpsPillOffline: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A'
  },
  gpsPillAcquiring: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1'
  },
  gpsLockedPillText: {
    fontSize: 10.5,
    fontWeight: '800'
  },
  timerInlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0
  },
  timerInlineText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569'
  },
  timerInlineCount: {
    fontWeight: '900',
    color: '#B45309',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  progressBarTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B'
  },
  badgeCard: {
    width: '100%',
    backgroundColor: 'rgba(18, 40, 36, 0.85)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden'
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  badgeLeftFlex: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  badgeLeftShrink: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9
  },
  badgeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(128, 203, 196, 0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeTextCol: {
    flex: 1,
    minWidth: 0
  },
  badgeTitleInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  badgeLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1
  },
  badgeSublabel: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1
  },
  boundChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8
  },
  boundChipText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#34D399'
  },
  rebindBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 180, 51, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 11
  },
  rebindBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFB433'
  },
  badgeValueFlex: {
    flex: 1,
    minWidth: 0,
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '700',
    textAlign: 'right'
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981'
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 11
  },
  scanNoticeCard: {
    width: '100%',
    padding: 13,
    borderRadius: 16,
    marginBottom: 12
  },
  scanNoticeSuccess: {
    backgroundColor: '#059669'
  },
  scanNoticeError: {
    backgroundColor: '#DC2626'
  },
  scanNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  scanNoticeTextGroup: {
    flex: 1
  },
  scanNoticeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4
  },
  scanNoticeMessage: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.94)',
    marginTop: 2
  },
  scanNoticeCloseBtn: {
    padding: 4
  },
  shiftStatusContainer: {
    width: '100%',
    marginBottom: 14
  },
  shiftStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1
  },
  shiftCardSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.32)'
  },
  shiftCardActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.38)'
  },
  shiftCardAwaiting: {
    backgroundColor: 'rgba(255, 180, 51, 0.12)',
    borderColor: 'rgba(255, 180, 51, 0.32)'
  },
  livePulseDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981'
  },
  shiftStatusTexts: {
    flex: 1,
    minWidth: 0
  },
  shiftStatusLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  textSuccess: {
    color: '#34D399'
  },
  textWarning: {
    color: '#FFB433'
  },
  shiftStatusDesc: {
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 2
  },
  shiftActionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0
  },
  shiftActionPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4
  },
  gpsLockingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    width: '100%'
  },
  gpsStateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  gpsLockingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
    textAlign: 'center'
  },
  gpsLockingSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 270
  },
  gpsOpenSettingsBtn: {
    marginTop: 14,
    backgroundColor: '#FFB433',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  gpsOpenSettingsBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#193631'
  }
});
