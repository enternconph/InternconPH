import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from './DashboardLayout';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useSidebar();
  const navigate = useNavigate();

  if (!user) return null;

  const role = user.role_name || user.role || '';
  const position = user.position || (user.details && user.details.position) || '';

  const handleLogout = async () => {
    setSidebarOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
      isActive
        ? 'bg-orange-tint text-vibrant-orange font-bold shadow-sm dark:bg-primary-container dark:text-white dark:shadow-md dark:shadow-primary-container/20'
        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
    }`;

  const getPositionLabel = () => {
    if (position) {
      return position.replace(/_/g, ' ');
    }
    if (role === 'institution') return 'Institution Director';
    if (role === 'hiring_organization') return 'HR Administrator';
    if (role === 'system_admin') return 'System Administrator';
    return (role || '').replace(/_/g, ' ');
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-64 bg-surface-container-lowest border-r border-outline-variant flex flex-col h-screen max-h-screen transition-transform duration-300 ease-in-out lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:w-64 lg:shrink-0 lg:h-full lg:shadow-none ${
        sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-outline-variant flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <img src="/logo.png" alt="internconPH Logo" className="h-9 w-auto object-contain shrink-0" />
          <div className="overflow-hidden">
            <span className="font-bold text-lg text-vibrant-orange tracking-tight block">íntєrncσnᵖʰ</span>
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

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto overscroll-contain min-h-0" onClick={() => setSidebarOpen(false)}>
        {/* STUDENT NAV */}
        {role === 'student' && (
          <>
            <NavLink to="/dashboard/student" end className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span>Overview</span>
            </NavLink>
            <NavLink to="/dashboard/student/jobs" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">work</span>
              <span>Browse Jobs</span>
            </NavLink>
            <NavLink to="/dashboard/student/applications" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">send</span>
              <span>My Applications</span>
            </NavLink>
            <NavLink to="/dashboard/student/ojt" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">timelapse</span>
              <span>OJT Progress & DTR</span>
            </NavLink>
            <NavLink to="/dashboard/student/skills" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">psychology</span>
              <span>Skills & Matches</span>
            </NavLink>
            <NavLink to="/dashboard/student/portfolio" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">folder_special</span>
              <span>Career Portfolio</span>
            </NavLink>
            <NavLink to="/dashboard/student/complaints" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">gavel</span>
              <span>Student Grievance & Complaint Filing</span>
            </NavLink>
            <NavLink to="/dashboard/student/profile" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">person</span>
              <span>My Profile</span>
            </NavLink>
          </>
        )}

        {/* WORKPLACE MENTOR NAV */}
        {(role === 'workplace_mentor' || role === 'mentor') && (
          <>
            <NavLink to="/dashboard/organization" end className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span>Overview</span>
            </NavLink>
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
              <span>Incident Reports & Student Grievances</span>
            </NavLink>
          </>
        )}

        {/* HIRING ORGANIZATION (HR MAIN ACCOUNT) NAV */}
        {(role === 'hiring_organization' || role === 'hr_staff') && (
          <>
            <NavLink to="/dashboard/organization" end className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span>Overview</span>
            </NavLink>
            <NavLink to="/dashboard/organization/jobs" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">post_add</span>
              <span>Job Postings</span>
            </NavLink>
            <NavLink to="/dashboard/organization/applicants" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">group</span>
              <span>Applicants</span>
            </NavLink>
            <NavLink to="/dashboard/organization/interviews" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">event_available</span>
              <span>Interviews</span>
            </NavLink>
            <NavLink to="/dashboard/organization/offers" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
              <span>Offers & Deployments</span>
            </NavLink>
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
              <span>Incident Reports & Student Grievances</span>
            </NavLink>
            <NavLink to="/dashboard/organization/mentors" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">supervisor_account</span>
              <span>Workplace Mentors</span>
            </NavLink>
          </>
        )}

        {/* INSTITUTION DIRECTOR NAV (Full Management) */}
        {role === 'institution' && (
          <>
            <NavLink to="/dashboard/institution" end className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span>Overview</span>
            </NavLink>
            <NavLink to="/dashboard/institution/students" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
              <span>Student Verification</span>
            </NavLink>
            <NavLink to="/dashboard/institution/staff" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">badge</span>
              <span>Staff & Coordinators</span>
            </NavLink>
            <NavLink to="/dashboard/institution/programs" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
              <span>Degree Programs</span>
            </NavLink>
            <NavLink to="/dashboard/institution/requirements" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">assignment_late</span>
              <span>Clearance Requirements</span>
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

        {/* INSTITUTION STAFF NAV (Scoped by Position) */}
        {role === 'institution_staff' && (
          <>
            <NavLink to="/dashboard/institution" end className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span>Overview</span>
            </NavLink>

            {/* OJT Supervisor */}
            {(position === 'ojt_supervisor' || position === 'ojt_coordinator' || !position) && (
              <>
                <NavLink to="/dashboard/institution/students" className={navItemClass}>
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  <span>Student OJT Verification</span>
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
              <>
                <NavLink to="/dashboard/institution/monitoring" className={navItemClass}>
                  <span className="material-symbols-outlined text-[20px]">gavel</span>
                  <span>Grievance Oversight</span>
                </NavLink>
              </>
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
                  <span>Department Faculty & Staff</span>
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
          </>
        )}

        {/* ADMIN NAV */}
        {role === 'system_admin' && (
          <>
            <NavLink to="/dashboard/admin" end className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              <span>System Overview</span>
            </NavLink>
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
            <NavLink to="/dashboard/admin/users" className={navItemClass}>
              <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
              <span>User Accounts</span>
            </NavLink>
          </>
        )}

      </nav>

      {/* User Footer / Logout */}
      <div className="p-4 border-t border-outline-variant bg-surface-container-low shrink-0 mt-auto">
        <div
          onClick={() => {
            setSidebarOpen(false);
            navigate('/dashboard/settings');
          }}
          className="flex items-center gap-3 mb-3 p-1.5 -m-1.5 rounded-xl hover:bg-surface-container transition-colors cursor-pointer group"
          title="Manage Profile & Settings"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden bg-vibrant-orange text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
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
            <p className="text-[11px] text-on-surface-variant truncate">{user.email}</p>
          </div>
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-vibrant-orange group-hover:rotate-45 transition-all">
            settings
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-surface-container rounded-lg text-xs font-bold text-error hover:bg-error-container transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
