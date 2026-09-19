import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import api from '../../api/client';

export default function StudentJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [search, setSearch] = useState('');
  const [setup, setSetup] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'ojt', 'career_job', 'on_call'
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchJobs = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (setup) query.append('setup', setup);
      if (typeFilter !== 'all') query.append('type', typeFilter);

      const res = await api.get(`/student/jobs?${query.toString()}`);
      if (res.success && res.data) {
        setJobs(res.data);
        if (res.student_profile) {
          setStudentProfile(res.student_profile);
        }
      }
    } catch (err) {
      console.error('Fetch student jobs error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, setup, typeFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Real-time synchronization
  useRealtimeRefresh(fetchJobs);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const isStudentGraduated = studentProfile?.is_graduated || user?.ojt_status === 'graduated';
  const isOjtCompleter = studentProfile?.is_ojt_completer || user?.ojt_status === 'completed';
  const hasActiveOjt = Boolean(
    studentProfile?.has_active_ojt ||
    ['ongoing', 'in_progress', 'accepted', 'deployed'].includes(studentProfile?.ojt_status) ||
    ['ongoing', 'in_progress', 'accepted', 'deployed'].includes(user?.ojt_status)
  );

  const handleApply = async (jobId, postingType) => {
    if (postingType === 'ojt' && hasActiveOjt) {
      setErrorMessage('Application locked: You currently have an accepted OJT placement with ongoing progress and DTR.');
      return;
    }

    setApplying(jobId);
    setMessage('');
    setErrorMessage('');

    const res = await api.post(`/student/jobs/${jobId}/apply`, {
      cover_letter: postingType === 'on_call'
        ? 'Applying for On-Call Professional Engagement.'
        : postingType === 'ojt'
        ? 'Applying for OJT Internship deployment.'
        : 'Applying for Career Job position.'
    });
    setApplying(null);

    if (res.success) {
      setMessage(res.message || 'Application submitted successfully!');
      fetchJobs();
    } else {
      setErrorMessage(res.message || 'Application failed.');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Verified OJT, Career & On-Call Opportunities</h1>
          <p className="text-sm text-on-surface-variant">
            {isStudentGraduated
              ? 'Browse pre-screened OJT internships, full-time career roles, and on-call opportunities.'
              : isOjtCompleter
              ? 'Browse OJT internships, on-call assignments with automated portfolio crediting, and preview career jobs.'
              : 'Browse OJT internships to apply, and preview on-call/career job opportunities available upon OJT completion or graduation.'}
          </p>
        </div>

        {/* Student Eligibility Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface text-xs font-bold border border-outline-variant self-start sm:self-auto">
          <span className="material-symbols-outlined text-[16px] text-vibrant-orange">verified_user</span>
          <span>
            Standing: <strong className="capitalize">{hasActiveOjt ? 'Ongoing OJT & DTR' : (studentProfile?.ojt_status || 'Undergraduate')}</strong> •{' '}
            {hasActiveOjt
              ? 'Placement Accepted (New OJT Applications Locked)'
              : isStudentGraduated
              ? 'Eligible for All Postings (OJT, Jobs & On-Call)'
              : isOjtCompleter
              ? 'Eligible for OJT & On-Call Postings'
              : 'Eligible for OJT Internships (Career & On-Call View Only)'}
          </span>
        </div>
      </div>

      {/* Active OJT Banner */}
      {hasActiveOjt && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-start sm:items-center gap-2.5 text-blue-900">
            <span className="material-symbols-outlined text-[22px] text-blue-600 shrink-0">verified</span>
            <div>
              <p className="font-bold text-sm text-blue-950">
                Active OJT Placement in Progress & DTR
              </p>
              <p className="text-blue-800/80 mt-0.5">
                {studentProfile?.active_ojt?.organization_name
                  ? `You are placed at ${studentProfile.active_ojt.organization_name}. `
                  : 'You have an accepted OJT placement. '}
                Applications for new OJT openings are disabled while your internship is ongoing.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/student/ojt"
            className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">timelapse</span>
            <span>View DTR & Progress</span>
          </Link>
        </div>
      )}

      {/* Toast Messages */}
      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2 border border-pinoy-green/20 animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-error-container text-error rounded-lg text-xs font-bold flex items-center gap-2 border border-error/20 animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bento-card space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search job title, role, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-vibrant-orange"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-vibrant-orange text-white rounded-lg text-sm font-bold hover:bg-deep-orange transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface-variant">Setup:</span>
              <select
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none"
              >
                <option value="">All Setups</option>
                <option value="onsite">On-Site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface-variant">Category:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none"
              >
                <option value="all">All Opportunities</option>
                <option value="ojt">🎓 OJT Internships</option>
                <option value="on_call">⚡ On-Call Opportunities</option>
                <option value="job">💼 Career Openings (Graduates)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bento-card text-center py-12 text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px] mb-2">work_off</span>
          <h3 className="text-lg font-bold text-on-surface">No Opportunities Found</h3>
          <p className="text-xs mt-1">Try adjusting your search criteria or check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => {
            const pType = job.posting_type || 'ojt';
            const isOjt = pType === 'ojt';
            const isOnCall = pType === 'on_call';
            const canApply = job.can_apply !== false;

            return (
              <div
                key={job.job_id}
                className="bento-card flex flex-col justify-between space-y-4 hover:border-vibrant-orange/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start flex-wrap gap-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize flex items-center gap-1 ${
                        isOnCall
                          ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                          : isOjt
                          ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                          : 'bg-green-tint text-pinoy-green border border-pinoy-green/20'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {isOnCall ? 'bolt' : isOjt ? 'badge' : 'work'}
                      </span>
                      {isOnCall ? 'On-Call Offer' : isOjt ? 'OJT Internship' : 'Career Opening (Graduates)'}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        {job.work_setup || 'Hybrid'} • {job.slots_available || 1} slot(s)
                      </span>
                      {job.institution_approval === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">hourglass_top</span>
                          <span>Awaiting School Approval</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-on-surface line-clamp-1">{job.title}</h3>
                  <p className="text-xs font-bold text-on-surface-variant">{job.organization_name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap text-xs text-on-surface-variant">
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span>{job.location || 'Philippines'}</span>
                    </span>
                    {job.workplace_area && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-tint/40 text-vibrant-orange font-bold text-[11px] border border-vibrant-orange/20">
                          <span className="material-symbols-outlined text-[13px]">meeting_room</span>
                          <span>Assigned Area: {job.workplace_area}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* On-Call Specs Card */}
                  {isOnCall && (
                    <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20 space-y-1 text-xs">
                      <div className="flex justify-between items-center font-bold text-amber-800">
                        <span>₱{parseFloat(job.salary_rate || 0).toLocaleString()} / {job.salary_rate_type || 'day'}</span>
                        <span className="text-[10px] uppercase">{job.on_call_days || 1} Day(s) On-Call</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant">
                        Deadline: <strong>{job.finish_time || 'Immediate'}</strong>
                      </p>
                      <p className="text-[10px] text-pinoy-green font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">verified</span>
                        <span>Auto-credited to Career Portfolio</span>
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-on-surface-variant line-clamp-3 pt-1">
                    {job.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-outline-variant space-y-2">
                  {job.has_applied > 0 ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-surface-container text-on-surface-variant rounded-lg text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px] text-pinoy-green">check_circle</span>
                      Applied
                    </button>
                  ) : isOjt && (hasActiveOjt || job.has_active_ojt) ? (
                    <div className="space-y-1">
                      <button
                        disabled
                        type="button"
                        title="Disabled: You currently have an accepted OJT placement with ongoing progress and DTR. Applications for new OJT postings are disabled."
                        className="w-full py-2.5 bg-surface-container text-on-surface-variant/70 border border-outline-variant/70 rounded-lg text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5 opacity-60 select-none pointer-events-none"
                      >
                        <span className="material-symbols-outlined text-[16px] text-outline">lock</span>
                        <span>Apply for OJT</span>
                      </button>
                      <p className="text-[10px] text-center text-on-surface-variant font-medium">
                        Disabled: OJT status accepted & ongoing progress / DTR
                      </p>
                    </div>
                  ) : !canApply ? (
                    <div className="p-2.5 bg-surface-container rounded-lg text-center space-y-1 border border-outline-variant">
                      <span className="text-[11px] font-bold text-on-surface flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-vibrant-orange">
                          {job.institution_approval === 'pending' ? 'hourglass_top' : 'lock'}
                        </span>
                        {job.institution_approval === 'pending'
                          ? 'Awaiting University Endorsement'
                          : isOnCall
                          ? 'OJT Completers & Graduates Only'
                          : 'Graduates Only'}
                      </span>
                      <p className="text-[10px] text-on-surface-variant leading-tight">
                        {job.eligibility_notice ||
                          'Undergraduates can view this opportunity, but may apply upon completing OJT or graduating.'}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApply(job.job_id, pType)}
                      disabled={applying === job.job_id}
                      className={`w-full py-2.5 rounded-lg text-xs font-bold text-white transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1 ${
                        isOnCall
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : isOjt
                          ? 'bg-pinoy-green hover:opacity-90'
                          : 'bg-vibrant-orange hover:bg-deep-orange'
                      }`}
                    >
                      {applying === job.job_id ? (
                        'Submitting Application...'
                      ) : isOnCall ? (
                        <>
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                          <span>Apply for On-Call</span>
                        </>
                      ) : isOjt ? (
                        <>
                          <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                          <span>Apply for OJT</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          <span>Apply for Career Job</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
