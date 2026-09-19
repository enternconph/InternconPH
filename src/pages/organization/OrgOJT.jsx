import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { resolveFileUrl, formatFileSize, getFileIcon, isImageFile, isPdfFile } from '../../utils/fileHelper';
import Pagination from '../../components/ui/Pagination';

export default function OrgOJT() {
  const [activeTab, setActiveTab] = useState('interns'); // 'interns' | 'attendance'
  const [interns, setInterns] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Intern Search, Filter, and Pagination States
  const [internSearch, setInternSearch] = useState('');
  const [internStatusFilter, setInternStatusFilter] = useState('all'); // 'all' | 'ongoing' | 'completed'
  const [internPage, setInternPage] = useState(1);
  const internPageSize = 10;

  // Complaint / Incident Report Modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentStudent, setIncidentStudent] = useState(null);
  const [incidentForm, setIncidentForm] = useState({ subject: '', description: '' });
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // Mentor Time-Out Modal
  const [showTimeOutModal, setShowTimeOutModal] = useState(false);
  const [timeOutStudent, setTimeOutStudent] = useState(null);
  const [timeOutForm, setTimeOutForm] = useState({
    time_out: '',
    hours_rendered: 8,
    tasks_accomplished: ''
  });
  const [submittingTimeOut, setSubmittingTimeOut] = useState(false);

  // Mentor Manual / Backdated DTR Modal
  const [showManualDtrModal, setShowManualDtrModal] = useState(false);
  const [manualDtrForm, setManualDtrForm] = useState({
    ojt_id: '',
    log_date: new Date().toISOString().split('T')[0],
    time_in: '08:00',
    time_out: '17:00',
    hours_rendered: 8,
    tasks_accomplished: 'Workplace training shift completed.'
  });
  const [submittingManualDtr, setSubmittingManualDtr] = useState(false);

  // Mentor Edit DTR Modal
  const [showEditDtrModal, setShowEditDtrModal] = useState(false);
  const [editDtrLog, setEditDtrLog] = useState(null);
  const [submittingEditDtr, setSubmittingEditDtr] = useState(false);

  // Intern Portfolio Modal
  const [inspectInternId, setInspectInternId] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectTab, setInspectTab] = useState('portfolio');

  const handleInspectIntern = async (ojtId) => {
    setInspectInternId(ojtId);
    setInspectLoading(true);
    setInspectTab('portfolio');
    try {
      const res = await api.get(`/org/interns/${ojtId}/profile`);
      if (res.success && res.data) {
        setInspectData(res.data);
      } else {
        showToast(res.message || 'Failed to load intern portfolio.', true);
        setInspectInternId(null);
      }
    } catch (err) {
      showToast('Error fetching intern portfolio.', true);
      setInspectInternId(null);
    } finally {
      setInspectLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [internsRes, attRes] = await Promise.all([
        api.get('/org/interns'),
        api.get('/org/attendance')
      ]);

      if (internsRes.success && internsRes.data) {
        setInterns(internsRes.data);
      }
      if (attRes.success && attRes.data) {
        setAttendanceLogs(attRes.data);
      }
    } catch (err) {
      console.error('Fetch Org OJT data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time synchronization
  useRealtimeRefresh(fetchData);

  const showToast = (msg, isErr = false) => {
    if (isErr) {
      setErrorMessage(msg);
      setMessage('');
      setTimeout(() => setErrorMessage(''), 4000);
    } else {
      setMessage(msg);
      setErrorMessage('');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleQuickTimeIn = async (intern) => {
    const req = intern.required_hours || intern.required_ojt_hours || 600;
    const done = intern.rendered_hours || 0;
    if (intern.status === 'completed' || done >= req) {
      showToast('Intern has already completed required OJT hours. Additional time recording is disabled.', true);
      return;
    }
    try {
      const res = await api.post(`/org/interns/${intern.ojt_id}/time-in`, {});
      if (res.success) {
        showToast(res.message || `Timed in ${intern.first_name}!`);
        fetchData();
      } else {
        showToast(res.message || 'Failed to record time in.', true);
      }
    } catch (err) {
      showToast(err.message || 'Error recording time in.', true);
    }
  };

  const openTimeOutModal = (intern) => {
    setTimeOutStudent(intern);
    const now = new Date();
    const formattedNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    let initialHours = 8;
    if (intern.today_time_in) {
      try {
        const [inH, inM] = intern.today_time_in.split(':').map(Number);
        const [outH, outM] = formattedNow.split(':').map(Number);
        let diff = (outH + outM / 60) - (inH + inM / 60);
        if (diff < 0) diff += 24;
        initialHours = Math.round(Math.max(0.5, diff) * 10) / 10;
      } catch (e) {
        initialHours = 8;
      }
    }

    setTimeOutForm({
      time_out: formattedNow,
      hours_rendered: initialHours,
      tasks_accomplished: intern.today_tasks || 'Workplace training shift completed.'
    });
    setShowTimeOutModal(true);
  };

  const handleTimeOutSubmit = async (e) => {
    e.preventDefault();
    if (!timeOutStudent) return;
    setSubmittingTimeOut(true);
    try {
      const res = await api.post(`/org/interns/${timeOutStudent.ojt_id}/time-out`, timeOutForm);
      if (res.success) {
        showToast(res.message || `Timed out and credited hours for ${timeOutStudent.first_name}!`);
        setShowTimeOutModal(false);
        setTimeOutStudent(null);
        fetchData();
      } else {
        showToast(res.message || 'Failed to record time out.', true);
      }
    } catch (err) {
      showToast(err.message || 'Error recording time out.', true);
    } finally {
      setSubmittingTimeOut(false);
    }
  };

  const handleManualDtrSubmit = async (e) => {
    e.preventDefault();
    if (!manualDtrForm.ojt_id) {
      showToast('Please select an intern.', true);
      return;
    }
    setSubmittingManualDtr(true);
    try {
      const res = await api.post(`/org/interns/${manualDtrForm.ojt_id}/attendance`, manualDtrForm);
      if (res.success) {
        showToast(res.message || 'DTR shift recorded and credited successfully!');
        setShowManualDtrModal(false);
        fetchData();
      } else {
        showToast(res.message || 'Failed to record DTR.', true);
      }
    } catch (err) {
      showToast(err.message || 'Error recording DTR.', true);
    } finally {
      setSubmittingManualDtr(false);
    }
  };

  const openEditDtrModal = (log) => {
    setEditDtrLog({
      attendance_id: log.attendance_id,
      student_name: `${log.first_name} ${log.last_name}`,
      log_date: log.log_date,
      time_in: log.time_in ? log.time_in.slice(0, 5) : '08:00',
      time_out: log.time_out ? log.time_out.slice(0, 5) : '17:00',
      hours_rendered: log.hours_rendered || 8,
      tasks_accomplished: log.tasks_accomplished || ''
    });
    setShowEditDtrModal(true);
  };

  const handleEditDtrSubmit = async (e) => {
    e.preventDefault();
    if (!editDtrLog) return;
    setSubmittingEditDtr(true);
    try {
      const res = await api.put(`/org/attendance/${editDtrLog.attendance_id}`, {
        time_in: editDtrLog.time_in,
        time_out: editDtrLog.time_out,
        hours_rendered: editDtrLog.hours_rendered,
        tasks_accomplished: editDtrLog.tasks_accomplished
      });
      if (res.success) {
        showToast(res.message || 'Attendance log updated!');
        setShowEditDtrModal(false);
        setEditDtrLog(null);
        fetchData();
      } else {
        showToast(res.message || 'Failed to update log.', true);
      }
    } catch (err) {
      showToast(err.message || 'Error updating log.', true);
    } finally {
      setSubmittingEditDtr(false);
    }
  };



  const handleVerifyAttendance = async (attendanceId, action, notes = '') => {
    try {
      const res = await api.post(`/org/attendance/${attendanceId}/verify`, {
        action,
        rejection_notes: notes
      });
      if (res.success) {
        showToast(`Daily attendance log ${action === 'verified' ? 'verified & credited' : 'rejected'} successfully!`);
        fetchData();
      } else {
        showToast(res.message || 'Failed to update attendance log.', true);
      }
    } catch (err) {
      showToast(err.message || 'Error verifying attendance.', true);
    }
  };

  const handleSubmitIncident = async (e) => {
    e.preventDefault();
    if (!incidentStudent) return;

    setSubmittingIncident(true);
    try {
      const res = await api.post('/org/complaints', {
        student_id: incidentStudent.student_id,
        subject: incidentForm.subject,
        description: incidentForm.description
      });
      if (res.success) {
        showToast('Misconduct / incident report submitted to Academic Institution & System Administrator.');
        setShowIncidentModal(false);
        setIncidentForm({ subject: '', description: '' });
        setIncidentStudent(null);
      } else {
        showToast(res.message || 'Failed to submit report.', true);
      }
    } catch (err) {
      showToast(err.message || 'Error submitting report.', true);
    } finally {
      setSubmittingIncident(false);
    }
  };

  // Derived counts and filtered/paginated interns
  const { ongoingCount, completedCount } = useMemo(() => {
    let ongoing = 0;
    let completed = 0;
    interns.forEach((i) => {
      const req = i.required_hours || i.required_ojt_hours || 600;
      const done = i.rendered_hours || 0;
      if (i.status === 'completed' || done >= req) {
        completed++;
      } else {
        ongoing++;
      }
    });
    return { ongoingCount: ongoing, completedCount: completed };
  }, [interns]);

  const pendingAttendanceCount = useMemo(() => {
    return (attendanceLogs || []).filter((log) => log.status === 'pending').length;
  }, [attendanceLogs]);

  const filteredInterns = useMemo(() => {
    return interns.filter((i) => {
      const req = i.required_hours || i.required_ojt_hours || 600;
      const done = i.rendered_hours || 0;
      const isCompleted = i.status === 'completed' || done >= req;

      if (internStatusFilter === 'completed' && !isCompleted) return false;
      if (internStatusFilter === 'ongoing' && isCompleted) return false;

      if (internSearch.trim()) {
        const q = internSearch.toLowerCase();
        const fullName = `${i.first_name || ''} ${i.last_name || ''}`.toLowerCase();
        const studentNo = String(i.student_number || '').toLowerCase();
        const program = String(i.program_name || '').toLowerCase();
        const inst = String(i.institution_name || '').toLowerCase();
        const role = String(i.job_title || '').toLowerCase();
        if (!fullName.includes(q) && !studentNo.includes(q) && !program.includes(q) && !inst.includes(q) && !role.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [interns, internStatusFilter, internSearch]);

  const totalInternPages = Math.max(1, Math.ceil(filteredInterns.length / internPageSize));
  const paginatedInterns = useMemo(() => {
    const start = (internPage - 1) * internPageSize;
    return filteredInterns.slice(start, start + internPageSize);
  }, [filteredInterns, internPage, internPageSize]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-on-surface">Active Intern Deployments & DTR Attendance</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-emerald-600 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Supervise interns, verify daily clock-in/out time records, credit training hours, and report institutional concerns.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-surface-container p-1 rounded-xl border border-outline-variant max-w-full overflow-x-auto">
          <button
            onClick={() => setActiveTab('interns')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'interns' ? 'bg-surface text-vibrant-orange shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">badge</span>
            <span>Deployed Interns ({interns.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'attendance' ? 'bg-surface text-vibrant-orange shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">timelapse</span>
            <span>Daily Attendance Logs</span>
            {pendingAttendanceCount > 0 && (
              <span className="px-1.5 py-0.2 bg-vibrant-orange text-white rounded-full text-[10px] font-bold animate-pulse">
                {pendingAttendanceCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-xl text-xs font-bold flex items-center gap-2 border border-pinoy-green/20">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-error-container text-error rounded-xl text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: DEPLOYED INTERNS */}
      {activeTab === 'interns' && (
        <div className="bento-card space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-3">
            <div>
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange">badge</span>
                Supervised Interns ({filteredInterns.length}{filteredInterns.length !== interns.length ? ` of ${interns.length}` : ''})
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Supervise workplace interns, record daily clock-in shifts, and track training hour completion.
              </p>
            </div>

            {/* Status Filters: All, Ongoing, Completed */}
            <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-xl border border-outline-variant text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => { setInternStatusFilter('all'); setInternPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  internStatusFilter === 'all'
                    ? 'bg-surface text-vibrant-orange shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All ({interns.length})
              </button>
              <button
                type="button"
                onClick={() => { setInternStatusFilter('ongoing'); setInternPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  internStatusFilter === 'ongoing'
                    ? 'bg-surface text-vibrant-orange shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Ongoing ({ongoingCount})
              </button>
              <button
                type="button"
                onClick={() => { setInternStatusFilter('completed'); setInternPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  internStatusFilter === 'completed'
                    ? 'bg-surface text-emerald-600 shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={internSearch}
              onChange={(e) => { setInternSearch(e.target.value); setInternPage(1); }}
              placeholder="Search intern by name, student ID, degree program, or university..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs text-on-surface outline-none focus:border-vibrant-orange"
            />
            {internSearch && (
              <button
                type="button"
                onClick={() => { setInternSearch(''); setInternPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : filteredInterns.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-2">badge</span>
              <p className="text-sm font-bold">
                {internSearch || internStatusFilter !== 'all' ? 'No interns match your search or filter.' : 'No deployed interns currently.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[780px]">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                    <th className="py-3 px-4">Intern Name</th>
                    <th className="py-3 px-4">University & Course</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Rendered / Required</th>
                    <th className="py-3 px-4">Today's DTR Shift (Mentor Handled)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {paginatedInterns.map((intern) => {
                    const req = intern.required_hours || intern.required_ojt_hours || 600;
                    const done = intern.rendered_hours || 0;
                    const isCompleted = intern.status === 'completed' || done >= req;
                    const pct = req > 0 ? Math.min(100, Math.round((done / req) * 100)) : 0;

                    return (
                      <tr key={intern.ojt_id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-on-surface">{intern.first_name} {intern.last_name}</p>
                          <p className="text-xs text-on-surface-variant">ID #{intern.student_number}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-on-surface-variant">
                          <p className="font-bold text-on-surface">{intern.institution_name}</p>
                          <p>{intern.program_name}</p>
                        </td>
                        <td className="py-3 px-4 font-bold text-xs text-on-surface">{intern.job_title || 'Intern'}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span>{done} / {req} hrs</span>
                              <span className={isCompleted ? 'text-pinoy-green font-black' : 'text-vibrant-orange'}>
                                {isCompleted ? 'Completed' : `${pct}%`}
                              </span>
                            </div>
                            <div className="w-28 bg-surface-container h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isCompleted ? 'bg-pinoy-green' : 'bg-vibrant-orange'}`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isCompleted ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">verified</span>
                                <span>Completed ({done} / {req} hrs)</span>
                              </span>
                            </div>
                          ) : !intern.today_time_in ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-on-surface-variant font-medium">Not Timed In</span>
                              <button
                                onClick={() => handleQuickTimeIn(intern)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                                title="Time in student for today"
                              >
                                <span className="material-symbols-outlined text-[15px]">login</span>
                                <span>Time In</span>
                              </button>
                            </div>
                          ) : !intern.today_time_out ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                                In: {intern.today_time_in.slice(0, 5)}
                              </span>
                              <button
                                onClick={() => openTimeOutModal(intern)}
                                className="px-2.5 py-1 bg-vibrant-orange hover:bg-deep-orange text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                                title="Time out student and credit training hours"
                              >
                                <span className="material-symbols-outlined text-[15px]">logout</span>
                                <span>Time Out</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-tint text-pinoy-green border border-pinoy-green/20 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">verified</span>
                                <span>{intern.today_hours || 0} hrs</span>
                              </span>
                              <span className="text-[10px] text-on-surface-variant font-mono">
                                ({intern.today_time_in.slice(0, 5)} - {intern.today_time_out.slice(0, 5)})
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => handleInspectIntern(intern.ojt_id)}
                              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-vibrant-orange text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                              title="View complete Career Portfolio, Credentials, and Academic Records"
                            >
                              <span className="material-symbols-outlined text-[15px]">folder_special</span>
                              <span>Portfolio</span>
                            </button>
                            {!isCompleted && (
                              <button
                                onClick={() => {
                                  setIncidentStudent(intern);
                                  setShowIncidentModal(true);
                                }}
                                className="px-2.5 py-1.5 bg-surface-container text-error border border-error/20 hover:bg-error-container text-xs font-bold rounded-lg transition-colors"
                                title="Report incident or misconduct to Institution Coordinator"
                              >
                                Report Issue
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredInterns.length > internPageSize && (
            <Pagination
              currentPage={internPage}
              totalPages={totalInternPages}
              onPageChange={setInternPage}
            />
          )}
        </div>
      )}

      {/* TAB 2: DAILY TIME RECORD (DTR) LOGS */}
      {activeTab === 'attendance' && (
        <div className="bento-card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange">schedule</span>
                  Mentor Daily Time Record (DTR) Logs ({attendanceLogs.length})
                </h2>
                {pendingAttendanceCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {pendingAttendanceCount} pending verification
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant">
                Officially logged, supervised, and credited training shifts for your student intern cohort.
              </p>
            </div>

            <button
              onClick={() => {
                setManualDtrForm({
                  ojt_id: interns[0]?.ojt_id || '',
                  log_date: new Date().toISOString().split('T')[0],
                  time_in: '08:00',
                  time_out: '17:00',
                  hours_rendered: 8,
                  tasks_accomplished: 'Workplace training shift completed.'
                });
                setShowManualDtrModal(true);
              }}
              className="px-3.5 py-2 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>+ Record DTR for Intern</span>
            </button>
          </div>

          {attendanceLogs.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-2">event_available</span>
              <p className="text-sm font-bold">No daily attendance logs recorded yet.</p>
              <p className="text-xs mt-1">Use the "Time In" / "Time Out" buttons in Tab 1 or click "+ Record DTR for Intern" to log student training shifts.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[850px]">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Time-In</th>
                    <th className="py-3 px-4">Time-Out</th>
                    <th className="py-3 px-4">Hours Credited</th>
                    <th className="py-3 px-4">Tasks Accomplished</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Mentor Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {attendanceLogs.map((log) => (
                    <tr key={log.attendance_id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3 px-4 font-bold text-xs text-on-surface whitespace-nowrap">
                        {new Date(log.log_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-xs text-on-surface">{log.first_name} {log.last_name}</p>
                        <p className="text-[11px] text-on-surface-variant">#{log.student_number}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-on-surface">{log.time_in ? log.time_in.slice(0, 5) : '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-on-surface">{log.time_out ? log.time_out.slice(0, 5) : (log.time_in ? 'In Progress' : '—')}</td>
                      <td className="py-3 px-4 font-bold text-xs text-on-surface whitespace-nowrap">
                        {log.hours_rendered ? `${log.hours_rendered} hrs` : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-on-surface-variant max-w-xs truncate" title={log.tasks_accomplished || ''}>
                        {log.tasks_accomplished || 'Training shift completed.'}
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
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {log.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleVerifyAttendance(log.attendance_id, 'verified')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => {
                                  const notes = prompt('Enter rejection notes or reason:');
                                  if (notes !== null) {
                                    handleVerifyAttendance(log.attendance_id, 'rejected', notes);
                                  }
                                }}
                                className="px-2.5 py-1 bg-surface-container hover:bg-error-container text-error text-xs font-bold rounded-lg border border-outline-variant transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-on-surface-variant italic mr-1">
                              {log.status === 'verified' ? 'Certified' : 'Rejected'}
                            </span>
                          )}

                          <button
                            onClick={() => openEditDtrModal(log)}
                            className="px-2 py-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                            title="Edit DTR time in, time out, and hours"
                          >
                            <span className="material-symbols-outlined text-[13px]">edit</span>
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Incident / Misconduct Report Modal */}
      {showIncidentModal && incidentStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-error">report_problem</span>
                Report Student Misconduct
              </h3>
              <button onClick={() => setShowIncidentModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 bg-surface-container rounded-xl text-xs space-y-1">
              <p className="font-bold text-on-surface">
                Student: {incidentStudent.first_name} {incidentStudent.last_name}
              </p>
              <p className="text-on-surface-variant">Institution: {incidentStudent.institution_name}</p>
              <p className="text-on-surface-variant">Program: {incidentStudent.program_name}</p>
            </div>

            <form onSubmit={handleSubmitIncident} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Subject / Violation Category</label>
                <input
                  type="text"
                  required
                  value={incidentForm.subject}
                  onChange={(e) => setIncidentForm({ ...incidentForm, subject: e.target.value })}
                  placeholder="e.g. Unexcused Tardiness, Non-Compliance with Workplace Safety"
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Detailed Description of Incident</label>
                <textarea
                  required
                  rows={4}
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  placeholder="Provide date, specific behavior observed, impact on workplace, and any warnings already given..."
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIncident}
                  className="px-4 py-2 bg-error text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {submittingIncident ? 'Submitting Report...' : 'File Official Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mentor Time-Out Modal */}
      {showTimeOutModal && timeOutStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange">logout</span>
                Record Student Time-Out & Credit Hours
              </h3>
              <button onClick={() => setShowTimeOutModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 bg-surface-container rounded-xl text-xs space-y-1">
              <p className="font-bold text-on-surface">
                Intern: {timeOutStudent.first_name} {timeOutStudent.last_name} (#{timeOutStudent.student_number})
              </p>
              <p className="text-on-surface-variant">{timeOutStudent.institution_name} • {timeOutStudent.program_name}</p>
              <p className="text-emerald-700 font-bold">
                Time-In: <span className="font-mono">{timeOutStudent.today_time_in ? timeOutStudent.today_time_in.slice(0, 5) : '08:00'}</span>
              </p>
            </div>

            <form onSubmit={handleTimeOutSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Time-Out</label>
                  <input
                    type="time"
                    required
                    value={timeOutForm.time_out}
                    onChange={(e) => {
                      const newOut = e.target.value;
                      let h = 8;
                      if (timeOutStudent.today_time_in) {
                        try {
                          const [inH, inM] = timeOutStudent.today_time_in.split(':').map(Number);
                          const [outH, outM] = newOut.split(':').map(Number);
                          let diff = (outH + outM / 60) - (inH + inM / 60);
                          if (diff < 0) diff += 24;
                          h = Math.round(Math.max(0.5, diff) * 10) / 10;
                        } catch (err) {
                          h = 8;
                        }
                      }
                      setTimeOutForm({ ...timeOutForm, time_out: newOut, hours_rendered: h });
                    }}
                    className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none focus:border-vibrant-orange font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Hours to Credit</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    required
                    value={timeOutForm.hours_rendered}
                    onChange={(e) => setTimeOutForm({ ...timeOutForm, hours_rendered: e.target.value })}
                    className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none focus:border-vibrant-orange font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Tasks Accomplished / Training Notes
                </label>
                <textarea
                  rows={3}
                  value={timeOutForm.tasks_accomplished}
                  onChange={(e) => setTimeOutForm({ ...timeOutForm, tasks_accomplished: e.target.value })}
                  placeholder="e.g. Completed module assignments, assisted team in client demo, attended sync..."
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none focus:border-vibrant-orange"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTimeOutModal(false)}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTimeOut}
                  className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>{submittingTimeOut ? 'Recording...' : 'Time Out & Credit Hours'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual / Backdated DTR Modal */}
      {showManualDtrModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange">calendar_add_on</span>
                Record Student DTR Shift
              </h3>
              <button onClick={() => setShowManualDtrModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleManualDtrSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Select Student Intern</label>
                <select
                  required
                  value={manualDtrForm.ojt_id}
                  onChange={(e) => setManualDtrForm({ ...manualDtrForm, ojt_id: e.target.value })}
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none focus:border-vibrant-orange"
                >
                  <option value="">-- Choose Intern --</option>
                  {interns
                    .filter((i) => {
                      const req = i.required_hours || i.required_ojt_hours || 600;
                      const done = i.rendered_hours || 0;
                      return i.status !== 'completed' && done < req;
                    })
                    .map((i) => (
                      <option key={i.ojt_id} value={i.ojt_id}>
                        {i.first_name} {i.last_name} (#{i.student_number}) - {i.institution_name}
                      </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Shift Date</label>
                <input
                  type="date"
                  required
                  value={manualDtrForm.log_date}
                  onChange={(e) => setManualDtrForm({ ...manualDtrForm, log_date: e.target.value })}
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none focus:border-vibrant-orange"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Time-In</label>
                  <input
                    type="time"
                    required
                    value={manualDtrForm.time_in}
                    onChange={(e) => setManualDtrForm({ ...manualDtrForm, time_in: e.target.value })}
                    className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Time-Out</label>
                  <input
                    type="time"
                    required
                    value={manualDtrForm.time_out}
                    onChange={(e) => setManualDtrForm({ ...manualDtrForm, time_out: e.target.value })}
                    className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    required
                    value={manualDtrForm.hours_rendered}
                    onChange={(e) => setManualDtrForm({ ...manualDtrForm, hours_rendered: e.target.value })}
                    className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Tasks Accomplished</label>
                <textarea
                  rows={2}
                  value={manualDtrForm.tasks_accomplished}
                  onChange={(e) => setManualDtrForm({ ...manualDtrForm, tasks_accomplished: e.target.value })}
                  placeholder="Summary of deliverables and training tasks..."
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none focus:border-vibrant-orange"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualDtrModal(false)}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManualDtr}
                  className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {submittingManualDtr ? 'Saving...' : 'Save & Credit Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit DTR Modal */}
      {showEditDtrModal && editDtrLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange">edit_calendar</span>
                Edit DTR Attendance Log
              </h3>
              <button onClick={() => setShowEditDtrModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 bg-surface-container rounded-xl text-xs space-y-1">
              <p className="font-bold text-on-surface">Intern: {editDtrLog.student_name}</p>
              <p className="text-on-surface-variant">
                Date: <strong>{new Date(editDtrLog.log_date).toLocaleDateString()}</strong>
              </p>
            </div>

            <form onSubmit={handleEditDtrSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Time-In</label>
                  <input
                    type="time"
                    required
                    value={editDtrLog.time_in}
                    onChange={(e) => setEditDtrLog({ ...editDtrLog, time_in: e.target.value })}
                    className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Time-Out</label>
                  <input
                    type="time"
                    required
                    value={editDtrLog.time_out}
                    onChange={(e) => setEditDtrLog({ ...editDtrLog, time_out: e.target.value })}
                    className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    required
                    value={editDtrLog.hours_rendered}
                    onChange={(e) => setEditDtrLog({ ...editDtrLog, hours_rendered: e.target.value })}
                    className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Tasks Accomplished</label>
                <textarea
                  rows={3}
                  value={editDtrLog.tasks_accomplished}
                  onChange={(e) => setEditDtrLog({ ...editDtrLog, tasks_accomplished: e.target.value })}
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none focus:border-vibrant-orange"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditDtrModal(false)}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEditDtr}
                  className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {submittingEditDtr ? 'Saving...' : 'Update DTR Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Intern Portfolio & Profile Inspection Modal */}
      {inspectInternId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-vibrant-orange text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {inspectData?.intern?.first_name?.[0] || 'I'}
                </div>
                <div>
                  <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                    <span>{inspectData ? `${inspectData.intern.first_name} ${inspectData.intern.last_name}` : 'Loading Intern Profile...'}</span>
                    {inspectData?.is_graduated && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-tint text-pinoy-green">
                        Graduated
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {inspectData?.intern?.program_name} • {inspectData?.intern?.institution_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setInspectInternId(null);
                  setInspectData(null);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            {inspectLoading || !inspectData ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
                <p className="text-xs font-bold">Loading career portfolio & credentials...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Navigation Tabs */}
                <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant gap-1 overflow-x-auto text-xs">
                  <button
                    onClick={() => setInspectTab('portfolio')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                      inspectTab === 'portfolio' ? 'bg-vibrant-orange text-white' : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">folder_special</span>
                    <span>Career Portfolio ({(inspectData.academic_portfolio?.length || 0) + (inspectData.credentials?.length || 0) + (inspectData.academic_records?.length || 0)})</span>
                  </button>

                  <button
                    onClick={() => setInspectTab('resume')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                      inspectTab === 'resume' ? 'bg-vibrant-orange text-white' : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">description</span>
                    <span>Resume ({inspectData.resumes?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setInspectTab('evaluations')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                      inspectTab === 'evaluations' ? 'bg-vibrant-orange text-white' : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">rate_review</span>
                    <span>Evaluations ({inspectData.evaluations?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setInspectTab('profile')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                      inspectTab === 'profile' ? 'bg-vibrant-orange text-white' : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">badge</span>
                    <span>Student Profile</span>
                  </button>
                </div>

                {/* TAB: PORTFOLIO */}
                {inspectTab === 'portfolio' && (
                  <div className="space-y-4 text-xs">
                    {/* Academic Portfolio */}
                    {inspectData.academic_portfolio?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                          <span className="material-symbols-outlined text-blue-600 text-[16px]">school</span>
                          Academic Portfolio ({inspectData.academic_portfolio.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {inspectData.academic_portfolio.map((item) => {
                            const fileUrl = resolveFileUrl(item.file_path);
                            const isImg = isImageFile(item.file_name, item.file_path);
                            return (
                              <div key={item.item_id} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isImg && fileUrl ? (
                                      <img src={fileUrl} alt={item.title} className="w-6 h-6 rounded object-cover border border-outline-variant shrink-0" />
                                    ) : (
                                      <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0">{getFileIcon(item.file_name)}</span>
                                    )}
                                    <span className="font-bold text-on-surface line-clamp-1">{item.title}</span>
                                  </div>
                                  {item.file_path && (
                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                       className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-bold flex items-center gap-0.5 flex-shrink-0">
                                      <span className="material-symbols-outlined text-[12px]">open_in_new</span> File
                                    </a>
                                  )}
                                </div>
                                {item.description && <p className="text-on-surface-variant line-clamp-2">{item.description}</p>}
                                {item.file_name && <p className="text-[10px] text-on-surface-variant">📎 {item.file_name}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Credentials */}
                    {inspectData.credentials?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                          <span className="material-symbols-outlined text-amber-600 text-[16px]">workspace_premium</span>
                          Credentials ({inspectData.credentials.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {inspectData.credentials.map((item) => {
                            const fileUrl = resolveFileUrl(item.file_path);
                            const isImg = isImageFile(item.file_name, item.file_path);
                            return (
                              <div key={item.item_id} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isImg && fileUrl ? (
                                      <img src={fileUrl} alt={item.title} className="w-6 h-6 rounded object-cover border border-outline-variant shrink-0" />
                                    ) : (
                                      <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">{getFileIcon(item.file_name)}</span>
                                    )}
                                    <span className="font-bold text-on-surface line-clamp-1">{item.title}</span>
                                  </div>
                                  {item.file_path && (
                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                       className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 text-[10px] font-bold flex items-center gap-0.5 flex-shrink-0">
                                      <span className="material-symbols-outlined text-[12px]">open_in_new</span> File
                                    </a>
                                  )}
                                </div>
                                {item.description && <p className="text-on-surface-variant line-clamp-2">{item.description}</p>}
                                {item.file_name && <p className="text-[10px] text-on-surface-variant">📎 {item.file_name}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Academic Records */}
                    {inspectData.academic_records?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                          <span className="material-symbols-outlined text-emerald-600 text-[16px]">grading</span>
                          Academic Records ({inspectData.academic_records.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {inspectData.academic_records.map((item) => {
                            const fileUrl = resolveFileUrl(item.file_path);
                            const isImg = isImageFile(item.file_name, item.file_path);
                            return (
                              <div key={item.item_id} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isImg && fileUrl ? (
                                      <img src={fileUrl} alt={item.title} className="w-6 h-6 rounded object-cover border border-outline-variant shrink-0" />
                                    ) : (
                                      <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">{getFileIcon(item.file_name)}</span>
                                    )}
                                    <span className="font-bold text-on-surface line-clamp-1">{item.title}</span>
                                  </div>
                                  {item.file_path && (
                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                       className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[10px] font-bold flex items-center gap-0.5 flex-shrink-0">
                                      <span className="material-symbols-outlined text-[12px]">open_in_new</span> Document
                                    </a>
                                  )}
                                </div>
                                {item.description && <p className="text-on-surface-variant line-clamp-2">{item.description}</p>}
                                {item.file_name && <p className="text-[10px] text-on-surface-variant">📎 {item.file_name}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Auto-Added Graduated Section */}
                    {inspectData.is_graduated && (
                      <div className="space-y-3 pt-3 border-t border-outline-variant">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-pinoy-green">
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Graduated Student — Verified OJT Background & Mentor Evaluations</span>
                        </div>

                        {inspectData.ojt_background?.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-bold text-[11px] text-on-surface flex items-center gap-1">
                              <span className="material-symbols-outlined text-vibrant-orange text-[14px]">work_history</span>
                              OJT Training Background
                            </h5>
                            <div className="space-y-2">
                              {inspectData.ojt_background.map((ojt, idx) => (
                                <div key={ojt.ojt_id || idx} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <p className="font-bold text-on-surface text-xs">{ojt.organization_name}</p>
                                      <p className="text-[11px] text-on-surface-variant">{ojt.industry}</p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-tint text-pinoy-green capitalize">
                                      {ojt.status || 'Completed'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-on-surface-variant">
                                    Hours: <strong>{ojt.rendered_hours || 0} / {ojt.required_hours || 0}</strong> hrs
                                    {ojt.mentor_first_name ? ` • Mentor: ${ojt.mentor_first_name} ${ojt.mentor_last_name}` : ''}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(!inspectData.academic_portfolio?.length && !inspectData.credentials?.length && !inspectData.academic_records?.length) && (
                      <div className="p-8 text-center bg-surface-container-low rounded-xl border border-outline-variant text-on-surface-variant">
                        <span className="material-symbols-outlined text-[36px] mb-1">folder_off</span>
                        <p className="font-bold">No career portfolio items uploaded yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: RESUME */}
                {inspectTab === 'resume' && (
                  <div className="space-y-3 text-xs">
                    {inspectData.resumes?.length > 0 ? (
                      <div className="space-y-2">
                        {inspectData.resumes.map((resItem) => (
                          <div key={resItem.resume_id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-purple-600 text-[26px]">description</span>
                              <div>
                                <p className="font-bold text-on-surface">{resItem.file_name || `Resume v${resItem.version}`}</p>
                                <p className="text-[11px] text-on-surface-variant">
                                  Version {resItem.version} {resItem.is_active ? '• (Active)' : ''}
                                </p>
                              </div>
                            </div>
                            {resItem.file_path && (
                              <a
                                href={resolveFileUrl(resItem.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg font-bold text-xs hover:bg-purple-700 transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[14px]">download</span>
                                <span>Download</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-surface-container-low rounded-xl border border-outline-variant text-on-surface-variant">
                        <span className="material-symbols-outlined text-[36px] mb-1">description</span>
                        <p className="font-bold">No resume document uploaded.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: EVALUATIONS */}
                {inspectTab === 'evaluations' && (
                  <div className="space-y-3 text-xs">
                    {inspectData.evaluations?.length > 0 ? (
                      <div className="space-y-2">
                        {inspectData.evaluations.map((ev, idx) => (
                          <div key={idx} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-on-surface">{ev.organization_name}</span>
                              <span className="px-2 py-0.5 rounded-full bg-green-tint text-pinoy-green font-bold text-xs">
                                ⭐ {ev.rating} / 5.0
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant italic">"{ev.comments || 'No written remarks provided.'}"</p>
                            <p className="text-[10px] text-on-surface-variant">
                              Evaluator: {ev.evaluator_first_name ? `${ev.evaluator_first_name} ${ev.evaluator_last_name || ''}` : 'Mentor'} • Period: {ev.evaluation_period || 'Final'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-surface-container-low rounded-xl border border-outline-variant text-on-surface-variant">
                        <span className="material-symbols-outlined text-[36px] mb-1">rate_review</span>
                        <p className="font-bold">No performance evaluations recorded yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: PROFILE */}
                {inspectTab === 'profile' && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Student ID & Contact</span>
                        <p className="font-bold text-on-surface">ID #{inspectData.intern.student_number}</p>
                        <p className="text-on-surface-variant">Email: {inspectData.intern.student_email}</p>
                        {inspectData.intern.contact_number && <p className="text-on-surface-variant">Phone: {inspectData.intern.contact_number}</p>}
                      </div>
                      <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Academic Info</span>
                        <p className="font-bold text-on-surface">{inspectData.intern.institution_name}</p>
                        <p className="text-on-surface-variant">{inspectData.intern.program_name} ({inspectData.intern.program_code})</p>
                        <p className="text-on-surface-variant capitalize">Status: {inspectData.intern.ojt_status || 'Ongoing'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
