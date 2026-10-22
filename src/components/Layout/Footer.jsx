import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

export default function Footer() {
  const location = useLocation();
  const { isDark } = useTheme();
  const isLandingClassic = location.pathname === '/' && !isDark;

  return (
    <footer className={`border-t py-8 sm:py-10 md:py-12 px-4 md:px-8 transition-colors ${
      isLandingClassic
        ? 'border-white/15 bg-[#737373] text-white'
        : 'border-outline-variant bg-surface-container-lowest'
    }`}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="internconPH Logo" className="h-8 w-auto object-contain shrink-0 transition-transform group-hover:scale-105" loading="lazy" decoding="async" />
            <div className="flex flex-col text-left">
              <span className={`text-lg font-bold tracking-tight leading-tight ${isLandingClassic ? 'text-white' : 'text-on-surface'}`}>
                interncon<span className="text-[#F59E0B]">ph</span>
              </span>
              <span className={`text-[9px] font-semibold tracking-wider uppercase leading-none mt-0.5 ${
                isLandingClassic ? 'text-teal-300' : 'text-teal-500'
              }`}>
                INTERNSHIP CONNECTIVITY
              </span>
            </div>
          </Link>
          <p className={`text-sm leading-relaxed ${isLandingClassic ? 'text-white/85' : 'text-on-surface-variant'}`}>
            Connecting aspiring Philippine students with accredited industry employers and leading universities.
          </p>
        </div>

        <div>
          <h4 className={`font-bold text-sm uppercase tracking-wider mb-4 ${isLandingClassic ? 'text-white' : 'text-on-surface'}`}>Platform</h4>
          <ul className={`space-y-2 text-sm ${isLandingClassic ? 'text-white/85' : 'text-on-surface-variant'}`}>
            <li><Link to="/#how-it-works" className="hover:text-vibrant-orange transition-colors">How It Works</Link></li>
            <li><Link to="/#opportunities" className="hover:text-vibrant-orange transition-colors">Find Internships</Link></li>
            <li><Link to="/#for-students" className="hover:text-vibrant-orange transition-colors">For Students</Link></li>
            <li><Link to="/#for-organizations" className="hover:text-vibrant-orange transition-colors">For Organizations</Link></li>
            <li><Link to="/#policies" className="hover:text-vibrant-orange transition-colors">Policies & Compliance</Link></li>
          </ul>
        </div>

        <div>
          <h4 className={`font-bold text-sm uppercase tracking-wider mb-4 ${isLandingClassic ? 'text-white' : 'text-on-surface'}`}>Join</h4>
          <ul className={`space-y-2 text-sm ${isLandingClassic ? 'text-white/85' : 'text-on-surface-variant'}`}>
            <li><Link to="/register/student" className="hover:text-vibrant-orange transition-colors">Register as Student</Link></li>
            <li><Link to="/register/organization" className="hover:text-vibrant-orange transition-colors">Partner as Employer</Link></li>
            <li><Link to="/register/institution" className="hover:text-vibrant-orange transition-colors">Accredit Institution</Link></li>
            <li><Link to="/login" className="hover:text-vibrant-orange transition-colors">Member Sign In</Link></li>
          </ul>
        </div>

        <div>
          <h4 className={`font-bold text-sm uppercase tracking-wider mb-4 ${isLandingClassic ? 'text-white' : 'text-on-surface'}`}>Contact</h4>
          <p className={`text-sm ${isLandingClassic ? 'text-white/85' : 'text-on-surface-variant'}`}>support@interncon.ph</p>
          <p className={`text-sm mt-1 ${isLandingClassic ? 'text-white/85' : 'text-on-surface-variant'}`}>+63 (02) 8123-4567</p>
          <p className={`text-sm mt-1 ${isLandingClassic ? 'text-white/85' : 'text-on-surface-variant'}`}>Metro Manila, Philippines</p>
        </div>
      </div>

      <div className={`max-w-7xl mx-auto mt-8 pt-6 border-t text-center text-xs ${
        isLandingClassic ? 'border-white/15 text-white/75' : 'border-outline-variant text-on-surface-variant'
      }`}>
        <p>&copy; {new Date().getFullYear()} InternConPH. Built for Philippine Higher Education and Industry Partners.</p>
      </div>
    </footer>
  );
}

