import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from './DashboardLayout';

export default function MobileBottomBar() {
  const { user, getDashboardUrl } = useAuth();
  const { toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const role = user.role_name || user.role || '';
  const dashboardUrl = getDashboardUrl(role);
  
  // Define role-specific native tabs
  const getTabs = () => {
    switch (role) {
      case 'student':
        return [
          { label: 'Home', icon: 'home', path: dashboardUrl },
          { label: 'Jobs', icon: 'work', path: '/dashboard/student/jobs' },
          { label: 'OJT', icon: 'timelapse', path: '/dashboard/student/ojt' },
          { label: 'Profile', icon: 'person', path: '/dashboard/student/profile' }
        ];
      case 'hiring_organization':
      case 'hr_staff':
        return [
          { label: 'Home', icon: 'home', path: dashboardUrl },
          { label: 'Applicants', icon: 'group', path: '/dashboard/organization/applicants' },
          { label: 'Jobs', icon: 'post_add', path: '/dashboard/organization/jobs' },
          { label: 'Interns', icon: 'badge', path: '/dashboard/organization/ojt' }
        ];
      case 'workplace_mentor':
      case 'mentor':
        return [
          { label: 'Home', icon: 'home', path: dashboardUrl },
          { label: 'Interns', icon: 'badge', path: '/dashboard/organization/ojt' },
          { label: 'Ratings', icon: 'rate_review', path: '/dashboard/organization/evaluations' },
          { label: 'Profile', icon: 'person', path: '/dashboard/settings' }
        ];
      case 'institution':
      case 'institution_staff':
        return [
          { label: 'Home', icon: 'home', path: dashboardUrl },
          { label: 'Students', icon: 'verified_user', path: '/dashboard/institution/students' },
          { label: 'Monitoring', icon: 'monitoring', path: '/dashboard/institution/monitoring' },
          { label: 'Menu', icon: 'menu', path: 'MENU_TOGGLE' }
        ];
      case 'system_admin':
        return [
          { label: 'Home', icon: 'home', path: dashboardUrl },
          { label: 'Users', icon: 'manage_accounts', path: '/dashboard/admin/users' },
          { label: 'Institutions', icon: 'school', path: '/dashboard/admin/institutions' },
          { label: 'Menu', icon: 'menu', path: 'MENU_TOGGLE' }
        ];
      default:
        return [
          { label: 'Home', icon: 'home', path: dashboardUrl },
          { label: 'Settings', icon: 'settings', path: '/dashboard/settings' }
        ];
    }
  };

  const tabs = getTabs();

  return (
    <nav
      id="mobile-bottom-nav-bar"
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface-container-lowest/95 backdrop-blur-lg border-t border-outline-variant px-2 py-1 pb-[max(0.8rem,calc(env(safe-area-inset-bottom)+0.25rem))] shadow-[0_-8px_20px_rgba(0,0,0,0.04)] flex items-center justify-around transition-colors"
    >
      {tabs.map((tab, index) => {
        const isActive = location.pathname === tab.path || (tab.path !== 'MENU_TOGGLE' && tab.path !== dashboardUrl && location.pathname.startsWith(tab.path));
        
        return (
          <button
            key={index}
            type="button"
            onClick={() => {
              if (tab.path === 'MENU_TOGGLE') {
                toggleSidebar();
              } else {
                navigate(tab.path);
              }
            }}
            className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] py-1.5 px-2 rounded-2xl transition-all active:scale-95 cursor-pointer ${
              isActive
                ? 'text-vibrant-orange'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            aria-label={tab.label}
          >
            <div className={`flex items-center justify-center px-4 py-1 rounded-full mb-1 transition-colors ${isActive ? 'bg-orange-tint/50' : 'bg-transparent'}`}>
              <span className={`material-symbols-outlined text-[24px] ${isActive ? 'font-fill' : ''}`}>
                {tab.icon}
              </span>
            </div>
            <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
