import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';

export default function StudentOJT() {
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(urlTab === 'requirements' ? 'requirements' : (urlTab || 'dtr'));
  const [ojtData, setOjtData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', isError: false });

  // Requirement Submission State
  const [selectedReq, setSelectedReq] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [filePathText, setFilePathText] = useState('');

  // Certificate State
  const [certificates, setCertificates] = useState([]);
  const [viewCert, setViewCert] = useState(null);

  useEffect(() => {
    if (urlTab && ['dtr', 'requirements', 'evaluations'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const fetchAllOjtData = useCallback(async () => {
    try {
      const [ojtRes, attRes, reqRes, certRes] = await Promise.all([
        api.get('/student/ojt'),
        api.get('/student/attendance'),
        api.get('/student/requirements'),
        api.get('/student/certificates')
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

  const uploadRequirementFile = async () => {
    if (uploadFile) {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await api.post('/student/requirements/upload', formData);
      if (res.success && res.url) {
        return res.url;
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

  const handleDeleteAttendance = async (attendanceId) => {
    if (!window.confirm('Are you sure you want to delete this pending attendance log?')) return;
    try {
      const res = await api.delete(`/student/attendance/${attendanceId}`);
      if (res.success) {
        showToast('Pending attendance log deleted.');
        fetchAllOjtData();
      } else {
        showToast(res.message || 'Failed to delete attendance log.', true);
      }
    } catch (err) {
      showToast('Error deleting attendance log.', true);
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

  const todayLog = attendanceData?.todayLog;
  const isClockedInToday = todayLog && todayLog.time_in;
  const isClockedOutToday = todayLog && todayLog.time_out;

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface">OJT Daily Time Record & Progress</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-emerald-600 border border-emerald-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Clock in/out daily, track supervisor verified hours, upload institutional clearance requirements, and view performance evaluations.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-surface-container p-1 rounded-xl border border-outline-variant flex-wrap gap-1 max-w-full overflow-x-auto">
          <button
            onClick={() => setActiveTab('dtr')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'dtr' ? 'bg-surface text-vibrant-orange shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">timelapse</span>
            <span>Daily Time Record (DTR)</span>
          </button>
          <button
            onClick={() => setActiveTab('requirements')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'requirements' ? 'bg-surface text-vibrant-orange shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
            <span>Clearance Checklist ({requirements.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('evaluations')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'evaluations' ? 'bg-surface text-vibrant-orange shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">rate_review</span>
            <span>Evaluations ({ojtData?.evaluations?.length || 0})</span>
          </button>
          {certificates.length > 0 && (
            <button
              type="button"
              onClick={() => setViewCert(certificates[0])}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
              <span>OJT Certificate ({certificates.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast.message && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            toast.isError
              ? 'bg-error-container text-error border-error/20'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.isError ? 'error' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hours Overview Banner */}
      <div className="bento-card bg-gradient-to-r from-orange-tint/40 to-surface border border-vibrant-orange/20 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-vibrant-orange block">
              Current Internship Placement
            </span>
            <h2 className="text-xl font-bold text-on-surface">
              {activeRecord?.organization_name || 'No Active Host Organization'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {activeRecord?.industry || 'Industry Partner'} • {activeRecord?.status ? activeRecord.status.toUpperCase() : 'NO DEPLOYMENT'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-vibrant-orange">{doneHours} / {reqHours} hrs</span>
            <span className="text-xs text-on-surface-variant block">Verified Rendered Hours</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-on-surface-variant">
            <span>Overall Completion Progress</span>
            <span className="text-vibrant-orange">{progressPct}%</span>
          </div>
          <div className="w-full bg-surface-container h-3.5 rounded-full overflow-hidden">
            <div
              className="bg-vibrant-orange h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* TAB 1: DAILY TIME RECORD (DTR) & CLOCK IN/OUT */}
      {activeTab === 'dtr' && (
        <div className="space-y-6">
          {/* Completed Hours Notice */}
          {(doneHours >= reqHours || activeRecord?.status === 'completed') && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900 shadow-sm">
              <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0 mt-0.5">verified</span>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-emerald-950">
                  Required OJT Hours Completed ({doneHours} / {reqHours} hrs)
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Congratulations! You have satisfied your required training hours. Daily Time-In has been finalized and closed. Your records have been preserved and forwarded for host employer evaluation and certificate issuance.
                </p>
              </div>
            </div>
          )}

          {/* Mentor-Supervised Daily Time Record Card */}
          <div className="bento-card space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[32px]">schedule</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-on-surface">Today's Daily Time Record</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant border border-outline-variant uppercase">
                      Mentor Handled
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {isClockedOutToday ? (
                  <span className="px-3.5 py-1.5 bg-green-tint text-pinoy-green rounded-full text-xs font-bold flex items-center gap-1.5 border border-pinoy-green/20">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Shift Certified • {todayLog.hours_rendered || 0} hrs Credited</span>
                  </span>
                ) : isClockedInToday ? (
                  <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>On Duty • Timed In by Mentor</span>
                  </span>
                ) : (
                  <span className="px-3.5 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1.5 border border-amber-200">
                    <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                    <span>Awaiting Mentor Time-In</span>
                  </span>
                )}
              </div>
            </div>

            {/* DTR Grid: Mentor & Shift Times */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Assigned Workplace Mentor
                </span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange text-[18px]">person</span>
                  <span className="text-xs font-bold text-on-surface">
                    {(activeRecord?.mentor_first_name && activeRecord?.mentor_last_name)
                      ? `${activeRecord.mentor_first_name} ${activeRecord.mentor_last_name}`
                      : (todayLog?.mentor_first_name && todayLog?.mentor_last_name)
                      ? `${todayLog.mentor_first_name} ${todayLog.mentor_last_name}`
                      : activeRecord?.supervisor_name || 'Assigned Workplace Mentor'}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  {activeRecord?.mentor_title || activeRecord?.organization_name || 'Host Employer'}
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Time-In (Mentor Recorded)
                </span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">login</span>
                  <span className="text-sm font-bold font-mono text-emerald-700">
                    {todayLog?.time_in || '—'}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  {todayLog?.time_in ? 'Officially logged by mentor' : 'Pending arrival confirmation'}
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Time-Out (Mentor Recorded)
                </span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange text-[18px]">logout</span>
                  <span className="text-sm font-bold font-mono text-vibrant-orange">
                    {todayLog?.time_out || (isClockedInToday ? 'In Progress' : '—')}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  {todayLog?.time_out ? `${todayLog.hours_rendered || 0} training hrs credited` : 'Pending departure confirmation'}
                </p>
              </div>
            </div>

            {/* Supervision Protocol Notice */}
            <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
              <span className="material-symbols-outlined text-[18px] text-blue-600 shrink-0 mt-0.5">verified_user</span>
              <div className="space-y-0.5">
                <p className="font-bold">Workplace Mentor Supervision Protocol</p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Daily Time Records (Time-In and Time-Out) are exclusively recorded and certified by your assigned Workplace Mentor in compliance with institutional OJT agreements. Please report directly to your supervisor upon shift arrival and conclusion.
                </p>
              </div>
            </div>
          </div>

          {/* Attendance History Table */}
          <div className="bento-card space-y-4">
            <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange">history</span>
              Attendance Logs & Mentor Credited Hours ({attendanceData?.logs?.length || 0})
            </h3>

            {!attendanceData?.logs || attendanceData.logs.length === 0 ? (
              <div className="text-center py-10 text-on-surface-variant">
                <span className="material-symbols-outlined text-[44px] mb-2 text-outline">history_toggle_off</span>
                <p className="text-sm font-bold">No daily attendance logs recorded yet.</p>
                <p className="text-xs mt-1">Your assigned Workplace Mentor will record your daily time-in and time-out as you report for your training shifts.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Host Company</th>
                      <th className="py-3 px-4">Time In</th>
                      <th className="py-3 px-4">Time Out</th>
                      <th className="py-3 px-4">Hours Rendered</th>
                      <th className="py-3 px-4">Tasks Accomplished</th>
                      <th className="py-3 px-4">Mentor Verification</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {attendanceData.logs.map((log) => (
                      <tr key={log.attendance_id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-4 font-bold text-xs text-on-surface">
                          {new Date(log.log_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-xs text-on-surface-variant">{log.organization_name}</td>
                        <td className="py-3 px-4 font-mono text-xs text-on-surface">{log.time_in || '—'}</td>
                        <td className="py-3 px-4 font-mono text-xs text-on-surface">{log.time_out || 'Active'}</td>
                        <td className="py-3 px-4 font-bold text-xs text-on-surface">
                          {log.hours_rendered ? `${log.hours_rendered} hrs` : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-on-surface-variant max-w-xs truncate">
                          {log.tasks_accomplished || 'Daily internship tasks.'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                              log.status === 'verified'
                                ? 'bg-green-tint text-pinoy-green'
                                : log.status === 'rejected'
                                ? 'bg-error-container text-error'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {log.status !== 'verified' && (
                            <button
                              onClick={() => handleDeleteAttendance(log.attendance_id)}
                              className="text-on-surface-variant hover:text-error transition-colors p-1"
                              title="Delete Pending Log"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
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

      {/* TAB 2: CLEARANCE REQUIREMENTS CHECKLIST */}
      {activeTab === 'requirements' && (
        <div className="bento-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange">checklist</span>
                OJT Institutional Clearance Checklist
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Submit all required documents for review by your Institution OJT Coordinator & Registrar.
              </p>
            </div>
          </div>

          {requirements.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-6">No clearance requirements configured yet.</p>
          ) : (
            <div className="space-y-3">
              {requirements.map((req) => (
                <div
                  key={req.requirement_id}
                  className="p-4 bg-surface-container-low rounded-xl border border-outline-variant flex items-start justify-between gap-4 flex-wrap"
                >
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-on-surface">{req.title || req.requirement_name}</h4>
                      {req.is_mandatory ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">
                          Mandatory
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded-full">
                          Optional
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          req.submission_status === 'approved'
                            ? 'bg-green-tint text-pinoy-green border border-pinoy-green/20'
                            : req.submission_status === 'submitted'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : req.submission_status === 'draft'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {req.submission_status === 'draft' ? 'Draft (Not Submitted)' : (req.submission_status || 'Pending Submission')}
                      </span>
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {req.description || 'Institutional compliance document.'}
                    </p>

                    {/* Action Links: Download template or View uploaded file */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {req.document_template_url && (
                        <a
                          href={req.document_template_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">file_download</span>
                          Download Template / Form
                        </a>
                      )}

                      {(req.file_url || req.submitted_file) && (
                        <a
                          href={req.file_url || req.submitted_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline-variant transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">attachment</span>
                          View Uploaded Document
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="pt-1">
                    {req.submission_status === 'approved' ? (
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>Verified</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedReq(req);
                          setUploadFile(null);
                          setFilePathText(req.file_url || req.submitted_file || '');
                        }}
                        className="px-3.5 py-1.5 bg-vibrant-orange hover:bg-deep-orange text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">upload_file</span>
                        {req.submission_status === 'submitted' ? 'Re-upload' : req.submission_status === 'draft' ? 'Edit Draft / Submit' : 'Upload File'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EVALUATIONS */}
      {activeTab === 'evaluations' && (
        <div className="bento-card space-y-4">
          <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange">rate_review</span>
            Workplace Mentor Performance Ratings
          </h3>

          {!ojtData?.evaluations || ojtData.evaluations.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">
              <span className="material-symbols-outlined text-[44px] text-outline mb-2">grade</span>
              <p className="text-sm font-bold">No performance evaluations submitted yet.</p>
              <p className="text-xs mt-1">Your Workplace Mentor will evaluate your performance upon rendering required hours.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {ojtData.evaluations.map((ev) => (
                <div key={ev.record_id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold capitalize bg-orange-tint text-vibrant-orange">
                      {ev.evaluation_period} Evaluation
                    </span>
                    <span className="font-bold text-pinoy-green text-sm">{ev.rating} / 5.0 ★</span>
                  </div>
                  <p className="text-xs text-on-surface leading-relaxed">
                    "{ev.comments || 'Demonstrated diligence and technical competence during the training period.'}"
                  </p>
                  <div className="text-[11px] text-on-surface-variant flex justify-between border-t border-outline-variant/60 pt-2">
                    <span>Evaluator: {ev.evaluator_email || 'Workplace Mentor'}</span>
                    <span>{new Date(ev.evaluated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Requirement Submission Modal with Draft & Submit actions */}
      {selectedReq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface border border-outline-variant rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange">upload_file</span>
                  Submit Clearance Requirement
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Requirement: <strong>{selectedReq.title || selectedReq.requirement_name}</strong>
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

            {/* If template is available, show download option inside modal */}
            {selectedReq.document_template_url && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                <div className="text-blue-900">
                  <span className="font-bold block">Need the official template?</span>
                  <span className="text-[11px] text-blue-800">Download the institution's template before completing.</span>
                </div>
                <a
                  href={selectedReq.document_template_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors shrink-0 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  Download
                </a>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* File Attachment Input */}
              <div>
                <label className="block font-bold text-on-surface mb-1">
                  Upload Document File (PDF, DOCX, Images, etc.)
                </label>
                <div className="p-4 bg-surface-container-low rounded-xl border border-dashed border-outline-variant space-y-2">
                  <input
                    type="file"
                    id="studentReqFile"
                    onChange={(e) => setUploadFile(e.target.files[0] || null)}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.xlsx"
                    className="w-full text-xs text-on-surface file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-vibrant-orange file:text-white hover:file:bg-deep-orange cursor-pointer"
                  />
                  {uploadFile && (
                    <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 p-2 rounded-lg text-[11px] font-medium">
                      <span className="truncate flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                        {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadFile(null);
                          const input = document.getElementById('studentReqFile');
                          if (input) input.value = '';
                        }}
                        className="text-error font-bold ml-2"
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

              {/* Or Cloud Link Alternative */}
              <div>
                <label className="block font-bold text-on-surface mb-1">
                  Or Cloud Document URL (Optional)
                </label>
                <input
                  type="text"
                  value={filePathText}
                  onChange={(e) => setFilePathText(e.target.value)}
                  placeholder="https://drive.google.com/... or cloud document link"
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none focus:border-vibrant-orange"
                />
              </div>

              {/* Action Buttons: Save Draft vs Submit */}
              <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReq(null);
                    setUploadFile(null);
                    setFilePathText('');
                  }}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high"
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
                    {actionLoading ? 'Saving...' : 'Save Draft'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitRequirement}
                    disabled={actionLoading || (!uploadFile && !filePathText && !selectedReq.file_url)}
                    className="px-4 py-2 bg-vibrant-orange text-white text-xs font-bold rounded-xl hover:bg-deep-orange transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    {actionLoading ? 'Submitting...' : 'Submit Officially'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OJT Certificate Viewer Modal */}
      {viewCert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
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
            <div className="border-4 border-double border-emerald-600/40 p-8 rounded-2xl bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30 text-center space-y-4 relative shadow-inner">
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-widest text-emerald-700 font-black">Official Certificate of Completion</span>
                <h4 className="text-2xl font-black text-on-surface font-serif">INTERNSHIP COMPLETION</h4>
                <p className="text-xs text-on-surface-variant">This is to officially certify that</p>
              </div>

              <div className="py-2 border-b-2 border-emerald-600/30 inline-block px-8">
                <span className="text-xl font-bold text-emerald-900 tracking-wide">
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
                  <span className="font-bold text-emerald-700 text-sm">
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
                <span className="inline-block px-3 py-1 bg-emerald-100/60 rounded-full text-[11px] font-mono font-bold text-emerald-800 border border-emerald-300">
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
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high w-full sm:w-auto text-center"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto text-center"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Print / Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
