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

// Default fallback programs list in case of network latency or offline mode
const FALLBACK_PROGRAMS = [
  { program_id: 1, program_name: 'BS Information Technology', program_code: 'BSIT', department: 'Information Technology & Computing' },
  { program_id: 2, program_name: 'BS Computer Science', program_code: 'BSCS', department: 'Information Technology & Computing' },
  { program_id: 3, program_name: 'BS Information Systems', program_code: 'BSIS', department: 'Information Technology & Computing' },
  { program_id: 4, program_name: 'BS Computer Engineering', program_code: 'BSCpE', department: 'Engineering & Architecture' },
  { program_id: 5, program_name: 'BS Civil Engineering', program_code: 'BSCE', department: 'Engineering & Architecture' },
  { program_id: 6, program_name: 'BS Electrical Engineering', program_code: 'BSEE', department: 'Engineering & Architecture' },
  { program_id: 7, program_name: 'BS Mechanical Engineering', program_code: 'BSME', department: 'Engineering & Architecture' },
  { program_id: 8, program_name: 'BS Industrial Engineering', program_code: 'BSIE', department: 'Engineering & Architecture' },
  { program_id: 9, program_name: 'BS Business Administration - Marketing Management', program_code: 'BSBA-MM', department: 'Business & Accountancy' },
  { program_id: 10, program_name: 'BS Business Administration - Financial Management', program_code: 'BSBA-FM', department: 'Business & Accountancy' },
  { program_id: 11, program_name: 'BS Business Administration - Human Resource Management', program_code: 'BSBA-HRM', department: 'Business & Accountancy' },
  { program_id: 12, program_name: 'BS Accountancy', program_code: 'BSA', department: 'Business & Accountancy' },
  { program_id: 13, program_name: 'BS Hospitality Management', program_code: 'BSHM', department: 'Hospitality & Tourism' },
  { program_id: 14, program_name: 'BS Tourism Management', program_code: 'BSTM', department: 'Hospitality & Tourism' },
  { program_id: 15, program_name: 'BS Nursing', program_code: 'BSN', department: 'Health & Allied Sciences' },
  { program_id: 16, program_name: 'BS Pharmacy', program_code: 'BSPHARM', department: 'Health & Allied Sciences' },
  { program_id: 17, program_name: 'BS Medical Technology', program_code: 'BSMT', department: 'Health & Allied Sciences' },
  { program_id: 18, program_name: 'BS Psychology', program_code: 'BSPSY', department: 'Humanities & Social Sciences' },
  { program_id: 19, program_name: 'BA Communication', program_code: 'BACOMM', department: 'Arts, Design & Media' },
  { program_id: 20, program_name: 'BS Criminology', program_code: 'BSCRIM', department: 'Criminology & Public Safety' }
];

