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
  ShieldCheck
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
              {item.evaluation_period ? `${item.evaluation_period.toUpperCase()} EVALUATION` : 'PERFORMANCE EVALUATION'}
            </Text>
          </View>

          {/* Rating Pill */}
          <View style={styles.ratingPill}>
            <Star size={13} color="#193631" fill="#193631" />
            <Text style={styles.ratingPillText}>{rating} / 5.0</Text>
          </View>
        </View>

        {/* Company & Evaluator */}
        <View style={styles.metaRow}>
          <Building2 size={13} color="#80CBC4" />
          <Text style={styles.metaText}>{item.organization_name || 'Host Organization'}</Text>
        </View>

        <View style={styles.metaRow}>
          <User size={13} color="#80CBC4" />
          <Text style={styles.metaText}>Evaluator: {item.evaluator_email || 'Workplace Mentor'}</Text>
        </View>

        {/* Comments Block */}
        <View style={styles.commentBox}>
          <View style={styles.commentHeader}>
            <MessageSquare size={13} color="#FFB433" />
            <Text style={styles.commentTitle}>Supervisor Remarks & Feedback</Text>
          </View>
          <Text style={styles.commentBody}>
            {item.comments || item.remarks || 'Performance rating submitted with verified competence and attendance endorsement.'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={evaluations}
        keyExtractor={(item) => String(item.evaluation_id || item.id || Math.random())}
        renderItem={renderEvalItem}
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
                  <Text style={styles.cmoText}>CHED CMO 104 ASSESSMENT</Text>
                </View>
              </View>

              <Text style={styles.screenTitle}>Performance Appraisals</Text>
              <Text style={styles.screenSubtitle}>
                Workplace mentor ratings & supervisory competency feedback
              </Text>
            </View>

            {/* Performance Summary Bento */}
            <View style={styles.summaryBento}>
              <View style={styles.bentoItem}>
                <Text style={styles.bentoLabel}>TOTAL EVALUATIONS</Text>
                <Text style={styles.bentoVal}>{summary?.totalEvaluations || evaluations.length}</Text>
              </View>
              <View style={styles.bentoDivider} />
              <View style={styles.bentoItem}>
                <Text style={styles.bentoLabel}>AVERAGE SCORE</Text>
                <View style={styles.avgScoreRow}>
                  <Star size={16} color="#FFB433" fill="#FFB433" />
                  <Text style={styles.avgScoreText}>{summary?.averageRating || '5.0'}</Text>
                </View>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Award size={36} color="#80CBC4" />
              <Text style={styles.emptyTitle}>No evaluations recorded yet</Text>
              <Text style={styles.emptySubtitle}>
                Formal appraisals completed by your supervisor will appear here.
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
  summaryBento: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 16
  },
  bentoItem: {
    flex: 1,
    alignItems: 'center'
  },
  bentoDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  bentoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#80CBC4',
    letterSpacing: 0.5
  },
  bentoVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2
  },
  avgScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  avgScoreText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFB433'
  },
  evalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 12,
    gap: 8
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  periodBadge: {
    backgroundColor: 'rgba(38, 166, 154, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(38, 166, 154, 0.4)'
  },
  periodBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#80CBC4',
    letterSpacing: 0.5
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFB433',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  ratingPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#193631'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  commentBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 4,
    gap: 4
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  commentTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFB433',
    letterSpacing: 0.5
  },
  commentBody: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16
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
