import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from './DashboardLayout';

export default function MobileBottomBar() {
  const { user, logout, getDashboardUrl } = useAuth();
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const role = user.role_name || user.role || '';
  const dashboardUrl = getDashboardUrl(role);
  const isDashboardActive = location.pathname === dashboardUrl;
  const isSettingsActive = location.pathname.includes('/settings');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav
      id="mobile-bottom-nav-bar"
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface-container-lowest/95 backdrop-blur-lg border-t border-outline-variant px-1 sm:px-2 py-1 pb-[max(0.6rem,calc(env(safe-area-inset-bottom)+0.25rem))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center justify-around transition-colors"
    >
      {/* 1. Menu Toggle Button */}
      <button
        type="button"
        onClick={toggleSidebar}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] py-1 px-1.5 sm:px-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
          sidebarOpen
            ? 'text-vibrant-orange font-bold bg-orange-tint'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
        aria-label="Toggle navigation drawer"
      >
        <span className="material-symbols-outlined text-[22px]">
          {sidebarOpen ? 'close' : 'menu'}
        </span>
        <span className="text-[10px] font-semibold tracking-tight mt-0.5">
          {sidebarOpen ? 'Close' : 'Menu'}
        </span>
      </button>

      {/* 2. Dashboard Home Button */}
      <button
        type="button"
        onClick={() => navigate(dashboardUrl)}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] py-1 px-1.5 sm:px-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
          isDashboardActive
            ? 'text-vibrant-orange font-bold bg-orange-tint'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
        aria-label="Go to Dashboard"
      >
        <span className="material-symbols-outlined text-[22px]">dashboard</span>
        <span className="text-[10px] font-semibold tracking-tight mt-0.5">Dashboard</span>
      </button>

      {/* 3. Settings Button */}
      <button
        type="button"
        onClick={() => navigate('/dashboard/settings')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] py-1 px-1.5 sm:px-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
          isSettingsActive
            ? 'text-vibrant-orange font-bold bg-orange-tint'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
        aria-label="Account Settings"
      >
        <span className="material-symbols-outlined text-[22px]">settings</span>
        <span className="text-[10px] font-semibold tracking-tight mt-0.5">Settings</span>
      </button>

      {/* 4. Sign Out Button */}
      <button
        type="button"
        id="mobile-bottom-signout-btn"
        onClick={handleLogout}
        className="flex flex-col items-center justify-center min-w-[48px] min-h-[44px] py-1 px-1.5 sm:px-3 rounded-xl text-error hover:bg-error-container hover:text-error transition-all active:scale-95 cursor-pointer"
        aria-label="Sign Out"
        title="Sign Out of Account"
      >
        <span className="material-symbols-outlined text-[22px]">logout</span>
        <span className="text-[10px] font-bold tracking-tight mt-0.5">Sign Out</span>
      </button>
    </nav>
  );
}
