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
  FileCheck,
  ShieldAlert
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../utils/theme';

export default function AccessBlockedScreen() {
  const { user, ojtStatus, checkOjtStatus, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');

  const isCompleted = ojtStatus === 'completed';
  const isRejected = ojtStatus === 'rejected';

  const handleRefresh = async () => {
    setRefreshing(true);
    setNotice('');
    try {
      const result = await checkOjtStatus();
      if (result.error) {
        setNotice(result.error);
      } else if (!result.active) {
        if (result.status === 'completed') {
          setNotice('Status confirmed: Your internship has been successfully completed.');
        } else {
          setNotice('Status checked: Your OJT is still pending placement with your host organization.');
        }
      }
    } catch (e) {
      setNotice(e.message || 'Could not connect to live servers to check status.');
    } finally {
      setRefreshing(false);
    }
  };

  const studentDisplayName = user?.full_name || user?.display_name || 'Student';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Status Icon */}
        <View style={[styles.iconCircle, isCompleted && styles.iconCircleCompleted]}>
          <ShieldAlert size={38} color={isCompleted ? '#10B981' : '#FFB433'} />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isCompleted
            ? 'Internship Completed'
            : isRejected
            ? 'Placement Rejected'
            : 'OJT Placement Pending'}
        </Text>

        {/* Status Pill */}
        <View style={[styles.statusPill, isCompleted && styles.statusPillCompleted]}>
          <AlertTriangle size={13} color={isCompleted ? '#80CBC4' : '#FFB433'} />
          <Text style={[styles.statusPillText, isCompleted && styles.statusPillTextCompleted]}>
            STATUS: {ojtStatus ? ojtStatus.replace(/_/g, ' ').toUpperCase() : 'APPLICANT'}
          </Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          {isCompleted ? (
            <>
              Congratulations <Text style={styles.bold}>{studentDisplayName}</Text>! You have officially completed your required internship training hours. Active attendance clock-in has concluded for this cycle.
            </>
          ) : (
            <>
              Hello <Text style={styles.bold}>{studentDisplayName}</Text>, this mobile attendance app is active for students who have an active or ongoing On-the-Job Training placement.
            </>
          )}
        </Text>

        {/* Steps Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isCompleted ? 'Next Steps for Program Completion:' : 'How to activate mobile access:'}
          </Text>

          {isCompleted ? (
            <>
              <View style={styles.stepRow}>
                <FileCheck size={16} color="#FFB433" />
                <Text style={styles.stepText}>
                  Submit final portfolio documents to your academic coordinator.
                </Text>
              </View>
              <View style={styles.stepRow}>
                <Building2 size={16} color="#FFB433" />
                <Text style={styles.stepText}>
                  Obtain signed exit clearances and certificate of completion.
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.stepRow}>
                <Building2 size={16} color="#80CBC4" />
                <Text style={styles.stepText}>
                  Secure an OJT internship offer through the web portal.
                </Text>
              </View>
              <View style={styles.stepRow}>
                <FileCheck size={16} color="#80CBC4" />
                <Text style={styles.stepText}>
                  Wait for your institution coordinator to endorse and activate your placement.
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Notice Message */}
        {notice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing}
            style={styles.refreshBtn}
            activeOpacity={0.85}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#193631" />
            ) : (
              <>
                <RefreshCw size={16} color="#193631" />
                <Text style={styles.refreshBtnText}>Check Live Placement Status</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={logout}
            style={styles.logoutBtn}
            activeOpacity={0.7}
          >
            <LogOut size={16} color="#FCA5A5" />
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
    backgroundColor: '#193631'
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 180, 51, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  iconCircleCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 180, 51, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.4)'
  },
  statusPillCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFB433'
  },
  statusPillTextCompleted: {
    color: '#80CBC4'
  },
  description: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8
  },
  bold: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 10,
    marginTop: 6
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  stepText: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 16
  },
  noticeBox: {
    width: '100%',
    backgroundColor: 'rgba(38, 166, 154, 0.18)',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(38, 166, 154, 0.35)'
  },
  noticeText: {
    fontSize: 11,
    color: '#80CBC4',
    textAlign: 'center',
    fontWeight: '600'
  },
  actionGroup: {
    width: '100%',
    gap: 10,
    marginTop: 8
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFB433',
    paddingVertical: 13,
    borderRadius: 24,
    shadowColor: '#FFB433',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#193631'
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FCA5A5'
  }
});
