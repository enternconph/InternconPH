import React, { useState, createContext, useContext, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import PageTransition from './PageTransition';

export const SidebarContext = createContext({
  sidebarOpen: false,
  setSidebarOpen: () => {},
  toggleSidebar: () => {}
});

export const useSidebar = () => useContext(SidebarContext);

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Auto-close sidebar on route changes on mobile viewports
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen, toggleSidebar }}>
      <div className="flex h-screen w-full bg-surface-container-low text-on-surface overflow-hidden">
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
        <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
