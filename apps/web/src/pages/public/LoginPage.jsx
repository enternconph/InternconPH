import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import PageTransition from '../../components/Layout/PageTransition';
import EmailInput from '../../components/ui/EmailInput';
import { validateEmail } from '../../utils/email';
import { getApiServerUrl, testServerConnection, autoDiscoverServerUrl } from '../../api/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef(null);

  // Server settings modal state
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiServerUrl() || 'http://192.168.254.137:3000');
  const [testingServer, setTestingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState(null); // { success: boolean, msg: string }

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

    try {
      const res = await login(email, password);
      if (res.success && res.user) {
        navigate(getDashboardUrl(res.user.role_name || res.user.role));
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError('An unexpected error occurred during login.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (targetUrl = serverUrl) => {
    setTestingServer(true);
    setServerStatus(null);
    const works = await testServerConnection(targetUrl);
    setTestingServer(false);
    if (works) {
      setServerStatus({ success: true, msg: 'Server connected successfully!' });
    } else {
      setServerStatus({ success: false, msg: 'Could not reach server at this address.' });
    }
    return works;
  };

  const handleAutoFindServer = async () => {
    setTestingServer(true);
    setServerStatus(null);
    const discovered = await autoDiscoverServerUrl();
    setTestingServer(false);
    if (discovered) {
      setServerUrl(discovered);
      setServerStatus({ success: true, msg: `Auto-connected to ${discovered}!` });
    } else {
      setServerStatus({ success: false, msg: 'Auto-discovery failed. Ensure your backend server is running.' });
    }
  };

  const handleSaveServerUrl = async () => {
    const clean = serverUrl.trim().replace(/\/+$/, '');
    if (clean) {
      localStorage.setItem('custom_server_url', clean);
      localStorage.setItem('server_url', clean);
    } else {
      localStorage.removeItem('custom_server_url');
      localStorage.removeItem('server_url');
    }
    setError('');
    setShowServerModal(false);
  };

  return (
    <PageTransition>
      <div className="min-h-[100dvh] bg-surface-container-lowest flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 relative overflow-y-auto overflow-x-hidden">
        
        {/* Decorative background blobs */}
        <div className="fixed top-[-10%] left-[-5%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-orange-tint rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none"></div>
        <div className="fixed bottom-[-10%] right-[-5%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-green-tint rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none"></div>

        {/* Floating Card */}
        <div className="w-full max-w-[1000px] bg-surface rounded-2xl sm:rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col lg:flex-row relative z-10 border border-outline-variant/30 min-h-0 lg:min-h-[600px] overflow-hidden my-auto">
          
          {/* Top Config Gear Button */}
          <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20">
            <button
              type="button"
              onClick={() => {
                setServerUrl(getApiServerUrl() || 'http://192.168.254.137:3000');
                setServerStatus(null);
                setShowServerModal(true);
              }}
              className="p-2 sm:p-2.5 text-on-surface-variant hover:text-vibrant-orange hover:bg-surface-container/80 rounded-xl transition-all cursor-pointer backdrop-blur-md"
              title="Configure Server Address"
              aria-label="Server Settings"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px] block">settings</span>
            </button>
          </div>

          {/* LEFT PANEL - Form */}
          <div className="w-full lg:w-1/2 p-6 sm:p-8 md:p-10 lg:p-14 flex flex-col relative bg-surface">
            
            {/* Top Navigation: Theme Toggle */}
            <div className="absolute top-3 left-3 sm:top-5 sm:left-5 flex items-center justify-start z-20">
              <button
                type="button"
                id="login-theme-toggle-btn"
                onClick={toggleTheme}
                className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
                  isDark
                    ? 'bg-primary-container/20 text-primary-container hover:bg-primary-container/30 border border-primary-container/40'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Theme Mode"
              >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px] block">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
            </div>

            <div className="flex-grow flex flex-col justify-center mt-12 sm:mt-10 lg:mt-8">
              {/* Logo & Title */}
              <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3 mb-8 sm:mb-10">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <img src="/logo.png" alt="internconPH" className="h-8 sm:h-10 w-auto object-contain" decoding="async" />
                  <span className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">ínternconᵖʰ</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Welcome Back</h1>
                <p className="text-xs sm:text-sm text-on-surface-variant">Sign in to your InternConPH account</p>
              </div>

              {error && (
                <div className="p-3 mb-5 sm:mb-6 bg-error-container text-error rounded-xl text-xs font-medium flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">error</span>
                    <span>{error}</span>
                  </div>
                  {error.toLowerCase().includes('server') && (
                    <button
                      type="button"
                      onClick={() => {
                        setServerUrl(getApiServerUrl() || 'http://192.168.254.137:3000');
                        setServerStatus(null);
                        setShowServerModal(true);
                      }}
                      className="self-end text-xs font-bold text-vibrant-orange hover:underline px-3 py-1.5 rounded-lg border border-vibrant-orange/30 shadow-sm cursor-pointer transition-all"
                    >
                      Configure Server IP
                    </button>
                  )}
                </div>
              )}

              <form noValidate onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
                    placeholder="username@gmail.com"
                    className="py-3 sm:py-3.5 bg-surface-container-lowest text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-on-surface-variant uppercase mb-1.5">Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] sm:text-[20px]">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 sm:pl-11 pr-11 py-3 sm:py-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all focus:border-vibrant-orange"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPassword((prev) => !prev);
                      }}
                      className="absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1.5 flex items-center justify-center cursor-pointer rounded-lg hover:bg-surface-container"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px] pointer-events-none select-none">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 sm:py-4 mt-4 sm:mt-6 bg-vibrant-orange text-white rounded-xl font-bold text-sm hover:bg-deep-orange transition-all disabled:opacity-50 shadow-md hover:shadow-lg active:scale-[0.98] flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px] sm:text-[18px]">progress_activity</span>
                      Authenticating...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="pt-6 sm:pt-8 text-center">
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
          <div className="hidden lg:block lg:w-1/2 relative bg-surface-container-high overflow-hidden">
            <img 
              src="/photo/building.jpg" 
              alt="Login Building" 
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.src = '/building.jpg';
              }}
              className="absolute inset-0 w-full h-full object-cover transition-transform hover:scale-105"
            />
            {/* Overlay to ensure image blends elegantly */}
            <div className="absolute inset-0 bg-gradient-to-tr from-vibrant-orange/20 to-transparent mix-blend-overlay"></div>
          </div>

        </div>

        {/* Server Settings Modal */}
        {showServerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative overflow-hidden space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-vibrant-orange/10 rounded-xl text-vibrant-orange">
                    <span className="material-symbols-outlined text-[22px] block">dns</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface">Server Connection Settings</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowServerModal(false)}
                  className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] block">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Enter the IP address and port of your running backend server (e.g. Laragon or Node Express server).
                </p>

                {/* Server URL Input */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    Backend Server URL
                  </label>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => {
                      setServerUrl(e.target.value);
                      setServerStatus(null);
                    }}
                    placeholder="http://192.168.254.137:3000"
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm outline-none focus:ring-2 focus:ring-vibrant-orange/30 focus:border-vibrant-orange font-mono transition-all"
                  />
                </div>

                {/* Presets & Auto-Find */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Quick Presets:
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoFindServer}
                      disabled={testingServer}
                      className="text-[11px] font-extrabold text-vibrant-orange hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">search</span>
                      <span>Auto-Find Server</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'USB Cable (ADB Reverse)', url: 'http://localhost:3000' },
                      { label: 'Local Wi-Fi Host', url: 'http://192.168.254.137:3000' },
                      { label: 'Android Emulator', url: 'http://10.0.2.2:3000' }
                    ].map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => {
                          setServerUrl(preset.url);
                          setServerStatus(null);
                          handleTestConnection(preset.url);
                        }}
                        className="px-3 py-1.5 text-xs font-bold bg-surface-container hover:bg-vibrant-orange/15 hover:text-vibrant-orange text-on-surface-variant rounded-lg border border-outline-variant/60 transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Connection Status Banner */}
                {serverStatus && (
                  <div
                    className={`p-3.5 rounded-xl text-sm font-bold flex items-center gap-2.5 shadow-sm animate-fade-in ${
                      serverStatus.success
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                        : 'bg-error-container/90 text-error border border-error/30'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] shrink-0">
                      {serverStatus.success ? 'check_circle' : 'cancel'}
                    </span>
                    <span>{serverStatus.msg}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/50">
                <button
                  type="button"
                  onClick={() => handleTestConnection()}
                  disabled={testingServer}
                  className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {testingServer ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">wifi_find</span>
                      <span>Test Ping</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveServerUrl}
                  className="px-6 py-2.5 bg-vibrant-orange text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
