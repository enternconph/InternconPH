import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Modal
} from 'react-native';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  QrCode,
  Server,
  Settings,
  Check,
  RotateCcw,
  Sparkles,
  UserCheck
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../utils/theme';
import api, { DEFAULT_API_BASE_URL } from '../api/client';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Server Switcher State
  const [currentServerUrl, setCurrentServerUrl] = useState(DEFAULT_API_BASE_URL);
  const [showServerModal, setShowServerModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [serverStatus, setServerStatus] = useState('Checking...');

  useEffect(() => {
    async function initServerUrl() {
      const url = await api.getBaseUrl();
      setCurrentServerUrl(url);
      setCustomUrlInput(url);
      testServerHealth(url);
    }
    initServerUrl();
  }, []);

  const testServerHealth = async (targetUrl) => {
    setTestingConnection(true);
    setServerStatus('Pinging server...');
    try {
      const pingUrl = targetUrl.startsWith('http')
        ? `${targetUrl.replace(/\/+$/, '')}/health`
        : `${targetUrl}/health`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(pingUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        setServerStatus('Online & Connected');
      } else {
        setServerStatus(`HTTP ${res.status} (Waking up)`);
      }
    } catch (e) {
      setServerStatus('Standby / Cold Start (~30s)');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleApplyServerUrl = async (url) => {
    const saved = await api.setBaseUrl(url);
    setCurrentServerUrl(saved);
    setShowServerModal(false);
    testServerHealth(saved);
  };

  const handleResetServerUrl = async () => {
    const saved = await api.resetBaseUrl();
    setCurrentServerUrl(saved);
    setCustomUrlInput(saved);
    setShowServerModal(false);
    testServerHealth(saved);
  };

  const handleFillDemo = (demoEmail, demoPass = 'Password123!') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your student email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await login(email.trim(), password);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Header */}
          <View style={styles.brandHeader}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>InternConPH</Text>
            <View style={styles.roleTag}>
              <ShieldCheck size={14} color={colors.primaryDark} />
              <Text style={styles.roleTagText}>Active OJT Student Portal</Text>
            </View>
            <Text style={styles.brandSubtitle}>
              Sign in with your student credentials to access your live attendance QR code, daily time records, and internship modules.
            </Text>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color={colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Quick Demo Credentials Bar */}
          <View style={styles.demoBar}>
            <View style={styles.demoHeaderRow}>
              <Sparkles size={13} color={colors.primary} />
              <Text style={styles.demoTitle}>One-Tap Demo Student Accounts</Text>
            </View>
            <View style={styles.demoChipsRow}>
              <TouchableOpacity
                onPress={() => handleFillDemo('jomberrojas@gmail.com')}
                style={[styles.demoChip, email === 'jomberrojas@gmail.com' && styles.demoChipActive]}
                activeOpacity={0.7}
              >
                <UserCheck size={12} color={email === 'jomberrojas@gmail.com' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.demoChipText, email === 'jomberrojas@gmail.com' && styles.demoChipTextActive]}>
                  Jomber Rojas (Active OJT)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleFillDemo('student@gmail.com')}
                style={[styles.demoChip, email === 'student@gmail.com' && styles.demoChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.demoChipText, email === 'student@gmail.com' && styles.demoChipTextActive]}>
                  Candidate Student
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleFillDemo('denmarkcatolico2@gmail.com')}
                style={[styles.demoChip, email === 'denmarkcatolico2@gmail.com' && styles.demoChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.demoChipText, email === 'denmarkcatolico2@gmail.com' && styles.demoChipTextActive]}>
                  Denmark Catolico (Completed)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <View style={styles.card}>
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Student Email Address</Text>
              <View style={styles.inputContainer}>
                <Mail size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. jomberrojas@gmail.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={colors.textSecondary} />
                  ) : (
                    <Eye size={18} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.loadingBtnRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.submitBtnText}>Authenticating...</Text>
                </View>
              ) : (
                <>
                  <QrCode size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Sign In & Open Attendance QR</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Live System Indicator with Server Switcher Button */}
            <TouchableOpacity
              onPress={() => setShowServerModal(true)}
              style={styles.liveServerBadge}
              activeOpacity={0.7}
            >
              <View style={[
                styles.pulseDot,
                serverStatus.includes('Online') ? styles.pulseDotOnline : styles.pulseDotWarning
              ]} />
              <Text style={styles.liveServerText} numberOfLines={1}>
                Server: {currentServerUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '')} ({serverStatus})
              </Text>
              <Settings size={13} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Strictly Student Notice */}
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>Student-Only Mobile Application</Text>
            <Text style={styles.noticeText}>
              This mobile application is exclusively engineered for enrolled students undergoing On-the-Job Training. Institutional Coordinators, Workplace Mentors, and Hiring Organizations must access their administrative dashboards using the web platform.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Server Environment Configuration Modal */}
      <Modal
        visible={showServerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.serverModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <Server size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>Backend Server Settings</Text>
              </View>
              <TouchableOpacity onPress={() => setShowServerModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Select or customize the API target URL for local testing or live production:
            </Text>

            {/* Preset Options */}
            <TouchableOpacity
              onPress={() => handleApplyServerUrl(DEFAULT_API_BASE_URL)}
              style={[
                styles.serverPresetBtn,
                currentServerUrl === DEFAULT_API_BASE_URL && styles.serverPresetBtnActive
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.presetTextGroup}>
                <Text style={styles.presetTitle}>Live Cloud (Render)</Text>
                <Text style={styles.presetUrl}>{DEFAULT_API_BASE_URL}</Text>
              </View>
              {currentServerUrl === DEFAULT_API_BASE_URL && (
                <Check size={18} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleApplyServerUrl('http://10.0.2.2:5000/api')}
              style={[
                styles.serverPresetBtn,
                currentServerUrl === 'http://10.0.2.2:5000/api' && styles.serverPresetBtnActive
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.presetTextGroup}>
                <Text style={styles.presetTitle}>Android Emulator Localhost</Text>
                <Text style={styles.presetUrl}>http://10.0.2.2:5000/api</Text>
              </View>
              {currentServerUrl === 'http://10.0.2.2:5000/api' && (
                <Check size={18} color={colors.primary} />
              )}
            </TouchableOpacity>

            {/* Custom URL Input */}
            <View style={styles.customUrlGroup}>
              <Text style={styles.inputLabel}>Custom API Base URL:</Text>
              <TextInput
                style={styles.customInput}
                value={customUrlInput}
                onChangeText={setCustomUrlInput}
                placeholder="http://192.168.1.X:5000/api"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => handleApplyServerUrl(customUrlInput)}
                style={styles.applyCustomBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.applyCustomBtnText}>Save & Connect to Custom Server</Text>
              </TouchableOpacity>
            </View>

            {/* Reset to Default */}
            <TouchableOpacity
              onPress={handleResetServerUrl}
              style={styles.resetServerBtn}
              activeOpacity={0.7}
            >
              <RotateCcw size={14} color={colors.textSecondary} />
              <Text style={styles.resetServerText}>Reset to Live Render Production</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center'
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24
  },
  logoImage: {
    width: 84,
    height: 84,
    borderRadius: 22,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: -0.5
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginTop: 8,
    marginBottom: 8
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark
  },
  brandSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    width: '100%',
    maxWidth: 380
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.dangerText,
    fontWeight: '500'
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3
  },
  inputGroup: {
    marginBottom: 18
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12
  },
  inputIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.text
  },
  eyeBtn: {
    padding: 6
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  submitBtnDisabled: {
    opacity: 0.6
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  },
  liveServerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success
  },
  liveServerText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  noticeBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surfaceLow,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  noticeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  noticeText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16
  },
  demoBar: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  demoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  demoChipsRow: {
    flexDirection: 'column',
    gap: 6
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  demoChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder
  },
  demoChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary
  },
  demoChipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700'
  },
  loadingBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  pulseDotOnline: {
    backgroundColor: colors.success
  },
  pulseDotWarning: {
    backgroundColor: colors.warning
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end'
  },
  serverModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy
  },
  modalCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceLow
  },
  modalCloseText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  modalDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18
  },
  serverPresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLow,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10
  },
  serverPresetBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight
  },
  presetTextGroup: {
    flex: 1
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 2
  },
  presetUrl: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  customUrlGroup: {
    marginTop: 8,
    marginBottom: 14
  },
  customInput: {
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8
  },
  applyCustomBtn: {
    backgroundColor: colors.navy,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  applyCustomBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  resetServerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10
  },
  resetServerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary
  }
});
