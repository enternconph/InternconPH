import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import PageTransition from '../Layout/PageTransition';

export default function RegistrationLayout({
  badgeText = 'Official Registration',
  badgeIcon = 'assignment_ind',
  title = 'Create an Account',
  subtitle = 'Official clearance and accreditation pipeline under CHED & DOLE guidelines.',
  role = 'student',
  progressPercentage = 35,
  children
}) {
  const { isDark, toggleTheme } = useTheme();

  // Role-specific trust pillars matching Stitch Screen ea0b27f89bb242889dee95dddd947766
  const trustPillars = {
    student: [
      {
        icon: 'verified_user',
        title: 'CHED Form 104 Ready',
        desc: 'One-click export of your logged hours into regulatory paperless portfolios.'
      },
      {
        icon: 'my_location',
        title: 'Anti-Tamper Geofenced DTR',
        desc: 'Geolocation and cryptographic timestamps prevent timesheet disputes.'
      },
      {
        icon: 'work',
        title: 'Direct Career Pipeline',
        desc: 'Over 1,200+ top Philippine tech, finance, and engineering firms recruit here.'
      }
    ],
    organization: [
      {
        icon: 'verified',
        title: 'Pre-Screened Student Pool',
        desc: 'Instant access to CHED-endorsed applicants from accredited universities.'
      },
      {
        icon: 'history_edu',
        title: 'Digital MOA Endorsement',
        desc: 'Streamlined tripartite memorandums of agreement with partner institutions.'
      },
      {
        icon: 'analytics',
        title: 'Automated Evaluation & Grading',
        desc: 'Standardized competency rubrics and automated mid-term & final evaluations.'
      }
    ],
    institution: [
      {
        icon: 'account_balance',
        title: 'CHED CMO 104 Compliant',
        desc: 'Fully aligned with the Revised Guidelines for Student Internship Program (SIPP).'
      },
      {
        icon: 'manage_accounts',
        title: 'Multi-Coordinator Delegation',
        desc: 'Issue secure passcodes to department chairs, SIP heads, and faculty advisers.'
      },
      {
        icon: 'fact_check',
        title: 'Centralized Live DTR Auditing',
        desc: 'Real-time visibility into students’ active shifts, rendered hours, and HTE feedback.'
      }
    ],
    staff: [
      {
        icon: 'group',
        title: 'Class & Program Oversight',
        desc: 'Monitor real-time progress, timesheets, and requirements for all your students.'
      },
      {
        icon: 'draw',
        title: 'One-Click Endorsements',
        desc: 'Sign endorsement letters, MOA approvals, and completion clearances digitally.'
      },
      {
        icon: 'mark_email_read',
        title: 'Direct Industry Sync',
        desc: 'Direct communication channels with company mentors and HR representatives.'
      }
    ],
    mentor: [
      {
        icon: 'schedule',
        title: 'Instant DTR Verification',
        desc: 'Approve daily clock-in / clock-out logs with automated GPS and shift detection.'
      },
      {
        icon: 'rate_review',
        title: 'Structured Skill Rubrics',
        desc: 'Submit weekly milestone reviews and CHED final intern evaluation in minutes.'
      },
      {
        icon: 'military_tech',
        title: 'Talent Acquisition Conversion',
        desc: 'Fast-track high-performing interns directly into junior full-time hiring pipelines.'
      }
    ]
  };

  const activePillars = trustPillars[role] || trustPillars.student;

  // SVG circular calculation
  const radius = 24;
  const circumference = 2 * Math.PI * radius; // ~150.8
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <PageTransition>
      <div className={`min-h-[100dvh] flex flex-col justify-between transition-colors duration-300 relative overflow-x-hidden ${
        isDark ? 'bg-[#061210] text-[#dbe5e1]' : 'bg-[#F8FAF9] text-[#1c2e2b]'
      }`}>
        
        {/* Ambient Bioluminescent Glows matching Stitch */}
        <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full filter blur-[120px] pointer-events-none opacity-30 transition-opacity ${
          isDark ? 'bg-[#0d9488]/25' : 'bg-[#80CBC4]/30'
        }`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full filter blur-[120px] pointer-events-none opacity-30 transition-opacity ${
          isDark ? 'bg-[#059669]/20' : 'bg-[#B4EBE6]/35'
        }`}></div>

        {/* TOP HEADER */}
        <header className={`w-full relative z-20 px-4 sm:px-8 py-3.5 border-b backdrop-blur-md transition-colors ${
          isDark ? 'bg-[#061210]/90 border-white/5' : 'bg-white/80 border-black/5'
        }`}>
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

            {/* Right Controls: Verification Badge, Theme Toggle & Navigation */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${
                isDark 
                  ? 'bg-[#15221f] border-[#283e38] text-[#80cbc4]' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <span className="material-symbols-outlined text-[16px] text-teal-400">verified_user</span>
                <span>CHED • DOLE Verified</span>
              </div>

              {/* Theme Toggle */}
              <button
                type="button"
                id="reg-theme-toggle-btn"
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

              {/* Back to Roles Link */}
              <Link
                to="/get-started"
                className={`hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isDark
                    ? 'border-white/10 text-white/80 hover:bg-white/5 hover:text-white'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Roles</span>
              </Link>

              {/* Sign In Button */}
              <Link
                to={`/login/${role === 'organization' ? 'organization' : role === 'institution' ? 'institution' : 'student'}`}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                  isDark 
                    ? 'bg-[#15221f] hover:bg-[#1f332e] text-teal-300 border border-teal-500/30' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>Sign In</span>
              </Link>
            </div>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="flex-1 py-6 sm:py-10 px-3 sm:px-6 relative z-10 w-full">
          <div className="max-w-7xl mx-auto">
            
            {/* Top Breadcrumb & Heading Block */}
            <div className="mb-6 sm:mb-8 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2.5 transition-colors shadow-sm border border-teal-500/30 bg-teal-500/10 text-teal-400">
                <span className="material-symbols-outlined text-[15px]">{badgeIcon}</span>
                <span>{badgeText}</span>
              </div>
              <h1 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight transition-colors ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {title}<span className="text-teal-400">.</span>
              </h1>
              <p className={`text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {subtitle}
              </p>
            </div>

            {/* Main 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
              
              {/* LEFT COLUMN: Main Form Card */}
              <section className={`lg:col-span-8 rounded-3xl p-5 sm:p-8 md:p-10 border transition-all duration-300 shadow-xl ${
                isDark 
                  ? 'bg-[#091714] border-[#163830] shadow-[0_20px_50px_rgba(0,0,0,0.6)]' 
                  : 'bg-white border-slate-200 shadow-[0_15px_40px_rgba(0,0,0,0.06)]'
              }`}>
                {children}
              </section>

              {/* RIGHT COLUMN: Stitch Trust, Clearance & Accreditation Sidebar */}
              <aside className="lg:col-span-4 space-y-5">
                
                {/* 1. Clearance Status & Profile Completeness Card */}
                <div className={`rounded-2xl p-5 border transition-all shadow-md ${
                  isDark ? 'bg-[#0f211d] border-[#1c4238]' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                      <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Clearance Status
                      </h3>
                      <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider block mt-0.5">
                        Pre-Deployment Clearance
                      </span>
                    </div>
                  </div>

                  {/* Minimal Progress Arc Box */}
                  <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                    isDark ? 'bg-[#081512] border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Profile Readiness
                      </span>
                      <span className={`text-xl font-extrabold tracking-tight mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {progressPercentage}%
                      </span>
                    </div>

                    {/* Circular Progress Gauge */}
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle
                          className={isDark ? 'text-slate-800' : 'text-slate-200'}
                          cx="24"
                          cy="24"
                          fill="transparent"
                          r={radius}
                          stroke="currentColor"
                          strokeWidth="3.5"
                        />
                        <circle
                          className="text-teal-400 transition-all duration-700"
                          cx="24"
                          cy="24"
                          fill="transparent"
                          r={radius}
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="material-symbols-outlined absolute text-[16px] text-teal-400">
                        verified
                      </span>
                    </div>
                  </div>

                  <p className={`text-[11px] mt-3 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Your submission connects directly with certified Philippine educational institutions and verified corporate entities.
                  </p>
                </div>

                {/* 2. Institutional Trust & Value Card */}
                <div className={`rounded-2xl p-5 border relative overflow-hidden transition-all shadow-md ${
                  isDark ? 'bg-[#0f211d] border-[#1c4238]' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="material-symbols-outlined text-[20px] text-teal-400">shield_lock</span>
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Why Register via InternConPH?
                    </h3>
                  </div>

                  <div className="space-y-3.5">
                    {activePillars.map((pillar, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[15px]">{pillar.icon}</span>
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold leading-snug ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {pillar.title}
                          </h4>
                          <p className={`text-[11px] mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {pillar.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-4 pt-3 border-t flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase ${
                    isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-500'
                  }`}>
                    <span>Republic of the Philippines</span>
                    <span className="text-teal-400 font-bold">CHED • DOLE • DepEd</span>
                  </div>
                </div>

                {/* 3. Partner Universities Strip Badge */}
                <div className={`rounded-2xl p-4 border transition-all shadow-sm ${
                  isDark ? 'bg-[#0f211d] border-[#1c4238]' : 'bg-white border-slate-200'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block mb-2.5">
                    Accreditation Network
                  </span>
                  <div className={`flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <span className="hover:text-teal-400 transition-colors">UST</span>
                    <span className="text-teal-500/40">•</span>
                    <span className="hover:text-teal-400 transition-colors">DLSU</span>
                    <span className="text-teal-500/40">•</span>
                    <span className="hover:text-teal-400 transition-colors">MAPUA</span>
                    <span className="text-teal-500/40">•</span>
                    <span className="hover:text-teal-400 transition-colors">PUP</span>
                    <span className="text-teal-500/40">•</span>
                    <span className="hover:text-teal-400 transition-colors">FEU</span>
                    <span className="text-teal-500/40">•</span>
                    <span className="hover:text-teal-400 transition-colors">ADMU</span>
                    <span className="text-teal-500/40">•</span>
                    <span className="hover:text-teal-400 transition-colors">UP</span>
                  </div>
                </div>

              </aside>

            </div>
          </div>
        </main>

        {/* COMPACT FOOTER */}
        <footer className={`py-4 px-4 text-center text-xs border-t transition-colors ${
          isDark ? 'border-white/5 text-slate-500' : 'border-black/5 text-slate-400'
        }`}>
          <span>© 2026 InternConPH Internship Portal. All rights reserved. Registered under Philippine Republic Act 10173 (Data Privacy Act).</span>
        </footer>

      </div>
    </PageTransition>
  );
}
