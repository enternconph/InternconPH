import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { resolveFileUrl, getFileIcon, isImageFile } from '../../utils/fileHelper';
import Pagination from '../../components/ui/Pagination';

export default function OrgOJT() {
  const [interns, setInterns] = useState([]);
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

  // Mentor Time-Out Confirmation Modal (Automated calculation, no manual time/hour inputs)
  const [showTimeOutModal, setShowTimeOutModal] = useState(false);
  const [timeOutStudent, setTimeOutStudent] = useState(null);
  const [timeOutForm, setTimeOutForm] = useState({
    tasks_accomplished: ''
  });
  const [submittingTimeOut, setSubmittingTimeOut] = useState(false);

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
      const res = await api.get('/org/interns');
      if (res.success && res.data) {
        setInterns(res.data);
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
      setTimeout(() => setErrorMessage(''), 4500);
    } else {
      setMessage(msg);
      setErrorMessage('');
      setTimeout(() => setMessage(''), 4500);
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
    setTimeOutForm({
      tasks_accomplished: intern.today_tasks || ''
    });
    setShowTimeOutModal(true);
  };

  const handleTimeOutSubmit = async (e) => {
    e.preventDefault();
    if (!timeOutStudent) return;
    setSubmittingTimeOut(true);
    try {
      const res = await api.post(`/org/interns/${timeOutStudent.ojt_id}/time-out`, {
        tasks_accomplished: timeOutForm.tasks_accomplished
      });
      if (res.success) {
        showToast(res.message || `Timed out and credited training hours for ${timeOutStudent.first_name}!`);
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
        const role = String(i.job_title || i.position_title || '').toLowerCase();
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

  // Helper to format Philippine Time display
  const formatPHTTime = (timeStr) => {
    if (!timeStr) return '—';
    try {
      const clean = timeStr.slice(0, 5);
      const [h, m] = clean.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const formattedH = h % 12 || 12;
      return `${formattedH}:${String(m).padStart(2, '0')} ${period}`;
    } catch (e) {
      return timeStr;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-on-surface">Supervised Interns Attendance & DTR</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-emerald-600 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync (PST UTC+8)
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Supervise active interns, record daily clock-in and clock-out with automated on-time / late and overtime capping rules.
          </p>
        </div>

        {/* Real-time Timezone Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface self-start sm:self-auto">
          <span className="material-symbols-outlined text-[16px] text-vibrant-orange">schedule</span>
          <span className="font-bold">Philippine Standard Time (UTC+8)</span>
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

      {/* SUPERVISED INTERNS BENTO */}
      <div className="bento-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-3">
          <div>
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange">badge</span>
              Supervised Interns ({filteredInterns.length}{filteredInterns.length !== interns.length ? ` of ${interns.length}` : ''})
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Strictly timestamped via Philippine Time. Overtime is automatically capped to scheduled finish time.
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
            <table className="w-full text-left text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                  <th className="py-3 px-4">Intern Details</th>
                  <th className="py-3 px-4">University & Program</th>
                  <th className="py-3 px-4">Position & Schedule (PST)</th>
                  <th className="py-3 px-4">Rendered / Required</th>
                  <th className="py-3 px-4">Today's Attendance (Mentor Handled)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {paginatedInterns.map((intern) => {
                  const req = intern.required_hours || intern.required_ojt_hours || 600;
                  const done = intern.rendered_hours || 0;
                  const isCompleted = intern.status === 'completed' || done >= req;
                  const pct = req > 0 ? Math.min(100, Math.round((done / req) * 100)) : 0;
                  const schedStart = intern.scheduled_start_time || '08:00';
                  const schedFinish = intern.scheduled_finish_time || '17:00';

                  return (
                    <tr key={intern.ojt_id} className="hover:bg-surface-container-low transition-colors">
                      {/* Intern Name & Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-vibrant-orange/10 text-vibrant-orange font-bold flex items-center justify-center text-xs shrink-0">
                            {intern.first_name?.[0] || 'I'}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface text-xs">{intern.first_name} {intern.last_name}</p>
                            <p className="text-[11px] text-on-surface-variant">ID #{intern.student_number}</p>
                            {(intern.mentor_first_name || intern.supervisor_name) && (
                              <p className="text-[10px] text-primary dark:text-primary-container font-medium mt-0.5 flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[12px]">person_check</span>
                                <span>Mentor: {intern.mentor_first_name ? `${intern.mentor_first_name} ${intern.mentor_last_name}` : intern.supervisor_name}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* University & Program */}
                      <td className="py-3 px-4 text-xs text-on-surface-variant">
                        <p className="font-bold text-on-surface">{intern.institution_name}</p>
                        <p className="text-[11px]">{intern.program_name}</p>
                      </td>

                      {/* Position & Work Schedule */}
                      <td className="py-3 px-4 text-xs">
                        <p className="font-bold text-on-surface">{intern.position_title || intern.job_title || 'Intern'}</p>
                        <span className="inline-flex items-center gap-1 font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] mt-0.5">
                          <span className="material-symbols-outlined text-[11px] text-vibrant-orange">schedule</span>
                          <span>{schedStart} - {schedFinish} (PST)</span>
                        </span>
                      </td>

                      {/* Rendered / Required Progress */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span>{done} / {req} hrs</span>
                            <span className={isCompleted ? 'text-pinoy-green font-black' : 'text-vibrant-orange'}>
                              {isCompleted ? 'Completed' : `${pct}%`}
                            </span>
                          </div>
                          <div className="w-24 bg-surface-container h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isCompleted ? 'bg-pinoy-green' : 'bg-vibrant-orange'}`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Today's Attendance Cell */}
                      <td className="py-3 px-4">
                        {isCompleted ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">verified</span>
                              <span>Completed</span>
                            </span>
                          </div>
                        ) : !intern.today_time_in ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-on-surface-variant font-medium">Not Timed In</span>
                            <button
                              onClick={() => handleQuickTimeIn(intern)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                              title="Time in student for today (PST)"
                            >
                              <span className="material-symbols-outlined text-[15px]">login</span>
                              <span>Time In</span>
                            </button>
                          </div>
                        ) : !intern.today_time_out ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse font-mono">
                                In: {intern.today_time_in.slice(0, 5)}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                intern.today_time_in_status === 'late'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}>
                                {intern.today_time_in_status === 'late' ? 'Late' : 'On-Time'}
                              </span>
                            </div>
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
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-tint text-pinoy-green border border-pinoy-green/20 flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[13px]">verified</span>
                                <span>{intern.today_hours || 0} hrs credited</span>
                              </span>
                              <span className="text-[10px] text-on-surface-variant font-mono">
                                ({intern.today_time_in.slice(0, 5)} - {intern.today_time_out.slice(0, 5)})
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {/* In Status */}
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                intern.today_time_in_status === 'late'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                In: {intern.today_time_in_status === 'late' ? 'Late' : 'On-Time'}
                              </span>
                              {/* Out Status */}
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                intern.today_time_out_status === 'early'
                                  ? 'bg-amber-100 text-amber-800'
                                  : intern.today_time_out_status === 'overtime'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                Out: {intern.today_time_out_status === 'early' ? 'Early' : intern.today_time_out_status === 'overtime' ? 'Overtime (Capped)' : 'On-Time'}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleInspectIntern(intern.ojt_id)}
                            className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                            title="Inspect Intern Portfolio and Profile"
                          >
                            <span className="material-symbols-outlined text-[14px]">visibility</span>
                            <span>Portfolio</span>
                          </button>
                          <button
                            onClick={() => {
                              setIncidentStudent(intern);
                              setIncidentForm({ subject: '', description: '' });
                              setShowIncidentModal(true);
                            }}
                            className="p-1 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-lg transition-colors"
                            title="Report Student Misconduct / Issue"
                          >
                            <span className="material-symbols-outlined text-[18px]">report_problem</span>
                          </button>
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

      {/* Incident / Misconduct Report Modal */}
      {showIncidentModal && incidentStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface border border-outline-variant rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 max-h-[90dvh] overflow-y-auto">
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
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none focus:border-vibrant-orange"
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
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface outline-none focus:border-vibrant-orange"
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

      {/* Mentor Time-Out Confirmation Modal (Automated calculation, anti-manipulation) */}
      {showTimeOutModal && timeOutStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface border border-outline-variant rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange">logout</span>
                Record Student Daily Time-Out
              </h3>
              <button onClick={() => setShowTimeOutModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 bg-surface-container rounded-xl text-xs space-y-1.5">
              <p className="font-bold text-on-surface">
                Intern: {timeOutStudent.first_name} {timeOutStudent.last_name} (#{timeOutStudent.student_number})
              </p>
              <p className="text-on-surface-variant">{timeOutStudent.institution_name} • {timeOutStudent.program_name}</p>
              
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant">
                <div>
                  <span className="text-[10px] text-on-surface-variant block">Today's Time-In:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatPHTTime(timeOutStudent.today_time_in)}
                  </span>
                  <span className={`ml-1 text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                    timeOutStudent.today_time_in_status === 'late'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {timeOutStudent.today_time_in_status === 'late' ? 'Late' : 'On-Time'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant block">Target Schedule:</span>
                  <span className="font-mono text-on-surface font-semibold">
                    {timeOutStudent.scheduled_start_time || '08:00'} - {timeOutStudent.scheduled_finish_time || '17:00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Anti-manipulation info banner */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs text-blue-900">
              <span className="material-symbols-outlined text-[18px] text-blue-600 shrink-0 mt-0.5">verified_user</span>
              <div className="space-y-0.5">
                <p className="font-bold">Automated Attendance & Overtime Capping</p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Time-out timestamp is automatically captured using Philippine Standard Time (UTC+8). If the student departs after scheduled finish time ({timeOutStudent.scheduled_finish_time || '17:00'}), additional overtime will <strong>not</strong> be credited to required OJT hours.
                </p>
              </div>
            </div>

            <form onSubmit={handleTimeOutSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Tasks Accomplished / Training Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={timeOutForm.tasks_accomplished}
                  onChange={(e) => setTimeOutForm({ ...timeOutForm, tasks_accomplished: e.target.value })}
                  placeholder="e.g. Completed module assignments, participated in design review, finalized deliverables..."
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
                  className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>{submittingTimeOut ? 'Recording Time-Out...' : 'Confirm Time-Out (PST)'}</span>
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
                            let fileUrl = resolveFileUrl(item.file_path);
                            if (fileUrl.includes('/api/certificates/render/')) {
                              fileUrl += (fileUrl.includes('?') ? '&' : '?') + 'viewOnly=true';
                            }
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
                                       className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-bold flex items-center gap-0.5 flex-shrink-0"
                                       title="View File (Read-Only)">
                                      <span className="material-symbols-outlined text-[12px]">visibility</span> View
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
                            let fileUrl = resolveFileUrl(item.file_path);
                            if (fileUrl.includes('/api/certificates/render/')) {
                              fileUrl += (fileUrl.includes('?') ? '&' : '?') + 'viewOnly=true';
                            }
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
                                       className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 text-[10px] font-bold flex items-center gap-0.5 flex-shrink-0"
                                       title="View Credential (Read-Only)">
                                      <span className="material-symbols-outlined text-[12px]">visibility</span> View
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
                            let fileUrl = resolveFileUrl(item.file_path);
                            if (fileUrl.includes('/api/certificates/render/')) {
                              fileUrl += (fileUrl.includes('?') ? '&' : '?') + 'viewOnly=true';
                            }
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
                                       className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[10px] font-bold flex items-center gap-0.5 flex-shrink-0"
                                       title="View Record (Read-Only)">
                                      <span className="material-symbols-outlined text-[12px]">visibility</span> View
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
                                title="View Resume (Read-Only)"
                              >
                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                <span>View Resume</span>
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
