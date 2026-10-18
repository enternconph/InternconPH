import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import api from '../../api/client';
import { resolveFileUrl } from '../../utils/fileHelper';

export default function StudentJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [search, setSearch] = useState('');
  const [setup, setSetup] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'ojt', 'on_call', 'career_job', 'saved'
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Social interactions & Modals
  const [previewFlyer, setPreviewFlyer] = useState(null);
  const [inspectJob, setInspectJob] = useState(null);
  const [applyModalJob, setApplyModalJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');
  const [expandedDesc, setExpandedDesc] = useState({});
  const [likedJobs, setLikedJobs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('interncon_liked_jobs') || '[]');
    } catch {
      return [];
    }
  });
  const [bookmarkedJobs, setBookmarkedJobs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('interncon_bookmarked_jobs') || '[]');
    } catch {
      return [];
    }
  });
  const [heartAnim, setHeartAnim] = useState({});
  const [toastNotification, setToastNotification] = useState(null);

  const showToast = (text, type = 'info') => {
    const toastObj = typeof text === 'string' ? { message: text, type } : text;
    setToastNotification(toastObj);
    setTimeout(() => {
      setToastNotification((curr) => (curr?.message === toastObj.message ? null : curr));
    }, 4500);
  };

  const toggleLike = (jobId) => {
    setLikedJobs((prev) => {
      const isLiked = prev.includes(jobId);
      const next = isLiked ? prev.filter((id) => id !== jobId) : [...prev, jobId];
      try {
        localStorage.setItem('interncon_liked_jobs', JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });

    // Trigger visual pop animation
    setHeartAnim((prev) => ({ ...prev, [jobId]: true }));
    setTimeout(() => {
      setHeartAnim((prev) => ({ ...prev, [jobId]: false }));
    }, 600);
  };

  const toggleBookmark = (jobId) => {
    setBookmarkedJobs((prev) => {
      const isSaved = prev.includes(jobId);
      const next = isSaved ? prev.filter((id) => id !== jobId) : [...prev, jobId];
      try {
        localStorage.setItem('interncon_bookmarked_jobs', JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      showToast(isSaved ? 'Removed from your Saved Opportunities' : 'Saved to your Bookmarked Opportunities! 🔖', 'info');
      return next;
    });
  };

  const toggleDesc = (jobId) => {
    setExpandedDesc((prev) => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const handleShare = (job) => {
    const shareText = `${job.title} at ${job.organization_name} on InternConPH`;
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      showToast('Opportunity link copied to clipboard! 📋', 'success');
    } else {
      showToast(`Shared: ${shareText}`, 'info');
    }
  };

  const fetchJobs = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (setup) query.append('setup', setup);
      if (typeFilter !== 'all' && typeFilter !== 'saved') query.append('type', typeFilter);

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
  const isOjtCompleter = studentProfile?.is_ojt_completer || user?.ojt_status === 'completed' || user?.ojt_status === 'completed_ojt';
  const hasActiveOjt = Boolean(
    studentProfile?.has_active_ojt ||
    ['ongoing', 'in_progress', 'accepted', 'deployed'].includes(studentProfile?.ojt_status) ||
    ['ongoing', 'in_progress', 'accepted', 'deployed'].includes(user?.ojt_status)
  );

  const openApplyModal = (job) => {
    const pType = job.posting_type || 'ojt';

    if (pType === 'ojt' && (isOjtCompleter || isStudentGraduated)) {
      const msg = 'Application locked: You have already completed your OJT requirement. Please explore On-Call and Career opportunities.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    if (pType === 'ojt' && (hasActiveOjt || job.has_active_ojt)) {
      const msg = 'Application locked: You currently have an active OJT placement with ongoing hours and DTR.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    if (job.can_apply === false) {
      const msg = job.eligibility_notice || 'You are not eligible to apply for this opportunity based on institutional policy.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    setApplyError('');
    setApplySuccess('');
    setCoverLetter(
      pType === 'on_call'
        ? `Good day! I am applying for the ${job.title} on-call engagement. I am available and ready to deliver the required scope.`
        : pType === 'ojt'
        ? `Good day! I am applying for the ${job.title} OJT Internship deployment at ${job.organization_name}. I am eager to contribute my skills and complete my training under your mentorship.`
        : `Good day! I am applying for the ${job.title} position at ${job.organization_name}. Please find my verified student profile and credentials attached.`
    );
    setApplyModalJob(job);
  };

  const submitApplication = async (e) => {
    if (e) e.preventDefault();
    if (!applyModalJob) return;

    const jobId = applyModalJob.job_id;
    const pType = applyModalJob.posting_type || 'ojt';

    setApplySubmitting(true);
    setApplyError('');
    setApplySuccess('');

    try {
      const res = await api.post(`/student/jobs/${jobId}/apply`, {
        cover_letter: coverLetter.trim() || (
          pType === 'on_call'
            ? 'Applying for On-Call Professional Engagement.'
            : pType === 'ojt'
            ? 'Applying for OJT Internship deployment.'
            : 'Applying for Career Job position.'
        )
      });

      if (res.success) {
        const successMsg = res.message || 'Application submitted successfully! 🎉';
        setApplySuccess(successMsg);
        showToast(successMsg, 'success');

        // Immediately reflect applied status on local job cards
        setJobs((prev) =>
          prev.map((j) => (j.job_id === jobId ? { ...j, has_applied: 1 } : j))
        );

        setTimeout(() => {
          setApplyModalJob(null);
          setApplySubmitting(false);
          setApplySuccess('');
          fetchJobs();
        }, 1200);
      } else {
        const errorMsg = res.message || 'Failed to submit application.';
        setApplyError(errorMsg);
        showToast(errorMsg, 'error');
        setApplySubmitting(false);
      }
    } catch (err) {
      console.error('Apply job submission error:', err);
      const errorMsg = err?.message || 'A network error occurred while submitting your application.';
      setApplyError(errorMsg);
      showToast(errorMsg, 'error');
      setApplySubmitting(false);
    }
  };

  const handleApply = async (jobId, postingType) => {
    const targetJob = jobs.find((j) => j.job_id === jobId);
    if (targetJob) {
      openApplyModal(targetJob);
    }
  };

  const parseDateSafe = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr) ? null : dateStr;
    if (typeof dateStr === 'number') return new Date(dateStr);

    const s = String(dateStr).trim();
    if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) {
      const parsed = new Date(s);
      if (!isNaN(parsed)) return parsed;
    }

    const isoString = s.replace(' ', 'T');
    const utcDate = new Date(isoString.endsWith('Z') ? isoString : `${isoString}Z`);
    const localDate = new Date(isoString);
    const now = Date.now();

    if (!isNaN(utcDate) && !isNaN(localDate)) {
      const diffUtc = Math.abs(now - utcDate.getTime());
      const diffLocal = Math.abs(now - localDate.getTime());
      if (diffLocal < diffUtc && diffLocal < 1000 * 60 * 60 * 2) {
        return localDate;
      }
      return utcDate;
    }

    return !isNaN(utcDate) ? utcDate : (!isNaN(localDate) ? localDate : new Date(s));
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = parseDateSafe(dateStr);
    if (!d) return 'Recently';
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 60000) return 'Just now';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / 60000);
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Filter jobs if "saved" tab is active
  const displayedJobs = typeFilter === 'saved'
    ? jobs.filter((j) => bookmarkedJobs.includes(j.job_id))
    : jobs;

  return (
    <div className="min-h-screen bg-surface-container-lowest/50 py-4 sm:py-6">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8">
        
        {/* Floating Top-Right Toast Notification */}
        {toastNotification && (
          <div
            className={`fixed top-6 right-4 sm:right-6 z-[100] max-w-sm w-full p-4 rounded-3xl shadow-2xl border flex items-center gap-3 text-xs sm:text-sm font-semibold transition-all animate-bounce ${
              toastNotification.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-100 border-emerald-500/40 shadow-emerald-950/40'
                : toastNotification.type === 'error'
                ? 'bg-rose-950/95 text-rose-100 border-rose-500/40 shadow-rose-950/40'
                : 'bg-slate-900/95 text-white border-white/10 shadow-black/40'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              toastNotification.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400'
                : toastNotification.type === 'error'
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-vibrant-orange/20 text-vibrant-orange'
            }`}>
              <span className="material-symbols-outlined text-[20px]">
                {toastNotification.type === 'success' ? 'check_circle' : toastNotification.type === 'error' ? 'error' : 'info'}
              </span>
            </div>
            <span className="flex-1 leading-snug">{toastNotification.message}</span>
            <button
              onClick={() => setToastNotification(null)}
              className="text-white/60 hover:text-white text-xs shrink-0 p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Alert Messages */}
        {message && (
          <div className="mb-4 p-3.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between border border-emerald-500/20 shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage('')} className="text-xs hover:opacity-75">✕</button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center justify-between border border-rose-500/20 shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-xs hover:opacity-75">✕</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN FEED & SIDEBAR TWO-COLUMN LAYOUT (Facebook / Instagram Web Style)   */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ======================================================================= */}
          {/* CENTER SOCIAL FEED STREAM (Col 1-8 on desktop, centered)               */}
          {/* ======================================================================= */}
          <div className="lg:col-span-8 space-y-6 max-w-2xl mx-auto w-full">

            {/* =================================================================== */}
            {/* TOP STORIES / CATEGORY FILTER TRAY (Instagram Stories Vibe)        */}
            {/* =================================================================== */}
            <div className="bg-surface border border-outline-variant/70 rounded-3xl p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-3.5 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-vibrant-orange animate-pulse"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-on-surface">Explore Categories</span>
                </div>
                <span className="text-[11px] text-on-surface-variant font-medium">
                  {displayedJobs.length} {displayedJobs.length === 1 ? 'post' : 'posts'} available
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 sm:gap-3 items-center justify-items-center">
                {[
                  { id: 'all', label: 'All Feed', icon: 'dynamic_feed', gradient: 'from-orange-500 via-amber-500 to-yellow-500', count: jobs.length },
                  { id: 'ojt', label: 'OJT Interns', icon: 'school', gradient: 'from-blue-600 via-indigo-500 to-cyan-400', count: jobs.filter((j) => (j.posting_type || 'ojt') === 'ojt').length },
                  { id: 'on_call', label: 'On-Call Gigs', icon: 'bolt', gradient: 'from-amber-500 via-orange-500 to-rose-500', count: jobs.filter((j) => j.posting_type === 'on_call').length },
                  { id: 'career_job', label: 'Career Jobs', icon: 'work', gradient: 'from-emerald-500 via-teal-500 to-sky-500', count: jobs.filter((j) => j.posting_type === 'career_job' || j.posting_type === 'job').length },
                  { id: 'saved', label: 'Saved Posts', icon: 'bookmark', gradient: 'from-purple-600 via-pink-500 to-rose-400', count: bookmarkedJobs.length }
                ].map((story) => {
                  const isActive = typeFilter === story.id;
                  return (
                    <button
                      key={story.id}
                      onClick={() => setTypeFilter(story.id)}
                      className="flex flex-col items-center gap-1.5 w-full group focus:outline-none cursor-pointer"
                    >
                      {/* Story Circle with Glowing Ring */}
                      <div
                        className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full p-[2.5px] transition-all duration-300 ${
                          isActive
                            ? `bg-gradient-to-tr ${story.gradient} ring-2 ring-vibrant-orange/50 scale-105 shadow-md`
                            : 'bg-gradient-to-tr from-outline-variant to-outline-variant/40 hover:scale-105 hover:p-[3px] hover:bg-gradient-to-tr hover:from-vibrant-orange hover:to-pink-500'
                        }`}
                      >
                        <div className="w-full h-full rounded-full bg-surface flex items-center justify-center text-on-surface">
                          <span className={`material-symbols-outlined text-[22px] sm:text-[26px] ${isActive ? 'text-vibrant-orange' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                            {story.icon}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] sm:text-[11px] font-bold text-center leading-tight truncate w-full ${isActive ? 'text-vibrant-orange' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                        {story.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* "What's on your mind?" / Search Filter Bar (Facebook Style) */}
            <div className="bg-surface rounded-3xl border border-outline-variant/70 p-4 shadow-xs">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-on-surface-variant text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search roles, keywords, or verified companies..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-2xl text-xs sm:text-sm text-on-surface outline-none focus:ring-2 focus:ring-vibrant-orange"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={setup}
                    onChange={(e) => setSetup(e.target.value)}
                    className="flex-1 sm:flex-initial px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-2xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-vibrant-orange"
                  >
                    <option value="">🌐 All Setups</option>
                    <option value="onsite">🏢 On-Site</option>
                    <option value="hybrid">🔄 Hybrid</option>
                    <option value="remote">💻 Remote</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-vibrant-orange text-white rounded-2xl text-xs font-black hover:bg-deep-orange transition-all shadow-xs shrink-0"
                  >
                    Filter
                  </button>
                </div>
              </form>
            </div>

            {/* OJT Completer Status Alert (if applicable) */}
            {isOjtCompleter && !isStudentGraduated && (
              <div className="p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 border border-blue-500/20 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-fade-in">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[22px]">verified</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">OJT Hours Cleared! ⚡</p>
                    <p className="text-on-surface-variant mt-0.5">
                      Standard OJT offers are locked. You are now eligible for <strong>On-Call Gigs</strong> with allowance and instant portfolio crediting!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTypeFilter('on_call')}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center gap-1 self-start sm:self-auto shrink-0 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[15px]">bolt</span>
                  <span>View Gigs</span>
                </button>
              </div>
            )}

            {/* Feed Loading State */}
            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3 bg-surface rounded-3xl border border-outline-variant">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-vibrant-orange border-t-transparent"></div>
                <p className="text-xs font-bold text-on-surface-variant">Loading your personalized opportunities feed...</p>
              </div>
            ) : displayedJobs.length === 0 ? (
              <div className="bg-surface rounded-3xl border border-outline-variant text-center py-16 px-6 text-on-surface-variant space-y-3 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto text-on-surface-variant/40">
                  <span className="material-symbols-outlined text-4xl">dynamic_feed</span>
                </div>
                <h3 className="text-base font-bold text-on-surface">No Opportunities to Display</h3>
                <p className="text-xs max-w-md mx-auto">
                  {typeFilter === 'saved'
                    ? 'You have not bookmarked any opportunities yet. Tap the bookmark icon on any post to save it for later.'
                    : 'Try switching story categories or resetting your search filters.'}
                </p>
                <button
                  onClick={() => {
                    setSearch('');
                    setSetup('');
                    setTypeFilter('all');
                  }}
                  className="px-5 py-2.5 bg-vibrant-orange text-white rounded-2xl text-xs font-bold hover:bg-deep-orange transition-colors inline-flex items-center gap-2 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : (
              /* =================================================================== */
              /* SCROLLABLE FEED OF SOCIAL POSTS (Instagram / Facebook Feed Style)   */
              /* =================================================================== */
              <div className="space-y-6">
                {displayedJobs.map((job) => {
                  const pType = job.posting_type || 'ojt';
                  const isOjt = pType === 'ojt';
                  const isOnCall = pType === 'on_call';
                  const isCareerJob = pType === 'career_job' || pType === 'job';
                  const isBookmarked = bookmarkedJobs.includes(job.job_id);
                  const isLiked = likedJobs.includes(job.job_id);
                  const isExpanded = Boolean(expandedDesc[job.job_id]);

                  const isOjtBlockedForCompleter = isOjt && (isOjtCompleter || isStudentGraduated);
                  const isOjtBlockedForActive = isOjt && (hasActiveOjt || job.has_active_ojt);
                  const canApply = job.can_apply !== false && !isOjtBlockedForCompleter && !isOjtBlockedForActive;

                  // Dynamic mock likes count based on job_id for social feel
                  const baseLikes = (Number(job.job_id) * 7 + 12) % 45 + 8;
                  const currentLikes = isLiked ? baseLikes + 1 : baseLikes;

                  return (
                    <article
                      key={job.job_id}
                      className="bg-surface rounded-3xl border border-outline-variant/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300"
                    >
                      {/* ========================================================= */}
                      {/* POST HEADER (Avatar, Name, Verified, Location, More Menu) */}
                      {/* ========================================================= */}
                      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 border-b border-outline-variant/50">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Profile Avatar with Instagram-style Ring */}
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-[2px] bg-gradient-to-tr from-vibrant-orange via-pink-500 to-indigo-500 shrink-0">
                            <div className="w-full h-full rounded-full bg-surface flex items-center justify-center font-bold text-on-surface text-xs overflow-hidden uppercase">
                              {job.organization_logo ? (
                                <img
                                  src={resolveFileUrl(job.organization_logo)}
                                  alt={job.organization_name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/photo/default-avatar.svg';
                                  }}
                                />
                              ) : (
                                <span>{(job.organization_name || 'ORG').slice(0, 2)}</span>
                              )}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-xs sm:text-sm text-on-surface truncate">
                                {job.organization_name}
                              </span>
                              <span className="material-symbols-outlined text-[15px] text-blue-500 fill-1 shrink-0" title="Verified Host Employer">
                                verified
                              </span>
                              <span
                                className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  isOnCall
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                    : isOjt
                                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                }`}
                              >
                                {isOnCall ? '⚡ On-Call' : isOjt ? '🎓 OJT' : '💼 Career'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant truncate mt-0.5">
                              <span>{job.location ? job.location.split(',')[0] : 'Philippines'}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(job.created_at)}</span>
                              <span>•</span>
                              <span className="material-symbols-outlined text-[12px] opacity-70">public</span>
                            </div>
                          </div>
                        </div>

                        {/* Top-Right Quick Options */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleBookmark(job.job_id)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                              isBookmarked
                                ? 'bg-vibrant-orange/10 text-vibrant-orange'
                                : 'text-on-surface-variant hover:bg-surface-container'
                            }`}
                            title={isBookmarked ? 'Remove Bookmark' : 'Save Post'}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {isBookmarked ? 'bookmark' : 'bookmark_border'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* ========================================================= */}
                      {/* POST TITLE & WORK SETUP TAG BAR                           */}
                      {/* ========================================================= */}
                      <div className="px-4 py-2.5 bg-surface-container-lowest flex items-center justify-between gap-2 border-b border-outline-variant/40">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-vibrant-orange shrink-0"></span>
                          <h3 className="font-black text-sm sm:text-base text-on-surface truncate">
                            {job.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2.5 py-0.5 rounded-xl bg-surface-container text-on-surface text-[11px] font-bold border border-outline-variant">
                            {job.work_setup || 'Flexible'}
                          </span>
                        </div>
                      </div>

                      {/* ========================================================= */}
                      {/* POST MEDIA / FLYER BANNER (Instagram / Facebook Feed)     */}
                      {/* ========================================================= */}
                      <div
                        className="relative w-full bg-slate-950 overflow-hidden flex items-center justify-center select-none"
                        onDoubleClick={() => toggleLike(job.job_id)}
                      >
                        {job.flyer_image_url ? (
                          <div
                            className="w-full relative group/media cursor-pointer flex items-center justify-center overflow-hidden min-h-[300px] max-h-[640px] sm:max-h-[720px]"
                            onClick={() => setPreviewFlyer({ url: resolveFileUrl(job.flyer_image_url), title: job.title, org: job.organization_name })}
                          >
                            {/* Ambient Blurred Backdrop (Standard on Instagram & Facebook feeds) */}
                            <div
                              className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-35 scale-125 pointer-events-none"
                              style={{ backgroundImage: `url(${resolveFileUrl(job.flyer_image_url)})` }}
                            />

                            {/* Crisp, 100% Uncropped Main Poster Image */}
                            <img
                              src={resolveFileUrl(job.flyer_image_url)}
                              alt={`${job.title} Poster`}
                              loading="lazy"
                              decoding="async"
                              className="relative z-10 w-full h-auto max-h-[640px] sm:max-h-[720px] object-contain transition-transform duration-300 group-hover/media:scale-[1.01]"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />

                            {/* Hover / Expand Hint Pill */}
                            <div className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white font-bold text-xs opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center gap-1.5 shadow-lg border border-white/10">
                              <span className="material-symbols-outlined text-[16px]">fullscreen</span>
                              <span>Expand</span>
                            </div>
                          </div>
                        ) : (
                          /* High-Impact Social Graphic Placeholder */
                          <div className="w-full aspect-[16/9] min-h-[280px] bg-gradient-to-br from-slate-900 via-zinc-900 to-orange-950 p-6 sm:p-8 flex flex-col justify-between text-white relative">
                            <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                              <span className="material-symbols-outlined text-[180px]">
                                {isOnCall ? 'bolt' : isOjt ? 'school' : 'work'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 z-10">
                              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 backdrop-blur-md uppercase tracking-wider">
                                {isOnCall ? '⚡ On-Call Assignment' : isOjt ? '🎓 OJT Internship' : '💼 Career Job'}
                              </span>
                              {job.slots_available && (
                                <span className="text-xs font-bold text-white/90 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                                  {job.slots_available} slot(s) open
                                </span>
                              )}
                            </div>

                            <div className="z-10 space-y-1.5 my-auto py-4">
                              <h4 className="text-xl sm:text-2xl font-black text-white leading-tight">
                                {job.title}
                              </h4>
                              <p className="text-xs sm:text-sm text-white/80 font-medium">{job.organization_name}</p>
                              {job.workplace_area && (
                                <p className="text-xs text-vibrant-orange font-bold">📍 {job.workplace_area}</p>
                              )}
                            </div>

                            <div className="z-10 flex items-center justify-between pt-3 border-t border-white/20 text-xs font-bold text-vibrant-orange">
                              <span>
                                {isOnCall
                                  ? `₱${parseFloat(job.salary_rate || 0).toLocaleString()} / ${job.salary_rate_type || 'day'}`
                                  : isOjt
                                  ? 'OJT Allowance / Credited'
                                  : 'Full-Time Career'}
                              </span>
                              <span className="text-white/70 font-normal">InternconPH Verified Partner</span>
                            </div>
                          </div>
                        )}

                        {/* Double-tap Heart Animation Pop */}
                        {heartAnim[job.job_id] && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
                            <span className="material-symbols-outlined text-white text-8xl drop-shadow-2xl fill-1 text-rose-500">
                              favorite
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ========================================================= */}
                      {/* ACTION BAR (Like, Comment/Details, Share, Bookmark)      */}
                      {/* ========================================================= */}
                      <div className="p-3 sm:px-4 sm:pt-3.5 sm:pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Heart / Like Button */}
                          <button
                            onClick={() => toggleLike(job.job_id)}
                            className="flex items-center gap-1.5 transition-transform active:scale-125 focus:outline-none"
                            title={isLiked ? 'Unlike' : 'Like opportunity'}
                          >
                            <span
                              className={`material-symbols-outlined text-[24px] ${
                                isLiked ? 'text-rose-500 fill-1 animate-scale-up' : 'text-on-surface hover:text-rose-500'
                              }`}
                            >
                              favorite
                            </span>
                          </button>

                          {/* Quick Inspect Modal Trigger */}
                          <button
                            onClick={() => setInspectJob(job)}
                            className="flex items-center gap-1 text-on-surface hover:text-vibrant-orange transition-colors"
                            title="Inspect Full Specs & Mentor"
                          >
                            <span className="material-symbols-outlined text-[24px]">visibility</span>
                          </button>

                          {/* Share Button */}
                          <button
                            onClick={() => handleShare(job)}
                            className="flex items-center gap-1 text-on-surface hover:text-vibrant-orange transition-colors"
                            title="Share opportunity"
                          >
                            <span className="material-symbols-outlined text-[24px]">send</span>
                          </button>
                        </div>

                        {/* Right Action: Bookmark */}
                        <button
                          onClick={() => toggleBookmark(job.job_id)}
                          className={`transition-transform active:scale-125 ${
                            isBookmarked ? 'text-vibrant-orange' : 'text-on-surface hover:text-vibrant-orange'
                          }`}
                          title={isBookmarked ? 'Remove Bookmark' : 'Save'}
                        >
                          <span className="material-symbols-outlined text-[24px]">
                            {isBookmarked ? 'bookmark' : 'bookmark_border'}
                          </span>
                        </button>
                      </div>

                      {/* ========================================================= */}
                      {/* LIKES & SOCIAL ENGAGEMENT COUNT                           */}
                      {/* ========================================================= */}
                      <div className="px-4 pb-1">
                        <p className="text-xs font-black text-on-surface">
                          {currentLikes.toLocaleString()} student{currentLikes === 1 ? '' : 's'} interested
                        </p>
                      </div>

                      {/* ========================================================= */}
                      {/* POST CAPTION & SPECIFICATIONS (Instagram Style)           */}
                      {/* ========================================================= */}
                      <div className="px-4 py-2 space-y-2.5">
                        {/* Caption Text with bold Username */}
                        <div className="text-xs sm:text-sm text-on-surface leading-relaxed">
                          <span className="font-black mr-2">{job.organization_name}</span>
                          <span className={isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}>
                            {job.description || 'Exciting internship and career opportunity available for qualified students.'}
                          </span>
                          {job.description && job.description.length > 120 && (
                            <button
                              onClick={() => toggleDesc(job.job_id)}
                              className="text-on-surface-variant font-bold text-xs hover:text-on-surface ml-1 inline-block"
                            >
                              {isExpanded ? 'less' : '...more'}
                            </button>
                          )}
                        </div>

                        {/* Hashtags */}
                        <div className="flex items-center gap-1.5 flex-wrap text-xs text-blue-600 dark:text-blue-400 font-semibold">
                          <span>#{isOjt ? 'OJTInternship' : isOnCall ? 'OnCallGig' : 'CareerJob'}</span>
                          <span>#{job.work_setup || 'FlexibleSetup'}</span>
                          <span>#InternconPH</span>
                          <span>#VerifiedEmployer</span>
                        </div>

                        {/* Bento Specifications Mini-Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-xs">
                          {/* Compensation / Allowance */}
                          <div className="p-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/60">
                            <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Allowance / Rate</span>
                            <span className="font-black text-on-surface text-xs sm:text-sm text-vibrant-orange">
                              {isOnCall
                                ? `₱${parseFloat(job.salary_rate || 0).toLocaleString()} / ${job.salary_rate_type || 'day'}`
                                : isOjt
                                ? 'Allowance Credited'
                                : 'Career Standard'}
                            </span>
                          </div>

                          {/* Work Setup & Location */}
                          <div className="p-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/60">
                            <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Setup & Area</span>
                            <span className="font-bold text-on-surface truncate block">
                              {job.work_setup} {job.workplace_area ? `• ${job.workplace_area}` : ''}
                            </span>
                          </div>

                          {/* Slots / Turnaround */}
                          <div className="p-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/60 col-span-2 sm:col-span-1">
                            <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                              {isOnCall ? 'On-Call Schedule' : 'Availability'}
                            </span>
                            <span className="font-bold text-on-surface">
                              {isOnCall
                                ? `${job.on_call_days || 1} Day(s) (${job.finish_time || 'Immediate'})`
                                : `${job.slots_available || 1} Open Slot(s)`}
                            </span>
                          </div>
                        </div>

                        {/* Targeted Degree Programs Pills */}
                        {job.targeted_programs && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[10px] font-bold uppercase text-on-surface-variant">Eligible Majors:</span>
                            {job.targeted_programs.split(',').slice(0, 3).map((prog, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-[10px] font-semibold border border-outline-variant"
                              >
                                {prog.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ========================================================= */}
                      {/* ACTION / CTA APPLICATION FOOTER (Instagram Shop/Apply)     */}
                      {/* ========================================================= */}
                      <div className="p-3.5 sm:p-4 bg-surface-container-lowest border-t border-outline-variant/60">
                        {job.has_applied > 0 ? (
                          <button
                            disabled
                            className="w-full py-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs sm:text-sm font-black cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                            <span>Application Submitted ✓</span>
                          </button>
                        ) : isOjtBlockedForCompleter ? (
                          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-center space-y-1">
                            <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center justify-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px]">lock</span>
                              <span>OJT Completed — Switch to On-Call Feed</span>
                            </span>
                            <p className="text-[11px] text-on-surface-variant">
                              You already accomplished your internship hours. Please apply to On-Call gigs.
                            </p>
                          </div>
                        ) : isOjtBlockedForActive ? (
                          <div className="p-3 bg-surface-container rounded-2xl border border-outline-variant text-center space-y-1">
                            <span className="text-xs font-bold text-on-surface-variant flex items-center justify-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px]">timelapse</span>
                              <span>Placement Currently In Progress</span>
                            </span>
                          </div>
                        ) : !canApply ? (
                          <div className="p-3 bg-surface-container rounded-2xl border border-outline-variant text-center space-y-1">
                            <span className="text-xs font-bold text-on-surface flex items-center justify-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-vibrant-orange">lock</span>
                              <span>Application Restricted</span>
                            </span>
                            <p className="text-[11px] text-on-surface-variant">
                              {job.eligibility_notice || 'Restricted to students meeting specific institution clearances.'}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openApplyModal(job)}
                              className={`flex-1 py-3 rounded-2xl text-xs sm:text-sm font-black text-white transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                                isOnCall
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                                  : isOjt
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                                  : 'bg-gradient-to-r from-vibrant-orange to-deep-orange hover:opacity-95'
                              }`}
                            >
                              {isOnCall ? (
                                <>
                                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                                  <span>Apply for On-Call Gig</span>
                                </>
                              ) : isOjt ? (
                                <>
                                  <span className="material-symbols-outlined text-[20px]">send</span>
                                  <span>Apply for OJT Placement</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[20px]">work</span>
                                  <span>Apply for Career Position</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => setInspectJob(job)}
                              className="px-4 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-2xl text-xs font-bold border border-outline-variant transition-colors shrink-0 cursor-pointer"
                              title="Inspect Full Details"
                            >
                              Details
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* ======================================================================= */}
          {/* RIGHT SIDEBAR (Facebook Web Style: Profile, Standing, Guidelines, Tips) */}
          {/* ======================================================================= */}
          <div className="hidden lg:block lg:col-span-4 space-y-6 sticky top-20">
            
            {/* Student Profile & Standing Card */}
            <div className="bg-surface rounded-3xl border border-outline-variant/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-vibrant-orange to-pink-500 p-[2px]">
                  <div className="w-full h-full rounded-full bg-surface flex items-center justify-center font-bold text-on-surface overflow-hidden">
                    {user?.avatar_url ? (
                      <img src={resolveFileUrl(user.avatar_url)} alt={user?.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(user?.name || user?.email || 'ST').slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-sm text-on-surface truncate">{user?.name || 'Student Explorer'}</h4>
                  <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
                </div>
              </div>

              {/* Student Status Badge */}
              <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/60 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-tint text-vibrant-orange flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    {isStudentGraduated ? 'school' : isOjtCompleter ? 'verified' : 'badge'}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-black text-on-surface-variant block leading-tight">Standing</span>
                  <span className="font-bold text-xs text-on-surface truncate block">
                    {isStudentGraduated
                      ? 'Graduated Student 🎓'
                      : isOjtCompleter
                      ? 'OJT Accomplished ⚡'
                      : hasActiveOjt
                      ? 'Ongoing OJT & DTR'
                      : 'Undergraduate Pre-OJT'}
                  </span>
                </div>
              </div>

              {/* Quick Feed Quick-Switch Buttons */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <button
                  onClick={() => setTypeFilter('saved')}
                  className="p-2.5 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-bold flex flex-col items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-purple-500">bookmark</span>
                  <span>Saved ({bookmarkedJobs.length})</span>
                </button>
                <Link
                  to="/dashboard/student/applications"
                  className="p-2.5 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-bold flex flex-col items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px] text-vibrant-orange">send</span>
                  <span>My Applications</span>
                </Link>
              </div>
            </div>

            {/* OJT Student Tips & Guidelines */}
            <div className="bg-surface rounded-3xl border border-outline-variant/80 p-5 shadow-xs space-y-3 text-xs">
              <h4 className="font-black text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange text-[20px]">lightbulb</span>
                <span>Feed Guidelines</span>
              </h4>
              <ul className="space-y-2 text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="text-vibrant-orange font-bold">✓</span>
                  <span>Double-tap any flyer or poster to save your interest / like.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-vibrant-orange font-bold">✓</span>
                  <span>Bookmark opportunities to review them anytime in your Saved Posts tray.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-vibrant-orange font-bold">✓</span>
                  <span>Tap <strong>Details</strong> to inspect workplace mentors, deliverables, and company registration.</span>
                </li>
              </ul>
            </div>

            {/* Footer Links */}
            <div className="px-2 text-[11px] text-on-surface-variant/70 space-y-1">
              <p>© 2026 InternConPH • Republic of the Philippines CHED & DOLE Compliant Platform</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FULL JOB INSPECTION MODAL (When clicking "Details" / Inspect)              */}
        {/* ========================================================================= */}
        {inspectJob && (
          <div
            onClick={() => setInspectJob(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full bg-surface rounded-3xl overflow-hidden shadow-2xl border border-outline-variant flex flex-col max-h-[90vh] animate-scale-up"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-vibrant-orange text-white flex items-center justify-center font-bold shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      {inspectJob.posting_type === 'on_call' ? 'bolt' : inspectJob.posting_type === 'ojt' ? 'school' : 'work'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-on-surface">{inspectJob.title}</h3>
                    <p className="text-xs text-on-surface-variant">{inspectJob.organization_name} • Full Specification</p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectJob(null)}
                  className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
                
                {/* Core Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Posting Type</span>
                    <span className="font-black text-on-surface capitalize">{inspectJob.posting_type?.replace('_', ' ') || 'OJT Internship'}</span>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Work Setup</span>
                    <span className="font-black text-on-surface capitalize">{inspectJob.work_setup || 'Flexible'}</span>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Open Slots</span>
                    <span className="font-black text-on-surface">{inspectJob.slots_available || 1} available</span>
                  </div>
                </div>

                {/* Job Description */}
                <div className="space-y-1.5">
                  <h4 className="font-black text-xs uppercase tracking-wider text-on-surface-variant">Description & Overview</h4>
                  <div className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant text-on-surface leading-relaxed whitespace-pre-wrap text-xs">
                    {inspectJob.description}
                  </div>
                </div>

                {/* Requirements / Prerequisites */}
                {inspectJob.requirements && (
                  <div className="space-y-1.5">
                    <h4 className="font-black text-xs uppercase tracking-wider text-on-surface-variant">Qualifications & Prerequisites</h4>
                    <div className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant text-on-surface leading-relaxed whitespace-pre-wrap text-xs">
                      {inspectJob.requirements}
                    </div>
                  </div>
                )}

                {/* Deliverables */}
                {inspectJob.deliverables && (
                  <div className="space-y-1.5">
                    <h4 className="font-black text-xs uppercase tracking-wider text-on-surface-variant">Scope of Deliverables & Portfolio Crediting</h4>
                    <div className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant text-on-surface leading-relaxed whitespace-pre-wrap text-xs">
                      {inspectJob.deliverables}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-between gap-3">
                <button
                  onClick={() => setInspectJob(null)}
                  className="px-5 py-2.5 bg-surface-container text-on-surface rounded-2xl text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Close
                </button>
                {inspectJob.has_applied > 0 ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Applied Already</span>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      const selectedJob = inspectJob;
                      setInspectJob(null);
                      openApplyModal(selectedJob);
                    }}
                    className="px-6 py-2.5 bg-vibrant-orange text-white rounded-2xl text-xs font-black hover:bg-deep-orange transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Apply Now</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* APPLICATION CONFIRMATION MODAL                                            */}
        {/* ========================================================================= */}
        {applyModalJob && (
          <div
            onClick={() => !applySubmitting && setApplyModalJob(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full bg-surface rounded-3xl overflow-hidden shadow-2xl border border-outline-variant flex flex-col max-h-[92vh] animate-scale-up"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">
                      {applyModalJob.posting_type === 'on_call' ? 'bolt' : applyModalJob.posting_type === 'ojt' ? 'school' : 'work'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-on-surface truncate">Submit Application</h3>
                    <p className="text-xs text-on-surface-variant truncate">{applyModalJob.organization_name}</p>
                  </div>
                </div>
                {!applySubmitting && (
                  <button
                    onClick={() => setApplyModalJob(null)}
                    className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                {/* Error Notice */}
                {applyError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-shake">
                    <span className="material-symbols-outlined text-[20px] text-rose-600 shrink-0">error</span>
                    <div className="flex-1 leading-relaxed">{applyError}</div>
                  </div>
                )}

                {/* Success Notice */}
                {applySuccess && (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[20px] text-emerald-600 shrink-0">check_circle</span>
                    <div className="flex-1 font-bold">{applySuccess}</div>
                  </div>
                )}

                {/* Target Position Bento Card */}
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-black text-on-surface-variant">Position Applied For</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      {applyModalJob.posting_type === 'on_call' ? '⚡ On-Call' : applyModalJob.posting_type === 'ojt' ? '🎓 OJT' : '💼 Career'}
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-on-surface">{applyModalJob.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-on-surface-variant flex-wrap pt-1 border-t border-outline-variant/40">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">corporate_fare</span>
                      <span>{applyModalJob.organization_name}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span>{applyModalJob.location ? applyModalJob.location.split(',')[0] : 'Philippines'}</span>
                    </span>
                    <span className="flex items-center gap-1 font-bold text-on-surface">
                      <span className="material-symbols-outlined text-[14px]">payments</span>
                      <span>
                        {applyModalJob.posting_type === 'on_call'
                          ? `₱${parseFloat(applyModalJob.salary_rate || 0).toLocaleString()} / ${applyModalJob.salary_rate_type || 'day'}`
                          : applyModalJob.posting_type === 'ojt'
                          ? 'Allowance Credited'
                          : 'Career Standard'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Student Profile Overview */}
                <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant space-y-1.5">
                  <span className="text-[10px] uppercase font-black text-on-surface-variant block">Applicant Profile Transmitted</span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">Student:</span>
                    <span className="font-bold text-on-surface">{user?.name || user?.email}</span>
                  </div>
                  {studentProfile?.student_number && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant">Student No.:</span>
                      <span className="font-semibold text-on-surface">{studentProfile.student_number}</span>
                    </div>
                  )}
                  {studentProfile?.program_name && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant">Program:</span>
                      <span className="font-semibold text-on-surface truncate max-w-[240px]">{studentProfile.program_name}</span>
                    </div>
                  )}
                </div>

                {/* Cover Letter / Message to Employer */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface flex items-center justify-between">
                    <span>Note / Cover Letter to Employer</span>
                    <span className="text-[10px] text-on-surface-variant font-normal">Optional</span>
                  </label>
                  <textarea
                    rows={3}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    disabled={applySubmitting}
                    placeholder="Write a brief introduction or note to the hiring supervisor..."
                    className="w-full p-3 rounded-2xl bg-surface-container-low border border-outline-variant text-xs sm:text-sm text-on-surface outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed resize-none"
                  />
                </div>

                {/* Institutional Policy Notice */}
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0 mt-0.5">info</span>
                  <span>
                    As per CHED & institutional guidelines, your verified academic portfolio, resumes, and endorsements are securely shared with the host organization upon application.
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={applySubmitting}
                  onClick={() => setApplyModalJob(null)}
                  className="px-4 py-2.5 bg-surface-container text-on-surface rounded-2xl text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={applySubmitting || Boolean(applySuccess)}
                  onClick={submitApplication}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {applySubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Submitting Application...</span>
                    </>
                  ) : applySuccess ? (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>Submitted!</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>Confirm & Submit Application</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LIGHTBOX FOR PROMOTIONAL FLYER (Full High-Res Poster View)                 */}
        {/* ========================================================================= */}
        {previewFlyer && (
          <div
            onClick={() => setPreviewFlyer(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in cursor-zoom-out"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl w-full bg-surface rounded-3xl overflow-hidden shadow-2xl border border-white/20 flex flex-col max-h-[90vh]"
            >
              <div className="p-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-on-surface">{previewFlyer.title}</h3>
                  <p className="text-xs text-on-surface-variant">{previewFlyer.org} • Official Opportunity Poster</p>
                </div>
                <button
                  onClick={() => setPreviewFlyer(null)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="p-2 sm:p-4 bg-black/95 flex items-center justify-center overflow-auto max-h-[75vh]">
                <img
                  src={previewFlyer.url}
                  alt={previewFlyer.title}
                  loading="lazy"
                  decoding="async"
                  className="max-h-[70vh] w-auto object-contain rounded-xl shadow-2xl"
                />
              </div>

              <div className="p-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
                <a
                  href={previewFlyer.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-surface-container text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high transition-colors inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span>View Original Image</span>
                </a>
                <button
                  onClick={() => setPreviewFlyer(null)}
                  className="px-4 py-1.5 bg-vibrant-orange text-white rounded-xl text-xs font-bold hover:bg-deep-orange transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