export default function RegisterMentorPage() {
  const navigate = useNavigate();
  const emailInputRef = useRef(null);
  const [organizations, setOrganizations] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [missingList, setMissingList] = useState([]);

  const [formData, setFormData] = useState({
    access_code: '',
    organization_id: '',
    title: 'Mr.', // Mr., Ms., Engr., Dr., Atty.
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    company_employee_id: '',
    job_title: '',
    department_name: '',
    work_location: '',
    years_of_experience: 3,
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
    // Fetch public list of hiring organizations and active OJT programs
    Promise.all([
      api.get('/public/organizations'),
      api.get('/public/programs')
    ]).then(([orgsRes, progsRes]) => {
      if (orgsRes.success && orgsRes.data) {
        setOrganizations(orgsRes.data);
      }
      if (progsRes.success && progsRes.data && progsRes.data.length > 0) {
        setPrograms(progsRes.data);
      } else {
        setPrograms(FALLBACK_PROGRAMS);
      }
    }).catch((err) => {
      console.error('Programs fetch error, falling back to default programs:', err);
      setPrograms(FALLBACK_PROGRAMS);
    }).finally(() => {
      setLoadingPrograms(false);
    });
  }, []);

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
      { key: 'access_code', label: 'HR-Issued Passcode', value: formData.access_code },
      { key: 'organization_id', label: 'Company', value: formData.organization_id },
      { key: 'job_title', label: 'Job Title', value: formData.job_title },
      { key: 'department_name', label: 'Assigned Program / Department', value: formData.department_name },
      { key: 'first_name', label: 'First Name', value: formData.first_name },
      { key: 'last_name', label: 'Last Name', value: formData.last_name },
      { key: 'company_employee_id', label: 'Employee ID', value: formData.company_employee_id },
      { key: 'email', label: 'Work Email', value: formData.email },
      { key: 'contact_number', label: 'Mobile Number', value: formData.contact_number },
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

    if (!formData.contact_number || !isValidPhMobile(formData.contact_number)) {
      setFieldValidationError('contact_number', 'Mobile Number', 'Please provide a valid 10-digit Philippine mobile number starting with 9 (e.g., +63 917 123 4567).', setFieldErrors, setMissingList, setError);
      return;
    }

    const emailErr = validateEmail(formData.email, { required: true });
    if (emailErr) {
      setFieldValidationError('email', 'Work Email', emailErr, setFieldErrors, setMissingList, setError);
      emailInputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register/mentor', {
        ...formData,
        address: JSON.stringify(address)
      });
      setLoading(false);

      if (res.success) {
        alert('Workplace Mentor registration submitted successfully! Your Organization HR will review and activate your mentor dashboard.');
        navigate('/login');
      } else {
        handleServerValidationError(
          res.message || 'Mentor registration failed.',
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

  return (
    <PageTransition>
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        
        {/* Decorative background blobs */}
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-green-tint rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-orange-tint rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>

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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-tint text-pinoy-green font-bold text-xs mb-2">
                  <span className="material-symbols-outlined text-[15px]">supervised_user_circle</span>
                  Authorized Workplace Mentor
                </div>
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">Mentor Registration</h1>
                <p className="text-sm text-on-surface-variant">For Industry Trainers and Workplace Supervisors. Requires an HR-issued Passcode.</p>
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
                    <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">HR-Issued Mentor Passcode *</label>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">Enter the passcode generated and issued by your company's Human Resources (HR) officer.</p>
                    <input
                      type="text"
                      required
                      data-field="access_code"
                      placeholder="e.g. ORG-MNT-XXXXX"
                      value={formData.access_code}
                      onChange={(e) => { handleFieldChange('access_code', e.target.value.toUpperCase()); }}
                      className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface font-mono font-bold text-sm tracking-wider outline-none transition-all ${getFieldValidationClass(!!fieldErrors.access_code, '', 'pinoy-green')}`}
                    />
                    <FieldErrorMessage error={fieldErrors.access_code} />
                  </div>
                </div>

                {/* COMPANY & ROLE */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">Company & Assignment</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Select Company *</label>
                      <select
                        required
                        data-field="organization_id"
                        value={formData.organization_id}
                        onChange={(e) => handleFieldChange('organization_id', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.organization_id, '', 'pinoy-green')}`}
                      >
                        <option value="">Choose Company...</option>
                        {organizations.map((org) => (
                          <option key={org.organization_id} value={org.organization_id}>
                            {org.organization_name}
                          </option>
                        ))}
                      </select>
                      <FieldErrorMessage error={fieldErrors.organization_id} />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Your Job Title *</label>
                      <input
                        type="text"
                        required
                        data-field="job_title"
                        placeholder="e.g. QA Supervisor"
                        value={formData.job_title}
                        onChange={(e) => handleFieldChange('job_title', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.job_title, '', 'pinoy-green')}`}
                      />
                      <FieldErrorMessage error={fieldErrors.job_title} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase">
                        Assigned OJT Program / Department *
                      </label>
                      {isCustomDept ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomDept(false);
                            setFormData({ ...formData, department_name: '' });
                          }}
                          className="text-xs text-pinoy-green hover:underline font-bold"
                        >
                          ← Select from list
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomDept(true);
                            setFormData({ ...formData, department_name: '' });
                          }}
                          className="text-xs text-on-surface-variant hover:text-pinoy-green hover:underline font-bold"
                        >
                          + Type custom
                        </button>
                      )}
                    </div>

                    {!isCustomDept ? (
                      <select
                        required
                        value={formData.department_name}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomDept(true);
                            setFormData({ ...formData, department_name: '' });
                          } else {
                            setFormData({ ...formData, department_name: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-pinoy-green outline-none transition-all"
                      >
                        <option value="">
                          {loadingPrograms ? '— Loading programs... —' : '— Select Assigned Program —'}
                        </option>
                        <option value="All Programs / General Workplace Supervision">
                          All Programs / General Workplace Supervision
                        </option>
                        {Object.entries(
                          programs.reduce((acc, p) => {
                            const deptKey = p.department || 'General Degree Programs';
                            if (!acc[deptKey]) acc[deptKey] = [];
                            acc[deptKey].push(p);
                            return acc;
                          }, {})
                        ).map(([dept, progs]) => (
                          <optgroup key={dept} label={`Department: ${dept}`}>
                            {progs.map((p) => (
                              <option key={p.program_id} value={p.program_name}>
                                {p.program_name} {p.program_code ? `(${p.program_code})` : ''}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                        <option value="__custom__">
                          + Other / Custom Department
                        </option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder="e.g. Enterprise Systems Dept"
                        value={formData.department_name}
                        onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-pinoy-green bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-pinoy-green outline-none transition-all"
                        autoFocus
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Office Location</label>
                      <input
                        type="text"
                        placeholder="e.g. BGC Taguig / Hybrid"
                        value={formData.work_location}
                        onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-pinoy-green outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Years Experience</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.years_of_experience}
                        onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-pinoy-green outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* PERSONAL INFO */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">Personal Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Title</label>
                      <select
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-pinoy-green outline-none transition-all"
                      >
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Engr.">Engr.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Atty.">Atty.</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">First Name *</label>
                      <input
                        type="text"
                        required
                        data-field="first_name"
                        placeholder="Roberto"
                        value={formData.first_name}
                        onChange={(e) => handleFieldChange('first_name', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.first_name, '', 'pinoy-green')}`}
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
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-pinoy-green outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Last Name *</label>
                      <input
                        type="text"
                        required
                        data-field="last_name"
                        placeholder="Garcia"
                        value={formData.last_name}
                        onChange={(e) => handleFieldChange('last_name', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.last_name, '', 'pinoy-green')}`}
                      />
                      <FieldErrorMessage error={fieldErrors.last_name} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Employee ID *</label>
                      <input
                        type="text"
                        required
                        data-field="company_employee_id"
                        placeholder="EMP-2026-9041"
                        value={formData.company_employee_id}
                        onChange={(e) => handleFieldChange('company_employee_id', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.company_employee_id, '', 'pinoy-green')}`}
                      />
                      <FieldErrorMessage error={fieldErrors.company_employee_id} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Suffix (Optional)</label>
                      <input
                        type="text"
                        placeholder="Jr., III"
                        value={formData.suffix}
                        onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-pinoy-green outline-none transition-all"
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <EmailInput
                        label="Work Email"
                        required
                        placeholder="roberto@company.ph"
                        value={formData.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        error={fieldErrors.email}
                        onErrorChange={(err) => {
                          if (!err) clearFieldError('email');
                          else setFieldErrors((prev) => ({ ...prev, email: err }));
                        }}
                        ref={emailInputRef}
                        ringColor="pinoy-green"
                        className="bg-surface-container-lowest text-on-surface"
                      />
                    </div>
                    <div>
                      <PhPhoneInput
                        label="Mobile Number"
                        required={true}
                        value={formData.contact_number}
                        onChange={(val) => setFormData({ ...formData, contact_number: val })}
                        placeholder="917 123 4567"
                      />
                    </div>
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
                          className={`w-full px-4 pr-11 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.password, '', 'pinoy-green')}`}
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
                              : 'border-outline-variant focus:ring-2 focus:ring-pinoy-green'
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
                  className="w-full py-4 mt-6 bg-pinoy-green text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 shadow-md hover:shadow-lg active:scale-[0.98] flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Submitting Registration...
                    </>
                  ) : (
                    'Register Mentor Account'
                  )}
                </button>
              </form>
              
              <div className="pt-6 text-center">
                <p className="text-sm text-on-surface-variant">
                  Already verified by HR?{' '}
                  <Link to="/login" className="text-pinoy-green font-bold hover:underline">
                    Sign in to Mentor Portal
                  </Link>
                </p>
              </div>

            </div>
          </div>

          {/* RIGHT PANEL - Image */}
          <div className="hidden lg:block lg:w-2/5 relative bg-surface-container-high overflow-hidden">
            <img 
              src="/register_mentor.jpg" 
              alt="Mentor Registration" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-green-tint/40 to-transparent mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            
            <div className="absolute bottom-12 left-10 right-10 text-white">
              <h3 className="text-2xl font-bold mb-2">Shape Future Leaders</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Mentor interns directly from your workplace. Evaluate performance, verify daily tasks, and help students transition into capable professionals.
              </p>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
