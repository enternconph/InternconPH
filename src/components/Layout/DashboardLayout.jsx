import React, { useState, createContext, useContext, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import MobileBottomBar from './MobileBottomBar';
import PageTransition from './PageTransition';
import InterviewAlarmMonitor from '../Organization/InterviewAlarmMonitor';
import { Skeleton } from '../ui/Skeleton';

export const SidebarContext = createContext({
  sidebarOpen: false,
  setSidebarOpen: () => {},
  toggleSidebar: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  toggleSidebarCollapse: () => {}
});

export const useSidebar = () => useContext(SidebarContext);

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('interncon_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const location = useLocation();

  // Auto-close sidebar on route changes on mobile viewports
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  
  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('interncon_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Global shortcut Ctrl+B / Cmd+B to toggle sidebar collapse on desktop
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea' && !document.activeElement?.isContentEditable) {
          e.preventDefault();
          toggleSidebarCollapse();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebarCollapse
      }}
    >
      <div className="flex h-screen h-[100dvh] w-full max-w-full bg-transparent text-on-surface overflow-hidden lg:p-3 lg:gap-3">
        {/* Mobile Backdrop Overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            aria-hidden="true"
          />
        )}

        {/* Sidebar (drawer on mobile < lg, solid/fixed column on desktop lg+) */}
        <Sidebar />

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col h-screen h-[100dvh] lg:h-full w-full max-w-full min-w-0 overflow-hidden">
          <DashboardHeader />
          <InterviewAlarmMonitor />
          <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0 w-full max-w-full relative pb-24 lg:pb-0">
            <div className="max-w-[1400px] mx-auto w-full">
              <Suspense
                fallback={
                  <div className="p-4 sm:p-6 space-y-6 w-full" aria-busy="true">
                    <div className="space-y-2">
                      <Skeleton className="h-7 w-56 rounded-lg" />
                      <Skeleton className="h-4 w-80 max-w-full rounded-md" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="bento-card p-5 space-y-3">
                          <Skeleton className="h-4 w-24 rounded-md" />
                          <Skeleton className="h-8 w-16 rounded-lg" />
                        </div>
                      ))}
                    </div>
                    <div className="bento-card p-6 space-y-4">
                      <Skeleton className="h-5 w-44 rounded-md" />
                      <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                  </div>
                }
              >
                <PageTransition>
                  <Outlet />
                </PageTransition>
              </Suspense>
            </div>
          </main>
          <MobileBottomBar />
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
