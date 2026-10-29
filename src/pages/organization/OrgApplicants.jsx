import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { resolveFileUrl, formatFileSize, getFileIcon, isImageFile, isPdfFile, formatPortfolioTitle, formatFileSubtitle, formatCleanFileName, formatAddress } from '../../utils/fileHelper';
import Pagination from '../../components/ui/Pagination';

function toManilaYearMonth(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit'
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    if (y && m) return `${y}-${m}`;
  } catch (_) {}
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatYearMonthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
}

function formatAppliedDate(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (_) {
    return d.toLocaleDateString();
  }
}

function formatScheduleDateTime(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (_) {
    return d.toLocaleString();
  }
}

function isApplicantShortlisted(app) {
  if (!app) return false;
  return Boolean(app.is_shortlisted) || app.status === 'shortlisted';
}

function hasApplicantScheduledInterview(app) {
  if (!app) return false;
  if (Number(app.scheduled_interview_count || 0) > 0) return true;
  return app.status === 'interview' && Number(app.completed_interview_count || 0) === 0;
}

function hasApplicantCompletedInterview(app) {
  if (!app) return false;
  return Number(app.completed_interview_count || 0) > 0 || app.status === 'interviewed';
}

function hasNoInterviewScheduleYet(app) {
  if (!app) return false;
  if (hasApplicantScheduledInterview(app) || hasApplicantCompletedInterview(app)) return false;
  return !['accepted', 'rejected', 'withdrawn'].includes(app.status);
}

