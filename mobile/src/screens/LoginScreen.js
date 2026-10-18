import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView
} from 'react-native';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  QrCode
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../utils/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
            <View style={styles.logoBadge}>
              <GraduationCap size={36} color={colors.primary} />
            </View>
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

          {/* Form */}
          <View style={styles.card}>
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Student Email Address</Text>
              <View style={styles.inputContainer}>
                <Mail size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. student@institution.edu.ph"
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
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <QrCode size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Sign In & Open Attendance QR</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Live System Indicator */}
            <View style={styles.liveServerBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveServerText}>Connected to live internconph.onrender.com</Text>
            </View>
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
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
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
  }
});
