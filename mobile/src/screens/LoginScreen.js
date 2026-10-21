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
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Server,
  Settings,
  Check,
  RotateCcw,
  Sparkles,
  Info
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

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (!result.success) {
        setErrorMsg(result.message || 'Login failed. Please verify credentials.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Ambient Glow */}
      <View style={styles.ambientGlowContainer} pointerEvents="none">
        <View style={styles.glowBlobTeal} />
        <View style={styles.glowBlobAmber} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand & Server Header */}
          <View style={styles.topHeader}>
            <View style={styles.brandRow}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.brandText}>
                Interncon<Text style={styles.brandAccent}>PH</Text>
              </Text>
            </View>

            <View style={styles.headerRight}>
              {/* Active Network Pill */}
              <View style={styles.statusPill}>
                <View style={styles.activeDot} />
                <Text style={styles.statusPillText}>Active</Text>
              </View>

              {/* Server Switcher Button */}
              <TouchableOpacity
                onPress={() => setShowServerModal(true)}
                style={styles.serverGearBtn}
                activeOpacity={0.7}
              >
                <Settings size={16} color="#80CBC4" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Welcome Title */}
          <View style={styles.titleSection}>
            <View style={styles.welcomeRow}>
              <Text style={styles.titleText}>Welcome Back</Text>
              <View style={styles.infoBadge}>
                <Info size={12} color="#80CBC4" />
              </View>
            </View>
            <Text style={styles.subtitleText}>Sign in to your Philippine OJT mobile portal</Text>
          </View>

          {/* Frosted Glass Login Card */}
          <View style={styles.glassCard}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#FCA5A5" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Institutional Email</Text>
              <View style={styles.inputWrapper}>
                <Mail size={16} color="#80CBC4" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="name@university.edu.ph"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <Text style={styles.inputLabel}>Password</Text>
                <Text style={styles.forgotText}>Self-Service Recovery</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Lock size={16} color="#80CBC4" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { paddingRight: 40 }]}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={16} color="#80CBC4" />
                  ) : (
                    <Eye size={16} color="#80CBC4" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={styles.loginBtn}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#193631" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In to Portal</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Compliance & Regulation Footer */}
          <View style={styles.footer}>
            <View style={styles.chedBadge}>
              <ShieldCheck size={14} color="#10B981" />
              <Text style={styles.chedText}>CHED CMO 104 & RA 10173 Compliant</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Server Config Modal */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Server size={18} color="#FFB433" />
              <Text style={styles.modalTitle}>Backend Server Configuration</Text>
            </View>

            <Text style={styles.modalStatusText}>
              Current Status: <Text style={styles.modalStatusBold}>{serverStatus}</Text>
            </Text>

            <TextInput
              style={styles.modalInput}
              value={customUrlInput}
              onChangeText={setCustomUrlInput}
              placeholder="https://internconph.onrender.com"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={handleResetServerUrl}
                style={styles.modalResetBtn}
              >
                <RotateCcw size={14} color="#FFFFFF" />
                <Text style={styles.modalBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleApplyServerUrl(customUrlInput)}
                style={styles.modalSaveBtn}
              >
                <Check size={14} color="#193631" />
                <Text style={styles.modalSaveBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#193631'
  },
  ambientGlowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden'
  },
  glowBlobTeal: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(38, 166, 154, 0.15)'
  },
  glowBlobAmber: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 180, 51, 0.08)'
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 28
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  logo: {
    width: 32,
    height: 32
  },
  brandText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3
  },
  brandAccent: {
    color: '#80CBC4'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981'
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#80CBC4'
  },
  serverGearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  titleSection: {
    marginBottom: 24
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  titleText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5
  },
  infoBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(128, 203, 196, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  subtitleText: {
    fontSize: 13,
    color: '#80CBC4',
    marginTop: 4,
    fontWeight: '500'
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
    gap: 18
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)'
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#FCA5A5',
    fontWeight: '600'
  },
  inputGroup: {
    gap: 6
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)'
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  forgotText: {
    fontSize: 11,
    color: '#80CBC4',
    fontWeight: '600'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    height: 52
  },
  inputIcon: {
    marginRight: 8
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  eyeBtn: {
    padding: 6
  },
  loginBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFB433',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#FFB433',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#193631',
    letterSpacing: 0.2
  },
  footer: {
    alignItems: 'center',
    marginTop: 24
  },
  chedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  chedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#80CBC4'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#122824',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 14
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  modalStatusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)'
  },
  modalStatusBold: {
    color: '#80CBC4',
    fontWeight: '700'
  },
  modalInput: {
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 12
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 6
  },
  modalResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFB433'
  },
  modalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  modalSaveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#193631'
  }
});
