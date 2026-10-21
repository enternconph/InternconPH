import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from './DashboardLayout';
import { getPrimaryNavItems } from './navConfig';

export default function MobileBottomBar() {
  const { user } = useAuth();
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();

  if (!user) return null;

  const role = user.role_name || user.role || '';
  const position = user.position || user.staff_position || '';
  const items = getPrimaryNavItems(role, position, 4);

  return (
    <nav
      id="mobile-bottom-nav-bar"
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-md flex items-center justify-around gap-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-xl border border-outline-variant/60 shadow-float px-2 py-1.5">
        {items.map((item) => {
          const active = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-3 rounded-full transition-all active:scale-95 ${
                active
                  ? 'bg-vibrant-orange text-accent-ink font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] ${active ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold leading-tight mt-0.5">
                {item.short || item.label}
              </span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle navigation drawer"
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-3 rounded-full transition-all active:scale-95 cursor-pointer ${
            sidebarOpen ? 'bg-brand-mint text-accent-ink font-bold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">{sidebarOpen ? 'close' : 'grid_view'}</span>
          <span className="text-[10px] font-semibold leading-tight mt-0.5">{sidebarOpen ? 'Close' : 'More'}</span>
        </button>
      </div>
    </nav>
  );
}
