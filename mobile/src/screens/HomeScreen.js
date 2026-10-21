import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import {
  QrCode,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  BookOpen,
  Award,
  ChevronRight,
  TrendingUp,
  LogOut,
  ShieldCheck,
  MapPin,
  Calendar
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../utils/theme';
import AttendanceQrModal from '../components/AttendanceQrModal';
import { formatTime12 } from '../utils/timeUtils';

const CACHE_OJT_KEY = '@internconph_cached_ojt_data';
const CACHE_ATT_KEY = '@internconph_cached_att_data';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
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

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
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
      setIsOnline(true);
    } catch (err) {
      console.warn('HomeScreen fetch error (offline fallback in use):', err);
      setIsOnline(false);
    } finally {
      if (!isSilent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Real-time synchronization while online (polling every 5 seconds)
  useEffect(() => {
    const pollTimer = setInterval(() => {
      fetchData(true);
    }, 5000);

    return () => clearInterval(pollTimer);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
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
            colors={['#FFB433']}
            tintColor={'#FFB433'}
          />
        }
      >
        {/* Header Bar */}
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
                {user?.full_name || user?.display_name || 'Student Intern'}
              </Text>
              <Text style={styles.studentNumber}>
                #{user?.student_number || user?.student_id || user?.user_id || '2026-OJT'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.7}>
            <LogOut size={16} color="#80CBC4" />
          </TouchableOpacity>
        </View>

        {/* Live Network & Status Badge */}
        <View style={[styles.networkBadge, isOnline ? styles.networkOnline : styles.networkOffline]}>
          <View style={[styles.networkDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={[styles.networkText, isOnline ? styles.textOnline : styles.textOffline]}>
            {isOnline
              ? 'Live Sync Active • CHED CMO 104 Biometrics'
              : 'Offline Mode • Presenting Cached QR'}
          </Text>
        </View>

        {/* PRIMARY CTA: Tactile Amber Attendance Punch Card */}
        <TouchableOpacity
          onPress={() => setShowQrModal(true)}
          style={styles.qrCtaCard}
          activeOpacity={0.9}
        >
          <View style={styles.qrCtaContent}>
            <View style={styles.qrIconBadge}>
              <QrCode size={28} color="#193631" />
            </View>
            <View style={styles.qrCtaTextGroup}>
              <View style={styles.qrPill}>
                <View style={styles.livePulse} />
                <Text style={styles.qrPillText}>DYNAMIC 20s TOTP</Text>
              </View>
              <Text style={styles.qrCtaTitle}>Present Attendance QR</Text>
              <Text style={styles.qrCtaSubtitle}>
                {isClockedOut
                  ? 'Shift completed • Tap to show QR badge'
                  : isClockedIn
                  ? 'Currently Time-In • Scan to Clock-Out'
                  : 'Ready for Arrival • Scan to Clock-In'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Today's Shift Status Bento Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Clock size={16} color="#FFB433" />
              <Text style={styles.cardHeaderTitle}>Today's Shift Activity</Text>
            </View>
            <Text style={styles.pstTag}>PST (UTC+8)</Text>
          </View>

          {/* Shift Indicator Status */}
          {todayLog?.status === 'rejected' ? (
            <View style={[styles.indicatorBanner, styles.bannerRejected]}>
              <AlertCircle size={16} color="#FCA5A5" />
              <View style={styles.indicatorTexts}>
                <Text style={[styles.indicatorTitle, styles.textRejected]}>ATTENDANCE REJECTED</Text>
                <Text style={styles.indicatorSubtitle}>
                  {todayLog.rejection_notes || 'Shift was not approved by mentor.'}
                </Text>
              </View>
            </View>
          ) : isClockedOut ? (
            <View style={[styles.indicatorBanner, styles.bannerSuccess]}>
              <CheckCircle size={16} color="#80CBC4" />
              <View style={styles.indicatorTexts}>
                <Text style={[styles.indicatorTitle, styles.textSuccess]}>SHIFT COMPLETED</Text>
                <Text style={styles.indicatorSubtitle}>
                  In: {formatTime12(todayLog.time_in)} • Out: {formatTime12(todayLog.time_out)} ({todayLog.hours_rendered || 0} hrs)
                </Text>
              </View>
            </View>
          ) : isClockedIn ? (
            <View style={[styles.indicatorBanner, styles.bannerActive]}>
              <View style={styles.pulsingIndicatorDot} />
              <View style={styles.indicatorTexts}>
                <Text style={[styles.indicatorTitle, styles.textSuccess]}>TIME-IN ACTIVE • ON DUTY</Text>
                <Text style={styles.indicatorSubtitle}>
                  Clocked in at {formatTime12(todayLog.time_in)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.indicatorBanner, styles.bannerAwaiting]}>
              <Clock size={16} color="#FFB433" />
              <View style={styles.indicatorTexts}>
                <Text style={[styles.indicatorTitle, styles.textAwaiting]}>AWAITING TIME-IN</Text>
                <Text style={styles.indicatorSubtitle}>
                  Present your dynamic QR code to the workplace scanner.
                </Text>
              </View>
            </View>
          )}

          {/* Time In / Out Stat Boxes */}
          <View style={styles.shiftBoxesRow}>
            <View style={styles.shiftBox}>
              <Text style={styles.shiftBoxLabel}>TIME IN</Text>
              <Text style={styles.shiftBoxValue}>
                {todayLog?.time_in ? formatTime12(todayLog.time_in) : '--:--'}
              </Text>
              <Text style={styles.shiftBoxStatus}>
                {todayLog?.time_in ? (todayLog.time_in_status === 'late' ? 'Late' : 'On-Time') : 'Pending'}
              </Text>
            </View>

            <View style={styles.shiftBox}>
              <Text style={styles.shiftBoxLabel}>TIME OUT</Text>
              <Text style={styles.shiftBoxValue}>
                {todayLog?.time_out ? formatTime12(todayLog.time_out) : '--:--'}
              </Text>
              <Text style={styles.shiftBoxStatus}>
                {todayLog?.time_out ? 'Stamped' : (isClockedIn ? 'Active' : 'Pending')}
              </Text>
            </View>
          </View>
        </View>

        {/* OJT Requirement Progress Bento */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <TrendingUp size={16} color="#80CBC4" />
              <Text style={styles.cardHeaderTitle}>OJT Progress Overview</Text>
            </View>
            <View style={styles.quotaPill}>
              <Text style={styles.quotaPillText}>{progressPct}% Quota</Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Rendered Hours</Text>
            <Text style={styles.progressNumbers}>
              <Text style={styles.progressDone}>{doneHours}</Text> / {reqHours} hrs{' '}
              <Text style={styles.progressLeft}>({remainingHours} left)</Text>
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
          </View>
        </View>

        {/* Workplace Host Placement Card */}
        {activeRecord && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Building2 size={16} color="#80CBC4" />
                <Text style={styles.cardHeaderTitle}>Host Organization</Text>
              </View>
            </View>

            <Text style={styles.orgName}>{activeRecord.organization_name || 'Placement Company'}</Text>
            <Text style={styles.orgDept}>{activeRecord.department_name || activeRecord.job_title || 'Internship Assignment'}</Text>

            <View style={styles.orgMetaRow}>
              <MapPin size={13} color="#80CBC4" />
              <Text style={styles.orgMetaText}>
                {activeRecord.location || activeRecord.work_setup || 'On-site / Hybrid Placement'}
              </Text>
            </View>
          </View>
        )}

        {/* Quick Nav Shortcuts */}
        <View style={styles.shortcutsGrid}>
          <TouchableOpacity
            onPress={() => navigation?.navigate('DTR')}
            style={styles.shortcutCard}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: 'rgba(255, 180, 51, 0.2)' }]}>
              <Clock size={18} color="#FFB433" />
            </View>
            <Text style={styles.shortcutTitle}>DTR Logs</Text>
            <Text style={styles.shortcutDesc}>Punch history</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation?.navigate('Journal')}
            style={styles.shortcutCard}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: 'rgba(38, 166, 154, 0.2)' }]}>
              <BookOpen size={18} color="#80CBC4" />
            </View>
            <Text style={styles.shortcutTitle}>Weekly Journal</Text>
            <Text style={styles.shortcutDesc}>Learnings log</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation?.navigate('Clearance')}
            style={styles.shortcutCard}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <FileText size={18} color="#10B981" />
            </View>
            <Text style={styles.shortcutTitle}>Clearance</Text>
            <Text style={styles.shortcutDesc}>CHED papers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation?.navigate('Evaluations')}
            style={styles.shortcutCard}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: 'rgba(167, 139, 250, 0.2)' }]}>
              <Award size={18} color="#A78BFA" />
            </View>
            <Text style={styles.shortcutTitle}>Evaluations</Text>
            <Text style={styles.shortcutDesc}>Appraisals</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacer for floating nav */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Dynamic Attendance QR Modal */}
      <AttendanceQrModal
        visible={showQrModal}
        onClose={() => setShowQrModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#193631'
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  headerLogo: {
    width: 38,
    height: 38
  },
  greetingText: {
    fontSize: 11,
    color: '#80CBC4',
    fontWeight: '500'
  },
  studentName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  studentNumber: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600'
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14
  },
  networkOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  networkOffline: {
    backgroundColor: 'rgba(255, 180, 51, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.3)'
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  dotOnline: {
    backgroundColor: '#10B981'
  },
  dotOffline: {
    backgroundColor: '#FFB433'
  },
  networkText: {
    fontSize: 11,
    fontWeight: '600'
  },
  textOnline: {
    color: '#80CBC4'
  },
  textOffline: {
    color: '#FFB433'
  },
  qrCtaCard: {
    backgroundColor: '#FFB433',
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#FFB433',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8
  },
  qrCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  qrIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  qrCtaTextGroup: {
    flex: 1
  },
  qrPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(25, 54, 49, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 4
  },
  livePulse: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#193631'
  },
  qrPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#193631',
    letterSpacing: 0.5
  },
  qrCtaTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#193631',
    letterSpacing: -0.3
  },
  qrCtaSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(25, 54, 49, 0.85)',
    marginTop: 2
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  pstTag: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600'
  },
  indicatorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    marginBottom: 12
  },
  bannerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)'
  },
  bannerActive: {
    backgroundColor: 'rgba(38, 166, 154, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(38, 166, 154, 0.4)'
  },
  bannerAwaiting: {
    backgroundColor: 'rgba(255, 180, 51, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.35)'
  },
  bannerRejected: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)'
  },
  pulsingIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#80CBC4'
  },
  indicatorTexts: {
    flex: 1
  },
  indicatorTitle: {
    fontSize: 11,
    fontWeight: '800'
  },
  textSuccess: {
    color: '#80CBC4'
  },
  textAwaiting: {
    color: '#FFB433'
  },
  textRejected: {
    color: '#FCA5A5'
  },
  indicatorSubtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2
  },
  shiftBoxesRow: {
    flexDirection: 'row',
    gap: 10
  },
  shiftBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  shiftBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#80CBC4',
    letterSpacing: 0.5
  },
  shiftBoxValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2
  },
  shiftBoxStatus: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2
  },
  quotaPill: {
    backgroundColor: 'rgba(255, 180, 51, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.4)'
  },
  quotaPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFB433'
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)'
  },
  progressNumbers: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)'
  },
  progressDone: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  progressLeft: {
    color: '#80CBC4',
    fontWeight: '700'
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FFB433'
  },
  orgName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2
  },
  orgDept: {
    fontSize: 11,
    color: '#80CBC4',
    fontWeight: '600',
    marginBottom: 6
  },
  orgMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  orgMetaText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)'
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  shortcutCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 4
  },
  shortcutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  shortcutTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  shortcutDesc: {
    fontSize: 10,
    color: '#80CBC4'
  }
});
