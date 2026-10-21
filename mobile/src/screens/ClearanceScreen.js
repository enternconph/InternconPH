import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Linking
} from 'react-native';
import {
  FileCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  Award,
  ChevronRight
} from 'lucide-react-native';
import api from '../api/client';
import { colors } from '../utils/theme';

export default function ClearanceScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [summary, setSummary] = useState(null);

  const fetchClearance = useCallback(async () => {
    try {
      const res = await api.get('/student/clearance');
      if (res.success && res.data) {
        setRequirements(res.data.requirements || []);
        setSummary(res.data.summary || null);
      }
    } catch (e) {
      console.warn('Clearance fetch error, fallback to /student/requirements:', e);
      try {
        const fallbackRes = await api.get('/student/requirements');
        if (fallbackRes.success && fallbackRes.data) {
          setRequirements(fallbackRes.data);
          const approved = fallbackRes.data.filter(r => r.submission_status === 'approved').length;
          setSummary({
            totalCount: fallbackRes.data.length,
            approvedCount: approved,
            progressPct: fallbackRes.data.length > 0 ? Math.round((approved / fallbackRes.data.length) * 100) : 0,
            isCleared: fallbackRes.data.length > 0 && approved === fallbackRes.data.length
          });
        }
      } catch (_) {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClearance();
  }, [fetchClearance]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClearance();
  };

  const handleOpenDoc = (url) => {
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `https://internconph.onrender.com${url.startsWith('/') ? '' : '/'}${url}`;
    Linking.openURL(fullUrl).catch(err => console.warn('Could not open URL:', err));
  };

  const renderReqItem = ({ item }) => {
    const status = item.submission_status || 'not_submitted';
    const isApproved = status === 'approved';
    const isPending = status === 'submitted' || status === 'draft';
    const isRejected = status === 'rejected';

    return (
      <View style={styles.reqCard}>
        <View style={styles.reqHeader}>
          <View style={styles.reqHeaderLeft}>
            <Text style={styles.reqTitle}>{item.title || item.requirement_name}</Text>
            {item.is_mandatory ? (
              <View style={styles.mandatoryPill}>
                <Text style={styles.mandatoryText}>MANDATORY</Text>
              </View>
            ) : null}
          </View>

          <View style={[
            styles.statusBadge,
            isApproved ? styles.statusApproved : isPending ? styles.statusPending : isRejected ? styles.statusRejected : styles.statusMissing
          ]}>
            <Text style={[
              styles.statusText,
              isApproved ? styles.textApproved : isPending ? styles.textPending : isRejected ? styles.textRejected : styles.textMissing
            ]}>
              {isApproved ? 'APPROVED' : isPending ? 'IN REVIEW' : isRejected ? 'REJECTED' : 'PENDING'}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.reqDesc}>{item.description}</Text>
        ) : null}

        {item.file_url ? (
          <TouchableOpacity
            onPress={() => handleOpenDoc(item.file_url)}
            style={styles.docButton}
            activeOpacity={0.8}
          >
            <ExternalLink size={13} color="#FFB433" />
            <Text style={styles.docBtnText}>View Uploaded Document</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.unsubmittedNotice}>
            Upload via student web portal to fulfill this requirement.
          </Text>
        )}
      </View>
    );
  };

  const progressPct = summary?.progressPct || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={requirements}
        keyExtractor={(item) => String(item.requirement_id || item.id || Math.random())}
        renderItem={renderReqItem}
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
            <View style={styles.headerSection}>
              <View style={styles.complianceRow}>
                <View style={styles.cmoPill}>
                  <ShieldCheck size={12} color="#80CBC4" />
                  <Text style={styles.cmoText}>CHED CMO 104 CLEARANCE</Text>
                </View>
              </View>

              <Text style={styles.screenTitle}>Clearance & Compliance</Text>
              <Text style={styles.screenSubtitle}>
                Institutional verification & exit requirement checklist
              </Text>
            </View>

            {/* Clearance Progress Bento Card */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Clearance Completion</Text>
                <View style={styles.pctPill}>
                  <Text style={styles.pctText}>{progressPct}% Cleared</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>
                  Approved: <Text style={styles.statBold}>{summary?.approvedCount || 0}</Text> / {summary?.totalCount || requirements.length} requirements
                </Text>
                <Text style={styles.statStatus}>
                  {summary?.isCleared ? 'Ready for Exit Endorsement' : 'Pending Approvals'}
                </Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <FileCheck size={36} color="#80CBC4" />
              <Text style={styles.emptyTitle}>No clearance items listed</Text>
              <Text style={styles.emptySubtitle}>
                Clearance documents assigned by your institution will appear here.
              </Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
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
  cmoText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#80CBC4',
    letterSpacing: 0.5
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
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 16,
    gap: 10
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  pctPill: {
    backgroundColor: 'rgba(255, 180, 51, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.4)'
  },
  pctText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFB433'
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FFB433'
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)'
  },
  statBold: {
    fontWeight: '800',
    color: '#FFFFFF'
  },
  statStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: '#80CBC4'
  },
  reqCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 10,
    gap: 8
  },
  reqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8
  },
  reqHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6
  },
  reqTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  mandatoryPill: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6
  },
  mandatoryText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FCA5A5',
    letterSpacing: 0.5
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10
  },
  statusApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  statusPending: {
    backgroundColor: 'rgba(255, 180, 51, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.4)'
  },
  statusRejected: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.4)'
  },
  statusMissing: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800'
  },
  textApproved: {
    color: '#80CBC4'
  },
  textPending: {
    color: '#FFB433'
  },
  textRejected: {
    color: '#FCA5A5'
  },
  textMissing: {
    color: 'rgba(255, 255, 255, 0.5)'
  },
  reqDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 16
  },
  docButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 180, 51, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.3)'
  },
  docBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFB433'
  },
  unsubmittedNotice: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic'
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
