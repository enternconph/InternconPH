import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isWeb } from '../../utils/platform';

export default function Header() {
  const { user, getDashboardUrl } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full sticky top-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant text-on-surface transition-colors">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto gap-4">
        
        {/* Left: Logo */}
        <div className="flex-1 flex items-center justify-start min-w-0">
          <Link to="/" className="inline-flex items-center gap-2.5 shrink-0 group">
            <img
              src="/logo.png"
              alt="internconPH Logo"
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
            <span className="font-black text-xl sm:text-2xl text-vibrant-orange tracking-tight">
              íntєrncσnᵖʰ
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-8 shrink-0"></nav>

        {/* Right: Actions */}
        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">

          {user ? (
            <Link
              to={getDashboardUrl(user.role_name || user.role)}
              className="hidden sm:inline-flex items-center gap-1.5 bg-vibrant-orange hover:bg-deep-orange text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              <span>Dashboard</span>
            </Link>
          ) : !isWeb() && (
            <div className="hidden sm:flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-bold text-on-surface-variant hover:text-vibrant-orange px-3 py-2 rounded-xl hover:bg-surface-container transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/get-started"
                className="inline-flex items-center gap-1.5 bg-vibrant-orange hover:bg-deep-orange text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            <span className="material-symbols-outlined block text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-outline-variant bg-surface-container-lowest px-4 py-4 shadow-lg">
          <nav className="flex flex-col space-y-2.5">
            {!user && !isWeb() && (
              <div className="flex flex-col gap-2.5">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 border border-outline-variant rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/get-started"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
            {user && (
              <Link
                to={getDashboardUrl(user.role_name || user.role)}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                <span>Dashboard</span>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
