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

export default function RegisterStudentPage() {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedInst, setSelectedInst] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const emailInputRef = useRef(null);

  const [fieldErrors, setFieldErrors] = useState({});
  const [missingList, setMissingList] = useState([]);

  const [formData, setFormData] = useState({
    access_code: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    student_number: '',
    program_id: '',
    classification: 'regular',
    ojt_status: 'starting_ojt',
    email: '',
    contact_number: '',
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

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    api.get('/public/institutions').then((res) => {
      if (res.success && res.data) {
        setInstitutions(res.data);
      }
    });
  }, []);

  const handleInstChange = (e) => {
    const instId = e.target.value;
    setSelectedInst(instId);
    setFormData((prev) => ({ ...prev, program_id: '' }));
    clearFieldError('selectedInst');

    if (instId) {
      api.get(`/public/programs/${instId}`).then((res) => {
        if (res.success && res.data) {
          setPrograms(res.data);
        }
      });
    } else {
      setPrograms([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Comprehensive required fields check before submission
    const validation = validateRequiredFields([
      { key: 'access_code', label: 'Program Access Code', value: formData.access_code },
      { key: 'first_name', label: 'First Name', value: formData.first_name },
      { key: 'last_name', label: 'Last Name', value: formData.last_name },
      { key: 'student_number', label: 'Student ID', value: formData.student_number },
      { key: 'selectedInst', label: 'University', value: selectedInst },
      { key: 'program_id', label: 'Degree Program', value: formData.program_id },
      { key: 'classification', label: 'Classification', value: formData.classification },
      { key: 'ojt_status', label: 'Current OJT Status', value: formData.ojt_status },
      { key: 'email', label: 'Email Address', value: formData.email },
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

    if (!formData.access_code.trim()) {
      setFieldValidationError('access_code', 'Program Access Code', 'Institution Access Code is required for student registration.', setFieldErrors, setMissingList, setError);
      return;
    }

    if (formData.password.length < 8) {
      setFieldValidationError('password', 'Password', 'Password must be at least 8 characters long.', setFieldErrors, setMissingList, setError);
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setFieldValidationError('confirm_password', 'Confirm Password', 'Passwords do not match.', setFieldErrors, setMissingList, setError);
      return;
    }

    if (!selectedInst) {
      setFieldValidationError('selectedInst', 'University', 'Please select your institution.', setFieldErrors, setMissingList, setError);
      return;
    }

    if (formData.contact_number && !isValidPhMobile(formData.contact_number)) {
      setFieldValidationError('contact_number', 'Mobile Number', 'Please provide a valid 10-digit Philippine mobile number starting with 9 (e.g., +63 917 123 4567).', setFieldErrors, setMissingList, setError);
      return;
    }

    const emailErr = validateEmail(formData.email, { required: true });
    if (emailErr) {
      setFieldValidationError('email', 'Email Address', emailErr, setFieldErrors, setMissingList, setError);
      emailInputRef.current?.focus();
      return;
    }

    setLoading(true);
    const res = await api.post('/auth/register/student', {
      ...formData,
      address: JSON.stringify(address),
      institution_id: selectedInst
    });
    setLoading(false);

    if (res.success) {
      alert('Registration submitted successfully! Your account is pending review and approval by your institution coordinator or registrar.');
      navigate('/login');
    } else {
      handleServerValidationError(
        res.message || 'Registration failed.',
        setFieldErrors,
        setMissingList,
        setError
      );
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-3 sm:p-6 md:p-8 relative overflow-hidden">
        
        {/* Decorative background blobs */}
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-orange-tint rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-green-tint rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none"></div>

        {/* Floating Card */}
        <div className="w-full max-w-[1100px] bg-surface rounded-2xl sm:rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex relative z-10 border border-outline-variant/30 min-h-0 lg:min-h-[650px]">
          
          {/* LEFT PANEL - Form */}
          <div className="w-full lg:w-3/5 p-5 sm:p-8 md:p-10 lg:p-12 flex flex-col relative bg-surface max-h-none lg:max-h-[85vh] overflow-y-auto custom-scrollbar">
            
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
                  <span className="material-symbols-outlined text-[15px]">pin</span>
                  Institution Passcode Verification
                </div>
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">Student Registration</h1>
                <p className="text-sm text-on-surface-variant">Create your account to access verified OJT opportunities.</p>
              </div>

              {error && (
                <div className="p-3 mb-6 bg-error-container text-error rounded-xl text-xs font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Incomplete Required Fields Top Banner with Quick-Jump Links */}
              <MissingFieldsBanner missingList={missingList} onClear={() => setMissingList([])} />

              <form noValidate onSubmit={handleSubmit} className="space-y-5">
                
                {/* Access Code */}
                <div 
                  data-field="access_code"
                  className={`p-5 bg-surface-container rounded-2xl border space-y-2 relative overflow-hidden transition-all ${
                    fieldErrors.access_code ? '!border-red-500 !ring-2 !ring-red-500/40 bg-red-50/15 animate-field-shake' : 'border-outline-variant'
                  }`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-vibrant-orange/10 to-transparent rounded-bl-full"></div>
                  <label className="block text-xs font-bold text-vibrant-orange uppercase tracking-wider relative z-10">
                    Program Access Code *
                  </label>
                  <div className="relative z-10">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-vibrant-orange text-[20px]">vpn_key</span>
                    <input
                      type="text"
                      data-field="access_code"
                      placeholder="e.g. INST-BSIT-8K29"
                      value={formData.access_code}
                      onChange={(e) => handleFieldChange('access_code', e.target.value.toUpperCase())}
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border font-mono font-bold text-sm tracking-wider outline-none transition-all ${
                        getFieldValidationClass(Boolean(fieldErrors.access_code), 'bg-surface-container-lowest text-on-surface', 'vibrant-orange')
                      }`}
                    />
                  </div>
                  <FieldErrorMessage error={fieldErrors.access_code} />
                  <p className="text-[11px] text-on-surface-variant relative z-10 mt-1">
                    Obtain this from your University OJT Coordinator or Department Head.
                  </p>
                </div>

                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">First Name *</label>
                    <input
                      type="text"
                      data-field="first_name"
                      placeholder="First Name"
                      value={formData.first_name}
                      onChange={(e) => handleFieldChange('first_name', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                        getFieldValidationClass(Boolean(fieldErrors.first_name), 'bg-surface-container-lowest text-on-surface', 'vibrant-orange')
                      }`}
                    />
                    <FieldErrorMessage error={fieldErrors.first_name} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Middle Name</label>
                    <input
                      type="text"
                      placeholder="Middle Name (Optional)"
                      value={formData.middle_name}
                      onChange={(e) => handleFieldChange('middle_name', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      data-field="last_name"
                      placeholder="Last Name"
                      value={formData.last_name}
                      onChange={(e) => handleFieldChange('last_name', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                        getFieldValidationClass(Boolean(fieldErrors.last_name), 'bg-surface-container-lowest text-on-surface', 'vibrant-orange')
                      }`}
                    />
                    <FieldErrorMessage error={fieldErrors.last_name} />
                  </div>
                </div>

                {/* Contact & ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Student ID *</label>
                    <input
                      type="text"
                      data-field="student_number"
                      placeholder="e.g. 2023-00123"
                      value={formData.student_number}
                      onChange={(e) => handleFieldChange('student_number', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                        getFieldValidationClass(Boolean(fieldErrors.student_number), 'bg-surface-container-lowest text-on-surface', 'vibrant-orange')
                      }`}
                    />
                    <FieldErrorMessage error={fieldErrors.student_number} />
                  </div>
                  <div>
                    <PhPhoneInput
                      label="Contact Phone"
                      value={formData.contact_number}
                      onChange={(val) => handleFieldChange('contact_number', val)}
                      placeholder="917 123 4567"
                    />
                  </div>
                </div>

                {/* Address Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface-variant uppercase border-b border-outline-variant pb-2">Complete Address (Philippines)</h3>
                  <PhAddressSelector 
                    value={address} 
                    onChange={(field, val) => setAddress(prev => ({ ...prev, [field]: val }))} 
                  />
                </div>

                {/* Academic */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">University *</label>
                    <select
                      data-field="selectedInst"
                      value={selectedInst}
                      onChange={handleInstChange}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                        getFieldValidationClass(Boolean(fieldErrors.selectedInst), 'bg-surface-container-lowest text-on-surface', 'vibrant-orange')
                      }`}
                    >
                      <option value="">Select university...</option>
                      {institutions.map((i) => (
                        <option key={i.institution_id} value={i.institution_id}>
                          {i.institution_name} ({i.institution_code})
                        </option>
                      ))}
                    </select>
                    <FieldErrorMessage error={fieldErrors.selectedInst} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Degree Program *</label>
                    <select
                      data-field="program_id"
                      value={formData.program_id}
                      onChange={(e) => handleFieldChange('program_id', e.target.value)}
                      disabled={!selectedInst}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all disabled:opacity-50 ${
                        getFieldValidationClass(Boolean(fieldErrors.program_id), 'bg-surface-container-lowest text-on-surface', 'vibrant-orange')
                      }`}
                    >
                      <option value="">Choose program...</option>
                      {programs.map((p) => (
                        <option key={p.program_id} value={p.program_id}>
                          {p.program_name} ({p.required_ojt_hours || p.default_ojt_hours || 600} hrs)
                        </option>
                      ))}
                    </select>
                    <FieldErrorMessage error={fieldErrors.program_id} />
                  </div>
                </div>

                {/* Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Classification *</label>
                    <select
                      data-field="classification"
                      value={formData.classification}
                      onChange={(e) => handleFieldChange('classification', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                        getFieldValidationClass(Boolean(fieldErrors.classification), 'bg-surface-container-lowest text-on-surface', 'vibrant-orange')
                      }`}
                    >
                      <option value="regular">Regular Student</option>
                      <option value="returnee">Returnee</option>
                      <option value="transferee">Transferee</option>
                    </select>
                    <FieldErrorMessage error={fieldErrors.classification} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Current OJT Status *</label>
                    <select
                      data-field="ojt_status"
                      value={formData.ojt_status}
                      onChange={(e) => handleFieldChange('ojt_status', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                        getFieldValidationClass(Boolean(fieldErrors.ojt_status), 'bg-surface-container-lowest text-on-surface', 'vibrant-orange')
                      }`}
                    >
                      <option value="starting_ojt">Starting OJT</option>
                      <option value="completed_ojt">Completed OJT</option>
                      <option value="graduated">Graduated (Job Placement)</option>
                    </select>
                    <FieldErrorMessage error={fieldErrors.ojt_status} />
                  </div>
                </div>

                {/* Account */}
                <div>
                  <EmailInput
                    label="Email Address"
                    required
                    showIcon
                    icon="mail"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    error={fieldErrors.email}
                    onErrorChange={(err) => {
                      if (!err) clearFieldError('email');
                      else setFieldErrors((prev) => ({ ...prev, email: err }));
                    }}
                    ref={emailInputRef}
                    placeholder="student@university.edu.ph"
                    ringColor="vibrant-orange"
                    className="bg-surface-container-lowest text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Password *</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">lock</span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        data-field="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => handleFieldChange('password', e.target.value)}
                        className={`w-full pl-11 pr-11 py-3 rounded-xl border text-sm outline-none transition-all ${
                          getFieldValidationClass(Boolean(fieldErrors.password), 'bg-surface-container-lowest text-on-surface', 'vibrant-orange')
                        }`}
                      />
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
                    <FieldErrorMessage error={fieldErrors.password} />
                    {/* Password Strength Meter */}
                    <PasswordStrengthMeter password={formData.password} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Confirm Password *</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">lock</span>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        data-field="confirm_password"
                        placeholder="••••••••"
                        value={formData.confirm_password}
                        onChange={(e) => handleFieldChange('confirm_password', e.target.value)}
                        className={`w-full pl-11 pr-11 py-3 rounded-xl border text-sm outline-none transition-all ${
                          getFieldValidationClass(
                            Boolean(fieldErrors.confirm_password) || (formData.confirm_password && formData.password !== formData.confirm_password),
                            'bg-surface-container-lowest text-on-surface',
                            'vibrant-orange'
                          )
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
                    <FieldErrorMessage error={fieldErrors.confirm_password} />
                    {formData.confirm_password && formData.password !== formData.confirm_password && (
                      <span className="text-[10px] text-red-500 font-bold mt-1 block">Passwords do not match.</span>
                    )}
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
                      Registering...
                    </>
                  ) : (
                    'Submit Student Registration'
                  )}
                </button>
              </form>
              
              <div className="pt-6 text-center">
                <p className="text-sm text-on-surface-variant">
                  Already have an account?{' '}
                  <Link to="/login" className="text-vibrant-orange font-bold hover:underline">
                    Sign In
                  </Link>
                </p>
              </div>

            </div>
          </div>

          {/* RIGHT PANEL - Image */}
          <div className="hidden lg:block lg:w-2/5 relative bg-surface-container-high overflow-hidden">
            <img 
              src="/photo/StudentReg.jpg" 
              alt="Student Registration" 
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
            {/* Overlay to ensure image blends elegantly */}
            <div className="absolute inset-0 bg-gradient-to-tr from-vibrant-orange/20 to-transparent mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            
            {/* Contextual Text on Image */}
            <div className="absolute bottom-12 left-10 right-10 text-white">
              <h3 className="text-2xl font-bold mb-2">Your Career Starts Here</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Connect with verified employers, log your OJT hours digitally, and build your professional portfolio with InternConPH.
              </p>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
