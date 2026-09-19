import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { resolveFileUrl, formatFileSize, getFileIcon, isImageFile, isPdfFile } from '../../utils/fileHelper';
import Pagination from '../../components/ui/Pagination';

export default function OrgApplicants() {
  const [data, setData] = useState({ applicants: [], jobs: [] });
  const [selectedJob, setSelectedJob] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Inspect Modal State
  const [inspectAppId, setInspectAppId] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectTab, setInspectTab] = useState('profile'); // 'profile', 'resume', 'portfolio', 'evaluations'
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const fetchApplicants = useCallback(async () => {
    try {
      const query = selectedJob ? `?job_id=${selectedJob}` : '';
      const res = await api.get(`/org/applicants${query}`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Fetch applicants error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  // Real-time synchronization
  useRealtimeRefresh(fetchApplicants);

  const handleInspectCandidate = async (appId) => {
    setInspectAppId(appId);
    setInspectLoading(true);
    setInspectTab('profile');
    try {
      const res = await api.get(`/org/applicants/${appId}/profile`);
      if (res.success && res.data) {
        setInspectData(res.data);
      } else {
        alert(res.message || 'Failed to load applicant profile.');
        setInspectAppId(null);
      }
    } catch (err) {
      alert('Error fetching candidate profile.');
      setInspectAppId(null);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleStatusChange = async (appId, status) => {
    setMessage('');
    setActionLoading(true);
    const res = await api.post(`/org/applicants/${appId}/status`, { status });
    setActionLoading(false);
    if (res.success) {
      setMessage(`Status updated to ${status}.`);
      fetchApplicants();
      if (inspectAppId) setInspectAppId(null);
    } else {
      alert(res.message || 'Status update failed.');
    }
  };

  const handleAcceptOnCall = async (appId) => {
    setMessage('');
    setErrorMsg('');
    setActionLoading(true);

    try {
      const res = await api.post(`/org/applicants/${appId}/accept-on-call`);
      if (res.success) {
        setMessage(res.message || 'On-call candidate accepted and experience credited to portfolio!');
        fetchApplicants();
        setInspectAppId(null);
      } else {
        alert(res.message || 'Failed to accept on-call candidate.');
      }
    } catch (err) {
      alert('Error processing on-call acceptance.');
    } finally {
      setActionLoading(false);
    }
  };

  // Categorized counts for tabs
  const counts = useMemo(() => {
    const list = data.applicants || [];
    return {
      all: list.length,
      ojt: list.filter((a) => a.posting_type === 'ojt').length,
      career: list.filter(
        (a) =>
          a.posting_type === 'career_job' ||
          (a.posting_type !== 'ojt' && a.posting_type !== 'on_call')
      ).length,
      on_call: list.filter((a) => a.posting_type === 'on_call').length,
    };
  }, [data.applicants]);

  const filteredApplicants = useMemo(() => {
    return (data.applicants || []).filter(app => {
      const pType = app.posting_type || 'ojt';
      if (activeTab === 'ojt' && pType !== 'ojt') return false;
      if (activeTab === 'career_job' && (pType !== 'career_job' && (pType === 'ojt' || pType === 'on_call'))) return false;
      if (activeTab === 'on_call' && pType !== 'on_call') return false;

      if (candidateSearch.trim()) {
        const q = candidateSearch.toLowerCase();
        const fullName = `${app.first_name || ''} ${app.last_name || ''}`.toLowerCase();
        const studentNo = String(app.student_number || '').toLowerCase();
        const program = String(app.program_name || '').toLowerCase();
        const inst = String(app.institution_name || '').toLowerCase();
        const email = String(app.email || '').toLowerCase();
        const jobTitle = String(app.job_title || '').toLowerCase();
        const skills = Array.isArray(app.skills)
          ? app.skills.join(' ').toLowerCase()
          : String(app.skills || '').toLowerCase();

        if (
          !fullName.includes(q) &&
          !studentNo.includes(q) &&
          !program.includes(q) &&
          !inst.includes(q) &&
          !email.includes(q) &&
          !jobTitle.includes(q) &&
          !skills.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [data.applicants, activeTab, candidateSearch]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedJob, candidateSearch]);

  const paginatedApplicants = useMemo(() => {
    return filteredApplicants.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredApplicants, page]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Candidate Applicants & Talent Pool</h1>
          <p className="text-sm text-on-surface-variant">
            Inspect applicant portfolios, resumes, OJT evaluations, and accept on-call opportunities with automated credentialing.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {/* Tabs & Filters Toolbar */}
      <div className="bento-card space-y-4">
        {/* Top Row: Category Tabs & Counter */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-outline-variant pb-3">
          <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-xl border border-outline-variant text-xs font-bold overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-surface text-vibrant-orange shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ojt')}
              className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'ojt'
                  ? 'bg-surface text-vibrant-orange shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">school</span>
              <span>OJT Interns ({counts.ojt})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('career_job')}
              className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'career_job'
                  ? 'bg-surface text-vibrant-orange shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">work</span>
              <span>Career Graduates ({counts.career})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('on_call')}
              className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'on_call'
                  ? 'bg-surface text-vibrant-orange shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">bolt</span>
              <span>On-Call ({counts.on_call})</span>
            </button>
          </div>

          <div className="text-xs text-on-surface-variant">
            Showing <span className="font-bold text-on-surface">{filteredApplicants.length}</span> of{' '}
            <span className="font-bold text-on-surface">{data.applicants?.length || 0}</span> applicants
          </div>
        </div>

        {/* Bottom Row: Search & Opening Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Candidate Search Bar */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              placeholder="Search candidate name, ID, program, university, skills..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs text-on-surface outline-none focus:border-vibrant-orange focus:ring-1 focus:ring-vibrant-orange"
            />
            {candidateSearch && (
              <button
                type="button"
                onClick={() => setCandidateSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Opening Filter Dropdown */}
          <div className="flex items-center gap-2 sm:w-auto w-full">
            <label className="text-xs font-bold text-on-surface-variant whitespace-nowrap flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">filter_list</span>
              <span>Opening:</span>
            </label>
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs text-on-surface outline-none font-medium focus:border-vibrant-orange"
            >
              <option value="">All Job Postings</option>
              {data.jobs?.map((j) => (
                <option key={j.job_id} value={j.job_id}>
                  {j.title} ({j.posting_type === 'on_call' ? 'On-Call' : j.posting_type === 'career_job' ? 'Career' : 'OJT'})
                </option>
              ))}
            </select>
            {(selectedJob || candidateSearch || activeTab !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedJob('');
                  setCandidateSearch('');
                  setActiveTab('all');
                }}
                className="px-2.5 py-2 text-xs font-bold text-vibrant-orange hover:bg-orange-tint rounded-xl transition-colors whitespace-nowrap flex items-center gap-1"
                title="Reset all filters"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Bento */}
      <div className="bento-card space-y-4">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant space-y-2">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-50">person_search</span>
            <p className="text-base font-bold text-on-surface">No applicants match your filter criteria.</p>
            <p className="text-xs text-on-surface-variant">Try adjusting your search keywords, category tab, or opening filter.</p>
            {(selectedJob || candidateSearch || activeTab !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedJob('');
                  setCandidateSearch('');
                  setActiveTab('all');
                }}
                className="mt-2 px-3 py-1.5 bg-orange-tint text-vibrant-orange rounded-lg text-xs font-bold hover:bg-orange-tint/80"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[850px]">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                    <th className="py-3 px-4">Candidate & Contact</th>
                    <th className="py-3 px-4">University & Course</th>
                    <th className="py-3 px-4">Applied Opportunity</th>
                    <th className="py-3 px-4">Student Standing</th>
                    <th className="py-3 px-4">Application Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {paginatedApplicants.map((app) => {
                    const pType = app.posting_type || 'ojt';
                    const isOnCall = pType === 'on_call';

                    return (
                      <tr key={app.application_id} className="hover:bg-surface-container-low transition-colors">
                        {/* Candidate Name & Contact */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-on-surface">{app.first_name} {app.last_name}</p>
                          <p className="text-xs text-on-surface-variant">ID #{app.student_number || 'N/A'}</p>
                          <p className="text-[11px] text-on-surface-variant">{app.contact_number || 'No phone recorded'}</p>
                        </td>

                        {/* University & Program */}
                        <td className="py-3 px-4">
                          <p className="font-medium text-xs text-on-surface">{app.institution_name || 'Academic Institution'}</p>
                          <p className="text-[11px] text-on-surface-variant">{app.program_name || 'Degree Program'}</p>
                        </td>

                        {/* Job Position */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-xs text-on-surface">{app.job_title}</p>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                            isOnCall ? 'bg-amber-100 text-amber-800' :
                            pType === 'career_job' ? 'bg-blue-100 text-blue-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            <span className="material-symbols-outlined text-[12px]">
                              {isOnCall ? 'bolt' : pType === 'career_job' ? 'work' : 'school'}
                            </span>
                            {isOnCall ? 'On-Call Gigs' : pType === 'career_job' ? 'Career Job' : 'OJT Training'}
                          </span>
                        </td>

                        {/* Student Standing */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              app.is_graduated || app.ojt_status === 'graduated'
                                ? 'bg-purple-100 text-purple-700'
                                : app.is_ojt_completer || app.ojt_status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {app.is_graduated || app.ojt_status === 'graduated'
                                ? 'Graduated / Alumni'
                                : app.is_ojt_completer || app.ojt_status === 'completed'
                                ? 'OJT Completer'
                                : 'Undergraduate Intern'}
                            </span>
                            {app.rendered_hours > 0 && (
                              <p className="text-[10px] text-on-surface-variant font-mono">
                                {app.rendered_hours} hrs completed
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            app.status === 'accepted' ? 'bg-green-tint text-pinoy-green' :
                            app.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                            app.status === 'under_review' ? 'bg-blue-500/10 text-blue-500' :
                            'bg-vibrant-orange/10 text-vibrant-orange'
                          }`}>
                            {app.status?.replace('_', ' ') || 'Applied'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleInspectCandidate(app.application_id)}
                              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-bold transition-colors border border-outline-variant flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[15px]">visibility</span>
                              <span>Inspect</span>
                            </button>

                            {isOnCall && app.status !== 'accepted' && (
                              <button
                                onClick={() => handleAcceptOnCall(app.application_id)}
                                className="px-3 py-1.5 bg-vibrant-orange hover:bg-deep-orange text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[15px]">verified</span>
                                <span>Accept On-Call</span>
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

            {filteredApplicants.length > itemsPerPage && (
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(filteredApplicants.length / itemsPerPage)}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </div>

      {/* FULL INSPECTION MODAL (STEP 5 & ON-CALL VERIFICATION) */}
      {inspectAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-outline-variant shadow-2xl w-full max-w-3xl space-y-4 max-h-[90vh] overflow-y-auto p-6">
            {inspectLoading ? (
              <div className="p-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
              </div>
            ) : !inspectData ? (
              <p className="text-center py-8 text-xs text-on-surface-variant">Could not load candidate information.</p>
            ) : (
              <>
                {/* Modal Header */}
                <div className="flex justify-between items-start border-b border-outline-variant pb-3 flex-wrap gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold mb-1 bg-orange-tint text-vibrant-orange">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      Candidate Background Inspection
                    </div>
                    <h2 className="text-xl font-bold text-on-surface">
                      {inspectData.applicant.first_name} {inspectData.applicant.last_name}
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      Applying for: <strong className="text-on-surface">{inspectData.applicant.job_title}</strong> (
                      <span className="capitalize">{inspectData.applicant.posting_type || 'OJT'}</span>)
                    </p>
                  </div>

                  <button
                    onClick={() => setInspectAppId(null)}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Sub-tabs for Inspection */}
                <div className="flex items-center gap-2 border-b border-outline-variant pb-2 overflow-x-auto text-xs">
                  <button
                    onClick={() => setInspectTab('profile')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                      inspectTab === 'profile' ? 'bg-vibrant-orange text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">badge</span>
                    <span>Profile & Standing</span>
                  </button>

                  <button
                    onClick={() => setInspectTab('portfolio')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                      inspectTab === 'portfolio' ? 'bg-vibrant-orange text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">folder_special</span>
                    <span>Career Portfolio ({(inspectData.academic_portfolio?.length || 0) + (inspectData.credentials?.length || 0) + (inspectData.academic_records?.length || 0)})</span>
                  </button>

                  <button
                    onClick={() => setInspectTab('resume')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                      inspectTab === 'resume' ? 'bg-vibrant-orange text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">description</span>
                    <span>Resume Document</span>
                  </button>

                  <button
                    onClick={() => setInspectTab('evaluations')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                      inspectTab === 'evaluations' ? 'bg-vibrant-orange text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">rate_review</span>
                    <span>OJT Evaluations ({inspectData.evaluations?.length || 0})</span>
                  </button>
                </div>

                {/* TAB 1: PROFILE & ACADEMIC STANDING */}
                {inspectTab === 'profile' && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                        <span className="font-bold text-on-surface-variant uppercase text-[10px] tracking-wider block">Academic Affiliation</span>
                        <p className="font-bold text-sm text-on-surface">{inspectData.applicant.institution_name || 'Partner University'}</p>
                        <p className="text-on-surface-variant">{inspectData.applicant.program_name || 'Degree Program'} ({inspectData.applicant.department || 'College'})</p>
                        <p className="text-[11px] text-on-surface-variant">Student ID: {inspectData.applicant.student_number || 'N/A'}</p>
                      </div>

                      <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                        <span className="font-bold text-on-surface-variant uppercase text-[10px] tracking-wider block">Student Status & Classification</span>
                        <p className="font-bold text-sm text-on-surface capitalize">
                          {inspectData.applicant.ojt_status || 'Undergraduate'} ({inspectData.applicant.classification || 'Regular'})
                        </p>
                        <p className="text-on-surface-variant">
                          Rendered Hours: <strong>{inspectData.applicant.completed_ojt_hours || 0}</strong> / {inspectData.applicant.required_ojt_hours || 600} hrs
                        </p>
                        <p className="text-[11px] text-on-surface-variant">Email: {inspectData.applicant.student_email}</p>
                      </div>
                    </div>

                    {/* On-Call Specs Overview if On-Call */}
                    {inspectData.applicant.posting_type === 'on_call' && (
                      <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 space-y-1">
                        <p className="font-bold text-on-surface flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-amber-600 text-[16px]">bolt</span>
                          <span>On-Call Opportunity Offer Specs</span>
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          Compensation Rate: <strong>₱{parseFloat(inspectData.applicant.salary_rate || 0).toLocaleString()} ({inspectData.applicant.salary_rate_type || 'daily'})</strong> • On-Call Duration: <strong>{inspectData.applicant.on_call_days || 1} Days</strong> • Deadline: <strong>{inspectData.applicant.finish_time || 'Standard'}</strong>
                        </p>
                        {inspectData.applicant.deliverables && (
                          <p className="text-[11px] text-on-surface-variant mt-1">
                            Deliverables: {inspectData.applicant.deliverables}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: CAREER PORTFOLIO */}
                {inspectTab === 'portfolio' && (
                  <div className="space-y-4 text-xs">
                    <p className="text-on-surface-variant text-[11px]">
                      Student's complete career portfolio — Academic Portfolio, Credentials, Academic Records, and uploaded files.
                    </p>

                    {/* Academic Portfolio Section */}
                    {inspectData.academic_portfolio?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-on-surface flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-blue-600 text-[16px]">school</span>
                          Academic Portfolio ({inspectData.academic_portfolio.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {inspectData.academic_portfolio.map((item) => {
                            const fileUrl = resolveFileUrl(item.file_path);
                            const isImg = isImageFile(item.file_name, item.file_path);
                            return (
                              <div key={item.item_id} className="p-3 bg-surface rounded-xl border border-outline-variant space-y-1">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isImg && fileUrl ? (
                                      <img src={fileUrl} alt={item.title} className="w-7 h-7 rounded-lg object-cover border border-outline-variant shrink-0" />
                                    ) : (
                                      <span className="material-symbols-outlined text-[18px] text-blue-600 shrink-0">{getFileIcon(item.file_name)}</span>
                                    )}
                                    <span className="font-bold text-on-surface line-clamp-1">{item.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[10px] font-bold capitalize">{item.item_type?.replace('_', ' ')}</span>
                                    {item.file_path && (
                                      <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                         className="px-2 py-0.5 rounded bg-vibrant-orange text-white text-[10px] font-bold hover:bg-deep-orange transition-colors flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-[12px]">open_in_new</span> View
                                      </a>
                                    )}
                                  </div>
                                </div>
                                {item.description && <p className="text-on-surface-variant">{item.description}</p>}
                                {item.file_name && <p className="text-[10px] text-on-surface-variant">📎 {item.file_name}</p>}
                                {item.verified_by_org && (
                                  <p className="text-[10px] text-pinoy-green font-medium flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[10px]">verified</span> Verified by: {item.verified_by_org}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Credentials Section */}
                    {inspectData.credentials?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-on-surface flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-amber-600 text-[16px]">workspace_premium</span>
                          Credentials ({inspectData.credentials.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {inspectData.credentials.map((item) => {
                            const fileUrl = resolveFileUrl(item.file_path);
                            const isImg = isImageFile(item.file_name, item.file_path);
                            return (
                              <div key={item.item_id} className="p-3 bg-surface rounded-xl border border-outline-variant space-y-1">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isImg && fileUrl ? (
                                      <img src={fileUrl} alt={item.title} className="w-7 h-7 rounded-lg object-cover border border-outline-variant shrink-0" />
                                    ) : (
                                      <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">{getFileIcon(item.file_name)}</span>
                                    )}
                                    <span className="font-bold text-on-surface line-clamp-1">{item.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[10px] font-bold capitalize">{item.item_type?.replace('_', ' ')}</span>
                                    {item.file_path && (
                                      <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                         className="px-2 py-0.5 rounded bg-vibrant-orange text-white text-[10px] font-bold hover:bg-deep-orange transition-colors flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-[12px]">open_in_new</span> View
                                      </a>
                                    )}
                                  </div>
                                </div>
                                {item.description && <p className="text-on-surface-variant">{item.description}</p>}
                                {item.file_name && <p className="text-[10px] text-on-surface-variant">📎 {item.file_name}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Academic Records Section */}
                    {inspectData.academic_records?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-on-surface flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-emerald-600 text-[16px]">grading</span>
                          Academic Records ({inspectData.academic_records.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {inspectData.academic_records.map((item) => {
                            const fileUrl = resolveFileUrl(item.file_path);
                            const isImg = isImageFile(item.file_name, item.file_path);
                            return (
                              <div key={item.item_id} className="p-3 bg-surface rounded-xl border border-outline-variant space-y-1">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isImg && fileUrl ? (
                                      <img src={fileUrl} alt={item.title} className="w-7 h-7 rounded-lg object-cover border border-outline-variant shrink-0" />
                                    ) : (
                                      <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">{getFileIcon(item.file_name)}</span>
                                    )}
                                    <span className="font-bold text-on-surface line-clamp-1">{item.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold capitalize">{item.item_type?.replace('_', ' ')}</span>
                                    {item.file_path && (
                                      <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                         className="px-2 py-0.5 rounded bg-vibrant-orange text-white text-[10px] font-bold hover:bg-deep-orange transition-colors flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-[12px]">open_in_new</span> View
                                      </a>
                                    )}
                                  </div>
                                </div>
                                {item.description && <p className="text-on-surface-variant">{item.description}</p>}
                                {item.file_name && <p className="text-[10px] text-on-surface-variant">📎 {item.file_name}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Auto-Added Graduated Section: OJT Background & Mentor Evaluations */}
                    {inspectData.is_graduated && (
                      <div className="space-y-3 pt-2 border-t border-outline-variant">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-pinoy-green">
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Graduated Student — Verified OJT Background & Mentor Evaluations</span>
                        </div>

                        {/* OJT Background */}
                        {inspectData.ojt_background?.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-bold text-[11px] text-on-surface flex items-center gap-1">
                              <span className="material-symbols-outlined text-vibrant-orange text-[14px]">work_history</span>
                              OJT Host Training Establishment Background
                            </h5>
                            <div className="space-y-2">
                              {inspectData.ojt_background.map((ojt, idx) => (
                                <div key={ojt.ojt_id || idx} className="p-3 bg-surface rounded-xl border border-outline-variant space-y-1">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <p className="font-bold text-on-surface text-xs">{ojt.organization_name}</p>
                                      <p className="text-[11px] text-on-surface-variant">{ojt.industry} {ojt.org_address ? `• ${ojt.org_address}` : ''}</p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-tint text-pinoy-green capitalize">
                                      {ojt.status || 'Completed'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 text-[11px]">
                                    <div className="p-1.5 bg-surface-container-low rounded">
                                      <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Rendered Hours</span>
                                      <span className="font-bold text-on-surface">{ojt.rendered_hours || 0} / {ojt.required_hours || 0} hrs</span>
                                    </div>
                                    {ojt.mentor_first_name && (
                                      <div className="p-1.5 bg-surface-container-low rounded">
                                        <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Mentor</span>
                                        <span className="font-bold text-on-surface">{ojt.mentor_first_name} {ojt.mentor_last_name}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Mentor Evaluations */}
                        {inspectData.evaluations?.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-bold text-[11px] text-on-surface flex items-center gap-1">
                              <span className="material-symbols-outlined text-vibrant-orange text-[14px]">rate_review</span>
                              Workplace Mentor Evaluations & Ratings
                            </h5>
                            <div className="space-y-2">
                              {inspectData.evaluations.map((ev, idx) => (
                                <div key={idx} className="p-3 bg-surface rounded-xl border border-outline-variant space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-on-surface text-xs">{ev.organization_name}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-green-tint text-pinoy-green font-bold text-[11px]">
                                      ⭐ {ev.rating} / 5.0
                                    </span>
                                  </div>
                                  <p className="text-xs text-on-surface-variant italic">"{ev.comments || 'No written remarks provided.'}"</p>
                                  <p className="text-[10px] text-on-surface-variant">
                                    Evaluator: {ev.evaluator_first_name ? `${ev.evaluator_first_name} ${ev.evaluator_last_name || ''}` : 'Workplace Mentor'} • Period: {ev.evaluation_period || 'Final'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Empty state if nothing at all */}
                    {(!inspectData.academic_portfolio?.length && !inspectData.credentials?.length && !inspectData.academic_records?.length && !inspectData.portfolio?.length && (!inspectData.is_graduated || !inspectData.ojt_background?.length)) && (
                      <div className="p-8 text-center bg-surface-container-low rounded-xl border border-outline-variant text-on-surface-variant">
                        <span className="material-symbols-outlined text-[36px] mb-1">folder_off</span>
                        <p className="font-bold">No portfolio entries uploaded yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: RESUME DOCUMENT */}
                {inspectTab === 'resume' && (
                  <div className="space-y-3 text-xs">
                    {inspectData.resume ? (
                      <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-vibrant-orange text-[28px]">description</span>
                            <div>
                              <p className="font-bold text-on-surface">{inspectData.resume.file_name || 'Student Official Resume'}</p>
                              <p className="text-[11px] text-on-surface-variant">
                                Uploaded: {inspectData.resume.created_at ? new Date(inspectData.resume.created_at).toLocaleDateString() : (inspectData.resume.uploaded_at ? new Date(inspectData.resume.uploaded_at).toLocaleDateString() : 'Active')}
                              </p>
                            </div>
                          </div>
                          {inspectData.resume.file_path && (
                            <a
                              href={resolveFileUrl(inspectData.resume.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[15px]">download</span>
                              <span>View / Download</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-surface-container-low rounded-xl border border-outline-variant text-on-surface-variant">
                        <span className="material-symbols-outlined text-[36px] mb-1">description</span>
                        <p className="font-bold">No softcopy resume document attached.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: OJT EVALUATIONS */}
                {inspectTab === 'evaluations' && (
                  <div className="space-y-3 text-xs">
                    <p className="text-on-surface-variant text-[11px]">
                      Historical performance evaluation records from Workplace Mentors and previous host training establishments.
                    </p>

                    {inspectData.evaluations?.length === 0 ? (
                      <div className="p-8 text-center bg-surface-container-low rounded-xl border border-outline-variant text-on-surface-variant">
                        <span className="material-symbols-outlined text-[36px] mb-1">rate_review</span>
                        <p className="font-bold">No prior performance evaluations recorded yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {inspectData.evaluations.map((ev, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-surface rounded-xl border border-outline-variant space-y-1"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-on-surface">{ev.organization_name}</span>
                              <span className="px-2 py-0.5 rounded-full bg-green-tint text-pinoy-green font-bold text-xs">
                                Rating: {ev.rating} / 5.0 ⭐
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant italic">"{ev.comments || 'No written remarks provided.'}"</p>
                            <p className="text-[10px] text-on-surface-variant">
                              Period: {ev.evaluation_period || 'Final'} • Rendered: {ev.rendered_hours}/{ev.required_hours} hrs
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Modal Action Bar */}
                <div className="pt-3 border-t border-outline-variant flex justify-between items-center flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant font-bold">Update Status:</span>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStatusChange(inspectData.applicant.application_id, 'shortlisted')}
                      className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg font-bold text-on-surface transition-colors"
                    >
                      Shortlist
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStatusChange(inspectData.applicant.application_id, 'interview')}
                      className="px-3 py-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg font-bold transition-colors"
                    >
                      Request Interview
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStatusChange(inspectData.applicant.application_id, 'rejected')}
                      className="px-3 py-1.5 bg-error-container text-error hover:bg-red-200 rounded-lg font-bold transition-colors"
                    >
                      Reject
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {inspectData.applicant.posting_type === 'on_call' ? (
                      <button
                        disabled={actionLoading}
                        onClick={() => handleAcceptOnCall(inspectData.applicant.application_id)}
                        className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white rounded-lg font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>Accept On-Call (Auto-Credit Portfolio)</span>
                      </button>
                    ) : (
                      <button
                        disabled={actionLoading}
                        onClick={() => handleStatusChange(inspectData.applicant.application_id, 'offered')}
                        className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white rounded-lg font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                        <span>Issue Official Offer</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
