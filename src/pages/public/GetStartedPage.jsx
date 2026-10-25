import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import PageTransition from '../../components/Layout/PageTransition';

export default function GetStartedPage() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <PageTransition>
      <div className={`min-h-[100dvh] flex flex-col justify-between transition-colors duration-300 relative overflow-x-hidden ${
        isDark ? 'bg-[#061210] text-[#94a3b8]' : 'bg-[#F8FAF9] text-[#1c2e2b]'
      }`}>
        
        {/* Ambient Decorative Shapes & Watermark */}
        <div className={`absolute top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full filter blur-[120px] pointer-events-none opacity-40 ${
          isDark ? 'bg-[#0d9488]/20' : 'bg-[#80CBC4]/25'
        }`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full filter blur-[120px] pointer-events-none opacity-40 ${
          isDark ? 'bg-[#059669]/15' : 'bg-[#B4EBE6]/35'
        }`}></div>

        {/* Subtle Watermark Silhouette on Right */}
        <div className="absolute right-[-40px] top-[15%] w-[420px] h-[420px] opacity-[0.035] dark:opacity-[0.045] pointer-events-none select-none">
          <svg viewBox="0 0 200 200" fill="currentColor">
            <circle cx="65" cy="50" r="18" />
            <circle cx="135" cy="50" r="18" />
            <path d="M 40 160 C 40 100, 90 90, 100 90 C 110 90, 160 100, 160 160 Z" />
            <path d="M 120 160 C 120 120, 150 110, 175 110 C 185 110, 195 125, 195 160 Z" />
          </svg>
        </div>

        {/* TOP HEADER */}
        <header className="w-full relative z-20 px-4 sm:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="InternconPH Logo"
                className="h-8 sm:h-9 w-auto object-contain shrink-0 transition-transform group-hover:scale-105"
                decoding="async"
              />
              <div className="flex flex-col">
                <span className={`text-lg sm:text-xl font-bold tracking-tight leading-tight transition-colors ${
                  isDark ? 'text-white' : 'text-[#0c1f1c]'
                }`}>
                  interncon<span className="text-[#F59E0B]">ph</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#14b8a6] uppercase leading-none mt-0.5">
                  INTERNSHIP CONNECTIVITY
                </span>
              </div>
            </Link>

            {/* Right Controls: Theme Toggle & Sign In Pill */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="getstarted-theme-toggle-btn"
                onClick={toggleTheme}
                className={`p-2 rounded-full transition-all duration-200 cursor-pointer ${
                  isDark
                    ? 'text-yellow-400 hover:bg-white/10'
                    : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'
                }`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Theme Mode"
              >
                <span className="material-symbols-outlined text-[20px] block">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>

              <Link
                to="/login/student"
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-semibold transition-all hover:scale-105 ${
                  isDark 
                    ? 'border-gray-700 bg-[#0c2420]/80 text-gray-200 hover:border-emerald-500/50 hover:text-white' 
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 shadow-sm'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                <span>Sign In</span>
              </Link>
            </div>
          </div>
        </header>

        {/* MAIN BODY CONTENT */}
        <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto w-full relative z-10">
          
          {/* Headline Segment */}
          <div className="text-center space-y-2 mb-8 sm:mb-10 max-w-2xl">
            <div className="inline-flex items-center justify-center">
              <span className={`px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest ${
                isDark 
                  ? 'bg-[#0e3831] text-[#2dd4bf] border border-[#2dd4bf]/20' 
                  : 'bg-[#1c2e2b] text-white'
              }`}>
                GET STARTED
              </span>
            </div>
            
            <h1 className={`text-3xl sm:text-4xl md:text-[42px] font-extrabold tracking-tight leading-tight ${
              isDark ? 'text-white' : 'text-[#0c1f1c]'
            }`}>
              Build your future with <span className="text-[#F59E0B]">InternConPH.</span>
            </h1>
            
            <p className={`text-xs sm:text-sm md:text-base ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Choose your account type to begin your journey.
            </p>
          </div>

          {/* 3 ROLE PORTAL SELECTION CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 w-full mb-8 items-stretch">
            
            {/* CARD 01: College Student */}
            <div className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-[#091714] border-[#163830] shadow-[0_12px_40px_rgba(0,0,0,0.5)]' 
                : 'bg-white border-gray-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)]'
            }`}>
              <div>
                {/* Header Row: Icon + Number Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    isDark ? 'bg-[#0e3831] text-[#2dd4bf]' : 'bg-teal-50 text-[#0d9488] border border-teal-100'
                  }`}>
                    <span className="material-symbols-outlined text-[26px]">school</span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isDark ? 'bg-[#122e28] text-teal-300' : 'bg-teal-50 text-teal-700 border border-teal-100'
                  }`}>
                    01
                  </span>
                </div>

                {/* Title & Description */}
                <h2 className={`text-xl font-bold mb-2.5 ${isDark ? 'text-white' : 'text-[#0c1f1c]'}`}>
                  College Student
                </h2>
                <p className={`text-xs sm:text-sm leading-relaxed mb-6 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Register using your university-issued access code. Apply to verified OJT openings, log attendance, and earn accredited hours.
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link
                  to="/register/student"
                  className="w-full py-3 px-4 bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <span>Create Student Account</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            </div>

            {/* CARD 02: Hiring Organization (HR) */}
            <div className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-[#091714] border-[#163830] shadow-[0_12px_40px_rgba(0,0,0,0.5)]' 
                : 'bg-white border-gray-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)]'
            }`}>
              <div>
                {/* Header Row: Icon + Number Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    isDark ? 'bg-[#0e3831] text-[#2dd4bf]' : 'bg-teal-50 text-[#0d9488] border border-teal-100'
                  }`}>
                    <span className="material-symbols-outlined text-[26px]">apartment</span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isDark ? 'bg-[#122e28] text-teal-300' : 'bg-teal-50 text-teal-700 border border-teal-100'
                  }`}>
                    02
                  </span>
                </div>

                {/* Title & Description */}
                <h2 className={`text-xl font-bold mb-2.5 ${isDark ? 'text-white' : 'text-[#0c1f1c]'}`}>
                  Hiring Organization (HR)
                </h2>
                <p className={`text-xs sm:text-sm leading-relaxed mb-6 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Create your organization main account (SEC/DTI verified), deploy OJT offers to partner institutions, and manage job posts.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Link
                  to="/register/organization"
                  className="w-full py-3 px-4 bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <span>Create Organization Account</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>

                <Link
                  to="/register/mentor"
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border ${
                    isDark
                      ? 'border-teal-500/30 text-[#2dd4bf] hover:bg-teal-500/10'
                      : 'border-teal-200 text-[#0d9488] hover:bg-teal-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">supervised_user_circle</span>
                  <span>Register as Mentor</span>
                </Link>
              </div>
            </div>

            {/* CARD 03: Institution OJT Head (Amber Highlight) */}
            <div className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-[#111910] border-[#382d13] shadow-[0_12px_40px_rgba(0,0,0,0.5)]' 
                : 'bg-[#FFFDF7] border-amber-200 shadow-[0_10px_30px_rgba(245,158,11,0.06)]'
            }`}>
              <div>
                {/* Header Row: Icon + Number Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    isDark ? 'bg-[#291800] text-[#F59E0B]' : 'bg-amber-100 text-[#d97706]'
                  }`}>
                    <span className="material-symbols-outlined text-[26px]">account_balance</span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isDark ? 'bg-[#332000] text-amber-300' : 'bg-amber-100 text-amber-800'
                  }`}>
                    03
                  </span>
                </div>

                {/* Title & Description */}
                <h2 className={`text-xl font-bold mb-2.5 ${isDark ? 'text-white' : 'text-[#0c1f1c]'}`}>
                  Institution OJT Head
                </h2>
                <p className={`text-xs sm:text-sm leading-relaxed mb-6 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Create the university's main account (CHED/TESDA accredited), manage programs, and issue passcodes for OJT coordinators.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Link
                  to="/register/institution"
                  className="w-full py-3 px-4 bg-[#F59E0B] hover:bg-[#d97706] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <span>Create Institution Account</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>

                <Link
                  to="/register/staff"
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border ${
                    isDark
                      ? 'border-amber-500/30 text-[#F59E0B] hover:bg-amber-500/10'
                      : 'border-amber-200 text-[#b45309] hover:bg-amber-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">badge</span>
                  <span>Register as OJT Coordinator</span>
                </Link>
              </div>
            </div>

          </div>

          {/* BOTTOM HORIZONTAL VALUE PROPOSITION BAR */}
          <div className={`w-full rounded-2xl p-5 sm:p-6 border grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 ${
            isDark 
              ? 'bg-[#091714] border-[#163830]' 
              : 'bg-white border-gray-200/80 shadow-sm'
          }`}>
            {/* Feature 1 */}
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[#0e3831] text-[#2dd4bf]' : 'bg-teal-50 text-[#0d9488]'
              }`}>
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </div>
              <div>
                <h3 className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-[#0c1f1c]'}`}>
                  Secure &amp; Verified
                </h3>
                <p className={`text-xs mt-0.5 leading-snug ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  We follow industry standards to keep your data safe.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[#0e3831] text-[#2dd4bf]' : 'bg-teal-50 text-[#0d9488]'
              }`}>
                <span className="material-symbols-outlined text-[22px]">link</span>
              </div>
              <div>
                <h3 className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-[#0c1f1c]'}`}>
                  More Opportunities
                </h3>
                <p className={`text-xs mt-0.5 leading-snug ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Connect with top organizations and trusted institutions.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[#0e3831] text-[#2dd4bf]' : 'bg-teal-50 text-[#0d9488]'
              }`}>
                <span className="material-symbols-outlined text-[22px]">trending_up</span>
              </div>
              <div>
                <h3 className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-[#0c1f1c]'}`}>
                  Career Growth
                </h3>
                <p className={`text-xs mt-0.5 leading-snug ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Gain real experience and build your future.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Navigation Link */}
          <div className="text-center pb-2 space-y-2">
            <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Already have an account? Choose your sign-in portal:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
              <Link to="/login/student" className="text-[#2dd4bf] hover:underline inline-flex items-center gap-1">
                <span>Student Sign In</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
              <span className={isDark ? 'text-gray-700' : 'text-gray-300'}>|</span>
              <Link to="/login/institution" className="text-[#F59E0B] hover:underline inline-flex items-center gap-1">
                <span>Institution Sign In</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
              <span className={isDark ? 'text-gray-700' : 'text-gray-300'}>|</span>
              <Link to="/login/organization" className="text-[#2dd4bf] hover:underline inline-flex items-center gap-1">
                <span>Organization Sign In</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>

        </main>
      </div>
    </PageTransition>
  );
}
