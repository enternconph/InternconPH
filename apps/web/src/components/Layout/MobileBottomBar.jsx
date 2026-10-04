import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from './DashboardLayout';
import { 
  Home, 
  Briefcase, 
  Clock, 
  User, 
  Users, 
  FilePlus, 
  IdCard, 
  MessageSquare, 
  UserCheck, 
  Activity, 
  Menu, 
  UsersCog, 
  GraduationCap, 
  Settings 
} from 'lucide-react';

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
          { label: 'Home', icon: Home, path: dashboardUrl },
          { label: 'Jobs', icon: Briefcase, path: '/dashboard/student/jobs' },
          { label: 'OJT', icon: Clock, path: '/dashboard/student/ojt' },
          { label: 'Profile', icon: User, path: '/dashboard/student/profile' }
        ];
      case 'hiring_organization':
      case 'hr_staff':
        return [
          { label: 'Home', icon: Home, path: dashboardUrl },
          { label: 'Applicants', icon: Users, path: '/dashboard/organization/applicants' },
          { label: 'Jobs', icon: FilePlus, path: '/dashboard/organization/jobs' },
          { label: 'Interns', icon: IdCard, path: '/dashboard/organization/ojt' }
        ];
      case 'workplace_mentor':
      case 'mentor':
        return [
          { label: 'Home', icon: Home, path: dashboardUrl },
          { label: 'Interns', icon: IdCard, path: '/dashboard/organization/ojt' },
          { label: 'Ratings', icon: MessageSquare, path: '/dashboard/organization/evaluations' },
          { label: 'Profile', icon: User, path: '/dashboard/settings' }
        ];
      case 'institution':
      case 'institution_staff':
        return [
          { label: 'Home', icon: Home, path: dashboardUrl },
          { label: 'Students', icon: UserCheck, path: '/dashboard/institution/students' },
          { label: 'Monitoring', icon: Activity, path: '/dashboard/institution/monitoring' },
          { label: 'Menu', icon: Menu, path: 'MENU_TOGGLE' }
        ];
      case 'system_admin':
        return [
          { label: 'Home', icon: Home, path: dashboardUrl },
          { label: 'Users', icon: UsersCog, path: '/dashboard/admin/users' },
          { label: 'Institutions', icon: GraduationCap, path: '/dashboard/admin/institutions' },
          { label: 'Menu', icon: Menu, path: 'MENU_TOGGLE' }
        ];
      default:
        return [
          { label: 'Home', icon: Home, path: dashboardUrl },
          { label: 'Settings', icon: Settings, path: '/dashboard/settings' }
        ];
    }
  };

  const tabs = getTabs();

  return (
    <nav
      id="mobile-bottom-nav-bar"
      aria-label="Mobile Navigation Bar"
      className="absolute bottom-0 left-0 right-0 z-40 lg:hidden bg-background border-t border-border px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.02)] flex items-center justify-around transition-colors h-[64px] sm:h-[72px]"
    >
      {tabs.map((tab, index) => {
        const isActive = location.pathname === tab.path || (tab.path !== 'MENU_TOGGLE' && tab.path !== dashboardUrl && location.pathname.startsWith(tab.path));
        const Icon = tab.icon;

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
            className={`flex flex-col items-center justify-center flex-1 h-full pt-1.5 transition-all active:scale-95 cursor-pointer ${
              isActive
                ? 'text-vibrant-orange'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label={tab.label}
          >
            <div className={`flex items-center justify-center px-4 py-1 rounded-md mb-0.5 transition-all duration-300 ease-in-out ${isActive ? 'bg-vibrant-orange/10 scale-110' : 'bg-transparent'}`}>
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] sm:text-[11px] tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}