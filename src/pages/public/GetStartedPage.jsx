import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import api from '../../api/client';
import PageTransition from '../../components/Layout/PageTransition';
import PasswordStrengthMeter from '../../components/Auth/PasswordStrengthMeter';

export default function GetStartedPage() {
  const navigate = useNavigate();
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [modalType, setModalType] = useState('staff'); // 'staff' or 'mentor'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [codeForm, setCodeForm] = useState({
    access_code: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (codeForm.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (codeForm.password !== codeForm.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = modalType === 'staff' ? '/auth/register/staff' : '/auth/register/mentor';
      const res = await api.post(endpoint, codeForm);
      setLoading(false);

      if (res.success) {
        alert(`${modalType === 'staff' ? 'Institution Staff' : 'Workplace Mentor'} registration submitted successfully! Your account will be verified by your director/HR.`);
        setShowCodeModal(false);
        navigate('/login');
      } else {
        setError(res.message || 'Passcode verification failed.');
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Server error.');
    }
  };

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow py-10 sm:py-16 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto flex flex-col justify-center">
        <div className="text-center space-y-3 mb-8 sm:mb-12">
          <span className="text-xs font-bold text-vibrant-orange uppercase tracking-wider">Choose Your Portal</span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface">How would you like to join InternConPH?</h1>
          <p className="text-on-surface-variant text-sm max-w-xl mx-auto">
            Select the role that describes you to start your verified onboarding process in the Philippine OJT & Recruitment ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* STUDENT */}
          <Link
            to="/register/student"
            className="bento-card group flex flex-col items-center text-center p-5 sm:p-8 hover:border-vibrant-orange transition-all transform hover:-translate-y-1"
          >
            <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[28px] sm:text-[32px]">school</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-on-surface mb-2">College Student</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
              Register using your university-issued access code. Apply to verified OJT openings, log attendance, and earn accredited hours.
            </p>
            <span className="mt-auto px-5 py-2 bg-vibrant-orange text-white rounded-full text-xs font-bold group-hover:bg-deep-orange transition-colors">
              Register with Access Code →
            </span>
          </Link>

          {/* ORGANIZATION (HR MAIN) */}
          <Link
            to="/register/organization"
            className="bento-card group flex flex-col items-center text-center p-5 sm:p-8 hover:border-pinoy-green transition-all transform hover:-translate-y-1"
          >
            <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-green-tint text-pinoy-green flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[28px] sm:text-[32px]">business</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-on-surface mb-2">Hiring Organization (HR)</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
              Create your organization main account (SEC/DTI verified), deploy OJT offers to partner institutions, and manage job posts.
            </p>
            <span className="mt-auto px-5 py-2 bg-pinoy-green text-white rounded-full text-xs font-bold hover:opacity-90 transition-opacity">
              Register Employer Main →
            </span>
          </Link>

          {/* INSTITUTION (DIRECTOR MAIN) */}
          <Link
            to="/register/institution"
            className="bento-card group flex flex-col items-center text-center p-5 sm:p-8 hover:border-vibrant-orange transition-all transform hover:-translate-y-1"
          >
            <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[28px] sm:text-[32px]">account_balance</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-on-surface mb-2">Institution Director</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
              Create the university's main account (CHED/TESDA accredited), manage programs, and issue access codes for coordinators and deans.
            </p>
            <span className="mt-auto px-5 py-2 bg-vibrant-orange text-white rounded-full text-xs font-bold group-hover:bg-deep-orange transition-colors">
              Register University Main →
            </span>
          </Link>
        </div>

        {/* SECONDARY PASSCODE REGISTRATION CARDS */}
        <div className="p-4 sm:p-6 rounded-2xl bg-surface-container border border-outline-variant grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-container-lowest text-vibrant-orange flex items-center justify-center shrink-0 border border-outline-variant">
              <span className="material-symbols-outlined text-2xl">badge</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-on-surface">Institution Staff / Coordinator</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Have a Director-issued Passcode? Register as OJT Supervisor, Registrar, Guidance Counselor, or Dean.
              </p>
              <Link
                to="/register/staff"
                className="mt-2 text-xs font-bold text-vibrant-orange hover:underline inline-flex items-center gap-1"
              >
                Complete Staff Registration <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-container-lowest text-pinoy-green flex items-center justify-center shrink-0 border border-outline-variant">
              <span className="material-symbols-outlined text-2xl">supervised_user_circle</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-on-surface">Workplace Mentor</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Have an HR-issued Passcode? Register to monitor student attendance, verify rendered hours, and submit evaluations.
              </p>
              <Link
                to="/register/mentor"
                className="mt-2 text-xs font-bold text-pinoy-green hover:underline inline-flex items-center gap-1"
              >
                Complete Mentor Registration <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>

        {/* PASSCODE REGISTRATION MODAL */}
        {showCodeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-surface max-w-lg w-full rounded-2xl shadow-2xl border border-outline-variant overflow-hidden max-h-[90dvh] flex flex-col">
              <div className="p-5 sm:p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${modalType === 'staff' ? 'bg-orange-tint text-vibrant-orange' : 'bg-green-tint text-pinoy-green'} flex items-center justify-center font-bold`}>
                    <span className="material-symbols-outlined">{modalType === 'staff' ? 'badge' : 'supervised_user_circle'}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">
                      {modalType === 'staff' ? 'Institution Staff Registration' : 'Workplace Mentor Registration'}
                    </h3>
                    <p className="text-xs text-on-surface-variant">Enter the passcode provided by your Director or HR</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCodeModal(false)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <form onSubmit={handleCodeSubmit} className="p-5 sm:p-6 space-y-4 text-sm overflow-y-auto">
                {error && (
                  <div className="p-3 bg-error-container text-error rounded-lg text-xs font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
                    {modalType === 'staff' ? 'Director-Issued Staff Passcode *' : 'HR-Issued Mentor Passcode *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PASS-STF-2026-XXXX"
                    value={codeForm.access_code}
                    onChange={(e) => setCodeForm({ ...codeForm, access_code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-mono font-bold text-sm tracking-wider outline-none focus:ring-2 focus:ring-vibrant-orange"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={codeForm.first_name}
                      onChange={(e) => setCodeForm({ ...codeForm, first_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface text-sm outline-none focus:ring-2 focus:ring-vibrant-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={codeForm.last_name}
                      onChange={(e) => setCodeForm({ ...codeForm, last_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface text-sm outline-none focus:ring-2 focus:ring-vibrant-orange"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="official.email@organization.ph"
                    value={codeForm.email}
                    onChange={(e) => setCodeForm({ ...codeForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface text-sm outline-none focus:ring-2 focus:ring-vibrant-orange"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={codeForm.password}
                        onChange={(e) => setCodeForm({ ...codeForm, password: e.target.value })}
                        className="w-full px-3 pr-10 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface text-sm outline-none focus:ring-2 focus:ring-vibrant-orange"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1 flex items-center justify-center"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    <PasswordStrengthMeter password={codeForm.password} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={codeForm.confirm_password}
                        onChange={(e) => setCodeForm({ ...codeForm, confirm_password: e.target.value })}
                        className={`w-full px-3 pr-10 py-2 rounded-lg border bg-surface-container-low text-on-surface text-sm outline-none transition-all ${
                          codeForm.confirm_password && codeForm.password !== codeForm.confirm_password
                            ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-400'
                            : 'border-outline-variant focus:ring-2 focus:ring-vibrant-orange'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1 flex items-center justify-center"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {codeForm.confirm_password && codeForm.password !== codeForm.confirm_password && (
                      <span className="text-[10px] text-red-500 font-bold mt-1 block">Passwords do not match.</span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-vibrant-orange text-white rounded-lg font-bold text-sm hover:bg-deep-orange transition-colors shadow-sm disabled:opacity-50 mt-4"
                >
                  {loading ? 'Validating Passcode...' : 'Complete Passcode Registration'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
      </div>
    </PageTransition>
  );
}
