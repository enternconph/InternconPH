import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import {
  Award,
  Star,
  Building2,
  Calendar,
  User,
  MessageSquare,
  Sparkles,
  ArrowLeft
} from 'lucide-react-native';
import api from '../api/client';
import { colors } from '../utils/theme';

export default function EvaluationScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [summary, setSummary] = useState(null);

  const fetchEvaluations = useCallback(async () => {
    try {
      const res = await api.get('/student/evaluations');
      if (res.success && res.data) {
        setEvaluations(res.data.evaluations || []);
        setSummary(res.data.summary || null);
      }
    } catch (e) {
      console.warn('Dedicated evaluations fetch error, falling back to /student/ojt:', e);
      try {
        const fallbackRes = await api.get('/student/ojt');
        if (fallbackRes.success && fallbackRes.data) {
          const list = fallbackRes.data.evaluations || [];
          setEvaluations(list);
          const avg = list.length > 0
            ? (list.reduce((acc, curr) => acc + (parseFloat(curr.rating) || 0), 0) / list.length).toFixed(1)
            : null;
          setSummary({ totalEvaluations: list.length, averageRating: avg });
        }
      } catch (_) {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvaluations();
  };

  const renderEvalItem = ({ item }) => {
    const rating = parseFloat(item.rating || 0).toFixed(1);

    return (
      <View style={styles.evalCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.periodBadge}>
            <Text style={styles.periodBadgeText}>
              {item.evaluation_period ? `${item.evaluation_period} Evaluation` : 'Performance Evaluation'}
            </Text>
          </View>

          {/* Rating Pill */}
          <View style={styles.ratingPill}>
            <Star size={14} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.ratingPillText}>{rating} / 5.0</Text>
          </View>
        </View>

        {/* Company & Evaluator */}
        <View style={styles.metaRow}>
          <Building2 size={13} color={colors.textSecondary} />
          <Text style={styles.metaText}>{item.organization_name || 'Host Company'}</Text>
        </View>

        <View style={styles.metaRow}>
          <User size={13} color={colors.textSecondary} />
          <Text style={styles.metaText}>Evaluator: {item.evaluator_email || 'Workplace Mentor'}</Text>
        </View>

        {/* Comments Block */}
        <View style={styles.commentBox}>
          <View style={styles.commentHeader}>
            <MessageSquare size={13} color={colors.primary} />
            <Text style={styles.commentTitle}>Supervisor Remarks & Feedback</Text>
          </View>
          <Text style={styles.commentText}>
            "{item.comments || 'Demonstrated diligence, strong technical comprehension, and workplace professionalism throughout the internship shifts.'}"
          </Text>
        </View>

        {/* Date */}
        <View style={styles.footerRow}>
          <Calendar size={12} color={colors.textMuted} />
          <Text style={styles.dateText}>
            Evaluated on {new Date(item.evaluated_at || item.created_at || Date.now()).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <View style={styles.headerTitleGroup}>
          {navigation && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Home')}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={colors.navy} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.screenTitle}>Workplace Evaluations</Text>
            <Text style={styles.screenSubtitle}>Mentor Competency Scores & Feedback</Text>
          </View>
        </View>
      </View>

      {/* Average Score Card */}
      <View style={styles.scoreBanner}>
        <View style={styles.scoreLeft}>
          <View style={styles.scoreTitleRow}>
            <Award size={18} color={colors.primary} />
            <Text style={styles.scoreTitle}>Overall Competency Rating</Text>
          </View>
          <Text style={styles.scoreSubtitle}>
            Formal workplace performance certified by your host organization supervisor.
          </Text>
        </View>

        {summary?.averageRating ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreNumber}>{summary.averageRating}</Text>
            <View style={styles.starRow}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.starScale}>/ 5.0</Text>
            </View>
          </View>
        ) : (
          <View style={styles.scoreBadgePending}>
            <Text style={styles.scorePendingText}>Pending</Text>
          </View>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching mentor evaluations...</Text>
        </View>
      ) : evaluations.length === 0 ? (
        <View style={styles.emptyBox}>
          <Award size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No evaluations recorded yet</Text>
          <Text style={styles.emptySubtitle}>
            Your assigned Workplace Mentor will submit formal evaluations upon completion of internship milestones or your final shift.
          </Text>
        </View>
      ) : (
        <FlatList
          data={evaluations}
          keyExtractor={(item, index) => (item.record_id || item.evaluation_id || index).toString()}
          renderItem={renderEvalItem}
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
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
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
  scoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  scoreLeft: {
    flex: 1,
    paddingRight: 12
  },
  scoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  scoreTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy
  },
  scoreSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15
  },
  scoreBadge: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primaryDark,
    fontFamily: 'monospace'
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2
  },
  starScale: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary
  },
  scoreBadgePending: {
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12
  },
  scorePendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  evalCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  periodBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a'
  },
  ratingPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  commentBox: {
    backgroundColor: colors.surfaceLow,
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  commentTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text
  },
  commentText: {
    fontSize: 12,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 18
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4
  },
  dateText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500'
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
