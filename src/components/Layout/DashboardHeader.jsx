import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket, useRealtimeRefresh } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from './DashboardLayout';
import { playNotificationChime } from '../../utils/audio';
import api from '../../api/client';

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
      if (targetLink === '/dashboard/student/requirements') {
        targetLink = '/dashboard/student/ojt';
      }
      navigate(targetLink);
    }
  };

  const getNotificationIcon = (type, title = '') => {
    const lower = `${type || ''} ${title || ''}`.toLowerCase();
    if (lower.includes('staff') || lower.includes('faculty') || lower.includes('coordinator')) return 'badge';
    if (lower.includes('verification') || lower.includes('verify')) return 'how_to_reg';
    if (lower.includes('grievance') || lower.includes('complaint')) return 'gavel';
    if (lower.includes('warning') || lower.includes('sanction') || lower.includes('suspend')) return 'warning';
    if (lower.includes('accident') || lower.includes('incident')) return 'emergency';
    if (lower.includes('offer') || lower.includes('job') || lower.includes('hire')) return 'verified';
    if (lower.includes('dtr') || lower.includes('time') || lower.includes('clock')) return 'schedule';
    return 'notifications';
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
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

  return (
    <header className="sticky top-0 z-30 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant px-3 sm:px-4 md:px-8 py-2.5 sm:py-3 transition-colors shrink-0">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Hamburger Toggle + Branding + Desktop Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            id="mobile-sidebar-toggle-btn"
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            aria-label="Toggle navigation menu"
            title="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-[22px] block">menu</span>
          </button>

          {/* Mobile branding next to hamburger */}
          <div className="flex items-center gap-2 lg:hidden overflow-hidden">
            <img src="/logo.png" alt="internconPH Logo" className="h-7 w-auto object-contain shrink-0" decoding="async" />
            <span className="font-bold text-base text-vibrant-orange tracking-tight truncate">íntєrncσnᵖʰ</span>
          </div>

          {/* Desktop Sidebar Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex p-1.5 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors shrink-0 items-center justify-center cursor-pointer"
            aria-label={sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            title={sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {sidebarCollapsed ? 'dock_to_right' : 'dock_to_left'}
            </span>
          </button>

        </div>

        {/* Right: Actions & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 relative shrink-0" ref={panelRef}>
          {/* Notification Bell Button */}
          <button
            type="button"
            id="notification-bell-btn"
            onClick={() => setPanelOpen(!panelOpen)}
            className={`relative p-2 rounded-xl transition-all duration-200 ${
              panelOpen
                ? 'bg-orange-tint text-vibrant-orange shadow-inner'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
            title="Notifications"
            aria-label="View notifications"
          >
            <span className="material-symbols-outlined text-[22px] block">
              {unreadCount > 0 ? 'notifications_active' : 'notifications'}
            </span>

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-vibrant-orange text-white text-[10px] font-extrabold flex items-center justify-center shadow-md animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Theme Quick Toggle (Aura Radiant Dark / Classic Light) */}
          <button
            type="button"
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
              isDark
                ? 'bg-primary-container/20 text-primary-container hover:bg-primary-container/30 border border-primary-container/40'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Aura Radiant Dark Mode'}
            aria-label="Toggle Theme Mode"
          >
            <span className="material-symbols-outlined text-[22px] block transition-transform duration-300">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Settings Navigation Shortcut */}
          <button
            type="button"
            id="settings-header-btn"
            onClick={() => navigate('/dashboard/settings')}
            className="p-2 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-200 cursor-pointer"
            title="Account Settings & Preferences"
            aria-label="Account Settings"
          >
            <span className="material-symbols-outlined text-[22px] block hover:rotate-45 transition-transform duration-300">
              settings
            </span>
          </button>

          {/* Quick Sign Out Action */}
          <button
            type="button"
            id="header-logout-btn"
            onClick={handleLogout}
            className="p-2 rounded-xl bg-surface-container text-error hover:bg-error-container hover:text-error transition-all duration-200 cursor-pointer"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <span className="material-symbols-outlined text-[22px] block">logout</span>
          </button>

          {/* Notifications Dropdown Panel */}
          {panelOpen && (
            <div className="absolute right-0 top-full mt-2 w-[min(calc(100vw-1.5rem),24rem)] max-w-[384px] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[85vh] flex flex-col">
              {/* Panel Header */}
              <div className="p-4 border-b border-outline-variant bg-surface-container-low/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange text-[20px]">notifications</span>
                  <h3 className="text-sm font-bold text-on-surface">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-vibrant-orange/10 text-vibrant-orange text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={loading}
                    className="text-[11px] font-bold text-vibrant-orange hover:text-deep-orange hover:underline transition-all disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center border-b border-outline-variant px-3 pt-2 bg-surface-container-lowest text-xs">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`pb-2 px-3 font-semibold transition-all border-b-2 ${
                    activeFilter === 'all'
                      ? 'border-vibrant-orange text-vibrant-orange'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveFilter('unread')}
                  className={`pb-2 px-3 font-semibold transition-all border-b-2 ${
                    activeFilter === 'unread'
                      ? 'border-vibrant-orange text-vibrant-orange'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notification Items List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-outline-variant/50">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant/40 mb-3">
                      <span className="material-symbols-outlined text-2xl">notifications_off</span>
                    </div>
                    <p className="text-xs font-bold text-on-surface">No notifications</p>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      {activeFilter === 'unread'
                        ? "You've read all your notifications!"
                        : 'Updates regarding grievances, complaints, and alerts will appear here.'}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => {
                    const iconName = getNotificationIcon(notif.type || notif.related_type, notif.title);
                    const isUnread = !notif.is_read;

                    return (
                      <div
                        key={notif.notification_id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                          isUnread
                            ? 'bg-vibrant-orange/10 hover:bg-vibrant-orange/15'
                            : 'hover:bg-surface-container-low'
                        }`}
                      >
                        {/* Icon */}
                        <div
                          className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${
                            isUnread
                              ? 'bg-vibrant-orange text-white shadow-sm'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">{iconName}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[11px] font-bold text-on-surface truncate">
                              {notif.sender_name || 'System Notification'}
                            </span>
                            <span className="text-[10px] text-on-surface-variant shrink-0">
                              {formatTimestamp(notif.created_at)}
                            </span>
                          </div>

                          {notif.title && (
                            <p className="text-xs font-semibold text-on-surface line-clamp-1 mb-0.5">
                              {notif.title}
                            </p>
                          )}

                          <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>

                          {notif.link && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-vibrant-orange">
                              <span>View Details</span>
                              <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
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
              <div className="p-2.5 bg-surface-container-low/50 border-t border-outline-variant text-center">
                <span className="text-[10px] text-on-surface-variant">
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
