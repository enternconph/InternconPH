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

export default function RegisterOrganizationPage() {
  const navigate = useNavigate();
  const emailInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    organization_name: '',
    business_structure: 'corporation',
    industry: 'Technology',
    website: '',
    contact_phone: '',
    email: '',
    password: '',
    confirm_password: '',
    sec_dti_number: '',
    bir_tin: '',
    mayors_permit_number: '',
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
    sec_dti_file: null,
    mayors_permit_file: null,
    bir_tin_file: null,
    dole_file: null,
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
      { key: 'organization_name', label: 'Company Name', value: formData.organization_name },
      { key: 'sec_dti_number', label: 'SEC/DTI Reg No.', value: formData.sec_dti_number },
      { key: 'mayors_permit_number', label: "Mayor's Permit No.", value: formData.mayors_permit_number },
      { key: 'bir_tin', label: 'BIR TIN', value: formData.bir_tin },
      { key: 'email', label: 'HR Email', value: formData.email },
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

    const missingDocs = [];
    if (!files.sec_dti_file) missingDocs.push(formData.business_structure === 'sole_proprietorship' ? 'DTI Registration Certificate' : 'SEC Certificate of Registration');
    if (!files.mayors_permit_file) missingDocs.push("Mayor's / Business Operating Permit");
    if (!files.bir_tin_file) missingDocs.push('BIR Form 2303 (TIN Certificate)');

    if (missingDocs.length > 0) {
      setError(`Please upload the exact legal softcopy (PDF/DOCX/JPG/PNG) for: ${missingDocs.join(', ')} for Admin verification.`);
      playMissingFieldsAlarm();
      return;
    }

    if (formData.contact_phone && !isValidPhPhone(formData.contact_phone, true)) {
      setFieldValidationError('contact_phone', 'Contact Phone', 'Please provide a valid Philippine contact phone number (e.g. +63 9XX XXX XXXX or 02 8123 4567).', setFieldErrors, setMissingList, setError);
      return;
    }

    const emailErr = validateEmail(formData.email, { required: true });
    if (emailErr) {
      setFieldValidationError('email', 'HR Email', emailErr, setFieldErrors, setMissingList, setError);
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

      Object.entries(files).forEach(([field, fileObj]) => {
        if (fileObj) {
          payload.append(field, fileObj);
        }
      });

      const res = await api.post('/auth/register/organization', payload);
      setLoading(false);

      if (res.success) {
        alert('Employer partner registration and verification documents submitted successfully! The System Administrator will inspect your legal softcopies before activating your HR dashboard.');
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-tint text-pinoy-green font-bold text-xs mb-2">
                  <span className="material-symbols-outlined text-[15px]">verified</span>
                  Philippine Employer Partner Accreditation
                </div>
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">Organization Registration</h1>
                <p className="text-sm text-on-surface-variant">Register your company to post verified OJT openings. Verification requires SEC/DTI softcopies.</p>
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
                
                {/* COMPANY GENERAL INFO */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">Company & Business Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Company Name *</label>
                      <input
                        type="text"
                        required
                        data-field="organization_name"
                        placeholder="e.g. Ayala Land Inc."
                        value={formData.organization_name}
                        onChange={(e) => handleFieldChange('organization_name', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.organization_name)}`}
                      />
                      <FieldErrorMessage error={fieldErrors.organization_name} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Legal Structure *</label>
                      <select
                        value={formData.business_structure}
                        onChange={(e) => setFormData({ ...formData, business_structure: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all"
                      >
                        <option value="corporation">Corporation (SEC)</option>
                        <option value="partnership">Partnership (SEC)</option>
                        <option value="sole_proprietorship">Sole Proprietorship (DTI)</option>
                        <option value="ngo">NGO / Foundation</option>
                        <option value="government">Government Agency</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Industry *</label>
                      <select
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all"
                      >
                        <option value="Technology">Technology & Software</option>
                        <option value="Finance">Finance & Banking</option>
                        <option value="Healthcare">Healthcare & Medicine</option>
                        <option value="Marketing">Marketing & Advertising</option>
                        <option value="Engineering">Engineering & Construction</option>
                        <option value="Hospitality">Hospitality & Tourism</option>
                        <option value="Retail">Retail & E-commerce</option>
                        <option value="Logistics">Logistics & Supply Chain</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Food & Beverage">Food & Beverage</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Official Website</label>
                      <input
                        type="url"
                        placeholder="https://company.ph"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Headquarters Address (Philippines) *</h4>
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
                        <p className="text-[10px] text-on-surface-variant mt-1">This helps applicants and admins locate your headquarters.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LEGAL VERIFICATION */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">Proof of Legitimacy & Softcopies</h3>
                  
                  {/* SEC/DTI */}
                  <div className="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-3">
                    <label className="block text-xs font-bold text-on-surface">1. {formData.business_structure === 'sole_proprietorship' ? 'DTI Business Name Registration' : 'SEC Certificate of Registration'} *</label>
                    <div className="flex flex-col md:flex-row gap-3">
                      <input
                        type="text"
                        required
                        data-field="sec_dti_number"
                        placeholder={formData.business_structure === 'sole_proprietorship' ? 'DTI Reg No.' : 'SEC Reg No.'}
                        value={formData.sec_dti_number}
                        onChange={(e) => handleFieldChange('sec_dti_number', e.target.value)}
                        className={`w-full md:w-1/2 px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.sec_dti_number)}`}
                      />
                      <FieldErrorMessage error={fieldErrors.sec_dti_number} />
                      <div className="w-full md:w-1/2">
                        {files.sec_dti_file ? (
                          <div className="flex items-center justify-between px-3 py-3 bg-green-tint/50 text-pinoy-green rounded-xl text-xs font-bold border border-pinoy-green/20">
                            <span className="truncate max-w-[150px]">{files.sec_dti_file.name}</span>
                            <button type="button" onClick={() => removeFile('sec_dti_file')} className="text-error hover:opacity-80">
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border border-dashed border-vibrant-orange bg-orange-tint/20 text-vibrant-orange text-xs font-bold hover:bg-orange-tint/40 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">upload_file</span>
                            <span>Upload PDF/JPG</span>
                            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFileChange('sec_dti_file', e)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mayors Permit */}
                  <div className="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-3">
                    <label className="block text-xs font-bold text-on-surface">2. Mayor's / Business Operating Permit *</label>
                    <div className="flex flex-col md:flex-row gap-3">
                      <input
                        type="text"
                        required
                        data-field="mayors_permit_number"
                        placeholder="Permit No."
                        value={formData.mayors_permit_number}
                        onChange={(e) => handleFieldChange('mayors_permit_number', e.target.value)}
                        className={`w-full md:w-1/2 px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.mayors_permit_number)}`}
                      />
                      <FieldErrorMessage error={fieldErrors.mayors_permit_number} />
                      <div className="w-full md:w-1/2">
                        {files.mayors_permit_file ? (
                          <div className="flex items-center justify-between px-3 py-3 bg-green-tint/50 text-pinoy-green rounded-xl text-xs font-bold border border-pinoy-green/20">
                            <span className="truncate max-w-[150px]">{files.mayors_permit_file.name}</span>
                            <button type="button" onClick={() => removeFile('mayors_permit_file')} className="text-error hover:opacity-80">
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border border-dashed border-vibrant-orange bg-orange-tint/20 text-vibrant-orange text-xs font-bold hover:bg-orange-tint/40 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">upload_file</span>
                            <span>Upload PDF/JPG</span>
                            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFileChange('mayors_permit_file', e)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BIR TIN */}
                  <div className="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-3">
                    <label className="block text-xs font-bold text-on-surface">3. BIR Form 2303 Certificate (TIN Proof) *</label>
                    <div className="flex flex-col md:flex-row gap-3">
                      <input
                        type="text"
                        required
                        data-field="bir_tin"
                        placeholder="BIR TIN"
                        value={formData.bir_tin}
                        onChange={(e) => handleFieldChange('bir_tin', e.target.value)}
                        className={`w-full md:w-1/2 px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-sm outline-none transition-all ${getFieldValidationClass(!!fieldErrors.bir_tin)}`}
                      />
                      <FieldErrorMessage error={fieldErrors.bir_tin} />
                      <div className="w-full md:w-1/2">
                        {files.bir_tin_file ? (
                          <div className="flex items-center justify-between px-3 py-3 bg-green-tint/50 text-pinoy-green rounded-xl text-xs font-bold border border-pinoy-green/20">
                            <span className="truncate max-w-[150px]">{files.bir_tin_file.name}</span>
                            <button type="button" onClick={() => removeFile('bir_tin_file')} className="text-error hover:opacity-80">
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border border-dashed border-vibrant-orange bg-orange-tint/20 text-vibrant-orange text-xs font-bold hover:bg-orange-tint/40 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">upload_file</span>
                            <span>Upload PDF/JPG</span>
                            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFileChange('bir_tin_file', e)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACCOUNT */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-2">HR Main Account Credentials</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <EmailInput
                        label="HR Email"
                        required
                        name="org_hr_email"
                        autoComplete="off"
                        dataLpignore="true"
                        placeholder="hr@company.ph"
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
                        label="Contact Phone"
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
                          name="org_new_password"
                          id="org_new_password"
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
                          name="org_confirm_password"
                          id="org_confirm_password"
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
                      Uploading Documents & Submitting...
                    </>
                  ) : (
                    'Submit Employer Registration'
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
              src="/photo/organization.jpg" 
              alt="Organization Registration" 
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
            {/* Overlay to ensure image blends elegantly */}
            <div className="absolute inset-0 bg-gradient-to-tr from-green-tint/40 to-transparent mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            
            {/* Contextual Text on Image */}
            <div className="absolute bottom-12 left-10 right-10 text-white">
              <h3 className="text-2xl font-bold mb-2">Hire the Best Talent</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Join our verified employer network. Post OJT openings, evaluate interns digitally, and seamlessly transition top performers to full-time roles.
              </p>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
