import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from './DashboardLayout';
import { resolveFileUrl } from '../../utils/fileHelper';

// Reusable Navigation Item with Icon, Badge, Tooltip & Active State
function SidebarNavItem({
  to,
  end = false,
  icon,
  label,
  badge,
  badgeColor,
  isCollapsed,
  onClick,
  onHover,
  onLeave
}) {
  const handleMouseEnter = (e) => {
    if (!isCollapsed || !onHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onHover({
      label,
      badge,
      top: rect.top + rect.height / 2
    });
  };

  return (
    <div className="relative flex items-center justify-center w-full">
      <NavLink
        to={to}
        end={end}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onLeave}
        className={({ isActive }) =>
          `relative flex items-center transition-all duration-200 ${
            isCollapsed
              ? `w-11 h-11 justify-center rounded-xl ${
                  isActive
                    ? 'bg-vibrant-orange text-white shadow-md shadow-vibrant-orange/30 ring-1 ring-vibrant-orange/50'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`
              : `w-full gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm ${
                  isActive
                    ? 'bg-vibrant-orange text-white font-bold shadow-sm ring-1 ring-vibrant-orange/50'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`
          }`
        }
      >
        {({ isActive }) => (
          <>
            {/* Icon */}
            <span
              className={`material-symbols-outlined shrink-0 transition-transform duration-150 ${
                isCollapsed ? 'text-[22px]' : 'text-[20px]'
              }`}
            >
              {icon}
            </span>

            {/* Label (expanded mode) */}
            {!isCollapsed && (
              <span className="truncate flex-1 min-w-0 text-left">
                {label}
              </span>
            )}

            {/* Full badge in expanded mode */}
            {!isCollapsed && badge && (
              <span
                className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 capitalize ${
                  badgeColor || 'bg-vibrant-orange/20 text-vibrant-orange dark:bg-vibrant-orange/30 dark:text-orange-300'
                }`}
              >
                {badge}
              </span>
            )}

            {/* Minimal dot badge indicator in collapsed mode */}
            {isCollapsed && badge && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vibrant-orange opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-vibrant-orange ring-2 ring-surface-container-lowest"></span>
              </span>
            )}
          </>
        )}
      </NavLink>
    </div>
  );
}

// Section Header / Divider
function SidebarSectionTitle({ title, isCollapsed }) {
  if (isCollapsed) {
    return <div className="my-2 mx-auto w-6 h-[1px] bg-outline-variant/60" />;
  }
  return (
    <span className="px-3.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 block transition-opacity duration-200">
      {title}
    </span>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapse
  } = useSidebar();
  const navigate = useNavigate();

  // Tooltip state for collapsed mode
  const [hoveredItem, setHoveredItem] = useState(null);

  if (!user) return null;

  const role = user.role_name || user.role || '';
  const position = user.position || (user.details && user.details.position) || '';

  const handleLogout = async () => {
    setSidebarOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

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

  const navItemProps = {
    isCollapsed: sidebarCollapsed,
    onClick: () => setSidebarOpen(false),
    onHover: setHoveredItem,
    onLeave: () => setHoveredItem(null)
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-surface-container-lowest border-r border-outline-variant flex flex-col h-screen h-[100dvh] max-h-screen max-h-[100dvh] transition-[width,transform] duration-300 ease-in-out lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:shrink-0 lg:h-full lg:shadow-none ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } ${
          sidebarCollapsed ? 'w-[min(18rem,calc(100vw-3rem))] sm:w-64 lg:w-[76px]' : 'w-[min(18rem,calc(100vw-3rem))] sm:w-64 lg:w-64'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`p-3.5 flex items-center shrink-0 bg-surface-container-lowest transition-all duration-300 ${
            sidebarCollapsed ? 'lg:justify-center justify-between gap-3' : 'justify-between gap-3'
          }`}
        >
          {/* Logo & Text */}
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <img
              src="/logo.png"
              alt="internconPH Logo"
              className="h-8 sm:h-9 w-auto object-contain shrink-0"
              loading="lazy"
              decoding="async"
            />
            <div className={`overflow-hidden transition-opacity duration-200 ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
              <span className="font-black text-lg text-vibrant-orange tracking-tight block">íntєrncσnᵖʰ</span>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider truncate block">
                {getPositionLabel()}
              </span>
            </div>
          </div>

          {/* Mobile Close Button */}
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
        <nav
          className={`flex-1 p-3 space-y-3 overflow-y-auto overscroll-contain min-h-0 ${
            sidebarCollapsed ? 'lg:px-2.5' : 'lg:p-3.5'
          }`}
        >
          {/* ================================================================= */}
          {/* STUDENT NAV                                                       */}
          {/* ================================================================= */}
          {role === 'student' && (
            <>
              <div className="space-y-1">
                <SidebarSectionTitle title="Main" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/student" end icon="dashboard" label="Dashboard" {...navItemProps} />
              </div>

              <div className="space-y-1">
                <SidebarSectionTitle title="Opportunities & OJT" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/student/jobs" icon="dynamic_feed" label="Browse Jobs & Feed" {...navItemProps} />
                <SidebarNavItem to="/dashboard/student/applications" icon="send" label="My Applications" {...navItemProps} />
                <SidebarNavItem to="/dashboard/student/ojt" icon="timelapse" label="OJT Progress & DTR" {...navItemProps} />
              </div>

              <div className="space-y-1">
                <SidebarSectionTitle title="Skills & Career" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/student/skills" icon="psychology" label="Skills & Matches" {...navItemProps} />
                <SidebarNavItem to="/dashboard/student/portfolio" icon="folder_special" label="Career Portfolio" {...navItemProps} />
              </div>

              <div className="space-y-1">
                <SidebarSectionTitle title="Account & Support" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/student/complaints" icon="gavel" label="Grievances & Reports" {...navItemProps} />
                <SidebarNavItem to="/dashboard/student/profile" icon="person" label="My Profile" {...navItemProps} />
              </div>
            </>
          )}

          {/* ================================================================= */}
          {/* WORKPLACE MENTOR NAV                                              */}
          {/* ================================================================= */}
          {(role === 'workplace_mentor' || role === 'mentor') && (
            <>
              <div className="space-y-1">
                <SidebarSectionTitle title="Overview" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/organization" end icon="dashboard" label="Mentor Dashboard" {...navItemProps} />
              </div>

              <div className="space-y-1">
                <SidebarSectionTitle title="Supervision" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/organization/ojt" icon="badge" label="Deployed Interns & DTR" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/evaluations" icon="rate_review" label="Student Evaluations" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/grievances" icon="report_problem" label="Grievance & Incident Reports" {...navItemProps} />
              </div>
            </>
          )}

          {/* ================================================================= */}
          {/* HIRING ORGANIZATION (HR ADMIN) NAV                                */}
          {/* ================================================================= */}
          {(role === 'hiring_organization' || role === 'hr_staff') && (
            <>
              <div className="space-y-1">
                <SidebarSectionTitle title="Overview" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/organization" end icon="dashboard" label="Employer Dashboard" {...navItemProps} />
              </div>

              <div className="space-y-1">
                <SidebarSectionTitle title="Recruitment Pipeline" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/organization/jobs" icon="post_add" label="Job Postings" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/applicants" icon="group" label="Applicants & Talent" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/interviews" icon="event_available" label="Interviews" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/offers" icon="assignment_turned_in" label="Offers & Deployments" {...navItemProps} />
              </div>

              <div className="space-y-1">
                <SidebarSectionTitle title="Interns & Mentorship" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/organization/ojt" icon="badge" label="Deployed Interns & DTR" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/evaluations" icon="rate_review" label="Evaluations" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/grievances" icon="report_problem" label="Grievance & Incidents" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/mentors" icon="supervisor_account" label="Workplace Mentors" {...navItemProps} />
              </div>
            </>
          )}

          {/* ================================================================= */}
          {/* INSTITUTION DIRECTOR NAV                                          */}
          {/* ================================================================= */}
          {role === 'institution' && (
            <>
              <div className="space-y-1">
                <SidebarSectionTitle title="Overview" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/institution" end icon="dashboard" label="Institution Overview" {...navItemProps} />
              </div>

              <div className="space-y-1">
                <SidebarSectionTitle title="Students & OJT" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/institution/students" icon="verified_user" label="Student Verification" {...navItemProps} />
                <SidebarNavItem to="/dashboard/institution/monitoring" icon="monitoring" label="OJT Monitoring & DTR" {...navItemProps} />
                <SidebarNavItem to="/dashboard/institution/ojt-offers" icon="work_outline" label="Dispatched OJT Offers" {...navItemProps} />
              </div>

              <div className="space-y-1">
                <SidebarSectionTitle title="Academic Operations" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/institution/staff" icon="badge" label="Faculty & Coordinators" {...navItemProps} />
                <SidebarNavItem to="/dashboard/institution/programs" icon="menu_book" label="Degree Programs" {...navItemProps} />
                <SidebarNavItem to="/dashboard/institution/requirements" icon="assignment_late" label="Clearance Requirements" {...navItemProps} />
              </div>
            </>
          )}

          {/* ================================================================= */}
          {/* INSTITUTION STAFF NAV                                             */}
          {/* ================================================================= */}
          {role === 'institution_staff' && (
            <>
              <div className="space-y-1">
                <SidebarSectionTitle title="Overview" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/institution" end icon="dashboard" label="Staff Overview" {...navItemProps} />
              </div>

              <div className="space-y-1">
                <SidebarSectionTitle title="Assigned Scope" isCollapsed={sidebarCollapsed} />
                {(position === 'ojt_supervisor' || position === 'ojt_coordinator' || !position) && (
                  <>
                    <SidebarNavItem to="/dashboard/institution/students" icon="verified_user" label="Student Verification" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/monitoring" icon="monitoring" label="OJT Monitoring & Logs" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/ojt-offers" icon="work_outline" label="OJT Offers" {...navItemProps} />
                  </>
                )}

                {position === 'registrar' && (
                  <>
                    <SidebarNavItem to="/dashboard/institution/students" icon="verified_user" label="Student Verification" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/requirements" icon="assignment_late" label="Clearance Requirements" {...navItemProps} />
                  </>
                )}

                {position === 'guidance_counselor' && (
                  <SidebarNavItem to="/dashboard/institution/monitoring" icon="gavel" label="Grievance Oversight" {...navItemProps} />
                )}

                {position === 'dean' && (
                  <>
                    <SidebarNavItem to="/dashboard/institution/students" icon="verified_user" label="Department Students" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/staff" icon="badge" label="Department Staff" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/programs" icon="menu_book" label="Department Programs" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/monitoring" icon="monitoring" label="OJT Monitoring" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/ojt-offers" icon="work_outline" label="OJT & Job Offers" {...navItemProps} />
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
                <SidebarSectionTitle title="System" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/admin" end icon="admin_panel_settings" label="System Overview" {...navItemProps} />
              </div>

              <div className="space-y-1">
                <SidebarSectionTitle title="Platform Entities" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/admin/institutions" icon="school" label="Institutions" {...navItemProps} />
                <SidebarNavItem to="/dashboard/admin/organizations" icon="business" label="Organizations" {...navItemProps} />
                <SidebarNavItem to="/dashboard/admin/jobs" icon="work" label="Job Moderation" {...navItemProps} />
                <SidebarNavItem to="/dashboard/admin/users" icon="manage_accounts" label="User Accounts" {...navItemProps} />
              </div>

              <div className="space-y-1">
                <SidebarSectionTitle title="Governance & Intelligence" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/admin/complaints" icon="gavel" label="Grievance Oversight" {...navItemProps} />
                <SidebarNavItem to="/dashboard/admin/analytics" icon="trending_up" label="Skill Analytics" {...navItemProps} />
                <SidebarNavItem to="/dashboard/admin/audit-logs" icon="receipt_long" label="Audit Trail" {...navItemProps} />
              </div>
            </>
          )}

          {/* Mobile Quick Sign Out */}
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

        {/* User Profile Footer */}
        <div className="p-3 pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] border-t border-outline-variant bg-surface-container-low shrink-0 mt-auto">
          {/* User Profile / Settings Row */}
          <div
            onClick={() => {
              setSidebarOpen(false);
              navigate('/dashboard/settings');
            }}
            onMouseEnter={(e) => {
              if (sidebarCollapsed) {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredItem({
                  label: 'Settings & Profile',
                  top: rect.top + rect.height / 2
                });
              }
            }}
            onMouseLeave={() => setHoveredItem(null)}
            className={`flex items-center rounded-2xl hover:bg-surface-container transition-colors cursor-pointer group ${
              sidebarCollapsed ? 'lg:justify-center lg:p-1.5 p-2 gap-3 mb-2' : 'gap-3 mb-2.5 p-2'
            }`}
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

            {/* Profile Info (hidden on collapsed desktop) */}
            <div className={`overflow-hidden flex-1 min-w-0 ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
              <p className="font-bold text-xs text-on-surface truncate group-hover:text-vibrant-orange transition-colors">
                {user.display_name || user.full_name || user.email}
              </p>
              <p className="text-[10px] text-on-surface-variant truncate">{user.email}</p>
            </div>

            <span className={`material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-vibrant-orange group-hover:rotate-45 transition-all ${
              sidebarCollapsed ? 'lg:hidden' : 'block'
            }`}>
              settings
            </span>
          </div>

          {/* Sign Out Button */}
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={handleLogout}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredItem({
                  label: 'Sign Out',
                  top: rect.top + rect.height / 2
                });
              }}
              onMouseLeave={() => setHoveredItem(null)}
              className="hidden lg:flex w-10 h-10 mx-auto items-center justify-center bg-surface-container hover:bg-error-container hover:text-error rounded-xl text-on-surface-variant transition-colors cursor-pointer"
              aria-label="Sign Out"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-surface-container hover:bg-error-container hover:text-error rounded-xl text-xs font-bold text-on-surface-variant transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>
          )}

          {/* Mobile Full Sign Out Button (always visible on mobile drawer) */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-surface-container hover:bg-error-container hover:text-error rounded-xl text-xs font-bold text-on-surface-variant transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Floating Hover Tooltip in Collapsed Desktop Mode */}
      {sidebarCollapsed && hoveredItem && (
        <div
          role="tooltip"
          className="hidden lg:flex fixed left-[86px] z-[9999] -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-xs font-semibold shadow-2xl border border-white/10 items-center gap-2 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95 select-none"
          style={{ top: `${hoveredItem.top}px` }}
        >
          {/* Tooltip Left Arrow Pointer */}
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-[6px] border-r-slate-900/95 dark:border-r-slate-800/95" />
          <span className="relative z-10">{hoveredItem.label}</span>
          {hoveredItem.badge && (
            <span className="relative z-10 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-vibrant-orange text-white shadow-xs">
              {hoveredItem.badge}
            </span>
          )}
        </div>
      )}
    </>
  );
}
