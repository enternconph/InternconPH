import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import PageTransition from '../../components/Layout/PageTransition';
import PhAddressSelector from '../../components/ui/PhAddressSelector';
import PhPhoneInput, { isValidPhPhone } from '../../components/ui/PhPhoneInput';
import PasswordStrengthMeter from '../../components/Auth/PasswordStrengthMeter';
import { validateRequiredFields, handleServerValidationError, setFieldValidationError } from '../../utils/registrationValidation';
import { playMissingFieldsAlarm } from '../../utils/audio';
import { MissingFieldsBanner, FieldErrorMessage, getFieldValidationClass } from '../../components/Auth/RegistrationAlerts';
import EmailInput from '../../components/ui/EmailInput';
import { validateEmail } from '../../utils/email';

export default function RegisterInstitutionPage() {
  const navigate = useNavigate();
  const emailInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    institution_name: '',
    institution_code: '',
    institution_type: 'university', // university, college, tech_voc, school
    website: '',
    contact_phone: '',
    email: '',
    password: '',
    confirm_password: '',
    accreditation_number: '',
    director_name: '',
    director_title: 'Institution Director / President',
    google_map_link: ''
  });

  const [address, setAddress] = useState({
    region: '', regionCode: '',
    province: '', provinceCode: '',
    city: '', cityCode: '',
    barangay: '', barangayCode: '',
    postalCode: '',
    street: ''
  });

  const [files, setFiles] = useState({
    accreditation_file: null,
    other_doc_file: null
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [missingList, setMissingList] = useState([]);

  const handleFileChange = (field, e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFiles((prev) => ({ ...prev, [field]: file }));
    }
  };

  const removeFile = (field) => {
    setFiles((prev) => ({ ...prev, [field]: null }));
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
      { key: 'institution_name', label: 'Institution Name', value: formData.institution_name },
      { key: 'institution_code', label: 'Acronym', value: formData.institution_code },
      { key: 'accreditation_number', label: 'Permit No. (CHED/TESDA/DepEd)', value: formData.accreditation_number },
      { key: 'director_name', label: 'Director / President', value: formData.director_name },
      { key: 'email', label: 'Director Email', value: formData.email },
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

    if (!files.accreditation_file) {
      setError('Please attach the softcopy of your CHED GR / TESDA CTPR / DepEd Permit (PDF/DOCX/JPG/PNG) for Administrator verification.');
      playMissingFieldsAlarm();
      return;
    }

    if (formData.contact_phone && !isValidPhPhone(formData.contact_phone, true)) {
      setFieldValidationError('contact_phone', 'Contact Phone', 'Please provide a valid Philippine contact phone number (e.g. +63 9XX XXX XXXX or 02 8123 4567).', setFieldErrors, setMissingList, setError);
      return;
    }

    const emailErr = validateEmail(formData.email, { required: true });
    if (emailErr) {
      setFieldValidationError('email', 'Director Email', emailErr, setFieldErrors, setMissingList, setError);
      emailInputRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (val) payload.append(key, val);
      });
      payload.append('address', JSON.stringify(address));

      if (files.accreditation_file) {
        payload.append('accreditation_file', files.accreditation_file);
      }
      if (files.other_doc_file) {
        payload.append('other_doc_file', files.other_doc_file);
      }

      const res = await api.post('/auth/register/institution', payload);
      setLoading(false);

      if (res.success) {
        alert('Institution main account and accreditation softcopy submitted! System Admin will verify your documents before activating director dashboard.');
        navigate('/login');
      } else {
        handleServerValidationError(
          res.message || 'Registration failed.',
          setFieldErrors,
          setMissingList,
          setError
        );
      }
    } catch (err) {
      setLoading(false);
      handleServerValidationError(
        err.message || 'Server connection error.',
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
                  <span className="material-symbols-outlined text-[15px]">school</span>
                  CHED / TESDA / DepEd Verified
                </div>
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">Institution Registration</h1>
                <p className="text-sm text-on-surface-variant">Register your educational institution's main account to manage staff, programs, and OJT cohorts.</p>
              </div>

              {error && (
                <div className="p-3 mb-6 bg-error-container text-error rounded-xl text-xs font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <MissingFieldsBanner missingList={missingList} onClear={() => { setMissingList([]); setFieldErrors({}); }} />

              <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-6">
                {/* Hidden anti-autofill dummy traps to absorb browser credential autofill */}
                <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, overflow: 'hidden' }} aria-hidden="true">
                  <input type="text" name="fake_username_prevent_autofill" tabIndex={-1} autoComplete="off" />
                  <input type="password" name="fake_password_prevent_autofill" tabIndex={-1} autoComplete="new-password" />
                </div>
                
                {/* INSTITUTION INFO */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">Institution Details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Institution Name *</label>
                      <input
                        type="text"
                        required
                        data-field="institution_name"
                        placeholder="e.g. Technological University of the Philippines"
                        value={formData.institution_name}
                        onChange={(e) => handleFieldChange('institution_name', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.institution_name)}`}
                      />
                      <FieldErrorMessage error={fieldErrors.institution_name} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Acronym *</label>
                      <input
                        type="text"
                        required
                        data-field="institution_code"
                        placeholder="e.g. TUP"
                        value={formData.institution_code}
                        onChange={(e) => handleFieldChange('institution_code', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.institution_code)}`}
                      />
                      <FieldErrorMessage error={fieldErrors.institution_code} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Classification *</label>
                      <select
                        value={formData.institution_type}
                        onChange={(e) => setFormData({ ...formData, institution_type: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all"
                      >
                        <option value="university">State / Private University</option>
                        <option value="college">Higher Education College</option>
                        <option value="tech_voc">Technical-Vocational Center</option>
                        <option value="school">Basic Education / Senior High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Official Website</label>
                      <input
                        type="url"
                        placeholder="https://university.edu.ph"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Main Campus Address (Philippines) *</h4>
                    <div className="space-y-4">
                      <PhAddressSelector 
                        value={address} 
                        onChange={(field, val) => setAddress(prev => ({ ...prev, [field]: val }))} 
                      />
                      <div className="md:col-span-2 mt-2">
                        <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">location_on</span>
                          Google Maps Link (Optional)
                        </label>
                        <input
                          type="url"
                          placeholder="e.g. https://maps.app.goo.gl/..."
                          value={formData.google_map_link}
                          onChange={(e) => setFormData({ ...formData, google_map_link: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all"
                        />
                        <p className="text-[10px] text-on-surface-variant mt-1">This helps admins and students locate your main campus accurately.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACCREDITATION */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">Government Accreditation</h3>
                  
                  <div className="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Permit No. (CHED/TESDA/DepEd) *</label>
                        <input
                          type="text"
                          required
                          data-field="accreditation_number"
                          placeholder="e.g. CHED-GR-NCR-2021"
                          value={formData.accreditation_number}
                          onChange={(e) => handleFieldChange('accreditation_number', e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.accreditation_number)}`}
                        />
                        <FieldErrorMessage error={fieldErrors.accreditation_number} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Director / President *</label>
                        <input
                          type="text"
                          required
                          data-field="director_name"
                          placeholder="Dr. Juan Dela Cruz"
                          value={formData.director_name}
                          onChange={(e) => handleFieldChange('director_name', e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.director_name)}`}
                        />
                        <FieldErrorMessage error={fieldErrors.director_name} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-on-surface">Softcopy of Government Permit *</label>
                      <div className="w-full">
                        {files.accreditation_file ? (
                          <div className="flex items-center justify-between px-4 py-3 bg-green-tint/50 text-pinoy-green rounded-xl text-xs font-bold border border-pinoy-green/20">
                            <div className="flex items-center gap-2 truncate">
                              <span className="material-symbols-outlined text-[18px]">description</span>
                              <span className="truncate max-w-[200px]">{files.accreditation_file.name}</span>
                            </div>
                            <button type="button" onClick={() => removeFile('accreditation_file')} className="text-error hover:opacity-80 p-1">
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border border-dashed border-vibrant-orange bg-orange-tint/20 text-vibrant-orange text-xs font-bold hover:bg-orange-tint/40 transition-colors">
                            <span className="material-symbols-outlined text-[24px]">upload_file</span>
                            <span>Upload Exact Softcopy (PDF/JPG)</span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => handleFileChange('accreditation_file', e)}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACCOUNT */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">Main Account Credentials</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <EmailInput
                        label="Director Email"
                        required
                        name="inst_director_email"
                        autoComplete="off"
                        dataLpignore="true"
                        placeholder="director@university.edu.ph"
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
                    <div>
                      <PhPhoneInput
                        label="Campus Phone"
                        value={formData.contact_phone}
                        onChange={(val) => setFormData({ ...formData, contact_phone: val })}
                        allowLandline={true}
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
                          name="inst_new_password"
                          id="inst_new_password"
                          autoComplete="new-password"
                          data-lpignore="true"
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
                          name="inst_confirm_password"
                          id="inst_confirm_password"
                          autoComplete="new-password"
                          data-lpignore="true"
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
                      Submitting Application...
                    </>
                  ) : (
                    'Register Institution Main Account'
                  )}
                </button>
              </form>
              
              <div className="pt-6 text-center">
                <p className="text-sm text-on-surface-variant">
                  Already registered?{' '}
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
              src="/photo/institutionreg.jpg" 
              alt="Institution Registration" 
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
            {/* Overlay to ensure image blends elegantly */}
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-tint/40 to-transparent mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            
            {/* Contextual Text on Image */}
            <div className="absolute bottom-12 left-10 right-10 text-white">
              <h3 className="text-2xl font-bold mb-2">Elevate Education</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Connect your students with premium industry partners. Monitor OJT progress in real-time, streamline curriculum compliance, and manage everything in one unified dashboard.
              </p>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
