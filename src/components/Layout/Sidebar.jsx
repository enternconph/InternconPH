import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from './DashboardLayout';
import { resolveFileUrl } from '../../utils/fileHelper';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const role = user.role_name || user.role || '';
  const position = user.position || (user.details && user.details.position) || '';

  const handleLogout = async () => {
    setSidebarOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-150 ${
      isActive
        ? 'bg-vibrant-orange text-white font-bold shadow-sm ring-1 ring-vibrant-orange/50'
        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
    }`;

  const getPositionLabel = () => {
    if (position) {
      return position.replace(/_/g, ' ');
    }
    if (role === 'institution') return 'Institution Director';
    if (role === 'hiring_organization') return 'HR Administrator';
    if (role === 'system_admin') return 'System Administrator';
    if (role === 'workplace_mentor' || role === 'mentor') return 'Workplace Mentor';
    return (role || '').replace(/_/g, ' ');
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-[min(18rem,calc(100vw-3rem))] sm:w-64 bg-surface-container-lowest border-r border-outline-variant flex flex-col h-screen h-[100dvh] max-h-screen max-h-[100dvh] transition-transform duration-300 ease-in-out lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:w-64 lg:shrink-0 lg:h-full lg:shadow-none ${
        sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-outline-variant flex items-center justify-between gap-3 shrink-0 bg-surface-container-lowest">
        <div className="flex items-center gap-3 overflow-hidden">
          <img src="/logo.png" alt="internconPH Logo" className="h-9 w-auto object-contain shrink-0" loading="lazy" decoding="async" />
          <div className="overflow-hidden">
            <span className="font-black text-lg text-vibrant-orange tracking-tight block">íntєrncσnᵖʰ</span>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider truncate block">
              {getPositionLabel()}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors shrink-0"
          aria-label="Close sidebar"
        >
          <span className="material-symbols-outlined text-[20px] block">close</span>
        </button>
      </div>

      {/* Navigation Links with Semantic Grouping */}
      <nav className="flex-1 p-3.5 space-y-4 overflow-y-auto overscroll-contain min-h-0" onClick={() => setSidebarOpen(false)}>
        
        {/* ================================================================= */}
        {/* STUDENT NAV                                                       */}
        {/* ================================================================= */}
        {role === 'student' && (
          <>
            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Main
              </span>
              <NavLink to="/dashboard/student" end className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">dashboard</span>
                <span>Dashboard</span>
              </NavLink>
            </div>

            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Opportunities & OJT
              </span>
              <NavLink to="/dashboard/student/jobs" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">dynamic_feed</span>
                <span>Browse Jobs & Feed</span>
              </NavLink>
              <NavLink to="/dashboard/student/applications" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">send</span>
                <span>My Applications</span>
              </NavLink>
              <NavLink to="/dashboard/student/ojt" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">timelapse</span>
                <span>OJT Progress & DTR</span>
              </NavLink>
            </div>

            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Skills & Career
              </span>
              <NavLink to="/dashboard/student/skills" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">psychology</span>
                <span>Skills & Matches</span>
              </NavLink>
              <NavLink to="/dashboard/student/portfolio" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">folder_special</span>
                <span>Career Portfolio</span>
              </NavLink>
            </div>

            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Account & Support
              </span>
              <NavLink to="/dashboard/student/complaints" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">gavel</span>
                <span>Grievances & Reports</span>
              </NavLink>
              <NavLink to="/dashboard/student/profile" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">person</span>
                <span>My Profile</span>
              </NavLink>
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* WORKPLACE MENTOR NAV                                              */}
        {/* ================================================================= */}
        {(role === 'workplace_mentor' || role === 'mentor') && (
          <>
            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Overview
              </span>
              <NavLink to="/dashboard/organization" end className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">dashboard</span>
                <span>Mentor Dashboard</span>
              </NavLink>
            </div>

            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Supervision
              </span>
              <NavLink to="/dashboard/organization/ojt" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">badge</span>
                <span>Deployed Interns & DTR</span>
              </NavLink>
              <NavLink to="/dashboard/organization/evaluations" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">rate_review</span>
                <span>Student Evaluations</span>
              </NavLink>
              <NavLink to="/dashboard/organization/grievances" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">report_problem</span>
                <span>Grievance & Incident Reports</span>
              </NavLink>
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* HIRING ORGANIZATION (HR ADMIN) NAV                                */}
        {/* ================================================================= */}
        {(role === 'hiring_organization' || role === 'hr_staff') && (
          <>
            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Overview
              </span>
              <NavLink to="/dashboard/organization" end className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">dashboard</span>
                <span>Employer Dashboard</span>
              </NavLink>
            </div>

            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Recruitment Pipeline
              </span>
              <NavLink to="/dashboard/organization/jobs" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">post_add</span>
                <span>Job Postings</span>
              </NavLink>
              <NavLink to="/dashboard/organization/applicants" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">group</span>
                <span>Applicants & Talent</span>
              </NavLink>
              <NavLink to="/dashboard/organization/interviews" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">event_available</span>
                <span>Interviews</span>
              </NavLink>
              <NavLink to="/dashboard/organization/offers" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                <span>Offers & Deployments</span>
              </NavLink>
            </div>

            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Interns & Mentorship
              </span>
              <NavLink to="/dashboard/organization/ojt" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">badge</span>
                <span>Deployed Interns & DTR</span>
              </NavLink>
              <NavLink to="/dashboard/organization/evaluations" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">rate_review</span>
                <span>Evaluations</span>
              </NavLink>
              <NavLink to="/dashboard/organization/grievances" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">report_problem</span>
                <span>Grievance & Incidents</span>
              </NavLink>
              <NavLink to="/dashboard/organization/mentors" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">supervisor_account</span>
                <span>Workplace Mentors</span>
              </NavLink>
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* INSTITUTION DIRECTOR NAV                                          */}
        {/* ================================================================= */}
        {role === 'institution' && (
          <>
            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Overview
              </span>
              <NavLink to="/dashboard/institution" end className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">dashboard</span>
                <span>Institution Overview</span>
              </NavLink>
            </div>

            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Students & OJT
              </span>
              <NavLink to="/dashboard/institution/students" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
                <span>Student Verification</span>
              </NavLink>
              <NavLink to="/dashboard/institution/monitoring" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">monitoring</span>
                <span>OJT Monitoring & DTR</span>
              </NavLink>
              <NavLink to="/dashboard/institution/ojt-offers" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">work_outline</span>
                <span>Dispatched OJT Offers</span>
              </NavLink>
            </div>

            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Academic Operations
              </span>
              <NavLink to="/dashboard/institution/staff" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">badge</span>
                <span>Faculty & Coordinators</span>
              </NavLink>
              <NavLink to="/dashboard/institution/programs" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
                <span>Degree Programs</span>
              </NavLink>
              <NavLink to="/dashboard/institution/requirements" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">assignment_late</span>
                <span>Clearance Requirements</span>
              </NavLink>
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* INSTITUTION STAFF NAV                                             */}
        {/* ================================================================= */}
        {role === 'institution_staff' && (
          <>
            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Overview
              </span>
              <NavLink to="/dashboard/institution" end className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">dashboard</span>
                <span>Staff Overview</span>
              </NavLink>
            </div>

            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Assigned Scope
              </span>
              {/* OJT Coordinator / Supervisor */}
              {(position === 'ojt_supervisor' || position === 'ojt_coordinator' || !position) && (
                <>
                  <NavLink to="/dashboard/institution/students" className={navItemClass}>
                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                    <span>Student Verification</span>
                  </NavLink>
                  <NavLink to="/dashboard/institution/monitoring" className={navItemClass}>
                    <span className="material-symbols-outlined text-[20px]">monitoring</span>
                    <span>OJT Monitoring & Logs</span>
                  </NavLink>
                  <NavLink to="/dashboard/institution/ojt-offers" className={navItemClass}>
                    <span className="material-symbols-outlined text-[20px]">work_outline</span>
                    <span>OJT Offers</span>
                  </NavLink>
                </>
              )}

              {/* Registrar */}
              {position === 'registrar' && (
                <>
                  <NavLink to="/dashboard/institution/students" className={navItemClass}>
                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                    <span>Student Verification</span>
                  </NavLink>
                  <NavLink to="/dashboard/institution/requirements" className={navItemClass}>
                    <span className="material-symbols-outlined text-[20px]">assignment_late</span>
                    <span>Clearance Requirements</span>
                  </NavLink>
                </>
              )}

              {/* Guidance Counselor */}
              {position === 'guidance_counselor' && (
                <NavLink to="/dashboard/institution/monitoring" className={navItemClass}>
                  <span className="material-symbols-outlined text-[20px]">gavel</span>
                  <span>Grievance Oversight</span>
                </NavLink>
              )}

              {/* Dean */}
              {position === 'dean' && (
                <>
                  <NavLink to="/dashboard/institution/students" className={navItemClass}>
                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                    <span>Department Students</span>
                  </NavLink>
                  <NavLink to="/dashboard/institution/staff" className={navItemClass}>
                    <span className="material-symbols-outlined text-[20px]">badge</span>
                    <span>Department Staff</span>
                  </NavLink>
                  <NavLink to="/dashboard/institution/programs" className={navItemClass}>
                    <span className="material-symbols-outlined text-[20px]">menu_book</span>
                    <span>Department Programs</span>
                  </NavLink>
                  <NavLink to="/dashboard/institution/monitoring" className={navItemClass}>
                    <span className="material-symbols-outlined text-[20px]">monitoring</span>
                    <span>OJT Monitoring</span>
                  </NavLink>
                  <NavLink to="/dashboard/institution/ojt-offers" className={navItemClass}>
                    <span className="material-symbols-outlined text-[20px]">work_outline</span>
                    <span>OJT & Job Offers</span>
                  </NavLink>
                </>
              )}
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* SYSTEM ADMIN NAV                                                  */}
        {/* ================================================================= */}
        {role === 'system_admin' && (
          <>
            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                System
              </span>
              <NavLink to="/dashboard/admin" end className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                <span>System Overview</span>
              </NavLink>
            </div>

            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Platform Entities
              </span>
              <NavLink to="/dashboard/admin/institutions" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">school</span>
                <span>Institutions</span>
              </NavLink>
              <NavLink to="/dashboard/admin/organizations" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">business</span>
                <span>Organizations</span>
              </NavLink>
              <NavLink to="/dashboard/admin/jobs" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">work</span>
                <span>Job Moderation</span>
              </NavLink>
              <NavLink to="/dashboard/admin/users" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                <span>User Accounts</span>
              </NavLink>
            </div>

            <div className="space-y-1">
              <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block">
                Governance & Intelligence
              </span>
              <NavLink to="/dashboard/admin/complaints" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">gavel</span>
                <span>Grievance Oversight</span>
              </NavLink>
              <NavLink to="/dashboard/admin/analytics" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">trending_up</span>
                <span>Skill Analytics</span>
              </NavLink>
              <NavLink to="/dashboard/admin/audit-logs" className={navItemClass}>
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                <span>Audit Trail</span>
              </NavLink>
            </div>
          </>
        )}
        
        {/* Mobile Quick Sign Out item inside scrollable nav */}
        <div className="pt-3 mt-3 border-t border-outline-variant/60 lg:hidden">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-error hover:bg-error-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* User Footer / Logout */}
      <div className="p-3.5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))] border-t border-outline-variant bg-surface-container-low shrink-0 mt-auto">
        <div
          onClick={() => {
            setSidebarOpen(false);
            navigate('/dashboard/settings');
          }}
          className="flex items-center gap-3 mb-2.5 p-2 rounded-2xl hover:bg-surface-container transition-colors cursor-pointer group"
          title="Manage Profile & Settings"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden bg-vibrant-orange text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
            {user.avatar_url ? (
              <img
                src={resolveFileUrl(user.avatar_url)}
                alt="Avatar"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/photo/default-avatar.svg';
                }}
              />
            ) : (
              user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()
            )}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="font-bold text-xs text-on-surface truncate group-hover:text-vibrant-orange transition-colors">
              {user.display_name || user.full_name || user.email}
            </p>
            <p className="text-[10px] text-on-surface-variant truncate">{user.email}</p>
          </div>
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-vibrant-orange group-hover:rotate-45 transition-all">
            settings
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-surface-container hover:bg-error-container hover:text-error rounded-xl text-xs font-bold text-on-surface-variant transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
