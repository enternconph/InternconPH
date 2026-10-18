import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import {
  QrCode,
  Building2,
  UserCheck,
  Clock,
  CheckCircle,
  FileText,
  BookOpen,
  Award,
  ChevronRight,
  TrendingUp,
  LogOut
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../utils/theme';
import AttendanceQrModal from '../components/AttendanceQrModal';

const CACHE_OJT_KEY = '@internconph_cached_ojt_data';
const CACHE_ATT_KEY = '@internconph_cached_att_data';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ojtData, setOjtData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Restore cached dashboard data for offline support
  useEffect(() => {
    async function restoreCachedData() {
      try {
        const [cachedOjt, cachedAtt] = await Promise.all([
          AsyncStorage.getItem(CACHE_OJT_KEY),
          AsyncStorage.getItem(CACHE_ATT_KEY)
        ]);
        if (cachedOjt) setOjtData(JSON.parse(cachedOjt));
        if (cachedAtt) setAttendanceData(JSON.parse(cachedAtt));
      } catch (err) {
        console.warn('HomeScreen cache restore error:', err);
      }
    }
    restoreCachedData();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [ojtRes, attRes] = await Promise.all([
        api.get('/student/ojt'),
        api.get('/student/attendance')
      ]);

      if (ojtRes.success && ojtRes.data) {
        setOjtData(ojtRes.data);
        AsyncStorage.setItem(CACHE_OJT_KEY, JSON.stringify(ojtRes.data)).catch(() => {});
      }
      if (attRes.success && attRes.data) {
        setAttendanceData(attRes.data);
        AsyncStorage.setItem(CACHE_ATT_KEY, JSON.stringify(attRes.data)).catch(() => {});
      }
    } catch (err) {
      console.warn('HomeScreen fetch error (offline fallback in use):', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const activeRecord = ojtData?.records?.find(r => r.status === 'ongoing' || r.status === 'active') || ojtData?.records?.[0];
  const reqHours = activeRecord?.required_hours || ojtData?.requiredHours || 600;
  const doneHours = activeRecord ? activeRecord.rendered_hours || 0 : 0;
  const progressPct = reqHours > 0 ? Math.min(100, Math.round((doneHours / reqHours) * 100)) : 0;
  const remainingHours = Math.max(0, reqHours - doneHours);

  const todayLog = attendanceData?.todayLog;
  const isClockedIn = !!todayLog?.time_in;
  const isClockedOut = !!todayLog?.time_out;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.greetingText}>Welcome back,</Text>
              <Text style={styles.studentName}>
                {user?.full_name || user?.display_name || 'Student Candidate'}
              </Text>
              <Text style={styles.studentNumber}>
                Student #{user?.student_number || user?.student_id || user?.user_id}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.7}>
            <LogOut size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* PRIMARY CTA: Open Attendance QR Code */}
        <TouchableOpacity
          onPress={() => setShowQrModal(true)}
          style={styles.qrCtaCard}
          activeOpacity={0.9}
        >
          <View style={styles.qrCtaContent}>
            <View style={styles.qrIconBadge}>
              <QrCode size={32} color="#ffffff" />
            </View>
            <View style={styles.qrCtaTextGroup}>
              <View style={styles.qrPill}>
                <View style={styles.livePulse} />
                <Text style={styles.qrPillText}>DYNAMIC 20s TOTP</Text>
              </View>
              <Text style={styles.qrCtaTitle}>Present Attendance QR</Text>
              <Text style={styles.qrCtaSubtitle}>
                {isClockedOut
                  ? 'Completed today • Open to show credentials'
                  : isClockedIn
                  ? 'Currently Time-In • Scan to Time-Out'
                  : 'Ready for Arrival • Scan to Time-In'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Today's Shift Status Card */}
        <View style={styles.todayCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Clock size={16} color={colors.primary} />
              <Text style={styles.cardHeaderTitle}>Today's Shift Activity</Text>
            </View>
            <Text style={styles.pstTag}>PST (UTC+8)</Text>
          </View>

          <View style={styles.shiftBoxesRow}>
            {/* Time In Box */}
            <View style={styles.shiftBox}>
              <Text style={styles.shiftBoxLabel}>TIME IN</Text>
              <Text style={[styles.shiftBoxTime, isClockedIn && styles.timeSuccess]}>
                {todayLog?.time_in ? todayLog.time_in.slice(0, 5) : '— : —'}
              </Text>
              <Text style={styles.shiftBoxStatus}>
                {isClockedIn ? (todayLog.time_in_status === 'late' ? 'Late' : 'On-Time') : 'Pending Clock-in'}
              </Text>
            </View>

            {/* Time Out Box */}
            <View style={styles.shiftBox}>
              <Text style={styles.shiftBoxLabel}>TIME OUT</Text>
              <Text style={[styles.shiftBoxTime, isClockedOut && styles.timePrimary]}>
                {todayLog?.time_out ? todayLog.time_out.slice(0, 5) : '— : —'}
              </Text>
              <Text style={styles.shiftBoxStatus}>
                {isClockedOut
                  ? `${todayLog.hours_rendered || 0} hrs credited`
                  : isClockedIn
                  ? 'Shift in progress'
                  : 'Pending Departure'}
              </Text>
            </View>
          </View>
        </View>

        {/* OJT Progress Gauge Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Internship Training Progress</Text>
              <Text style={styles.progressCompany}>
                {activeRecord?.organization_name || 'Host Organization'}
              </Text>
            </View>
            <View style={styles.pctBadge}>
              <Text style={styles.pctBadgeText}>{progressPct}%</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
          </View>

          <View style={styles.progressStatsRow}>
            <View>
              <Text style={styles.statLabel}>Rendered Hours</Text>
              <Text style={styles.statValueDone}>{parseFloat(doneHours).toFixed(1)} hrs</Text>
            </View>
            <View style={styles.statDivider} />
            <View>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={styles.statValueRemaining}>{parseFloat(remainingHours).toFixed(1)} hrs</Text>
            </View>
            <View style={styles.statDivider} />
            <View>
              <Text style={styles.statLabel}>Target Required</Text>
              <Text style={styles.statValueTotal}>{reqHours} hrs</Text>
            </View>
          </View>

          {/* Mentor Information */}
          <View style={styles.mentorRow}>
            <UserCheck size={16} color={colors.textSecondary} />
            <Text style={styles.mentorText}>
              Assigned Mentor: <Text style={styles.mentorName}>
                {activeRecord?.mentor_name ||
                  (activeRecord?.mentor_first_name
                    ? `${activeRecord.mentor_first_name} ${activeRecord.mentor_last_name || ''}`.trim()
                    : null) ||
                  'Assigned Supervisor'}
              </Text>
            </Text>
          </View>
        </View>

        {/* Quick Module Navigation Grid */}
        <Text style={styles.sectionHeader}>OJT Specialized Modules</Text>

        <View style={styles.modulesGrid}>
          {/* Daily Time Record */}
          <TouchableOpacity
            onPress={() => navigation.navigate('DTR')}
            style={styles.moduleCard}
            activeOpacity={0.8}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#fff7ed' }]}>
              <Clock size={20} color={colors.primary} />
            </View>
            <Text style={styles.moduleTitle}>Daily Time Record</Text>
            <Text style={styles.moduleDesc}>Audit shift hours & logs</Text>
            <ChevronRight size={16} color={colors.textMuted} style={styles.moduleArrow} />
          </TouchableOpacity>

          {/* Internship Journal */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Journal')}
            style={styles.moduleCard}
            activeOpacity={0.8}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#f0fdf4' }]}>
              <BookOpen size={20} color={colors.success} />
            </View>
            <Text style={styles.moduleTitle}>Internship Journal</Text>
            <Text style={styles.moduleDesc}>Daily & weekly learnings</Text>
            <ChevronRight size={16} color={colors.textMuted} style={styles.moduleArrow} />
          </TouchableOpacity>

          {/* Clearance Checklist */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Clearance')}
            style={styles.moduleCard}
            activeOpacity={0.8}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#eff6ff' }]}>
              <FileText size={20} color={colors.info} />
            </View>
            <Text style={styles.moduleTitle}>Clearance Checklist</Text>
            <Text style={styles.moduleDesc}>Institutional compliance</Text>
            <ChevronRight size={16} color={colors.textMuted} style={styles.moduleArrow} />
          </TouchableOpacity>

          {/* Evaluations */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Evaluations')}
            style={styles.moduleCard}
            activeOpacity={0.8}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#faf5ff' }]}>
              <Award size={20} color={colors.purple} />
            </View>
            <Text style={styles.moduleTitle}>Workplace Evaluations</Text>
            <Text style={styles.moduleDesc}>Mentor ratings & scores</Text>
            <ChevronRight size={16} color={colors.textMuted} style={styles.moduleArrow} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Dynamic Attendance QR Modal */}
      <AttendanceQrModal
        visible={showQrModal}
        onClose={() => {
          setShowQrModal(false);
          fetchData();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff'
  },
  greetingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  studentName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy
  },
  studentNumber: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600'
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qrCtaCard: {
    backgroundColor: colors.navy,
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  qrCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  qrIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qrCtaTextGroup: {
    flex: 1
  },
  qrPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 6
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary
  },
  qrPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5
  },
  qrCtaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2
  },
  qrCtaSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 15
  },
  todayCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  pstTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  shiftBoxesRow: {
    flexDirection: 'row',
    gap: 12
  },
  shiftBox: {
    flex: 1,
    backgroundColor: colors.surfaceLow,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  shiftBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4
  },
  shiftBoxTime: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'monospace'
  },
  timeSuccess: {
    color: colors.success
  },
  timePrimary: {
    color: colors.primary
  },
  shiftBoxStatus: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  progressCompany: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  pctBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.surfaceLow,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 12
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600'
  },
  statValueDone: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
    fontFamily: 'monospace'
  },
  statValueRemaining: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
    fontFamily: 'monospace'
  },
  statValueTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
    fontFamily: 'monospace'
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border
  },
  mentorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12
  },
  mentorText: {
    fontSize: 11,
    color: colors.textSecondary
  },
  mentorName: {
    fontWeight: '700',
    color: colors.text
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 12
  },
  modulesGrid: {
    gap: 12
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border
  },
  moduleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  moduleTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  moduleDesc: {
    position: 'absolute',
    left: 72,
    top: 32,
    fontSize: 11,
    color: colors.textSecondary
  },
  moduleArrow: {
    marginLeft: 8
  }
});
