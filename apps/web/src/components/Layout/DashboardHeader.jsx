import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket, useRealtimeRefresh } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from './DashboardLayout';
import { playNotificationChime } from '../../utils/audio';
import api from '../../api/client';
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  BellRing,
  Sun,
  Moon,
  Settings,
  LogOut,
  Video,
  FolderOpen,
  Star,
  Award,
  IdCard,
  UserCheck,
  Scale,
  AlertTriangle,
  Siren,
  BadgeCheck,
  Clock,
  ArrowRight,
  BellOff
} from 'lucide-react';

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const { toggleSidebar, sidebarCollapsed, toggleSidebarCollapse } = useSidebar();
  const { socket } = useSocket() || {};
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread'
  const panelRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=50');
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useRealtimeRefresh(fetchNotifications);

  // Listen to live socket notification events
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev.filter((n) => n.notification_id !== newNotif.notification_id)]);
      setUnreadCount((count) => count + 1);
      // Play short audible chime if user has sound enabled
      playNotificationChime();
    };

    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket]);

  // Click outside to close panel
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    if (panelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [panelOpen]);

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all read error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif) => {
    // If unread, mark as read on backend
    if (!notif.is_read) {
      try {
        await api.put(`/notifications/${notif.notification_id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.notification_id === notif.notification_id ? { ...n, is_read: 1 } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('Error marking read:', err);
      }
    }

    setPanelOpen(false);

    // Navigate to linked record if present
    if (notif.link) {
      let targetLink = notif.link;
      if (
        targetLink === '/dashboard/student/requirements' ||
        (notif.type === 'requirement' && targetLink === '/dashboard/student/ojt') ||
        (notif.title && notif.title.toLowerCase().includes('clearance') && targetLink === '/dashboard/student/ojt')
      ) {
        targetLink = '/dashboard/student/ojt?tab=requirements';
      }
      navigate(targetLink);
    }
  };

  const getNotificationIcon = (type, title = '') => {
    const lower = `${type || ''} ${title || ''}`.toLowerCase();
    if (lower.includes('interview') || lower.includes('meet')) return Video;
    if (lower.includes('portfolio')) return FolderOpen;
    if (lower.includes('evaluation') || lower.includes('rating') || lower.includes('score')) return Star;
    if (lower.includes('completed') || lower.includes('certificate')) return Award;
    if (lower.includes('staff') || lower.includes('faculty') || lower.includes('coordinator')) return IdCard;
    if (lower.includes('verification') || lower.includes('verify')) return UserCheck;
    if (lower.includes('grievance') || lower.includes('complaint')) return Scale;
    if (lower.includes('warning') || lower.includes('sanction') || lower.includes('suspend')) return AlertTriangle;
    if (lower.includes('accident') || lower.includes('incident')) return Siren;
    if (lower.includes('offer') || lower.includes('job') || lower.includes('hire') || lower.includes('requirement')) return BadgeCheck;
    if (lower.includes('dtr') || lower.includes('time') || lower.includes('clock')) return Clock;
    return Bell;
  };

  const parseDateSafe = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr) ? null : dateStr;
    if (typeof dateStr === 'number') return new Date(dateStr);

    const s = String(dateStr).trim();
    if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) {
      const parsed = new Date(s);
      if (!isNaN(parsed)) return parsed;
    }

    const isoString = s.replace(' ', 'T');
    const utcDate = new Date(isoString.endsWith('Z') ? isoString : `${isoString}Z`);
    const localDate = new Date(isoString);
    const now = Date.now();

    if (!isNaN(utcDate) && !isNaN(localDate)) {
      const diffUtc = Math.abs(now - utcDate.getTime());
      const diffLocal = Math.abs(now - localDate.getTime());
      // If local date is closer to current time than UTC date, use local
      if (diffLocal < diffUtc && diffLocal < 1000 * 60 * 60 * 2) {
        return localDate;
      }
      return utcDate;
    }

    return !isNaN(utcDate) ? utcDate : (!isNaN(localDate) ? localDate : new Date(s));
  };

  const formatTimestamp = (dateStr) => {
    const d = parseDateSafe(dateStr);
    if (!d || isNaN(d.getTime())) return '';
    const now = Date.now();
    const diffMs = Math.max(0, now - d.getTime());

    // Catch future clock drift or instant arrival
    if (diffMs < 60000) return 'Just now';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.is_read;
    return true;
  });

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/jobs')) return 'Jobs';
    if (path.includes('/applications')) return 'Applications';
    if (path.includes('/ojt')) return 'OJT & Progress';
    if (path.includes('/skills')) return 'Skills';
    if (path.includes('/portfolio')) return 'Portfolio';
    if (path.includes('/complaints') || path.includes('/grievances')) return 'Grievances';
    if (path.includes('/profile')) return 'My Profile';
    if (path.includes('/applicants')) return 'Applicants';
    if (path.includes('/interviews')) return 'Interviews';
    if (path.includes('/offers') || path.includes('/ojt-offers')) return 'Offers';
    if (path.includes('/evaluations')) return 'Evaluations';
    if (path.includes('/mentors')) return 'Mentors';
    if (path.includes('/students')) return 'Students';
    if (path.includes('/monitoring')) return 'Monitoring';
    if (path.includes('/programs')) return 'Programs';
    if (path.includes('/requirements')) return 'Requirements';
    if (path.includes('/staff')) return 'Staff';
    if (path.includes('/users')) return 'Users';
    if (path.includes('/institutions')) return 'Institutions';
    if (path.includes('/organizations')) return 'Organizations';
    if (path.includes('/analytics')) return 'Analytics';
    if (path.includes('/audit-logs')) return 'Audit Logs';
    return 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-30 bg-background text-foreground pt-[max(1rem,env(safe-area-inset-top))] lg:pt-0 transition-colors shrink-0 flex flex-col border-b border-border shadow-sm">
      <div className="flex items-center justify-between px-3 sm:px-6 h-[56px] sm:h-[60px]">
        {/* Left: Mobile Hamburger Toggle + Native Page Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <button
            type="button"
            id="mobile-sidebar-toggle-btn"
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:bg-surface-container hover:text-foreground transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            aria-label="Toggle navigation menu"
            title="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex p-1.5 rounded-md text-muted-foreground hover:bg-surface-container hover:text-foreground transition-colors shrink-0 items-center justify-center cursor-pointer"
            aria-label={sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            title={sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          {/* Dynamic App Bar Title */}
          <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right: Actions & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0" ref={panelRef}>
            {/* Notification Bell Button */}
            <button
              type="button"
              id="notification-bell-btn"
              onClick={() => setPanelOpen(!panelOpen)}
              className={`relative p-2 rounded-md transition-all ${
                panelOpen
                  ? 'bg-vibrant-orange/10 text-vibrant-orange'
                  : 'text-muted-foreground hover:bg-surface-container hover:text-foreground'
              }`}
              title="Notifications"
              aria-label="View notifications"
            >
              {unreadCount > 0 ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-vibrant-orange text-white text-[10px] font-bold flex items-center justify-center shadow-sm animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Theme Quick Toggle (Aura Radiant Dark / Classic Light) */}
            <button
              type="button"
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className={`p-2 rounded-md transition-all cursor-pointer active:scale-95 hidden sm:block ${
                isDark
                  ? 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                  : 'text-muted-foreground hover:bg-surface-container hover:text-foreground'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Aura Radiant Dark Mode'}
              aria-label="Toggle Theme Mode"
            >
              {isDark ? <Sun className="w-5 h-5 transition-transform" /> : <Moon className="w-5 h-5 transition-transform" />}
            </button>

            {/* Settings Navigation Shortcut */}
            <button
              type="button"
              id="settings-header-btn"
              onClick={() => navigate('/dashboard/settings')}
              className="p-2 rounded-md text-muted-foreground hover:bg-surface-container hover:text-foreground transition-all cursor-pointer"
              title="Account Settings & Preferences"
              aria-label="Account Settings"
            >
              <Settings className="w-5 h-5 hover:rotate-90 transition-transform" />
            </button>

            {/* Quick Sign Out Action (Hidden on Mobile) */}
            <button
              type="button"
              id="header-logout-btn"
              onClick={handleLogout}
              className="p-2 rounded-md text-destructive hover:bg-destructive/10 transition-all cursor-pointer hidden md:block"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>

          {/* Notifications Dropdown Panel */}
          {panelOpen && (
            <div className="absolute right-0 top-full mt-2 w-[min(calc(100vw-1.5rem),24rem)] max-w-[384px] bg-popover rounded-xl shadow-lg border border-border overflow-hidden z-50 max-h-[85vh] flex flex-col">
              {/* Panel Header */}
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-vibrant-orange" />
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-vibrant-orange/10 text-vibrant-orange text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={loading}
                    className="text-[11px] font-semibold text-vibrant-orange hover:text-deep-orange hover:underline transition-all disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center border-b border-border px-3 pt-2 bg-popover text-xs">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`pb-2 px-3 font-semibold transition-all border-b-2 ${
                    activeFilter === 'all'
                      ? 'border-vibrant-orange text-vibrant-orange'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveFilter('unread')}
                  className={`pb-2 px-3 font-semibold transition-all border-b-2 ${
                    activeFilter === 'unread'
                      ? 'border-vibrant-orange text-vibrant-orange'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notification Items List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground/40 mb-3">
                      <BellOff className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">No notifications</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {activeFilter === 'unread'
                        ? "You've read all your notifications!"
                        : 'Updates regarding grievances, complaints, and alerts will appear here.'}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => {
                    const NotifIcon = getNotificationIcon(notif.type || notif.related_type, notif.title);
                    const isUnread = !notif.is_read;

                    return (
                      <div
                        key={notif.notification_id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                          isUnread
                            ? 'bg-vibrant-orange/5 hover:bg-vibrant-orange/10'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        {/* Icon */}
                        <div
                          className={`w-9 h-9 rounded-md shrink-0 flex items-center justify-center ${
                            isUnread
                              ? 'bg-vibrant-orange text-white shadow-sm'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <NotifIcon className="w-4 h-4" strokeWidth={isUnread ? 2.5 : 2} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[11px] font-semibold text-foreground truncate">
                              {notif.sender_name || 'System Notification'}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatTimestamp(notif.created_at)}
                            </span>
                          </div>

                          {notif.title && (
                            <p className="text-xs font-medium text-foreground line-clamp-1 mb-0.5">
                              {notif.title}
                            </p>
                          )}

                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>

                          {notif.link && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-vibrant-orange">
                              <span>View Details</span>
                              <ArrowRight className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {/* Unread Indicator Dot */}
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-vibrant-orange shrink-0 mt-1.5"></span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Panel Footer */}
              <div className="p-2.5 bg-muted/30 border-t border-border text-center">
                <span className="text-[10px] text-muted-foreground">
                  Automatically updated upon backend events
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
