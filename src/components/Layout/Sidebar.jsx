import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from './DashboardLayout';
import { resolveFileUrl } from '../../utils/fileHelper';
import { getNavSections, getRoleLabel } from './navConfig';

/** Tracks a CSS media query (used so the collapsed "rail" only applies on desktop, never in the mobile drawer). */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

// Navigation item: amber pill when expanded, circular icon button in the collapsed rail.
function SidebarNavItem({ to, end = false, icon, label, badge, isCollapsed, onClick, onHover, onLeave }) {
  const handleMouseEnter = (e) => {
    if (!isCollapsed || !onHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onHover({ label, badge, top: rect.top + rect.height / 2 });
  };

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onLeave}
      aria-label={label}
      className={({ isActive }) => {
        const base = 'relative flex items-center transition-all duration-200 outline-none';
        const shape = isCollapsed
          ? 'w-11 h-11 mx-auto justify-center rounded-full'
          : 'w-full gap-3 px-3.5 py-2.5 rounded-full text-[13px]';
        const state = isActive
          ? 'bg-vibrant-orange text-accent-ink font-bold shadow-md'
          : 'text-on-surface-variant font-semibold hover:bg-brand-mint/40 hover:text-on-surface dark:hover:bg-brand-teal/10';
        return `${base} ${shape} ${state}`;
      }}
    >
      <span className={`material-symbols-outlined shrink-0 ${isCollapsed ? 'text-[22px]' : 'text-[20px]'}`}>{icon}</span>

      {!isCollapsed && <span className="truncate flex-1 min-w-0 text-left">{label}</span>}

      {!isCollapsed && badge && (
        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-brand-mint text-accent-ink">
          {badge}
        </span>
      )}

      {isCollapsed && badge && (
        <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vibrant-orange opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-vibrant-orange ring-2 ring-surface-container-lowest" />
        </span>
      )}
    </NavLink>
  );
}

function SidebarSectionTitle({ title, isCollapsed }) {
  if (isCollapsed) {
    return <div className="my-2 mx-auto w-6 h-px bg-outline-variant" />;
  }
  return (
    <span className="px-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant/70 block">
      {title}
    </span>
  );
}

