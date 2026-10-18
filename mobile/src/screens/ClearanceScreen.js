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
  ShieldCheck
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
        {/* Header */}
        <View style={styles.reqHeader}>
          <View style={styles.reqHeaderLeft}>
            <Text style={styles.reqTitle}>{item.title || item.requirement_name}</Text>
            {item.is_mandatory ? (
              <View style={styles.mandatoryPill}>
                <Text style={styles.mandatoryText}>MANDATORY</Text>
              </View>
            ) : null}
          </View>

          {/* Status Badge */}
          <View style={[
            styles.statusBadge,
            isApproved ? styles.statusApproved : isPending ? styles.statusPending : isRejected ? styles.statusRejected : styles.statusMissing
          ]}>
            {isApproved ? (
              <CheckCircle2 size={12} color={colors.successText} />
            ) : isPending ? (
              <Clock size={12} color={colors.infoText} />
            ) : isRejected ? (
              <AlertCircle size={12} color={colors.dangerText} />
            ) : (
              <Clock size={12} color={colors.textSecondary} />
            )}
            <Text style={[
              styles.statusText,
              isApproved ? styles.statusApprovedText : isPending ? styles.statusPendingText : isRejected ? styles.statusRejectedText : styles.statusMissingText
            ]}>
              {isApproved ? 'Cleared' : isPending ? 'Under Review' : isRejected ? 'Revise' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Description */}
        {item.description ? (
          <Text style={styles.reqDesc}>{item.description}</Text>
        ) : null}

        {/* Rejection notice */}
        {item.rejection_reason ? (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionTitle}>Coordinator Revision Request:</Text>
            <Text style={styles.rejectionBody}>"{item.rejection_reason}"</Text>
          </View>
        ) : null}

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          {item.template_url ? (
            <TouchableOpacity
              onPress={() => handleOpenDoc(item.template_url)}
              style={styles.templateBtn}
              activeOpacity={0.7}
            >
              <Download size={14} color={colors.primary} />
              <Text style={styles.templateBtnText}>Download Template (.docx)</Text>
            </TouchableOpacity>
          ) : null}

          {item.file_path ? (
            <TouchableOpacity
              onPress={() => handleOpenDoc(item.file_path)}
              style={styles.viewFileBtn}
              activeOpacity={0.7}
            >
              <ExternalLink size={14} color={colors.textSecondary} />
              <Text style={styles.viewFileBtnText}>View Uploaded File</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  const progress = summary?.progressPct || 0;
  const isCleared = summary?.isCleared;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>Clearance Checklist</Text>
          <Text style={styles.screenSubtitle}>Institutional OJT Documentation & Approvals</Text>
        </View>
      </View>

      {/* Clearance Progress Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeaderRow}>
          <View style={styles.progressHeaderLeft}>
            <ShieldCheck size={20} color={isCleared ? colors.success : colors.info} />
            <Text style={styles.progressHeaderTitle}>
              {isCleared ? 'Official Institutional Clearance Complete' : 'Clearance Verification in Progress'}
            </Text>
          </View>
          <Text style={[styles.progressPctText, isCleared && styles.clearedColor]}>
            {progress}%
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress}%` },
              isCleared && styles.progressFillSuccess
            ]}
          />
        </View>

        <Text style={styles.progressSubtitle}>
          {summary?.approvedCount || 0} of {summary?.totalCount || 0} mandatory institutional requirements approved by your OJT Coordinator.
        </Text>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching clearance requirements...</Text>
        </View>
      ) : requirements.length === 0 ? (
        <View style={styles.emptyBox}>
          <FileCheck size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No clearance requirements found</Text>
          <Text style={styles.emptySubtitle}>
            Your academic institution has not published specific requirement templates for your program yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requirements}
          keyExtractor={(item, index) => (item.requirement_id || index).toString()}
          renderItem={renderReqItem}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  screenHeader: {
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
  progressCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  progressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  progressHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    flex: 1
  },
  progressPctText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.info,
    fontFamily: 'monospace'
  },
  clearedColor: {
    color: colors.success
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceLow,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.info,
    borderRadius: 4
  },
  progressFillSuccess: {
    backgroundColor: colors.success
  },
  progressSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  reqCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  reqHeaderLeft: {
    flex: 1,
    paddingRight: 10
  },
  reqTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 4
  },
  mandatoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  mandatoryText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.dangerText
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1
  },
  statusApproved: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder
  },
  statusPending: {
    backgroundColor: colors.infoBg,
    borderColor: colors.infoBorder
  },
  statusRejected: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder
  },
  statusMissing: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.border
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  statusApprovedText: {
    color: colors.successText
  },
  statusPendingText: {
    color: colors.infoText
  },
  statusRejectedText: {
    color: colors.dangerText
  },
  statusMissingText: {
    color: colors.textSecondary
  },
  reqDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 6
  },
  rejectionBox: {
    backgroundColor: colors.dangerBg,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  rejectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.dangerText,
    marginBottom: 2
  },
  rejectionBody: {
    fontSize: 11,
    color: colors.dangerText,
    fontStyle: 'italic'
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  templateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark
  },
  viewFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  viewFileBtnText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600'
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
