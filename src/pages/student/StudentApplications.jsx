import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { resolveFileUrl } from '../../utils/fileHelper';

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Filters & Search
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'ojt', 'on_call', 'career_job'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [interviewModalApp, setInterviewModalApp] = useState(null);
  const [detailModalApp, setDetailModalApp] = useState(null);
  const [respondingApp, setRespondingApp] = useState(null); // { app, action: 'accepted' | 'declined' }
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApplications = useCallback(async () => {
    try {
      const res = await api.get('/student/applications');
      if (res.success && res.data) {
        setApplications(res.data);
      }
    } catch (err) {
      console.error('Fetch applications error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Live real-time sync
  useRealtimeRefresh(fetchApplications);

  const handleRespond = async (appId, action) => {
    setActionLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post(`/student/applications/${appId}/respond`, { action });
      if (res.success) {
        setMessage(res.message || `Offer successfully ${action}!`);
        setRespondingApp(null);
        fetchApplications();
      } else {
        setError(res.message || 'Action failed.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit response.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async (appId, jobTitle) => {
    if (!window.confirm(`Are you sure you want to withdraw your application for "${jobTitle}"?`)) return;
    setMessage('');
    setError('');
    try {
      const res = await api.delete(`/student/applications/${appId}`);
      if (res.success) {
        setMessage(res.message || `Application for "${jobTitle}" withdrawn.`);
        fetchApplications();
      } else {
        setError(res.message || 'Failed to withdraw application.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to withdraw application.');
    }
  };

  // Helper to normalize posting type
  const getPostingCategory = (app) => {
    const raw = (app.posting_type || app.job_type || 'ojt').toLowerCase();
    if (raw === 'on_call' || raw === 'part_time' || raw === 'freelance' || raw === 'gig') return 'on_call';
    if (raw === 'career_job' || raw === 'career' || raw === 'full_time' || raw === 'job') return 'career_job';
    return 'ojt';
  };

  // Status Badge Mapper
  const getStatusBadge = (app) => {
    const status = (app.status || 'submitted').toLowerCase();
    switch (status) {
      case 'interview':
      case 'interviewed':
      case 'interview_scheduled':
        return {
          key: 'interview',
          label: 'Interview Scheduled',
          color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 font-bold',
          icon: 'calendar_month',
          description: 'The employer has invited you for an interview.'
        };
      case 'offered':
        return {
          key: 'offered',
          label: 'Offer Received',
          color: 'bg-orange-tint text-vibrant-orange border border-vibrant-orange/40 font-bold animate-pulse',
          icon: 'campaign',
          description: 'You have received an official offer! Please review and respond.'
        };
      case 'accepted':
      case 'approved':
      case 'placed':
      case 'completed':
        return {
          key: 'accepted',
          label: 'Accepted / Placed',
          color: 'bg-green-tint text-pinoy-green border border-pinoy-green/30 font-bold',
          icon: 'check_circle',
          description: 'Application accepted and active placement confirmed.'
        };
      case 'shortlisted':
        return {
          key: 'shortlisted',
          label: 'Shortlisted Candidate',
          color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 font-bold',
          icon: 'star',
          description: 'You are on the employer shortlist for this role.'
        };
      case 'reviewed':
      case 'under_review':
      case 'screening':
        return {
          key: 'reviewed',
          label: 'Under Review',
          color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold',
          icon: 'visibility',
          description: 'Your application is currently being evaluated by the hiring team.'
        };
      case 'rejected':
      case 'declined_by_org':
      case 'not_selected':
        return {
          key: 'rejected',
          label: 'Not Selected',
          color: 'bg-red-500/10 text-error border border-red-500/25 font-semibold',
          icon: 'cancel',
          description: 'Application was not selected by the employer.'
        };
      case 'declined':
        return {
          key: 'declined',
          label: 'Offer Declined',
          color: 'bg-surface-container-high text-on-surface-variant font-semibold border border-outline-variant',
          icon: 'do_not_disturb',
          description: 'You declined this job/OJT offer.'
        };
      case 'withdrawn':
        return {
          key: 'withdrawn',
          label: 'Application Withdrawn',
          color: 'bg-surface-container text-on-surface-variant font-semibold border border-outline-variant',
          icon: 'remove_circle_outline',
          description: 'You withdrew this application.'
        };
      default:
        return {
          key: 'submitted',
          label: 'Submitted / Pending',
          color: 'bg-surface-container-high text-on-surface font-semibold border border-outline-variant',
          icon: 'send',
          description: 'Application submitted successfully and awaiting employer review.'
        };
    }
  };

  // Calculated Stats
  const stats = useMemo(() => {
    const total = applications.length;
    let ojtCount = 0;
    let onCallCount = 0;
    let careerCount = 0;
    let interviewCount = 0;
    let offerCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;

    applications.forEach((app) => {
      const cat = getPostingCategory(app);
      if (cat === 'ojt') ojtCount++;
      else if (cat === 'on_call') onCallCount++;
      else if (cat === 'career_job') careerCount++;

      const st = (app.status || '').toLowerCase();
      if (st === 'interview' || st === 'interviewed' || app.interview_schedule_at) interviewCount++;
      if (st === 'offered') offerCount++;
      if (['accepted', 'approved', 'placed', 'completed'].includes(st)) acceptedCount++;
      if (['rejected', 'declined_by_org', 'not_selected'].includes(st)) rejectedCount++;
    });

    return { total, ojtCount, onCallCount, careerCount, interviewCount, offerCount, acceptedCount, rejectedCount };
  }, [applications]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const category = getPostingCategory(app);
      const statusKey = getStatusBadge(app).key;

      // Type filter
      if (typeFilter !== 'all' && category !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && !['submitted', 'pending'].includes(statusKey)) return false;
        if (statusFilter === 'in_progress' && !['reviewed', 'shortlisted'].includes(statusKey)) return false;
        if (statusFilter === 'interview' && statusKey !== 'interview') return false;
        if (statusFilter === 'offered' && statusKey !== 'offered') return false;
        if (statusFilter === 'accepted' && statusKey !== 'accepted') return false;
        if (statusFilter === 'rejected' && statusKey !== 'rejected') return false;
        if (statusFilter === 'inactive' && !['declined', 'withdrawn'].includes(statusKey)) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = (app.job_title || '').toLowerCase().includes(query);
        const orgMatch = (app.organization_name || '').toLowerCase().includes(query);
        const locMatch = (app.location || '').toLowerCase().includes(query);
        const indMatch = (app.industry || '').toLowerCase().includes(query);
        const deptMatch = (app.department || '').toLowerCase().includes(query);
        if (!titleMatch && !orgMatch && !locMatch && !indMatch && !deptMatch) return false;
      }

      return true;
    });
  }, [applications, typeFilter, statusFilter, searchTerm]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Application History & Feedback</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-vibrant-orange/10 text-vibrant-orange border border-vibrant-orange/20">
              {applications.length} {applications.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Track all your applied OJT placements, on-call assignments, and career jobs — including interviews, employer feedback notes, and decisions.
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className="p-3.5 bg-green-tint text-pinoy-green rounded-xl text-xs font-bold flex items-center justify-between gap-2 border border-pinoy-green/20 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="opacity-70 hover:opacity-100">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-error-container text-error rounded-xl text-xs font-bold flex items-center justify-between gap-2 border border-error/20 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="opacity-70 hover:opacity-100">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bento-card p-3.5 bg-surface-container-low border border-outline-variant rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold uppercase tracking-wider">
            <span>Total Applied</span>
            <span className="material-symbols-outlined text-[16px] text-vibrant-orange">folder_shared</span>
          </div>
          <div className="mt-2 text-xl font-bold text-on-surface">{stats.total}</div>
        </div>

        <div className="bento-card p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider">
            <span>🎓 OJT / Practicum</span>
            <span className="material-symbols-outlined text-[16px]">school</span>
          </div>
          <div className="mt-2 text-xl font-bold text-blue-800 dark:text-blue-300">{stats.ojtCount}</div>
        </div>

        <div className="bento-card p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-[11px] font-bold uppercase tracking-wider">
            <span>⚡ On-Call / Gig</span>
            <span className="material-symbols-outlined text-[16px]">bolt</span>
          </div>
          <div className="mt-2 text-xl font-bold text-amber-800 dark:text-amber-300">{stats.onCallCount}</div>
        </div>

        <div className="bento-card p-3.5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
            <span>💼 Career Jobs</span>
            <span className="material-symbols-outlined text-[16px]">work</span>
          </div>
          <div className="mt-2 text-xl font-bold text-indigo-800 dark:text-indigo-300">{stats.careerCount}</div>
        </div>

        <div className="bento-card p-3.5 bg-sky-500/5 border border-sky-500/20 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-700 dark:text-sky-400 text-[11px] font-bold uppercase tracking-wider">
            <span>📅 Interviews</span>
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
          </div>
          <div className="mt-2 text-xl font-bold text-sky-800 dark:text-sky-300">{stats.interviewCount}</div>
        </div>

        <div className="bento-card p-3.5 bg-green-500/5 border border-green-500/20 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-pinoy-green text-[11px] font-bold uppercase tracking-wider">
            <span>🟢 Placed / Accepted</span>
            <span className="material-symbols-outlined text-[16px]">verified</span>
          </div>
          <div className="mt-2 text-xl font-bold text-pinoy-green">{stats.acceptedCount}</div>
        </div>

        <div className="bento-card p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400 text-[11px] font-bold uppercase tracking-wider">
            <span>🔴 Not Selected</span>
            <span className="material-symbols-outlined text-[16px]">cancel</span>
          </div>
          <div className="mt-2 text-xl font-bold text-red-700 dark:text-red-300">{stats.rejectedCount}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bento-card p-4 space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-outline-variant">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'all'
                ? 'bg-vibrant-orange text-white shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>All Applications</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => setTypeFilter('ojt')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'ojt'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>🎓 OJT / Practicum</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
              {stats.ojtCount}
            </span>
          </button>

          <button
            onClick={() => setTypeFilter('on_call')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'on_call'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>⚡ On-Call & Part-Time</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
              {stats.onCallCount}
            </span>
          </button>

          <button
            onClick={() => setTypeFilter('career_job')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'career_job'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>💼 Career Jobs</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
              {stats.careerCount}
            </span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by position, company, industry, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface focus:border-vibrant-orange focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-bold text-on-surface-variant whitespace-nowrap">
              Status Filter:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface font-semibold focus:border-vibrant-orange focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Submitted / Pending</option>
              <option value="in_progress">Under Review / Shortlisted</option>
              <option value="interview">Interview Scheduled</option>
              <option value="offered">Offer Received</option>
              <option value="accepted">Accepted / Placed</option>
              <option value="rejected">Not Selected / Rejected</option>
              <option value="inactive">Declined / Withdrawn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bento-card">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin rounded-full h-9 w-9 border-4 border-vibrant-orange border-t-transparent"></div>
            <p className="text-xs text-on-surface-variant font-medium">Loading application records...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant space-y-3">
            <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mx-auto text-on-surface-variant/40">
              <span className="material-symbols-outlined text-[36px]">inbox</span>
            </div>
            <div>
              <p className="text-base font-bold text-on-surface">No Applications Match Your Filter</p>
              <p className="text-xs text-on-surface-variant mt-1">
                {applications.length === 0
                  ? 'You have not submitted any applications yet. Explore available jobs and OJT opportunities.'
                  : 'Try adjusting your search criteria, type tab, or status filter.'}
              </p>
            </div>
            {(typeFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
                className="px-4 py-1.5 bg-surface-container text-on-surface rounded-lg text-xs font-bold hover:bg-surface-container-high transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap bg-surface-container-low/50">
                  <th className="py-3.5 px-4 font-bold">Position & Role Details</th>
                  <th className="py-3.5 px-4 font-bold">Hiring Organization</th>
                  <th className="py-3.5 px-4 font-bold">Applied & Timeline</th>
                  <th className="py-3.5 px-4 font-bold">Status, Interview & Feedback</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filteredApplications.map((app) => {
                  const badge = getStatusBadge(app);
                  const postingCategory = getPostingCategory(app);
                  const hasInterview = app.status === 'interview' || Boolean(app.interview_schedule_at);
                  const isOffered = app.status === 'offered';
                  const isAccepted = ['accepted', 'approved', 'placed', 'completed'].includes(app.status);
                  const isRejected = ['rejected', 'declined_by_org', 'not_selected'].includes(app.status);
                  const canWithdraw = ['submitted', 'pending', 'reviewed', 'shortlisted'].includes(app.status);

                  // Compensation text
                  const compText =
                    app.salary_min && app.salary_max
                      ? `₱${Number(app.salary_min).toLocaleString()} - ₱${Number(app.salary_max).toLocaleString()}/mo`
                      : app.allowance
                      ? `₱${Number(app.allowance).toLocaleString()} Allowance`
                      : postingCategory === 'ojt'
                      ? 'Standard OJT Stipend'
                      : 'Salary per agreement';

                  return (
                    <tr
                      key={app.application_id || app.offer_id}
                      className={`hover:bg-surface-container-low/80 transition-colors ${
                        isOffered ? 'bg-orange-tint/10' : isRejected ? 'bg-red-500/[0.02]' : isAccepted ? 'bg-green-tint/10' : ''
                      }`}
                    >
                      {/* Position & Role Details */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-on-surface text-sm">{app.job_title}</span>
                            {/* Posting Category Badge */}
                            {postingCategory === 'ojt' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                                🎓 OJT / Practicum
                              </span>
                            )}
                            {postingCategory === 'on_call' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                ⚡ On-Call / Gig
                              </span>
                            )}
                            {postingCategory === 'career_job' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                                💼 Career Job
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-on-surface-variant flex items-center gap-2 flex-wrap font-normal">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-vibrant-orange">location_on</span>
                              <span>{app.location || 'Philippines'}</span>
                            </span>
                            <span>•</span>
                            <span className="capitalize">{app.work_setup || 'Flexible Setup'}</span>
                            {app.department && (
                              <>
                                <span>•</span>
                                <span>Dept: {app.department}</span>
                              </>
                            )}
                          </div>

                          <div className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1.5 pt-0.5">
                            <span className="material-symbols-outlined text-[14px] text-pinoy-green">payments</span>
                            <span>{compText}</span>
                          </div>
                        </div>
                      </td>

                      {/* Hiring Organization */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {app.logo_url ? (
                              <img
                                src={resolveFileUrl(app.logo_url)}
                                alt=""
                                className="w-6 h-6 rounded-md object-contain bg-surface-container border border-outline-variant shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-md bg-vibrant-orange/10 text-vibrant-orange flex items-center justify-center font-bold text-[10px] shrink-0">
                                {app.organization_name?.charAt(0) || 'O'}
                              </div>
                            )}
                            <span className="font-bold text-on-surface text-xs leading-tight">
                              {app.organization_name}
                            </span>
                          </div>

                          {app.industry && (
                            <span className="block text-[11px] text-on-surface-variant font-medium">
                              Industry: {app.industry}
                            </span>
                          )}

                          <div className="text-[11px] text-on-surface-variant/80 space-y-0.5 pt-0.5">
                            {app.contact_email && (
                              <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">mail</span>
                                <span>{app.contact_email}</span>
                              </div>
                            )}
                            {app.contact_phone && (
                              <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">call</span>
                                <span>{app.contact_phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Applied & Timeline */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <div className="space-y-1 text-xs text-on-surface-variant">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-on-surface-variant/70 block">
                              Applied On:
                            </span>
                            <span className="font-semibold text-on-surface">
                              {app.applied_at || app.created_at
                                ? new Date(app.applied_at || app.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                : '—'}
                            </span>
                          </div>

                          {app.updated_at && app.updated_at !== app.applied_at && (
                            <div className="pt-1">
                              <span className="text-[10px] uppercase font-bold text-on-surface-variant/70 block">
                                Last Updated:
                              </span>
                              <span className="text-[11px]">
                                {new Date(app.updated_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status, Interview & Feedback */}
                      <td className="py-4 px-4 align-top max-w-sm">
                        <div className="space-y-2.5">
                          {/* Main Status Badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${badge.color}`}
                              title={badge.description}
                            >
                              <span className="material-symbols-outlined text-[15px]">{badge.icon}</span>
                              <span>{badge.label}</span>
                            </span>
                          </div>

                          {/* REJECTION / FEEDBACK CALLOUT (Clearly prominent if rejected) */}
                          {isRejected && (
                            <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl space-y-1.5 text-xs shadow-xs">
                              <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400">
                                <span className="material-symbols-outlined text-[16px]">info</span>
                                <span>Employer Feedback & Decision Note:</span>
                              </div>
                              {app.rejection_reason && (
                                <p className="text-on-surface text-[11px] pl-5 leading-snug">
                                  <strong className="text-red-600 dark:text-red-400">Reason: </strong>
                                  {app.rejection_reason}
                                </p>
                              )}
                              {app.feedback && (
                                <p className="text-on-surface-variant text-[11px] pl-5 leading-relaxed">
                                  <strong>Constructive Feedback: </strong>
                                  {app.feedback}
                                </p>
                              )}
                              {!app.rejection_reason && !app.feedback && (
                                <p className="text-on-surface-variant leading-relaxed text-[11px] pl-5">
                                  {app.notes || 'The hiring organization has decided to proceed with other candidates at this time. Keep applying!'}
                                </p>
                              )}
                            </div>
                          )}

                          {/* ACCEPTED / PLACED CALLOUT */}
                          {isAccepted && (
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl space-y-1 text-xs shadow-xs">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                                <span className="material-symbols-outlined text-[16px]">verified</span>
                                <span>Placement Approved & Confirmed:</span>
                              </div>
                              <p className="text-on-surface leading-relaxed text-[11px] pl-5">
                                {app.feedback || 'Application approved. Your Training Agreement MOA and Daily Time Record (DTR) are active.'}
                              </p>
                            </div>
                          )}

                          {/* GENERAL EMPLOYER NOTE (for non-rejected applications) */}
                          {!isRejected && !isAccepted && (app.feedback || app.notes) && (
                            <div className="p-2.5 bg-surface-container-low border border-outline-variant rounded-xl space-y-1 text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-on-surface">
                                <span className="material-symbols-outlined text-[15px] text-vibrant-orange">comment</span>
                                <span>Employer Note:</span>
                              </div>
                              <p className="text-on-surface-variant leading-relaxed text-[11px] pl-5">
                                {app.feedback || app.notes}
                              </p>
                            </div>
                          )}

                          {/* INTERVIEW CALLOUT (if scheduled) */}
                          {hasInterview && (
                            <div className="p-2.5 bg-blue-500/10 border border-blue-500/25 rounded-xl space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                  Interview Schedule:
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold">
                                  PST
                                </span>
                              </div>

                              <div className="text-xs font-bold text-on-surface">
                                {app.interview_schedule_at
                                  ? `${new Date(app.interview_schedule_at).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })} at ${new Date(app.interview_schedule_at).toLocaleTimeString(undefined, {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}`
                                  : 'Schedule confirmed'}
                              </div>

                              <div className="flex items-center gap-2 flex-wrap pt-1">
                                <button
                                  onClick={() => setInterviewModalApp(app)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">event_available</span>
                                  <span>View Interview Details</span>
                                </button>

                                {app.interview_location_or_link?.startsWith('http') && (
                                  <a
                                    href={app.interview_location_or_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 bg-vibrant-orange hover:bg-deep-orange text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 shadow-xs"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">videocam</span>
                                    <span>Join Meeting</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {/* OFFER ACTION CALLOUT (if offered) */}
                          {isOffered && (
                            <div className="p-3 bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-vibrant-orange/30 rounded-xl space-y-2">
                              <div className="flex items-center gap-1.5 font-bold text-vibrant-orange text-xs">
                                <span className="material-symbols-outlined text-[16px]">celebration</span>
                                <span>Congratulations! Official Offer Extended</span>
                              </div>
                              <p className="text-[11px] text-on-surface-variant">
                                Please respond to confirm or decline your placement.
                              </p>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => setRespondingApp({ app, action: 'accepted' })}
                                  className="px-3.5 py-1.5 bg-pinoy-green text-white hover:opacity-95 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">check</span>
                                  <span>Accept Offer</span>
                                </button>
                                <button
                                  onClick={() => setRespondingApp({ app, action: 'declined' })}
                                  className="px-3 py-1.5 bg-surface-container text-error hover:bg-red-500/10 rounded-lg text-xs font-bold border border-error/20 flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">close</span>
                                  <span>Decline</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex flex-col items-end gap-1.5">
                          {/* View Full Details Button */}
                          <button
                            onClick={() => setDetailModalApp(app)}
                            className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container text-on-surface rounded-lg text-xs font-bold transition-all border border-outline-variant inline-flex items-center gap-1"
                            title="View Complete Application & Role Information"
                          >
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                            <span>View Details</span>
                          </button>

                          {/* Withdraw Button */}
                          {canWithdraw && (
                            <button
                              onClick={() => handleWithdraw(app.application_id, app.job_title)}
                              className="px-2.5 py-1 text-error hover:bg-red-500/10 rounded text-xs font-semibold transition-colors inline-flex items-center gap-1"
                              title="Withdraw Application"
                            >
                              <span className="material-symbols-outlined text-[14px]">cancel</span>
                              <span>Withdraw</span>
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
      </div>

      {/* FULL APPLICATION & JOB DETAILS MODAL */}
      {detailModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface max-w-2xl w-full rounded-2xl shadow-2xl border border-outline-variant p-6 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-outline-variant pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-on-surface">{detailModalApp.job_title}</span>
                  {getPostingCategory(detailModalApp) === 'ojt' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                      🎓 OJT / Practicum
                    </span>
                  )}
                  {getPostingCategory(detailModalApp) === 'on_call' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      ⚡ On-Call / Gig
                    </span>
                  )}
                  {getPostingCategory(detailModalApp) === 'career_job' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                      💼 Career Job
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">
                  {detailModalApp.organization_name} • {detailModalApp.location || 'Philippines'}
                </p>
              </div>

              <button
                onClick={() => setDetailModalApp(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Current Application Status Summary */}
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Application Status</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${getStatusBadge(detailModalApp).color}`}>
                    <span className="material-symbols-outlined text-[14px]">{getStatusBadge(detailModalApp).icon}</span>
                    <span>{getStatusBadge(detailModalApp).label}</span>
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Applied Date</span>
                <span className="font-semibold text-on-surface text-xs mt-1 block">
                  {new Date(detailModalApp.applied_at || detailModalApp.created_at).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Work Setup</span>
                <span className="font-semibold text-on-surface text-xs mt-1 block capitalize">
                  {detailModalApp.work_setup || 'Flexible'}
                </span>
              </div>
            </div>

            {/* Employer Feedback / Notes / Rejection Reason */}
            {(detailModalApp.feedback || detailModalApp.notes || detailModalApp.rejection_reason) && (
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  ['rejected', 'declined_by_org', 'not_selected'].includes(detailModalApp.status)
                    ? 'bg-red-500/10 border-red-500/25'
                    : ['accepted', 'approved', 'placed', 'completed'].includes(detailModalApp.status)
                    ? 'bg-emerald-500/10 border-emerald-500/25'
                    : 'bg-amber-500/10 border-amber-500/25'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="material-symbols-outlined text-[18px]">
                    {['rejected', 'declined_by_org', 'not_selected'].includes(detailModalApp.status)
                      ? 'cancel'
                      : ['accepted', 'approved', 'placed', 'completed'].includes(detailModalApp.status)
                      ? 'verified'
                      : 'comment'}
                  </span>
                  <span>
                    {['rejected', 'declined_by_org', 'not_selected'].includes(detailModalApp.status)
                      ? 'Employer Decision & Rejection Feedback'
                      : ['accepted', 'approved', 'placed', 'completed'].includes(detailModalApp.status)
                      ? 'Placement Confirmation & Notes'
                      : 'Employer Feedback & Notes'}
                  </span>
                </div>
                {detailModalApp.rejection_reason && (
                  <p className="text-xs text-on-surface leading-snug">
                    <strong className="text-red-600 dark:text-red-400">Reason: </strong>
                    {detailModalApp.rejection_reason}
                  </p>
                )}
                {detailModalApp.feedback && (
                  <p className="text-xs text-on-surface leading-relaxed">
                    <strong>Constructive Feedback: </strong>
                    {detailModalApp.feedback}
                  </p>
                )}
                {!detailModalApp.rejection_reason && !detailModalApp.feedback && detailModalApp.notes && (
                  <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                    {detailModalApp.notes}
                  </p>
                )}
              </div>
            )}

            {/* Role Overview */}
            {detailModalApp.job_description && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Job / OJT Description</h4>
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant text-xs text-on-surface leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {detailModalApp.job_description}
                </div>
              </div>
            )}

            {/* Requirements & Deliverables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detailModalApp.job_requirements && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Requirements</h4>
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant text-xs text-on-surface leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {detailModalApp.job_requirements}
                  </div>
                </div>
              )}

              {detailModalApp.job_deliverables && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Responsibilities & Deliverables</h4>
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant text-xs text-on-surface leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {detailModalApp.job_deliverables}
                  </div>
                </div>
              )}
            </div>

            {/* Company Contact Information */}
            <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                Hiring Organization Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-on-surface-variant">Company Name: </span>
                  <span className="font-bold text-on-surface">{detailModalApp.organization_name}</span>
                </div>
                {detailModalApp.industry && (
                  <div>
                    <span className="text-on-surface-variant">Industry: </span>
                    <span className="font-semibold text-on-surface">{detailModalApp.industry}</span>
                  </div>
                )}
                {detailModalApp.contact_email && (
                  <div>
                    <span className="text-on-surface-variant">Contact Email: </span>
                    <span className="font-semibold text-on-surface">{detailModalApp.contact_email}</span>
                  </div>
                )}
                {detailModalApp.contact_phone && (
                  <div>
                    <span className="text-on-surface-variant">Contact Phone: </span>
                    <span className="font-semibold text-on-surface">{detailModalApp.contact_phone}</span>
                  </div>
                )}
                {detailModalApp.org_address && (
                  <div className="sm:col-span-2">
                    <span className="text-on-surface-variant">Address: </span>
                    <span className="font-semibold text-on-surface">{detailModalApp.org_address}</span>
                  </div>
                )}
                {detailModalApp.website && (
                  <div className="sm:col-span-2">
                    <span className="text-on-surface-variant">Website: </span>
                    <a
                      href={detailModalApp.website.startsWith('http') ? detailModalApp.website : `https://${detailModalApp.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-vibrant-orange hover:underline inline-flex items-center gap-1"
                    >
                      <span>{detailModalApp.website}</span>
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2">
                {detailModalApp.interview_schedule_at && (
                  <button
                    onClick={() => {
                      setInterviewModalApp(detailModalApp);
                      setDetailModalApp(null);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">calendar_month</span>
                    <span>View Interview</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setDetailModalApp(null)}
                className="px-5 py-2 bg-surface-container text-on-surface rounded-lg font-bold hover:bg-surface-container-high transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERVIEW SCHEDULE MODAL */}
      {interviewModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface max-w-lg w-full rounded-2xl shadow-2xl border border-outline-variant p-6 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">Interview Invitation Details</h3>
                  <p className="text-xs text-on-surface-variant">
                    {interviewModalApp.job_title} • {interviewModalApp.organization_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInterviewModalApp(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Schedule Highlights */}
            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300 tracking-wider">
                  Confirmed Schedule (Philippine Standard Time)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                  PST (UTC+8)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[32px] text-blue-600">schedule</span>
                <div>
                  <div className="text-base font-bold text-on-surface">
                    {interviewModalApp.interview_schedule_at
                      ? new Date(interviewModalApp.interview_schedule_at).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Schedule to be confirmed'}
                  </div>
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    {interviewModalApp.interview_schedule_at
                      ? new Date(interviewModalApp.interview_schedule_at).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      : 'Pending coordinator assignment'}
                  </div>
                </div>
              </div>
            </div>

            {/* Mode & Location / Video Call Link */}
            <div className="space-y-3">
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                  Interview Mode & Platform
                </span>
                <div className="flex items-center gap-2 font-bold text-on-surface text-sm">
                  <span className="material-symbols-outlined text-vibrant-orange text-[18px]">
                    {interviewModalApp.interview_mode === 'in_person' || interviewModalApp.interview_mode === 'onsite'
                      ? 'location_on'
                      : interviewModalApp.interview_mode === 'phone'
                      ? 'call'
                      : 'videocam'}
                  </span>
                  <span className="capitalize">
                    {interviewModalApp.interview_mode === 'in_person' || interviewModalApp.interview_mode === 'onsite'
                      ? 'Face-to-Face On-site Interview'
                      : interviewModalApp.interview_mode === 'phone'
                      ? 'Phone / Audio Interview'
                      : 'Online Video Conference'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                  Meeting Link or Office Address
                </span>
                <div className="font-mono text-xs text-on-surface break-all">
                  {interviewModalApp.interview_location_or_link || 'Link / Room will be provided by host HR officer.'}
                </div>
                {interviewModalApp.interview_location_or_link?.startsWith('http') && (
                  <div className="pt-1">
                    <a
                      href={interviewModalApp.interview_location_or_link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                      <span>Join Interview Meeting</span>
                    </a>
                  </div>
                )}
              </div>

              {interviewModalApp.interview_notes && (
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                    Interviewer Notes / Preparation Instructions
                  </span>
                  <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                    {interviewModalApp.interview_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-outline-variant flex justify-end">
              <button
                onClick={() => setInterviewModalApp(null)}
                className="px-5 py-2 bg-surface-container text-on-surface rounded-lg font-bold hover:bg-surface-container-high transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFER ACCEPT / DECLINE CONFIRMATION MODAL */}
      {respondingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface max-w-md w-full rounded-2xl shadow-2xl border border-outline-variant p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
                  respondingApp.action === 'accepted'
                    ? 'bg-green-tint text-pinoy-green'
                    : 'bg-red-500/10 text-error'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {respondingApp.action === 'accepted' ? 'check_circle' : 'cancel'}
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  {respondingApp.action === 'accepted' ? 'Accept Placement Offer?' : 'Decline Placement Offer?'}
                </h3>
                <p className="text-xs text-on-surface-variant">{respondingApp.app.job_title}</p>
              </div>
            </div>

            <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant text-xs text-on-surface-variant leading-relaxed">
              {respondingApp.action === 'accepted' ? (
                <>
                  By accepting this offer from <strong>{respondingApp.app.organization_name}</strong>, you confirm your
                  formal placement. If this is an OJT position, your training record will transition to active status.
                </>
              ) : (
                <>
                  Are you sure you want to decline this offer from{' '}
                  <strong>{respondingApp.app.organization_name}</strong>? This decision cannot be undone.
                </>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setRespondingApp(null)}
                className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-bold hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRespond(respondingApp.app.application_id, respondingApp.action)}
                className={`px-4 py-2 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 ${
                  respondingApp.action === 'accepted'
                    ? 'bg-pinoy-green hover:opacity-90'
                    : 'bg-error hover:opacity-90'
                }`}
              >
                {actionLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>
                  {respondingApp.action === 'accepted' ? 'Confirm Acceptance' : 'Confirm Decline'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
