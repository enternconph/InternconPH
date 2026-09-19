import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import Pagination from '../../components/ui/Pagination';

export default function InstMonitoring() {
  const [data, setData] = useState({ deployments: [], complaints: [], employerComplaints: [], institutionReports: [] });
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [reviewForm, setReviewForm] = useState({ findings: '', recommendation: '', action_taken: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Modal states for new actions
  const [forwardModal, setForwardModal] = useState(null);
  const [forwardForm, setForwardForm] = useState({ summary: '', include_student_details: false });
  const [warnModal, setWarnModal] = useState(null);
  const [warnForm, setWarnForm] = useState({ warning_note: '' });
  const [escalateModal, setEscalateModal] = useState(null);
  const [escalateForm, setEscalateForm] = useState({ report_title: '', findings: '', recommendations: '' });
  const [certModal, setCertModal] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const validTabs = ['deployments', 'studentGrievances', 'employerComplaints', 'accidentReports', 'reports'];
  const [activeSection, setActiveSection] = useState(() => (urlTab && validTabs.includes(urlTab)) ? urlTab : 'deployments');

  // Separate conduct complaints and accident reports
  const conductList = useMemo(() => {
    return data.conductComplaints || (data.employerComplaints || []).filter(c => !c.is_accident && !c.accident_id);
  }, [data.conductComplaints, data.employerComplaints]);

  const accidentList = useMemo(() => {
    return data.accidentReports || (data.employerComplaints || []).filter(c => c.is_accident || c.accident_id);
  }, [data.accidentReports, data.employerComplaints]);

  // Pagination states
  const [depPage, setDepPage] = useState(1);
  const depPageSize = 15;
  const [grievancePage, setGrievancePage] = useState(1);
  const grievancePageSize = 10;
  const [conductPage, setConductPage] = useState(1);
  const conductPageSize = 10;
  const [accidentPage, setAccidentPage] = useState(1);
  const accidentPageSize = 10;

  const paginatedDeployments = useMemo(() => {
    const list = data.deployments || [];
    return list.slice((depPage - 1) * depPageSize, depPage * depPageSize);
  }, [data.deployments, depPage]);

  const paginatedGrievances = useMemo(() => {
    const list = data.complaints || [];
    return list.slice((grievancePage - 1) * grievancePageSize, grievancePage * grievancePageSize);
  }, [data.complaints, grievancePage]);

  const paginatedConductComplaints = useMemo(() => {
    return conductList.slice((conductPage - 1) * conductPageSize, conductPage * conductPageSize);
  }, [conductList, conductPage]);

  const paginatedAccidentReports = useMemo(() => {
    return accidentList.slice((accidentPage - 1) * accidentPageSize, accidentPage * accidentPageSize);
  }, [accidentList, accidentPage]);

  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab) && urlTab !== activeSection) {
      setActiveSection(urlTab);
    }
  }, [urlTab]);

  const fetchMonitoring = useCallback(async () => {
    try {
      const res = await api.get('/inst/monitoring');
      if (res.success && res.data) {
        setData({
          deployments: res.data.deployments || [],
          complaints: res.data.complaints || [],
          employerComplaints: res.data.employerComplaints || [],
          conductComplaints: res.data.conductComplaints || [],
          accidentReports: res.data.accidentReports || [],
          institutionReports: res.data.institutionReports || [],
          staff_scope: res.data.staff_scope || null
        });
      }
    } catch (err) {
      console.error('Fetch monitoring error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitoring();
  }, [fetchMonitoring]);

  useRealtimeRefresh(fetchMonitoring);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenReview = (c) => {
    setSelectedComplaint(c);
    setReviewForm({ findings: '', recommendation: '', action_taken: '' });
  };

  const handleOpenForward = (c) => {
    setForwardModal(c);
    setForwardForm({ summary: `Grievance Notice regarding: "${c.title || c.subject}"`, include_details: false });
  };

  const handleOpenWarning = (c) => {
    setWarnModal(c);
    setWarnForm({ warning_note: '' });
  };

  const handleOpenEscalate = (c) => {
    setEscalateModal(c);
    setEscalateForm({
      report_title: `Investigation Report: ${c.title || c.subject || 'Workplace Incident'}`,
      findings: c.investigation_findings || '',
      recommendations: ''
    });
  };

  const submitReview = async () => {
    if (!reviewForm.findings.trim()) {
      alert('Please provide review findings.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/inst/complaints/${selectedComplaint.complaint_id}/review`, reviewForm);
      if (res.success) {
        showToast('Internal review findings recorded.');
        setSelectedComplaint(null);
        fetchMonitoring();
      } else {
        alert(res.message || 'Failed to submit review.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Server error submitting review.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitForward = async () => {
    if (!forwardForm.summary.trim()) {
      alert('Please provide a notice summary for the organization.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/inst/complaints/${forwardModal.complaint_id}/forward-org`, {
        notice_summary: forwardForm.summary,
        include_student_details: forwardForm.include_details
      });
      if (res.success) {
        showToast('Official notice forwarded to the partner organization.');
        setForwardModal(null);
        fetchMonitoring();
      } else {
        alert(res.message || 'Failed to forward notice.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Server error forwarding notice.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitWarning = async () => {
    if (warnModal?.is_accident || warnModal?.accident_id) {
      alert('Disciplinary warnings cannot be issued to students for accident or workplace injury reports.');
      setWarnModal(null);
      return;
    }
    if (!warnForm.warning_note.trim()) {
      alert('Please enter warning note content.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/inst/complaints/${warnModal.complaint_id}/warn-student`, warnForm);
      if (res.success) {
        showToast('Official warning note issued to student.');
        setWarnModal(null);
        fetchMonitoring();
      } else {
        alert(res.message || 'Failed to issue warning.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Server error issuing warning.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitEscalate = async () => {
    if ((escalateModal?.is_accident || escalateModal?.accident_id) && (escalateModal?.is_escalated_to_admin > 0 || escalateModal?.status === 'admin_review')) {
      alert('This safety report has already been escalated to the System Administrator. Escalations can only be sent 1 time.');
      setEscalateModal(null);
      return;
    }
    if (!escalateForm.report_title.trim() || !escalateForm.findings.trim() || !escalateForm.recommendations.trim()) {
      alert('All report fields are required for formal admin escalation.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/inst/complaints/${escalateModal.complaint_id}/escalate-admin`, {
        title: escalateForm.report_title,
        findings: escalateForm.findings,
        recommendation: escalateForm.recommendations
      });
      if (res.success) {
        showToast('Formal Institution Report filed and submitted to System Admin.');
        setEscalateModal(null);
        fetchMonitoring();
      } else {
        alert(res.message || 'Failed to escalate report.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Server error escalating report.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewComplaint = async (e) => {
    if (e) e.preventDefault();
    await submitReview();
  };

  const handleForwardToOrg = async (e) => {
    if (e) e.preventDefault();
    await submitForward();
  };

  const handleWarnStudent = async (e) => {
    if (e) e.preventDefault();
    await submitWarning();
  };

  const handleEscalateToAdmin = async (e) => {
    if (e) e.preventDefault();
    await submitEscalate();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-on-surface">Real-Time OJT Monitoring & Grievance Oversight</h1>
            {data.staff_scope?.isRestricted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-tint text-vibrant-orange font-bold text-xs border border-vibrant-orange/30 shadow-xs">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Assigned: {data.staff_scope.program?.program_name} {data.staff_scope.program?.program_code ? `(${data.staff_scope.program.program_code})` : ''}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {data.staff_scope?.isRestricted
              ? `Displaying student interns and complaints belonging strictly to your assigned degree program.`
              : 'Live oversight of student interns deployed across partner companies'}
          </p>
        </div>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-outline-variant text-xs font-semibold overflow-x-auto max-w-full">
        {[
          { key: 'deployments', icon: 'badge', label: `Active Deployments (${data.deployments?.length || 0})` },
          { key: 'studentGrievances', icon: 'gavel', label: `Student Grievances (${data.complaints?.length || 0})` },
          { key: 'employerComplaints', icon: 'report_problem', label: `Employer Complaints (${conductList.length})` },
          { key: 'accidentReports', icon: 'emergency', label: `Accident Reports (${accidentList.length})`, isAccident: true },
          { key: 'reports', icon: 'description', label: `Institution Reports (${data.institutionReports?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveSection(tab.key);
              setSearchParams({ tab: tab.key });
            }}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSection === tab.key
                ? tab.isAccident
                  ? 'bg-surface-container-lowest text-rose-600 shadow-sm font-bold'
                  : 'bg-surface-container-lowest text-vibrant-orange shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className={`material-symbols-outlined text-[18px] ${tab.isAccident && activeSection === tab.key ? 'text-rose-600' : ''}`}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Active Deployments Table */}
      {activeSection === 'deployments' && (
        <div className="bento-card space-y-4">
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange">badge</span>
            Active Student Deployments ({data.deployments?.length || 0})
          </h2>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : data.deployments?.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-6">No active student deployments currently recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Host Company</th>
                    <th className="py-2.5 px-3">Hours Rendered</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {paginatedDeployments.map((d) => {
                    const req = d.required_ojt_hours || d.required_hours || 600;
                    const done = d.rendered_hours || 0;
                    const pct = Math.min(100, Math.round((done / req) * 100));

                    return (
                      <tr key={d.ojt_id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-on-surface">{d.first_name} {d.last_name}</p>
                          <p className="text-xs text-on-surface-variant">ID #{d.student_number}</p>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-on-surface-variant">{d.program_name || 'General Academic'}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-xs text-on-surface">{d.organization_name}</p>
                          <p className="text-[11px] text-on-surface-variant">{d.org_email}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span>{done} / {req} hrs</span>
                              <span className="text-vibrant-orange">{pct}%</span>
                            </div>
                            <div className="w-32 bg-surface-container h-2 rounded-full overflow-hidden">
                              <div className="bg-vibrant-orange h-full rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                            d.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-green-tint text-pinoy-green'
                          }`}>
                            {d.status || 'ongoing'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {d.certificate_id ? (
                            <button
                              onClick={() => setCertModal(d)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm"
                              title={`Certificate Code: ${d.certificate_code}`}
                            >
                              <span className="material-symbols-outlined text-[15px]">workspace_premium</span>
                              View Cert
                            </button>
                          ) : d.status === 'completed' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              {d.evaluation_id ? 'Completed (Generating)' : 'Awaiting Org Eval'}
                            </span>
                          ) : (
                            <span className="text-xs text-on-surface-variant italic">In Progress</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data.deployments?.length > depPageSize && (
            <Pagination
              currentPage={depPage}
              totalPages={Math.ceil(data.deployments.length / depPageSize)}
              onPageChange={setDepPage}
            />
          )}
        </div>
      )}

      {/* Student Grievances Section */}
      {activeSection === 'studentGrievances' && (
        <div className="bento-card space-y-4">
          <div className="border-b border-outline-variant pb-3">
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-error">gavel</span>
              Student Grievances Filed Against Organizations ({data.complaints?.length || 0})
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Review student-filed formal grievances. You can forward a sanitized notice to the implicated organization, issue a warning to the student, or escalate a formal report to System Admin.
            </p>
          </div>

          {data.complaints?.length === 0 ? (
            <div className="py-10 text-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">verified</span>
              <p className="text-sm font-bold">No student grievances on record</p>
              <p className="text-xs">No formal complaints have been filed by students against partner organizations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedGrievances.map((c) => (
                <div key={c.complaint_id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error-container text-error">
                          {c.status || 'submitted'}
                        </span>
                        {c.student_status && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            c.student_status === 'ojt' ? 'bg-orange-tint text-vibrant-orange' : 'bg-green-tint text-pinoy-green'
                          }`}>
                            {c.student_status === 'ojt' ? 'OJT Student' : 'Graduated Student'}
                          </span>
                        )}
                        {c.forwarded_to_org ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Forwarded to Org
                          </span>
                        ) : null}
                        {c.warning_note_to_student ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Warning Issued
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        Filed by: <strong className="text-on-surface">{c.first_name} {c.last_name}</strong> vs <strong className="text-on-surface">{c.organization_name || 'Employer'}</strong>
                      </span>
                      <h4 className="font-bold text-sm text-on-surface">{c.subject}</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">{c.description}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-outline-variant/50">
                    <button
                      onClick={() => {
                        setSelectedComplaint(c);
                        setReviewForm({ findings: '', recommendation: '', action_taken: '' });
                      }}
                      className="px-3 py-1.5 bg-surface-container text-xs font-bold rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">rate_review</span>
                      Review / Investigate
                    </button>

                    <button
                      onClick={() => {
                        setForwardModal(c);
                        setForwardForm({ summary: '', include_student_details: false });
                      }}
                      disabled={c.forwarded_to_org}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
                      {c.forwarded_to_org ? 'Already Forwarded' : 'Forward Notice to Org'}
                    </button>

                    {(!c.is_accident && !c.accident_id) && (
                      <button
                        onClick={() => {
                          setWarnModal(c);
                          setWarnForm({ warning_note: '' });
                        }}
                        className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        Issue Warning to Student
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEscalateModal(c);
                        setEscalateForm({ report_title: '', findings: '', recommendations: '' });
                      }}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">shield</span>
                      Escalate Report to Admin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.complaints?.length > grievancePageSize && (
            <Pagination
              currentPage={grievancePage}
              totalPages={Math.ceil(data.complaints.length / grievancePageSize)}
              onPageChange={setGrievancePage}
            />
          )}
        </div>
      )}

      {/* Employer Conduct Complaints Section */}
      {activeSection === 'employerComplaints' && (
        <div className="bento-card space-y-4">
          <div className="border-b border-outline-variant pb-3">
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange">report_problem</span>
              Employer Conduct Complaints About Interns ({conductList.length})
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Misconduct, attendance, and policy violation reports submitted by partner organizations. You can review findings, issue an official Warning Note to the student, or escalate to Admin.
            </p>
          </div>

          {conductList.length === 0 ? (
            <div className="py-10 text-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">thumb_up</span>
              <p className="text-sm font-bold">No employer conduct complaints</p>
              <p className="text-xs">Partner organizations have not filed any conduct or behavioral reports regarding your students.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedConductComplaints.map((c) => (
                <div key={c.complaint_id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          c.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          c.status === 'under_investigation' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {c.status?.replace(/_/g, ' ') || 'SUBMITTED'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant">
                          Conduct Report
                        </span>
                        {c.warning_note_to_student && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Warning Sent
                          </span>
                        )}
                        <span className="text-[11px] text-on-surface-variant ml-auto">
                          {c.filed_at || c.created_at ? new Date(c.filed_at || c.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : ''}
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        Filed by: <strong className="text-on-surface">{c.organization_name || 'Organization'}</strong> against{' '}
                        <strong className="text-on-surface">{c.student_name || (c.first_name ? `${c.first_name} ${c.last_name}` : 'Student')}</strong>{' '}
                        {c.student_number && <span className="text-outline">({c.student_number})</span>}
                      </span>
                      <h4 className="font-bold text-sm text-on-surface">{c.title || c.subject}</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">{c.description}</p>
                    </div>
                  </div>

                  {/* Action Buttons for Conduct Complaints */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-outline-variant/50">
                    <button
                      onClick={() => {
                        setSelectedComplaint(c);
                        setReviewForm({ findings: '', recommendation: '', action_taken: '' });
                      }}
                      className="px-3 py-1.5 bg-surface-container text-xs font-bold rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">rate_review</span>
                      Review Findings
                    </button>

                    <button
                      onClick={() => {
                        setWarnModal(c);
                        setWarnForm({ warning_note: '' });
                      }}
                      disabled={!!c.warning_note_to_student}
                      className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      {c.warning_note_to_student ? 'Warning Already Issued' : 'Issue Warning to Student'}
                    </button>

                    <button
                      onClick={() => {
                        setEscalateModal(c);
                        setEscalateForm({ report_title: '', findings: '', recommendations: '' });
                      }}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">shield</span>
                      Escalate Report to Admin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {conductList.length > conductPageSize && (
            <Pagination
              currentPage={conductPage}
              totalPages={Math.ceil(conductList.length / conductPageSize)}
              onPageChange={setConductPage}
            />
          )}
        </div>
      )}

      {/* Workplace Accident & Injury Reports Section */}
      {activeSection === 'accidentReports' && (
        <div className="bento-card space-y-4">
          <div className="border-b border-outline-variant pb-3">
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600">emergency</span>
              Workplace Accident & Physical Injury Reports ({accidentList.length})
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Workplace injuries, safety hazards, and emergency filings submitted by partner organizations. Review safety details, medical attention given, and preventive measures. (Disciplinary warnings cannot be issued to students for accidents).
            </p>
          </div>

          {accidentList.length === 0 ? (
            <div className="py-10 text-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-4xl text-rose-300">health_and_safety</span>
              <p className="text-sm font-bold">No workplace accident reports</p>
              <p className="text-xs">No workplace accidents or physical injury filings have been submitted regarding your students.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedAccidentReports.map((c) => (
                <div key={c.complaint_id} className="p-4 bg-surface-container-low rounded-xl border border-rose-200/70 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          c.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          c.status === 'under_investigation' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {c.status?.replace(/_/g, ' ') || 'SUBMITTED'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          c.accident_severity === 'fatal' || c.accident_severity === 'critical' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          c.accident_severity === 'severe' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          <span className="material-symbols-outlined text-[13px]">emergency</span>
                          Severity: {c.accident_severity || 'Reported'}
                        </span>
                        {c.medical_attention_required ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[13px]">local_hospital</span>
                            Medical Attention Required
                          </span>
                        ) : null}
                        {Boolean(c.is_escalated_to_admin > 0 || c.status === 'admin_review') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[13px]">shield</span>
                            Admin Escalated
                          </span>
                        )}
                        <span className="text-[11px] text-on-surface-variant ml-auto">
                          {c.filed_at || c.created_at ? new Date(c.filed_at || c.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : ''}
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        Reported by: <strong className="text-on-surface">{c.organization_name || 'Organization'}</strong> involving{' '}
                        <strong className="text-on-surface">{c.student_name || (c.first_name ? `${c.first_name} ${c.last_name}` : 'Student')}</strong>{' '}
                        {c.student_number && <span className="text-outline">({c.student_number})</span>}
                      </span>
                      <h4 className="font-bold text-sm text-on-surface">{c.title || c.subject}</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{c.description}</p>
                    </div>
                  </div>

                  {/* Accident Details Grid */}
                  <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl text-xs space-y-1.5">
                    <h5 className="font-bold text-rose-900 flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-rose-600">medical_services</span>
                      Accident & Injury Details
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(c.incident_location || c.accident_location) && (
                        <div><strong className="text-rose-800">Facility Location:</strong> {c.incident_location || c.accident_location}</div>
                      )}
                      {(c.incident_datetime) && (
                        <div><strong className="text-rose-800">Incident Date/Time:</strong> {new Date(c.incident_datetime).toLocaleString()}</div>
                      )}
                      {(c.injuries_sustained || c.injury_description) && (
                        <div className="col-span-1 sm:col-span-2"><strong className="text-rose-800">Injuries Sustained:</strong> {c.injuries_sustained || c.injury_description}</div>
                      )}
                      {c.medical_attention_given && (
                        <div className="col-span-1 sm:col-span-2"><strong className="text-rose-800">Medical Attention Provided:</strong> {c.medical_attention_given}</div>
                      )}
                      {(c.emergency_actions_taken || c.immediate_action_taken) && (
                        <div className="col-span-1 sm:col-span-2"><strong className="text-rose-800">Immediate Action Taken:</strong> {c.emergency_actions_taken || c.immediate_action_taken}</div>
                      )}
                      {c.preventive_measures && (
                        <div className="col-span-1 sm:col-span-2"><strong className="text-rose-800">Preventive Measures:</strong> {c.preventive_measures}</div>
                      )}
                      {c.witnesses && (
                        <div className="col-span-1 sm:col-span-2"><strong className="text-rose-800">Witnesses:</strong> {c.witnesses}</div>
                      )}
                    </div>
                  </div>

                  {/* Actions for Accident Reports */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-outline-variant/50">
                    {Boolean(c.is_escalated_to_admin > 0 || c.status === 'admin_review') ? (
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1.5 bg-surface-container text-on-surface-variant text-xs font-bold rounded-lg border border-outline-variant/60 opacity-70 cursor-not-allowed flex items-center gap-1.5"
                        title="This safety issue has already been escalated to the System Administrator (1 time only limit)."
                      >
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                        Safety Issue Already Escalated to Admin
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEscalateModal(c);
                          setEscalateForm({
                            report_title: `Safety Incident Escalation: ${c.title || c.subject || 'Workplace Accident'}`,
                            findings: c.injuries_sustained || c.injury_description || c.description || '',
                            recommendations: c.preventive_measures || ''
                          });
                        }}
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">shield</span>
                        Escalate Safety Issue to Admin
                      </button>
                    )}

                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant bg-surface-container border border-outline-variant/40 ml-auto"
                      title="Disciplinary warnings cannot be issued for workplace accidents or injuries"
                    >
                      <span className="material-symbols-outlined text-[15px] text-on-surface-variant">health_and_safety</span>
                      Disciplinary Warning Not Applicable
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {accidentList.length > accidentPageSize && (
            <Pagination
              currentPage={accidentPage}
              totalPages={Math.ceil(accidentList.length / accidentPageSize)}
              onPageChange={setAccidentPage}
            />
          )}
        </div>
      )}

      {/* Institution Reports Section (reports already escalated) */}
      {activeSection === 'reports' && (
        <div className="bento-card space-y-4">
          <div className="border-b border-outline-variant pb-3">
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange">description</span>
              Institution Reports Filed to System Admin ({data.institutionReports?.length || 0})
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Formal reports you have escalated to System Administration. Repeat reports against the same organization may trigger admin sanctions.
            </p>
          </div>

          {data.institutionReports?.length === 0 ? (
            <div className="py-10 text-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">description</span>
              <p className="text-sm font-bold">No reports escalated yet</p>
              <p className="text-xs">Use the "Escalate Report to Admin" action on grievances to file formal institution reports.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[650px]">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                    <th className="py-3 px-3">Report Title</th>
                    <th className="py-3 px-3">Organization</th>
                    <th className="py-3 px-3">Findings</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Filed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {data.institutionReports.map((r) => (
                    <tr key={r.report_id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3 px-3 font-semibold text-on-surface text-xs">{r.report_title}</td>
                      <td className="py-3 px-3 text-xs text-on-surface-variant">{r.organization_name}</td>
                      <td className="py-3 px-3 text-xs text-on-surface-variant max-w-xs truncate">{r.findings}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.admin_action === 'resolved' ? 'bg-emerald-50 text-emerald-700' :
                          r.admin_action ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {r.admin_action || 'Pending Review'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-on-surface-variant">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---- MODALS ---- */}

      {/* Existing Complaint Review Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="font-bold text-base text-on-surface">Institution Grievance Review</h3>
              <button onClick={() => setSelectedComplaint(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 bg-surface-container rounded-xl text-xs space-y-1">
              <p className="font-bold text-on-surface">Subject: {selectedComplaint.subject}</p>
              <p className="text-on-surface-variant">
                Complainant: <span className="font-bold text-on-surface">{selectedComplaint.first_name} {selectedComplaint.last_name}</span>
                {selectedComplaint.student_status && (
                  <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedComplaint.student_status === 'ojt' ? 'bg-orange-tint text-vibrant-orange' : 'bg-green-tint text-pinoy-green'
                  }`}>
                    {selectedComplaint.student_status === 'ojt' ? 'OJT Student' : 'Graduated Student'}
                  </span>
                )}
              </p>
              <p className="text-on-surface-variant">Target Org: <span className="font-bold text-on-surface">{selectedComplaint.organization_name}</span></p>
              <p className="mt-2 text-on-surface font-mono">{selectedComplaint.description}</p>
            </div>

            <form onSubmit={handleReviewComplaint} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Coordinator / Counselor Findings</label>
                <textarea
                  required
                  rows={2}
                  value={reviewForm.findings}
                  onChange={(e) => setReviewForm({ ...reviewForm, findings: e.target.value })}
                  placeholder="Summarize investigation findings and student statements..."
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Institution Recommendation</label>
                <input
                  type="text"
                  required
                  value={reviewForm.recommendation}
                  onChange={(e) => setReviewForm({ ...reviewForm, recommendation: e.target.value })}
                  placeholder="e.g. Issue Warning, Reassign student, Account suspension"
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Immediate Action Taken</label>
                <input
                  type="text"
                  value={reviewForm.action_taken}
                  onChange={(e) => setReviewForm({ ...reviewForm, action_taken: e.target.value })}
                  placeholder="e.g. Student debriefed, escalated to Admin"
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-vibrant-orange text-white text-xs font-bold rounded-xl hover:bg-deep-orange transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Findings & Escalate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forward Notice to Organization Modal */}
      {forwardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">forward_to_inbox</span>
                  Forward Formal Notice to Organization
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Target: <strong>{forwardModal.organization_name}</strong>
                </p>
              </div>
              <button onClick={() => setForwardModal(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <p className="font-bold">Privacy Notice</p>
              <p>
                Per governance policy, the student's personal details are hidden from the organization unless you explicitly check "Include Student Identity" below. The organization will receive only the inquiry summary you write here.
              </p>
            </div>

            <form onSubmit={handleForwardToOrg} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Sanitized Notice Summary <span className="text-error">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={forwardForm.summary}
                  onChange={(e) => setForwardForm({ ...forwardForm, summary: e.target.value })}
                  placeholder="Describe the nature of the student complaint, workplace conditions in question, and any expectations of the organization for response..."
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-surface-container-low rounded-xl border border-outline-variant">
                <input
                  type="checkbox"
                  checked={forwardForm.include_student_details}
                  onChange={(e) => setForwardForm({ ...forwardForm, include_student_details: e.target.checked })}
                  className="w-4 h-4 rounded text-vibrant-orange"
                />
                <div>
                  <span className="text-xs font-bold text-on-surface">Include Student Identity</span>
                  <p className="text-[11px] text-on-surface-variant">
                    If checked, the student's name will be disclosed to the organization in this notice.
                  </p>
                </div>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForwardModal(null)}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  {actionLoading ? 'Sending...' : 'Send Notice to Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Warning to Student Modal */}
      {warnModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">warning</span>
                  Issue Official Warning Note to Student
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Student: <strong>{warnModal.first_name ? `${warnModal.first_name} ${warnModal.last_name}` : warnModal.student_name || 'Intern'}</strong>
                </p>
              </div>
              <button onClick={() => setWarnModal(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <p>This official warning will be recorded on the student's grievance record and they will receive a real-time notification.</p>
            </div>

            <form onSubmit={handleWarnStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Warning Note Content <span className="text-error">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={warnForm.warning_note}
                  onChange={(e) => setWarnForm({ ...warnForm, warning_note: e.target.value })}
                  placeholder="Detail the warning, expected corrections, and consequences of repeat violations..."
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWarnModal(null)}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  {actionLoading ? 'Sending...' : 'Send Official Warning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate Formal Report to Admin Modal */}
      {escalateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600">shield</span>
                  {escalateModal.is_accident || escalateModal.accident_id
                    ? 'Escalate Safety Issue to System Admin'
                    : 'File Formal Institution Report to System Admin'}
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Re: <strong>{escalateModal.organization_name || 'Organization'}</strong>
                </p>
              </div>
              <button onClick={() => setEscalateModal(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {escalateModal.is_accident || escalateModal.accident_id ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">info</span>
                  Safety Escalation Rule (1-Time Escalation Limit)
                </p>
                <p>
                  This safety issue can only be escalated to the System Administrator <strong>1 time</strong>. Once submitted, this accident report will be flagged as Admin Escalated and cannot be escalated again.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <p className="font-bold">Governance Rule</p>
                <p>
                  System Admin can only issue Warning, Sanction, or Suspension against an Organization if the same Institution submits multiple reports referencing the same organization. A single report alone will not trigger admin enforcement.
                </p>
              </div>
            )}

            <form onSubmit={handleEscalateToAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Report Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={escalateForm.report_title}
                  onChange={(e) => setEscalateForm({ ...escalateForm, report_title: e.target.value })}
                  placeholder="e.g., Repeated Unsafe Working Conditions at [Company Name]"
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Investigation Findings <span className="text-error">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={escalateForm.findings}
                  onChange={(e) => setEscalateForm({ ...escalateForm, findings: e.target.value })}
                  placeholder="Detail your investigation findings, evidence reviewed, and conclusions..."
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Recommendations to System Admin
                </label>
                <textarea
                  rows={2}
                  value={escalateForm.recommendations}
                  onChange={(e) => setEscalateForm({ ...escalateForm, recommendations: e.target.value })}
                  placeholder="e.g., Recommend issuing formal warning; consider suspension if pattern continues..."
                  className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEscalateModal(null)}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  {actionLoading ? 'Filing Report...' : 'File Formal Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Viewer Modal */}
      {certModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">workspace_premium</span>
                <div>
                  <h3 className="font-bold text-base text-on-surface">OJT Completion Certificate</h3>
                  <p className="text-xs text-on-surface-variant">Verified Digital Credential</p>
                </div>
              </div>
              <button onClick={() => setCertModal(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Certificate Canvas / Card */}
            <div className="border-4 border-double border-emerald-600/40 p-8 rounded-2xl bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30 text-center space-y-4 relative shadow-inner">
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-widest text-emerald-700 font-black">Official Certificate of Completion</span>
                <h4 className="text-2xl font-black text-on-surface font-serif">INTERNSHIP COMPLETION</h4>
                <p className="text-xs text-on-surface-variant">This is to officially certify that</p>
              </div>

              <div className="py-2 border-b-2 border-emerald-600/30 inline-block px-8">
                <span className="text-xl font-bold text-emerald-900 tracking-wide">
                  {certModal.first_name} {certModal.last_name}
                </span>
                <p className="text-xs text-on-surface-variant mt-0.5">Student ID: #{certModal.student_number}</p>
              </div>

              <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                has satisfactorily completed the required <strong>{certModal.rendered_hours || certModal.required_ojt_hours || certModal.required_hours || 600} hours</strong> of On-the-Job Training in <strong>{certModal.program_name || 'Degree Program'}</strong> at <strong>{certModal.organization_name}</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-left border-t border-outline-variant/60 text-xs">
                <div>
                  <span className="text-on-surface-variant block text-[11px]">Evaluation Rating:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {certModal.overall_rating ? `${certModal.overall_rating} / 5.0 ⭐` : 'Completed & Recommended'}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant block text-[11px]">Date Issued:</span>
                  <span className="font-bold text-on-surface">
                    {certModal.cert_issued_at ? new Date(certModal.cert_issued_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <span className="inline-block px-3 py-1 bg-emerald-100/60 rounded-full text-[11px] font-mono font-bold text-emerald-800 border border-emerald-300">
                  CODE: {certModal.certificate_code}
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-2">
              <span className="text-[11px] text-on-surface-variant text-center sm:text-left">Automatically issued upon OJT & Evaluation completion</span>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCertModal(null)}
                  className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high w-full sm:w-auto text-center"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Print / Save Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
