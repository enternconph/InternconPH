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
  Lock
} from 'lucide-react-native';
import api from '../api/client';
import { colors } from '../utils/theme';
import {
  getOrCreateDeviceToken,
  getDeviceName,
  buildDynamicQrPayload
} from '../utils/totpHelper';

const { width } = Dimensions.get('window');
const ROTATION_INTERVAL = 20; // 20-second TOTP rotation

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

  // Moving watermark animation
  const watermarkAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  // Initialize Credentials & Register Device
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    async function initCredentials() {
      setLoading(true);
      setErrorMessage('');
      try {
        const devToken = await getOrCreateDeviceToken();
        const devName = getDeviceName();
        if (isMounted) setDeviceToken(devToken);

        // Fetch credentials from deployed server
        const res = await api.get('/student/attendance/credentials');
        if (!res.success || !res.data) {
          throw new Error(res.message || 'Unable to retrieve cryptographic credentials.');
        }

        const { studentId: sId, studentName: sName, qrSecret: secret, deviceBound: isBound } = res.data;
        if (isMounted) {
          setStudentId(sId);
          setStudentName(sName || 'OJT Student');
          setQrSecret(secret);
          setDeviceBound(!!isBound);
        }

        // If device is not yet registered, auto-bind device
        if (!isBound && devToken) {
          try {
            await api.post('/student/attendance/device', {
              device_hardware_token: devToken,
              device_name: devName
            });
            if (isMounted) setDeviceBound(true);
          } catch (bindErr) {
            console.warn('Device auto-binding notice:', bindErr);
          }
        }

        // Generate initial payload
        const initialPayload = await buildDynamicQrPayload(secret, sId, devToken);
        if (isMounted) {
          setQrPayload(initialPayload);
          setLoading(false);
          startCountdown();
        }
      } catch (err) {
        console.error('Error initializing QR credentials:', err);
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to initialize attendance credentials.');
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
      // Update PST watermark
      const now = new Date();
      const pstStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour12: false,
        hour: '2-digit',
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
              {/* Security Shield Banner */}
              <View style={styles.securityBanner}>
                <Lock size={14} color={colors.infoText} />
                <Text style={styles.securityBannerText}>
                  Valid for 20s. Screenshots expire automatically.
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
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
    fontWeight: '700',
    color: colors.text
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceLow
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
  }
});
