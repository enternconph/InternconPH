import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Header() {
  const { user, logout, getDashboardUrl } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (hash) => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
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
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto gap-4">
        {/* Left: Logo */}
        <div className="flex-1 flex items-center justify-start min-w-0">
          <Link to="/" className="text-xl font-bold text-vibrant-orange flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="internconPH Logo" className="h-9 sm:h-10 w-auto object-contain" decoding="async" />
            <span className="text-xl sm:text-2xl font-bold tracking-tight">íntєrncσnᵖʰ</span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links (Properly Centered) */}
        <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-8 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('')}
            className="text-on-surface-variant font-semibold text-sm hover:text-vibrant-orange transition-colors py-1 cursor-pointer"
          >
            Home
          </button>
          
          <button
            type="button"
            onClick={() => handleNavClick('#how-it-works')}
            className="text-on-surface-variant font-semibold text-sm hover:text-vibrant-orange transition-colors py-1 cursor-pointer"
          >
            How It Works
          </button>
          
          <button
            type="button"
            onClick={() => handleNavClick('#opportunities')}
            className="text-on-surface-variant font-semibold text-sm hover:text-vibrant-orange transition-colors py-1 cursor-pointer"
          >
            Ecosystem Goal
          </button>

          {/* Combined Portals / Audience Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              onMouseEnter={() => setDropdownOpen(true)}
              className="flex items-center gap-1 text-on-surface-variant font-semibold text-sm hover:text-vibrant-orange transition-colors py-1 cursor-pointer"
            >
              <span>For Students</span>
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${dropdownOpen ? 'rotate-180 text-vibrant-orange' : ''}`}>
                expand_more
              </span>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                onMouseLeave={() => setDropdownOpen(false)}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-surface rounded-2xl shadow-2xl border border-outline-variant p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <button
                  type="button"
                  onClick={() => handleNavClick('#for-students')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container hover:text-vibrant-orange transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[18px] text-vibrant-orange">school</span>
                  <div>
                    <p className="font-bold">For Students</p>
                    <p className="text-[10px] text-on-surface-variant font-normal">OJT & Career Opportunities</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('#for-organizations')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container hover:text-pinoy-green transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[18px] text-pinoy-green">apartment</span>
                  <div>
                    <p className="font-bold">For Organizations</p>
                    <p className="text-[10px] text-on-surface-variant font-normal">Intern Recruitment & Mentorship</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('#for-institutions')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container hover:text-blue-600 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[18px] text-blue-600">account_balance</span>
                  <div>
                    <p className="font-bold">For Institutions</p>
                    <p className="text-[10px] text-on-surface-variant font-normal">Curriculum & Compliance</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleNavClick('#policies')}
            className="text-on-surface-variant font-semibold text-sm hover:text-vibrant-orange transition-colors py-1 cursor-pointer"
          >
            Policies
          </button>
        </nav>

        {/* Right: Dark Mode Toggle & Mobile Menu */}
        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
          {/* Dark / Light Mode Toggle Button */}
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

          {/* If already logged in, show Dashboard shortcut */}
          {user && (
            <Link
              to={getDashboardUrl(user.role_name || user.role)}
              className="hidden sm:inline-flex items-center gap-1.5 bg-vibrant-orange text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-deep-orange transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              <span>Dashboard</span>
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
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

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-outline-variant bg-surface-container-lowest/98 backdrop-blur-lg px-4 py-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-2">
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
              Ecosystem Goal
            </button>
            <div className="py-2 px-3 border-l-2 border-vibrant-orange ml-2 space-y-1 my-1">
              <button
                type="button"
                onClick={() => handleNavClick('#for-students')}
                className="w-full text-left py-1 text-xs font-bold text-on-surface hover:text-vibrant-orange block"
              >
                🎓 For Students
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('#for-organizations')}
                className="w-full text-left py-1 text-xs font-bold text-on-surface hover:text-pinoy-green block"
              >
                🏢 For Organizations
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('#for-institutions')}
                className="w-full text-left py-1 text-xs font-bold text-on-surface hover:text-blue-600 block"
              >
                🏛️ For Institutions
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleNavClick('#policies')}
              className="text-left py-2 px-3 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container hover:text-vibrant-orange transition-colors cursor-pointer"
            >
              Policies & Compliance
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
