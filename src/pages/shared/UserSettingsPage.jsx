import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { testNotificationChime } from '../../utils/audio';
import { resolveFileUrl } from '../../utils/fileHelper';
import api from '../../api/client';

export default function UserSettingsPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  const { theme, effectiveTheme, isDark, setTheme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' | 'profile' | 'security' | 'appearance'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Preferences State
  const [preferences, setPreferences] = useState({
    sound_enabled: 1,
    email_notifications: 1,
    sms_alerts: 0,
    ojt_updates: 1,
    grievance_alerts: 1,
    marketing_emails: 0,
    compact_view: 0
  });

  // Profile State
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    first_name: '',
    last_name: '',
    contact_number: '',
    avatar_url: '',
    position: ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Preset Avatars (Offline-ready local SVGs)
  const presetAvatars = [
    '/photo/avatar-1.svg',
    '/photo/avatar-2.svg',
    '/photo/avatar-3.svg',
    '/photo/avatar-4.svg',
    '/photo/avatar-5.svg',
    '/photo/avatar-6.svg'
  ];

  // Fetch initial profile & preferences
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/user/profile');
        if (res.success && res.data) {
          const { user: u, details, preferences: p } = res.data;
          if (p) {
            setPreferences(p);
            // Sync audio setting to localStorage for instant lookup
            localStorage.setItem('interncon_sound_enabled', p.sound_enabled ? '1' : '0');
          }
          setProfileForm({
            display_name: u.display_name || '',
            first_name: details?.first_name || '',
            last_name: details?.last_name || '',
            contact_number: details?.contact_number || '',
            avatar_url: u.avatar_url || '',
            position: details?.position || details?.job_title || ''
          });
          setAvatarPreview(u.avatar_url || null);
        }
      } catch (err) {
        console.error('Failed to load user settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const showNotification = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Handle Preferences Save
  const handleSavePreferences = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/user/preferences', preferences);
      if (res.success) {
        localStorage.setItem('interncon_sound_enabled', preferences.sound_enabled ? '1' : '0');
        showNotification('success', 'Notification and alert preferences saved successfully!');
      } else {
        showNotification('error', res.message || 'Failed to save preferences.');
      }
    } catch (err) {
      showNotification('error', 'Error saving preferences: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Avatar File Upload
  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showNotification('error', 'File is too large. Maximum image size is 15MB.');
      return;
    }

    // Local preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    // Upload to server
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setUploadingAvatar(true);
      const res = await api.post('/user/avatar', formData);
      if (res && res.success && res.avatar_url) {
        const fullAvatarUrl = res.avatar_url;
        setProfileForm((prev) => ({ ...prev, avatar_url: fullAvatarUrl }));
        setAvatarPreview(fullAvatarUrl);
        // Update user in auth context
        setUser((prev) => (prev ? { ...prev, avatar_url: fullAvatarUrl } : prev));
        showNotification('success', 'Profile picture updated successfully!');
      } else {
        showNotification('error', (res && res.message) || 'Avatar upload failed. Please try again.');
      }
    } catch (err) {
      showNotification('error', 'Avatar upload error: ' + (err.message || 'Please try again.'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Select preset avatar
  const handleSelectPresetAvatar = async (url) => {
    setAvatarPreview(url);
    setProfileForm((prev) => ({ ...prev, avatar_url: url }));
    try {
      setSaving(true);
      const res = await api.put('/user/profile', { avatar_url: url });
      if (res.success) {
        setUser((prev) => (prev ? { ...prev, avatar_url: url } : prev));
        showNotification('success', 'Avatar updated to selected preset!');
      }
    } catch (err) {
      showNotification('error', 'Failed to update preset avatar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Remove avatar
  const handleRemoveAvatar = async () => {
    setAvatarPreview(null);
    setProfileForm((prev) => ({ ...prev, avatar_url: '' }));
    try {
      setSaving(true);
      await api.put('/user/profile', { avatar_url: '' });
      setUser((prev) => (prev ? { ...prev, avatar_url: null } : prev));
      showNotification('success', 'Profile picture removed.');
    } catch (err) {
      showNotification('error', 'Failed to remove avatar.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Profile Details Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/user/profile', profileForm);
      if (res.success) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                display_name: profileForm.display_name,
                full_name: profileForm.display_name || `${profileForm.first_name} ${profileForm.last_name}`.trim() || prev.email,
                avatar_url: profileForm.avatar_url
              }
            : prev
        );
        showNotification('success', 'Profile details updated successfully!');
      } else {
        showNotification('error', res.message || 'Failed to update profile.');
      }
    } catch (err) {
      showNotification('error', 'Profile update error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification('error', 'New passwords do not match. Please verify.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showNotification('error', 'New password must be at least 8 characters long.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/user/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (res.success) {
        showNotification('success', 'Password changed successfully! Keep your credentials secure.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showNotification('error', res.message || 'Failed to change password.');
      }
    } catch (err) {
      showNotification('error', 'Change password error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-outline-variant' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 20, label: 'Weak', color: 'bg-red-500' };
    if (score === 2 || score === 3) return { score: 60, label: 'Good', color: 'bg-amber-500' };
    return { score: 100, label: 'Strong', color: 'bg-pinoy-green' };
  };

  const pwdStrength = getPasswordStrength(passwordForm.newPassword);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2.5">
            <span className="material-symbols-outlined text-vibrant-orange text-[28px]">settings</span>
            <span>Settings & Profile Management</span>
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Configure real-time alert notifications, customize audio preferences, manage your profile avatar, and secure your account credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container text-error border border-error/20 hover:bg-error-container hover:border-error/40 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm"
          title="Sign Out of Account"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>

      {/* Alert Notification Message */}
      {message.text && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm animate-fadeIn ${
            message.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-tint text-pinoy-green border border-emerald-200'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {message.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })} className="hover:opacity-75">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-outline-variant gap-2 overflow-x-auto text-xs font-bold scrollbar-thin pb-0.5">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`min-h-[44px] pb-3 px-4 flex items-center gap-2 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'notifications'
              ? 'border-vibrant-orange text-vibrant-orange'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">notifications_active</span>
          <span>Notification Setup</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`min-h-[44px] pb-3 px-4 flex items-center gap-2 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'profile'
              ? 'border-vibrant-orange text-vibrant-orange'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">account_circle</span>
          <span>Profile Management</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`min-h-[44px] pb-3 px-4 flex items-center gap-2 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'security'
              ? 'border-vibrant-orange text-vibrant-orange'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">lock_reset</span>
          <span>Security & Password</span>
        </button>

        <button
          id="appearance-tab-btn"
          onClick={() => setActiveTab('appearance')}
          className={`min-h-[44px] pb-3 px-4 flex items-center gap-2 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'appearance'
              ? 'border-vibrant-orange text-vibrant-orange'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">palette</span>
          <span>Appearance & Theme</span>
        </button>
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
          <span className="text-xs text-on-surface-variant font-medium">Loading user preferences...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: NOTIFICATION SETUP */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Real-Time Alert Sounds Card */}
              <div className="bento-card space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-vibrant-orange text-[22px]">volume_up</span>
                      <span>Real-Time Alert Sounds & Audio Chime</span>
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Synthesizes a pleasant audio chime when incoming OJT updates, clearances, or grievances arrive in real-time.
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 w-fit ${
                      preferences.sound_enabled
                        ? 'bg-green-tint text-pinoy-green border-emerald-200'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {preferences.sound_enabled ? 'volume_up' : 'volume_off'}
                    </span>
                    <span>{preferences.sound_enabled ? 'Sound Active' : 'Sound Muted'}</span>
                  </span>
                </div>

                {/* Main Audio Control Box */}
                <div className="p-4 sm:p-5 bg-surface-container rounded-2xl border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        preferences.sound_enabled
                          ? 'bg-orange-tint text-vibrant-orange shadow-sm'
                          : 'bg-surface text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[24px]">
                        {preferences.sound_enabled ? 'notifications_active' : 'notifications_off'}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-on-surface">Enable Real-Time Alert Chime</h4>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5 max-w-lg leading-relaxed">
                        Plays a pleasant, harmonic dual-tone chime (A5 880Hz / E6 1318Hz) whenever an alert or message arrives.
                      </p>
                    </div>
                  </div>

                  {/* Right Actions: Test Button & Switch */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant w-full md:w-auto justify-between md:justify-end">
                    <button
                      type="button"
                      onClick={() => testNotificationChime(0.4)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-orange-tint text-vibrant-orange font-bold text-xs border border-outline-variant hover:border-vibrant-orange transition-all shadow-sm active:scale-95"
                      title="Audition current notification tone"
                    >
                      <span className="material-symbols-outlined text-[18px]">play_circle</span>
                      <span>Test Chime</span>
                    </button>

                    <div className="h-6 w-px bg-outline-variant hidden md:block"></div>

                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!preferences.sound_enabled}
                        onChange={(e) => {
                          const val = e.target.checked ? 1 : 0;
                          setPreferences({ ...preferences, sound_enabled: val });
                          localStorage.setItem('interncon_sound_enabled', val ? '1' : '0');
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vibrant-orange"></div>
                    </label>
                  </div>
                </div>

                {/* Sub-note with Web Audio spec info */}
                <div className="flex items-center gap-2 px-3 py-2 bg-vibrant-orange/15 rounded-xl border border-vibrant-orange/30 text-[11px] text-on-surface-variant">
                  <span className="material-symbols-outlined text-vibrant-orange text-[16px] shrink-0">graphic_eq</span>
                  <span>Synthesized locally using standard Web Audio API oscillators — lightweight, zero latency, and zero audio file downloads.</span>
                </div>
              </div>

              {/* Delivery Channels */}
              <div className="bento-card space-y-4">
                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange text-[22px]">outgoing_mail</span>
                  <span>Alert Delivery Channels</span>
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-xl border border-outline-variant">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-blue-500 text-[20px]">mail</span>
                      <div>
                        <h4 className="font-bold text-xs text-on-surface">Email Notifications</h4>
                        <p className="text-[11px] text-on-surface-variant">Send important OJT clearances, credentials, and verification updates to your email.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!preferences.email_notifications}
                        onChange={(e) => setPreferences({ ...preferences, email_notifications: e.target.checked ? 1 : 0 })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vibrant-orange"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-xl border border-outline-variant">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-purple-500 text-[20px]">sms</span>
                      <div>
                        <h4 className="font-bold text-xs text-on-surface">SMS Critical Alerts</h4>
                        <p className="text-[11px] text-on-surface-variant">Instant text notifications for emergency grievances and critical attendance warnings.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!preferences.sms_alerts}
                        onChange={(e) => setPreferences({ ...preferences, sms_alerts: e.target.checked ? 1 : 0 })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vibrant-orange"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notification Categories */}
              <div className="bento-card space-y-4">
                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange text-[22px]">tune</span>
                  <span>Alert Categories</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl border border-outline-variant">
                    <div>
                      <h4 className="font-bold text-xs text-on-surface">OJT Progress & Daily Time Records</h4>
                      <p className="text-[10px] text-on-surface-variant">Attendance verifications, supervisor clock signatures, milestones.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!preferences.ojt_updates}
                      onChange={(e) => setPreferences({ ...preferences, ojt_updates: e.target.checked ? 1 : 0 })}
                      className="rounded accent-vibrant-orange"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl border border-outline-variant">
                    <div>
                      <h4 className="font-bold text-xs text-on-surface">Grievance & Incident Reports</h4>
                      <p className="text-[10px] text-on-surface-variant">Real-time status changes when complaints or incidents are resolved.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!preferences.grievance_alerts}
                      onChange={(e) => setPreferences({ ...preferences, grievance_alerts: e.target.checked ? 1 : 0 })}
                      className="rounded accent-vibrant-orange"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className="px-6 py-2.5 bg-vibrant-orange text-white rounded-xl font-bold text-xs hover:bg-deep-orange transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>{saving ? 'Saving...' : 'Save Notification Preferences'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE MANAGEMENT */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Avatar Card */}
              <div className="bento-card space-y-5">
                <div>
                  <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-vibrant-orange text-[22px]">photo_camera</span>
                    <span>Profile Picture & Avatar</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Upload a high-quality headshot or select one of our verified professional avatars.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-surface-container rounded-2xl border border-outline-variant">
                  {/* Avatar Display */}
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-vibrant-orange shadow-md bg-surface-container-high flex items-center justify-center">
                      {avatarPreview ? (
                        <img
                          src={resolveFileUrl(avatarPreview)}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/photo/default-avatar.svg';
                          }}
                        />
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant text-[48px]">person</span>
                      )}
                    </div>
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                      </div>
                    )}
                  </div>

                  {/* Upload Actions */}
                  <div className="space-y-3 flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <label className="px-4 py-2 bg-vibrant-orange text-white rounded-xl text-xs font-bold hover:bg-deep-orange transition-colors cursor-pointer shadow-sm flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                        <span>Upload New Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                          disabled={uploadingAvatar}
                        />
                      </label>

                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={saving}
                          className="px-4 py-2 bg-surface text-red-500 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      Recommended: Square JPG, PNG, or WebP. Max file size: 5MB.
                    </p>
                  </div>
                </div>

                {/* Preset Avatars Selection */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                    Or choose a preset professional avatar:
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {presetAvatars.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectPresetAvatar(url)}
                        className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
                          avatarPreview === url ? 'border-vibrant-orange ring-2 ring-vibrant-orange/30' : 'border-outline-variant'
                        }`}
                      >
                        <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Personal Details Form */}
              <form onSubmit={handleSaveProfile} className="bento-card space-y-5">
                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange text-[22px]">badge</span>
                  <span>Personal Profile Details</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="How your name appears publicly"
                      value={profileForm.display_name}
                      onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-xs outline-none focus:ring-2 focus:ring-vibrant-orange font-bold text-on-surface"
                    />
                    <span className="text-[10px] text-on-surface-variant">Shown on your evaluations, comments, and headers.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
                      Account Email (Verified)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container text-xs text-on-surface-variant cursor-not-allowed opacity-80"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">First Name</label>
                    <input
                      type="text"
                      placeholder="First Name"
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-xs outline-none focus:ring-2 focus:ring-vibrant-orange text-on-surface"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-xs outline-none focus:ring-2 focus:ring-vibrant-orange text-on-surface"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Contact Number</label>
                    <input
                      type="tel"
                      placeholder="+63 9XX XXX XXXX"
                      value={profileForm.contact_number}
                      onChange={(e) => setProfileForm({ ...profileForm, contact_number: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-xs outline-none focus:ring-2 focus:ring-vibrant-orange text-on-surface"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Assigned Role</label>
                    <input
                      type="text"
                      disabled
                      value={(user?.role_name || user?.role || '').replace(/_/g, ' ').toUpperCase()}
                      className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container text-xs text-on-surface-variant font-bold cursor-not-allowed opacity-80"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-vibrant-orange text-white rounded-xl font-bold text-xs hover:bg-deep-orange transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SECURITY & PASSWORD */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <form onSubmit={handleChangePassword} className="bento-card space-y-5">
                <div>
                  <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-vibrant-orange text-[22px]">lock_reset</span>
                    <span>Change Account Password</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Ensure your account is protected with a strong, distinct password containing numbers and special characters.
                  </p>
                </div>

                <div className="space-y-4 max-w-xl">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        required
                        placeholder="Enter your existing password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="w-full px-3 py-2.5 pr-10 rounded-xl border border-outline-variant bg-surface-container-low text-xs outline-none focus:ring-2 focus:ring-vibrant-orange text-on-surface"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPasswords.current ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        required
                        placeholder="At least 8 characters with numbers & symbols"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-3 py-2.5 pr-10 rounded-xl border border-outline-variant bg-surface-container-low text-xs outline-none focus:ring-2 focus:ring-vibrant-orange text-on-surface"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPasswords.new ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {passwordForm.newPassword && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-on-surface-variant">Strength:</span>
                          <span className="font-bold text-on-surface">{pwdStrength.label}</span>
                        </div>
                        <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                            style={{ width: `${pwdStrength.score}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        required
                        placeholder="Re-enter your new password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className={`w-full px-3 py-2.5 pr-10 rounded-xl border text-xs outline-none focus:ring-2 text-on-surface ${
                          passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword
                            ? 'border-red-400 bg-red-50/20 focus:ring-red-400'
                            : 'border-outline-variant bg-surface-container-low focus:ring-vibrant-orange'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPasswords.confirm ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                      <span className="text-[10px] text-red-500 font-bold mt-1 block">Passwords do not match.</span>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving || (passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword)}
                      className="px-6 py-2.5 bg-vibrant-orange text-white rounded-xl font-bold text-xs hover:bg-deep-orange transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">key</span>
                      <span>{saving ? 'Updating...' : 'Update Password'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Security Session Details */}
              <div className="bento-card space-y-3">
                <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px]">verified_user</span>
                  <span>Session & Account Status</span>
                </h4>
                <div className="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Account Email:</span>
                    <span className="font-bold text-on-surface">{user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Account Security Verification:</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-tint text-pinoy-green font-bold text-[10px]">
                      Verified Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Role Authorization:</span>
                    <span className="font-bold text-on-surface">{(user?.role_name || user?.role || '').toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: APPEARANCE & THEME */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Header & Status Banner */}
              <div className="bento-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-vibrant-orange text-[22px]">palette</span>
                      <span>Appearance & Theme System</span>
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Select your preferred display theme. Experience our high-performance <strong>Aura Radiant Dark</strong> template or stick with <strong>Classic Light</strong>.
                    </p>
                  </div>

                  {/* Active Theme Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 w-fit ${
                      isDark
                        ? 'bg-primary-container/20 text-primary-container border-primary-container/40'
                        : 'bg-orange-tint text-vibrant-orange border-orange-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {isDark ? 'dark_mode' : 'light_mode'}
                    </span>
                    <span>{isDark ? 'Aura Radiant Dark Active' : 'Classic Light Active'}</span>
                  </span>
                </div>

                {/* Instant Quick Toggle Bar */}
                <div className="p-4 sm:p-5 bg-surface-container rounded-2xl border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isDark
                          ? 'bg-primary-container/20 text-primary-container shadow-sm'
                          : 'bg-orange-tint text-vibrant-orange'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[24px]">
                        {isDark ? 'dark_mode' : 'light_mode'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">Instant Theme Toggle</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Switch seamlessly between Classic Light and Aura Radiant Dark.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-xs font-semibold text-on-surface-variant">
                      {isDark ? 'Dark Mode' : 'Light Mode'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isDark}
                        onChange={toggleTheme}
                        className="sr-only peer"
                        aria-label="Toggle dark mode"
                      />
                      <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vibrant-orange"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Theme Preset Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Classic Light Mode */}
                <div
                  onClick={() => setTheme('light')}
                  className={`bento-card cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                    theme === 'light'
                      ? 'border-vibrant-orange ring-2 ring-vibrant-orange/30 shadow-md'
                      : 'hover:border-outline-variant/80'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Visual Mini Mockup (Light) */}
                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-[#F8F9FA] p-3 shadow-inner">
                      <div className="h-4 bg-white rounded-md border border-gray-200 mb-2 flex items-center justify-between px-2">
                        <div className="w-8 h-1.5 bg-orange-500 rounded-full"></div>
                        <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-8 h-14 bg-white rounded-md border border-gray-200 p-1 space-y-1">
                          <div className="w-full h-2 bg-orange-100 rounded"></div>
                          <div className="w-full h-1.5 bg-gray-200 rounded"></div>
                          <div className="w-full h-1.5 bg-gray-200 rounded"></div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="h-6 bg-white rounded-md border border-gray-200 p-1.5">
                            <div className="w-10 h-1.5 bg-gray-300 rounded"></div>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <div className="h-6 bg-white rounded-md border border-gray-200"></div>
                            <div className="h-6 bg-white rounded-md border border-gray-200"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber-500 text-[18px]">light_mode</span>
                        <span>Classic Light</span>
                      </h4>
                      {theme === 'light' && (
                        <span className="w-2 h-2 rounded-full bg-vibrant-orange"></span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Clean high-key contrast, crisp white cards, light slate backdrop, and vibrant Philippine orange accents.
                    </p>
                  </div>

                  <div className="pt-4 mt-2 border-t border-outline-variant flex items-center justify-between text-xs">
                    <span className="font-bold text-on-surface-variant">Default Theme</span>
                    <span className={`font-bold ${theme === 'light' ? 'text-vibrant-orange' : 'text-on-surface-variant'}`}>
                      {theme === 'light' ? 'Selected' : 'Select'}
                    </span>
                  </div>
                </div>

                {/* 2. Aura Radiant Dark */}
                <div
                  onClick={() => setTheme('dark')}
                  className={`bento-card cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                    theme === 'dark'
                      ? 'border-[#ff8c00] ring-2 ring-[#ff8c00]/40 shadow-md'
                      : 'hover:border-outline-variant/80'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Visual Mini Mockup (Aura Radiant Dark) */}
                    <div className="rounded-xl overflow-hidden border border-[#1e3147] bg-[#051424] p-3 shadow-inner">
                      <div className="h-4 bg-[#051424] rounded-md border border-[#1e3147] mb-2 flex items-center justify-between px-2">
                        <div className="w-8 h-1.5 bg-[#ff8c00] rounded-full"></div>
                        <div className="w-3 h-3 rounded-full bg-[#1e293b]"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-8 h-14 bg-[#051424] rounded-md border border-[#1e3147] p-1 space-y-1">
                          <div className="w-full h-2 bg-[#ff8c00] rounded shadow-[0_0_8px_rgba(255,140,0,0.5)]"></div>
                          <div className="w-full h-1.5 bg-[#1e293b] rounded"></div>
                          <div className="w-full h-1.5 bg-[#1e293b] rounded"></div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="h-6 bg-[#0d1c2d] rounded-md border border-[#1e3147] p-1.5">
                            <div className="w-10 h-1.5 bg-[#273647] rounded"></div>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <div className="h-6 bg-[#0d1c2d] rounded-md border border-[#1e3147]"></div>
                            <div className="h-6 bg-[#0d1c2d] rounded-md border border-[#1e3147]"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#ff8c00] text-[18px]">dark_mode</span>
                        <span>Aura Radiant Dark</span>
                      </h4>
                      {theme === 'dark' && (
                        <span className="w-2 h-2 rounded-full bg-[#ff8c00] shadow-[0_0_6px_#ff8c00]"></span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Deep slate canvas (<code className="text-[11px] text-[#ff8c00]">#051424</code>), elevated cards (<code className="text-[11px] text-[#ff8c00]">#0d1c2d</code>), and glowing amber-orange accents.
                    </p>
                  </div>

                  <div className="pt-4 mt-2 border-t border-outline-variant flex items-center justify-between text-xs">
                    <span className="font-bold text-[#ff8c00] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      <span>Aura Theme</span>
                    </span>
                    <span className={`font-bold ${theme === 'dark' ? 'text-[#ff8c00]' : 'text-on-surface-variant'}`}>
                      {theme === 'dark' ? 'Selected' : 'Select'}
                    </span>
                  </div>
                </div>

                {/* 3. System Match */}
                <div
                  onClick={() => setTheme('system')}
                  className={`bento-card cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                    theme === 'system'
                      ? 'border-vibrant-orange ring-2 ring-vibrant-orange/30 shadow-md'
                      : 'hover:border-outline-variant/80'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Visual Mini Mockup (System Split) */}
                    <div className="rounded-xl overflow-hidden border border-outline-variant p-3 shadow-inner flex">
                      <div className="w-1/2 bg-[#F8F9FA] p-2 border-r border-gray-300">
                        <div className="h-3 bg-white rounded border border-gray-200 mb-1"></div>
                        <div className="h-6 bg-white rounded border border-gray-200"></div>
                      </div>
                      <div className="w-1/2 bg-[#051424] p-2">
                        <div className="h-3 bg-[#0d1c2d] rounded border border-[#1e3147] mb-1"></div>
                        <div className="h-6 bg-[#0d1c2d] rounded border border-[#1e3147]"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-blue-500 text-[18px]">settings_brightness</span>
                        <span>System Default</span>
                      </h4>
                      {theme === 'system' && (
                        <span className="w-2 h-2 rounded-full bg-vibrant-orange"></span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Automatically syncs with your operating system settings. Currently resolving to <strong>{effectiveTheme}</strong>.
                    </p>
                  </div>

                  <div className="pt-4 mt-2 border-t border-outline-variant flex items-center justify-between text-xs">
                    <span className="font-bold text-on-surface-variant">Dynamic Sync</span>
                    <span className={`font-bold ${theme === 'system' ? 'text-vibrant-orange' : 'text-on-surface-variant'}`}>
                      {theme === 'system' ? 'Selected' : 'Select'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Aura Radiant Dark Specification Card */}
              <div className="bento-card space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ff8c00] text-[20px]">architecture</span>
                    <span>InternConPH Design System Tokens (Aura Radiant Dark)</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant border border-outline-variant">
                    aura_radiant_dark_dashboard
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Calibrated according to our proprietary design specifications. Combines deep slate architecture with an electric radiant amber-orange focus:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
                  <div className="p-2.5 rounded-xl border border-outline-variant bg-surface-container space-y-1.5">
                    <div className="w-full h-7 rounded-lg bg-[#051424] border border-white/10 shadow-xs"></div>
                    <p className="text-[11px] font-bold text-on-surface">Canvas Base</p>
                    <p className="text-[10px] font-mono text-on-surface-variant">#051424</p>
                  </div>

                  <div className="p-2.5 rounded-xl border border-outline-variant bg-surface-container space-y-1.5">
                    <div className="w-full h-7 rounded-lg bg-[#0d1c2d] border border-white/10 shadow-xs"></div>
                    <p className="text-[11px] font-bold text-on-surface">Surface Card</p>
                    <p className="text-[10px] font-mono text-on-surface-variant">#0d1c2d</p>
                  </div>

                  <div className="p-2.5 rounded-xl border border-outline-variant bg-surface-container space-y-1.5">
                    <div className="w-full h-7 rounded-lg bg-[#102235] border border-white/10 shadow-xs"></div>
                    <p className="text-[11px] font-bold text-on-surface">Container</p>
                    <p className="text-[10px] font-mono text-on-surface-variant">#102235</p>
                  </div>

                  <div className="p-2.5 rounded-xl border border-outline-variant bg-surface-container space-y-1.5">
                    <div className="w-full h-7 rounded-lg bg-[#1e3147] border border-white/10 shadow-xs"></div>
                    <p className="text-[11px] font-bold text-on-surface">Outline Border</p>
                    <p className="text-[10px] font-mono text-on-surface-variant">#1e3147</p>
                  </div>

                  <div className="p-2.5 rounded-xl border border-outline-variant bg-surface-container space-y-1.5">
                    <div className="w-full h-7 rounded-lg bg-[#ff8c00] shadow-[0_0_12px_rgba(255,140,0,0.5)]"></div>
                    <p className="text-[11px] font-bold text-on-surface">Radiant Accent</p>
                    <p className="text-[10px] font-mono text-on-surface-variant">#ff8c00</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
