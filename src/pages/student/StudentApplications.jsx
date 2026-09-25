import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
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

  // Modals & Action States
  const [offerModalApp, setOfferModalApp] = useState(null); // { app, action: 'accepted' | 'declined' }
  const [detailModalApp, setDetailModalApp] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all applications
  const fetchApplications = useCallback(async () => {
    try {
      const res = await api.get('/student/applications');
      if (res.success && res.data) {
        setApplications(res.data);
      } else if (!res.success && res.message) {
        setError(res.message);
      }
    } catch (err) {
      console.error('Fetch student applications error:', err);
      setError(err?.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Live real-time sync with backend socket events
  useRealtimeRefresh(fetchApplications);

  // Handle Offer Response (Approve / Accept or Reject / Decline)
  const handleOfferResponse = async (appId, action) => {
    setActionLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post(`/student/applications/${appId}/respond`, { action });
      if (res.success) {
        setMessage(
          action === 'accepted'
            ? '🎉 Congratulations! You have accepted the official placement offer. Your OJT record and DTR have been initialized.'
            : 'You have declined the official offer.'
        );
        setOfferModalApp(null);
        fetchApplications();
      } else {
        setError(res.message || 'Failed to update offer response.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit response.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Withdraw Application
  const handleWithdraw = async (appId, jobTitle) => {
    if (!window.confirm(`Are you sure you want to withdraw your application for "${jobTitle}"?`)) {
      return;
    }
    try {
      const res = await api.delete(`/student/applications/${appId}`);
      if (res.success) {
        setMessage(`Application for "${jobTitle}" has been withdrawn.`);
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

  // Status mapping helper
  const getStatusBadge = (app) => {
    const status = (app.status || 'submitted').toLowerCase();
    switch (status) {
      case 'offered':
        return {
          key: 'offered',
          label: 'Official Offer Issued',
          color: 'bg-orange-500/15 text-vibrant-orange border border-vibrant-orange/40 font-bold animate-pulse',
          icon: 'campaign',
          description: 'The organization has issued you an official placement offer! Action required: Approve or Decline.'
        };
      case 'interview':
      case 'interviewed':
      case 'interview_scheduled':
        return {
          key: 'interview',
          label: 'Interview Scheduled',
          color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 font-bold',
          icon: 'calendar_month',
          description: 'The organization has invited you to an interview session.'
        };
      case 'accepted':
      case 'approved':
      case 'placed':
      case 'completed':
        return {
          key: 'accepted',
          label: 'Placed / Accepted',
          color: 'bg-emerald-500/15 text-pinoy-green border border-pinoy-green/30 font-bold',
          icon: 'verified',
          description: 'Application approved! Placement is confirmed with Training Agreement active.'
        };
      case 'rejected':
      case 'declined_by_org':
      case 'not_selected':
        return {
          key: 'rejected',
          label: 'Not Selected / Rejected',
          color: 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 font-bold',
          icon: 'cancel',
          description: 'The employer has not selected this application for the current opening.'
        };
      case 'shortlisted':
        return {
          key: 'shortlisted',
          label: 'Candidate Shortlisted',
          color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 font-bold',
          icon: 'stars',
          description: 'Your profile has been shortlisted by the hiring team.'
        };
      case 'under_review':
      case 'reviewing':
      case 'reviewed':
        return {
          key: 'under_review',
          label: 'Under Review',
          color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold',
          icon: 'visibility',
          description: 'Employer HR is currently reviewing your resume and qualifications.'
        };
      case 'declined':
      case 'withdrawn':
        return {
          key: 'inactive',
          label: status === 'declined' ? 'Offer Declined' : 'Withdrawn',
          color: 'bg-surface-container text-on-surface-variant border border-outline-variant font-medium',
          icon: 'do_not_disturb_on',
          description: 'Application is no longer active.'
        };
      default:
        return {
          key: 'submitted',
          label: 'Application Submitted',
          color: 'bg-surface-container text-on-surface border border-outline-variant font-medium',
          icon: 'send',
          description: 'Application received and queued for employer screening.'
        };
    }
  };

  // Format compensation
  const formatCompensation = (app) => {
    const pType = getPostingCategory(app);
    if (app.salary_rate) {
      return `₱${Number(app.salary_rate).toLocaleString()} ${app.salary_rate_type ? `(${app.salary_rate_type})` : '/mo'}`;
    }
    if (pType === 'ojt') return 'Standard OJT Allowance';
    return 'Negotiable / Per Agreement';
  };

  // Statistics calculation
  const stats = useMemo(() => {
    let total = applications.length;
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

      const key = getStatusBadge(app).key;
      if (key === 'interview' || Boolean(app.interview_schedule_at)) interviewCount++;
      if (key === 'offered') offerCount++;
      if (key === 'accepted') acceptedCount++;
      if (key === 'rejected') rejectedCount++;
    });

    return { total, ojtCount, onCallCount, careerCount, interviewCount, offerCount, acceptedCount, rejectedCount };
  }, [applications]);

  // Priority sections: Official Offers & Scheduled Interviews
  const pendingOffers = useMemo(() => {
    return applications.filter((a) => a.status === 'offered');
  }, [applications]);

  const scheduledInterviews = useMemo(() => {
    return applications.filter(
      (a) => a.status === 'interview' || Boolean(a.interview_schedule_at)
    );
  }, [applications]);

  // Filtered applications list
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const category = getPostingCategory(app);
      const statusKey = getStatusBadge(app).key;

      if (typeFilter !== 'all' && category !== typeFilter) {
        return false;
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'offered' && statusKey !== 'offered') return false;
        if (statusFilter === 'interview' && statusKey !== 'interview') return false;
        if (statusFilter === 'accepted' && statusKey !== 'accepted') return false;
        if (statusFilter === 'rejected' && statusKey !== 'rejected') return false;
        if (statusFilter === 'pending' && !['submitted', 'under_review', 'shortlisted'].includes(statusKey)) return false;
        if (statusFilter === 'inactive' && statusKey !== 'inactive') return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = (app.job_title || '').toLowerCase().includes(query);
        const orgMatch = (app.organization_name || '').toLowerCase().includes(query);
        const locMatch = (app.location || '').toLowerCase().includes(query);
        const indMatch = (app.industry || '').toLowerCase().includes(query);
        if (!titleMatch && !orgMatch && !locMatch && !indMatch) return false;
      }

      return true;
    });
  }, [applications, typeFilter, statusFilter, searchTerm]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-on-surface">Application History & Feedback</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-vibrant-orange/10 text-vibrant-orange border border-vibrant-orange/30">
              {stats.total} {stats.total === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Track all your submitted applications, interview schedules, official offers for approval, and employer feedback notes.
          </p>
        </div>

        <Link
          to="/dashboard/student/jobs"
          className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          <span>Browse More Opportunities</span>
        </Link>
      </div>

      {/* Global Toast Messages */}
      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-pinoy-green">check_circle</span>
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-emerald-700 hover:text-emerald-950">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-red-600">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-950">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bento-card p-3.5 bg-surface-container-low border border-outline-variant rounded-xl flex flex-col justify-between">
          <span className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider">Total Applied</span>
          <div className="mt-2 text-xl font-bold text-on-surface">{stats.total}</div>
        </div>

        <div className="bento-card p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-xl flex flex-col justify-between">
          <span className="text-blue-700 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider">🎓 OJT</span>
          <div className="mt-2 text-xl font-bold text-blue-800 dark:text-blue-300">{stats.ojtCount}</div>
        </div>

        <div className="bento-card p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl flex flex-col justify-between">
          <span className="text-amber-700 dark:text-amber-400 text-[11px] font-bold uppercase tracking-wider">⚡ On-Call</span>
          <div className="mt-2 text-xl font-bold text-amber-800 dark:text-amber-300">{stats.onCallCount}</div>
        </div>

        <div className="bento-card p-3.5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex flex-col justify-between">
          <span className="text-indigo-700 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-wider">💼 Career</span>
          <div className="mt-2 text-xl font-bold text-indigo-800 dark:text-indigo-300">{stats.careerCount}</div>
        </div>

        <div className="bento-card p-3.5 bg-sky-500/5 border border-sky-500/20 rounded-xl flex flex-col justify-between">
          <span className="text-sky-700 dark:text-sky-400 text-[11px] font-bold uppercase tracking-wider">📅 Interviews</span>
          <div className="mt-2 text-xl font-bold text-sky-800 dark:text-sky-300">{stats.interviewCount}</div>
        </div>

        <div className="bento-card p-3.5 bg-orange-500/5 border border-orange-500/30 rounded-xl flex flex-col justify-between ring-1 ring-vibrant-orange/20">
          <span className="text-vibrant-orange text-[11px] font-bold uppercase tracking-wider">🏆 Offers</span>
          <div className="mt-2 text-xl font-bold text-vibrant-orange">{stats.offerCount}</div>
        </div>

        <div className="bento-card p-3.5 bg-green-500/5 border border-green-500/20 rounded-xl flex flex-col justify-between">
          <span className="text-pinoy-green text-[11px] font-bold uppercase tracking-wider">🟢 Placed</span>
          <div className="mt-2 text-xl font-bold text-pinoy-green">{stats.acceptedCount}</div>
        </div>
      </div>

      {/* SECTION 1: PRIORITY OFFERS TO APPROVE OR REJECT */}
      {pendingOffers.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border-2 border-vibrant-orange/50 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-vibrant-orange text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[22px]">assignment_turned_in</span>
              </span>
              <div>
                <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span>ACTION REQUIRED: Official Placement Offers</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-vibrant-orange text-white animate-pulse">
                    {pendingOffers.length} {pendingOffers.length === 1 ? 'Offer' : 'Offers'}
                  </span>
                </h2>
                <p className="text-xs text-on-surface-variant">
                  An organization has selected you and issued an official offer. Please review and choose to Approve or Decline.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-vibrant-orange/15 text-vibrant-orange border border-vibrant-orange/30 rounded-lg text-xs font-bold">
              Offer Decision Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {pendingOffers.map((app) => (
              <div
                key={app.application_id || app.offer_id}
                className="p-4 bg-surface rounded-xl border border-vibrant-orange/40 shadow-xs flex flex-col justify-between space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-vibrant-orange/10 text-vibrant-orange border border-vibrant-orange/30 inline-block mb-1.5">
                      {getPostingCategory(app) === 'ojt' ? '🎓 OJT Placement Offer' : '💼 Job Offer'}
                    </span>
                    <h3 className="text-sm font-bold text-on-surface">{app.job_title}</h3>
                    <p className="text-xs font-semibold text-vibrant-orange">{app.organization_name}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      📍 {app.location || 'Flexible Setup'} • {formatCompensation(app)}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[28px] text-vibrant-orange shrink-0">
                    military_tech
                  </span>
                </div>

                {app.feedback && (
                  <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant text-xs space-y-1">
                    <span className="font-bold text-on-surface flex items-center gap-1 text-[11px]">
                      <span className="material-symbols-outlined text-[14px] text-vibrant-orange">comment</span>
                      <span>Employer Note:</span>
                    </span>
                    <p className="text-on-surface-variant text-[11px] leading-relaxed pl-4">{app.feedback}</p>
                  </div>
                )}

                {/* Offer Action Buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/60">
                  <button
                    disabled={actionLoading}
                    onClick={() => setOfferModalApp({ app, action: 'accepted' })}
                    className="flex-1 py-2 px-3 bg-pinoy-green hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Approve & Accept</span>
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => setOfferModalApp({ app, action: 'declined' })}
                    className="flex-1 py-2 px-3 bg-surface-container hover:bg-surface-container-high text-red-600 dark:text-red-400 border border-outline-variant rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    <span>Reject / Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: INTERVIEW SCHEDULES SET BY THE ORGANIZATION */}
      {scheduledInterviews.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-sky-500/10 to-blue-500/5 border-2 border-blue-500/40 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[22px]">calendar_month</span>
              </span>
              <div>
                <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span>Organization Interview Requests & Schedules</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white animate-pulse">
                    {scheduledInterviews.length} {scheduledInterviews.length === 1 ? 'Interview' : 'Interviews'}
                  </span>
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Organizations have invited you for an interview. Review the date, mode, meeting link, and preparation notes.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold">
              Scheduled Interviews
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {scheduledInterviews.map((app) => (
              <div
                key={app.application_id || app.offer_id}
                className="p-4 bg-surface rounded-xl border border-blue-500/30 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">{app.job_title}</h3>
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">{app.organization_name}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      📍 {app.location || 'Philippines'} • {app.work_setup || 'Flexible Setup'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 shrink-0">
                    {app.interview_mode === 'in_person' || app.interview_mode === 'onsite'
                      ? '🏢 On-Site Interview'
                      : '💻 Online Meeting'}
                  </span>
                </div>

                {/* Interview Schedule Details */}
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-on-surface">
                    <span className="material-symbols-outlined text-blue-600 text-[18px]">event</span>
                    <span>
                      {app.interview_schedule_at
                        ? `${new Date(app.interview_schedule_at).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })} at ${new Date(app.interview_schedule_at).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}`
                        : 'Interview requested by organization'}
                    </span>
                  </div>

                  {app.interview_notes && (
                    <p className="text-[11px] text-on-surface-variant pl-6 leading-relaxed">
                      <strong>Instructions: </strong>
                      {app.interview_notes}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/60">
                  {(() => {
                    const meetUrl = app.interview_meeting_link || app.meeting_link || app.interview_location_or_link;
                    const isOnline = app.interview_mode === 'online';
                    const isMeet = isOnline && (app.interview_meeting_link || meetUrl?.includes('meet.google.com'));

                    if (meetUrl?.startsWith('http')) {
                      return (
                        <a
                          href={meetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2 px-3 bg-vibrant-orange hover:bg-deep-orange text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 text-center"
                        >
                          <span className="material-symbols-outlined text-[16px]">videocam</span>
                          <span>Join {isMeet ? 'Google Meet' : 'Meeting Link'}</span>
                        </a>
                      );
                    }
                    return (
                      <div className="flex-1 text-[11px] text-on-surface-variant font-medium truncate flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-vibrant-orange shrink-0">location_on</span>
                        <span className="truncate">{meetUrl || 'Location in invitation details'}</span>
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => setDetailModalApp(app)}
                    className="py-2 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: ALL APPLICATIONS STORE & SUBMITTED HISTORY */}
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

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by role, company, or location..."
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
              <option value="pending">Pending / Screening</option>
              <option value="interview">Interview Scheduled</option>
              <option value="offered">Official Offer Issued</option>
              <option value="accepted">Accepted / Placed</option>
              <option value="rejected">Rejected / Not Selected</option>
              <option value="inactive">Declined / Withdrawn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Applications Content */}
      <div className="bento-card">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin rounded-full h-9 w-9 border-4 border-vibrant-orange border-t-transparent"></div>
            <p className="text-xs text-on-surface-variant font-medium">Loading applications database...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant space-y-4">
            <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mx-auto text-on-surface-variant/40">
              <span className="material-symbols-outlined text-[36px]">folder_open</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-on-surface">No Applications Found</h3>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                {applications.length === 0
                  ? 'You have not submitted any applications yet. Explore available jobs and OJT opportunities to get started.'
                  : 'No applications match your selected filters. Try clearing your search or status filter.'}
              </p>
            </div>
            {applications.length === 0 ? (
              <Link
                to="/dashboard/student/jobs"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span>Browse Opportunities</span>
              </Link>
            ) : (
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
          <div className="divide-y divide-surface-container">
            {filteredApplications.map((app) => {
              const badge = getStatusBadge(app);
              const pCategory = getPostingCategory(app);
              const isRejected = ['rejected', 'declined_by_org', 'not_selected'].includes(app.status);
              const isOffered = app.status === 'offered';
              const isInterview = app.status === 'interview' || Boolean(app.interview_schedule_at);
              const isAccepted = ['accepted', 'approved', 'placed', 'completed'].includes(app.status);
              const canWithdraw = ['submitted', 'pending', 'under_review', 'shortlisted'].includes(app.status);

              return (
                <div
                  key={app.application_id || app.offer_id}
                  className={`p-4 sm:p-5 transition-all hover:bg-surface-container-low/60 flex flex-col lg:flex-row lg:items-start justify-between gap-4 ${
                    isOffered
                      ? 'bg-orange-500/[0.04] border-l-4 border-l-vibrant-orange'
                      : isInterview
                      ? 'bg-blue-500/[0.03] border-l-4 border-l-blue-600'
                      : isRejected
                      ? 'bg-red-500/[0.02] border-l-4 border-l-red-500'
                      : isAccepted
                      ? 'bg-emerald-500/[0.03] border-l-4 border-l-pinoy-green'
                      : ''
                  }`}
                >
                  {/* Left Column: Role & Organization Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-on-surface">{app.job_title}</h3>
                      {pCategory === 'ojt' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                          🎓 OJT / Practicum
                        </span>
                      )}
                      {pCategory === 'on_call' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          ⚡ On-Call / Gig
                        </span>
                      )}
                      {pCategory === 'career_job' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                          💼 Career Job
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-on-surface-variant flex-wrap">
                      <span className="font-semibold text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-vibrant-orange">corporate_fare</span>
                        <span>{app.organization_name}</span>
                      </span>
                      <span>•</span>
                      <span>📍 {app.location || 'Philippines'}</span>
                      <span>•</span>
                      <span className="capitalize">{app.work_setup || 'Flexible Setup'}</span>
                      <span>•</span>
                      <span className="font-medium text-pinoy-green">{formatCompensation(app)}</span>
                    </div>

                    <div className="text-[11px] text-on-surface-variant/80 flex items-center gap-3">
                      <span>
                        Applied: {app.applied_at || app.created_at ? new Date(app.applied_at || app.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                      {app.contact_email && <span>Email: {app.contact_email}</span>}
                    </div>

                    {/* REJECTION REASON & CONSTRUCTIVE FEEDBACK DISPLAY */}
                    {isRejected && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-1.5 text-xs mt-2 shadow-xs">
                        <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400">
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          <span>Application Rejected — Feedback & Decision Notes:</span>
                        </div>
                        {app.rejection_reason && (
                          <p className="text-on-surface text-[11px] pl-5 leading-snug">
                            <strong className="text-red-600 dark:text-red-400">Reason: </strong>
                            {app.rejection_reason}
                          </p>
                        )}
                        {app.feedback && (
                          <p className="text-on-surface-variant text-[11px] pl-5 leading-relaxed">
                            <strong>Constructive Remarks: </strong>
                            {app.feedback}
                          </p>
                        )}
                        {!app.rejection_reason && !app.feedback && (
                          <p className="text-on-surface-variant leading-relaxed text-[11px] pl-5">
                            The organization has reviewed your application and decided to proceed with other candidates for this cycle.
                          </p>
                        )}
                      </div>
                    )}

                    {/* INTERVIEW SCHEDULE DETAILS */}
                    {isInterview && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-1.5 text-xs mt-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                            <span>Interview Scheduled by Organization:</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white uppercase">
                            {app.interview_mode === 'in_person' || app.interview_mode === 'onsite' ? 'On-Site' : 'Online'}
                          </span>
                        </div>
                        <p className="text-on-surface font-semibold text-[11px] pl-5">
                          📅 {app.interview_schedule_at
                            ? new Date(app.interview_schedule_at).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })
                            : 'Schedule set'}
                        </p>
                        {app.interview_notes && (
                          <p className="text-on-surface-variant text-[11px] pl-5">
                            <strong>Notes: </strong> {app.interview_notes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* OFFICIAL OFFER DETAILS */}
                    {isOffered && (
                      <div className="p-3 bg-vibrant-orange/10 border border-vibrant-orange/30 rounded-xl space-y-1.5 text-xs mt-2 shadow-xs">
                        <div className="flex items-center gap-1.5 font-bold text-vibrant-orange">
                          <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                          <span>Official Placement Offer Issued:</span>
                        </div>
                        <p className="text-on-surface text-[11px] pl-5">
                          The organization has extended an official placement offer for this position. Please approve or decline below.
                        </p>
                      </div>
                    )}

                    {/* PLACED / ACCEPTED CONFIRMATION */}
                    {isAccepted && (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1 text-xs mt-2">
                        <div className="flex items-center gap-1.5 font-bold text-pinoy-green">
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Placement Confirmed & Active</span>
                        </div>
                        <p className="text-on-surface-variant text-[11px] pl-5">
                          {app.feedback || 'Training agreement approved. You can track your daily hours and DTR in the OJT module.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Status Badge & Dynamic Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${badge.color}`}
                      title={badge.description}
                    >
                      <span className="material-symbols-outlined text-[15px]">{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {/* If Offered: Quick Approve / Reject buttons */}
                      {isOffered && (
                        <>
                          <button
                            disabled={actionLoading}
                            onClick={() => setOfferModalApp({ app, action: 'accepted' })}
                            className="px-3 py-1.5 bg-pinoy-green hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            <span>Approve</span>
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={() => setOfferModalApp({ app, action: 'declined' })}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {/* If Interview: Join meeting link */}
                      {isInterview && (() => {
                        const meetUrl = app.interview_meeting_link || app.meeting_link || app.interview_location_or_link;
                        const isOnline = app.interview_mode === 'online';
                        const isMeet = isOnline && (app.interview_meeting_link || meetUrl?.includes('meet.google.com'));
                        if (!meetUrl?.startsWith('http')) return null;
                        return (
                          <a
                            href={meetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">videocam</span>
                            <span>Join {isMeet ? 'Google Meet' : 'Meeting'}</span>
                          </a>
                        );
                      })()}

                      {/* View Details */}
                      <button
                        onClick={() => setDetailModalApp(app)}
                        className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        <span>Details</span>
                      </button>

                      {/* Withdraw Option */}
                      {canWithdraw && (
                        <button
                          onClick={() => handleWithdraw(app.application_id, app.job_title)}
                          className="px-2.5 py-1.5 text-on-surface-variant hover:text-red-600 text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Withdraw Application"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                          <span className="hidden sm:inline">Withdraw</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: APPROVE OR REJECT OFFICIAL OFFER */}
      {offerModalApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-scale-up">
            <div className="flex items-center gap-3">
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                  offerModalApp.action === 'accepted' ? 'bg-pinoy-green' : 'bg-red-600'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {offerModalApp.action === 'accepted' ? 'assignment_turned_in' : 'cancel'}
                </span>
              </span>
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  {offerModalApp.action === 'accepted' ? 'Approve & Accept Offer?' : 'Reject & Decline Offer?'}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {offerModalApp.app.job_title} at {offerModalApp.app.organization_name}
                </p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              {offerModalApp.action === 'accepted'
                ? 'Accepting this offer will formally confirm your placement with the organization. An official OJT training record will be generated with your designated mentor, and daily time records (DTR) will become active.'
                : 'Are you sure you want to decline this placement offer? Once rejected, the organization will be notified so they can allocate the slot to another candidate.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
              <button
                disabled={actionLoading}
                onClick={() => setOfferModalApp(null)}
                className="px-4 py-2 bg-surface-container text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={() =>
                  handleOfferResponse(
                    offerModalApp.app.application_id || offerModalApp.app.offer_id,
                    offerModalApp.action
                  )
                }
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 ${
                  offerModalApp.action === 'accepted'
                    ? 'bg-pinoy-green hover:bg-emerald-600'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading && <span className="animate-spin material-symbols-outlined text-[14px]">progress_activity</span>}
                <span>
                  {offerModalApp.action === 'accepted' ? 'Confirm Acceptance' : 'Confirm Decline'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: APPLICATION & INTERVIEW DETAILS */}
      {detailModalApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant pb-3">
              <div>
                <h3 className="text-base font-bold text-on-surface">{detailModalApp.job_title}</h3>
                <p className="text-xs font-semibold text-vibrant-orange">{detailModalApp.organization_name}</p>
                <p className="text-[11px] text-on-surface-variant">📍 {detailModalApp.location || 'Philippines'}</p>
              </div>
              <button
                onClick={() => setDetailModalApp(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Current Status Callout */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs">
              <span className="font-bold text-on-surface">Application Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusBadge(detailModalApp).color}`}>
                {getStatusBadge(detailModalApp).label}
              </span>
            </div>

            {/* Interview Block if present */}
            {(detailModalApp.status === 'interview' || Boolean(detailModalApp.interview_schedule_at)) && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    <span>Interview Information</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px] uppercase">
                    {detailModalApp.interview_mode === 'in_person' ? 'On-Site' : 'Online'}
                  </span>
                </div>
                <p className="text-on-surface font-semibold text-[11px]">
                  Schedule: {detailModalApp.interview_schedule_at
                    ? new Date(detailModalApp.interview_schedule_at).toLocaleString()
                    : 'Set by organization'}
                </p>
                {(() => {
                  const meetUrl = detailModalApp.interview_meeting_link || detailModalApp.meeting_link || detailModalApp.interview_location_or_link;
                  const isOnline = detailModalApp.interview_mode === 'online';
                  const isMeet = isOnline && (detailModalApp.interview_meeting_link || meetUrl?.includes('meet.google.com'));

                  return (
                    <>
                      {meetUrl && (
                        <p className="text-on-surface-variant text-[11px]">
                          <strong>Link/Location: </strong> {meetUrl}
                        </p>
                      )}
                      {detailModalApp.interview_meeting_code && (
                        <p className="text-on-surface-variant text-[11px]">
                          <strong>Meeting Code: </strong> <span className="font-mono font-bold text-on-surface">{detailModalApp.interview_meeting_code}</span>
                        </p>
                      )}
                      {detailModalApp.interview_notes && (
                        <p className="text-on-surface-variant text-[11px] leading-relaxed">
                          <strong>Interviewer Notes: </strong> {detailModalApp.interview_notes}
                        </p>
                      )}
                      {meetUrl?.startsWith('http') && (
                        <a
                          href={meetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs mt-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">videocam</span>
                          <span>Join {isMeet ? 'Google Meet' : 'Meeting Link'}</span>
                        </a>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Rejection / Feedback Block if rejected */}
            {['rejected', 'declined_by_org', 'not_selected'].includes(detailModalApp.status) && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  <span>Employer Feedback & Decision</span>
                </span>
                {detailModalApp.rejection_reason && (
                  <p className="text-on-surface text-[11px]">
                    <strong>Reason: </strong> {detailModalApp.rejection_reason}
                  </p>
                )}
                {detailModalApp.feedback && (
                  <p className="text-on-surface-variant text-[11px] leading-relaxed">
                    <strong>Feedback: </strong> {detailModalApp.feedback}
                  </p>
                )}
              </div>
            )}

            {/* Description & Deliverables */}
            {detailModalApp.job_description && (
              <div className="space-y-1 text-xs">
                <span className="font-bold text-on-surface">Position Description:</span>
                <p className="text-on-surface-variant leading-relaxed text-[11px] bg-surface-container-low p-3 rounded-xl border border-outline-variant">
                  {detailModalApp.job_description}
                </p>
              </div>
            )}

            {/* Contact details */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs space-y-1">
              <span className="font-bold text-on-surface">Hiring Organization Contact:</span>
              <p className="text-on-surface-variant text-[11px]">
                {detailModalApp.contact_email && `Email: ${detailModalApp.contact_email}`}
                {detailModalApp.contact_phone && ` • Phone: ${detailModalApp.contact_phone}`}
                {detailModalApp.org_address && ` • Address: ${detailModalApp.org_address}`}
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-outline-variant">
              <button
                onClick={() => setDetailModalApp(null)}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
