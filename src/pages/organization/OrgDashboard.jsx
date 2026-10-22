import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import api from '../../api/client';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { DetailDrawer, DetailRow } from '../../components/ui';
import { resolveFileUrl, formatAddress } from '../../utils/fileHelper';

export default function OrgDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNoMentorWarning, setShowNoMentorWarning] = useState(false);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState(null);

  const role = user?.role_name || user?.role || '';
  const isMentor = role === 'workplace_mentor' || role === 'mentor';

  const fetchOrgDashboard = useCallback(async () => {
    try {
      const res = await api.get('/org/dashboard');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Fetch org dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgDashboard();
  }, [fetchOrgDashboard]);

  // Real-time synchronization hook
  useRealtimeRefresh(fetchOrgDashboard);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  const organizationName = data?.organization?.organization_name || user?.full_name || 'Employer Partner';
  const deployedInterns = data?.deployedInterns || [];
  const assignedToMeInterns = isMentor ? deployedInterns.filter(i => i.is_assigned_to_mentor !== false) : deployedInterns;
  const activeInternsCount = isMentor
    ? assignedToMeInterns.filter(i => i.status === 'ongoing' || !i.status).length
    : (data?.stats?.activeInterns || deployedInterns.filter(i => i.status === 'ongoing').length);
  const completedEvaluationsCount = data?.stats?.completedEvaluations || 0;

  // ==========================================
  // 1. WORKPLACE MENTOR OVERVIEW VIEW
  // (Per system_workflow_prompt.txt STEP 6)
  // ==========================================
  if (isMentor) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        {/* Mentor Header Banner */}
        <div className="bento-card flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-orange-tint/40 to-surface border border-vibrant-orange/20">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-vibrant-orange/10 text-vibrant-orange font-bold text-xs">
              <span className="material-symbols-outlined text-[15px]">supervisor_account</span>
              Workplace Mentor Portal
            </div>
            <h1 className="text-2xl font-bold text-on-surface">
              {user?.full_name || 'Workplace Mentor'} • {organizationName}
            </h1>
            <p className="text-xs text-on-surface-variant max-w-2xl">
              As a Workplace Mentor, you are authorized to supervise student interns assigned to you, track attendance & rendered hours, submit institutional disciplinary reports, and conduct performance evaluations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/organization/ojt"
              className="px-4 py-2.5 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">badge</span>
              Deployed Interns
            </Link>
            <Link
              to="/dashboard/organization/evaluations"
              className="px-4 py-2.5 bg-surface-container text-on-surface rounded-lg font-bold text-xs hover:bg-surface-container-high transition-colors border border-outline-variant flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">rate_review</span>
              Evaluations
            </Link>
          </div>
        </div>

        {/* Workplace Mentor Authorized Scope Cards (Per system_workflow_prompt) */}
        <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant space-y-3">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider block flex items-center gap-1.5">
            <span className="material-symbols-outlined text-pinoy-green text-[18px]">verified_user</span>
            Workplace Mentor System Access Scope (Workflow Guidelines)
          </span>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-surface rounded-xl border border-outline-variant space-y-1">
              <div className="flex items-center gap-2 font-bold text-on-surface">
                <span className="material-symbols-outlined text-vibrant-orange text-[18px]">timelapse</span>
                1. Deployment & Attendance
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Monitor student login/logout timestamps and track hours rendered towards required OJT hours for interns under your direct supervision.
              </p>
            </div>

            <div className="p-3 bg-surface rounded-xl border border-outline-variant space-y-1">
              <div className="flex items-center gap-2 font-bold text-on-surface">
                <span className="material-symbols-outlined text-pinoy-green text-[18px]">grade</span>
                2. Student Evaluations
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Conduct official performance ratings for your assigned interns once hours are completed to qualify candidates for career opportunities.
              </p>
            </div>

            <div className="p-3 bg-surface rounded-xl border border-outline-variant space-y-1">
              <div className="flex items-center gap-2 font-bold text-on-surface">
                <span className="material-symbols-outlined text-error text-[18px]">report_problem</span>
                3. Infraction Reports
              </div>
              <p className="text-[11px] text-on-surface-variant">
                File non-compliance or behavioral complaints to the academic institution for student warnings.
              </p>
            </div>
          </div>
        </div>

        {/* Mentor Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bento-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">badge</span>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Assigned Active Interns</p>
              <p className="text-2xl font-bold text-on-surface">{activeInternsCount}</p>
            </div>
          </div>

          <div className="bento-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-tint text-pinoy-green flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">assignment_turned_in</span>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Assigned Interns Managed</p>
              <p className="text-2xl font-bold text-on-surface">{assignedToMeInterns.length} <span className="text-xs text-on-surface-variant font-normal">/ {deployedInterns.length} total</span></p>
            </div>
          </div>

          <div className="bento-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">rate_review</span>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Completed Evaluations</p>
              <p className="text-2xl font-bold text-on-surface">{completedEvaluationsCount}</p>
            </div>
          </div>
        </div>

        {/* Deployed Interns Monitoring Table */}
        <div className="bento-card space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Assigned Deployed Interns</h2>
              <p className="text-xs text-on-surface-variant">Real-time attendance tracking and performance evaluation monitoring under your supervision</p>
            </div>
            <Link
              to="/dashboard/organization/ojt"
              className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1"
            >
              <span>Manage All Interns</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          {deployedInterns.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-2">person_off</span>
              <h3 className="text-base font-bold text-on-surface">No Deployed Interns Assigned Yet</h3>
              <p className="text-xs mt-1">Once HR deploys accepted student applicants, they will appear here for supervision.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                    <th className="py-3 px-3">Student Intern</th>
                    <th className="py-3 px-3">Institution & Program</th>
                    <th className="py-3 px-3">Progress & Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {deployedInterns.map((intern) => {
                    const completed = intern.completed_ojt_hours || 0;
                    const required = intern.required_ojt_hours || 600;
                    const pct = Math.min(100, Math.round((completed / required) * 100));
                    const isAssigned = isMentor ? intern.is_assigned_to_mentor !== false : true;

                    return (
                      <tr
                        key={intern.ojt_id}
                        className={`hover:bg-surface-container-low transition-colors ${
                          !isAssigned ? 'opacity-70 bg-surface-container-lowest/50' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold text-on-surface">
                            {intern.first_name} {intern.last_name}
                          </div>
                          <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                            <span>ID #{intern.student_number || 'N/A'}</span>
                            {isMentor && !isAssigned && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-surface-container-high text-on-surface-variant border border-outline-variant">
                                {intern.mentor_first_name ? `Mentor: ${intern.mentor_first_name} ${intern.mentor_last_name || ''}` : 'Other Mentor'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs">
                          <div className="font-medium text-on-surface">{intern.program_name || 'Degree Program'}</div>
                          <div className="text-[11px] text-on-surface-variant">{intern.institution_name || 'Partner University'}</div>
                        </td>
                        <td className="py-3 px-3 text-xs">
                          <div className="flex items-center justify-between text-[11px] mb-1 font-bold">
                            <span className="text-on-surface">{completed} / {required} hrs</span>
                            <span className="text-vibrant-orange">{pct}%</span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden mb-1.5">
                            <div
                              className="bg-vibrant-orange h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            intern.status === 'ongoing' ? 'bg-orange-tint text-vibrant-orange' : 'bg-green-tint text-pinoy-green'
                          }`}>
                            {intern.status || 'ongoing'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isMentor && !isAssigned ? (
                            <div
                              className="inline-flex items-center gap-1.5"
                              title="Action disabled: This student intern is not assigned to your supervision."
                            >
                              <span className="px-2.5 py-1 bg-surface-container/60 text-on-surface-variant/60 rounded text-xs font-semibold cursor-not-allowed border border-outline-variant/40 flex items-center gap-1 select-none">
                                <span className="material-symbols-outlined text-[13px]">lock</span>
                                <span>Not Assigned</span>
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex gap-2">
                              <Link
                                to="/dashboard/organization/ojt"
                                className="px-2.5 py-1 bg-surface-container text-on-surface rounded text-xs font-bold hover:bg-surface-container-high transition-colors"
                              >
                                Attendance
                              </Link>
                              <Link
                                to="/dashboard/organization/evaluations"
                                className="px-2.5 py-1 bg-vibrant-orange text-white rounded text-xs font-bold hover:bg-deep-orange transition-colors"
                              >
                                Evaluate
                              </Link>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. HR MAIN ACCOUNT OVERVIEW VIEW
  // (Full organizational control)
  // ==========================================
  const pendingMentorsCount = data?.stats?.pendingMentorsCount || 0;
  const verifiedMentorsCount = data?.stats?.verifiedMentorsCount || 0;

  const handlePostOpportunityClick = () => {
    if (verifiedMentorsCount === 0) {
      setShowNoMentorWarning(true);
      return;
    }
    navigate('/dashboard/organization/jobs?create=true');
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Pending Mentor Verification Alert Banner */}
      {pendingMentorsCount > 0 && (
        <div className="p-4 bg-orange-tint/60 border border-vibrant-orange/40 rounded-2xl flex items-center justify-between flex-wrap gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-vibrant-orange text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">pending_actions</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span>Action Required: {pendingMentorsCount} Workplace Mentor Registration{pendingMentorsCount > 1 ? 's' : ''} Awaiting Verification</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-bold animate-pulse">
                  Urgent
                </span>
              </h3>
              <p className="text-xs text-on-surface-variant">
                Mentors who registered with your organization passcode cannot access their dashboards until approved by HR.
              </p>
            </div>
          </div>

          <Link
            to="/dashboard/organization/mentors"
            className="px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Review & Verify Mentors</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      )}

      {/* Banner */}
      <div className="bento-card flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {organizationName} 🏢
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            HR Dashboard: Manage job postings, applicant pipeline, candidate interviews, offers, workplace mentors, and deployed student interns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/organization/mentors"
            className="px-4 py-2.5 bg-surface-container text-on-surface rounded-lg font-bold text-xs hover:bg-surface-container-high transition-colors border border-outline-variant flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">supervisor_account</span>
            <span>Mentors ({verifiedMentorsCount})</span>
          </Link>
          <button
            type="button"
            onClick={handlePostOpportunityClick}
            className="px-5 py-2.5 bg-vibrant-orange text-white rounded-lg font-bold text-sm hover:bg-deep-orange transition-colors shadow-sm whitespace-nowrap flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Post New Opportunity</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bento-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">post_add</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Active Postings</p>
            <p className="text-2xl font-bold text-on-surface">{data?.stats?.activeJobs || 0}</p>
          </div>
        </div>

        <div className="bento-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-tint text-pinoy-green flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">group</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Applicants</p>
            <p className="text-2xl font-bold text-on-surface">{data?.stats?.totalApplicants || 0}</p>
          </div>
        </div>

        <div className="bento-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">badge</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Deployed Interns</p>
            <p className="text-2xl font-bold text-on-surface">{data?.stats?.activeInterns || 0}</p>
          </div>
        </div>

        <div className="bento-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">supervised_user_circle</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Workplace Mentors</p>
            <p className="text-2xl font-bold text-on-surface">
              {verifiedMentorsCount}
              {pendingMentorsCount > 0 && (
                <span className="text-xs text-vibrant-orange font-normal ml-1">
                  ({pendingMentorsCount} pending)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Posted Opportunities Section */}
      <div className="bento-card space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-on-surface">Posted Opportunities & Vacancies</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-tint text-vibrant-orange">
                {data?.jobs?.length || 0} active
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Active OJT internships, career openings, and on-call assignments dispatched to partner academic institutions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePostOpportunityClick}
              className="px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>+ Post Opportunity</span>
            </button>
            <Link
              to="/dashboard/organization/jobs"
              className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1 ml-2"
            >
              <span>Manage All Postings</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {data?.jobs?.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-outline-variant/60">
            <table className="w-full text-left text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low/60 text-on-surface-variant text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3 px-4">Opportunity</th>
                  <th className="py-3 px-4">Workplace Area / Dept</th>
                  <th className="py-3 px-4">Work Setup</th>
                  <th className="py-3 px-4">Slots Available</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {data.jobs.map((job) => {
                  const pType = job.posting_type || 'ojt';
                  const setupNorm = (job.work_setup || 'on_site').toLowerCase();

                  return (
                    <tr key={job.job_id} className="hover:bg-surface-container-low/70 transition-colors text-xs group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-on-surface group-hover:text-vibrant-orange transition-colors">{job.title}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 ${
                            pType === 'ojt'
                              ? 'bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30'
                              : pType === 'on_call'
                              ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {pType === 'ojt' ? 'OJT' : pType === 'on_call' ? 'On-Call' : 'Career'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-semibold text-on-surface text-xs">
                          <span className="material-symbols-outlined text-[15px] text-vibrant-orange">meeting_room</span>
                          <span>{job.workplace_area || 'General Workplace'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                          setupNorm.includes('remote')
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : setupNorm.includes('hybrid')
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        }`}>
                          <span className="material-symbols-outlined text-[13px]">
                            {setupNorm.includes('remote')
                              ? 'home_work'
                              : setupNorm.includes('hybrid')
                              ? 'swap_horiz'
                              : 'business'}
                          </span>
                          <span>{(job.work_setup || 'On-Site').replace(/_/g, '-')}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant/60 text-xs font-bold text-on-surface">
                          <span className="material-symbols-outlined text-[14px] text-vibrant-orange">group</span>
                          <span>{job.slots_available || 1}</span>
                          <span className="text-[11px] font-medium text-on-surface-variant">{job.slots_available === 1 ? 'slot' : 'slots'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedJobForDetail(job)}
                            className="px-3 py-1.5 bg-vibrant-orange/10 hover:bg-vibrant-orange text-vibrant-orange hover:text-white rounded-lg text-xs font-bold transition-all border border-vibrant-orange/30 hover:border-vibrant-orange inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                            <span>View Details</span>
                          </button>
                          <Link
                            to="/dashboard/organization/jobs"
                            className="px-3 py-1.5 bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg text-xs font-bold transition-all border border-outline-variant inline-flex items-center gap-1 group/btn shadow-xs"
                          >
                            <span>Manage</span>
                            <span className="material-symbols-outlined text-[14px] group-hover/btn:translate-x-0.5 transition-transform">arrow_forward</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px] text-slate-300 mb-2">post_add</span>
            <p className="text-sm font-bold text-on-surface">No Opportunities Posted Yet</p>
            <p className="text-xs mt-1">Post your first OJT Internship, Career Job, or On-Call offer to dispatch to accredited universities.</p>
            <Link
              to="/dashboard/organization/jobs"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">add_circle</span>
              <span>Create Opportunity Posting</span>
            </Link>
          </div>
        )}
      </div>

      {/* Recent Applicants */}
      <div className="bento-card space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Recent Candidate Applicants</h2>
            <p className="text-xs text-on-surface-variant">Latest students and graduates applying for your posted opportunities</p>
          </div>
          <Link to="/dashboard/organization/applicants" className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1">
            <span>View All Applicants</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        {data?.recentApplicants?.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-outline-variant/60">
            <table className="w-full text-left text-sm min-w-[650px]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low/60 text-on-surface-variant text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3 px-3.5">Candidate</th>
                  <th className="py-3 px-3.5">Course / Program</th>
                  <th className="py-3 px-3.5">Applied Job</th>
                  <th className="py-3 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {data.recentApplicants.map((app) => (
                  <tr key={app.application_id} className="hover:bg-surface-container-low/70 transition-colors text-xs">
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-sm text-on-surface">
                        {app.first_name} {app.last_name}
                      </p>
                      <span className="text-[11px] text-on-surface-variant">ID #{app.student_number || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-3.5 text-xs text-on-surface-variant font-medium">{app.program_name || 'N/A'}</td>
                    <td className="py-3 px-3.5 font-bold text-xs text-on-surface">{app.job_title}</td>
                    <td className="py-3 px-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold capitalize bg-orange-tint text-vibrant-orange border border-vibrant-orange/20 inline-flex items-center gap-1">
                        {app.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant py-4 text-center">No recent applicants yet.</p>
        )}
      </div>

      {/* NO WORKPLACE MENTOR WARNING MODAL */}
      {showNoMentorWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-surface rounded-2xl border border-outline-variant p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl relative max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Workplace Mentor Required</h3>
                  <p className="text-[11px] text-on-surface-variant">Host Training Establishment Requirement</p>
                </div>
              </div>
              <button
                onClick={() => setShowNoMentorWarning(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 text-xs">
                <p className="font-bold text-amber-900 text-sm mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-700 text-[18px]">error</span>
                  You don't have a mentor yet. Please add your mentor now.
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Before you can post an opportunity, you must add and designate a Workplace Mentor for your organization. Mentors are responsible for overseeing student interns, recording daily attendance, and submitting required evaluations.
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant text-xs space-y-1.5">
                <p className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-vibrant-orange text-[16px]">location_on</span>
                  Where to add your mentor:
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  Go to the <strong className="text-on-surface font-semibold">Workplace Mentors</strong> module in your navigation bar to generate an invitation passcode for your mentor.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowNoMentorWarning(false)}
                className="w-full sm:w-1/3 py-2.5 bg-slate-100 text-on-surface font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNoMentorWarning(false);
                  navigate('/dashboard/organization/mentors', { state: { openGeneratePasscode: true } });
                }}
                className="w-full sm:w-2/3 py-2.5 bg-vibrant-orange hover:bg-deep-orange text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 order-1 sm:order-2"
              >
                <span className="material-symbols-outlined text-[18px]">supervisor_account</span>
                <span>Workplace Mentors</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS DRAWER */}
      <DetailDrawer
        open={!!selectedJobForDetail}
        onClose={() => setSelectedJobForDetail(null)}
        title={selectedJobForDetail?.title || 'Opportunity Details'}
        subtitle="Opportunity & Placement Specs"
        footer={
          selectedJobForDetail && (
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                onClick={() => setSelectedJobForDetail(null)}
                className="px-4 py-2 bg-surface-container text-on-surface hover:bg-surface-container-high rounded-xl text-xs font-bold transition-all border border-outline-variant"
              >
                Close
              </button>
              <Link
                to="/dashboard/organization/jobs"
                className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5"
              >
                <span>Manage in Postings</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
            </div>
          )
        }
      >
        {selectedJobForDetail && (() => {
          const job = selectedJobForDetail;
          const pType = job.posting_type || 'ojt';
          const approvals = job.institution_approvals || [];
          const approvedCount = approvals.filter(a => a.approval_status === 'approved').length;
          const totalApprovals = approvals.length;
          const programsList = job.target_programs || [];

          return (
            <div className="space-y-4">
              {job.flyer_image_url && (
                <div className="rounded-2xl overflow-hidden border border-outline-variant max-h-48 bg-surface-container">
                  <img
                    src={resolveFileUrl(job.flyer_image_url)}
                    alt={job.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Status & Approvals Section */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-3">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-vibrant-orange">verified_user</span>
                    Status & Approvals
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                    (job.status || 'active').toLowerCase() === 'active'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-surface-container text-on-surface-variant border border-outline-variant'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      (job.status || 'active').toLowerCase() === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                    }`} />
                    {job.status || 'Active'}
                  </span>
                </div>

                <DetailRow label="Candidates Applied">
                  <span className="font-bold text-on-surface">
                    {job.applicant_count || 0} applicant{job.applicant_count === 1 ? '' : 's'}
                  </span>
                </DetailRow>

                <DetailRow label="Institution Approvals">
                  {totalApprovals > 0 ? (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      approvedCount === totalApprovals
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : approvedCount > 0
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {approvedCount === totalApprovals ? 'verified' : approvedCount > 0 ? 'rule' : 'hourglass_top'}
                      </span>
                      <span>{approvedCount}/{totalApprovals} Approved</span>
                    </span>
                  ) : (
                    <span className="text-xs text-on-surface-variant font-medium">General Access (All Accredited Institutions)</span>
                  )}
                </DetailRow>

                {totalApprovals > 0 && (
                  <div className="pt-2 border-t border-outline-variant/30 space-y-1.5">
                    <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Institution Endorsement Breakdown</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {approvals.map((app, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-surface-container/70 border border-outline-variant/40">
                          <span className="font-semibold text-on-surface truncate mr-2" title={app.institution_name}>
                            {app.institution_name || app.institution_code || 'Academic Partner'}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider shrink-0 ${
                            app.approval_status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : app.approval_status === 'rejected'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}>
                            {app.approval_status || 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Target Programs & Audience Section */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-3">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-vibrant-orange">school</span>
                    Target Programs & Audience
                  </span>
                  <span className="text-xs font-bold text-on-surface">
                    {programsList.length > 0 ? `${programsList.length} Program${programsList.length === 1 ? '' : 's'}` : 'All'}
                  </span>
                </div>

                {programsList.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {programsList.map((p, idx) => {
                      const code = p.program_code || (typeof p === 'string' ? p : '');
                      const name = p.program_name || '';
                      return (
                        <div
                          key={idx}
                          className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface border border-outline-variant/60 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[14px] text-vibrant-orange">check_circle</span>
                          <div>
                            {code && <span className="font-bold text-xs mr-1.5">{code}</span>}
                            {name && <span className="text-[11px] text-on-surface-variant">{name}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/40 text-xs text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-vibrant-orange">all_inclusive</span>
                    <span>This opportunity accepts applicants from <strong>all academic programs and disciplines</strong>.</span>
                  </div>
                )}
              </div>

              {/* Location & Placement Specs Section */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-3">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-vibrant-orange">location_on</span>
                    Workplace Location & Specifications
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Physical Address / Work Location</p>
                  <p className="text-sm font-semibold text-on-surface leading-snug">
                    {formatAddress(job.location) || job.location || 'On-site / Hybrid arrangement'}
                  </p>
                </div>

                <div className="pt-2 border-t border-outline-variant/30 space-y-2">
                  <DetailRow label="Opportunity Type">
                    <span className="font-bold text-on-surface capitalize">
                      {pType === 'ojt' ? 'OJT Internship' : pType === 'on_call' ? 'On-Call Opportunity' : 'Career Opening'}
                    </span>
                  </DetailRow>
                  <DetailRow label="Work Setup">
                    <span className="capitalize font-semibold text-on-surface">{job.work_setup || 'On-Site'}</span>
                  </DetailRow>
                  {job.workplace_area && (
                    <DetailRow label="Workplace Area / Dept">
                      <span className="font-semibold text-on-surface">{job.workplace_area}</span>
                    </DetailRow>
                  )}
                  <DetailRow label="Slots Available">
                    <span className="font-bold text-on-surface">{job.slots_available || 1} {job.slots_available === 1 ? 'slot' : 'slots'}</span>
                  </DetailRow>
                  {job.mentor_first_name && (
                    <DetailRow label="Assigned Mentor">
                      <span className="font-semibold text-on-surface">
                        {job.mentor_first_name} {job.mentor_last_name}
                      </span>
                    </DetailRow>
                  )}
                  {(job.start_time || job.finish_time) && (
                    <DetailRow label="Shift Hours">
                      <span>{job.start_time || '08:00'} - {job.finish_time || '17:00'} (PST)</span>
                    </DetailRow>
                  )}
                </div>
              </div>

              {/* Description & Requirements (if present) */}
              {job.description && (
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-1.5">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Description</p>
                  <p className="text-xs text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                    {job.description}
                  </p>
                </div>
              )}

              {job.requirements && (
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-1.5">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Requirements</p>
                  <p className="text-xs text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                    {job.requirements}
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </DetailDrawer>
    </div>
  );
}

