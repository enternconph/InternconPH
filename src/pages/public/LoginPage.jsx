import React, { useState, useRef, useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import PageTransition from '../../components/Layout/PageTransition';
import { validateEmail } from '../../utils/email';

const PORTAL_CONFIG = {
  student: {
    key: 'student',
    tabLabel: 'Student',
    icon: 'school',
    badge: 'STUDENT LOGIN PORTAL',
    title: 'Welcome back',
    subtitle: 'Sign in to your Student Portal to manage applications, DTR hours, and career portfolio.',
    placeholder: 'student@university.edu.ph',
    forgotNotice:
      'For secure credential verification, student password resets are processed by your University OJT Coordinator or Registrar.',
    registerLabel: 'Create Student Account',
    registerTo: '/register/student',
    secondaryRegisterLabel: null,
    secondaryRegisterTo: null,
    pillLabel: 'Student Sign In',
  },
  institution: {
    key: 'institution',
    tabLabel: 'Institution',
    icon: 'account_balance',
    badge: 'INSTITUTION LOGIN PORTAL',
    title: 'Welcome back',
    subtitle: 'Sign in to your Academic Institution & OJT Coordinator Portal.',
    placeholder: 'coordinator@university.edu.ph',
    forgotNotice:
      'For secure credential verification, coordinator password resets are processed by your Institution OJT Head or System Administrator.',
    registerLabel: 'Register Institution',
    registerTo: '/register/institution',
    secondaryRegisterLabel: 'Register Coordinator',
    secondaryRegisterTo: '/register/staff',
    pillLabel: 'Institution Sign In',
  },
  organization: {
    key: 'organization',
    tabLabel: 'Organization',
    icon: 'apartment',
    badge: 'ORGANIZATION LOGIN PORTAL',
    title: 'Welcome back',
    subtitle: 'Sign in to your Hiring Organization & Workplace Mentor Portal.',
    placeholder: 'hr@company.com.ph',
    forgotNotice:
      'For secure credential verification, password resets are processed by your Organization HR Administrator or System Administrator.',
    registerLabel: 'Register Organization',
    registerTo: '/register/organization',
    secondaryRegisterLabel: 'Register Mentor',
    secondaryRegisterTo: '/register/mentor',
    pillLabel: 'Organization Sign In',
  },
};

export default function LoginPage() {
  const { portal } = useParams();
  const activePortal = (portal || 'student').toLowerCase();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);
  const emailInputRef = useRef(null);

  const { login, getDashboardUrl } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    setError('');
    setEmailError(null);
    setShowForgotNotice(false);
  }, [activePortal]);

  if (!PORTAL_CONFIG[activePortal]) {
    return <Navigate to="/login/student" replace />;
  }

  const currentPortal = PORTAL_CONFIG[activePortal];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateEmail(email, { required: true });
    if (validationError) {
      setEmailError(validationError);
      emailInputRef.current?.focus();
      return;
    }

    setLoading(true);

    const res = await login(email, password, activePortal);
    setLoading(false);

    if (res.success && res.user) {
      navigate(getDashboardUrl(res.user.role_name || res.user.role));
    } else {
      setError(res.message || 'Invalid email or password.');
    }
  };

  return (
    <PageTransition>
      <div className={`min-h-[100dvh] flex flex-col justify-between transition-colors duration-300 relative overflow-x-hidden ${
        isDark ? 'bg-[#061210] text-[#94a3b8]' : 'bg-[#F8FAF9] text-[#1c2e2b]'
      }`}>
        
        {/* Ambient Glows */}
        <div className={`absolute top-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full filter blur-[100px] pointer-events-none opacity-40 transition-opacity ${
          isDark ? 'bg-[#0d9488]/25' : 'bg-[#80CBC4]/30'
        }`}></div>
        <div className={`absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full filter blur-[100px] pointer-events-none opacity-40 transition-opacity ${
          isDark ? 'bg-[#059669]/20' : 'bg-[#B4EBE6]/40'
        }`}></div>

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
                id="login-theme-toggle-btn"
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

              <div className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${
                isDark 
                  ? 'border-emerald-500/30 bg-[#0c2420] text-emerald-300' 
                  : 'border-emerald-600/30 bg-emerald-50 text-emerald-800'
              }`}>
                <span className="material-symbols-outlined text-[16px]">{currentPortal.icon}</span>
                <span>{currentPortal.pillLabel}</span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex items-center justify-center p-3 sm:p-6 relative z-10 w-full my-auto">
          {/* FLOATING CARD */}
          <div className={`w-full max-w-[1020px] rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row relative border transition-all duration-300 ${
            isDark 
              ? 'bg-[#091714] border-[#163830] shadow-[0_24px_70px_rgba(0,0,0,0.65)]' 
              : 'bg-white border-[#E2E8F0] shadow-[0_20px_50px_rgba(0,0,0,0.06)]'
          }`}>

            {/* LEFT PANEL - Form Area */}
            <div className={`w-full lg:w-1/2 p-6 sm:p-9 md:p-10 flex flex-col justify-center relative ${
              isDark ? 'bg-[#091714]' : 'bg-white'
            }`}>

              {/* Portal Switcher Bar (/login/student | /login/institution | /login/organization) */}
              <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl mb-5 border ${
                isDark
                  ? 'bg-[#061210] border-[#163830]'
                  : 'bg-[#F1F5F4] border-gray-200/80'
              }`}>
                {Object.values(PORTAL_CONFIG).map((item) => {
                  const isActive = item.key === activePortal;
                  return (
                    <Link
                      key={item.key}
                      to={`/login/${item.key}`}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                        isActive
                          ? isDark
                            ? 'bg-[#0e3831] text-[#2dd4bf] border border-[#2dd4bf]/25 shadow-sm'
                            : 'bg-white text-[#0d9488] border border-teal-500/20 shadow-sm'
                          : isDark
                            ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">{item.icon}</span>
                      <span>{item.tabLabel}</span>
                    </Link>
                  );
                })}
              </div>
              
              {/* Badge */}
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest ${
                  isDark 
                    ? 'bg-[#0e3831] text-[#2dd4bf] border border-[#2dd4bf]/20' 
                    : 'bg-[#e6f7f5] text-[#0d9488] border border-[#0d9488]/20'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">{currentPortal.icon}</span>
                  <span>{currentPortal.badge}</span>
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5 mb-5">
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                  isDark ? 'text-white' : 'text-[#0c1f1c]'
                }`}>
                  {currentPortal.title}<span className="text-[#2dd4bf]">.</span>
                </h1>
                <p className={`text-xs sm:text-sm ${
                  isDark ? 'text-[#94a3b8]' : 'text-gray-500'
                }`}>
                  {currentPortal.subtitle}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-medium flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Sign In Form */}
              <form noValidate onSubmit={handleSubmit} className="space-y-4">
                {/* Email Address */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Email address
                  </label>
                  <div className="relative flex items-center">
                    <span className={`material-symbols-outlined absolute left-3.5 text-[18px] pointer-events-none ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      person
                    </span>
                    <input
                      ref={emailInputRef}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      placeholder={currentPortal.placeholder}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl text-xs sm:text-sm outline-none transition-all ${
                        isDark 
                          ? 'bg-[#061210] border border-[#163830] text-white placeholder-gray-500 focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf]' 
                          : 'bg-[#F9FBFA] border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0d9488] focus:bg-white focus:ring-1 focus:ring-[#0d9488]'
                      } ${emailError ? '!border-red-500' : ''}`}
                    />
                  </div>
                  {emailError && (
                    <span className="text-[11px] text-red-400 mt-1 block font-medium">{emailError}</span>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block text-xs font-semibold ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Password
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <span className={`material-symbols-outlined absolute left-3.5 text-[18px] pointer-events-none ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-11 py-3 rounded-xl text-xs sm:text-sm outline-none transition-all ${
                        isDark 
                          ? 'bg-[#061210] border border-[#163830] text-white placeholder-gray-500 focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf]' 
                          : 'bg-[#F9FBFA] border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0d9488] focus:bg-white focus:ring-1 focus:ring-[#0d9488]'
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3.5 p-1 flex items-center justify-center cursor-pointer rounded-lg transition-colors ${
                        isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'
                      }`}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => setShowForgotNotice(!showForgotNotice)}
                      className="text-xs font-semibold text-[#2dd4bf] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {showForgotNotice && (
                    <div className="mt-2 p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 leading-relaxed">
                      {currentPortal.forgotNotice}
                    </div>
                  )}
                </div>

                {/* Primary Sign In Button: Warm Amber CTA */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm bg-[#F59E0B] hover:bg-[#e08e04] text-[#0c1a17] shadow-lg hover:shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Signing In...
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Privacy Shield Separator */}
              <div className="relative flex items-center justify-center my-5">
                <div className={`w-full h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                <div className={`absolute px-3 flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap ${
                  isDark ? 'bg-[#091714] text-gray-400' : 'bg-white text-gray-500'
                }`}>
                  <span className="material-symbols-outlined text-[14px] text-[#2dd4bf]">verified_user</span>
                  <span>Your information is secure and private.</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="text-center space-y-1.5 pt-1">
                <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  New to InternConPH?{' '}
                  <Link to={currentPortal.registerTo} className="text-[#2dd4bf] font-bold hover:underline inline-flex items-center gap-0.5">
                    <span>{currentPortal.registerLabel}</span>
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </Link>
                  {currentPortal.secondaryRegisterTo && (
                    <>
                      {' · '}
                      <Link to={currentPortal.secondaryRegisterTo} className="text-[#F59E0B] font-bold hover:underline inline-flex items-center gap-0.5">
                        <span>{currentPortal.secondaryRegisterLabel}</span>
                      </Link>
                    </>
                  )}
                </p>
                <p className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Need all account types?{' '}
                  <Link to="/get-started" className="underline hover:text-[#2dd4bf]">
                    View all registration portals
                  </Link>
                </p>
              </div>

            </div>

            {/* RIGHT PANEL - Connected Ecosystem Showcase Graphic */}
            <div className={`w-full lg:w-1/2 p-6 sm:p-9 md:p-10 flex flex-col justify-between relative overflow-hidden ${
              isDark 
                ? 'bg-gradient-to-br from-[#0c2a23] via-[#081b16] to-[#040e0c] text-white border-t lg:border-t-0 lg:border-l border-[#163830]' 
                : 'bg-gradient-to-br from-[#dcfce7]/60 via-[#e0f2fe]/50 to-[#ccfbf1]/80 text-[#0c1f1c] border-t lg:border-t-0 lg:border-l border-gray-100'
            }`}>
              
              {/* Background Glow Meshes */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[#2dd4bf]/15 filter blur-3xl pointer-events-none"></div>

              {/* Connected Ecosystem Topology Graphic */}
              <div className="relative w-full max-w-[340px] h-[170px] mx-auto my-auto flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 340 170" fill="none">
                  {/* Glowing Connection Paths */}
                  <path
                    d="M 65 95 C 110 95, 120 45, 170 45 C 220 45, 230 95, 275 95"
                    stroke={isDark ? "#2dd4bf" : "#0d9488"}
                    strokeWidth="2"
                    strokeOpacity={isDark ? "0.6" : "0.5"}
                    strokeDasharray="4 4"
                    className="animate-pulse"
                  />
                  <path
                    d="M 65 95 Q 170 135 275 95"
                    stroke={isDark ? "#2dd4bf" : "#0d9488"}
                    strokeWidth="1.5"
                    strokeOpacity={isDark ? "0.35" : "0.3"}
                  />
                  {/* Glowing Signal Nodes */}
                  <circle cx="115" cy="65" r="3.5" fill={isDark ? "#5eead4" : "#14b8a6"} className="animate-ping" style={{ animationDuration: '3s' }} />
                  <circle cx="225" cy="65" r="3.5" fill={isDark ? "#5eead4" : "#14b8a6"} className="animate-ping" style={{ animationDuration: '4s' }} />
                  <circle cx="170" cy="120" r="3" fill="#F59E0B" />
                </svg>

                {/* Left Node: Company / Hiring Organization */}
                <Link
                  to="/login/organization"
                  title="Hiring Organization Login Portal"
                  className="absolute left-[35px] top-[65px] flex flex-col items-center group"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    activePortal === 'organization' ? 'scale-110 ring-4 ring-[#2dd4bf]/30' : 'opacity-80 group-hover:opacity-100'
                  } ${
                    isDark 
                      ? 'bg-[#081c18] border-2 border-[#2dd4bf] text-[#2dd4bf] shadow-[0_0_22px_rgba(45,212,191,0.5)]' 
                      : 'bg-white border-2 border-[#0d9488] text-[#0d9488] shadow-[0_6px_20px_rgba(13,148,136,0.25)]'
                  }`}>
                    <span className="material-symbols-outlined text-[24px]">apartment</span>
                  </div>
                </Link>

                {/* Center Top Node: Student / Graduation Cap */}
                <Link
                  to="/login/student"
                  title="Student Login Portal"
                  className="absolute left-1/2 -translate-x-1/2 top-[15px] flex flex-col items-center group"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    activePortal === 'student' ? 'scale-110 ring-4 ring-[#2dd4bf]/30' : 'opacity-80 group-hover:opacity-100'
                  } ${
                    isDark 
                      ? 'bg-[#081c18] border-2 border-[#2dd4bf] text-[#2dd4bf] shadow-[0_0_26px_rgba(45,212,191,0.6)]' 
                      : 'bg-white border-2 border-[#0d9488] text-[#0d9488] shadow-[0_8px_24px_rgba(13,148,136,0.3)]'
                  }`}>
                    <span className="material-symbols-outlined text-[26px]">school</span>
                  </div>
                </Link>

                {/* Right Node: Institution / University */}
                <Link
                  to="/login/institution"
                  title="Institution Login Portal"
                  className="absolute right-[35px] top-[65px] flex flex-col items-center group"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    activePortal === 'institution' ? 'scale-110 ring-4 ring-[#F59E0B]/30' : 'opacity-80 group-hover:opacity-100'
                  } ${
                    isDark 
                      ? 'bg-[#211403] border-2 border-[#F59E0B] text-[#F59E0B] shadow-[0_0_22px_rgba(245,158,11,0.5)]' 
                      : 'bg-white border-2 border-[#F59E0B] text-[#F59E0B] shadow-[0_6px_20px_rgba(245,158,11,0.25)]'
                  }`}>
                    <span className="material-symbols-outlined text-[24px]">account_balance</span>
                  </div>
                </Link>
              </div>

              {/* Bottom Headline & Subtitle */}
              <div className="relative z-10 pt-4 space-y-2">
                <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight ${
                  isDark ? 'text-white' : 'text-[#0c1f1c]'
                }`}>
                  Your next opportunity <span className="text-[#2dd4bf]">starts here.</span>
                </h2>
                <p className={`text-xs sm:text-sm leading-relaxed max-w-sm ${
                  isDark ? 'text-gray-300/80' : 'text-gray-600'
                }`}>
                  One platform. Students, organizations, and institutions—connected.
                </p>
              </div>

              {/* 3 Value Pillars */}
              <div className={`relative z-10 mt-6 pt-5 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
                isDark ? 'border-white/10 text-gray-300' : 'border-black/5 text-gray-700'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-teal-500/20 text-[#2dd4bf]' : 'bg-teal-100 text-[#0d9488]'
                  }`}>
                    <span className="material-symbols-outlined text-[15px]">verified_user</span>
                  </span>
                  <span className="font-medium text-[11px] sm:text-xs">Verified opportunities</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-teal-500/20 text-[#2dd4bf]' : 'bg-teal-100 text-[#0d9488]'
                  }`}>
                    <span className="material-symbols-outlined text-[15px]">bar_chart</span>
                  </span>
                  <span className="font-medium text-[11px] sm:text-xs">OJT progress tracking</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-teal-500/20 text-[#2dd4bf]' : 'bg-teal-100 text-[#0d9488]'
                  }`}>
                    <span className="material-symbols-outlined text-[15px]">groups</span>
                  </span>
                  <span className="font-medium text-[11px] sm:text-xs">Career connections</span>
                </div>
              </div>

            </div>

          </div>
        </main>

        {/* BOTTOM EMPTY BAR TO MAINTAIN SPACING */}
        <div className="py-2"></div>
      </div>
    </PageTransition>
  );
}
