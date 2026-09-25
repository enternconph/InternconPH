import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import api from '../../api/client';
import { DashboardSkeleton } from '../../components/ui/Skeleton';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/student/dashboard');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Fetch student dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Real-time synchronization
  useRealtimeRefresh(fetchDashboard);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  const activeOjt = data?.activeOjt;
  const reqHours = data?.student?.required_ojt_hours || 600;
  const doneHours = activeOjt ? activeOjt.rendered_hours || 0 : 0;
  const progressPct = Math.min(100, Math.round((doneHours / reqHours) * 100));

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header Banner Bento */}
      <div className="bento-card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-on-surface">
              Welcome back, {data?.student?.first_name || user?.full_name?.split(' ')[0] || 'Student'}! 👋
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-emerald-600 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Track your OJT hours, browse accredited partner jobs, and monitor your placement.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {activeOjt && (
            <Link
              to="/dashboard/student/ojt"
              className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px] text-vibrant-orange">schedule</span>
              <span>View Daily Time Record</span>
            </Link>
          )}
          <Link
            to="/dashboard/student/jobs"
            className="px-4 py-2 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors shadow-sm"
          >
            Browse Openings →
          </Link>
        </div>
      </div>

      {/* Official Institutional Warning Notice (if any issued by institution) */}
      {data?.warnings && data.warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-amber-950 dark:text-amber-100">
                    Official Institutional Warning Issued
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase tracking-wider">
                    {data.warnings.length} Active {data.warnings.length === 1 ? 'Notice' : 'Notices'}
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Your university / institution coordinator has recorded an official disciplinary warning note on your file.
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/student/complaints?filter=warnings"
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>View Warning Details</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          <div className="p-3 rounded-xl bg-surface/80 border border-amber-300/40 text-xs space-y-1">
            <p className="font-bold text-amber-950 dark:text-amber-200">
              Incident: {data.warnings[0].subject} {data.warnings[0].organization_name ? `• ${data.warnings[0].organization_name}` : ''}
            </p>
            <p className="text-amber-900/90 dark:text-amber-300/90 italic">
              "{data.warnings[0].warning_note_to_student}"
            </p>
            {data.warnings[0].warning_sent_at && (
              <span className="text-[10px] text-amber-700 dark:text-amber-400 block pt-1">
                Issued on: {new Date(data.warnings[0].warning_sent_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bento-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">send</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Submitted Applications</p>
            <p className="text-2xl font-bold text-on-surface">{data?.appCount || 0}</p>
          </div>
        </div>

        <div className="bento-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-tint text-pinoy-green flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">timelapse</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Rendered Hours</p>
            <p className="text-2xl font-bold text-on-surface">{doneHours} / {reqHours} hrs</p>
          </div>
        </div>

        <div className="bento-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">verified</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Verification Status</p>
            <p className="text-sm font-bold text-pinoy-green">
              {user?.is_verified ? 'Verified Student' : 'Pending Endorsement'}
            </p>
          </div>
        </div>
      </div>

      {/* Active OJT Progress Card */}
      <div className="bento-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange">work</span>
            Active OJT Placement Progress
          </h2>
          {activeOjt && (
            <span className="px-3 py-1 bg-green-tint text-pinoy-green rounded-full text-xs font-bold capitalize">
              {activeOjt.status}
            </span>
          )}
        </div>

        {activeOjt ? (
          <div className="space-y-4">
            <div className="p-4 bg-surface-container rounded-xl flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-bold text-on-surface text-base">{activeOjt.organization_name}</p>
                <p className="text-xs text-on-surface-variant">{activeOjt.industry || 'Host Training Company'}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-vibrant-orange">{progressPct}%</p>
                <p className="text-xs text-on-surface-variant">Completed ({doneHours} / {reqHours} hrs)</p>
              </div>
            </div>

            <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden">
              <div
                className="bg-vibrant-orange h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>

            <div className="flex justify-end">
              <Link
                to="/dashboard/student/ojt"
                className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1"
              >
                <span>View Full Daily Time Record & Evaluations</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] text-outline mb-2">work_off</span>
            <p className="text-sm font-bold text-on-surface">No Active OJT Placement</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">
              Browse approved OJT opportunities from partner companies and submit your application to start rendering hours.
            </p>
            <Link
              to="/dashboard/student/jobs"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">search</span>
              <span>Find OJT Placements</span>
            </Link>
          </div>
        )}
      </div>

      {/* Digital Career Portfolio & Credentials Bento Card */}
      <div className="bento-card space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange">badge</span>
                Digital Career Portfolio & Credentials
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-tint text-vibrant-orange">
                {data?.portfolioSummary?.totalCount || 0} Assets Uploaded
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Curated showcase of your academic work, verified credentials, records, and resumes visible to hiring organizations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard/student/profile"
              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
            >
              <span className="material-symbols-outlined text-[14px]">visibility</span>
              View My Profile
            </Link>
            <Link
              to="/dashboard/student/portfolio"
              className="px-3.5 py-1.5 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors flex items-center gap-1 shadow-xs"
            >
              <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
              Manage Portfolio →
            </Link>
          </div>
        </div>

        {/* 4 Pillars Grid: Academic Portfolio, Credentials, Academic Records, Resume */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Academic Portfolio */}
          <Link
            to="/dashboard/student/portfolio"
            className="p-3.5 rounded-xl border border-outline-variant bg-surface hover:border-vibrant-orange/50 hover:bg-orange-tint/10 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-orange-tint text-vibrant-orange flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px]">school</span>
              </div>
              <span className="text-lg font-extrabold text-on-surface">
                {data?.portfolioSummary?.academicCount || 0}
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-bold text-on-surface group-hover:text-vibrant-orange transition-colors">
                Academic Portfolio
              </h3>
              <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">
                Projects, capstones, research & coursework
              </p>
            </div>
          </Link>

          {/* 2. Credentials */}
          <Link
            to="/dashboard/student/portfolio"
            className="p-3.5 rounded-xl border border-outline-variant bg-surface hover:border-vibrant-orange/50 hover:bg-orange-tint/10 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px]">military_tech</span>
              </div>
              <span className="text-lg font-extrabold text-on-surface">
                {data?.portfolioSummary?.credentialCount || 0}
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-bold text-on-surface group-hover:text-blue-600 transition-colors">
                Credentials
              </h3>
              <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">
                Certificates, honors, licenses & awards
              </p>
            </div>
          </Link>

          {/* 3. Academic Records */}
          <Link
            to="/dashboard/student/portfolio"
            className="p-3.5 rounded-xl border border-outline-variant bg-surface hover:border-vibrant-orange/50 hover:bg-orange-tint/10 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
              <span className="text-lg font-extrabold text-on-surface">
                {data?.portfolioSummary?.recordCount || 0}
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-bold text-on-surface group-hover:text-amber-700 transition-colors">
                Academic Records
              </h3>
              <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">
                Official transcripts, COR & grade sheets
              </p>
            </div>
          </Link>

          {/* 4. Active Resume */}
          <Link
            to="/dashboard/student/portfolio"
            className="p-3.5 rounded-xl border border-outline-variant bg-surface hover:border-vibrant-orange/50 hover:bg-orange-tint/10 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px]">contact_page</span>
              </div>
              <span className="text-lg font-extrabold text-on-surface">
                {data?.portfolioSummary?.resumeCount || 0}
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-bold text-on-surface group-hover:text-emerald-600 transition-colors">
                Resume & CV
              </h3>
              <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">
                Active formatted resumes for employer matching
              </p>
            </div>
          </Link>
        </div>

        {/* Graduated / Completed OJT Automatic Integration Notice */}
        {data?.portfolioSummary?.isGraduated ? (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-300 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <span>Verified OJT Background & Mentor Evaluation Attached</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800">
                  Graduated / OJT Completed
                </span>
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Because your OJT status is marked as graduated/completed, your completed internship record, rendered hours, host organization, and mentor performance evaluations are automatically published to your profile for prospective organizations to view.
              </p>
            </div>
            <Link
              to="/dashboard/student/profile"
              className="text-xs font-bold text-emerald-800 hover:underline shrink-0 hidden sm:inline"
            >
              Preview Profile →
            </Link>
          </div>
        ) : null}
      </div>

      {/* Available Opportunities Section */}
      <div className="bento-card space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange">explore</span>
                Available & Recommended Opportunities
              </h2>
              {data?.availableJobs?.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-tint text-vibrant-orange">
                  {data.availableJobs.length} openings
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant">
              Pre-screened OJT internships and career opportunities from partner employers.
            </p>
          </div>
          <Link
            to="/dashboard/student/jobs"
            className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1"
          >
            <span>Browse All Openings</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        {data?.availableJobs && data.availableJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.availableJobs.map((job) => {
              const pType = job.posting_type || 'ojt';
              const isPending = job.institution_approval === 'pending';

              return (
                <div
                  key={job.job_id}
                  className="p-4 rounded-xl border border-outline-variant bg-white hover:border-vibrant-orange/50 transition-all flex flex-col justify-between space-y-3 shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        pType === 'ojt'
                          ? 'bg-blue-500/10 text-blue-600'
                          : pType === 'on_call'
                          ? 'bg-amber-500/10 text-amber-700'
                          : 'bg-green-tint text-pinoy-green'
                      }`}>
                        <span className="material-symbols-outlined text-[12px]">
                          {pType === 'ojt' ? 'badge' : pType === 'on_call' ? 'bolt' : 'work'}
                        </span>
                        {pType === 'ojt' ? 'OJT Internship' : pType === 'on_call' ? 'On-Call' : 'Career Job'}
                      </span>

                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending School Approval
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-tint text-pinoy-green">
                          Accredited
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-on-surface line-clamp-1">{job.title}</h3>
                      <p className="text-xs font-medium text-vibrant-orange">{job.organization_name}</p>
                      <p className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-1 flex-wrap">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        <span>{job.location || 'On-site / Hybrid'}</span>
                        {job.workplace_area && (
                          <>
                            <span>•</span>
                            <span className="text-on-surface font-semibold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px] text-vibrant-orange">meeting_room</span>
                              <span>{job.workplace_area}</span>
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span className="capitalize">{job.work_setup}</span>
                      </p>
                    </div>

                    {job.description && (
                      <p className="text-xs text-on-surface-variant line-clamp-2">
                        {job.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between">
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      {job.slots_available || 1} slot{(job.slots_available || 1) > 1 ? 's' : ''} available
                    </span>
                    <Link
                      to="/dashboard/student/jobs"
                      className="px-3 py-1.5 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors flex items-center gap-1"
                    >
                      <span>{activeOjt && pType === 'ojt' ? 'View Opening' : 'View & Apply'}</span>
                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-on-surface-variant bg-slate-50 rounded-xl border border-slate-200">
            <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">work_outline</span>
            <p className="text-xs font-bold text-on-surface">No Posted Opportunities Available Right Now</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Check back soon as partner employers post new accredited OJT vacancies and career roles.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
