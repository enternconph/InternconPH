import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import PageTransition from '../../components/Layout/PageTransition';
import EmailInput from '../../components/ui/EmailInput';
import { validateEmail } from '../../utils/email';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef(null);

  const { login, getDashboardUrl } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

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

    const res = await login(email, password);
    setLoading(false);

    if (res.success && res.user) {
      navigate(getDashboardUrl(res.user.role_name || res.user.role));
    } else {
      setError(res.message || 'Invalid email or password.');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-[100dvh] bg-surface-container-lowest flex items-center justify-center p-3 sm:p-5 md:p-6 relative overflow-y-auto">
        
        {/* Decorative background blobs */}
        <div className="absolute top-[-10%] left-[-5%] w-[450px] h-[450px] bg-orange-tint rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] bg-green-tint rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none"></div>

        {/* Floating Card */}
        <div className="w-full max-w-[880px] bg-surface rounded-2xl sm:rounded-[1.75rem] shadow-[0_16px_40px_rgba(0,0,0,0.08)] overflow-hidden flex relative z-10 border border-outline-variant/30 my-auto">
          
          {/* LEFT PANEL - Form */}
          <div className="w-full lg:w-1/2 p-5 sm:p-7 md:p-8 lg:p-9 flex flex-col justify-between relative bg-surface">
            
            {/* Top Navigation: Back Button & Theme Toggle */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <Link 
                to="/" 
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-on-surface-variant hover:text-vibrant-orange transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back
              </Link>
              <button
                type="button"
                id="login-theme-toggle-btn"
                onClick={toggleTheme}
                className={`p-1.5 sm:p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                  isDark
                    ? 'bg-primary-container/20 text-primary-container hover:bg-primary-container/30 border border-primary-container/40'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Aura Radiant Dark Mode'}
                aria-label="Toggle Theme Mode"
              >
                <span className="material-symbols-outlined text-[17px] sm:text-[18px] block">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
            </div>

            <div className="flex-grow flex flex-col justify-center">
              {/* Logo & Title */}
              <div className="flex flex-col items-center text-center space-y-1.5 mb-5 sm:mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <img src="/logo.png" alt="internconPH" className="h-8 sm:h-9 w-auto object-contain" decoding="async" />
                  <span className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">ínternconᵖʰ</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Welcome Back</h1>
                <p className="text-xs sm:text-sm text-on-surface-variant">Sign in to your InternConPH account</p>
              </div>

              {error && (
                <div className="p-2.5 sm:p-3 mb-4 bg-error-container text-error rounded-xl text-xs font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <form noValidate onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                <div>
                  <EmailInput
                    label="Email Address"
                    required
                    showIcon
                    icon="person"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    error={emailError}
                    onErrorChange={setEmailError}
                    ref={emailInputRef}
                    placeholder="name@university.edu.ph"
                    className="py-2.5 sm:py-3 bg-surface-container-lowest text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] sm:text-[20px]">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-xs sm:text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all focus:border-vibrant-orange"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPassword((prev) => !prev);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1 flex items-center justify-center cursor-pointer rounded-lg hover:bg-surface-container"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-[18px] pointer-events-none select-none">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 sm:py-3.5 mt-4 sm:mt-5 bg-vibrant-orange text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-deep-orange transition-all disabled:opacity-50 shadow-md hover:shadow-lg active:scale-[0.98] flex justify-center items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Authenticating...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="pt-4 sm:pt-5 text-center">
                <p className="text-xs sm:text-sm text-on-surface-variant">
                  Don't have an account yet?{' '}
                  <Link to="/get-started" className="text-vibrant-orange font-bold hover:underline">
                    Get Started
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Image */}
          <div className="hidden lg:block lg:w-1/2 relative bg-surface-container-high overflow-hidden min-h-[460px]">
            <img 
              src="/photo/building.jpg" 
              alt="Login Building" 
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.src = '/building.jpg';
              }}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
            {/* Overlay to ensure image blends elegantly */}
            <div className="absolute inset-0 bg-gradient-to-tr from-vibrant-orange/20 to-transparent mix-blend-overlay"></div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
