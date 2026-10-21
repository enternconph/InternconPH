import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  AppState
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
  Check
} from 'lucide-react-native';
import api from '../api/client';
import { colors } from '../utils/theme';
import { formatTime12 } from '../utils/timeUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getOrCreateDeviceToken,
  getDeviceName,
  buildDynamicQrPayload
} from '../utils/totpHelper';

const { width } = Dimensions.get('window');
const ROTATION_INTERVAL = 20; // 20-second TOTP rotation
const DEVICE_STORAGE_KEY = '@internconph_attendance_device_token';
const CREDS_CACHE_KEY = '@internconph_qr_credentials';

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

  // Moving watermark animation
  const watermarkAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  const prevLogRef = useRef(null);

  // Initialize Credentials & Register Device (with full offline support)
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    async function initCredentials() {
      setLoading(true);
      setErrorMessage('');

      // 1. Check local cache first for instant offline availability
      let hasCached = false;
      try {
        const cachedRaw = await AsyncStorage.getItem(CREDS_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.qrSecret && cached.studentId && cached.deviceToken) {
            hasCached = true;
            if (isMounted) {
              setDeviceToken(cached.deviceToken);
              setStudentId(cached.studentId);
              setStudentName(cached.studentName || 'OJT Student');
              setQrSecret(cached.qrSecret);
              setDeviceBound(true);
              setIsOffline(true);
            }
            const cachedPayload = await buildDynamicQrPayload(cached.qrSecret, cached.studentId, cached.deviceToken);
            if (isMounted) {
              setQrPayload(cachedPayload);
              setLoading(false);
              startCountdown();
            }
          }
        }
      } catch (cacheErr) {
        console.warn('Cache read error:', cacheErr);
      }

      // 2. Fetch/sync fresh credentials from server when online
      try {
        const devToken = await getOrCreateDeviceToken();
        const devName = getDeviceName();

        // Fetch credentials from deployed server with device params
        const res = await api.get(`/student/attendance/credentials?device_token=${encodeURIComponent(devToken)}&device_name=${encodeURIComponent(devName)}`);
        if (res.success && res.data) {
          const {
            studentId: sId,
            studentName: sName,
            qrSecret: secret,
            deviceBound: isBound,
            deviceToken: serverDeviceToken
          } = res.data;

          // Ensure token consistency between server and device
          const activeDevToken = serverDeviceToken || devToken;
          if (serverDeviceToken && serverDeviceToken !== devToken) {
            await AsyncStorage.setItem(DEVICE_STORAGE_KEY, serverDeviceToken);
          }

          // Persist to local cache for offline availability
          await AsyncStorage.setItem(CREDS_CACHE_KEY, JSON.stringify({
            studentId: sId,
            studentName: sName || 'OJT Student',
            qrSecret: secret,
            deviceToken: activeDevToken,
            deviceBound: !!isBound
          }));

          if (isMounted) {
            setDeviceToken(activeDevToken);
            setStudentId(sId);
            setStudentName(sName || 'OJT Student');
            setQrSecret(secret);
            setDeviceBound(!!isBound);
            setIsOffline(false);
            setErrorMessage('');
          }

          // Generate fresh payload with activeDevToken
          const initialPayload = await buildDynamicQrPayload(secret, sId, activeDevToken);
          if (isMounted) {
            setQrPayload(initialPayload);
            setLoading(false);
            startCountdown();
          }
        }
      } catch (err) {
        console.warn('Online credentials fetch failed (offline fallback):', err);
        if (!hasCached && isMounted) {
          setErrorMessage(err.message || 'Please connect online at least once to bind your attendance device.');
          setLoading(false);
        } else if (isMounted) {
          setIsOffline(true);
          setLoading(false);
        }
      }
    }

    initCredentials();

    // Start moving watermark loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(watermarkAnim, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
        }),
        Animated.timing(watermarkAnim, {
          toValue: 0,
          duration: 3500,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Watch AppState (shield QR when app enters background)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/)) {
        // Obscure for privacy/anti-capture
        setQrPayload('');
      } else if (nextAppState === 'active' && qrSecret && studentId && deviceToken) {
        regenerateQr();
      }
    });

    return () => {
      isMounted = false;
      clearInterval(timerRef.current);
      subscription.remove();
    };
  }, [visible]);

  // Live attendance polling while QR modal is visible: instantly shows scan success or failure
  useEffect(() => {
    if (!visible) {
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

          // Transition A: Fresh Time-In logged!
          if (fresh?.time_in && (!prev || !prev.time_in)) {
            setScanNotice({
              type: 'success',
              action: 'time_in',
              title: 'TIME-IN SUCCESSFUL!',
              message: `You clocked in at ${formatTime12(fresh.time_in)} (${fresh.time_in_status === 'late' ? 'Late Arrival' : 'On-Time'}). Have a productive shift!`
            });
            prevLogRef.current = fresh;
            setTodayLog(fresh);
          }
          // Transition B: Fresh Time-Out logged!
          else if (fresh?.time_out && (!prev || !prev.time_out)) {
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
  }, [visible]);

  // Dynamic Refresh Countdown Timer
  const startCountdown = () => {
    clearInterval(timerRef.current);
    setSecondsRemaining(ROTATION_INTERVAL);
    progressAnim.setValue(1);

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: ROTATION_INTERVAL * 1000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(async () => {
      // Update PST watermark in 12-Hour standard
      const now = new Date();
      const pstStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour12: true,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      });
      setWatermarkPst(`${pstStr} PST`);

      setSecondsRemaining(prev => {
        if (prev <= 1) {
          regenerateQr();
          return ROTATION_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const regenerateQr = async () => {
    if (!qrSecret || !studentId || !deviceToken) return;
    try {
      const freshPayload = await buildDynamicQrPayload(qrSecret, studentId, deviceToken);
      setQrPayload(freshPayload);
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: ROTATION_INTERVAL * 1000,
        useNativeDriver: false,
      }).start();
    } catch (e) {
      console.warn('QR regeneration error:', e);
    }
  };

  const watermarkTranslateY = watermarkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 30]
  });

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
                <Text style={styles.headerSubtitle}>Cryptographic TOTP + Device Lock</Text>
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
              <Text style={styles.loadingText}>Connecting to workplace scanner network...</Text>
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
              {/* Real-time Scan Confirmation Notice / Live Alert */}
              {scanNotice && (
                <View style={[styles.scanNoticeCard, scanNotice.type === 'success' ? styles.scanNoticeSuccess : styles.scanNoticeError]}>
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
                      <Text style={[styles.shiftStatusLabel, styles.textSuccess]}>TODAY'S SHIFT COMPLETED</Text>
                      <Text style={styles.shiftStatusDesc}>
                        In: {formatTime12(todayLog.time_in)} • Out: {formatTime12(todayLog.time_out)} ({todayLog.hours_rendered || 0} hrs credited)
                      </Text>
                    </View>
                  </View>
                ) : todayLog?.time_in ? (
                  <View style={[styles.shiftStatusCard, styles.shiftCardActive]}>
                    <View style={styles.livePulseDot} />
                    <View style={styles.shiftStatusTexts}>
                      <Text style={[styles.shiftStatusLabel, styles.textSuccess]}>CURRENTLY TIMED-IN (ON DUTY)</Text>
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

              {/* Security Shield Banner */}
              <View style={[styles.securityBanner, isOffline && styles.offlineBanner]}>
                <Lock size={14} color={isOffline ? colors.warningText : colors.infoText} />
                <Text style={[styles.securityBannerText, isOffline && styles.offlineBannerText]}>
                  {isOffline
                    ? 'Offline Mode • Live TOTP Crypto Active (Valid for 20s)'
                    : 'Online Synced • Valid for 20s (Screenshots expire)'}
                </Text>
              </View>

              {/* QR Container with Moving Watermark */}
              <View style={styles.qrWrapper}>
                <View style={styles.qrBox}>
                  {qrPayload ? (
                    <QRCode
                      value={qrPayload}
                      size={200}
                      color="#0f172a"
                      backgroundColor="#ffffff"
                    />
                  ) : (
                    <ActivityIndicator size="small" color={colors.primary} />
                  )}

                  {/* Anti-Screenshot Moving PST Watermark Overlay */}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.watermarkOverlay,
                      { transform: [{ translateY: watermarkTranslateY }] }
                    ]}
                  >
                    <Text style={styles.watermarkText}>
                      INTERNCON • {watermarkPst || 'PST UTC+8'}
                    </Text>
                    <Text style={styles.watermarkSubtext}>
                      #{studentId} • LIVE TOKEN
                    </Text>
                  </Animated.View>
                </View>

                {/* Rotating Progress Indicator */}
                <View style={styles.timerRow}>
                  <RotateCw size={14} color={colors.primary} />
                  <Text style={styles.timerText}>
                    Refreshes in <Text style={styles.timerCountdown}>{secondsRemaining}s</Text>
                  </Text>
                </View>

                {/* Animated Progress Bar */}
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
                  <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusPillText}>
                      {deviceBound ? 'Protected & Bound' : 'Device Active'}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.badgeRow}>
                  <View style={styles.badgeLeft}>
                    <Clock size={16} color={colors.textSecondary} />
                    <Text style={styles.badgeLabel}>Time Standard</Text>
                  </View>
                  <Text style={styles.badgeValue}>Philippine Standard Time (UTC+8)</Text>
                </View>
              </View>

              <Text style={styles.instructionText}>
                Present this rotating QR to your Workplace Mentor's scanner at your host organization to record official Time-In or Time-Out.
              </Text>
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
  instructionText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 14
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
  shiftStatusTexts: {
    flex: 1
  },
  shiftStatusLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  shiftStatusDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginTop: 1
  },
  textSuccess: {
    color: '#059669'
  },
  textWarning: {
    color: '#d97706'
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981'
  }
});
