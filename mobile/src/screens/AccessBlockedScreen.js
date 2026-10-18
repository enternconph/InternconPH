import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import {
  Clock,
  RefreshCw,
  LogOut,
  AlertTriangle,
  Building2,
  FileCheck
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../utils/theme';

export default function AccessBlockedScreen() {
  const { user, ojtStatus, checkOjtStatus, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    setNotice('');
    try {
      const result = await checkOjtStatus();
      if (!result.active) {
        setNotice('Status checked: Your OJT is still pending placement with your host organization.');
      }
    } catch (e) {
      setNotice('Could not connect to live servers to check status.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Status Icon */}
        <View style={styles.iconCircle}>
          <Clock size={40} color={colors.warning} />
        </View>

        {/* Title */}
        <Text style={styles.title}>OJT Placement Pending</Text>
        
        {/* Status Pill */}
        <View style={styles.statusPill}>
          <AlertTriangle size={14} color={colors.warningText} />
          <Text style={styles.statusPillText}>
            Current Status: {ojtStatus ? ojtStatus.replace(/_/g, ' ').toUpperCase() : 'APPLICANT'}
          </Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Hello <Text style={styles.bold}>{user?.first_name || 'Student'}</Text>, this mobile attendance app is active only for students who have officially started their On-the-Job Training.
        </Text>

        {/* Steps Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How to activate mobile access:</Text>
          
          <View style={styles.stepRow}>
            <Building2 size={18} color={colors.primary} />
            <Text style={styles.stepText}>
              Ensure your Host Company / Organization has confirmed your internship offer.
            </Text>
          </View>

          <View style={styles.stepRow}>
            <FileCheck size={18} color={colors.primary} />
            <Text style={styles.stepText}>
              Your Institutional OJT Coordinator will endorse your active shift record.
            </Text>
          </View>
        </View>

        {notice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing}
            style={styles.refreshBtn}
            activeOpacity={0.8}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <RefreshCw size={18} color="#ffffff" />
                <Text style={styles.refreshBtnText}>Check Live Status</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={logout}
            style={styles.logoutBtn}
            activeOpacity={0.7}
          >
            <LogOut size={18} color={colors.danger} />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warningBg,
    borderWidth: 1.5,
    borderColor: colors.warningBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 10
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warningText
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 24
  },
  bold: {
    fontWeight: '700',
    color: colors.text
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17
  },
  noticeBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.infoBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.infoBorder
  },
  noticeText: {
    fontSize: 12,
    color: colors.infoText,
    textAlign: 'center'
  },
  buttonGroup: {
    width: '100%',
    maxWidth: 360,
    gap: 10
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceLow,
    paddingVertical: 12,
    borderRadius: 16
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger
  }
});
