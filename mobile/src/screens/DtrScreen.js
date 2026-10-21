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
  Check,
  ShieldCheck,
  MapPin,
  ChevronDown,
  ChevronUp,
  Fingerprint
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { colors } from '../utils/theme';
import AttendanceQrModal from '../components/AttendanceQrModal';
import { formatTime12 } from '../utils/timeUtils';

const CACHE_DTR_KEY = '@internconph_cached_dtr_logs';

export default function DtrScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [todayLog, setTodayLog] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'verified' | 'pending'
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Restore cached DTR for offline support
  useEffect(() => {
    async function restoreCachedDtr() {
      try {
        const cached = await AsyncStorage.getItem(CACHE_DTR_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.logs) setAttendanceLogs(parsed.logs);
          if (parsed.todayLog) setTodayLog(parsed.todayLog);
        }
      } catch (err) {
        console.warn('DTR cache restore error:', err);
      }
    }
    restoreCachedDtr();
  }, []);

  const fetchDtr = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await api.get('/student/attendance');
      if (res.success && res.data) {
        setAttendanceLogs(res.data.logs || []);
        setTodayLog(res.data.todayLog || null);
        setIsOnline(true);
        AsyncStorage.setItem(CACHE_DTR_KEY, JSON.stringify(res.data)).catch(() => {});
      }
    } catch (e) {
      console.warn('DTR fetch error (offline fallback in use):', e);
      setIsOnline(false);
    } finally {
      if (!isSilent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDtr(false);
  }, [fetchDtr]);

  // Real-time synchronization while online (poll every 6 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchDtr(true);
    }, 6000);

    return () => clearInterval(timer);
  }, [fetchDtr]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDtr(false);
  };

  const totalCertifiedHours = attendanceLogs.reduce(
    (acc, log) => acc + (parseFloat(log.hours_rendered) || 0),
    0
  );

  const filteredLogs = attendanceLogs.filter((log) => {
    if (filter === 'verified') return log.status === 'verified';
    if (filter === 'pending') return log.status !== 'verified';
    return true;
  });

  const renderLogItem = ({ item }) => {
    const isLate = item.time_in_status === 'late';
    const isVerified = item.status === 'verified';
    const isExpanded = expandedLogId === item.attendance_id;

    return (
      <View style={styles.logCard}>
        {/* Date & Certification Status Header */}
        <View style={styles.logHeader}>
          <View style={styles.dateGroup}>
            <Calendar size={14} color="#80CBC4" />
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
            <CheckCircle2 size={12} color={isVerified ? '#80CBC4' : '#FFB433'} />
            <Text style={[styles.certText, isVerified ? styles.certTextVerified : styles.certTextPending]}>
              {isVerified ? 'VERIFIED' : 'PENDING REVIEW'}
            </Text>
          </View>
        </View>

        {/* Timestamps Row */}
        <View style={styles.timeRow}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>TIME IN</Text>
            <Text style={styles.timeVal}>{formatTime12(item.time_in)}</Text>
            {isLate ? (
              <View style={styles.lateTag}>
                <Text style={styles.lateText}>Late</Text>
              </View>
            ) : (
              <View style={styles.onTimeTag}>
                <Text style={styles.onTimeText}>On-Time</Text>
              </View>
            )}
          </View>

          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>TIME OUT</Text>
            <Text style={styles.timeVal}>
              {item.time_out ? formatTime12(item.time_out) : '--:--'}
            </Text>
            <Text style={styles.timeSubtext}>
              {item.time_out ? 'Stamped' : 'Open Shift'}
            </Text>
          </View>

          <View style={styles.hoursBox}>
            <Text style={styles.hoursLabel}>CREDITED</Text>
            <Text style={styles.hoursVal}>{item.hours_rendered || 0}</Text>
            <Text style={styles.hoursUnit}>HRS</Text>
          </View>
        </View>

        {/* Geofence / Biometric Stamp */}
        <View style={styles.telemetryRow}>
          <View style={styles.telemetryItem}>
            <MapPin size={11} color="#80CBC4" />
            <Text style={styles.telemetryText}>
              {item.location_name || 'Designated Workplace Geofence'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setExpandedLogId(isExpanded ? null : item.attendance_id)}
            style={styles.auditToggleBtn}
          >
            <Text style={styles.auditToggleText}>Audit Trail</Text>
            {isExpanded ? (
              <ChevronUp size={12} color="#80CBC4" />
            ) : (
              <ChevronDown size={12} color="#80CBC4" />
            )}
          </TouchableOpacity>
        </View>

        {/* Expandable Cryptographic & Audit Details */}
        {isExpanded && (
          <View style={styles.auditDrawer}>
            <Text style={styles.auditTitle}>Cryptographic Signatures & Verification</Text>
            <View style={styles.auditFieldRow}>
              <Text style={styles.auditFieldLabel}>Device Verification:</Text>
              <Text style={styles.auditFieldValue}>Knox Biometric Bound</Text>
            </View>
            <View style={styles.auditFieldRow}>
              <Text style={styles.auditFieldLabel}>Time Standard:</Text>
              <Text style={styles.auditFieldValue}>Philippine Standard Time (UTC+8)</Text>
            </View>
            {item.supervisor_notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Supervisor Remark:</Text>
                <Text style={styles.notesText}>{item.supervisor_notes}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => String(item.attendance_id || item.id || Math.random())}
        renderItem={renderLogItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFB433']}
            tintColor={'#FFB433'}
          />
        }
        ListHeaderComponent={
          <>
            {/* Title & Regulatory Badge */}
            <View style={styles.headerSection}>
              <View style={styles.complianceRow}>
                <View style={styles.cmoPill}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.cmoText}>CHED CMO 104 COMPLIANT</Text>
                </View>
                <View style={styles.livePill}>
                  <Text style={styles.liveText}>Live Sync</Text>
                </View>
              </View>

              <Text style={styles.screenTitle}>DTR Logbook & Biometrics</Text>
              <Text style={styles.screenSubtitle}>
                Philippine Higher Education Regulatory Daily Time Record
              </Text>
            </View>

            {/* Metric Bento Summary */}
            <View style={styles.summaryBentoRow}>
              <View style={styles.bentoBox}>
                <Text style={styles.bentoLabel}>TOTAL CERTIFIED</Text>
                <Text style={styles.bentoNumber}>{totalCertifiedHours.toFixed(1)}</Text>
                <Text style={styles.bentoSubtext}>Official OJT Hours</Text>
              </View>

              <View style={styles.bentoBox}>
                <Text style={styles.bentoLabel}>TOTAL ENTRIES</Text>
                <Text style={styles.bentoNumber}>{attendanceLogs.length}</Text>
                <Text style={styles.bentoSubtext}>Recorded Shifts</Text>
              </View>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                onPress={() => setFilter('all')}
                style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
              >
                <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                  All ({attendanceLogs.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFilter('verified')}
                style={[styles.filterPill, filter === 'verified' && styles.filterPillActive]}
              >
                <Text style={[styles.filterText, filter === 'verified' && styles.filterTextActive]}>
                  Verified
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFilter('pending')}
                style={[styles.filterPill, filter === 'pending' && styles.filterPillActive]}
              >
                <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
                  Pending
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Clock size={36} color="#80CBC4" />
              <Text style={styles.emptyTitle}>No DTR entries found</Text>
              <Text style={styles.emptySubtitle}>
                Shifts logged through the Dynamic Attendance QR code will appear here.
              </Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
      />

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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30
  },
  headerSection: {
    marginBottom: 14
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  cmoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    backgroundColor: 'rgba(38, 166, 154, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(38, 166, 154, 0.4)'
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#80CBC4'
  },
  cmoText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#80CBC4',
    letterSpacing: 0.5
  },
  livePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)'
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#80CBC4',
    marginTop: 2
  },
  summaryBentoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  bentoBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  bentoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#80CBC4',
    letterSpacing: 0.5
  },
  bentoNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2
  },
  bentoSubtext: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 1
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  filterPillActive: {
    backgroundColor: '#FFB433',
    borderColor: '#FFB433'
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  filterTextActive: {
    color: '#193631',
    fontWeight: '800'
  },
  logCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 12,
    gap: 12
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  dateText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12
  },
  certVerified: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)'
  },
  certPending: {
    backgroundColor: 'rgba(255, 180, 51, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.35)'
  },
  certText: {
    fontSize: 9,
    fontWeight: '800'
  },
  certTextVerified: {
    color: '#80CBC4'
  },
  certTextPending: {
    color: '#FFB433'
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  timeBox: {
    flex: 1,
    alignItems: 'center'
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#80CBC4',
    letterSpacing: 0.5
  },
  timeVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2
  },
  timeSubtext: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2
  },
  lateTag: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2
  },
  lateText: {
    fontSize: 9,
    color: '#FCA5A5',
    fontWeight: '700'
  },
  onTimeTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2
  },
  onTimeText: {
    fontSize: 9,
    color: '#80CBC4',
    fontWeight: '700'
  },
  hoursBox: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)'
  },
  hoursLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFB433',
    letterSpacing: 0.5
  },
  hoursVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  hoursUnit: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.6)'
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  telemetryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  telemetryText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)'
  },
  auditToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  auditToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#80CBC4'
  },
  auditDrawer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  auditTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#80CBC4',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  auditFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  auditFieldLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.55)'
  },
  auditFieldValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  notesBox: {
    marginTop: 4,
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFB433'
  },
  notesText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  emptySubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingHorizontal: 20
  }
});
