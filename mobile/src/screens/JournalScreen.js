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
  Sparkles,
  ChevronRight,
  Check,
  AlertCircle,
  Lock
} from 'lucide-react-native';
import api from '../api/client';
import { colors } from '../utils/theme';
import { formatTime12 } from '../utils/timeUtils';

export default function JournalScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [journals, setJournals] = useState([]);
  const [availableDtrDates, setAvailableDtrDates] = useState([]);
  const [summary, setSummary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState(null);

  // Form State
  const [entryDate, setEntryDate] = useState('');
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
        setAvailableDtrDates(res.data.availableDtrDates || []);
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

  const handleOpenNewEntryModal = () => {
    if (!availableDtrDates || availableDtrDates.length === 0) {
      Alert.alert(
        'No DTR Logbook Entries',
        'You can only submit daily journal reflections for dates officially recorded in your DTR attendance logbook. Please record attendance on the workplace scanner first.'
      );
      return;
    }

    const unwrittenDates = availableDtrDates.filter(d => !d.has_journal);
    if (unwrittenDates.length === 0) {
      Alert.alert(
        'All Shifts Completed',
        'You have already written daily journal reflections for all dates recorded in your DTR logbook! Complete your next OJT shift to submit more reflections.'
      );
      return;
    }

    // Default to the most recent unwritten DTR date
    const target = unwrittenDates[0];
    setEntryDate(target.log_date_str);
    setHoursRendered(String(target.hours_rendered || 8));
    setModalOpen(true);
  };

  const handleCreateEntry = async () => {
    if (!entryDate) {
      Alert.alert('Date Required', 'Please select a DTR shift date from your attendance logbook.');
      return;
    }

    const chosenDtr = availableDtrDates.find(d => d.log_date_str === entryDate);
    if (!chosenDtr) {
      Alert.alert('Invalid Date', 'The selected date is not in your official DTR logbook.');
      return;
    }

    if (chosenDtr.has_journal > 0) {
      Alert.alert('Duplicate Entry', 'You have already submitted a journal reflection for this DTR date.');
      return;
    }

    if (!title.trim() || !tasksAccomplished.trim() || !keyLearnings.trim()) {
      Alert.alert('Required Fields', 'Please fill in Title, Tasks Accomplished, and Key Learnings.');
      return;
    }

    setSubmitting(true);
    try {
      const creditedHours = chosenDtr ? Number(chosenDtr.hours_rendered || 0) : Number(hoursRendered || 0);

      const res = await api.post('/student/journals', {
        entry_date: entryDate,
        title: title.trim(),
        tasks_accomplished: tasksAccomplished.trim(),
        key_learnings: keyLearnings.trim(),
        challenges_and_solutions: challenges.trim(),
        hours_rendered: creditedHours
      });

      if (res.success) {
        Alert.alert('Success', 'Internship journal entry saved successfully!');
        setModalOpen(false);
        setTitle('');
        setTasksAccomplished('');
        setKeyLearnings('');
        setChallenges('');
        fetchJournals();
      } else {
        Alert.alert('Submission Error', res.message || 'Could not save journal entry.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderJournalItem = ({ item }) => {
    const isApproved = item.status === 'approved';
    const isPending = item.status === 'submitted' || item.status === 'pending';

    return (
      <TouchableOpacity
        onPress={() => setSelectedJournal(item)}
        style={styles.journalCard}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.weekBadge}>
            <Text style={styles.weekBadgeText}>WEEK {item.week_number || 1}</Text>
          </View>

          <View style={[styles.statusBadge, isApproved ? styles.statusApproved : styles.statusPending]}>
            <Text style={[styles.statusBadgeText, isApproved ? styles.textApproved : styles.textPending]}>
              {isApproved ? 'APPROVED' : 'UNDER REVIEW'}
            </Text>
          </View>
        </View>

        <Text style={styles.journalTitle}>{item.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Calendar size={12} color="#80CBC4" />
            <Text style={styles.metaText}>{item.entry_date}</Text>
          </View>

          <View style={styles.metaItem}>
            <Clock size={12} color="#80CBC4" />
            <Text style={styles.metaText}>{item.hours_rendered || 0} hrs logged</Text>
          </View>
        </View>

        <Text style={styles.previewText} numberOfLines={2}>
          {item.tasks_accomplished}
        </Text>

        <View style={styles.viewDetailLink}>
          <Text style={styles.viewDetailText}>View Details</Text>
          <ChevronRight size={14} color="#FFB433" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={journals}
        keyExtractor={(item) => String(item.journal_id || item.id || Math.random())}
        renderItem={renderJournalItem}
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
            {/* Header Title & CTA Button */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.screenTitle}>Internship Journal</Text>
                <Text style={styles.screenSubtitle}>Weekly reflection and task logs</Text>
              </View>

              <TouchableOpacity
                onPress={handleOpenNewEntryModal}
                style={styles.addBtn}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#193631" />
                <Text style={styles.addBtnText}>New Entry</Text>
              </TouchableOpacity>
            </View>

            {/* Summary Bento */}
            <View style={styles.summaryBento}>
              <View style={styles.bentoItem}>
                <Text style={styles.bentoLabel}>TOTAL ENTRIES</Text>
                <Text style={styles.bentoVal}>{summary?.totalEntries || journals.length}</Text>
              </View>
              <View style={styles.bentoDivider} />
              <View style={styles.bentoItem}>
                <Text style={styles.bentoLabel}>HOURS LOGGED</Text>
                <Text style={styles.bentoVal}>{summary?.totalHours || 0}</Text>
              </View>
              <View style={styles.bentoDivider} />
              <View style={styles.bentoItem}>
                <Text style={styles.bentoLabel}>APPROVED</Text>
                <Text style={[styles.bentoVal, { color: '#80CBC4' }]}>
                  {summary?.approvedEntries || journals.filter(j => j.status === 'approved').length}
                </Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <BookOpen size={36} color="#80CBC4" />
              <Text style={styles.emptyTitle}>No journal entries yet</Text>
              <Text style={styles.emptySubtitle}>
                Document your daily accomplishments and weekly reflections.
              </Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
      />

      {/* New Entry Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>New Journal Reflection</Text>
                <Text style={styles.modalSubtitle}>CHED CMO 104 Student Portfolio Log</Text>
              </View>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <X size={18} color="#80CBC4" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
              {/* Official DTR Attendance Logbook Date Selector */}
              <View style={styles.formField}>
                <View style={styles.dtrLabelRow}>
                  <Text style={styles.fieldLabel}>Official DTR Shift Date</Text>
                  <Text style={styles.dtrRequiredBadge}>REQUIRED • DTR LOGBOOK</Text>
                </View>
                <Text style={styles.dtrHelpText}>
                  CHED policy requires journal entries to link directly to a logged OJT shift.
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dtrPillsContainer}
                >
                  {availableDtrDates.map((dtr) => {
                    const isSelected = entryDate === dtr.log_date_str;
                    const alreadyWritten = Boolean(dtr.has_journal > 0);

                    return (
                      <TouchableOpacity
                        key={dtr.log_date_str}
                        disabled={alreadyWritten}
                        onPress={() => {
                          setEntryDate(dtr.log_date_str);
                          if (dtr.hours_rendered) {
                            setHoursRendered(String(dtr.hours_rendered));
                          }
                        }}
                        style={[
                          styles.dtrCard,
                          isSelected && styles.dtrCardSelected,
                          alreadyWritten && styles.dtrCardDisabled
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dtrCardTop}>
                          <Calendar
                            size={13}
                            color={isSelected ? '#FFB433' : alreadyWritten ? 'rgba(255,255,255,0.3)' : '#80CBC4'}
                          />
                          <Text
                            style={[
                              styles.dtrCardDate,
                              isSelected && styles.dtrCardDateSelected,
                              alreadyWritten && styles.dtrCardDateDisabled
                            ]}
                          >
                            {dtr.log_date_str}
                          </Text>
                          {isSelected && <Check size={14} color="#FFB433" />}
                        </View>

                        <View style={styles.dtrCardBottom}>
                          <Text
                            style={[
                              styles.dtrCardHours,
                              alreadyWritten && styles.dtrCardHoursDisabled
                            ]}
                          >
                            {dtr.hours_rendered || 0} hrs • {formatTime12(dtr.time_in)} - {formatTime12(dtr.time_out)}
                          </Text>
                        </View>

                        {alreadyWritten ? (
                          <View style={styles.dtrWrittenBadge}>
                            <Text style={styles.dtrWrittenBadgeText}>Already Written</Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Credited Shift Hours (Locked & Derived from DTR) */}
              <View style={styles.formField}>
                <View style={styles.dtrLabelRow}>
                  <Text style={styles.fieldLabel}>Credited Shift Hours</Text>
                  <View style={styles.lockedBadge}>
                    <Lock size={10} color="#80CBC4" />
                    <Text style={styles.lockedBadgeText}>LOCKED TO DTR</Text>
                  </View>
                </View>
                <View style={styles.readOnlyInputBox}>
                  <Clock size={16} color="#80CBC4" />
                  <Text style={styles.readOnlyInputText}>
                    {hoursRendered ? `${parseFloat(hoursRendered).toFixed(2)} hrs` : '0.00 hrs'}
                  </Text>
                  <Text style={styles.readOnlyInputSubtext}>
                    Auto-credited from official DTR time-in/out
                  </Text>
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Entry Title</Text>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Backend API Integration & Architecture"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Tasks & Deliverables Accomplished</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={tasksAccomplished}
                  onChangeText={setTasksAccomplished}
                  placeholder="Detail your completed duties and assignments..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Key Learnings & Realizations</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={keyLearnings}
                  onChangeText={setKeyLearnings}
                  placeholder="What professional or technical insights did you gain?"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Challenges & Solutions (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={challenges}
                  onChangeText={setChallenges}
                  placeholder="Obstacles encountered and how you addressed them..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <TouchableOpacity
                onPress={handleCreateEntry}
                disabled={submitting}
                style={styles.submitBtn}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#193631" />
                ) : (
                  <>
                    <Send size={16} color="#193631" />
                    <Text style={styles.submitBtnText}>Submit Journal Entry</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail Bottom Sheet Modal */}
      <Modal
        visible={!!selectedJournal}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedJournal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <View style={styles.weekBadge}>
                  <Text style={styles.weekBadgeText}>WEEK {selectedJournal?.week_number || 1}</Text>
                </View>
                <Text style={[styles.modalTitle, { marginTop: 4 }]}>{selectedJournal?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedJournal(null)} style={styles.closeBtn}>
                <X size={18} color="#80CBC4" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
              <View style={styles.detailMetaRow}>
                <Text style={styles.detailMetaText}>Date: {selectedJournal?.entry_date}</Text>
                <Text style={styles.detailMetaText}>Hours: {selectedJournal?.hours_rendered} hrs</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Tasks Accomplished:</Text>
                <Text style={styles.detailSectionBody}>{selectedJournal?.tasks_accomplished}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Key Learnings:</Text>
                <Text style={styles.detailSectionBody}>{selectedJournal?.key_learnings}</Text>
              </View>

              {selectedJournal?.challenges_and_solutions ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>Challenges & Solutions:</Text>
                  <Text style={styles.detailSectionBody}>{selectedJournal.challenges_and_solutions}</Text>
                </View>
              ) : null}

              {selectedJournal?.mentor_feedback ? (
                <View style={[styles.detailSection, styles.feedbackBox]}>
                  <Text style={styles.feedbackLabel}>Mentor Appraisal:</Text>
                  <Text style={styles.feedbackBody}>{selectedJournal.mentor_feedback}</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFB433',
    shadowColor: '#FFB433',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#193631'
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
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2
  },
  journalCard: {
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
  weekBadge: {
    backgroundColor: 'rgba(38, 166, 154, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(38, 166, 154, 0.4)'
  },
  weekBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#80CBC4',
    letterSpacing: 0.5
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10
  },
  statusApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  statusPending: {
    backgroundColor: 'rgba(255, 180, 51, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 51, 0.4)'
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800'
  },
  textApproved: {
    color: '#80CBC4'
  },
  textPending: {
    color: '#FFB433'
  },
  journalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  metaText: {
    fontSize: 10,
    color: '#80CBC4'
  },
  previewText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16
  },
  viewDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    marginTop: 4
  },
  viewDetailText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFB433',
    textDecorationLine: 'underline'
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
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#122824',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 10
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#80CBC4',
    marginTop: 1
  },
  closeBtn: {
    padding: 4
  },
  formScroll: {
    gap: 12,
    paddingBottom: 24
  },
  formRow: {
    flexDirection: 'row',
    gap: 10
  },
  formField: {
    gap: 4
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#80CBC4'
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    color: '#FFFFFF',
    fontSize: 12
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top'
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFB433',
    borderRadius: 22,
    paddingVertical: 12,
    marginTop: 8
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#193631'
  },
  detailMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  detailMetaText: {
    fontSize: 11,
    color: '#80CBC4',
    fontWeight: '600'
  },
  detailSection: {
    gap: 4
  },
  detailSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFB433',
    letterSpacing: 0.5
  },
  detailSectionBody: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18
  },
  feedbackBox: {
    backgroundColor: 'rgba(38, 166, 154, 0.15)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(38, 166, 154, 0.3)'
  },
  feedbackLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#80CBC4'
  },
  feedbackBody: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 2
  },
  dtrLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dtrRequiredBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFB433',
    letterSpacing: 0.5
  },
  dtrHelpText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 6
  },
  dtrPillsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4
  },
  dtrCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minWidth: 160
  },
  dtrCardSelected: {
    backgroundColor: 'rgba(255, 180, 51, 0.15)',
    borderColor: '#FFB433'
  },
  dtrCardDisabled: {
    opacity: 0.45,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  dtrCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  dtrCardDate: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  dtrCardDateSelected: {
    color: '#FFB433'
  },
  dtrCardDateDisabled: {
    color: 'rgba(255, 255, 255, 0.4)'
  },
  dtrCardBottom: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dtrCardHours: {
    fontSize: 10,
    color: '#80CBC4',
    fontWeight: '600'
  },
  dtrCardHoursDisabled: {
    color: 'rgba(255, 255, 255, 0.4)'
  },
  dtrWrittenBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
    alignSelf: 'flex-start'
  },
  dtrWrittenBadgeText: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: '800'
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(128, 203, 196, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(128, 203, 196, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  lockedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#80CBC4',
    letterSpacing: 0.5
  },
  readOnlyInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  readOnlyInputText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  readOnlyInputSubtext: {
    fontSize: 10,
    color: '#80CBC4',
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right'
  }
});
