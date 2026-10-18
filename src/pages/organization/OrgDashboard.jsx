import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import api from '../../api/client';
import { DashboardSkeleton } from '../../components/ui/Skeleton';

export default function OrgDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNoMentorWarning, setShowNoMentorWarning] = useState(false);

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
                    <th className="py-3 px-3">Rendered Hours Progress</th>
                    <th className="py-3 px-3">OJT Status</th>
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
                            <span className="text-on-surface">{completed} hrs</span>
                            <span className="text-on-surface-variant">{required} hrs ({pct}%)</span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-vibrant-orange h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
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
            <table className="w-full text-left text-sm min-w-[780px]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low/60 text-on-surface-variant text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3 px-3.5">Opportunity Details</th>
                  <th className="py-3 px-3.5">Type & Audience</th>
                  <th className="py-3 px-3.5">Target Programs</th>
                  <th className="py-3 px-3.5">University Approvals</th>
                  <th className="py-3 px-3.5">Applicants</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {data.jobs.map((job) => {
                  const pType = job.posting_type || 'ojt';
                  const approvals = job.institution_approvals || [];
                  const approvedCount = approvals.filter(a => a.approval_status === 'approved').length;
                  const totalApprovals = approvals.length;
                  const programsList = job.target_programs || [];

                  return (
                    <tr key={job.job_id} className="hover:bg-surface-container-low/70 transition-colors text-xs group">
                      <td className="py-3.5 px-3.5">
                        <p className="font-bold text-sm text-on-surface group-hover:text-vibrant-orange transition-colors">{job.title}</p>
                        <div className="text-[11px] text-on-surface-variant flex items-center flex-wrap gap-1.5 mt-1 font-medium">
                          <span className="inline-flex items-center gap-0.5 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[13px] text-vibrant-orange">location_on</span>
                            {job.location || 'On-site / Hybrid'}
                          </span>
                          {job.workplace_area && (
                            <>
                              <span className="text-outline-variant">•</span>
                              <span className="inline-flex items-center gap-0.5 text-on-surface font-semibold">
                                <span className="material-symbols-outlined text-[12px] text-vibrant-orange">meeting_room</span>
                                <span>{job.workplace_area}</span>
                              </span>
                            </>
                          )}
                          <span className="text-outline-variant">•</span>
                          <span className="capitalize">{job.work_setup}</span>
                          <span className="text-outline-variant">•</span>
                          <span>{job.slots_available || 1} {job.slots_available === 1 ? 'slot' : 'slots'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                          pType === 'ojt'
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : pType === 'on_call'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          <span className="material-symbols-outlined text-[13px]">
                            {pType === 'ojt' ? 'badge' : pType === 'on_call' ? 'bolt' : 'work'}
                          </span>
                          {pType === 'ojt' ? 'OJT Internship' : pType === 'on_call' ? 'On-Call' : 'Career Job'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3.5">
                        {programsList.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                            {programsList.slice(0, 2).map((p, idx) => {
                              const label = p.program_code || p.program_name || (typeof p === 'string' ? p : 'Program');
                              return (
                                <span
                                  key={idx}
                                  title={p.program_name || label}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-surface-container-high text-on-surface border border-outline-variant/60 shadow-xs max-w-[130px] truncate"
                                >
                                  {label}
                                </span>
                              );
                            })}
                            {programsList.length > 2 && (
                              <span
                                title={programsList.slice(2).map(p => p.program_code || p.program_name).join(', ')}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-surface-container text-on-surface-variant border border-outline-variant/40"
                              >
                                +{programsList.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant italic">
                            <span className="material-symbols-outlined text-[13px] not-italic opacity-60">all_inclusive</span>
                            All Programs
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {totalApprovals > 0 ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            approvedCount === totalApprovals
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : approvedCount > 0
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}>
                            <span className="material-symbols-outlined text-[13px]">
                              {approvedCount === totalApprovals ? 'verified' : approvedCount > 0 ? 'rule' : 'hourglass_top'}
                            </span>
                            <span>{approvedCount}/{totalApprovals} Approved</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-on-surface-variant bg-surface-container border border-outline-variant/40">
                            <span className="material-symbols-outlined text-[12px]">public</span>
                            General
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-on-surface">{job.applicant_count || 0}</span>
                          <span className="text-[11px] text-on-surface-variant font-medium">candidates</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${
                          (job.status || 'active').toLowerCase() === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-surface-container text-on-surface-variant border border-outline-variant'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            (job.status || 'active').toLowerCase() === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                          }`} />
                          {job.status || 'Active'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        <Link
                          to="/dashboard/organization/jobs"
                          className="px-3 py-1.5 bg-surface-container text-on-surface hover:bg-vibrant-orange hover:text-white rounded-lg text-xs font-bold transition-all border border-outline-variant hover:border-vibrant-orange inline-flex items-center gap-1 group/btn shadow-xs"
                        >
                          <span>Manage</span>
                          <span className="material-symbols-outlined text-[14px] group-hover/btn:translate-x-0.5 transition-transform">arrow_forward</span>
                        </Link>
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
    </div>
  );
}

