import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import MentorPasscodeGeneratedModal from '../../components/Organization/MentorPasscodeGeneratedModal';

export default function OrgMentors() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState({
    pendingMentors: [],
    verifiedMentors: [],
    rejectedMentors: [],
    accessCodes: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'verified', 'codes', 'rejected'
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedMentor, setSelectedMentor] = useState(null); // For full inspection modal
  const [actionLoading, setActionLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [jobs, setJobs] = useState([]);

  // Passcode Generator State
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [codeForm, setCodeForm] = useState({
    target_identifier: '',
    department: '',
    intended_position: 'workplace_mentor'
  });

  // Generated Passcode Celebration Modal State
  const [showGeneratedCelebrationModal, setShowGeneratedCelebrationModal] = useState(false);
  const [generatedModalData, setGeneratedModalData] = useState(null);

  useEffect(() => {
    if (searchParams.get('action') === 'add_mentor' || location.state?.openGeneratePasscode) {
      setShowCodeModal(true);
      setGeneratedCode('');
      setErrorMsg('');
      setMessage('Please generate an invitation passcode to onboard your workplace mentor.');
    }
  }, [searchParams, location.state]);

  const fetchMentorsData = useCallback(async () => {
    try {
      const [mentorsRes, progsRes, jobsRes] = await Promise.all([
        api.get('/org/mentors'),
        api.get('/org/programs'),
        api.get('/org/jobs')
      ]);

      if (mentorsRes.success) {
        setData({
          pendingMentors: mentorsRes.pendingMentors || [],
          verifiedMentors: mentorsRes.verifiedMentors || mentorsRes.data || [],
          rejectedMentors: mentorsRes.rejectedMentors || [],
          accessCodes: mentorsRes.accessCodes || []
        });
      }
      if (progsRes.success && progsRes.data) {
        setPrograms(progsRes.data);
      }
      if (jobsRes.success && jobsRes.data) {
        setJobs(jobsRes.data);
      }
    } catch (err) {
      console.error('Error fetching mentors data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMentorsData();
  }, [fetchMentorsData]);

  // Real-time synchronization
  useRealtimeRefresh(fetchMentorsData);

  // Real-time duplicate identifier validation against active codes, verified mentors, and pending mentors
  const duplicateWarning = useMemo(() => {
    const raw = codeForm.target_identifier?.trim();
    if (!raw) return null;
    const clean = raw.toLowerCase();

    // 1. Check in active unused passcodes
    const existingCode = (data.accessCodes || []).find((c) => {
      const codeTarget = (c.target_identifier || '').trim().toLowerCase();
      const codeEmail = (c.intended_email || '').trim().toLowerCase();
      const isExpired = c.expires_at && new Date(c.expires_at) <= new Date();
      return !c.is_used && !isExpired && (codeTarget === clean || codeEmail === clean);
    });

    if (existingCode) {
      return {
        type: 'passcode',
        code: existingCode.code_hash || existingCode.passcode_code,
        message: `An active, unused passcode [${existingCode.code_hash || existingCode.passcode_code}] already exists for "${raw}". Multiple passcodes for the same identifier are not allowed.`
      };
    }

    // 2. Check in verified mentors
    const existingVerified = (data.verifiedMentors || []).find((m) => {
      const empId = (m.staff_number || '').trim().toLowerCase();
      const email = (m.email || '').trim().toLowerCase();
      return empId === clean || email === clean;
    });

    if (existingVerified) {
      return {
        type: 'verified',
        name: `${existingVerified.first_name} ${existingVerified.last_name}`,
        message: `Workplace mentor "${existingVerified.first_name} ${existingVerified.last_name}" is already registered and verified in your organization with this identifier.`
      };
    }

    // 3. Check in pending mentors
    const existingPending = (data.pendingMentors || []).find((m) => {
      const empId = (m.staff_number || '').trim().toLowerCase();
      const email = (m.email || '').trim().toLowerCase();
      return empId === clean || email === clean;
    });

    if (existingPending) {
      return {
        type: 'pending',
        name: `${existingPending.first_name} ${existingPending.last_name}`,
        message: `Workplace mentor "${existingPending.first_name} ${existingPending.last_name}" has already registered with this identifier and is awaiting approval in the Pending tab.`
      };
    }

    return null;
  }, [codeForm.target_identifier, data.accessCodes, data.verifiedMentors, data.pendingMentors]);

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    if (!codeForm.target_identifier || !codeForm.target_identifier.trim()) return;

    if (duplicateWarning) {
      setErrorMsg(duplicateWarning.message);
      return;
    }

    setIsGenerating(true);
    setMessage('');
    setErrorMsg('');

    try {
      const res = await api.post('/org/mentors/access-code', codeForm);
      if (res.success && res.data) {
        const newCode = res.data.access_code;
        setGeneratedCode(newCode);
        setGeneratedModalData({
          access_code: newCode,
          target_identifier: codeForm.target_identifier.trim(),
          department: codeForm.department || 'All Programs / General Workplace Supervision',
          organization_name: res.data.organization_name,
          expires_at: new Date(Date.now() + 14 * 86400000)
        });
        setShowCodeModal(false);
        setShowGeneratedCelebrationModal(true);
        setMessage(`Mentor Access Passcode [${newCode}] generated successfully for: ${codeForm.target_identifier.trim()}!`);
        setCodeForm({ target_identifier: '', department: '', intended_position: 'workplace_mentor' });
        fetchMentorsData();
      } else {
        setErrorMsg(res.message || 'Failed to generate access code.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Server error while generating access code.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerifyMentor = async (staffId, action, reason = '') => {
    setActionLoading(true);
    setMessage('');
    setErrorMsg('');

    try {
      const res = await api.put(`/org/mentors/${staffId}/verify`, {
        action,
        rejection_reason: reason
      });

      if (res.success) {
        setMessage(res.message);
        setSelectedMentor(null);
        fetchMentorsData();
      } else {
        setErrorMsg(res.message || 'Failed to update mentor verification status.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Server error while updating mentor verification.');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = data.pendingMentors?.length || 0;
  const verifiedCount = data.verifiedMentors?.length || 0;
  const rejectedCount = data.rejectedMentors?.length || 0;
  const codesCount = data.accessCodes?.length || 0;

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Workplace Mentors & Supervisors</h1>
          <p className="text-sm text-on-surface-variant">
            Generate invitation passcodes, verify newly registered mentor credentials, and manage active internship trainers.
          </p>
        </div>

        <button
          onClick={() => { setShowCodeModal(true); setGeneratedCode(''); setErrorMsg(''); }}
          className="px-5 py-2.5 bg-vibrant-orange text-white rounded-lg font-bold text-sm hover:bg-deep-orange transition-colors shadow-sm flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">vpn_key</span>
          <span>+ Generate Mentor Passcode</span>
        </button>
      </div>

      {/* Toast Messages */}
      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2 border border-pinoy-green/20 animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-error-container text-error rounded-lg text-xs font-bold flex items-center gap-2 border border-error/20 animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Generated Code Display Banner */}
      {generatedCode && (
        <div className="bento-card bg-orange-tint/40 border border-vibrant-orange/30 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-vibrant-orange text-white flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">vpn_key</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-vibrant-orange uppercase tracking-wider">OFFICIAL HR MENTOR PASSCODE</p>
                <p className="text-2xl font-mono font-bold text-on-surface tracking-widest">{generatedCode}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Valid for 14 days. Provide this passcode to the workplace mentor to complete their registration.</p>
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedCode);
                setMessage(`Mentor passcode [${generatedCode}] copied to clipboard!`);
              }}
              className="px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              <span>Copy Passcode</span>
            </button>
          </div>
        </div>
      )}

      {/* Categorized Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant pb-2 overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-vibrant-orange text-white'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">pending_actions</span>
          <span>Pending Verification</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-bold animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('verified')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'verified'
              ? 'bg-vibrant-orange text-white'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">verified_user</span>
          <span>Verified Mentors</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10">{verifiedCount}</span>
        </button>

        <button
          onClick={() => setActiveTab('codes')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'codes'
              ? 'bg-vibrant-orange text-white'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">key</span>
          <span>Passcodes & Invites</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10">{codesCount}</span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'rejected'
              ? 'bg-vibrant-orange text-white'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">cancel</span>
          <span>Rejected ({rejectedCount})</span>
        </button>
      </div>

      {/* TAB 1: PENDING VERIFICATIONS */}
      {activeTab === 'pending' && (
        <div className="bento-card space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-on-surface">Pending Workplace Mentors</h2>
              <p className="text-xs text-on-surface-variant">Review mentor applications and activate internal supervisor privileges.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-orange-tint text-xs font-bold text-vibrant-orange">
              {pendingCount} Pending Verification
            </span>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : data.pendingMentors?.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-2 text-pinoy-green">check_circle</span>
              <p className="text-base font-bold text-on-surface">All Workplace Mentors Verified!</p>
              <p className="text-xs mt-1">There are currently no new mentor registration requests pending HR review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[780px]">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                    <th className="py-3 px-4">Mentor Name & ID</th>
                    <th className="py-3 px-4">Job Title & Department</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Passcode Used</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4 text-right">Verification Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {data.pendingMentors.map((mentor) => {
                    const isEmpIdMismatch = Boolean(
                      mentor.employee_id_mismatch ||
                      (mentor.passcode_target_identifier &&
                        !mentor.passcode_target_identifier.includes('@') &&
                        mentor.staff_number &&
                        mentor.passcode_target_identifier.trim().toLowerCase() !== mentor.staff_number.trim().toLowerCase())
                    );
                    const isEmailMismatch = Boolean(
                      mentor.email_mismatch ||
                      (mentor.passcode_target_identifier &&
                        mentor.passcode_target_identifier.includes('@') &&
                        mentor.email &&
                        mentor.passcode_target_identifier.trim().toLowerCase() !== mentor.email.trim().toLowerCase())
                    );
                    const isDeptMismatch = Boolean(
                      mentor.department_mismatch ||
                      (mentor.passcode_intended_department &&
                        mentor.department &&
                        mentor.passcode_intended_department.trim().toLowerCase() !== mentor.department.trim().toLowerCase())
                    );
                    const isIdMismatch = Boolean(
                      mentor.identifier_mismatch ||
                      (mentor.passcode_target_identifier &&
                        mentor.passcode_target_identifier.trim().toLowerCase() !== (mentor.staff_number || '').trim().toLowerCase() &&
                        mentor.passcode_target_identifier.trim().toLowerCase() !== (mentor.email || '').trim().toLowerCase())
                    );
                    const hasMismatch = mentor.has_discrepancy || isEmpIdMismatch || isEmailMismatch || isDeptMismatch || isIdMismatch;

                    return (
                      <tr
                        key={mentor.org_staff_id}
                        className={`transition-colors ${
                          hasMismatch
                            ? 'bg-red-500/[0.03] hover:bg-red-500/[0.07]'
                            : 'hover:bg-surface-container-low'
                        }`}
                      >
                        {/* Name & ID */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-on-surface">
                              {mentor.title || ''} {mentor.first_name} {mentor.middle_name ? `${mentor.middle_name} ` : ''}{mentor.last_name} {mentor.suffix || ''}
                            </p>
                            {hasMismatch && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-600 flex items-center gap-1 border border-red-500/30 animate-pulse">
                                <span className="material-symbols-outlined text-[13px]">warning</span>
                                <span>⚠️ Unmatched Info</span>
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${isEmpIdMismatch || isIdMismatch ? 'text-red-600 font-bold' : 'text-on-surface-variant'}`}>
                            Emp ID: <span className="font-mono">{mentor.staff_number ? `#${mentor.staff_number}` : 'N/A'}</span>
                          </p>
                        </td>

                        {/* Job Title & Department */}
                        <td className="py-3 px-4 text-xs">
                          <p className="font-bold text-on-surface">{mentor.job_title || 'Workplace Mentor'}</p>
                          <p className={isDeptMismatch ? 'text-red-600 font-bold' : 'text-on-surface-variant'}>
                            {mentor.department || 'Department'}
                          </p>
                          {mentor.work_location && (
                            <p className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[13px]">location_on</span>
                              <span>{mentor.work_location}</span>
                            </p>
                          )}
                        </td>

                        {/* Contact Info */}
                        <td className="py-3 px-4 text-xs text-on-surface-variant">
                          <p className={`font-medium ${isEmailMismatch ? 'text-red-600 font-bold' : 'text-on-surface'}`}>
                            {mentor.email}
                          </p>
                          <p>{mentor.contact_number || 'No contact number'}</p>
                        </td>

                        {/* Passcode Used */}
                        <td className="py-3 px-4 text-xs">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                            hasMismatch
                              ? 'bg-red-500/15 text-red-700 border border-red-500/30'
                              : 'bg-surface-container text-on-surface'
                          }`}>
                            {mentor.passcode_used || 'DIRECT'}
                          </span>
                        </td>

                        {/* Submitted Date */}
                        <td className="py-3 px-4 text-xs text-on-surface-variant">
                          {mentor.created_at ? new Date(mentor.created_at).toLocaleDateString() : 'Recent'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedMentor(mentor)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border ${
                                hasMismatch
                                  ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/40'
                                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-transparent'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px]">visibility</span>
                              <span>Inspect</span>
                            </button>

                            <button
                              disabled={actionLoading}
                              onClick={() => handleVerifyMentor(mentor.org_staff_id, 'approve')}
                              className="px-3 py-1.5 bg-pinoy-green hover:opacity-90 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              <span>Approve</span>
                            </button>

                            <button
                              disabled={actionLoading}
                              onClick={() => {
                                if (window.confirm(`Reject and delete registration for ${mentor.first_name} ${mentor.last_name}? This will permanently remove the submission.`)) {
                                  handleVerifyMentor(mentor.org_staff_id, 'reject', 'Rejected by HR during credentials review.');
                                }
                              }}
                              className="px-2.5 py-1.5 bg-error-container hover:bg-red-200 text-error rounded-lg text-xs font-bold transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VERIFIED ACTIVE MENTORS */}
      {activeTab === 'verified' && (
        <div className="bento-card space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Verified Workplace Mentors ({verifiedCount})</h2>
              <p className="text-xs text-on-surface-variant">
                Active mentors authorized to handle OJT internships, monitor intern attendance, and submit student performance reviews.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : verifiedCount === 0 ? (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-2">supervisor_account</span>
              <p className="text-base font-bold text-on-surface">No Verified Mentors Active</p>
              <p className="text-xs mt-1">Generate a mentor passcode above to invite and register industry trainers.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[780px]">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                    <th className="py-3 px-4">Workplace Mentor</th>
                    <th className="py-3 px-4">Role & Department</th>
                    <th className="py-3 px-4">Contact Details</th>
                    <th className="py-3 px-4">Active Interns</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {data.verifiedMentors.map((mentor) => (
                    <tr key={mentor.org_staff_id} className="hover:bg-surface-container-low transition-colors">
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-orange-tint text-vibrant-orange font-bold flex items-center justify-center text-xs">
                            {mentor.first_name?.[0]}{mentor.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">
                              {mentor.title || ''} {mentor.first_name} {mentor.last_name} {mentor.suffix || ''}
                            </p>
                            <p className="text-xs text-on-surface-variant">Emp ID: #{mentor.staff_number || 'N/A'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Job Title & Department */}
                      <td className="py-3 px-4 text-xs">
                        <p className="font-bold text-on-surface">{mentor.job_title || 'Workplace Mentor'}</p>
                        <p className="text-on-surface-variant">{mentor.department || 'Department'}</p>
                        {mentor.work_location && (
                          <p className="text-[11px] text-on-surface-variant mt-0.5">{mentor.work_location}</p>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 text-xs text-on-surface-variant">
                        <p className="font-medium text-on-surface">{mentor.email}</p>
                        <p>{mentor.contact_number || 'No phone recorded'}</p>
                      </td>

                      {/* Active Interns */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold">
                          <span className="material-symbols-outlined text-[13px]">badge</span>
                          <span>{mentor.active_interns_count || 0} active</span>
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="py-3 px-4 text-xs text-on-surface-variant">
                        {mentor.last_login_at ? new Date(mentor.last_login_at).toLocaleDateString() : 'Never logged in'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedMentor(mentor)}
                          className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-bold text-on-surface transition-colors inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACCESS PASSCODES & INVITATIONS */}
      {activeTab === 'codes' && (
        <div className="bento-card space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Generated Mentor Invitation Passcodes</h2>
              <p className="text-xs text-on-surface-variant">
                Official HR passcodes issued to onboard Workplace Mentors. Each code grants secure access to register under this organization.
              </p>
            </div>
            <button
              onClick={() => { setShowCodeModal(true); setGeneratedCode(''); }}
              className="px-4 py-2 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors"
            >
              + Generate Passcode
            </button>
          </div>

          {data.accessCodes?.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-2">vpn_key_off</span>
              <p className="font-bold text-on-surface">No Passcodes Generated Yet</p>
              <p className="text-xs mt-1">Generate a passcode to invite an internal trainer or supervisor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[850px]">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                    <th className="py-3 px-4">Passcode</th>
                    <th className="py-3 px-4">Target Employee ID / Email</th>
                    <th className="py-3 px-4">Target Department</th>
                    <th className="py-3 px-4">Target Role</th>
                    <th className="py-3 px-4">Status & Used By</th>
                    <th className="py-3 px-4">Expires At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {data.accessCodes.map((code) => {
                    const isUsed = code.is_used === 1;
                    const isExpired = new Date(code.expires_at) < new Date();

                    return (
                      <tr key={code.code_id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-on-surface text-sm">
                          {code.code_hash}
                        </td>

                        <td className="py-3 px-4 text-xs font-bold text-on-surface">
                          {code.target_identifier}
                        </td>

                        <td className="py-3 px-4 text-xs text-on-surface-variant">
                          {code.intended_department || 'Any Department'}
                        </td>

                        <td className="py-3 px-4 text-xs capitalize text-on-surface-variant">
                          {code.intended_position?.replace('_', ' ') || 'Workplace Mentor'}
                        </td>

                        <td className="py-3 px-4">
                          {isUsed ? (
                            <div>
                              <span className="px-2 py-0.5 rounded-full bg-green-tint text-pinoy-green text-[10px] font-bold">
                                Used
                              </span>
                              {code.used_by_first_name && (
                                <p className="text-[11px] text-on-surface-variant mt-0.5">
                                  {code.used_by_first_name} {code.used_by_last_name} ({code.used_by_email})
                                </p>
                              )}
                            </div>
                          ) : isExpired ? (
                            <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-bold">
                              Expired
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-orange-tint text-vibrant-orange text-[10px] font-bold">
                              Active / Unused
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-on-surface-variant">
                          {new Date(code.expires_at).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {!isUsed && !isExpired && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(code.code_hash);
                                setMessage(`Passcode [${code.code_hash}] copied to clipboard!`);
                              }}
                              className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high rounded text-xs font-bold text-on-surface transition-colors"
                            >
                              Copy
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REJECTED RECORDS */}
      {activeTab === 'rejected' && (
        <div className="bento-card space-y-4">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Rejected Workplace Mentor Registrations</h2>
            <p className="text-xs text-on-surface-variant">
              Applications rejected during credentials review. Note: Rejected mentor submissions are automatically deleted to allow clean re-application.
            </p>
          </div>

          {data.rejectedMentors?.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-2 text-pinoy-green">check_circle</span>
              <p className="font-bold text-on-surface">No Rejected Registrations</p>
              <p className="text-xs mt-1">Rejected registrations are automatically deleted immediately upon rejection.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[650px]">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                    <th className="py-3 px-4">Applicant Name</th>
                    <th className="py-3 px-4">Employee ID & Email</th>
                    <th className="py-3 px-4">Rejection Reason</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {data.rejectedMentors.map((mentor) => (
                    <tr key={mentor.org_staff_id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3 px-4 font-bold text-on-surface">
                        {mentor.first_name} {mentor.last_name}
                      </td>
                      <td className="py-3 px-4 text-xs text-on-surface-variant">
                        <p className="font-bold text-on-surface">#{mentor.staff_number}</p>
                        <p>{mentor.email}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-error font-medium">
                        {mentor.rejection_reason || mentor.reg_rejection_reason || 'Rejected by HR'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-xs text-on-surface-variant italic">Removed</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FULL MENTOR PROFILE INSPECTION MODAL WITH UNMATCHED WARNING LOGIC */}
      {selectedMentor && (() => {
        const isEmpIdMismatch = Boolean(
          selectedMentor.employee_id_mismatch ||
          (selectedMentor.passcode_target_identifier &&
            !selectedMentor.passcode_target_identifier.includes('@') &&
            selectedMentor.staff_number &&
            selectedMentor.passcode_target_identifier.trim().toLowerCase() !== selectedMentor.staff_number.trim().toLowerCase())
        );

        const isEmailMismatch = Boolean(
          selectedMentor.email_mismatch ||
          (selectedMentor.passcode_target_identifier &&
            selectedMentor.passcode_target_identifier.includes('@') &&
            selectedMentor.email &&
            selectedMentor.passcode_target_identifier.trim().toLowerCase() !== selectedMentor.email.trim().toLowerCase())
        );

        const isDeptMismatch = Boolean(
          selectedMentor.department_mismatch ||
          (selectedMentor.passcode_intended_department &&
            selectedMentor.department &&
            selectedMentor.passcode_intended_department.trim().toLowerCase() !== selectedMentor.department.trim().toLowerCase())
        );

        const isIdMismatch = Boolean(
          selectedMentor.identifier_mismatch ||
          (selectedMentor.passcode_target_identifier &&
            selectedMentor.passcode_target_identifier.trim().toLowerCase() !== (selectedMentor.staff_number || '').trim().toLowerCase() &&
            selectedMentor.passcode_target_identifier.trim().toLowerCase() !== (selectedMentor.email || '').trim().toLowerCase())
        );

        const hasAnyMismatch = isEmpIdMismatch || isEmailMismatch || isDeptMismatch || isIdMismatch || selectedMentor.has_discrepancy;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface max-w-2xl w-full rounded-2xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    hasAnyMismatch ? 'bg-red-500/15 text-red-600' : 'bg-orange-tint text-vibrant-orange'
                  }`}>
                    <span className="material-symbols-outlined text-[26px]">
                      {hasAnyMismatch ? 'warning' : 'badge'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                      <span>Workplace Mentor Credentials Inspection</span>
                      {hasAnyMismatch && (
                        <span className="px-2 py-0.5 bg-red-500 text-white rounded text-[10px] font-extrabold uppercase tracking-wider">
                          ⚠️ Discrepancy Found
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Submitted registration data for HR verification & authorization
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMentor(null)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {/* PROMINENT TOP WARNING ALERT IF UNMATCHED DATA DETECTED */}
                {hasAnyMismatch && (
                  <div className="p-4 bg-red-500/10 border-2 border-red-500/40 rounded-xl space-y-2 text-red-600 animate-fade-in shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <span className="material-symbols-outlined text-red-600 text-[22px]">warning</span>
                      <span>⚠️ Warning: Unmatched Registration Information Detected</span>
                    </div>
                    <p className="text-xs text-red-700 font-medium leading-relaxed">
                      One or more fields submitted during the Workplace Mentor Account Registration do not match the HR-issued Passcode configuration (Mentor Identifier or Department). Review the <span className="underline font-bold">red highlighted entries</span> below with the warning signs (⚠️) before approving this account.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {isEmpIdMismatch && (
                        <span className="px-2.5 py-1 bg-red-500/20 text-red-800 font-bold rounded text-[11px] flex items-center gap-1 border border-red-500/30">
                          <span className="material-symbols-outlined text-[14px]">badge</span>
                          <span>Mentor Identifier / Employee ID Mismatch</span>
                        </span>
                      )}
                      {isDeptMismatch && (
                        <span className="px-2.5 py-1 bg-red-500/20 text-red-800 font-bold rounded text-[11px] flex items-center gap-1 border border-red-500/30">
                          <span className="material-symbols-outlined text-[14px]">domain</span>
                          <span>Department / Division Mismatch</span>
                        </span>
                      )}
                      {isEmailMismatch && (
                        <span className="px-2.5 py-1 bg-red-500/20 text-red-800 font-bold rounded text-[11px] flex items-center gap-1 border border-red-500/30">
                          <span className="material-symbols-outlined text-[14px]">mail</span>
                          <span>Corporate Work Email Mismatch</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Personal & Employment Info */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-vibrant-orange flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">business</span>
                    <span>Company Credentials & Department</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Employee ID */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                      isEmpIdMismatch
                        ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/40 shadow-sm'
                        : 'bg-surface-container-low border-outline-variant'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`block text-[10px] font-bold uppercase tracking-wider ${isEmpIdMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface-variant'}`}>
                          {isEmpIdMismatch ? '⚠️ Company Employee ID (Unmatched)' : 'Company Employee ID'}
                        </span>
                        {isEmpIdMismatch && (
                          <span className="px-2 py-0.5 rounded bg-red-500 text-white font-extrabold text-[10px] flex items-center gap-0.5 shadow-sm">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            <span>MISMATCH</span>
                          </span>
                        )}
                      </div>
                      <span className={`font-bold text-sm block mt-1 font-mono ${isEmpIdMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface'}`}>
                        {selectedMentor.staff_number ? `#${selectedMentor.staff_number}` : 'Not provided'}
                      </span>
                      {isEmpIdMismatch && selectedMentor.passcode_target_identifier && (
                        <div className="mt-2 pt-2 border-t border-red-500/30 text-[11px] text-red-700 space-y-0.5">
                          <span className="font-bold flex items-center gap-1 text-red-600">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            <span>HR Passcode Identifier Preset:</span>
                          </span>
                          <span className="font-extrabold text-red-800 bg-red-500/20 px-2 py-0.5 rounded inline-block font-mono">
                            {selectedMentor.passcode_target_identifier}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Department */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                      isDeptMismatch
                        ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/40 shadow-sm'
                        : 'bg-surface-container-low border-outline-variant'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDeptMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface-variant'}`}>
                          {isDeptMismatch ? '⚠️ Department / Division (Unmatched)' : 'Department / Division'}
                        </span>
                        {isDeptMismatch && (
                          <span className="px-2 py-0.5 rounded bg-red-500 text-white font-extrabold text-[10px] flex items-center gap-0.5 shadow-sm">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            <span>MISMATCH</span>
                          </span>
                        )}
                      </div>
                      <span className={`font-bold text-sm block mt-1 ${isDeptMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface'}`}>
                        {selectedMentor.department || 'General'}
                      </span>
                      {isDeptMismatch && selectedMentor.passcode_intended_department && (
                        <div className="mt-2 pt-2 border-t border-red-500/30 text-[11px] text-red-700 space-y-0.5">
                          <span className="font-bold flex items-center gap-1 text-red-600">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            <span>HR Passcode Department Preset:</span>
                          </span>
                          <span className="font-extrabold text-red-800 bg-red-500/20 px-2 py-0.5 rounded inline-block">
                            {selectedMentor.passcode_intended_department}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Job Title */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        Job Title / Position
                      </span>
                      <span className="font-bold text-on-surface text-sm block mt-1">
                        {selectedMentor.job_title || 'Workplace Mentor'}
                      </span>
                    </div>

                    {/* Work Location */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        Work Location / Site
                      </span>
                      <span className="font-bold text-on-surface text-sm block mt-1">
                        {selectedMentor.work_location || 'Office / Site'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Personal Identity & Contact Information */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-vibrant-orange flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">contact_mail</span>
                    <span>Personal Identity & Contact Info</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Full Name */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        Full Name
                      </span>
                      <span className="font-bold text-on-surface text-sm block mt-1">
                        {selectedMentor.title || ''} {selectedMentor.first_name} {selectedMentor.middle_name ? `${selectedMentor.middle_name} ` : ''}{selectedMentor.last_name} {selectedMentor.suffix || ''}
                      </span>
                    </div>

                    {/* Email */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                      isEmailMismatch
                        ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/40 shadow-sm'
                        : 'bg-surface-container-low border-outline-variant'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`block text-[10px] font-bold uppercase tracking-wider ${isEmailMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface-variant'}`}>
                          {isEmailMismatch ? '⚠️ Corporate Work Email (Unmatched)' : 'Corporate Work Email'}
                        </span>
                        {isEmailMismatch && (
                          <span className="px-2 py-0.5 rounded bg-red-500 text-white font-extrabold text-[10px] flex items-center gap-0.5 shadow-sm">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            <span>MISMATCH</span>
                          </span>
                        )}
                      </div>
                      <span className={`font-bold text-sm block mt-1 ${isEmailMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface'}`}>
                        {selectedMentor.email}
                      </span>
                      {isEmailMismatch && selectedMentor.passcode_target_identifier && (
                        <div className="mt-2 pt-2 border-t border-red-500/30 text-[11px] text-red-700 space-y-0.5">
                          <span className="font-bold flex items-center gap-1 text-red-600">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            <span>HR Passcode Email Preset:</span>
                          </span>
                          <span className="font-extrabold text-red-800 bg-red-500/20 px-2 py-0.5 rounded inline-block font-mono">
                            {selectedMentor.passcode_target_identifier}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Contact Number */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        Contact Number
                      </span>
                      <span className="font-bold text-on-surface text-sm block mt-1">
                        {selectedMentor.contact_number || 'None provided'}
                      </span>
                    </div>

                    {/* Passcode Used */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        Passcode Validated
                      </span>
                      <span className="font-bold text-vibrant-orange text-sm font-mono block mt-1">
                        {selectedMentor.passcode_used || 'HR Passcode Match'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Banner */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  selectedMentor.is_verified
                    ? 'bg-green-tint/40 border-pinoy-green/30 text-pinoy-green'
                    : 'bg-orange-tint/40 border-vibrant-orange/30 text-vibrant-orange'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">
                      {selectedMentor.is_verified ? 'verified_user' : 'hourglass_top'}
                    </span>
                    <div>
                      <p className="font-bold text-xs">
                        Status: {selectedMentor.is_verified ? 'Verified & Active' : 'Pending HR Verification'}
                      </p>
                      <p className="text-[10px] opacity-80">
                        {selectedMentor.is_verified
                          ? 'Mentor can supervise intern attendance and grade performance evaluations.'
                          : 'Account is blocked from logging in until HR approves the credentials.'}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-white/60">
                    {selectedMentor.is_verified ? 'Active' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMentor(null)}
                  className="px-4 py-2 bg-surface-container text-on-surface font-bold text-xs rounded-lg hover:bg-surface-container-high"
                >
                  Close
                </button>

                {!selectedMentor.is_verified ? (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => {
                        if (window.confirm(`Reject and delete registration for ${selectedMentor.first_name} ${selectedMentor.last_name}? This will permanently remove the submission.`)) {
                          handleVerifyMentor(selectedMentor.org_staff_id, 'reject', 'Rejected by HR during credentials review.');
                        }
                      }}
                      className="px-4 py-2 bg-error-container text-error font-bold text-xs rounded-lg hover:bg-red-200"
                    >
                      Reject & Delete
                    </button>

                    <button
                      disabled={actionLoading}
                      onClick={() => handleVerifyMentor(selectedMentor.org_staff_id, 'approve')}
                      className="px-5 py-2 bg-pinoy-green text-white font-bold text-xs rounded-lg hover:opacity-90 shadow-sm flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>Approve & Activate Mentor</span>
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={actionLoading}
                    onClick={() => {
                      if (window.confirm('Are you sure you want to deactivate and remove this workplace mentor?')) {
                        handleVerifyMentor(selectedMentor.org_staff_id, 'reject', 'Deactivated by HR');
                      }
                    }}
                    className="px-4 py-2 bg-error-container text-error font-bold text-xs rounded-lg hover:bg-red-200"
                  >
                    Deactivate & Remove Mentor
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* GENERATE ACCESS CODE MODAL */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-outline-variant shadow-2xl w-full max-w-md space-y-4 p-6">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-bold text-on-surface">Generate Mentor Access Passcode</h3>
                <p className="text-xs text-on-surface-variant">Create an authorized invitation code for a workplace mentor</p>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleGenerateCode} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-on-surface block mb-1">
                  Mentor Identifier (Employee ID or Email) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., EMP-2026-889 or mentor@company.com"
                  value={codeForm.target_identifier}
                  onChange={(e) => setCodeForm({ ...codeForm, target_identifier: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border bg-surface text-on-surface outline-none transition-colors ${
                    duplicateWarning
                      ? 'border-error bg-red-50/20 focus:border-error'
                      : 'border-outline-variant focus:border-vibrant-orange'
                  }`}
                />
                {duplicateWarning ? (
                  <div className="mt-1.5 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-start gap-1.5 animate-fade-in">
                    <span className="material-symbols-outlined text-[16px] text-red-600 shrink-0 mt-0.5">error</span>
                    <span className="font-medium leading-tight">{duplicateWarning.message}</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    Enter the mentor's official Employee ID or work email. Multiple passcodes or duplicate accounts for the same identifier are prevented.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-on-surface block">
                    Target Department / Assigned OJT Program *
                  </label>
                  {isCustomDept ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDept(false);
                        setCodeForm({ ...codeForm, department: '' });
                      }}
                      className="text-[11px] text-vibrant-orange hover:underline font-bold"
                    >
                      ← Select from list
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDept(true);
                        setCodeForm({ ...codeForm, department: '' });
                      }}
                      className="text-[11px] text-on-surface-variant hover:text-vibrant-orange hover:underline font-medium"
                    >
                      + Type custom
                    </button>
                  )}
                </div>

                {!isCustomDept ? (
                  <select
                    required
                    value={codeForm.department}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomDept(true);
                        setCodeForm({ ...codeForm, department: '' });
                      } else {
                        setCodeForm({ ...codeForm, department: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface outline-none focus:border-vibrant-orange text-xs font-semibold"
                  >
                    <option value="">— Select Target OJT Program from Program Database —</option>
                    <option value="All Programs / General Workplace Supervision">
                      All Programs / General Workplace Supervision (Company-Wide)
                    </option>
                    {Object.entries(
                      programs.reduce((acc, p) => {
                        const deptKey = p.department || 'General Degree Programs';
                        if (!acc[deptKey]) acc[deptKey] = [];
                        acc[deptKey].push(p);
                        return acc;
                      }, {})
                    ).map(([dept, progs]) => (
                      <optgroup key={dept} label={`Department / Discipline: ${dept}`}>
                        {progs.map((p) => (
                          <option key={p.program_id} value={p.program_name}>
                            {p.program_name} {p.program_code ? `(${p.program_code})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="__custom__">
                      + Other / Custom Corporate Department (Type manually)
                    </option>
                  </select>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Enterprise Systems & Cloud Solutions Dept"
                      value={codeForm.department}
                      onChange={(e) => setCodeForm({ ...codeForm, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-vibrant-orange bg-surface text-on-surface outline-none focus:border-vibrant-orange text-xs font-semibold"
                      autoFocus
                    />
                    <p className="text-[10px] text-on-surface-variant">
                      Type the specific corporate department or division in your company.
                    </p>
                  </div>
                )}
                {!isCustomDept && (
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    Select the active academic OJT degree program from the database that this workplace mentor is authorized to handle.
                  </p>
                )}
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant text-[11px] text-on-surface-variant space-y-1">
                <p className="font-bold text-on-surface">Workplace Mentor Registration Flow:</p>
                <p>1. The mentor will register at the Workplace Mentor Registration page using this passcode.</p>
                <p>2. Once submitted, their profile will appear in the <strong>"Pending Verification"</strong> tab for your review.</p>
                <p>3. After your approval, they can log in to supervise interns and submit performance ratings.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowCodeModal(false)}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-bold text-xs hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !!duplicateWarning}
                  className="px-5 py-2 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {isGenerating && <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>}
                  <span>{isGenerating ? 'Generating Passcode...' : 'Generate Passcode'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CELEBRATION MODAL WHEN PASSCODE IS GENERATED */}
      <MentorPasscodeGeneratedModal
        isOpen={showGeneratedCelebrationModal}
        onClose={() => setShowGeneratedCelebrationModal(false)}
        data={generatedModalData}
        onGenerateAnother={() => {
          setShowGeneratedCelebrationModal(false);
          setShowCodeModal(true);
          setCodeForm({ target_identifier: '', department: '', intended_position: 'workplace_mentor' });
          setErrorMsg('');
        }}
      />
    </div>
  );
}
