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
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'ojt', 'career_job', 'on_call'
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Social feed interactive states
  const [previewFlyer, setPreviewFlyer] = useState(null);
  const [expandedDesc, setExpandedDesc] = useState({});
  const [bookmarkedJobs, setBookmarkedJobs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('interncon_bookmarked_jobs') || '[]');
    } catch {
      return [];
    }
  });

  const toggleBookmark = (jobId) => {
    setBookmarkedJobs((prev) => {
      const next = prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId];
      try {
        localStorage.setItem('interncon_bookmarked_jobs', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save bookmark:', err);
      }
      return next;
    });
  };

  const toggleDesc = (jobId) => {
    setExpandedDesc((prev) => ({ ...prev, [jobId]: !prev[jobId] }));
  };

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
  const isOjtCompleter = studentProfile?.is_ojt_completer || user?.ojt_status === 'completed' || user?.ojt_status === 'completed_ojt';
  const hasActiveOjt = Boolean(
    studentProfile?.has_active_ojt ||
    ['ongoing', 'in_progress', 'accepted', 'deployed'].includes(studentProfile?.ojt_status) ||
    ['ongoing', 'in_progress', 'accepted', 'deployed'].includes(user?.ojt_status)
  );

  const handleApply = async (jobId, postingType) => {
    if (postingType === 'ojt' && (isOjtCompleter || isStudentGraduated)) {
      setErrorMessage('Application locked: You have already completed your OJT requirement. Only On-Call opportunities and Career Jobs are available for OJT completers.');
      return;
    }

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

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const diffMs = new Date() - new Date(dateStr);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Story / Discovery Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
              Explore Opportunities Feed
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-vibrant-orange/10 text-vibrant-orange border border-vibrant-orange/20">
              Live Feed
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            {isStudentGraduated
              ? '🎓 Graduated Alumni Feed — Full access to Career Jobs and On-Call gigs across the Philippines.'
              : isOjtCompleter
              ? '⚡ OJT Accomplished Feed — You are cleared for On-Call opportunities with automatic portfolio crediting.'
              : '🎓 Undergraduate OJT Feed — Discover verified host organizations and apply for approved internships.'}
          </p>
        </div>

        {/* Student Standing Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-surface-container-high border border-outline-variant text-xs shadow-xs self-start lg:self-auto">
          <div className="w-7 h-7 rounded-xl bg-orange-tint text-vibrant-orange flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">
              {isStudentGraduated ? 'school' : isOjtCompleter ? 'verified' : 'badge'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant block leading-tight">
              Student Standing
            </span>
            <span className="font-bold text-on-surface">
              {isStudentGraduated
                ? 'Graduated Student 🎓'
                : isOjtCompleter
                ? 'OJT Accomplish (On-Call Ready ⚡)'
                : hasActiveOjt
                ? 'Ongoing OJT & DTR'
                : 'Pre-OJT Student'}
            </span>
          </div>
        </div>
      </div>

      {/* OJT Completer Exclusive Notice */}
      {isOjtCompleter && !isStudentGraduated && (
        <div className="p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 border border-blue-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
            </div>
            <div>
              <p className="font-bold text-sm text-on-surface">
                OJT Milestone Accomplished! Only On-Call Offers Available
              </p>
              <p className="text-on-surface-variant mt-0.5">
                You have finished your required internship hours. Standard OJT offers are disabled. You can now apply for flexible <strong>On-Call gigs</strong> to earn allowance and build your Career Portfolio until your Registrar updates you to <strong>Graduated Student</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setTypeFilter('on_call')}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            <span>View On-Call Offers</span>
          </button>
        </div>
      )}

      {/* Active OJT Banner */}
      {hasActiveOjt && !isOjtCompleter && !isStudentGraduated && (
        <div className="p-4 bg-orange-500/10 border border-vibrant-orange/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-vibrant-orange shrink-0">timelapse</span>
            <div>
              <p className="font-bold text-sm text-on-surface">
                Active OJT Placement in Progress & DTR
              </p>
              <p className="text-on-surface-variant mt-0.5">
                You currently have an accepted internship placement. New OJT applications are locked while your placement is ongoing.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/student/ojt"
            className="px-4 py-2 bg-vibrant-orange text-white font-bold rounded-xl hover:bg-deep-orange transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span>My OJT DTR & Hours</span>
          </Link>
        </div>
      )}

      {/* Toast Messages */}
      {message && (
        <div className="p-3.5 bg-green-tint text-pinoy-green rounded-xl text-xs font-bold flex items-center gap-2 border border-pinoy-green/20 animate-fade-in shadow-xs">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-error-container text-error rounded-xl text-xs font-bold flex items-center gap-2 border border-error/20 animate-fade-in shadow-xs">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Social-Media Filter Carousel / Story Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'all', label: 'All Feed', icon: 'dynamic_feed', count: jobs.length },
          {
            id: 'ojt',
            label: '🎓 OJT Internships',
            icon: 'badge',
            count: jobs.filter((j) => (j.posting_type || 'ojt') === 'ojt').length
          },
          {
            id: 'on_call',
            label: '⚡ On-Call Gigs',
            icon: 'bolt',
            count: jobs.filter((j) => j.posting_type === 'on_call').length
          },
          {
            id: 'job',
            label: '💼 Career Jobs (Grads)',
            icon: 'work',
            count: jobs.filter((j) => j.posting_type === 'career_job').length
          }
        ].map((tab) => {
          const isActive = typeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all shadow-xs ${
                isActive
                  ? 'bg-vibrant-orange text-white ring-2 ring-vibrant-orange/30 scale-102'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Setup Filter Toolbar */}
      <div className="bento-card p-3 sm:p-4">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto flex-1 max-w-lg">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search job title, skills, keywords, or company name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs sm:text-sm text-on-surface outline-none focus:ring-2 focus:ring-vibrant-orange"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-vibrant-orange text-white rounded-xl text-xs font-bold hover:bg-deep-orange transition-colors shrink-0 shadow-xs"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs font-bold text-on-surface-variant">Work Setup:</span>
            <select
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
              className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-vibrant-orange"
            >
              <option value="">All Setups (Onsite, Hybrid, Remote)</option>
              <option value="onsite">🏢 On-Site Only</option>
              <option value="hybrid">🌐 Hybrid Setup</option>
              <option value="remote">💻 Fully Remote</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feed Stream */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-vibrant-orange border-t-transparent"></div>
          <p className="text-xs font-bold text-on-surface-variant">Curating opportunities feed...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bento-card text-center py-16 text-on-surface-variant space-y-3">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">feed</span>
          <h3 className="text-base font-bold text-on-surface">No Opportunities in this Feed</h3>
          <p className="text-xs max-w-md mx-auto">
            Try switching filter pills or adjust your search keywords to view more available company postings.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSetup('');
              setTypeFilter('all');
            }}
            className="px-4 py-2 bg-surface-container text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Reset Feed Filters</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => {
            const pType = job.posting_type || 'ojt';
            const isOjt = pType === 'ojt';
            const isOnCall = pType === 'on_call';
            const isCareerJob = pType === 'career_job' || pType === 'job';
            const isBookmarked = bookmarkedJobs.includes(job.job_id);
            const isExpanded = Boolean(expandedDesc[job.job_id]);

            // Disable OJT applications for OJT Completers & Graduated students
            const isOjtBlockedForCompleter = isOjt && (isOjtCompleter || isStudentGraduated);
            const isOjtBlockedForActive = isOjt && (hasActiveOjt || job.has_active_ojt);
            const canApply = job.can_apply !== false && !isOjtBlockedForCompleter && !isOjtBlockedForActive;

            return (
              <div
                key={job.job_id}
                className="bg-surface rounded-3xl border border-outline-variant overflow-hidden hover:shadow-xl hover:border-vibrant-orange/40 transition-all duration-300 flex flex-col justify-between group"
              >
                {/* Social Post Header: Avatar, Name, Category Pill, Bookmark */}
                <div className="p-4 bg-surface-container-low border-b border-outline-variant/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Organization Avatar with Instagram-style gradient ring */}
                    <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-vibrant-orange via-pink-500 to-indigo-500 shrink-0">
                      <div className="w-full h-full rounded-full bg-surface flex items-center justify-center font-bold text-on-surface text-sm overflow-hidden uppercase">
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
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-on-surface truncate">
                          {job.organization_name}
                        </span>
                        <span className="material-symbols-outlined text-[14px] text-blue-500 fill-1 shrink-0" title="Verified Employer Partner">
                          verified
                        </span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant truncate">
                        {job.location ? job.location.split(',')[0] : 'Philippines'} • {formatTimeAgo(job.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleBookmark(job.job_id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isBookmarked
                          ? 'bg-vibrant-orange text-white'
                          : 'bg-surface text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                      }`}
                      title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Opportunity'}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isBookmarked ? 'bookmark' : 'bookmark_border'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* DIGITAL FLYER / POSTER MEDIA CONTAINER (Instagram / Facebook Media Vibe) */}
                <div className="relative w-full aspect-video bg-surface-container-high overflow-hidden flex items-center justify-center">
                  {job.flyer_image_url ? (
                    <div
                      onClick={() => setPreviewFlyer({ url: resolveFileUrl(job.flyer_image_url), title: job.title, org: job.organization_name })}
                      className="w-full h-full cursor-zoom-in relative group/media"
                    >
                      <img
                        src={resolveFileUrl(job.flyer_image_url)}
                        alt={`${job.title} Flyer`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      {/* Hover Overlay Hint */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-[2px]">
                        <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                        <span>Expand Flyer</span>
                      </div>
                    </div>
                  ) : (
                    /* Branded Visual Placeholder Banner */
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-zinc-800 to-orange-950 p-6 flex flex-col justify-between text-white relative overflow-hidden">
                      <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                        <span className="material-symbols-outlined text-[160px]">
                          {isOnCall ? 'bolt' : isOjt ? 'school' : 'work'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 z-10">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md">
                          {job.work_setup || 'Flexible Setup'}
                        </span>
                        {job.slots_available && (
                          <span className="text-[11px] font-semibold text-white/80">
                            {job.slots_available} slot(s) open
                          </span>
                        )}
                      </div>

                      <div className="z-10 space-y-1">
                        <h4 className="text-base sm:text-lg font-black text-white line-clamp-2 leading-tight">
                          {job.title}
                        </h4>
                        <p className="text-xs text-white/80 line-clamp-1">{job.organization_name}</p>
                      </div>

                      <div className="z-10 flex items-center justify-between text-[11px] font-bold text-vibrant-orange">
                        <span>
                          {isOnCall
                            ? `₱${parseFloat(job.salary_rate || 0).toLocaleString()} / ${job.salary_rate_type || 'day'}`
                            : isOjt
                            ? 'OJT Allowance / Credited'
                            : 'Career Opportunity'}
                        </span>
                        <span className="text-white/70 font-normal">InternconPH Verified</span>
                      </div>
                    </div>
                  )}

                  {/* Category Badge Overlay on Media */}
                  <div className="absolute top-3 left-3 z-10">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-md flex items-center gap-1.5 ${
                        isOnCall
                          ? 'bg-amber-500 text-white'
                          : isOjt
                          ? 'bg-blue-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isOnCall ? 'bolt' : isOjt ? 'badge' : 'work'}
                      </span>
                      <span>{isOnCall ? 'On-Call Offer' : isOjt ? 'OJT Internship' : 'Career Job'}</span>
                    </span>
                  </div>
                </div>

                {/* Social Caption & Opportunity Details */}
                <div className="p-4 sm:p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    {/* Title and Setup Tags */}
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-on-surface line-clamp-2 group-hover:text-vibrant-orange transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-on-surface-variant mt-1">
                        <span className="flex items-center gap-0.5 font-medium">
                          <span className="material-symbols-outlined text-[15px] text-vibrant-orange">location_on</span>
                          <span>{job.location || 'Philippines'}</span>
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-on-surface">{job.work_setup || 'Hybrid'}</span>
                        {job.workplace_area && (
                          <>
                            <span>•</span>
                            <span className="px-2 py-0.5 rounded bg-orange-tint text-vibrant-orange text-[10px] font-bold">
                              {job.workplace_area}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* On-Call Specs Card */}
                    {isOnCall && (
                      <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center font-bold text-amber-800 dark:text-amber-300">
                          <span className="text-sm">
                            ₱{parseFloat(job.salary_rate || 0).toLocaleString()} / {job.salary_rate_type || 'day'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 rounded-full uppercase tracking-wider">
                            {job.on_call_days || 1} Day(s) On-Call
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-amber-500/20">
                          <span>Finish / Deadline: <strong>{job.finish_time || 'Immediate'}</strong></span>
                          <span className="text-pinoy-green font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">verified</span>
                            <span>Auto Portfolio Credit</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Expandable Caption / Description (Social Media Vibe) */}
                    <div className="text-xs text-on-surface-variant leading-relaxed">
                      <p className={isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'}>
                        {job.description}
                      </p>
                      {job.description && job.description.length > 130 && (
                        <button
                          onClick={() => toggleDesc(job.job_id)}
                          className="text-vibrant-orange font-bold text-[11px] hover:underline mt-1 inline-block"
                        >
                          {isExpanded ? 'Show less' : '...more'}
                        </button>
                      )}
                    </div>

                    {/* Targeted Degree Programs / Requirements */}
                    {job.targeted_programs && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-bold uppercase text-on-surface-variant">Majors:</span>
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

                  {/* Action Section */}
                  <div className="pt-3 border-t border-outline-variant/60 space-y-2">
                    {job.has_applied > 0 ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-surface-container text-pinoy-green border border-pinoy-green/30 rounded-2xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        <span>Application Submitted</span>
                      </button>
                    ) : isOjtBlockedForCompleter ? (
                      /* Explicitly Disabled for OJT Completers */
                      <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-center space-y-1">
                        <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">lock</span>
                          <span>OJT Completed — On-Call Gigs Only</span>
                        </span>
                        <p className="text-[10px] text-on-surface-variant leading-tight">
                          You completed your OJT hours. You cannot apply for new OJT postings. Please explore <strong>On-Call offers</strong>.
                        </p>
                      </div>
                    ) : isOjtBlockedForActive ? (
                      <div className="p-2.5 bg-surface-container rounded-2xl border border-outline-variant text-center space-y-1">
                        <span className="text-[11px] font-bold text-on-surface-variant flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">lock</span>
                          <span>Placement Ongoing</span>
                        </span>
                        <p className="text-[10px] text-on-surface-variant">
                          New OJT applications locked during current internship placement.
                        </p>
                      </div>
                    ) : !canApply ? (
                      <div className="p-2.5 bg-surface-container rounded-2xl border border-outline-variant text-center space-y-1">
                        <span className="text-[11px] font-bold text-on-surface flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-vibrant-orange">lock</span>
                          {isOnCall
                            ? 'OJT Completers & Graduates Only'
                            : isCareerJob
                            ? 'Graduated Students Only'
                            : 'Eligibility Restricted'}
                        </span>
                        <p className="text-[10px] text-on-surface-variant leading-tight">
                          {job.eligibility_notice ||
                            'Available to students upon completing OJT or official graduation clearance.'}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApply(job.job_id, pType)}
                        disabled={applying === job.job_id}
                        className={`w-full py-2.5 rounded-2xl text-xs font-bold text-white transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 ${
                          isOnCall
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                            : isOjt
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                            : 'bg-gradient-to-r from-vibrant-orange to-deep-orange hover:opacity-95'
                        }`}
                      >
                        {applying === job.job_id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Submitting Application...</span>
                          </>
                        ) : isOnCall ? (
                          <>
                            <span className="material-symbols-outlined text-[18px]">bolt</span>
                            <span>Apply for On-Call Gig</span>
                          </>
                        ) : isOjt ? (
                          <>
                            <span className="material-symbols-outlined text-[18px]">send</span>
                            <span>Apply for OJT Internship</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[18px]">work</span>
                            <span>Apply for Career Position</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DIGITAL FLYER LIGHTBOX MODAL (Instagram Image Preview Vibe) */}
      {previewFlyer && (
        <div
          onClick={() => setPreviewFlyer(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-surface rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/40 flex flex-col max-h-[90vh]"
          >
            {/* Lightbox Header */}
            <div className="p-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-on-surface">{previewFlyer.title}</h3>
                <p className="text-xs text-on-surface-variant">{previewFlyer.org} • Official Opportunity Poster</p>
              </div>
              <button
                onClick={() => setPreviewFlyer(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Lightbox Image View */}
            <div className="p-2 sm:p-4 bg-black/90 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img
                src={previewFlyer.url}
                alt={previewFlyer.title}
                loading="lazy"
                decoding="async"
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>

            {/* Lightbox Footer */}
            <div className="p-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
              <a
                href={previewFlyer.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-surface-container text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high transition-colors inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                <span>Open Original High-Res</span>
              </a>
              <button
                onClick={() => setPreviewFlyer(null)}
                className="px-4 py-1.5 bg-vibrant-orange text-white rounded-xl text-xs font-bold hover:bg-deep-orange transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
