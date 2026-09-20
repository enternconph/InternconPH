import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { resolveFileUrl, formatFileSize, getFileIcon, isImageFile, isPdfFile } from '../../utils/fileHelper';
import PhPhoneInput from '../../components/ui/PhPhoneInput';

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'male',
    year_level: 4,
    contact_number: '',
    address: '',
    birthdate: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // State for the file preview modal in the portfolio showcase section
  const [previewItem, setPreviewItem] = useState(null);

  const fetchProfile = useCallback(() => {
    api.get('/student/profile').then((res) => {
      if (res.success && res.data) {
        setProfile(res.data);
        setFormData({
          first_name: res.data.first_name || '',
          middle_name: res.data.middle_name || '',
          last_name: res.data.last_name || '',
          gender: res.data.gender || 'male',
          year_level: res.data.year_level || 4,
          contact_number: res.data.contact_number || '',
          address: res.data.address || '',
          birthdate: res.data.birthdate ? res.data.birthdate.split('T')[0] : ''
        });
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Real-time: auto-refresh portfolio display when student uploads items in Career Portfolio page
  useRealtimeRefresh(fetchProfile);

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setMessage('');
    } else {
      setMessage(msg);
      setError('');
    }
    setTimeout(() => {
      setMessage('');
      setError('');
    }, 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await api.put('/student/profile', formData);
    if (res.success) {
      showNotification('Profile updated successfully!');
      fetchProfile();
    } else {
      showNotification(res.message || 'Update failed.', true);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      showNotification('New passwords do not match.', true);
      return;
    }
    const res = await api.put('/student/profile/password', passwordData);
    if (res.success) {
      setShowPasswordModal(false);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      showNotification('Password updated successfully!');
    } else {
      showNotification(res.message || 'Failed to update password.', true);
    }
  };

  const normType = (t) => (t || '').toLowerCase().trim();
  const isCred = (t) => ['credential', 'credentials', 'certificate', 'certification', 'honor', 'award', 'license', 'badge'].includes(normType(t));
  const isRecord = (t) => ['academic_record', 'academic_records', 'transcript', 'tor', 'cor', 'enrollment', 'record', 'grades'].includes(normType(t));
  const isAcad = (t) => ['academic_portfolio', 'project', 'sample_work', 'capstone', 'thesis', 'research', 'coursework'].includes(normType(t));

  const portfolioData = profile?.portfolio || {};
  const allPortfolioItems = portfolioData.items || [];

  const academicPortfolioItems = (portfolioData.academic_portfolio && portfolioData.academic_portfolio.length > 0)
    ? portfolioData.academic_portfolio
    : allPortfolioItems.filter(i => isAcad(i.item_type) || (!isCred(i.item_type) && !isRecord(i.item_type)));

  const credentialItems = (portfolioData.credentials && portfolioData.credentials.length > 0)
    ? portfolioData.credentials
    : allPortfolioItems.filter(i => isCred(i.item_type));

  const academicRecordItems = (portfolioData.academic_records && portfolioData.academic_records.length > 0)
    ? portfolioData.academic_records
    : allPortfolioItems.filter(i => isRecord(i.item_type));

  const resumeItems = portfolioData.resumes || [];

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Student Profile & Settings</h1>
          <p className="text-sm text-on-surface-variant">Manage your personal, academic, and account security details</p>
        </div>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="px-4 py-2 bg-surface-container border border-outline-variant hover:bg-surface-container-high rounded-xl text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 transition-colors shadow-sm w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[18px]">lock_reset</span>
          <span>Change Password</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-error rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Academic Info & Verification Banner */}
      <div className="bento-card grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="text-xs font-bold text-on-surface-variant uppercase">Student Number</span>
          <p className="font-bold text-on-surface text-sm mt-0.5">{profile?.student_number}</p>
          <span className="text-[11px] text-on-surface-variant capitalize">{profile?.classification || 'Regular Student'}</span>
        </div>
        <div>
          <span className="text-xs font-bold text-on-surface-variant uppercase">University / College</span>
          <p className="font-bold text-on-surface text-sm mt-0.5">{profile?.institution_name || 'Academic Institution'}</p>
          <span className="text-[11px] text-on-surface-variant">{profile?.inst_email || ''}</span>
        </div>
        <div>
          <span className="text-xs font-bold text-on-surface-variant uppercase">Degree Program</span>
          <p className="font-bold text-on-surface text-sm mt-0.5">{profile?.program_name}</p>
          <span className="text-[11px] text-on-surface-variant">{profile?.program_code || ''}</span>
        </div>
        <div>
          <span className="text-xs font-bold text-on-surface-variant uppercase">OJT Hours Goal</span>
          <p className="font-bold text-vibrant-orange text-sm mt-0.5">
            {profile?.completed_ojt_hours || 0} / {profile?.required_ojt_hours || 600} hrs
          </p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
            profile?.is_verified ? 'bg-green-tint text-pinoy-green' : 'bg-orange-tint text-vibrant-orange'
          }`}>
            {profile?.is_verified ? 'Verified & Active' : 'Pending Verification'}
          </span>
        </div>
      </div>

      {/* Assigned Institutional Coordinator Card */}
      {profile?.assignedSupervisor && (
        <div className="p-4 bg-vibrant-orange/10 rounded-2xl border border-vibrant-orange/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-vibrant-orange text-white flex items-center justify-center font-bold text-sm">
              <span className="material-symbols-outlined text-[20px]">school</span>
            </div>
            <div>
              <p className="text-xs font-bold text-vibrant-orange uppercase tracking-wider">Assigned OJT Coordinator / Supervisor</p>
              <h3 className="font-bold text-on-surface text-sm">
                Prof. {profile.assignedSupervisor.first_name} {profile.assignedSupervisor.last_name}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {profile.assignedSupervisor.position?.replace('_', ' ').toUpperCase()} • {profile.assignedSupervisor.email}
              </p>
            </div>
          </div>
          {profile.assignedSupervisor.contact_number && (
            <span className="text-xs font-bold bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface">
              📞 {profile.assignedSupervisor.contact_number}
            </span>
          )}
        </div>
      )}

      {/* Editable Form */}
      <form onSubmit={handleSubmit} className="bento-card space-y-4">
        <h2 className="text-base font-bold text-on-surface border-b border-outline-variant pb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-vibrant-orange text-[20px]">person</span>
          <span>Personal & Contact Information</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">First Name *</label>
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-vibrant-orange"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Middle Name</label>
            <input
              type="text"
              value={formData.middle_name}
              onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-vibrant-orange"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Last Name *</label>
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-vibrant-orange"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-sm outline-none"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Year Level</label>
            <select
              value={formData.year_level}
              onChange={(e) => setFormData({ ...formData, year_level: parseInt(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-sm outline-none"
            >
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year (Graduating / OJT)</option>
              <option value="5">5th Year</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Date of Birth</label>
            <input
              type="date"
              value={formData.birthdate}
              onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-vibrant-orange"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <PhPhoneInput
              label="Contact Phone"
              value={formData.contact_number}
              onChange={(val) => setFormData({ ...formData, contact_number: val })}
              placeholder="917 123 4567"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Current Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-vibrant-orange"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-vibrant-orange text-white rounded-lg font-bold text-sm hover:bg-deep-orange transition-colors shadow-sm"
          >
            Save Profile Changes
          </button>
        </div>
      </form>

      {/* Career Portfolio & Credentials Showcase */}
      <div className="bento-card space-y-6">
        <div className="flex justify-between items-center border-b border-outline-variant pb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange text-[22px]">folder_special</span>
              <span>Digital Career Portfolio & Credentials</span>
            </h2>
            <p className="text-xs text-on-surface-variant">
              Comprehensive academic portfolio, credentials, academic records, and verified workplace records visible to organizations.
            </p>
          </div>
          <Link
            to="/dashboard/student/portfolio"
            className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-vibrant-orange rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>Manage Portfolio</span>
          </Link>
        </div>

        {/* 1. Academic Portfolio */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-[18px]">school</span>
              <span>Academic Portfolio</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold">
                {academicPortfolioItems.length}
              </span>
            </h3>
          </div>
          {academicPortfolioItems.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic bg-surface-container-low p-3 rounded-lg">
              No capstone or academic projects added yet. Upload via Career Portfolio.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {academicPortfolioItems.map((item) => (
                <div key={item.item_id} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {item.file_name && isImageFile(item.file_name, item.file_path) && item.file_path ? (
                        <img
                          src={resolveFileUrl(item.file_path)}
                          alt={item.title}
                          className="w-8 h-8 rounded-lg object-cover cursor-pointer flex-shrink-0 border border-outline-variant"
                          onClick={() => setPreviewItem(item)}
                        />
                      ) : (
                        <span className="material-symbols-outlined text-blue-600 text-[20px] flex-shrink-0">{getFileIcon(item.file_name)}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-on-surface line-clamp-1">{item.title}</span>
                        {item.file_name && (
                          <p className="text-[10px] text-on-surface-variant line-clamp-1">
                            📎 {item.file_name}{item.file_size ? ` • ${formatFileSize(item.file_size)}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.file_path && (
                        <>
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-bold flex items-center gap-1 transition-colors"
                            title="Preview File"
                          >
                            <span className="material-symbols-outlined text-[13px]">visibility</span> View
                          </button>
                          <a
                            href={resolveFileUrl(item.file_path)}
                            download={item.file_name || true}
                            className="p-1 text-on-surface-variant hover:text-vibrant-orange transition-colors"
                            title="Download File"
                          >
                            <span className="material-symbols-outlined text-[15px]">download</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  {item.description && <p className="text-[11px] text-on-surface-variant line-clamp-2">{item.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Credentials */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[18px]">workspace_premium</span>
              <span>Credentials &amp; Certifications</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold">
                {credentialItems.length}
              </span>
            </h3>
          </div>
          {credentialItems.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic bg-surface-container-low p-3 rounded-lg">
              No certificates or credentials uploaded yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {credentialItems.map((item) => (
                <div key={item.item_id} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {item.file_name && isImageFile(item.file_name, item.file_path) && item.file_path ? (
                        <img
                          src={resolveFileUrl(item.file_path)}
                          alt={item.title}
                          className="w-8 h-8 rounded-lg object-cover cursor-pointer flex-shrink-0 border border-outline-variant"
                          onClick={() => setPreviewItem(item)}
                        />
                      ) : (
                        <span className="material-symbols-outlined text-amber-600 text-[20px] flex-shrink-0">{getFileIcon(item.file_name)}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-on-surface line-clamp-1">{item.title}</span>
                        {item.file_name && (
                          <p className="text-[10px] text-on-surface-variant line-clamp-1">
                            📎 {item.file_name}{item.file_size ? ` • ${formatFileSize(item.file_size)}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.file_path && (
                        <>
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 text-[11px] font-bold flex items-center gap-1 transition-colors"
                            title="Preview Credential"
                          >
                            <span className="material-symbols-outlined text-[13px]">visibility</span> View
                          </button>
                          <a
                            href={resolveFileUrl(item.file_path)}
                            download={item.file_name || true}
                            className="p-1 text-on-surface-variant hover:text-vibrant-orange transition-colors"
                            title="Download Credential"
                          >
                            <span className="material-symbols-outlined text-[15px]">download</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  {item.description && <p className="text-[11px] text-on-surface-variant line-clamp-2">{item.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Academic Records */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">grading</span>
              <span>Academic Records (TOR / Enrollment)</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                {academicRecordItems.length}
              </span>
            </h3>
          </div>
          {academicRecordItems.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic bg-surface-container-low p-3 rounded-lg">
              No official academic records or TOR attached.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {academicRecordItems.map((item) => (
                <div key={item.item_id} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {item.file_name && isImageFile(item.file_name, item.file_path) && item.file_path ? (
                        <img
                          src={resolveFileUrl(item.file_path)}
                          alt={item.title}
                          className="w-8 h-8 rounded-lg object-cover cursor-pointer flex-shrink-0 border border-outline-variant"
                          onClick={() => setPreviewItem(item)}
                        />
                      ) : (
                        <span className="material-symbols-outlined text-emerald-600 text-[20px] flex-shrink-0">{getFileIcon(item.file_name)}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-on-surface line-clamp-1">{item.title}</span>
                        {item.file_name && (
                          <p className="text-[10px] text-on-surface-variant line-clamp-1">
                            📎 {item.file_name}{item.file_size ? ` • ${formatFileSize(item.file_size)}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.file_path && (
                        <>
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[11px] font-bold flex items-center gap-1 transition-colors"
                            title="Preview Record"
                          >
                            <span className="material-symbols-outlined text-[13px]">visibility</span> View
                          </button>
                          <a
                            href={resolveFileUrl(item.file_path)}
                            download={item.file_name || true}
                            className="p-1 text-on-surface-variant hover:text-vibrant-orange transition-colors"
                            title="Download Record"
                          >
                            <span className="material-symbols-outlined text-[15px]">download</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  {item.description && <p className="text-[11px] text-on-surface-variant line-clamp-2">{item.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Active Resume */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-600 text-[18px]">description</span>
            <span>Resume / Curriculum Vitae</span>
          </h3>
          {resumeItems.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic bg-surface-container-low p-3 rounded-lg">
              No active resume uploaded. Upload one to apply for career positions.
            </p>
          ) : (
            <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-purple-600 text-[24px]">description</span>
                <div>
                  <p className="font-bold text-xs text-on-surface">{resumeItems[0].file_name || 'Active Resume'}</p>
                  <p className="text-[10px] text-on-surface-variant">
                    Version {resumeItems[0].version} • Active
                    {resumeItems[0].file_size ? ` • ${formatFileSize(resumeItems[0].file_size)}` : ''}
                  </p>
                </div>
              </div>
              {resumeItems[0].file_path && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewItem({ ...resumeItems[0], title: resumeItems[0].file_name || 'Resume' })}
                    className="px-3 py-1.5 bg-purple-100 text-purple-600 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-purple-200 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span> View
                  </button>
                  <a
                    href={resolveFileUrl(resumeItems[0].file_path)}
                    download={resumeItems[0].file_name || true}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span> Download
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Auto-Added Graduated Section: OJT Background & Mentor Evaluations */}
        {profile?.portfolio?.is_graduated && (
          <div className="space-y-4 pt-4 border-t border-outline-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-pinoy-green text-[20px]">verified</span>
              <h3 className="font-bold text-sm text-on-surface">Graduated Student — Verified OJT Background & Mentor Evaluations</h3>
              <span className="text-[10px] bg-green-tint text-pinoy-green px-2 py-0.5 rounded-full font-bold">Auto-Added</span>
            </div>

            {/* OJT Background */}
            {profile?.portfolio?.ojt_background?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-vibrant-orange text-[16px]">work_history</span>
                  Host Training Establishment (OJT)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profile.portfolio.ojt_background.map((ojt, idx) => (
                    <div key={ojt.ojt_id || idx} className="p-3 bg-surface rounded-xl border border-outline-variant space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-xs text-on-surface">{ojt.organization_name}</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-tint text-pinoy-green capitalize">
                          {ojt.status || 'Completed'}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">{ojt.industry} {ojt.org_address ? `• ${ojt.org_address}` : ''}</p>
                      <div className="flex items-center gap-3 text-[10px] text-on-surface-variant pt-1">
                        <span>Hours: <strong>{ojt.rendered_hours || 0} / {ojt.required_hours || 0}</strong> hrs</span>
                        {ojt.mentor_first_name && (
                          <span>Mentor: {ojt.mentor_first_name} {ojt.mentor_last_name}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mentor Evaluations */}
            {profile?.portfolio?.mentor_evaluations?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-vibrant-orange text-[16px]">rate_review</span>
                  Workplace Mentor Evaluations & Feedback
                </h4>
                <div className="space-y-2">
                  {profile.portfolio.mentor_evaluations.map((ev, idx) => (
                    <div key={idx} className="p-3 bg-surface rounded-xl border border-outline-variant space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-on-surface">{ev.organization_name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-green-tint text-pinoy-green font-bold text-xs">
                          ⭐ {ev.rating} / 5.0
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant italic">"{ev.comments || 'No written comments.'}"</p>
                      <p className="text-[10px] text-on-surface-variant">
                        Evaluator: {ev.evaluator_first_name ? `${ev.evaluator_first_name} ${ev.evaluator_last_name || ''}` : 'Workplace Mentor'} • Period: {ev.evaluation_period || 'Final'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Preview Modal — supports images, PDFs, and download fallback for other formats */}
      {previewItem && (() => {
        const fp = resolveFileUrl(previewItem.file_path || '');
        const fn = previewItem.file_name || previewItem.title || '';
        const isImg = isImageFile(fn, fp);
        const isPdf = isPdfFile(fn, fp);
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setPreviewItem(null)}>
            <div className="bg-white dark:bg-surface rounded-2xl max-w-3xl w-full p-4 sm:p-5 space-y-3 border border-outline-variant shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-on-surface">{previewItem.title || previewItem.file_name}</h3>
                  {previewItem.file_name && (
                    <p className="text-[11px] text-on-surface-variant">📎 {previewItem.file_name}{previewItem.file_size ? ` • ${formatFileSize(previewItem.file_size)}` : ''}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {fp && (
                    <a
                      href={fp}
                      download={previewItem.file_name || true}
                      className="px-3 py-1.5 bg-vibrant-orange text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-deep-orange transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      Download
                    </a>
                  )}
                  <button onClick={() => setPreviewItem(null)} className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded-lg hover:bg-red-50">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low">
                {isImg && fp ? (
                  <img src={fp} alt={previewItem.title} className="w-full max-h-[70vh] object-contain" />
                ) : isPdf && fp ? (
                  <iframe src={fp} title={previewItem.title} className="w-full h-[70vh] border-0" />
                ) : fp ? (
                  <div className="p-8 text-center space-y-3">
                    <span className="material-symbols-outlined text-[56px] text-on-surface-variant opacity-40">{getFileIcon(previewItem.file_name)}</span>
                    <p className="text-sm font-bold text-on-surface">Preview not available for this file type</p>
                    <p className="text-xs text-on-surface-variant">Click the Download button above to open or save the file.</p>
                    <a href={fp} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors">
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      Open in New Tab
                    </a>
                  </div>
                ) : (
                  <div className="p-8 text-center"><p className="text-sm text-on-surface-variant">No file attached.</p></div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-surface rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 border border-outline-variant shadow-2xl max-h-[90dvh] overflow-y-auto">
            <h3 className="text-base font-bold text-on-surface">Update Account Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">New Password (min. 6 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-sm outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 bg-surface-container text-on-surface-variant rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
