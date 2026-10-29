import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Animated,
  AppState,
  PermissionsAndroid,
  Platform
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  ShieldAlert,
  RotateCw,
  X,
  Smartphone,
  Clock,
  Sparkles,
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
  resetLocalDeviceToken,
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

export default function AttendanceQrModal({ visible, onClose }) {
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

  // Device Mismatch & 6-Digit Gmail OTP State
  const [deviceMismatchData, setDeviceMismatchData] = useState(null);
  const [otpStep, setOtpStep] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'verifying'
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpCountdownSec, setOtpCountdownSec] = useState(0);
  const [devOtpPreview, setDevOtpPreview] = useState(null);

  const watermarkAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  const prevLogRef = useRef(null);
  const gpsCoordsRef = useRef(null);

  // Request Android high-accuracy GPS location if available
  useEffect(() => {
    if (!visible) return;
    let watchId = null;

    async function startLocationTracking() {
      try {
        if (Platform.OS === 'android' && PermissionsAndroid?.request) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          ).catch(() => {});
        }
        const geo =
          (typeof navigator !== 'undefined' && navigator.geolocation) ||
          global.navigator?.geolocation;

        if (geo) {
          const updateCoords = (pos) => {
            const loc = {
              lat: Number(pos.coords.latitude.toFixed(6)),
              lng: Number(pos.coords.longitude.toFixed(6)),
              acc: Math.round(pos.coords.accuracy || 0),
              ts: Math.floor(pos.timestamp ? pos.timestamp / 1000 : Date.now() / 1000)
            };
            gpsCoordsRef.current = loc;
            setGpsCoords(loc);
          };

          if (typeof geo.getCurrentPosition === 'function') {
            geo.getCurrentPosition(updateCoords, () => {}, {
              enableHighAccuracy: true,
              maximumAge: 0, // Fresh fix only - reject cached stale location
              timeout: 10000
            });
          }

          if (typeof geo.watchPosition === 'function') {
            watchId = geo.watchPosition(updateCoords, () => {}, {
              enableHighAccuracy: true,
              maximumAge: 0, // Fresh continuous satellite fixes
              timeout: 10000
            });
          }
        }
      } catch (_) {}
    }

    startLocationTracking();

    return () => {
      try {
        const geo = global.navigator?.geolocation;
        if (watchId !== null && geo && typeof geo.clearWatch === 'function') {
          geo.clearWatch(watchId);
        }
      } catch (_) {}
    };
  }, [visible]);

  // OTP countdown timer (5 minutes = 300s)
  useEffect(() => {
    if (otpCountdownSec <= 0) return;
    const id = setInterval(() => {
      setOtpCountdownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [otpCountdownSec]);

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
                masked_email: res.data.masked_email || 'denmarkcatolico2@gmail.com'
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

          const initialPayload = await buildDynamicQrPayload(secret, sId, activeDevToken, {
            mode: 'online',
            location: gpsCoordsRef.current
          });

          if (isMounted) {
            setQrPayload(initialPayload);
            setLoading(false);
            startCountdown(secret, sId, activeDevToken, 'online');
          }
        }
      } catch (err) {
        console.warn('Online credentials fetch failed, checking offline vault:', err);
        const offlineVault = await loadOfflineCredentials(devToken);

        if (offlineVault && !offlineVault.expired && !offlineVault.deviceMismatch && offlineVault.cached) {
          const c = offlineVault.cached;
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
            location: gpsCoordsRef.current
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

    Animated.loop(
      Animated.sequence([
        Animated.timing(watermarkAnim, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true
        }),
        Animated.timing(watermarkAnim, {
          toValue: 0,
          duration: 3500,
          useNativeDriver: true
        })
      ])
    ).start();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        setQrPayload('');
      } else if (nextAppState === 'active' && qrSecret && studentId && deviceToken) {
        regenerateQr(qrSecret, studentId, deviceToken, isOffline ? 'offline' : 'online');
      }
    });

    return () => {
      isMounted = false;
      clearInterval(timerRef.current);
      subscription.remove();
    };
  }, [visible]);

  // Live attendance polling while QR modal is visible
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

  const startCountdown = (secretArg, sIdArg, devTokenArg, modeArg = 'online') => {
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
        regenerateQr(secretArg, sIdArg, devTokenArg, modeArg);
      }
    }, 1000);
  };

  const regenerateQr = async (
    sec = qrSecret,
    sId = studentId,
    dTok = deviceToken,
    mode = isOffline ? 'offline' : 'online'
  ) => {
    if (!sec || !sId || !dTok) return;
    try {
      const freshPayload = await buildDynamicQrPayload(sec, sId, dTok, {
        mode,
        location: gpsCoordsRef.current
      });
      setQrPayload(freshPayload);
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: ROTATION_INTERVAL * 1000,
        useNativeDriver: false
      }).start();
    } catch (e) {
      console.warn('QR regeneration error:', e);
    }
  };

  // Request 6-digit Gmail OTP to denmarkcatolico2@gmail.com
  const handleRequestDeviceOtp = async (rotateToken = false) => {
    setOtpStep('sending');
    setOtpError('');
    try {
      const targetToken = rotateToken
        ? await resetLocalDeviceToken()
        : deviceToken || (await getOrCreateDeviceToken());
      setDeviceToken(targetToken);
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
        if (!deviceMismatchData) {
          setQrSecret(null);
          setQrPayload('');
          setDeviceMismatchData({
            status: 'device_mismatch',
            requires_otp: true,
            registered_device_name: devName,
            current_device_name: devName,
            masked_email: res.data?.masked_email || 'denmarkcatolico2@gmail.com',
            message: 'Enter the 6-digit OTP sent to denmarkcatolico2@gmail.com to bind your new device key.'
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

  // Verify 6-digit Gmail OTP and bind this Android phone
  const handleVerifyDeviceOtp = async () => {
    const cleaned = String(otpCode).trim();
    if (!/^\d{6}$/.test(cleaned)) {
      setOtpError('Please enter the 6-digit numeric OTP sent to denmarkcatolico2@gmail.com.');
      return;
    }

    setOtpStep('verifying');
    setOtpError('');

    try {
      const devName = getDeviceName();
      const res = await api.post('/student/attendance/verify-device-otp', {
        otp_code: cleaned,
        device_id: deviceToken,
        device_token: deviceToken,
        device_label: devName
      });

      if (res.success && res.data) {
        const secret = res.data.qrSecret || res.data.totp_secret;
        const sId = res.data.studentId || res.data.student_id;
        const sName = res.data.studentName || res.data.full_name || 'OJT Student';
        const activeDevToken = res.data.device_id || res.data.deviceToken || deviceToken;

        await saveOfflineCredentials({
          studentId: sId,
          studentName: sName,
          qrSecret: secret,
          deviceToken: activeDevToken,
          secret_expires_at: res.data.secret_expires_at,
          workplaceGeofence: res.data.workplaceGeofence
        });

        setDeviceMismatchData(null);
        setOtpStep('idle');
        setOtpCode('');
        setDeviceToken(activeDevToken);
        setStudentId(sId);
        setStudentName(sName);
        setQrSecret(secret);
        setDeviceBound(true);
        setIsOffline(false);

        const initialPayload = await buildDynamicQrPayload(secret, sId, activeDevToken, {
          mode: 'online',
          location: gpsCoordsRef.current
        });
        setQrPayload(initialPayload);
        startCountdown(secret, sId, activeDevToken, 'online');

        setScanNotice({
          type: 'success',
          title: 'NEW DEVICE BOUND!',
          message: `This phone (${devName}) is now bound to your account and your old device was unbound.`
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

  const watermarkTranslateY = watermarkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 30]
  });

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

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Sparkles size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Dynamic Attendance QR</Text>
                <Text style={styles.headerSubtitle}>30s Rolling TOTP • Device-Bound</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Verifying hardware device binding...</Text>
            </View>
          ) : deviceMismatchData ? (
            /* 6-DIGIT GMAIL OTP RE-BINDING FLOW */
            <View style={styles.otpContainer}>
              <View style={styles.otpHeaderRow}>
                <ShieldAlert size={28} color="#FFB433" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.otpBadge}>ATTENDANCE BLOCKED • UNBOUND PHONE</Text>
                  <Text style={styles.otpTitle}>6-Digit Gmail OTP Required</Text>
                </View>
              </View>

              <Text style={styles.otpDesc}>
                {deviceMismatchData.message ||
                  'Your attendance account is locked to another device. Verify via 6-digit OTP sent to denmarkcatolico2@gmail.com to bind this phone and unbind the old one.'}
              </Text>

              <View style={styles.deviceCompareBox}>
                <View style={styles.deviceCompareRow}>
                  <Text style={styles.deviceCompareLabel}>Bound Phone:</Text>
                  <Text style={styles.deviceCompareVal} numberOfLines={1}>
                    {deviceMismatchData.registered_device_name || 'Previous Android Phone'}
                  </Text>
                </View>
                <View style={styles.deviceCompareRow}>
                  <Text style={styles.deviceCompareLabel}>This Phone:</Text>
                  <Text style={[styles.deviceCompareVal, { color: '#FFB433' }]} numberOfLines={1}>
                    {deviceMismatchData.current_device_name || getDeviceName()}
                  </Text>
                </View>
                <View style={styles.deviceCompareRow}>
                  <Text style={styles.deviceCompareLabel}>OTP Recipient:</Text>
                  <Text style={styles.deviceCompareVal}>
                    {deviceMismatchData.masked_email || 'denmarkcatolico2@gmail.com'}
                  </Text>
                </View>
              </View>

              {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}

              {otpStep === 'idle' || otpStep === 'sending' ? (
                <TouchableOpacity
                  onPress={() => handleRequestDeviceOtp(false)}
                  disabled={otpStep === 'sending'}
                  style={styles.otpPrimaryBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.otpPrimaryBtnText}>
                    {otpStep === 'sending'
                      ? 'Sending 6-Digit OTP...'
                      : 'Send 6-Digit OTP to denmarkcatolico2@gmail.com'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: '100%', gap: 10 }}>
                  <Text style={styles.otpTimerLabel}>
                    OTP sent to denmarkcatolico2@gmail.com • Expires in{' '}
                    {Math.floor(otpCountdownSec / 60)}:
                    {String(otpCountdownSec % 60).padStart(2, '0')}
                  </Text>

                  {devOtpPreview ? (
                    <View style={{ backgroundColor: 'rgba(255, 180, 51, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 180, 51, 0.4)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#FFB433', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Verification Code (Auto-Detected)
                      </Text>
                      <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: 6, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 4 }}>
                        {devOtpPreview}
                      </Text>
                    </View>
                  ) : null}

                  <TextInput
                    value={otpCode}
                    onChangeText={(txt) => setOtpCode(txt.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="number-pad"
                    maxLength={6}
                    style={styles.otpInput}
                  />

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleRequestDeviceOtp(false)}
                      disabled={otpStep === 'verifying'}
                      style={styles.otpSecondaryBtn}
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
                    >
                      <Text style={styles.otpPrimaryBtnText}>
                        {otpStep === 'verifying' ? 'Verifying...' : 'Verify OTP & Bind Phone'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : errorMessage ? (
            <View style={styles.errorContainer}>
              <ShieldAlert size={48} color={colors.danger} />
              <Text style={styles.errorTitle}>Attendance Security Notice</Text>
              <Text style={styles.errorDesc}>{errorMessage}</Text>
              <TouchableOpacity onPress={onClose} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.body}>
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
                    <TouchableOpacity onPress={() => setScanNotice(null)} style={styles.scanNoticeCloseBtn}>
                      <X size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Today's Shift Live Status Indicator */}
              <View style={styles.shiftStatusContainer}>
                {todayLog?.time_out ? (
                  <View style={[styles.shiftStatusCard, styles.shiftCardSuccess]}>
                    <CheckCircle2 size={16} color="#059669" />
                    <View style={styles.shiftStatusTexts}>
                      <Text style={[styles.shiftStatusLabel, styles.textSuccess]}>
                        TODAY'S SHIFT COMPLETED
                      </Text>
                      <Text style={styles.shiftStatusDesc}>
                        In: {formatTime12(todayLog.time_in)} • Out: {formatTime12(todayLog.time_out)} ({todayLog.hours_rendered || 0} hrs credited)
                      </Text>
                    </View>
                  </View>
                ) : todayLog?.time_in ? (
                  <View style={[styles.shiftStatusCard, styles.shiftCardActive]}>
                    <View style={styles.livePulseDot} />
                    <View style={styles.shiftStatusTexts}>
                      <Text style={[styles.shiftStatusLabel, styles.textSuccess]}>
                        CURRENTLY TIMED-IN (ON DUTY)
                      </Text>
                      <Text style={styles.shiftStatusDesc}>
                        Clocked in at {formatTime12(todayLog.time_in)} ({todayLog.time_in_status === 'late' ? 'Late' : 'On-Time'}) • Scan to Clock-Out
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.shiftStatusCard, styles.shiftCardAwaiting]}>
                    <Clock size={16} color="#d97706" />
                    <View style={styles.shiftStatusTexts}>
                      <Text style={[styles.shiftStatusLabel, styles.textWarning]}>AWAITING TIME-IN</Text>
                      <Text style={styles.shiftStatusDesc}>
                        Present this dynamic QR to HR scanner at premises to Clock-In
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Security & Geofence Banner */}
              <View style={[styles.securityBanner, isOffline && styles.offlineBanner]}>
                <Lock size={14} color={isOffline ? colors.warningText : colors.infoText} />
                <Text style={[styles.securityBannerText, isOffline && styles.offlineBannerText]}>
                  {isOffline
                    ? 'Offline Mode • Device-Bound Secret Active'
                    : liveDistanceMeters !== null
                    ? liveDistanceMeters <= (workplaceGeofence?.radius_meters || 100)
                      ? `Online GPS • Within workplace (${Math.round(liveDistanceMeters)}m / ${workplaceGeofence?.radius_meters || 100}m)`
                      : `Online GPS • Outside workplace (${Math.round(liveDistanceMeters)}m away; max ${workplaceGeofence?.radius_meters || 100}m)`
                    : 'Online Synced • 30s Rolling TOTP + Single-Use Nonce'}
                </Text>
              </View>

              {/* QR Container Clean (Watermark outside QR matrix) */}
              <View style={styles.qrWrapper}>
                <View style={styles.qrHeaderBar}>
                  <Text style={styles.qrHeaderBarText}>
                    INTERN #{studentId} • {isOffline ? 'OFFLINE' : 'ONLINE GPS'}
                  </Text>
                  <Text style={styles.qrHeaderBarPst}>
                    {watermarkPst || 'PST UTC+8'}
                  </Text>
                </View>

                <View style={styles.qrBox}>
                  {qrPayload ? (
                    <QRCode
                      value={qrPayload}
                      size={200}
                      color="#000000"
                      backgroundColor="#ffffff"
                    />
                  ) : (
                    <ActivityIndicator size="small" color={colors.primary} />
                  )}
                </View>

                <View style={styles.timerRow}>
                  <RotateCw size={14} color={colors.primary} />
                  <Text style={styles.timerText}>
                    Refreshes in <Text style={styles.timerCountdown}>{secondsRemaining}s</Text>
                  </Text>
                </View>

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

              {/* Student and Device Security Badges */}
              <View style={styles.badgeCard}>
                <View style={styles.badgeRow}>
                  <View style={styles.badgeLeft}>
                    <Smartphone size={16} color={colors.textSecondary} />
                    <Text style={styles.badgeLabel}>Device Hardware Lock</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRequestDeviceOtp(true)}
                    style={styles.statusPill}
                  >
                    <View style={styles.statusDot} />
                    <Text style={styles.statusPillText}>
                      {deviceBound ? 'Bound • Re-bind via OTP' : 'Device Active'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                <View style={styles.badgeRow}>
                  <View style={styles.badgeLeft}>
                    <MapPin size={16} color={colors.textSecondary} />
                    <Text style={styles.badgeLabel}>GPS Telemetry</Text>
                  </View>
                  <Text style={styles.badgeValue}>
                    {gpsCoords ? `Locked (±${gpsCoords.acc}m)` : isOffline ? 'Offline Vault' : 'Acquiring GPS...'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#122824',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#80CBC4',
    fontWeight: '600'
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 14
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary
  },
  otpContainer: {
    paddingTop: 16,
    gap: 12
  },
  otpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  otpBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FCA5A5',
    letterSpacing: 0.6
  },
  otpTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  otpDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.78)',
    lineHeight: 17
  },
  deviceCompareBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6
  },
  deviceCompareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  deviceCompareLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600'
  },
  deviceCompareVal: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    maxWidth: 190
  },
  otpErrorText: {
    fontSize: 11,
    color: '#FCA5A5',
    fontWeight: '700',
    textAlign: 'center'
  },
  otpTimerLabel: {
    fontSize: 11,
    color: '#80CBC4',
    fontWeight: '700',
    textAlign: 'center'
  },
  otpInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1.5,
    borderColor: '#FFB433',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 8
  },
  otpPrimaryBtn: {
    backgroundColor: '#FFB433',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  otpPrimaryBtnText: {
    color: '#193631',
    fontSize: 12,
    fontWeight: '900'
  },
  otpSecondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  otpSecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  errorContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 12
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.danger
  },
  errorDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.surfaceLow,
    borderRadius: 12
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text
  },
  body: {
    paddingTop: 16,
    alignItems: 'center'
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.infoBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    marginBottom: 16
  },
  securityBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.infoText
  },
  offlineBanner: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder
  },
  offlineBannerText: {
    color: colors.warningText
  },
  qrWrapper: {
    alignItems: 'center',
    width: '100%'
  },
  qrBox: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  qrHeaderBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4
  },
  qrHeaderBarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5
  },
  qrHeaderBarPst: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  watermarkOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.16
  },
  watermarkText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 2
  },
  watermarkSubtext: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14
  },
  timerText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  timerCountdown: {
    fontWeight: '800',
    color: colors.primary
  },
  progressBarTrack: {
    width: '75%',
    height: 4,
    backgroundColor: colors.surfaceLow,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary
  },
  badgeCard: {
    width: '100%',
    backgroundColor: colors.surfaceLow,
    borderRadius: 16,
    padding: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.border
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  badgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text
  },
  badgeValue: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.successBorder
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.successText
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10
  },
  scanNoticeCard: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12
  },
  scanNoticeSuccess: {
    backgroundColor: '#059669'
  },
  scanNoticeError: {
    backgroundColor: '#dc2626'
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
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5
  },
  scanNoticeMessage: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 2
  },
  scanNoticeCloseBtn: {
    padding: 4
  },
  shiftStatusContainer: {
    width: '100%',
    marginBottom: 12
  },
  shiftStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1
  },
  shiftCardSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  shiftCardActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.35)'
  },
  shiftCardAwaiting: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)'
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981'
  },
  shiftStatusTexts: {
    flex: 1
  },
  shiftStatusLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  textSuccess: {
    color: '#10b981'
  },
  textWarning: {
    color: '#f59e0b'
  },
  shiftStatusDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 1
  }
});
