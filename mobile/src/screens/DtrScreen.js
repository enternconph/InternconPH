import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  QrCode,
  Check
} from 'lucide-react-native';
import api from '../api/client';
import { colors } from '../utils/theme';
import AttendanceQrModal from '../components/AttendanceQrModal';

export default function DtrScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [todayLog, setTodayLog] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const fetchDtr = useCallback(async () => {
    try {
      const res = await api.get('/student/attendance');
      if (res.success && res.data) {
        setAttendanceLogs(res.data.logs || []);
        setTodayLog(res.data.todayLog || null);
      }
    } catch (e) {
      console.warn('DTR fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDtr();
  }, [fetchDtr]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDtr();
  };

  const totalCertifiedHours = attendanceLogs.reduce(
    (acc, log) => acc + (parseFloat(log.hours_rendered) || 0),
    0
  );

  const renderLogItem = ({ item }) => {
    const isLate = item.time_in_status === 'late';
    const isVerified = item.status === 'verified';

    return (
      <View style={styles.logCard}>
        {/* Date & Certification Status */}
        <View style={styles.logHeader}>
          <View style={styles.dateGroup}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={styles.dateText}>
              {new Date(item.log_date).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>

          <View style={[styles.certBadge, isVerified ? styles.certVerified : styles.certPending]}>
            <CheckCircle2 size={12} color={isVerified ? colors.successText : colors.warningText} />
            <Text style={[styles.certText, isVerified ? styles.certTextVerified : styles.certTextPending]}>
              {isVerified ? 'Certified' : 'Pending Review'}
            </Text>
          </View>
        </View>

        {/* Company */}
        <View style={styles.companyRow}>
          <Building2 size={14} color={colors.primary} />
          <Text style={styles.companyText}>{item.organization_name || 'Host Company'}</Text>
        </View>

        {/* Time Stats Box */}
        <View style={styles.timeStatsBox}>
          <View style={styles.timeStatItem}>
            <Text style={styles.timeStatLabel}>TIME IN (PST)</Text>
            <Text style={styles.timeStatValue}>
              {item.time_in ? item.time_in.slice(0, 5) : '—'}
            </Text>
            {item.time_in && (
              <Text style={[styles.timeSubstatus, isLate ? styles.lateText : styles.onTimeText]}>
                {isLate ? 'Late' : 'On-Time'}
              </Text>
            )}
          </View>

          <View style={styles.timeDivider} />

          <View style={styles.timeStatItem}>
            <Text style={styles.timeStatLabel}>TIME OUT (PST)</Text>
            <Text style={styles.timeStatValue}>
              {item.time_out ? item.time_out.slice(0, 5) : 'In Progress'}
            </Text>
            <Text style={styles.timeSubstatus}>
              {item.time_out ? 'Clocked Out' : 'Active'}
            </Text>
          </View>

          <View style={styles.timeDivider} />

          <View style={styles.timeStatItem}>
            <Text style={styles.timeStatLabel}>HOURS CREDITED</Text>
            <Text style={styles.timeStatHours}>
              {parseFloat(item.hours_rendered || 0).toFixed(2)} hrs
            </Text>
            <Text style={styles.timeSubstatus}>Mentor Audit</Text>
          </View>
        </View>

        {/* Tasks Accomplished */}
        {item.tasks_accomplished ? (
          <View style={styles.tasksBox}>
            <Text style={styles.tasksTitle}>Tasks Rendered:</Text>
            <Text style={styles.tasksContent}>{item.tasks_accomplished}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>Daily Time Record</Text>
          <Text style={styles.screenSubtitle}>PST UTC+8 Synchronized Logs</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowQrModal(true)}
          style={styles.qrHeaderBtn}
          activeOpacity={0.8}
        >
          <QrCode size={16} color="#ffffff" />
          <Text style={styles.qrHeaderBtnText}>My QR</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Banner */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{attendanceLogs.length}</Text>
          <Text style={styles.summaryLabel}>Total Shifts</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{totalCertifiedHours.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>Hours Rendered</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>
            {attendanceLogs.filter(l => l.status === 'verified').length}
          </Text>
          <Text style={styles.summaryLabel}>Certified Logs</Text>
        </View>
      </View>

      {/* Logs List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching shift logs...</Text>
        </View>
      ) : attendanceLogs.length === 0 ? (
        <View style={styles.emptyBox}>
          <Clock size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No attendance records yet</Text>
          <Text style={styles.emptySubtitle}>
            Scan your dynamic attendance QR at your workplace to record your first time-in.
          </Text>
        </View>
      ) : (
        <FlatList
          data={attendanceLogs}
          keyExtractor={item => item.attendance_id.toString()}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* Dynamic Attendance QR Modal */}
      <AttendanceQrModal
        visible={showQrModal}
        onClose={() => {
          setShowQrModal(false);
          fetchDtr();
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
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy
  },
  screenSubtitle: {
    fontSize: 11,
    color: colors.textSecondary
  },
  qrHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14
  },
  qrHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff'
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center'
  },
  summaryNum: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
    fontFamily: 'monospace'
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2
  },
  summaryDivider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.borderLight,
    alignSelf: 'center'
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30
  },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1
  },
  certVerified: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder
  },
  certPending: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder
  },
  certText: {
    fontSize: 10,
    fontWeight: '700'
  },
  certTextVerified: {
    color: colors.successText
  },
  certTextPending: {
    color: colors.warningText
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  companyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  timeStatsBox: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLow,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  timeStatItem: {
    flex: 1,
    alignItems: 'center'
  },
  timeStatLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5
  },
  timeStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'monospace',
    marginTop: 2
  },
  timeStatHours: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'monospace',
    marginTop: 2
  },
  timeSubstatus: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2
  },
  lateText: {
    color: colors.warning,
    fontWeight: '700'
  },
  onTimeText: {
    color: colors.success,
    fontWeight: '700'
  },
  timeDivider: {
    width: 1,
    height: '70%',
    backgroundColor: colors.border,
    alignSelf: 'center'
  },
  tasksBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  tasksTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2
  },
  tasksContent: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 16
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 12
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18
  }
});
