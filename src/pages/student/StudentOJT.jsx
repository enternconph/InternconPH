import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { resolveFileUrl, formatFileSize, getFileIcon } from '../../utils/fileHelper';
import StudentAttendanceQrModal from '../../components/Student/StudentAttendanceQrModal';
import { formatPHT12Hour } from '../../utils/timeFormat';

export default function StudentOJT() {
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  
  // Support 'requirements', 'clearance', 'checklist', 'evaluations', 'journal', 'dtr'
  const initialTab = (urlTab === 'requirements' || urlTab === 'clearance' || urlTab === 'checklist')
    ? 'requirements'
    : (urlTab === 'evaluations' ? 'evaluations' : (urlTab === 'journal' ? 'journal' : 'dtr'));

  const [activeTab, setActiveTab] = useState(initialTab);
  const [ojtData, setOjtData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [journals, setJournals] = useState([]);
  const [journalSummary, setJournalSummary] = useState(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalSubmitting, setJournalSubmitting] = useState(false);
  const [journalForm, setJournalForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    week_number: 1,
    title: '',
    tasks_accomplished: '',
    key_learnings: '',
    challenges_and_solutions: '',
    hours_rendered: 8
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(false);
  const [toast, setToast] = useState({ message: '', isError: false });

  // Filter and search states
  const [dtrSearch, setDtrSearch] = useState('');
  const [reqFilter, setReqFilter] = useState('all'); // 'all' | 'mandatory' | 'pending' | 'approved'

  // Requirement Submission State
  const [selectedReq, setSelectedReq] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [filePathText, setFilePathText] = useState('');

  // Certificate State
  const [certificates, setCertificates] = useState([]);
  const [viewCert, setViewCert] = useState(null);

  // Dynamic Attendance QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [viewJournalEntry, setViewJournalEntry] = useState(null);

  useEffect(() => {
    if (urlTab) {
      if (urlTab === 'requirements' || urlTab === 'clearance' || urlTab === 'checklist') {
        setActiveTab('requirements');
      } else if (urlTab === 'evaluations' || urlTab === 'journal' || urlTab === 'dtr') {
        setActiveTab(urlTab);
      }
    }
  }, [urlTab]);

  const fetchAllOjtData = useCallback(async () => {
    try {
      const [ojtRes, attRes, reqRes, certRes, journalRes] = await Promise.all([
        api.get('/student/ojt'),
        api.get('/student/attendance'),
        api.get('/student/requirements'),
        api.get('/student/certificates'),
        api.get('/student/journals')
      ]);

      if (ojtRes.success && ojtRes.data) {
        setOjtData(ojtRes.data);
      }
      if (attRes.success && attRes.data) {
        setAttendanceData(attRes.data);
      }
      if (reqRes.success && reqRes.data) {
        setRequirements(reqRes.data);
      }
      if (certRes.success && certRes.data) {
        setCertificates(certRes.data);
      }
      if (journalRes.success && journalRes.data) {
        setJournals(journalRes.data.journals || []);
        setJournalSummary(journalRes.data.summary || null);
      }
    } catch (err) {
      console.error('Fetch student OJT data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllOjtData();
  }, [fetchAllOjtData]);

  // Real-time synchronization
  useRealtimeRefresh(fetchAllOjtData);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast({ message: '', isError: false }), 4500);
  };

  // Robust File Downloader for DOCX, PDF, and Documents
  const handleDownloadTemplate = async (e, url, title) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!url) return;
    try {
      setDownloadingFile(true);
      showToast('Downloading document...');
      const fullUrl = resolveFileUrl(url);
      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error('Download network response error');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Compute safe filename with original extension
      const rawExt = url.split('.').pop()?.split('?')[0] || 'docx';
      const cleanName = title
        ? `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${rawExt}`
        : url.split('/').pop() || 'document.docx';
      
      link.setAttribute('download', cleanName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showToast('File downloaded successfully!');
    } catch (err) {
      console.warn('Blob download fallback:', err);
      window.open(resolveFileUrl(url), '_blank');
    } finally {
      setDownloadingFile(false);
    }
  };

  const uploadRequirementFile = async () => {
    if (uploadFile) {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await api.post('/student/requirements/upload', formData);
      const resolvedUrl = res.url || res.file_url || res.data?.url || res.data?.file_url || res.data?.file_path;
      if (res.success && resolvedUrl) {
        return resolvedUrl;
      } else {
        throw new Error(res.message || 'Failed to upload document.');
      }
    }
    if (filePathText.trim()) {
      return filePathText.trim();
    }
    return selectedReq?.file_url || selectedReq?.submitted_file || null;
  };

  const handleSaveDraft = async (e) => {
    if (e) e.preventDefault();
    if (!selectedReq) return;
    setActionLoading(true);
    try {
      const fileUrl = await uploadRequirementFile();
      if (!fileUrl) {
        showToast('Please select a file to save as draft.', true);
        setActionLoading(false);
        return;
      }
      const res = await api.post(`/student/requirements/${selectedReq.requirement_id}/save`, {
        file_path: fileUrl
      });
      if (res.success) {
        showToast('Document saved as draft! You can review or replace it before submitting.');
        setSelectedReq(null);
        setUploadFile(null);
        setFilePathText('');
        fetchAllOjtData();
      } else {
        showToast(res.message || 'Failed to save draft.', true);
      }
    } catch (err) {
      showToast(err.message || 'Error saving draft.', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitRequirement = async (e) => {
    if (e) e.preventDefault();
    if (!selectedReq) return;
    setActionLoading(true);
    try {
      const fileUrl = await uploadRequirementFile();
      if (!fileUrl) {
        showToast('Please select a file to submit.', true);
        setActionLoading(false);
        return;
      }
      const res = await api.post(`/student/requirements/${selectedReq.requirement_id}/submit`, {
        file_path: fileUrl
      });
      if (res.success) {
        showToast(res.message || 'Document officially submitted for institutional review!');
        setSelectedReq(null);
        setUploadFile(null);
        setFilePathText('');
        fetchAllOjtData();
      } else {
        showToast(res.message || 'Submission failed.', true);
      }
    } catch (err) {
      showToast(err.message || 'Error submitting document.', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateJournal = async (e) => {
    if (e) e.preventDefault();
    if (!journalForm.title.trim() || !journalForm.tasks_accomplished.trim() || !journalForm.key_learnings.trim()) {
      showToast('Please complete entry title, tasks, and key learnings.', true);
      return;
    }
    setJournalSubmitting(true);
    try {
      const res = await api.post('/student/journals', {
        ...journalForm,
        hours_rendered: parseFloat(journalForm.hours_rendered) || 0,
        week_number: parseInt(journalForm.week_number) || 1
      });
      if (res.success) {
        showToast('Internship journal entry successfully saved!');
        setJournalModalOpen(false);
        setJournalForm({
          entry_date: new Date().toISOString().split('T')[0],
          week_number: Math.min(16, (parseInt(journalForm.week_number) || 1) + 1),
          title: '',
          tasks_accomplished: '',
          key_learnings: '',
          challenges_and_solutions: '',
          hours_rendered: 8
        });
        fetchAllOjtData();
      } else {
        showToast(res.message || 'Failed to save journal.', true);
      }
    } catch (err) {
      showToast(err.message || 'Error saving journal.', true);
    } finally {
      setJournalSubmitting(false);
    }
  };

  if (loading && !ojtData) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-vibrant-orange border-t-transparent"></div>
      </div>
    );
  }

  const activeRecord = ojtData?.records?.find((r) => r.status === 'ongoing' || r.status === 'active') || ojtData?.records?.[0];
  const reqHours = activeRecord?.required_hours || ojtData?.requiredHours || 600;
  const doneHours = activeRecord ? activeRecord.rendered_hours || 0 : 0;
  const progressPct = reqHours > 0 ? Math.min(100, Math.round((doneHours / reqHours) * 100)) : 0;
  const remainingHours = Math.max(0, reqHours - doneHours);

  const todayLog = attendanceData?.todayLog;
  const isClockedInToday = todayLog && todayLog.time_in;
  const isClockedOutToday = todayLog && todayLog.time_out;

  // Filtered DTR logs
  const filteredDtrLogs = (attendanceData?.logs || []).filter((log) => {
    if (!dtrSearch.trim()) return true;
    const q = dtrSearch.toLowerCase();
    return (
      log.organization_name?.toLowerCase().includes(q) ||
      log.log_date?.toLowerCase().includes(q) ||
      log.tasks_accomplished?.toLowerCase().includes(q) ||
      log.status?.toLowerCase().includes(q)
    );
  });

  // Filtered clearance requirements
  const filteredReqs = requirements.filter((req) => {
    if (reqFilter === 'mandatory') return !!req.is_mandatory;
    if (reqFilter === 'pending') return !req.submission_status || req.submission_status === 'draft';
    if (reqFilter === 'approved') return req.submission_status === 'approved' || req.submission_status === 'submitted';
    return true;
  });

  const approvedReqsCount = requirements.filter((r) => r.submission_status === 'approved' || r.submission_status === 'submitted').length;
  const totalReqsCount = requirements.length;
  const reqsProgressPct = totalReqsCount > 0 ? Math.round((approvedReqsCount / totalReqsCount) * 100) : 0;

  // Evaluations summary calculation
  const evaluationsList = ojtData?.evaluations || [];
  const avgRating = evaluationsList.length > 0
    ? (evaluationsList.reduce((acc, curr) => acc + (parseFloat(curr.rating) || 0), 0) / evaluationsList.length).toFixed(1)
    : null;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface">OJT Progress & Daily Time Record</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Workplace Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Track daily mentor-certified hours, complete institutional clearance requirements, and view workplace evaluations.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-surface-container p-1 rounded-2xl border border-outline-variant flex-wrap gap-1 max-w-full overflow-x-auto shadow-xs">
          <button
            onClick={() => setActiveTab('dtr')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'dtr'
                ? 'bg-surface text-vibrant-orange shadow-sm ring-1 ring-outline-variant/60 font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">timelapse</span>
            <span>Daily Time Record</span>
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'journal'
                ? 'bg-surface text-vibrant-orange shadow-sm ring-1 ring-outline-variant/60 font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            <span>Internship Journal</span>
            {journals.length > 0 && (
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-orange-tint text-vibrant-orange">
                {journals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('requirements')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'requirements'
                ? 'bg-surface text-vibrant-orange shadow-sm ring-1 ring-outline-variant/60 font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
            <span>Clearance Checklist</span>
            {totalReqsCount > 0 && (
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                approvedReqsCount === totalReqsCount ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-tint text-vibrant-orange'
              }`}>
                {approvedReqsCount}/{totalReqsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('evaluations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'evaluations'
                ? 'bg-surface text-vibrant-orange shadow-sm ring-1 ring-outline-variant/60 font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">rate_review</span>
            <span>Evaluations</span>
            {evaluationsList.length > 0 && (
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface">
                {evaluationsList.length}
              </span>
            )}
          </button>
          <Link
            to="/dashboard/student/schedule"
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 text-on-surface-variant hover:text-vibrant-orange hover:bg-surface/80"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span>Work Schedule & Shifts</span>
          </Link>
          {certificates.length > 0 && (
            <button
              type="button"
              onClick={() => setViewCert(certificates[0])}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
              <span>OJT Certificate</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Alert */}
      {toast.message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 border shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.isError
              ? 'bg-error-container text-error border-error/20'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">
            {toast.isError ? 'error' : 'check_circle'}
          </span>
          <span className="flex-1">{toast.message}</span>
        </div>
      )}

      {/* Hours Overview Hero Card */}
      <div className="bento-card bg-gradient-to-r from-orange-tint/50 via-surface to-surface border border-vibrant-orange/20 space-y-4 shadow-sm">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-vibrant-orange text-white flex items-center justify-center shadow-md shadow-vibrant-orange/20 shrink-0">
              <span className="material-symbols-outlined text-[26px]">apartment</span>
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-vibrant-orange block">
                Current OJT Placement & Host Organization
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-on-surface">
                {activeRecord?.organization_name || 'No Active Host Organization Assigned'}
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {activeRecord?.industry || 'Industry Partner'} • Status: <span className="uppercase font-bold text-on-surface">{activeRecord?.status || 'UNASSIGNED'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-vibrant-orange font-mono">
                {doneHours} <span className="text-base font-normal text-on-surface-variant">/ {reqHours} hrs</span>
              </span>
              <span className="text-xs font-bold text-on-surface-variant block">
                {remainingHours > 0 ? `${remainingHours} hrs remaining` : 'OJT Hours Fulfilled'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar with Milestones */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-bold text-on-surface-variant">
            <span>Overall Training Completion</span>
            <span className="text-vibrant-orange font-mono font-black">{progressPct}%</span>
          </div>
          <div className="w-full bg-surface-container-high h-4 rounded-full overflow-hidden p-0.5 border border-outline-variant/60">
            <div
              className="bg-gradient-to-r from-vibrant-orange to-deep-orange h-full rounded-full transition-all duration-700 shadow-inner"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY TIME RECORD (DTR) & MENTOR CERTIFICATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'dtr' && (
        <div className="space-y-6">
          {/* Completed Hours Celebration Banner */}
          {(doneHours >= reqHours || activeRecord?.status === 'completed') && (
            <div className="p-5 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 rounded-2xl flex items-start gap-4 text-emerald-950 dark:text-emerald-100 shadow-xs">
              <span className="material-symbols-outlined text-emerald-600 text-3xl shrink-0 mt-0.5">verified</span>
              <div className="space-y-1 flex-1">
                <h4 className="font-bold text-sm sm:text-base text-emerald-950 dark:text-emerald-100">
                  Required OJT Training Hours Satisfied ({doneHours} / {reqHours} hrs)
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                  Congratulations! You have fulfilled your required training hours. Daily Time Record shifts have been finalized. Please ensure your Clearance Checklist documents are fully submitted and approved for final certificate release.
                </p>
              </div>
              {certificates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewCert(certificates[0])}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                  <span>View Certificate</span>
                </button>
              )}
            </div>
          )}

          {/* Today's Daily Time Record Widget */}
          <div className="bento-card space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-4 pb-2 border-b border-outline-variant">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[28px]">schedule</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-on-surface">Today's Daily Time Record</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant border border-outline-variant uppercase">
                      Mentor Supervised
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Action Buttons & Status Badge */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-vibrant-orange to-deep-orange hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                  <span>My Attendance QR</span>
                </button>

                {todayLog?.status === 'rejected' ? (
                  <span className="px-3.5 py-1.5 bg-red-500/15 text-red-700 dark:text-red-300 rounded-full text-xs font-bold flex items-center gap-1.5 border border-red-500/30">
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    <span>Attendance Rejected / Failed</span>
                  </span>
                ) : isClockedOutToday ? (
                  <span className="px-3.5 py-1.5 bg-green-tint text-pinoy-green rounded-full text-xs font-bold flex items-center gap-1.5 border border-pinoy-green/20">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Time-Out Successful • {todayLog.hours_rendered || 0} hrs Credited</span>
                  </span>
                ) : isClockedInToday ? (
                  <span className="px-3.5 py-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-500/20">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Time-In Successful • On Duty</span>
                  </span>
                ) : (
                  <span className="px-3.5 py-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold flex items-center gap-1.5 border border-amber-500/20">
                    <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                    <span>Awaiting Time-In</span>
                  </span>
                )}
              </div>
            </div>

            {/* High-Visibility Attendance Status Indicator Banner */}
            {todayLog?.status === 'rejected' ? (
              <div className="p-4 bg-red-50/90 dark:bg-red-950/30 border border-red-500/30 rounded-2xl flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-600 text-[26px] shrink-0 mt-0.5">error</span>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black uppercase tracking-wide text-red-900 dark:text-red-200">
                      Attendance Verification Rejected / Failed
                    </h4>
                    <p className="text-xs text-red-800 dark:text-red-300">
                      {todayLog.rejection_notes || 'Your shift log was not approved by your workplace mentor. Please consult with your supervisor.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : isClockedOutToday ? (
              <div className="p-4 bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <span className="material-symbols-outlined text-[24px]">verified</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black uppercase tracking-wide text-emerald-900 dark:text-emerald-100">
                        Time-Out Recorded Successfully • Shift Completed
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white">
                        {todayLog.hours_rendered || 0} hrs
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-0.5">
                      In: {formatPHT12Hour(todayLog.time_in)} • Out: {formatPHT12Hour(todayLog.time_out)} • Automatically Recorded & Credited
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="px-3 py-1.5 bg-surface text-on-surface hover:bg-surface-container border border-outline-variant rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  View Attendance Token
                </button>
              </div>
            ) : isClockedInToday ? (
              <div className="p-4 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/35 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 relative">
                    <span className="material-symbols-outlined text-[24px]">schedule</span>
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black uppercase tracking-wide text-emerald-950 dark:text-emerald-100">
                        Time-In Recorded Successfully • On Duty
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                        todayLog.time_in_status === 'late'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {todayLog.time_in_status === 'late' ? 'Late Arrival' : 'On-Time Arrival'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-0.5">
                      Clocked in at {formatPHT12Hour(todayLog.time_in)}. Shift is currently running. Present your Dynamic QR code to HR before departing to Time-Out.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="px-3.5 py-1.5 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Scan for Time-Out</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/25 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-vibrant-orange text-[26px] shrink-0">lock_clock</span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide text-on-surface">
                      Awaiting Time-In • Dynamic QR Required
                    </h4>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Present your live rotating QR code to your Hiring Organization HR Scanner at the office entrance to record Time-In. Screenshots are strictly expired and invalid.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="px-3.5 py-1.5 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                  <span>Generate Dynamic QR</span>
                </button>
              </div>
            )}

            {/* DTR Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* Mentor Box */}
              <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Assigned Workplace Mentor
                </span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange text-[18px]">person</span>
                  <span className="text-xs font-bold text-on-surface truncate">
                    {(activeRecord?.mentor_first_name && activeRecord?.mentor_last_name)
                      ? `${activeRecord.mentor_first_name} ${activeRecord.mentor_last_name}`
                      : (todayLog?.mentor_first_name && todayLog?.mentor_last_name)
                      ? `${todayLog.mentor_first_name} ${todayLog.mentor_last_name}`
                      : activeRecord?.supervisor_name || 'Assigned Workplace Mentor'}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant truncate">
                  {activeRecord?.mentor_title || activeRecord?.organization_name || 'Host Employer'}
                </p>
              </div>

              {/* Time In Box */}
              <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Time-In (PST UTC+8)
                  </span>
                  {todayLog?.time_in && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                      todayLog.time_in_status === 'late'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {todayLog.time_in_status === 'late' ? 'Late' : 'On-Time'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">login</span>
                  <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {todayLog?.time_in ? formatPHT12Hour(todayLog.time_in) : '—'}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  {todayLog?.time_in ? `Recorded at ${formatPHT12Hour(todayLog.time_in)}` : 'Pending arrival clock'}
                </p>
              </div>

              {/* Time Out Box */}
              <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Time-Out (PST UTC+8)
                  </span>
                  {todayLog?.time_out && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                      todayLog.time_out_status === 'early'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : todayLog.time_out_status === 'overtime'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {todayLog.time_out_status === 'early' ? 'Early' : todayLog.time_out_status === 'overtime' ? 'Overtime (Capped)' : 'On-Time'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange text-[18px]">logout</span>
                  <span className="text-base font-bold font-mono text-vibrant-orange">
                    {todayLog?.time_out ? formatPHT12Hour(todayLog.time_out) : (isClockedInToday ? 'In Progress' : '—')}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  {todayLog?.time_out ? `${todayLog.hours_rendered || 0} hrs credited` : 'Pending departure clock'}
                </p>
              </div>

              {/* Hours Credited Box */}
              <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Today's Rendered Hours
                </span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 text-[18px]">hourglass_bottom</span>
                  <span className="text-base font-bold font-mono text-purple-700 dark:text-purple-400">
                    {todayLog?.hours_rendered ? `${parseFloat(todayLog.hours_rendered).toFixed(2)} hrs` : '0.00 hrs'}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  {isClockedOutToday ? 'Certified by supervisor' : 'Calculated upon time-out'}
                </p>
              </div>
            </div>

            {/* Overtime Policy & Supervision Notice */}
            <div className="p-3.5 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 rounded-2xl flex items-start gap-3 text-xs text-blue-950 dark:text-blue-100">
              <span className="material-symbols-outlined text-[20px] text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">verified_user</span>
              <div className="space-y-0.5">
                <p className="font-bold text-blue-950 dark:text-blue-100">PST Standardized Recording & Overtime Policy</p>
                <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed">
                  Daily attendance is managed in Philippine Standard Time (PST UTC+8). Any overtime rendered past daily schedule is capped and not credited toward required training hours in adherence with academic OJT guidelines.
                </p>
              </div>
            </div>
          </div>

          {/* Attendance History Table */}
          <div className="bento-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange text-[22px]">history</span>
                <div>
                  <h3 className="font-bold text-base text-on-surface">Daily Attendance Logs & Mentor Certifications</h3>
                  <p className="text-xs text-on-surface-variant">Complete audit history of daily recorded shift hours</p>
                </div>
              </div>

              {/* Search / Filter */}
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-on-surface-variant pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search logs by date, task..."
                  value={dtrSearch}
                  onChange={(e) => setDtrSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none focus:ring-2 focus:ring-vibrant-orange"
                />
              </div>
            </div>

            {filteredDtrLogs.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant space-y-2">
                <span className="material-symbols-outlined text-[48px] text-outline">history_toggle_off</span>
                <p className="text-sm font-bold text-on-surface">No attendance logs recorded yet.</p>
                <p className="text-xs max-w-sm mx-auto">Your Workplace Mentor will log and certify your daily time-in and time-out as you complete internship duties.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-outline-variant/70 shadow-xs">
                <table className="w-full min-w-[700px] text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant text-[11px] uppercase tracking-wider font-extrabold border-b border-outline-variant">
                      <th className="py-3.5 px-4 sm:px-5">Date & Host</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Shift Timing (PST)</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Rendered & Status</th>
                      <th className="py-3.5 px-4">Tasks Accomplished</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 bg-surface">
                    {filteredDtrLogs.map((log) => (
                      <tr key={log.attendance_id} className="hover:bg-surface-container-low/60 transition-colors">
                        {/* Date & Host */}
                        <td className="py-3.5 px-4 sm:px-5">
                          <p className="font-bold text-xs text-on-surface whitespace-nowrap">
                            {new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <div className="flex items-center gap-1.5 font-medium text-[11px] text-on-surface-variant whitespace-nowrap mt-0.5">
                            <span className="material-symbols-outlined text-[14px] text-vibrant-orange shrink-0">apartment</span>
                            <span className="truncate max-w-[170px]" title={log.organization_name}>{log.organization_name}</span>
                          </div>
                        </td>

                        {/* Shift Timing */}
                        <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-on-surface">
                              In: {log.time_in ? formatPHT12Hour(log.time_in) : '—'}
                            </span>
                            {log.time_in && (
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                log.time_in_status === 'late'
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                              }`}>
                                {log.time_in_status === 'late' ? 'Late' : 'On-Time'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-on-surface-variant text-[11px]">
                              Out: {log.time_out ? formatPHT12Hour(log.time_out) : log.time_in ? 'In Progress...' : '—'}
                            </span>
                            {log.time_out && (
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                log.time_out_status === 'early'
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                                  : log.time_out_status === 'overtime'
                                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                              }`}>
                                {log.time_out_status === 'early' ? 'Early' : log.time_out_status === 'overtime' ? 'OT' : 'On-Time'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Hours & Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                          <div className="font-mono font-extrabold text-on-surface mb-1">
                            {log.hours_rendered ? `${parseFloat(log.hours_rendered).toFixed(2)} hrs` : '0.00 hrs'}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold capitalize ${
                              log.status === 'rejected'
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                : log.time_out
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {log.status === 'rejected' ? 'cancel' : log.time_out ? 'verified' : 'schedule'}
                            </span>
                            <span>{log.status === 'rejected' ? 'Rejected' : log.time_out ? 'Recorded' : 'On Duty'}</span>
                          </span>
                        </td>

                        {/* Tasks Accomplished */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2" title={log.tasks_accomplished || ''}>
                            {log.tasks_accomplished || 'Daily internship tasks completed.'}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: INTERNSHIP JOURNAL */}
      {/* ========================================================================= */}
      {activeTab === 'journal' && (
        <div className="space-y-6">
          {/* Journal Summary Banner */}
          <div className="bento-card bg-gradient-to-r from-orange-500/10 via-surface to-surface border border-vibrant-orange/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange text-2xl">menu_book</span>
                  <h3 className="font-bold text-base sm:text-lg text-on-surface">Daily & Weekly Internship Journal</h3>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Record daily tasks, technical breakthroughs, practical challenges, and reflections verified by your Workplace Mentor.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-4 bg-surface-container p-2.5 rounded-2xl border border-outline-variant">
                  <div className="text-right">
                    <span className="text-xl font-black text-vibrant-orange font-mono">
                      {journals.length}
                    </span>
                    <span className="text-[10px] font-bold text-on-surface-variant block">Entries</span>
                  </div>
                  <div className="h-6 w-px bg-outline-variant"></div>
                  <div className="text-right">
                    <span className="text-xl font-black text-emerald-600 font-mono">
                      {journalSummary?.totalHours || 0}
                    </span>
                    <span className="text-[10px] font-bold text-on-surface-variant block">Hrs Logged</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setJournalModalOpen(true)}
                  className="px-4 py-2.5 bg-vibrant-orange text-white text-xs font-bold rounded-xl hover:bg-deep-orange transition-all flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>New Entry</span>
                </button>
              </div>
            </div>
          </div>

          {/* Journal Entries List */}
          {journals.length === 0 ? (
            <div className="bento-card text-center py-12 text-on-surface-variant space-y-3">
              <span className="material-symbols-outlined text-[52px] text-outline">history_edu</span>
              <p className="text-sm font-bold text-on-surface">No journal entries recorded yet.</p>
              <p className="text-xs max-w-sm mx-auto">
                Maintain an ongoing log of your daily responsibilities, learnings, and problem resolutions to document your OJT milestones.
              </p>
              <button
                type="button"
                onClick={() => setJournalModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-vibrant-orange text-white rounded-xl text-xs font-bold hover:bg-deep-orange transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Create First Journal Entry</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {journals.map((entry) => (
                <div
                  key={entry.journal_id}
                  className="bento-card p-4 hover:border-vibrant-orange/40 transition-all border border-outline-variant flex flex-col justify-between gap-3"
                >
                  {/* Item 1: Week & Date */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-orange-tint text-vibrant-orange border border-vibrant-orange/20">
                        Week {entry.week_number || 1}
                      </span>
                      <span className="text-xs font-medium text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {new Date(entry.entry_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Item 2: Status Badge */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      entry.status === 'reviewed'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                    }`}>
                      <span className="material-symbols-outlined text-[13px]">
                        {entry.status === 'reviewed' ? 'verified' : 'schedule'}
                      </span>
                      {entry.status === 'reviewed' ? 'Reviewed' : 'Submitted'}
                    </span>
                  </div>

                  {/* Item 3: Title & Tasks Excerpt */}
                  <div>
                    <h4 className="text-sm font-bold text-on-surface line-clamp-1">{entry.title}</h4>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                      {entry.tasks_accomplished || entry.key_learnings || 'No task descriptions recorded.'}
                    </p>
                  </div>

                  {/* Item 4: Hours Rendered & View Detail Action */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-outline-variant/50">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-surface-container text-on-surface">
                      {parseFloat(entry.hours_rendered || 0).toFixed(1)} hrs rendered
                    </span>

                    <button
                      type="button"
                      onClick={() => setViewJournalEntry(entry)}
                      className="px-2.5 py-1.5 rounded-lg bg-vibrant-orange/10 hover:bg-vibrant-orange/20 text-vibrant-orange text-xs font-bold transition-colors inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>View Detail</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CLEARANCE CHECKLIST & DOCUMENT SUBMISSION */}
      {/* ========================================================================= */}
      {activeTab === 'requirements' && (
        <div className="space-y-6">
          {/* Progress Summary Card */}
          <div className="bento-card bg-gradient-to-r from-blue-500/10 via-surface to-surface border border-blue-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">assignment_turned_in</span>
                  <h3 className="font-bold text-base sm:text-lg text-on-surface">Institutional Clearance Checklist</h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Download templates, complete documentation, and upload required clearance files for OJT Coordinator review.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                    {approvedReqsCount} / {totalReqsCount}
                  </span>
                  <span className="text-xs font-bold text-on-surface-variant block">Documents Submitted</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                <span>Clearance Verification Progress</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">{reqsProgressPct}%</span>
              </div>
              <div className="w-full bg-surface-container-high h-3 rounded-full overflow-hidden border border-outline-variant/60">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${reqsProgressPct}%` }}
                ></div>
              </div>
            </div>

            {totalReqsCount > 0 && approvedReqsCount === totalReqsCount && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[22px]">verified</span>
                <div>
                  <p className="font-black text-sm">All Requirements Successfully Submitted!</p>
                  <p className="text-[11px] font-medium opacity-90">You have completed all institutional OJT clearance requirements.</p>
                </div>
              </div>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
            <div className="flex bg-surface-container p-1 rounded-xl border border-outline-variant gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setReqFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  reqFilter === 'all' ? 'bg-surface text-on-surface shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All ({requirements.length})
              </button>
              <button
                type="button"
                onClick={() => setReqFilter('mandatory')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  reqFilter === 'mandatory' ? 'bg-surface text-rose-600 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Mandatory ({requirements.filter((r) => r.is_mandatory).length})
              </button>
              <button
                type="button"
                onClick={() => setReqFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  reqFilter === 'pending' ? 'bg-surface text-amber-600 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Pending Submission ({requirements.filter((r) => !r.submission_status || r.submission_status === 'draft').length})
              </button>
              <button
                type="button"
                onClick={() => setReqFilter('approved')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  reqFilter === 'approved' ? 'bg-surface text-emerald-600 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Submitted ({requirements.filter((r) => r.submission_status === 'approved' || r.submission_status === 'submitted').length})
              </button>
            </div>
          </div>

          {/* Requirements List */}
          {filteredReqs.length === 0 ? (
            <div className="bento-card text-center py-12 text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-[48px] text-outline">checklist</span>
              <p className="text-sm font-bold text-on-surface">No clearance requirements found in this filter.</p>
              <p className="text-xs">Your institution will publish clearance documents for your degree program.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredReqs.map((req) => (
                <div
                  key={req.requirement_id}
                  className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant hover:border-vibrant-orange/40 transition-all space-y-4 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Document Type Icon */}
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">
                            {req.document_template_url?.toLowerCase().includes('.doc') ? 'description' : 'article'}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm sm:text-base text-on-surface">
                          {req.title || req.requirement_name}
                        </h4>
                        
                        {req.is_mandatory ? (
                          <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold rounded-full border border-rose-500/20 uppercase tracking-wider">
                            Mandatory
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded-full">
                            Optional
                          </span>
                        )}

                        <span
                          className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            req.submission_status === 'approved' || req.submission_status === 'submitted'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : req.submission_status === 'draft'
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                              : 'bg-surface-container text-on-surface-variant border-outline-variant'
                          }`}
                        >
                          {req.submission_status === 'approved' || req.submission_status === 'submitted'
                            ? 'Successfully Submitted'
                            : req.submission_status === 'draft'
                            ? 'Saved Draft'
                            : 'Pending Submission'}
                        </span>
                      </div>

                      <p className="text-xs text-on-surface-variant leading-relaxed pl-10">
                        {req.description || 'Institutional compliance clearance document.'}
                      </p>
                    </div>

                    {/* Right Side Status / Action Button */}
                    <div className="shrink-0 flex items-center gap-2 pl-10 sm:pl-0">
                      {req.submission_status === 'approved' ? (
                        <span className="px-3.5 py-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
                          <span className="material-symbols-outlined text-[18px]">verified</span>
                          <span>Approved</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReq(req);
                            setUploadFile(null);
                            setFilePathText(req.file_url || req.submitted_file || '');
                          }}
                          className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">upload_file</span>
                          <span>
                            {req.submission_status === 'submitted'
                              ? 'Re-upload Document'
                              : req.submission_status === 'draft'
                              ? 'Edit Draft & Submit'
                              : 'Upload Document'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions & File Links Bar */}
                  <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-outline-variant/60 pl-10">
                    {/* Direct Download Button for DOCX / Form Template */}
                    {req.document_template_url && (
                      <button
                        type="button"
                        onClick={(e) => handleDownloadTemplate(e, req.document_template_url, req.title || req.requirement_name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">file_download</span>
                        <span>Download Requirement (.docx)</span>
                      </button>
                    )}

                    {/* View Uploaded Document Link */}
                    {(req.file_url || req.submitted_file) && (
                      <a
                        href={resolveFileUrl(req.file_url || req.submitted_file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold border border-outline-variant transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">attachment</span>
                        <span>View My Uploaded File</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WORKPLACE MENTOR EVALUATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'evaluations' && (
        <div className="space-y-6">
          {/* Evaluations Performance Overview */}
          <div className="bento-card bg-gradient-to-r from-emerald-500/10 via-surface to-surface border border-emerald-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">grade</span>
                  <h3 className="font-bold text-base sm:text-lg text-on-surface">Workplace Mentor Performance Ratings</h3>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Formal competencies, task performance, and professional diligence ratings submitted by your Workplace Mentor.
                </p>
              </div>

              {avgRating && (
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shrink-0">
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                      {avgRating} / 5.0
                    </span>
                    <span className="text-[10px] font-bold text-on-surface-variant block">Average Score</span>
                  </div>
                  <div className="text-amber-500 text-xl font-bold">⭐</div>
                </div>
              )}
            </div>
          </div>

          {/* Evaluations Grid */}
          {evaluationsList.length === 0 ? (
            <div className="bento-card text-center py-12 text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-[48px] text-outline">rate_review</span>
              <p className="text-sm font-bold text-on-surface">No performance evaluations submitted yet.</p>
              <p className="text-xs max-w-sm mx-auto">
                Your assigned Workplace Mentor will submit evaluation ratings upon completion of internship milestones or final shift rendered.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {evaluationsList.map((ev) => (
                <div
                  key={ev.record_id || ev.evaluation_id}
                  className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant space-y-3.5 shadow-xs hover:border-vibrant-orange/40 transition-all"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
                    <span className="px-3 py-1 rounded-full text-xs font-bold capitalize bg-orange-tint text-vibrant-orange border border-vibrant-orange/20">
                      {ev.evaluation_period ? `${ev.evaluation_period} Evaluation` : 'Performance Evaluation'}
                    </span>
                    <div className="flex items-center gap-1 font-bold text-pinoy-green text-sm bg-green-tint px-3 py-1 rounded-full border border-pinoy-green/20">
                      <span>{ev.rating} / 5.0</span>
                      <span>★</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-surface rounded-xl border border-outline-variant/60">
                    <p className="text-xs text-on-surface leading-relaxed italic">
                      "{ev.comments || 'Demonstrated dedication, strong technical skills, and professionalism throughout the training period.'}"
                    </p>
                  </div>

                  <div className="text-[11px] text-on-surface-variant flex justify-between items-center pt-1">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">person</span>
                      {ev.evaluator_email || 'Workplace Mentor'}
                    </span>
                    <span>{new Date(ev.evaluated_at || ev.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* REQUIREMENT SUBMISSION MODAL */}
      {/* ========================================================================= */}
      {selectedReq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-surface border border-outline-variant rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange">upload_file</span>
                  Submit Clearance Requirement
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Document: <strong>{selectedReq.title || selectedReq.requirement_name}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedReq(null);
                  setUploadFile(null);
                  setFilePathText('');
                }}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Template Download Option inside Modal */}
            {selectedReq.document_template_url && (
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="text-blue-900 dark:text-blue-200">
                  <span className="font-bold block">Need the official template?</span>
                  <span className="text-[11px] opacity-80">Download the .docx requirement before completing.</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDownloadTemplate(e, selectedReq.document_template_url, selectedReq.title || selectedReq.requirement_name)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-colors shrink-0 flex items-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[15px]">file_download</span>
                  <span>Download .docx</span>
                </button>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* File Upload Dropzone */}
              <div>
                <label className="block font-bold text-on-surface mb-1">
                  Upload Completed Document (PDF, DOCX, Images, etc.)
                </label>
                <div className="p-4 bg-surface-container-low rounded-xl border border-dashed border-outline-variant space-y-2">
                  <input
                    type="file"
                    id="studentReqFileInput"
                    onChange={(e) => setUploadFile(e.target.files[0] || null)}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.xlsx"
                    className="w-full text-xs text-on-surface file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-vibrant-orange file:text-white hover:file:bg-deep-orange cursor-pointer"
                  />
                  {uploadFile && (
                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 p-2.5 rounded-lg text-[11px] font-medium border border-emerald-200 dark:border-emerald-800">
                      <span className="truncate flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        {uploadFile.name} ({formatFileSize(uploadFile.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadFile(null);
                          const el = document.getElementById('studentReqFileInput');
                          if (el) el.value = '';
                        }}
                        className="text-error font-bold ml-2 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {(!uploadFile && (selectedReq.file_url || selectedReq.submitted_file)) && (
                    <p className="text-[11px] text-on-surface-variant">
                      Current file: <strong className="text-on-surface">{selectedReq.file_url || selectedReq.submitted_file}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Cloud URL Alternative */}
              <div>
                <label className="block font-bold text-on-surface mb-1">
                  Or Cloud Document URL (Optional)
                </label>
                <input
                  type="text"
                  value={filePathText}
                  onChange={(e) => setFilePathText(e.target.value)}
                  placeholder="https://drive.google.com/... or shared link"
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none focus:border-vibrant-orange"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReq(null);
                    setUploadFile(null);
                    setFilePathText('');
                  }}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={actionLoading || (!uploadFile && !filePathText && !selectedReq.file_url)}
                    className="px-4 py-2 bg-surface-container text-on-surface border border-outline-variant text-xs font-bold rounded-xl hover:bg-surface-container-high transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>{actionLoading ? 'Saving...' : 'Save Draft'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitRequirement}
                    disabled={actionLoading || (!uploadFile && !filePathText && !selectedReq.file_url)}
                    className="px-4 py-2 bg-vibrant-orange text-white text-xs font-bold rounded-xl hover:bg-deep-orange transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>{actionLoading ? 'Submitting...' : 'Submit Officially'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OJT CERTIFICATE VIEWER MODAL */}
      {/* ========================================================================= */}
      {viewCert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-surface border border-outline-variant rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">workspace_premium</span>
                <div>
                  <h3 className="font-bold text-base text-on-surface">OJT Completion Certificate</h3>
                  <p className="text-xs text-on-surface-variant">Verified Academic & Internship Credential</p>
                </div>
              </div>
              <button onClick={() => setViewCert(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Certificate Canvas */}
            <div className="border-4 border-double border-emerald-600/40 p-8 rounded-2xl bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30 dark:from-emerald-950/20 dark:via-surface dark:to-amber-950/10 text-center space-y-4 relative shadow-inner">
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-widest text-emerald-700 dark:text-emerald-300 font-black">Official Certificate of Completion</span>
                <h4 className="text-2xl font-black text-on-surface font-serif">INTERNSHIP COMPLETION</h4>
                <p className="text-xs text-on-surface-variant">This is to officially certify that</p>
              </div>

              <div className="py-2 border-b-2 border-emerald-600/30 inline-block px-8">
                <span className="text-xl font-bold text-emerald-900 dark:text-emerald-100 tracking-wide">
                  {viewCert.student_name}
                </span>
                <p className="text-xs text-on-surface-variant mt-0.5">Student ID: #{viewCert.student_number}</p>
              </div>

              <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                has satisfactorily completed the required <strong>{viewCert.rendered_hours || viewCert.required_hours || 600} hours</strong> of On-the-Job Training in <strong>{viewCert.program_name || 'Degree Program'}</strong> from <strong>{viewCert.institution_name}</strong> at <strong>{viewCert.organization_name}</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-left border-t border-outline-variant/60 text-xs">
                <div>
                  <span className="text-on-surface-variant block text-[11px]">Evaluation Rating:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    {viewCert.evaluation_rating ? `${viewCert.evaluation_rating} / 5.0 ⭐` : 'Completed & Recommended'}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant block text-[11px]">Date Issued:</span>
                  <span className="font-bold text-on-surface">
                    {viewCert.issued_at ? new Date(viewCert.issued_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <span className="inline-block px-3 py-1 bg-emerald-100/60 dark:bg-emerald-900/50 rounded-full text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                  VERIFICATION CODE: {viewCert.certificate_code}
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-2">
              <span className="text-[11px] text-on-surface-variant text-center sm:text-left">Added to your Digital Career Portfolio & Credentials</span>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewCert(null)}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high w-full sm:w-auto text-center transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto text-center"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print / Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NEW JOURNAL ENTRY MODAL */}
      {/* ========================================================================= */}
      {journalModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-surface border border-outline-variant rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange text-2xl">menu_book</span>
                <div>
                  <h3 className="font-bold text-base text-on-surface">Record Internship Journal Entry</h3>
                  <p className="text-xs text-on-surface-variant">Daily or weekly milestone reflection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setJournalModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateJournal} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-on-surface mb-1">Entry Date *</label>
                  <input
                    type="date"
                    required
                    value={journalForm.entry_date}
                    onChange={(e) => setJournalForm({ ...journalForm, entry_date: e.target.value })}
                    className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-on-surface outline-none focus:border-vibrant-orange"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface mb-1">Week Number *</label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    required
                    value={journalForm.week_number}
                    onChange={(e) => setJournalForm({ ...journalForm, week_number: e.target.value })}
                    className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-on-surface outline-none focus:border-vibrant-orange"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface mb-1">Hours Rendered</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={journalForm.hours_rendered}
                    onChange={(e) => setJournalForm({ ...journalForm, hours_rendered: e.target.value })}
                    className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-on-surface outline-none focus:border-vibrant-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Journal Entry Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sprint Planning, Frontend Component Styling & Testing"
                  value={journalForm.title}
                  onChange={(e) => setJournalForm({ ...journalForm, title: e.target.value })}
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-on-surface outline-none focus:border-vibrant-orange"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Tasks Accomplished *</label>
                <textarea
                  required
                  rows="3"
                  placeholder="What specific tasks, tickets, or operations did you complete during this period?"
                  value={journalForm.tasks_accomplished}
                  onChange={(e) => setJournalForm({ ...journalForm, tasks_accomplished: e.target.value })}
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-on-surface outline-none focus:border-vibrant-orange resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Key Learnings & Takeaways *</label>
                <textarea
                  required
                  rows="3"
                  placeholder="What new concepts, tools, frameworks, or soft skills did you learn or apply?"
                  value={journalForm.key_learnings}
                  onChange={(e) => setJournalForm({ ...journalForm, key_learnings: e.target.value })}
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-on-surface outline-none focus:border-vibrant-orange resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Challenges & Solutions (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="Did you encounter any bugs, blockers, or difficulties? How did you resolve them?"
                  value={journalForm.challenges_and_solutions}
                  onChange={(e) => setJournalForm({ ...journalForm, challenges_and_solutions: e.target.value })}
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-on-surface outline-none focus:border-vibrant-orange resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setJournalModalOpen(false)}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={journalSubmitting}
                  className="px-5 py-2.5 bg-vibrant-orange text-white text-xs font-bold rounded-xl hover:bg-deep-orange transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{journalSubmitting ? 'Saving...' : 'Save Journal Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Attendance QR Code Modal */}
      <StudentAttendanceQrModal
        isOpen={showQrModal}
        onClose={() => {
          setShowQrModal(false);
          fetchAllOjtData();
        }}
      />

      {/* Journal Entry Detail Inspection Modal */}
      {viewJournalEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-orange-tint text-vibrant-orange border border-vibrant-orange/20">
                    Week {viewJournalEntry.week_number || 1}
                  </span>
                  <span className="text-xs text-on-surface-variant font-medium">
                    {new Date(viewJournalEntry.entry_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h3 className="text-base font-bold text-on-surface mt-1">{viewJournalEntry.title}</h3>
              </div>
              <button onClick={() => setViewJournalEntry(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Credited Shift Hours</span>
                  <span className="font-mono font-bold text-sm text-on-surface">{parseFloat(viewJournalEntry.hours_rendered || 0).toFixed(1)} hrs</span>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                  viewJournalEntry.status === 'reviewed'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {viewJournalEntry.status === 'reviewed' ? 'verified' : 'schedule'}
                  </span>
                  {viewJournalEntry.status === 'reviewed' ? 'Reviewed by Mentor' : 'Submitted (Pending Review)'}
                </span>
              </div>

              {/* Tasks Accomplished */}
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-vibrant-orange">task_alt</span>
                  <span>Tasks Accomplished</span>
                </div>
                <p className="text-xs text-on-surface whitespace-pre-wrap leading-relaxed">
                  {viewJournalEntry.tasks_accomplished}
                </p>
              </div>

              {/* Key Learnings */}
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-amber-500">lightbulb</span>
                  <span>Key Learnings</span>
                </div>
                <p className="text-xs text-on-surface whitespace-pre-wrap leading-relaxed">
                  {viewJournalEntry.key_learnings}
                </p>
              </div>

              {/* Challenges & Solutions */}
              {viewJournalEntry.challenges_and_solutions && (
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-blue-500">psychology</span>
                    <span>Challenges & Solutions</span>
                  </div>
                  <p className="text-xs text-on-surface whitespace-pre-wrap leading-relaxed">
                    {viewJournalEntry.challenges_and_solutions}
                  </p>
                </div>
              )}

              {/* Mentor Feedback If Available */}
              {viewJournalEntry.mentor_feedback && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">rate_review</span>
                      Mentor Feedback
                    </span>
                    {viewJournalEntry.mentor_rating && (
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        ⭐ {viewJournalEntry.mentor_rating} / 5.0
                      </span>
                    )}
                  </div>
                  <p className="text-emerald-900 dark:text-emerald-200 italic">
                    "{viewJournalEntry.mentor_feedback}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setViewJournalEntry(null)}
                className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high transition-colors"
              >
                Close Journal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
