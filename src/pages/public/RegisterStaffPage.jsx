import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import PageTransition from '../../components/Layout/PageTransition';
import PhAddressSelector from '../../components/ui/PhAddressSelector';
import PhPhoneInput, { isValidPhMobile } from '../../components/ui/PhPhoneInput';
import PasswordStrengthMeter from '../../components/Auth/PasswordStrengthMeter';
import { validateRequiredFields, handleServerValidationError, setFieldValidationError } from '../../utils/registrationValidation';
import { MissingFieldsBanner, FieldErrorMessage, getFieldValidationClass } from '../../components/Auth/RegistrationAlerts';
import EmailInput from '../../components/ui/EmailInput';
import { validateEmail } from '../../utils/email';

export default function RegisterStaffPage() {
  const navigate = useNavigate();
  const emailInputRef = useRef(null);
  const [institutions, setInstitutions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [missingList, setMissingList] = useState([]);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    access_code: '',
    institution_id: '',
    program_id: '',
    title: 'Prof.', // Dr., Prof., Engr., Dean, Atty., Mr., Ms.
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    employee_id: '',
    staff_position: 'ojt_supervisor', // ojt_supervisor, registrar, guidance_counselor, dean
    department_name: '',
    office_location: '',
    contact_number: '',
    email: '',
    password: '',
    confirm_password: ''
  });

  const [address, setAddress] = useState({
    region: '', regionCode: '',
    province: '', provinceCode: '',
    city: '', cityCode: '',
    barangay: '', barangayCode: '',
    postalCode: '',
    street: ''
  });

  useEffect(() => {
    // Fetch public list of active institutions
    api.get('/public/institutions').then((res) => {
      if (res.success && res.data) {
        setInstitutions(res.data);
      }
    }).catch(console.error);
  }, []);

  const handleInstitutionChange = async (e) => {
    const instId = e.target.value;
    setFormData((prev) => ({ ...prev, institution_id: instId, program_id: '', department_name: '' }));
    
    if (instId) {
      setLoadingPrograms(true);
      try {
        const res = await api.get(`/public/institutions/${instId}/programs`);
        if (res.success && res.data) {
          setPrograms(res.data);
        } else {
          setPrograms([]);
        }
      } catch (err) {
        console.error('Error fetching university programs:', err);
        setPrograms([]);
      } finally {
        setLoadingPrograms(false);
      }
    } else {
      setPrograms([]);
      setLoadingPrograms(false);
    }
  };

  const handleProgramChange = (e) => {
    const pId = e.target.value;
    const selectedProg = programs.find((p) => String(p.program_id) === String(pId));
    
    setFormData((prev) => ({
      ...prev,
      program_id: pId,
      department_name: selectedProg?.department || prev.department_name
    }));
  };

  const clearFieldError = (key) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setMissingList((prev) => prev.filter((item) => item.key !== key));
    }
  };

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Comprehensive required fields check
    const validation = validateRequiredFields([
      { key: 'access_code', label: 'Access Passcode', value: formData.access_code },
      { key: 'institution_id', label: 'Institution', value: formData.institution_id },
      { key: 'staff_position', label: 'Staff Role', value: formData.staff_position },
      { key: 'first_name', label: 'First Name', value: formData.first_name },
      { key: 'last_name', label: 'Last Name', value: formData.last_name },
      { key: 'employee_id', label: 'Employee ID', value: formData.employee_id },
      { key: 'email', label: 'Institutional Email', value: formData.email },
      { key: 'password', label: 'Password', value: formData.password },
      { key: 'confirm_password', label: 'Confirm Password', value: formData.confirm_password }
    ]);

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setMissingList(validation.missingList);
      return;
    }

    setFieldErrors({});
    setMissingList([]);

    if (formData.password.length < 8) {
      setFieldValidationError('password', 'Password', 'Password must be at least 8 characters long.', setFieldErrors, setMissingList, setError);
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setFieldValidationError('confirm_password', 'Confirm Password', 'Passwords do not match.', setFieldErrors, setMissingList, setError);
      return;
    }

    if (formData.contact_number && !isValidPhMobile(formData.contact_number)) {
      setFieldValidationError('contact_number', 'Mobile Number', 'Please provide a valid 10-digit Philippine mobile number starting with 9 (e.g., +63 917 123 4567).', setFieldErrors, setMissingList, setError);
      return;
    }

    const emailErr = validateEmail(formData.email, { required: true });
    if (emailErr) {
      setFieldValidationError('email', 'Institutional Email', emailErr, setFieldErrors, setMissingList, setError);
      emailInputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register/staff', {
        ...formData,
        address: JSON.stringify(address)
      });
      setLoading(false);

      if (res.success) {
        alert('Staff registration submitted successfully! Your Institution Director will review and activate your departmental dashboard.');
        navigate('/login');
      } else {
        handleServerValidationError(
          res.message || 'Staff registration failed.',
          setFieldErrors,
          setMissingList,
          setError
        );
      }
    } catch (err) {
      setLoading(false);
      handleServerValidationError(
        err.message || 'Server error.',
        setFieldErrors,
        setMissingList,
        setError
      );
    }
  };

  const selectedInstObj = institutions.find((i) => String(i.institution_id) === String(formData.institution_id));

  return (
    <PageTransition>
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        
        {/* Decorative background blobs */}
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-orange-tint rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-green-tint rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>

        {/* Floating Card */}
        <div className="w-full max-w-[1100px] bg-surface rounded-2xl sm:rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex relative z-10 border border-outline-variant/30 min-h-0 lg:min-h-[700px]">
          
          {/* LEFT PANEL - Form */}
          <div className="w-full lg:w-3/5 p-4 sm:p-8 md:p-10 lg:p-12 flex flex-col relative bg-surface max-h-none lg:max-h-[85vh] overflow-y-auto custom-scrollbar">
            
            {/* Top Back Button */}
            <Link 
              to="/get-started" 
              className="inline-flex items-center gap-1.5 text-sm font-bold text-on-surface-variant hover:text-vibrant-orange transition-colors mb-6 w-fit"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Roles
            </Link>

            <div className="flex-grow flex flex-col justify-center">
              {/* Header */}
              <div className="space-y-3 mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-tint text-vibrant-orange font-bold text-xs mb-2">
                  <span className="material-symbols-outlined text-[15px]">badge</span>
                  Authorized Institution Staff
                </div>
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">Staff Registration</h1>
                <p className="text-sm text-on-surface-variant">For OJT Supervisors, Registrars, Guidance Counselors, and College Deans. Requires a Director-issued Passcode.</p>
              </div>

              {error && (
                <div className="p-3 mb-6 bg-error-container text-error rounded-xl text-xs font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <MissingFieldsBanner missingList={missingList} onClear={() => { setMissingList([]); setFieldErrors({}); }} />

              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                
                {/* PASSCODE */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">Verification</h3>
                  <div className="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-3">
                    <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">Director-Issued Access Passcode *</label>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">Enter the passcode generated and sent to you by your University / Institution Director.</p>
                    <input
                      type="text"
                      required
                      data-field="access_code"
                      placeholder="e.g. INST-SUP-XXXXX"
                      value={formData.access_code}
                      onChange={(e) => { handleFieldChange('access_code', e.target.value.toUpperCase()); }}
                      className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface font-mono font-bold text-sm tracking-wider outline-none transition-all ${getFieldValidationClass(!!fieldErrors.access_code)}`}
                    />
                    <FieldErrorMessage error={fieldErrors.access_code} />
                  </div>
                </div>

                {/* INSTITUTION & ROLE */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">Position & Department</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Select Institution *</label>
                      <select
                        required
                        data-field="institution_id"
                        value={formData.institution_id}
                        onChange={(e) => { clearFieldError('institution_id'); handleInstitutionChange(e); }}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.institution_id)}`}
                      >
                        <option value="">Choose Institution...</option>
                        {institutions.map((inst) => (
                          <option key={inst.institution_id} value={inst.institution_id}>
                            {inst.institution_name} ({inst.institution_code})
                          </option>
                        ))}
                      </select>
                      <FieldErrorMessage error={fieldErrors.institution_id} />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Staff Role *</label>
                      <select
                        required
                        data-field="staff_position"
                        value={formData.staff_position}
                        onChange={(e) => handleFieldChange('staff_position', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.staff_position)}`}
                      >
                        <option value="ojt_supervisor">OJT Supervisor / Adviser</option>
                        <option value="registrar">Registrar</option>
                        <option value="guidance_counselor">Guidance Counselor</option>
                        <option value="dean">College Dean</option>
                      </select>
                      <FieldErrorMessage error={fieldErrors.staff_position} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-on-surface-variant uppercase">Assigned Program</label>
                        {loadingPrograms && (
                          <span className="text-[10px] text-vibrant-orange font-bold animate-pulse">Loading...</span>
                        )}
                      </div>
                      <select
                        value={formData.program_id}
                        onChange={handleProgramChange}
                        disabled={!formData.institution_id || loadingPrograms}
                        className={`w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all ${
                          !formData.institution_id ? 'opacity-60 cursor-not-allowed bg-surface-container' : ''
                        }`}
                      >
                        {!formData.institution_id ? (
                          <option value="">— Select an Institution first —</option>
                        ) : loadingPrograms ? (
                          <option value="">Fetching programs...</option>
                        ) : programs.length === 0 ? (
                          <option value="">All Programs / Institution-Wide</option>
                        ) : (
                          <>
                            <option value="">All Programs / Institution-Wide</option>
                            <optgroup label={`${selectedInstObj?.institution_code || 'University'} Programs`}>
                              {programs.map((prog) => (
                                <option key={prog.program_id} value={prog.program_id}>
                                  {prog.program_code ? `[${prog.program_code}] ` : ''}{prog.program_name}
                                </option>
                              ))}
                            </optgroup>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Department Name</label>
                      <input
                        type="text"
                        placeholder="e.g. College of Computer Studies"
                        value={formData.department_name}
                        onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* PERSONAL INFO */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">Faculty Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Title</label>
                      <select
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all"
                      >
                        <option value="Prof.">Prof.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Engr.">Engr.</option>
                        <option value="Dean">Dean</option>
                        <option value="Atty.">Atty.</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">First Name *</label>
                      <input
                        type="text"
                        required
                        data-field="first_name"
                        placeholder="Juan"
                        value={formData.first_name}
                        onChange={(e) => handleFieldChange('first_name', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.first_name)}`}
                      />
                      <FieldErrorMessage error={fieldErrors.first_name} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Middle</label>
                      <input
                        type="text"
                        placeholder="Santos"
                        value={formData.middle_name}
                        onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Last Name *</label>
                      <input
                        type="text"
                        required
                        data-field="last_name"
                        placeholder="Dela Cruz"
                        value={formData.last_name}
                        onChange={(e) => handleFieldChange('last_name', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.last_name)}`}
                      />
                      <FieldErrorMessage error={fieldErrors.last_name} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Employee ID *</label>
                      <input
                        type="text"
                        required
                        data-field="employee_id"
                        placeholder="FAC-2026-089"
                        value={formData.employee_id}
                        onChange={(e) => handleFieldChange('employee_id', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.employee_id)}`}
                      />
                      <FieldErrorMessage error={fieldErrors.employee_id} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Suffix</label>
                      <input
                        type="text"
                        placeholder="PhD, MIT"
                        value={formData.suffix}
                        onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all"
                      />
                    </div>
                    <div>
                      <PhPhoneInput
                        label="Contact No."
                        value={formData.contact_number}
                        onChange={(val) => setFormData({ ...formData, contact_number: val })}
                        placeholder="917 123 4567"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">Complete Address (Philippines)</h3>
                  <PhAddressSelector 
                    value={address} 
                    onChange={(field, val) => setAddress(prev => ({ ...prev, [field]: val }))} 
                  />
                </div>

                {/* LOGIN CREDENTIALS */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">Login Credentials</h3>
                  
                  <div>
                    <EmailInput
                      label="Institutional Email"
                      required
                      placeholder="j.delacruz@university.edu.ph"
                      value={formData.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      error={fieldErrors.email}
                      onErrorChange={(err) => {
                        if (!err) clearFieldError('email');
                        else setFieldErrors((prev) => ({ ...prev, email: err }));
                      }}
                      ref={emailInputRef}
                      className="bg-surface-container-lowest text-on-surface"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Password *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          data-field="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => handleFieldChange('password', e.target.value)}
                          className={`w-full px-4 pr-11 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.password)}`}
                        />
                        <FieldErrorMessage error={fieldErrors.password} />
                        <button
                          type="button"
                          tabIndex={-1}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            setShowPassword((prev) => !prev);
                          }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1.5 flex items-center justify-center cursor-pointer rounded-lg hover:bg-surface-container"
                          title={showPassword ? 'Hide password' : 'Show password'}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          <span className="material-symbols-outlined text-[20px] pointer-events-none select-none">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      {/* Password Strength Meter */}
                      <PasswordStrengthMeter password={formData.password} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Confirm Password *</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          data-field="confirm_password"
                          placeholder="••••••••"
                          value={formData.confirm_password}
                          onChange={(e) => handleFieldChange('confirm_password', e.target.value)}
                          className={`w-full px-4 pr-11 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${
                            formData.confirm_password && formData.password !== formData.confirm_password
                              ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-400'
                              : 'border-outline-variant focus:ring-2 focus:ring-vibrant-orange'
                          }`}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            setShowConfirmPassword((prev) => !prev);
                          }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1.5 flex items-center justify-center cursor-pointer rounded-lg hover:bg-surface-container"
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          <span className="material-symbols-outlined text-[20px] pointer-events-none select-none">
                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      {formData.confirm_password && formData.password !== formData.confirm_password && (
                        <span className="text-[10px] text-red-500 font-bold mt-1 block">Passwords do not match.</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-6 bg-vibrant-orange text-white rounded-xl font-bold text-sm hover:bg-deep-orange transition-all disabled:opacity-50 shadow-md hover:shadow-lg active:scale-[0.98] flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Submitting Registration...
                    </>
                  ) : (
                    'Register Staff Account'
                  )}
                </button>
              </form>
              
              <div className="pt-6 text-center">
                <p className="text-sm text-on-surface-variant">
                  Already have an active staff account?{' '}
                  <Link to="/login" className="text-vibrant-orange font-bold hover:underline">
                    Sign in to Staff Portal
                  </Link>
                </p>
              </div>

            </div>
          </div>

          {/* RIGHT PANEL - Image */}
          <div className="hidden lg:block lg:w-2/5 relative bg-surface-container-high overflow-hidden">
            <img 
              src="/photo/staff.jpg" 
              alt="Staff Registration" 
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.src = '/staff.jpg';
              }}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-tint/40 to-transparent mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            
            <div className="absolute bottom-12 left-10 right-10 text-white">
              <h3 className="text-2xl font-bold mb-2">Guide the Next Generation</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Empower your students with comprehensive tools. Review OJT requirements, monitor DTR and evaluations, and ensure smooth internship journeys from start to finish.
              </p>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
