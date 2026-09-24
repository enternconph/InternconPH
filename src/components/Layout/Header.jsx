import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Header() {
  const { user, logout, getDashboardUrl } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (hash) => {
    setMobileMenuOpen(false);
    const targetId = hash ? hash.replace('#', '') : null;

    if (location.pathname !== '/') {
      navigate({ pathname: '/', hash: hash || '' });
      setTimeout(() => {
        if (targetId) {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 200);
    } else {
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="border-b border-outline-variant w-full top-0 sticky z-50 bg-surface-container-lowest/95 backdrop-blur-md transition-colors">
      <div className="flex justify-between items-center h-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto gap-2">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-vibrant-orange flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="internconPH Logo" className="h-9 sm:h-10 w-auto object-contain" decoding="async" />
          <span className="text-xl sm:text-2xl font-bold tracking-tight">íntєrncσnᵖʰ</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          <button
            type="button"
            onClick={() => handleNavClick('')}
            className="relative text-on-surface-variant font-medium text-sm hover:text-vibrant-orange transition-colors py-1 cursor-pointer"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('#how-it-works')}
            className="relative text-on-surface-variant font-medium text-sm hover:text-vibrant-orange transition-colors py-1 cursor-pointer"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('#opportunities')}
            className="relative text-on-surface-variant font-medium text-sm hover:text-vibrant-orange transition-colors py-1 cursor-pointer"
          >
            Opportunities
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('#for-students')}
            className="relative text-on-surface-variant font-medium text-sm hover:text-vibrant-orange transition-colors py-1 cursor-pointer"
          >
            For Students
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('#for-organizations')}
            className="relative text-on-surface-variant font-medium text-sm hover:text-vibrant-orange transition-colors py-1 cursor-pointer"
          >
            For Organizations
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('#for-institutions')}
            className="relative text-on-surface-variant font-medium text-sm hover:text-vibrant-orange transition-colors py-1 cursor-pointer"
          >
            For Institutions
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('#policies')}
            className="relative text-on-surface-variant font-medium text-sm hover:text-vibrant-orange transition-colors py-1 cursor-pointer"
          >
            Policies
          </button>
        </nav>

        {/* Action Buttons & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            id="public-theme-toggle-btn"
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
              isDark
                ? 'bg-primary-container/20 text-primary-container hover:bg-primary-container/30 border border-primary-container/40'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Aura Radiant Dark Mode'}
            aria-label="Toggle Theme Mode"
          >
            <span className="material-symbols-outlined text-[20px] block">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Desktop auth buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to={getDashboardUrl(user.role_name || user.role)}
                  className="bg-vibrant-orange text-white px-4 lg:px-5 py-2 rounded-full text-sm font-bold hover:bg-deep-orange transition-colors shadow-sm whitespace-nowrap"
                >
                  My Dashboard
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    window.location.href = '/login';
                  }}
                  className="p-2 rounded-xl bg-surface-container text-error hover:bg-error-container hover:text-error transition-all duration-200 cursor-pointer"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <span className="material-symbols-outlined text-[20px] block">logout</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-on-surface font-bold text-sm hover:text-vibrant-orange transition-colors px-3 py-1.5 whitespace-nowrap"
                >
                  Log In
                </Link>
                <Link
                  to="/get-started"
                  className="bg-vibrant-orange text-white px-4 lg:px-5 py-2 rounded-full text-sm font-bold hover:bg-deep-orange transition-colors shadow-sm whitespace-nowrap"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            type="button"
            id="public-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <span className="material-symbols-outlined text-[22px] block">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-outline-variant bg-surface-container-lowest/98 backdrop-blur-lg px-4 py-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-2 mb-5">
            <button
              type="button"
              onClick={() => handleNavClick('')}
              className="text-left py-2 px-3 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container hover:text-vibrant-orange transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('#how-it-works')}
              className="text-left py-2 px-3 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container hover:text-vibrant-orange transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('#opportunities')}
              className="text-left py-2 px-3 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container hover:text-vibrant-orange transition-colors cursor-pointer"
            >
              Opportunities
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('#for-students')}
              className="text-left py-2 px-3 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container hover:text-vibrant-orange transition-colors cursor-pointer"
            >
              For Students
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('#for-organizations')}
              className="text-left py-2 px-3 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container hover:text-vibrant-orange transition-colors cursor-pointer"
            >
              For Organizations
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('#for-institutions')}
              className="text-left py-2 px-3 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container hover:text-vibrant-orange transition-colors cursor-pointer"
            >
              For Institutions
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('#policies')}
              className="text-left py-2 px-3 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container hover:text-vibrant-orange transition-colors cursor-pointer"
            >
              Policies & Compliance
            </button>
          </nav>

          {/* Mobile Auth Actions */}
          <div className="pt-3 border-t border-outline-variant flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  to={getDashboardUrl(user.role_name || user.role)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center bg-vibrant-orange text-white py-2.5 rounded-xl text-sm font-bold hover:bg-deep-orange transition-colors shadow-sm"
                >
                  Go to My Dashboard
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                    window.location.href = '/login';
                  }}
                  className="w-full py-2.5 rounded-xl border border-error/30 text-error text-sm font-bold hover:bg-error-container transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl border border-outline-variant text-on-surface text-sm font-bold hover:bg-surface-container transition-colors"
                >
                  Sign In to Account
                </Link>
                <Link
                  to="/get-started"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center bg-vibrant-orange text-white py-2.5 rounded-xl text-sm font-bold hover:bg-deep-orange transition-colors shadow-sm"
                >
                  Get Started (Register)
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