export default function Sidebar() {
  const { user, logout, getLoginUrl } = useAuth();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleSidebarCollapse } = useSidebar();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [hoveredItem, setHoveredItem] = useState(null);

  if (!user) return null;

  const role = user.role_name || user.role || '';
  const position = user.position || (user.details && user.details.position) || '';
  const collapsed = sidebarCollapsed && isDesktop;
  const sections = getNavSections(role, position);

  const handleLogout = async () => {
    const targetLogin = getLoginUrl ? getLoginUrl(role) : '/login/student';
    setSidebarOpen(false);
    await logout();
    navigate(targetLogin, { replace: true });
  };

  const navItemProps = {
    isCollapsed: collapsed,
    onClick: () => setSidebarOpen(false),
    onHover: setHoveredItem,
    onLeave: () => setHoveredItem(null),
  };

  const initial = user.full_name ? user.full_name.charAt(0).toUpperCase() : (user.email || '?').charAt(0).toUpperCase();

  return (
    <>
      <aside
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col h-[100dvh] bg-surface-container-lowest border border-outline-variant shadow-soft
          rounded-r-[2rem] transition-[width,transform] duration-300 ease-in-out
          lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:shrink-0 lg:h-full lg:rounded-[2rem]
          ${sidebarOpen ? 'translate-x-0 shadow-overlay' : '-translate-x-full'}
          w-[min(19rem,calc(100vw-3rem))] ${collapsed ? 'lg:w-[76px]' : 'lg:w-[17.5rem]'}`}
      >
        {/* Brand */}
        <div className={`flex items-center shrink-0 p-4 ${collapsed ? 'justify-center' : 'justify-between gap-3'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.png"
              alt="InternConPH logo"
              className="h-9 w-9 object-contain shrink-0"
              loading="lazy"
              decoding="async"
            />
            {!collapsed && (
              <div className="min-w-0 leading-none">
                <span className="font-headline font-bold text-lg tracking-tight text-on-surface block">InternconPH</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-text truncate block mt-1">
                  {getRoleLabel(role, position)}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden icon-btn !w-9 !h-9 shrink-0"
            aria-label="Close navigation"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto overscroll-contain min-h-0 space-y-4 pb-3 ${collapsed ? 'px-2.5' : 'px-3'}`}>
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <SidebarSectionTitle title={section.title} isCollapsed={collapsed} />
              {section.items.map((entry) => (
                <SidebarNavItem
                  key={entry.to + entry.label}
                  to={entry.to}
                  end={entry.end}
                  icon={entry.icon}
                  label={entry.label}
                  badge={entry.badge}
                  {...navItemProps}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Profile & sign out */}
        <div className="shrink-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-outline-variant space-y-2">
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              navigate('/dashboard/settings');
            }}
            onMouseEnter={(e) => {
              if (collapsed) {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredItem({ label: 'Settings & Profile', top: rect.top + rect.height / 2 });
              }
            }}
            onMouseLeave={() => setHoveredItem(null)}
            className={`group w-full flex items-center rounded-2xl hover:bg-surface-container transition-colors text-left ${
              collapsed ? 'justify-center p-1.5' : 'gap-3 p-2'
            }`}
            title="Manage profile & settings"
          >
            <span className="w-9 h-9 rounded-full overflow-hidden bg-brand-mint text-accent-ink border border-brand-teal flex items-center justify-center font-bold text-xs shrink-0">
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
                initial
              )}
            </span>

            {!collapsed && (
              <>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-xs text-on-surface truncate">
                    {user.display_name || user.full_name || user.email}
                  </span>
                  <span className="block text-[10px] text-on-surface-variant truncate">{user.email}</span>
                </span>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-accent-text group-hover:rotate-45 transition-all">
                  settings
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            onMouseEnter={(e) => {
              if (collapsed) {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredItem({ label: 'Sign Out', top: rect.top + rect.height / 2 });
              }
            }}
            onMouseLeave={() => setHoveredItem(null)}
            className={`flex items-center justify-center text-on-surface-variant bg-surface-container hover:bg-error-container hover:text-error transition-colors cursor-pointer font-bold text-xs ${
              collapsed ? 'w-11 h-11 mx-auto rounded-full' : 'w-full gap-2 py-2.5 px-3 rounded-full'
            }`}
            aria-label="Sign Out"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {!collapsed && <span>Sign Out</span>}
          </button>

          {/* Collapse control lives in the header; keep a handy hint for keyboard users */}
          {!collapsed && isDesktop && (
            <button
              type="button"
              onClick={toggleSidebarCollapse}
              className="w-full hidden lg:flex items-center justify-center gap-1.5 text-[10px] font-semibold text-on-surface-variant/70 hover:text-on-surface py-1"
              aria-label="Collapse sidebar"
            >
              <span className="material-symbols-outlined text-[14px]">keyboard_double_arrow_left</span>
              <span>Collapse &middot; Ctrl+B</span>
            </button>
          )}
        </div>
      </aside>

      {/* Floating tooltip for the collapsed rail */}
      {collapsed && hoveredItem && (
        <div
          role="tooltip"
          className="hidden lg:flex fixed left-[104px] z-[9999] -translate-y-1/2 items-center gap-2 px-3 py-1.5 rounded-full bg-[#132320] text-[#FBF8EF] text-xs font-semibold shadow-overlay pointer-events-none select-none animate-fade-in"
          style={{ top: `${hoveredItem.top}px` }}
        >
          <span>{hoveredItem.label}</span>
          {hoveredItem.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-vibrant-orange text-[#1C2E2B]">
              {hoveredItem.badge}
            </span>
          )}
        </div>
      )}
    </>
  );
}
