import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import {
  BookOpen,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  Lightbulb,
  HelpCircle,
  Star,
  X,
  Send,
  Sparkles
} from 'lucide-react-native';
import api from '../api/client';
import { colors } from '../utils/theme';

export default function JournalScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [journals, setJournals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekNumber, setWeekNumber] = useState('1');
  const [title, setTitle] = useState('');
  const [tasksAccomplished, setTasksAccomplished] = useState('');
  const [keyLearnings, setKeyLearnings] = useState('');
  const [challenges, setChallenges] = useState('');
  const [hoursRendered, setHoursRendered] = useState('8');

  const fetchJournals = useCallback(async () => {
    try {
      const res = await api.get('/student/journals');
      if (res.success && res.data) {
        setJournals(res.data.journals || []);
        setSummary(res.data.summary || null);
      }
    } catch (e) {
      console.warn('Journal fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJournals();
  };

  const handleCreateEntry = async () => {
    if (!title.trim() || !tasksAccomplished.trim() || !keyLearnings.trim()) {
      Alert.alert('Required Fields', 'Please fill in Title, Tasks Accomplished, and Key Learnings.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/student/journals', {
        entry_date: entryDate,
        week_number: parseInt(weekNumber) || 1,
        title: title.trim(),
        tasks_accomplished: tasksAccomplished.trim(),
        key_learnings: keyLearnings.trim(),
        challenges_and_solutions: challenges.trim(),
        hours_rendered: parseFloat(hoursRendered) || 0
      });

      if (res.success) {
        Alert.alert('Success', 'Internship journal entry saved successfully!');
        setModalOpen(false);
        setTitle('');
        setTasksAccomplished('');
        setKeyLearnings('');
        setChallenges('');
        setWeekNumber(String(Math.min(16, (parseInt(weekNumber) || 1) + 1)));
        fetchJournals();
      } else {
        Alert.alert('Submission Notice', res.message || 'Failed to save journal.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit journal entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderJournalItem = ({ item }) => {
    const isReviewed = item.status === 'reviewed';

    return (
      <View style={styles.journalCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.weekBadge}>
              <Text style={styles.weekBadgeText}>Week {item.week_number || 1}</Text>
            </View>
            <View style={styles.dateRow}>
              <Calendar size={13} color={colors.textSecondary} />
              <Text style={styles.dateText}>
                {new Date(item.entry_date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, isReviewed ? styles.statusReviewed : styles.statusSubmitted]}>
            <Text style={[styles.statusBadgeText, isReviewed ? styles.statusReviewedText : styles.statusSubmittedText]}>
              {isReviewed ? 'Reviewed' : 'Submitted'}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.journalTitle}>{item.title}</Text>

        {/* Hours rendered */}
        <View style={styles.hoursRow}>
          <Clock size={13} color={colors.primary} />
          <Text style={styles.hoursText}>
            {parseFloat(item.hours_rendered || 0).toFixed(1)} hours rendered this period
          </Text>
        </View>

        {/* Tasks Section */}
        <View style={styles.contentSection}>
          <View style={styles.sectionTitleRow}>
            <CheckCircle size={14} color={colors.primary} />
            <Text style={styles.sectionTitle}>Tasks Accomplished</Text>
          </View>
          <Text style={styles.sectionBody}>{item.tasks_accomplished}</Text>
        </View>

        {/* Learnings Section */}
        <View style={styles.contentSection}>
          <View style={styles.sectionTitleRow}>
            <Lightbulb size={14} color={colors.warning} />
            <Text style={styles.sectionTitle}>Key Learnings & Takeaways</Text>
          </View>
          <Text style={styles.sectionBody}>{item.key_learnings}</Text>
        </View>

        {/* Challenges Section */}
        {item.challenges_and_solutions ? (
          <View style={styles.contentSection}>
            <View style={styles.sectionTitleRow}>
              <HelpCircle size={14} color={colors.info} />
              <Text style={styles.sectionTitle}>Challenges & Problem Solving</Text>
            </View>
            <Text style={styles.sectionBody}>{item.challenges_and_solutions}</Text>
          </View>
        ) : null}

        {/* Mentor Feedback If Available */}
        {item.mentor_feedback ? (
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <Text style={styles.feedbackTitle}>Mentor Evaluation & Feedback</Text>
              {item.mentor_rating && (
                <View style={styles.ratingRow}>
                  <Star size={13} color="#f59e0b" fill="#f59e0b" />
                  <Text style={styles.ratingText}>{item.mentor_rating} / 5.0</Text>
                </View>
              )}
            </View>
            <Text style={styles.feedbackBody}>"{item.mentor_feedback}"</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>Internship Journal</Text>
          <Text style={styles.screenSubtitle}>Daily Reflections & Practical Learnings</Text>
        </View>
        <TouchableOpacity
          onPress={() => setModalOpen(true)}
          style={styles.newEntryBtn}
          activeOpacity={0.85}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.newEntryBtnText}>New Entry</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Header */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{journals.length}</Text>
          <Text style={styles.summaryLabel}>Total Entries</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{summary?.totalHours || 0}</Text>
          <Text style={styles.summaryLabel}>Hours Documented</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>
            {journals.filter(j => j.status === 'reviewed').length}
          </Text>
          <Text style={styles.summaryLabel}>Mentor Reviewed</Text>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading journal reflections...</Text>
        </View>
      ) : journals.length === 0 ? (
        <View style={styles.emptyBox}>
          <BookOpen size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No journal entries recorded yet</Text>
          <Text style={styles.emptySubtitle}>
            Document your daily achievements, practical problem-solving, and mentor feedback.
          </Text>
          <TouchableOpacity
            onPress={() => setModalOpen(true)}
            style={styles.firstEntryBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.firstEntryBtnText}>Create Your First Journal Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={journals}
          keyExtractor={item => item.journal_id.toString()}
          renderItem={renderJournalItem}
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

      {/* New Entry Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalOpen(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <BookOpen size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>Record Journal Entry</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Row: Date, Week, Hours */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Entry Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={entryDate}
                    onChangeText={setEntryDate}
                    placeholder="2026-10-18"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Week #</Text>
                  <TextInput
                    style={styles.textInput}
                    value={weekNumber}
                    onChangeText={setWeekNumber}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Hours Rendered</Text>
                  <TextInput
                    style={styles.textInput}
                    value={hoursRendered}
                    onChangeText={setHoursRendered}
                    keyboardType="numeric"
                    placeholder="8"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Entry Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Backend API Development & Database Optimization"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Tasks Accomplished */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tasks Accomplished *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={tasksAccomplished}
                  onChangeText={setTasksAccomplished}
                  multiline
                  numberOfLines={4}
                  placeholder="What specific tasks, tickets, or modules did you complete?"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Key Learnings */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Key Learnings & Takeaways *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={keyLearnings}
                  onChangeText={setKeyLearnings}
                  multiline
                  numberOfLines={4}
                  placeholder="What new concepts, tools, or best practices did you learn?"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Challenges */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Challenges Encountered & Solutions</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={challenges}
                  onChangeText={setChallenges}
                  multiline
                  numberOfLines={3}
                  placeholder="Did you encounter any bugs, blockers, or hurdles? How did you resolve them?"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleCreateEntry}
                disabled={submitting}
                style={[styles.submitEntryBtn, submitting && styles.btnDisabled]}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Send size={18} color="#ffffff" />
                    <Text style={styles.submitEntryBtnText}>Save & Submit Journal Entry</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
  newEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14
  },
  newEntryBtnText: {
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
    color: colors.primary,
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
    paddingBottom: 40
  },
  journalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  weekBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  weekBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1
  },
  statusReviewed: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder
  },
  statusSubmitted: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  statusReviewedText: {
    color: colors.successText
  },
  statusSubmittedText: {
    color: colors.warningText
  },
  journalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 6
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  hoursText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  contentSection: {
    backgroundColor: colors.surfaceLow,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text
  },
  sectionBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18
  },
  feedbackCard: {
    backgroundColor: colors.successBg,
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.successBorder
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  feedbackTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.successText
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e'
  },
  feedbackBody: {
    fontSize: 12,
    color: '#065f46',
    fontStyle: 'italic',
    lineHeight: 17
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
  },
  firstEntryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 6
  },
  firstEntryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff'
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.surface
  },
  modalKeyboard: {
    flex: 1
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  modalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: colors.surfaceLow,
    borderRadius: 12
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  formCol: {
    flex: 1
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6
  },
  textInput: {
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.text
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top'
  },
  submitEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8
  },
  btnDisabled: {
    opacity: 0.6
  },
  submitEntryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  }
});