export default function OrgApplicants() {
  const navigate = useNavigate();
  const [data, setData] = useState({ applicants: [], jobs: [] });
  const [activeTab, setActiveTab] = useState('all');
  // stageFilter: 'all' | 'no_schedule' | 'has_schedule' | 'interview_done' | 'shortlisted' | 'accepted' | 'rejected'
  const [stageFilter, setStageFilter] = useState('all');
  // monthFilter: '' (All Months) or 'YYYY-MM'
  const [monthFilter, setMonthFilter] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [shortlistBusyId, setShortlistBusyId] = useState(null);

  // Inspect Modal State
  const [inspectAppId, setInspectAppId] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectTab, setInspectTab] = useState('profile'); // 'profile', 'resume', 'portfolio', 'evaluations'
  const [actionLoading, setActionLoading] = useState(false);

  const handleRequestInterview = (applicant) => {
    if (!applicant) return;
    setErrorMsg('');

    if (hasApplicantScheduledInterview(applicant)) {
      setErrorMsg(
        `${applicant.first_name || 'This applicant'} ${applicant.last_name || ''} already has a scheduled interview. Duplicate interview schedules are not allowed.`
      );
      return;
    }

    if (hasApplicantCompletedInterview(applicant)) {
      setErrorMsg(
        `${applicant.first_name || 'This applicant'} ${applicant.last_name || ''} already completed their interview. Duplicate interview schedules are restricted.`
      );
      return;
    }

    if (applicant.status === 'accepted' || applicant.status === 'rejected') {
      setErrorMsg(`Cannot schedule an interview because this application is already ${applicant.status}.`);
      return;
    }

    setInspectAppId(null);
    navigate('/dashboard/organization/interviews', {
      state: {
        candidateId: applicant.application_id,
        candidateName: `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim(),
        jobTitle: applicant.job_title || 'Opportunity Applicant'
      }
    });
  };

  const handleViewExistingInterview = (applicant) => {
    if (!applicant) return;
    setInspectAppId(null);
    if (applicant.scheduled_interview_id) {
      navigate(`/dashboard/organization/interviews?inspectId=${applicant.scheduled_interview_id}`);
    } else {
      navigate('/dashboard/organization/interviews');
    }
  };

  // Pagination state
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const fetchApplicants = useCallback(async () => {
    try {
      const res = await api.get('/org/applicants');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Fetch applicants error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleToggleShortlist = async (applicant, e) => {
    if (e) e.stopPropagation();
    if (!applicant) return;
    const appId = applicant.application_id;
    setShortlistBusyId(appId);
    setMessage('');
    setErrorMsg('');

    try {
      const nextShortlisted = !isApplicantShortlisted(applicant);
      const res = await api.post(`/org/applicants/${appId}/shortlist`, {
        shortlisted: nextShortlisted
      });
      if (res.success) {
        setMessage(res.message);
        setData((prev) => ({
          ...prev,
          applicants: (prev.applicants || []).map((a) =>
            a.application_id === appId
              ? { ...a, is_shortlisted: res.is_shortlisted ? 1 : 0, status: res.status || a.status }
              : a
          )
        }));
        setInspectData((prev) =>
          prev && prev.applicant?.application_id === appId
            ? {
                ...prev,
                applicant: {
                  ...prev.applicant,
                  is_shortlisted: res.is_shortlisted ? 1 : 0,
                  status: res.status || prev.applicant.status
                }
              }
            : prev
        );
      } else {
        setErrorMsg(res.message || 'Failed to update shortlist mark.');
      }
    } catch (err) {
      setErrorMsg('Error updating shortlist mark.');
    } finally {
      setShortlistBusyId(null);
    }
  };

  const handleStatusChange = async (appId, status) => {
    setMessage('');
    setErrorMsg('');
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

  // Categorized counts for Opportunity Type tabs
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

  // Base list filtered by Posting Type + Month + Search (used to compute live Stage Pill counts)
  const baseScopedApplicants = useMemo(() => {
    return (data.applicants || []).filter((app) => {
      const pType = app.posting_type || 'ojt';
      if (activeTab === 'ojt' && pType !== 'ojt') return false;
      if (activeTab === 'career_job' && (pType !== 'career_job' && (pType === 'ojt' || pType === 'on_call'))) return false;
      if (activeTab === 'on_call' && pType !== 'on_call') return false;

      if (monthFilter) {
        const appMonth = toManilaYearMonth(app.applied_at || app.created_at);
        if (appMonth !== monthFilter) return false;
      }

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
  }, [data.applicants, activeTab, monthFilter, candidateSearch]);

  // Live counts for Stage & Shortlist Filter Pills
  const stageCounts = useMemo(() => {
    return {
      all: baseScopedApplicants.length,
      no_schedule: baseScopedApplicants.filter(hasNoInterviewScheduleYet).length,
      has_schedule: baseScopedApplicants.filter(hasApplicantScheduledInterview).length,
      interview_done: baseScopedApplicants.filter(hasApplicantCompletedInterview).length,
      shortlisted: baseScopedApplicants.filter(isApplicantShortlisted).length,
      accepted: baseScopedApplicants.filter((a) => a.status === 'accepted').length,
      rejected: baseScopedApplicants.filter((a) => a.status === 'rejected').length
    };
  }, [baseScopedApplicants]);

  // Available Month Options (all 12 months of current year + any other months in applicants, sorted newest first)
  const monthOptions = useMemo(() => {
    const countByMonth = {};
    (data.applicants || []).forEach((app) => {
      const ym = toManilaYearMonth(app.applied_at || app.created_at);
      if (ym) {
        countByMonth[ym] = (countByMonth[ym] || 0) + 1;
      }
    });

    const currentYear = new Date().getFullYear();
    const monthSet = new Set(Object.keys(countByMonth));
    for (let m = 1; m <= 12; m++) {
      monthSet.add(`${currentYear}-${String(m).padStart(2, '0')}`);
    }

    return Array.from(monthSet)
      .sort((a, b) => b.localeCompare(a))
      .map((ym) => ({
        value: ym,
        label: formatYearMonthLabel(ym),
        count: countByMonth[ym] || 0
      }));
  }, [data.applicants]);

  const filteredApplicants = useMemo(() => {
    return baseScopedApplicants.filter((app) => {
      if (stageFilter === 'no_schedule') return hasNoInterviewScheduleYet(app);
      if (stageFilter === 'has_schedule') return hasApplicantScheduledInterview(app);
      if (stageFilter === 'interview_done') return hasApplicantCompletedInterview(app);
      if (stageFilter === 'shortlisted') return isApplicantShortlisted(app);
      if (stageFilter === 'accepted') return app.status === 'accepted';
      if (stageFilter === 'rejected') return app.status === 'rejected';
      return true;
    });
  }, [baseScopedApplicants, stageFilter]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, stageFilter, monthFilter, candidateSearch]);

  const hasActiveFilters =
    activeTab !== 'all' || stageFilter !== 'all' || Boolean(monthFilter) || Boolean(candidateSearch.trim());

  const resetAllFilters = () => {
    setActiveTab('all');
    setStageFilter('all');
    setMonthFilter('');
    setCandidateSearch('');
  };

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
            Inspect applicant portfolios, mark shortlisted talent, filter by interview schedule or month, and manage placements.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-error-container text-error rounded-xl text-xs font-bold flex items-center justify-between gap-2 border border-error/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">block</span>
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-error/70 hover:text-error p-0.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-xl text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{message}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage('')}
            className="text-pinoy-green/70 hover:text-pinoy-green p-0.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
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
              className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
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
              className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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

        {/* Middle Row: Interview Schedule / Shortlist / Finalized Status Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mr-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">filter_alt</span>
            <span>Status:</span>
          </span>

          {[
            { id: 'all', label: 'All Applicants', icon: 'groups', count: stageCounts.all },
            { id: 'no_schedule', label: 'No Interview Schedule Yet', icon: 'event_busy', count: stageCounts.no_schedule },
            { id: 'has_schedule', label: 'Has Interview Schedule', icon: 'event_available', count: stageCounts.has_schedule },
            ...(stageCounts.interview_done > 0 || stageFilter === 'interview_done'
              ? [{ id: 'interview_done', label: 'Interview Done', icon: 'fact_check', count: stageCounts.interview_done }]
              : []),
            { id: 'shortlisted', label: 'Shortlist Marked', icon: 'star', count: stageCounts.shortlisted },
            { id: 'accepted', label: 'Application Accepted & Finalized', icon: 'verified', count: stageCounts.accepted },
            { id: 'rejected', label: 'Rejected', icon: 'cancel', count: stageCounts.rejected }
          ].map((pill) => {
            const active = stageFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStageFilter(pill.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  active
                    ? 'bg-orange-tint text-accent-text border-brand-teal/50 shadow-2xs'
                    : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:text-on-surface'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[15px] ${
                    pill.id === 'shortlisted' && active ? 'text-amber-500' : ''
                  }`}
                >
                  {pill.icon}
                </span>
                <span>{pill.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    active ? 'bg-vibrant-orange/20 text-accent-text' : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Row: Candidate Search + Per-Month Date Filter + Reset */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Per-Month Date Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-vibrant-orange text-[17px] pointer-events-none">
                calendar_month
              </span>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                aria-label="Filter applicants by month"
                className="pl-9 pr-8 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none focus:border-vibrant-orange cursor-pointer"
              >
                <option value="">All Months ({data.applicants?.length || 0})</option>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({m.count})
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-3 py-2 text-xs font-bold text-vibrant-orange hover:bg-orange-tint rounded-xl transition-colors whitespace-nowrap flex items-center gap-1 shrink-0 cursor-pointer"
                title="Reset search & filters"
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
            <p className="text-xs text-on-surface-variant">Try adjusting your status filter, month filter, category tab, or search keywords.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-2 px-3 py-1.5 bg-orange-tint text-vibrant-orange rounded-lg text-xs font-bold hover:bg-orange-tint/80 cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[820px]">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                    <th className="py-3 px-4">Candidate & School</th>
                    <th className="py-3 px-4">Position & Applied Date</th>
                    <th className="py-3 px-4">Status & Standing</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {paginatedApplicants.map((app) => {
                    const pType = app.posting_type || 'ojt';
                    const isOnCall = pType === 'on_call';
                    const shortlisted = isApplicantShortlisted(app);
                    const hasScheduled = hasApplicantScheduledInterview(app);
                    const appliedLabel = formatAppliedDate(app.applied_at || app.created_at);

                    return (
                      <tr key={app.application_id} className="hover:bg-surface-container-low transition-colors">
                        {/* Candidate Name & School */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleInspectCandidate(app.application_id)}
                              className="w-8 h-8 rounded-full bg-vibrant-orange/10 hover:bg-vibrant-orange text-vibrant-orange hover:text-white font-bold flex items-center justify-center text-xs shrink-0 transition-colors cursor-pointer"
                              title="View Candidate Details"
                            >
                              {app.first_name?.[0] || 'A'}
                            </button>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleInspectCandidate(app.application_id)}
                                  className="font-bold text-on-surface hover:text-vibrant-orange text-xs leading-tight text-left transition-colors cursor-pointer"
                                  title="View Candidate Details"
                                >
                                  {app.first_name} {app.last_name}
                                </button>
                                {shortlisted && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold"
                                    title="Shortlist Marked Applicant"
                                  >
                                    ★ Shortlisted
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant mt-0.5">
                                <span className="truncate max-w-[170px]" title={app.institution_name}>{app.institution_name || 'Academic Institution'}</span>
                                <span>•</span>
                                <span className="font-mono">#{app.student_number || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Job Position & Date Applied */}
                        <td className="py-3 px-4 text-xs">
                          <p className="font-bold text-on-surface leading-tight">{app.job_title}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOnCall ? 'bg-amber-100 text-amber-800' :
                              pType === 'career_job' ? 'bg-blue-100 text-blue-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              <span className="material-symbols-outlined text-[12px]">
                                {isOnCall ? 'bolt' : pType === 'career_job' ? 'work' : 'school'}
                              </span>
                              {isOnCall ? 'On-Call' : pType === 'career_job' ? 'Career Job' : 'OJT Training'}
                            </span>
                            {appliedLabel && (
                              <span className="text-[11px] text-on-surface-variant font-medium">
                                {appliedLabel}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status & Standing */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                app.status === 'accepted' ? 'bg-green-tint text-pinoy-green' :
                                app.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                app.status === 'under_review' ? 'bg-blue-500/10 text-blue-500' :
                                'bg-vibrant-orange/10 text-vibrant-orange'
                              }`}>
                                {app.status === 'accepted'
                                  ? 'Accepted & Finalized'
                                  : app.status?.replace('_', ' ') || 'Applied'}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10px] font-bold ${
                                app.is_graduated || app.ojt_status === 'graduated'
                                  ? 'bg-purple-100 text-purple-800'
                                  : app.is_ojt_completer || app.ojt_status === 'completed' || app.ojt_status === 'completed_ojt'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {app.is_graduated || app.ojt_status === 'graduated'
                                  ? 'Graduated'
                                  : app.is_ojt_completer || app.ojt_status === 'completed' || app.ojt_status === 'completed_ojt'
                                  ? 'OJT Completer'
                                  : 'OJT Student'}
                              </span>
                            </div>

                            {hasScheduled && (
                              <button
                                type="button"
                                onClick={() => handleViewExistingInterview(app)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                title="Click to view scheduled interview details"
                              >
                                <span className="material-symbols-outlined text-[12px]">event_available</span>
                                <span>
                                  {app.scheduled_interview_at
                                    ? `Scheduled: ${formatScheduleDateTime(app.scheduled_interview_at)}`
                                    : 'Interview Scheduled'}
                                </span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Action (Shortlist Star Mark + View Details) */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {app.status !== 'rejected' && (
                              <button
                                type="button"
                                disabled={shortlistBusyId === app.application_id}
                                onClick={(e) => handleToggleShortlist(app, e)}
                                className={`p-1.5 rounded-lg border text-xs font-bold transition-all inline-flex items-center justify-center cursor-pointer ${
                                  shortlisted
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 hover:bg-amber-500/25'
                                    : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-amber-500 hover:border-amber-500/40'
                                }`}
                                title={shortlisted ? 'Remove Shortlist Mark' : 'Mark Applicant as Shortlisted'}
                              >
                                <span
                                  className="material-symbols-outlined text-[17px]"
                                  style={shortlisted ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                >
                                  star
                                </span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleInspectCandidate(app.application_id)}
                              className="px-3 py-1.5 bg-vibrant-orange/10 hover:bg-vibrant-orange text-vibrant-orange hover:text-white rounded-lg text-xs font-bold transition-all border border-vibrant-orange/30 hover:border-vibrant-orange inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                              title="View Candidate Details"
                            >
                              <span className="material-symbols-outlined text-[15px]">visibility</span>
                              <span>View Details</span>
                            </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface text-on-surface rounded-2xl border border-outline-variant shadow-2xl w-full max-w-3xl space-y-4 max-h-[90vh] overflow-y-auto p-6">
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
                          {inspectData.academic_portfolio.map((item, idx) => {
                            let fileUrl = resolveFileUrl(item.file_path);
                            if (fileUrl.includes('/api/certificates/render/')) {
                              fileUrl += (fileUrl.includes('?') ? '&' : '?') + 'viewOnly=true';
                            }
                            const isImg = isImageFile(item.file_name, item.file_path);
                            const displayTitle = formatPortfolioTitle(item, 'Academic Portfolio Project', idx);
                            const subInfo = formatFileSubtitle(item);

                            return (
                              <div key={item.item_id || idx} className="p-3 bg-surface-container-low dark:bg-surface-container/60 rounded-xl border border-outline-variant space-y-1">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {isImg && fileUrl ? (
                                      <img
                                        src={fileUrl}
                                        alt={displayTitle}
                                        className="w-8 h-8 rounded-lg object-cover border border-outline-variant shrink-0"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <span className="material-symbols-outlined text-[20px] text-blue-600 shrink-0">{getFileIcon(item.file_name)}</span>
                                    )}
                                    <span className="font-bold text-xs text-on-surface line-clamp-1">{displayTitle}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[10px] font-bold capitalize">{item.item_type?.replace('_', ' ')}</span>
                                    {item.file_path && (
                                      <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                         className="px-2.5 py-1 rounded-lg bg-vibrant-orange text-white text-[11px] font-bold hover:bg-deep-orange transition-colors flex items-center gap-1 shadow-xs"
                                         title="View Item (Read-Only)">
                                        <span className="material-symbols-outlined text-[13px]">visibility</span> View
                                      </a>
                                    )}
                                  </div>
                                </div>
                                {item.description && <p className="text-on-surface-variant text-[11px] line-clamp-2">{item.description}</p>}
                                {subInfo && <p className="text-[10px] text-on-surface-variant">{subInfo}</p>}
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
                          {inspectData.credentials.map((item, idx) => {
                            let fileUrl = resolveFileUrl(item.file_path);
                            if (fileUrl.includes('/api/certificates/render/')) {
                              fileUrl += (fileUrl.includes('?') ? '&' : '?') + 'viewOnly=true';
                            }
                            const isImg = isImageFile(item.file_name, item.file_path);
                            const displayTitle = formatPortfolioTitle(item, 'Certification / Honor', idx);
                            const subInfo = formatFileSubtitle(item);

                            return (
                              <div key={item.item_id || idx} className="p-3 bg-surface-container-low dark:bg-surface-container/60 rounded-xl border border-outline-variant space-y-1">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {isImg && fileUrl ? (
                                      <img
                                        src={fileUrl}
                                        alt={displayTitle}
                                        className="w-8 h-8 rounded-lg object-cover border border-outline-variant shrink-0"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0">{getFileIcon(item.file_name)}</span>
                                    )}
                                    <span className="font-bold text-xs text-on-surface line-clamp-1">{displayTitle}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[10px] font-bold capitalize">{item.item_type?.replace('_', ' ')}</span>
                                    {item.file_path && (
                                      <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                         className="px-2.5 py-1 rounded-lg bg-vibrant-orange text-white text-[11px] font-bold hover:bg-deep-orange transition-colors flex items-center gap-1 shadow-xs"
                                         title="View Credential (Read-Only)">
                                        <span className="material-symbols-outlined text-[13px]">visibility</span> View
                                      </a>
                                    )}
                                  </div>
                                </div>
                                {item.description && <p className="text-on-surface-variant text-[11px] line-clamp-2">{item.description}</p>}
                                {subInfo && <p className="text-[10px] text-on-surface-variant">{subInfo}</p>}
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
                          {inspectData.academic_records.map((item, idx) => {
                            let fileUrl = resolveFileUrl(item.file_path);
                            if (fileUrl.includes('/api/certificates/render/')) {
                              fileUrl += (fileUrl.includes('?') ? '&' : '?') + 'viewOnly=true';
                            }
                            const isImg = isImageFile(item.file_name, item.file_path);
                            const displayTitle = formatPortfolioTitle(item, 'Academic Record', idx);
                            const subInfo = formatFileSubtitle(item);

                            return (
                              <div key={item.item_id || idx} className="p-3 bg-surface-container-low dark:bg-surface-container/60 rounded-xl border border-outline-variant space-y-1">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {isImg && fileUrl ? (
                                      <img
                                        src={fileUrl}
                                        alt={displayTitle}
                                        className="w-8 h-8 rounded-lg object-cover border border-outline-variant shrink-0"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <span className="material-symbols-outlined text-[20px] text-emerald-600 shrink-0">{getFileIcon(item.file_name)}</span>
                                    )}
                                    <span className="font-bold text-xs text-on-surface line-clamp-1">{displayTitle}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold capitalize">{item.item_type?.replace('_', ' ')}</span>
                                    {item.file_path && (
                                      <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                         className="px-2.5 py-1 rounded-lg bg-vibrant-orange text-white text-[11px] font-bold hover:bg-deep-orange transition-colors flex items-center gap-1 shadow-xs"
                                         title="View Record (Read-Only)">
                                        <span className="material-symbols-outlined text-[13px]">visibility</span> View
                                      </a>
                                    )}
                                  </div>
                                </div>
                                {item.description && <p className="text-on-surface-variant text-[11px] line-clamp-2">{item.description}</p>}
                                {subInfo && <p className="text-[10px] text-on-surface-variant">{subInfo}</p>}
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
                                      <p className="text-[11px] text-on-surface-variant">{ojt.industry} {ojt.org_address ? `• ${formatAddress(ojt.org_address)}` : ''}</p>
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
                              title="View Resume (Read-Only)"
                            >
                              <span className="material-symbols-outlined text-[15px]">visibility</span>
                              <span>View Resume</span>
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
                {inspectData.applicant.status === 'accepted' ? (
                  <div className="pt-3 border-t border-outline-variant">
                    <div className="p-3.5 bg-green-tint border border-pinoy-green/30 rounded-xl text-xs font-bold text-pinoy-green flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[22px] text-pinoy-green">verified</span>
                        <div>
                          <p className="font-bold text-sm text-pinoy-green">Application Accepted & Finalized</p>
                          <p className="text-[11px] text-on-surface-variant font-normal">
                            This candidate was officially accepted into the organization. Status updating and interview scheduling are locked because the placement has already been secured.
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-pinoy-green/15 text-pinoy-green border border-pinoy-green/30 rounded-full text-[11px] font-bold uppercase tracking-wider">
                        Status Locked (Accepted)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-outline-variant space-y-3 text-xs">
                    {/* Active Scheduled Interview Restriction Callout */}
                    {hasApplicantScheduledInterview(inspectData.applicant) && (
                      <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-[20px]">
                            event_available
                          </span>
                          <div>
                            <p className="font-bold text-on-surface">
                              Scheduled Interview Active — Duplicate Creation Restricted
                            </p>
                            <p className="text-[11px] text-on-surface-variant">
                              {inspectData.applicant.scheduled_interview_at
                                ? `Scheduled on ${formatScheduleDateTime(inspectData.applicant.scheduled_interview_at)} PHT (${(inspectData.applicant.scheduled_interview_mode || 'online').toUpperCase()})`
                                : 'This candidate already has an active interview schedule.'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleViewExistingInterview(inspectData.applicant)}
                          className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-container border border-outline-variant font-bold text-xs text-teal-700 dark:text-teal-300 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">calendar_month</span>
                          <span>View Schedule</span>
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-on-surface-variant font-bold">Actions:</span>

                        {/* Shortlist Mark Toggle */}
                        <button
                          type="button"
                          disabled={actionLoading || shortlistBusyId === inspectData.applicant.application_id}
                          onClick={() => handleToggleShortlist(inspectData.applicant)}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1 cursor-pointer border ${
                            isApplicantShortlisted(inspectData.applicant)
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                              : 'bg-surface-container hover:bg-surface-container-high border-outline-variant text-on-surface'
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-[15px]"
                            style={
                              isApplicantShortlisted(inspectData.applicant)
                                ? { fontVariationSettings: "'FILL' 1" }
                                : undefined
                            }
                          >
                            star
                          </span>
                          <span>
                            {isApplicantShortlisted(inspectData.applicant) ? 'Shortlisted' : 'Mark Shortlist'}
                          </span>
                        </button>

                        {/* Interview Action with Duplicate Schedule Restriction */}
                        {hasApplicantScheduledInterview(inspectData.applicant) ? (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant border border-outline-variant rounded-lg font-bold flex items-center gap-1 cursor-not-allowed opacity-75"
                            title="Cannot create another schedule: this applicant already has a scheduled interview"
                          >
                            <span className="material-symbols-outlined text-[14px]">lock_clock</span>
                            <span>Interview Already Scheduled</span>
                          </button>
                        ) : hasApplicantCompletedInterview(inspectData.applicant) ? (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-lg font-bold flex items-center gap-1 cursor-not-allowed opacity-80"
                            title="This applicant has already completed their scheduled interview"
                          >
                            <span className="material-symbols-outlined text-[14px]">task_alt</span>
                            <span>Interview Completed</span>
                          </button>
                        ) : inspectData.applicant.status === 'rejected' ? (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-lg font-bold flex items-center gap-1 cursor-not-allowed opacity-60"
                            title="Cannot schedule an interview while application is rejected"
                          >
                            <span className="material-symbols-outlined text-[14px]">block</span>
                            <span>Interview Disabled (Rejected)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleRequestInterview(inspectData.applicant)}
                            className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded-lg font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Go to Interviews module to schedule and send an invitation"
                          >
                            <span className="material-symbols-outlined text-[14px]">event_available</span>
                            <span>Request Interview</span>
                          </button>
                        )}

                        {inspectData.applicant.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleStatusChange(inspectData.applicant.application_id, 'rejected')}
                            className="px-3 py-1.5 bg-error-container text-error hover:opacity-90 rounded-lg font-bold transition-opacity cursor-pointer"
                          >
                            Reject
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {inspectData.applicant.posting_type === 'on_call' ? (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleAcceptOnCall(inspectData.applicant.application_id)}
                            className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white rounded-lg font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">verified</span>
                            <span>Accept On-Call (Auto-Credit Portfolio)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleStatusChange(inspectData.applicant.application_id, 'offered')}
                            className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white rounded-lg font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                            <span>Issue Official Offer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
