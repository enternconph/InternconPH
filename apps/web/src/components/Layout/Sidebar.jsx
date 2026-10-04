import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from './DashboardLayout';
import { resolveFileUrl } from '../../utils/fileHelper';
import {
  LayoutDashboard,
  Rss,
  Send,
  Clock,
  BrainCircuit,
  FolderOpen,
  Scale,
  User,
  Users,
  Briefcase,
  IdCard,
  MessageSquare,
  AlertTriangle,
  FilePlus,
  CalendarCheck,
  CheckSquare,
  UserPlus,
  GraduationCap,
  UserCheck,
  Activity,
  BookOpen,
  ClipboardX,
  Building2,
  UserCog,
  ShieldAlert,
  TrendingUp,
  Receipt,
  Settings,
  LogOut,
  X
} from 'lucide-react';

// Reusable Navigation Item with Icon, Badge, Tooltip & Active State
function SidebarNavItem({
  to,
  end = false,
  icon: Icon,
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
          `relative flex items-center transition-all ${
            isCollapsed
              ? `w-10 h-10 justify-center rounded-md ${
                  isActive
                    ? 'bg-vibrant-orange text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-surface-container hover:text-foreground'
                }`
              : `w-full gap-3 px-3 py-2 rounded-md font-medium text-[13px] sm:text-sm ${
                  isActive
                    ? 'bg-vibrant-orange/10 text-vibrant-orange font-semibold'
                    : 'text-muted-foreground hover:bg-surface-container hover:text-foreground'
                }`
          }`
        }
      >
        {({ isActive }) => (
          <>
            {/* Icon */}
            <Icon 
              className={`shrink-0 transition-transform ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} 
              strokeWidth={isActive ? 2.5 : 2} 
            />

            {/* Label (expanded mode) */}
            {!isCollapsed && (
              <span className="truncate flex-1 min-w-0 text-left">
                {label}
              </span>
            )}

            {/* Full badge in expanded mode */}
            {!isCollapsed && badge && (
              <span
                className={`ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 capitalize ${
                  badgeColor || 'bg-vibrant-orange/20 text-vibrant-orange dark:bg-vibrant-orange/30 dark:text-orange-300'
                }`}
              >
                {badge}
              </span>
            )}

            {/* Minimal dot badge indicator in collapsed mode */}
            {isCollapsed && badge && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vibrant-orange opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-vibrant-orange ring-2 ring-background"></span>
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
    return <div className="my-3 mx-auto w-4 h-[1px] bg-border" />;
  }
  return (
    <span className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 block transition-opacity">
      {title}
    </span>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed
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
        className={`fixed inset-y-0 left-0 z-50 bg-background border-r border-border flex flex-col h-screen h-[100dvh] max-h-screen max-h-[100dvh] pt-[max(2.25rem,calc(env(safe-area-inset-top)+0.5rem))] lg:pt-0 transition-[width,transform] ease-in-out lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:shrink-0 lg:h-full lg:shadow-none ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } ${
          sidebarCollapsed ? 'w-[min(18rem,calc(100vw-3rem))] sm:w-64 lg:w-[72px]' : 'w-[min(18rem,calc(100vw-3rem))] sm:w-64 lg:w-64'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`p-4 flex items-center shrink-0 bg-background transition-all border-b border-border/40 ${
            sidebarCollapsed ? 'lg:justify-center justify-between gap-3' : 'justify-between gap-3'
          }`}
        >
          {/* Logo & Text */}
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <img
              src="/logo.png"
              alt="internconPH Logo"
              className="h-8 w-auto object-contain shrink-0"
              loading="lazy"
              decoding="async"
            />
            <div className={`overflow-hidden transition-opacity ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
              <span className="font-bold text-base text-foreground tracking-tight block">internconPH</span>
              <span className="text-[10px] text-muted-foreground truncate block capitalize">
                {getPositionLabel()}
              </span>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:bg-surface-container hover:text-foreground transition-colors shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav
          className={`flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain min-h-0 ${
            sidebarCollapsed ? 'lg:px-2 lg:py-4' : 'lg:px-4 lg:py-6'
          }`}
        >
          {/* ================================================================= */}
          {/* STUDENT NAV                                                       */}
          {/* ================================================================= */}
          {role === 'student' && (
            <>
              <div className="space-y-0.5">
                <SidebarSectionTitle title="Main" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/student" end icon={LayoutDashboard} label="Dashboard" {...navItemProps} />
              </div>

              <div className="space-y-0.5">
                <SidebarSectionTitle title="Opportunities & OJT" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/student/jobs" icon={Rss} label="Browse Jobs & Feed" {...navItemProps} />
                <SidebarNavItem to="/dashboard/student/applications" icon={Send} label="My Applications" {...navItemProps} />
                <SidebarNavItem to="/dashboard/student/ojt" icon={Clock} label="OJT Progress & DTR" {...navItemProps} />
              </div>

              <div className="space-y-0.5">
                <SidebarSectionTitle title="Skills & Career" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/student/skills" icon={BrainCircuit} label="Skills & Matches" {...navItemProps} />
                <SidebarNavItem to="/dashboard/student/portfolio" icon={FolderOpen} label="Career Portfolio" {...navItemProps} />
              </div>

              <div className="space-y-0.5">
                <SidebarSectionTitle title="Account & Support" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/student/complaints" icon={Scale} label="Grievances & Reports" {...navItemProps} />
                <SidebarNavItem to="/dashboard/student/profile" icon={User} label="My Profile" {...navItemProps} />
              </div>
            </>
          )}

          {/* ================================================================= */}
          {/* WORKPLACE MENTOR NAV                                              */}
          {/* ================================================================= */}
          {(role === 'workplace_mentor' || role === 'mentor') && (
            <>
              <div className="space-y-0.5">
                <SidebarSectionTitle title="Overview" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/organization" end icon={LayoutDashboard} label="Mentor Dashboard" {...navItemProps} />
              </div>

              <div className="space-y-0.5">
                <SidebarSectionTitle title="Supervision" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/organization/ojt" icon={IdCard} label="Deployed Interns & DTR" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/evaluations" icon={MessageSquare} label="Student Evaluations" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/grievances" icon={AlertTriangle} label="Grievance & Incidents" {...navItemProps} />
              </div>
            </>
          )}

          {/* ================================================================= */}
          {/* HIRING ORGANIZATION (HR ADMIN) NAV                                */}
          {/* ================================================================= */}
          {(role === 'hiring_organization' || role === 'hr_staff') && (
            <>
              <div className="space-y-0.5">
                <SidebarSectionTitle title="Overview" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/organization" end icon={LayoutDashboard} label="Employer Dashboard" {...navItemProps} />
              </div>

              <div className="space-y-0.5">
                <SidebarSectionTitle title="Recruitment Pipeline" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/organization/jobs" icon={FilePlus} label="Job Postings" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/applicants" icon={Users} label="Applicants & Talent" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/interviews" icon={CalendarCheck} label="Interviews" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/offers" icon={CheckSquare} label="Offers & Deployments" {...navItemProps} />
              </div>

              <div className="space-y-0.5">
                <SidebarSectionTitle title="Interns & Mentorship" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/organization/ojt" icon={IdCard} label="Deployed Interns & DTR" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/evaluations" icon={MessageSquare} label="Evaluations" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/grievances" icon={AlertTriangle} label="Grievance & Incidents" {...navItemProps} />
                <SidebarNavItem to="/dashboard/organization/mentors" icon={UserPlus} label="Workplace Mentors" {...navItemProps} />
              </div>
            </>
          )}

          {/* ================================================================= */}
          {/* INSTITUTION DIRECTOR NAV                                          */}
          {/* ================================================================= */}
          {role === 'institution' && (
            <>
              <div className="space-y-0.5">
                <SidebarSectionTitle title="Overview" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/institution" end icon={LayoutDashboard} label="Institution Overview" {...navItemProps} />
              </div>

              <div className="space-y-0.5">
                <SidebarSectionTitle title="Students & OJT" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/institution/students" icon={UserCheck} label="Student Verification" {...navItemProps} />
                <SidebarNavItem to="/dashboard/institution/monitoring" icon={Activity} label="OJT Monitoring & DTR" {...navItemProps} />
                <SidebarNavItem to="/dashboard/institution/ojt-offers" icon={Briefcase} label="Dispatched OJT Offers" {...navItemProps} />
              </div>

              <div className="space-y-0.5">
                <SidebarSectionTitle title="Academic Operations" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/institution/staff" icon={IdCard} label="Faculty & Coordinators" {...navItemProps} />
                <SidebarNavItem to="/dashboard/institution/programs" icon={BookOpen} label="Degree Programs" {...navItemProps} />
                <SidebarNavItem to="/dashboard/institution/requirements" icon={ClipboardX} label="Clearance Requirements" {...navItemProps} />
              </div>
            </>
          )}

          {/* ================================================================= */}
          {/* INSTITUTION STAFF NAV                                             */}
          {/* ================================================================= */}
          {role === 'institution_staff' && (
            <>
              <div className="space-y-0.5">
                <SidebarSectionTitle title="Overview" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/institution" end icon={LayoutDashboard} label="Staff Overview" {...navItemProps} />
              </div>

              <div className="space-y-0.5">
                <SidebarSectionTitle title="Assigned Scope" isCollapsed={sidebarCollapsed} />
                {(position === 'ojt_supervisor' || position === 'ojt_coordinator' || !position) && (
                  <>
                    <SidebarNavItem to="/dashboard/institution/students" icon={UserCheck} label="Student Verification" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/monitoring" icon={Activity} label="OJT Monitoring & Logs" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/ojt-offers" icon={Briefcase} label="OJT Offers" {...navItemProps} />
                  </>
                )}

                {position === 'registrar' && (
                  <>
                    <SidebarNavItem to="/dashboard/institution/students" icon={UserCheck} label="Student Verification" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/requirements" icon={ClipboardX} label="Clearance Requirements" {...navItemProps} />
                  </>
                )}

                {position === 'guidance_counselor' && (
                  <SidebarNavItem to="/dashboard/institution/monitoring" icon={Scale} label="Grievance Oversight" {...navItemProps} />
                )}

                {position === 'dean' && (
                  <>
                    <SidebarNavItem to="/dashboard/institution/students" icon={UserCheck} label="Department Students" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/staff" icon={IdCard} label="Department Staff" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/programs" icon={BookOpen} label="Department Programs" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/monitoring" icon={Activity} label="OJT Monitoring" {...navItemProps} />
                    <SidebarNavItem to="/dashboard/institution/ojt-offers" icon={Briefcase} label="OJT & Job Offers" {...navItemProps} />
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
              <div className="space-y-0.5">
                <SidebarSectionTitle title="System" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/admin" end icon={ShieldAlert} label="System Overview" {...navItemProps} />
              </div>

              <div className="space-y-0.5">
                <SidebarSectionTitle title="Platform Entities" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/admin/institutions" icon={GraduationCap} label="Institutions" {...navItemProps} />
                <SidebarNavItem to="/dashboard/admin/organizations" icon={Building2} label="Organizations" {...navItemProps} />
                <SidebarNavItem to="/dashboard/admin/jobs" icon={Briefcase} label="Job Moderation" {...navItemProps} />
                <SidebarNavItem to="/dashboard/admin/users" icon={UsersCog} label="User Accounts" {...navItemProps} />
              </div>

              <div className="space-y-0.5">
                <SidebarSectionTitle title="Governance & Intelligence" isCollapsed={sidebarCollapsed} />
                <SidebarNavItem to="/dashboard/admin/complaints" icon={Scale} label="Grievance Oversight" {...navItemProps} />
                <SidebarNavItem to="/dashboard/admin/analytics" icon={TrendingUp} label="Skill Analytics" {...navItemProps} />
                <SidebarNavItem to="/dashboard/admin/audit-logs" icon={Receipt} label="Audit Trail" {...navItemProps} />
              </div>
            </>
          )}

          {/* Mobile Quick Sign Out */}
          <div className="pt-3 mt-3 border-t border-border lg:hidden">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-[13px] sm:text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] border-t border-border bg-background shrink-0 mt-auto">
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
            className={`flex items-center rounded-md hover:bg-surface-container transition-colors cursor-pointer group ${
              sidebarCollapsed ? 'lg:justify-center lg:p-1.5 p-2 gap-3 mb-2' : 'gap-3 mb-2 p-2'
            }`}
            title="Manage Profile & Settings"
          >
            <div className="w-8 h-8 rounded-md overflow-hidden bg-vibrant-orange text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
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
              <p className="font-semibold text-[13px] text-foreground truncate group-hover:text-vibrant-orange transition-colors">
                {user.display_name || user.full_name || user.email}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>

            <Settings className={`w-4 h-4 text-muted-foreground group-hover:text-vibrant-orange transition-all ${
              sidebarCollapsed ? 'lg:hidden' : 'block'
            }`} />
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
              className="hidden lg:flex w-10 h-10 mx-auto items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors cursor-pointer"
              aria-label="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="hidden lg:flex w-full items-center justify-center gap-2 py-2 px-3 bg-surface-container hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md text-[13px] font-semibold transition-colors cursor-pointer border border-border"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Floating Hover Tooltip in Collapsed Desktop Mode */}
      {sidebarCollapsed && hoveredItem && (
        <div
          role="tooltip"
          className="hidden lg:flex fixed left-[80px] z-[9999] -translate-y-1/2 px-3 py-1.5 rounded-md bg-popover text-popover-foreground text-xs font-medium shadow-md border border-border items-center gap-2 pointer-events-none transition-all select-none"
          style={{ top: `${hoveredItem.top}px` }}
        >
          {/* Tooltip Left Arrow Pointer */}
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-[6px] border-r-border" />
          <span className="relative z-10">{hoveredItem.label}</span>
          {hoveredItem.badge && (
            <span className="relative z-10 px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-vibrant-orange text-white shadow-xs">
              {hoveredItem.badge}
            </span>
          )}
        </div>
      )}
    </>
  );
}
