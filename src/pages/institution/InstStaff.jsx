import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import PasscodeGeneratedModal from '../../components/Institution/PasscodeGeneratedModal';
import EmailInput from '../../components/ui/EmailInput';
import { validateEmail } from '../../utils/email';

export default function InstStaff() {
  const { user } = useAuth();
  const [data, setData] = useState({
    staff: [],
    pendingStaff: [],
    verifiedStaff: [],
    rejectedStaff: [],
    accessCodes: []
  });
  const [programs, setPrograms] = useState([]);
  const [staffScope, setStaffScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'active', 'codes'
  const [selectedStaff, setSelectedStaff] = useState(null); // For detailed personal info modal
  const [generatedCode, setGeneratedCode] = useState(null);
  const [showGeneratedModal, setShowGeneratedModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Passcode Management UX State
  const [passcodeSearch, setPasscodeSearch] = useState('');
  const [passcodeStatusFilter, setPasscodeStatusFilter] = useState('all'); // 'all', 'active', 'used', 'expired'
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: 'delete', code: null });
  const [selectedPasscode, setSelectedPasscode] = useState(null); // For detailed passcode & claim modal

  // Active Staff Management UX State
  const [activeStaffSearch, setActiveStaffSearch] = useState('');
  const [activeStaffDeptFilter, setActiveStaffDeptFilter] = useState('all');

  // Expiration Date Helper
  const getDefaultExpirationDate = (days = 14) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Passcode Generator State
  const [staffNumber, setStaffNumber] = useState('');
  const [position, setPosition] = useState('ojt_coordinator');
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffEmailError, setStaffEmailError] = useState(null);
  const emailInputRef = useRef(null);
  const [expirationDate, setExpirationDate] = useState(() => getDefaultExpirationDate(14));
  const [permissions, setPermissions] = useState({
    can_verify_students: true,
    can_manage_ojt_records: true,
    can_handle_grievances: true,
    can_approve_job_offers: true
  });

  const isOJTHead = user?.role === 'institution' || user?.position === 'ojt_head' || user?.position === 'director';
  const assignedProgramId = user?.program_id || staffScope?.programId || null;

  const fetchStaffData = useCallback(async () => {
    try {
      const res = await api.get('/inst/staff');
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.staff_scope) {
          setStaffScope(res.data.staff_scope);
        }
        if (Array.isArray(res.data.departments) && res.data.departments.length > 0) {
          setDepartments(res.data.departments);
        }
      }
      const progRes = await api.get('/inst/programs');
      if (progRes.success && progRes.data) {
        setPrograms(progRes.data);
        if (progRes.staff_scope) {
          setStaffScope(progRes.staff_scope);
        }
        setDepartments((prev) => {
          if (prev && prev.length > 0) return prev;
          const extracted = Array.from(new Set(progRes.data.map((p) => p.department).filter(Boolean))).sort();
          return extracted;
        });
      }
    } catch (err) {
      console.error('Error loading staff data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  // If department list loads and selectedDepartment is unset, default to first department
  useEffect(() => {
    if (!selectedDepartment && departments.length > 0) {
      setSelectedDepartment(departments[0]);
    }
  }, [departments, selectedDepartment]);

  // Live real-time update hook
  useRealtimeRefresh(fetchStaffData);

  const cleanInputId = staffNumber.trim().toUpperCase();

  // Check for duplicate active passcode
  const duplicateActiveCode = useMemo(() => {
    if (!cleanInputId || !data.accessCodes) return null;
    return data.accessCodes.find(
      c => c.target_identifier?.toUpperCase() === cleanInputId && !c.is_used && new Date(c.expires_at) > new Date()
    );
  }, [cleanInputId, data.accessCodes]);

  // Check for already registered staff with same ID
  const duplicateStaffMember = useMemo(() => {
    if (!cleanInputId || !data.staff) return null;
    return data.staff.find(
      s => s.employee_id?.toUpperCase() === cleanInputId || s.staff_number?.toUpperCase() === cleanInputId
    );
  }, [cleanInputId, data.staff]);

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    if (!cleanInputId) return;

    if (duplicateActiveCode) {
      alert(`Duplicate Staff ID: An active passcode (${duplicateActiveCode.code_hash}) already exists for Staff ID "${cleanInputId}". Staff IDs cannot be duplicated.`);
      return;
    }

    if (duplicateStaffMember) {
      alert(`Duplicate Staff ID: Staff coordinator "${duplicateStaffMember.first_name} ${duplicateStaffMember.last_name}" is already registered with Staff ID "${cleanInputId}".`);
      return;
    }

    if (!expirationDate) {
      alert('Please select a valid Code Expiration Date.');
      return;
    }

    if (staffEmail && staffEmail.trim()) {
      const emailErr = validateEmail(staffEmail.trim(), { required: false });
      if (emailErr) {
        setStaffEmailError(emailErr);
        emailInputRef.current?.focus();
        return;
      }
    }

    setIsGenerating(true);
    setMessage('');
    setGeneratedCode(null);

    const payload = {
      staff_number: cleanInputId,
      position: 'ojt_coordinator',
      intended_email: staffEmail || null,
      permissions,
      expiration_date: expirationDate,
      program_id: selectedProgram || null
    };

    if (selectedProgram) {
      const prog = programs.find((p) => String(p.program_id) === String(selectedProgram));
      payload.department = prog?.department || null;
    } else if (selectedDepartment) {
      payload.department = selectedDepartment;
    }

    try {
      const res = await api.post('/inst/staff/access-code', payload);

      if (res.success && res.data) {
        const effectiveProgId = res.data.program_id || payload.program_id;
        const progObj = programs.find((p) => String(p.program_id) === String(effectiveProgId));
        const effectiveDept = res.data.intended_department || payload.department;

        const enrichedData = {
          ...res.data,
          intended_department: effectiveDept,
          program_name: progObj
            ? `${progObj.program_name} (${progObj.program_code})`
            : effectiveDept
            ? `Dept: ${effectiveDept}`
            : 'All Programs / Institution-Wide',
          permissions
        };
        setGeneratedCode(enrichedData);
        setShowGeneratedModal(true);
        setMessage(
          `OJT Coordinator Passcode [${res.data.access_code}] generated successfully for Staff ID: ${cleanInputId}! Share this with the coordinator.`
        );
        setStaffNumber('');
        setStaffEmail('');
        setExpirationDate(getDefaultExpirationDate(14));
        fetchStaffData();
      } else {
        alert(res.message || 'Failed to generate staff passcode.');
      }
    } catch (err) {
      alert(err.message || 'Server error while generating passcode.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerifyStaff = async (staffId, action, reason = '') => {
    setActionLoading(true);
    setMessage('');
    try {
      const res = await api.put(`/inst/staff/${staffId}/verify`, {
        action,
        rejection_reason: reason
      });

      if (res.success) {
        setMessage(res.message);
        setSelectedStaff(null);
        fetchStaffData();
      } else {
        alert(res.message || 'Failed to update staff status.');
      }
    } catch (err) {
      alert(err.message || 'Server error while updating staff verification.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = (codeHash, codeId) => {
    if (!codeHash) return;
    navigator.clipboard.writeText(codeHash);
    setCopiedCodeId(codeId);
    setTimeout(() => {
      setCopiedCodeId((current) => (current === codeId ? null : current));
    }, 2000);
  };

  const formatExpiration = (expiresAt, isUsed) => {
    if (isUsed) {
      return {
        label: 'Claimed / Used',
        badge: 'bg-green-tint text-pinoy-green border-pinoy-green/30',
        sub: 'Redeemed by coordinator',
        icon: 'check_circle'
      };
    }
    const expDate = new Date(expiresAt);
    const now = new Date();
    const isExp = expDate <= now;

    if (isExp) {
      const diffDays = Math.max(0, Math.floor((now - expDate) / (1000 * 60 * 60 * 24)));
      return {
        label: 'Expired / Inactive',
        badge: 'bg-red-500/10 text-red-500 border-red-500/20',
        sub: diffDays === 0 ? 'Expired today' : diffDays === 1 ? 'Expired yesterday' : `Expired ${diffDays}d ago`,
        icon: 'timer_off'
      };
    }

    const diffDays = Math.max(0, Math.ceil((expDate - now) / (1000 * 60 * 60 * 24)));
    return {
      label: 'Active / Ready',
      badge: 'bg-vibrant-orange/10 text-vibrant-orange border-vibrant-orange/30',
      sub: diffDays === 0 ? 'Expires today' : diffDays === 1 ? 'Expires tomorrow' : `Expires in ${diffDays}d`,
      icon: 'verified'
    };
  };

  const passcodeStats = useMemo(() => {
    const list = data.accessCodes || [];
    const now = new Date();
    let active = 0;
    let used = 0;
    let expired = 0;

    list.forEach((c) => {
      const isExp = new Date(c.expires_at) <= now;
      if (c.is_used) {
        used++;
      } else if (isExp) {
        expired++;
      } else {
        active++;
      }
    });

    return {
      total: list.length,
      active,
      used,
      expired
    };
  }, [data.accessCodes]);

  const filteredAccessCodes = useMemo(() => {
    let list = data.accessCodes || [];
    const now = new Date();

    if (passcodeStatusFilter !== 'all') {
      list = list.filter((c) => {
        const isExp = new Date(c.expires_at) <= now;
        if (passcodeStatusFilter === 'active') return !c.is_used && !isExp;
        if (passcodeStatusFilter === 'used') return Boolean(c.is_used);
        if (passcodeStatusFilter === 'expired') return !c.is_used && isExp;
        return true;
      });
    }

    if (passcodeSearch.trim()) {
      const q = passcodeSearch.trim().toLowerCase();
      list = list.filter((c) => {
        return (
          c.code_hash?.toLowerCase().includes(q) ||
          c.target_identifier?.toLowerCase().includes(q) ||
          c.intended_position?.toLowerCase().includes(q) ||
          c.intended_email?.toLowerCase().includes(q) ||
          c.used_by_email?.toLowerCase().includes(q) ||
          c.program_name?.toLowerCase().includes(q) ||
          c.intended_department?.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [data.accessCodes, passcodeStatusFilter, passcodeSearch]);

  const filteredVerifiedStaff = useMemo(() => {
    let list = data.verifiedStaff || [];

    if (activeStaffDeptFilter !== 'all') {
      list = list.filter((s) => {
        const staffDept = (s.department_name || s.department || '').trim().toLowerCase();
        return staffDept === activeStaffDeptFilter.toLowerCase();
      });
    }

    if (activeStaffSearch.trim()) {
      const q = activeStaffSearch.trim().toLowerCase();
      list = list.filter((s) => {
        const fullName = `${s.salutation || ''} ${s.first_name || ''} ${s.middle_name || ''} ${s.last_name || ''} ${s.suffix || ''}`.toLowerCase();
        return (
          fullName.includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.staff_number?.toLowerCase().includes(q) ||
          s.program_name?.toLowerCase().includes(q) ||
          s.department_name?.toLowerCase().includes(q) ||
          s.position?.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [data.verifiedStaff, activeStaffSearch, activeStaffDeptFilter]);

  const handleConfirmAction = async () => {
    if (!confirmModal.code) return;
    const { type, code } = confirmModal;

    setActionLoading(true);
    setMessage('');
    try {
      if (type === 'delete') {
        const res = await api.delete(`/inst/staff/access-code/${code.code_id}`);
        if (res.success) {
          setMessage(res.message || `Passcode ${code.code_hash} deleted successfully.`);
          setConfirmModal({ isOpen: false, type: 'delete', code: null });
          fetchStaffData();
        } else {
          alert(res.message || 'Failed to delete passcode.');
        }
      } else if (type === 'deactivate') {
        const res = await api.post(`/inst/staff/access-code/${code.code_id}/deactivate`);
        if (res.success) {
          setMessage(res.message || `Passcode ${code.code_hash} deactivated successfully.`);
          setConfirmModal({ isOpen: false, type: 'deactivate', code: null });
          fetchStaffData();
        } else {
          alert(res.message || 'Failed to deactivate passcode.');
        }
      }
    } catch (err) {
      alert(err.message || `Server error while ${type}ing passcode.`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatPosition = (pos) => {
    switch (pos) {
      case 'ojt_coordinator':
      case 'ojt_supervisor':
      case 'registrar':
      case 'guidance_counselor':
      case 'dean':
        return { label: 'OJT Coordinator', color: 'bg-orange-tint text-vibrant-orange' };
      case 'ojt_head':
      case 'director':
        return { label: 'OJT Head', color: 'bg-yellow-500/10 text-yellow-600' };
      default:
        return { label: (pos || 'Coordinator').replace(/_/g, ' '), color: 'bg-surface-container text-on-surface' };
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Institution OJT Coordinators & Staff</h1>
          <p className="text-sm text-on-surface-variant">
            Issue OJT Head-authorized passcodes, inspect complete coordinator personal details, and verify registrations.
          </p>
        </div>
      </div>

      {/* Newly Generated Passcode Animated Showcase Banner */}
      {generatedCode && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-pinoy-green/10 border-2 border-vibrant-orange/40 rounded-2xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-scale-up">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-vibrant-orange text-white flex items-center justify-center shrink-0 shadow-lg shadow-vibrant-orange/30">
              <span className="material-symbols-outlined text-[26px] animate-bounce">key</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-vibrant-orange uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  Passcode Active
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-pinoy-green text-white font-bold">
                  Ready to Share
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                <span className="font-mono text-xl sm:text-2xl font-black text-on-surface select-all tracking-wider">
                  {generatedCode.access_code}
                </span>
                <span className="text-xs text-on-surface-variant font-medium">
                  for Staff ID: <strong className="text-on-surface font-mono">{generatedCode.staff_number}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={() => handleCopy(generatedCode.access_code, 'recent')}
              className="px-3.5 py-2 bg-vibrant-orange text-white rounded-xl text-xs font-bold hover:bg-deep-orange transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copiedCodeId === 'recent' ? 'check' : 'content_copy'}
              </span>
              <span>{copiedCodeId === 'recent' ? 'Copied!' : 'Copy Code'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGeneratedModal(true)}
              className="px-3.5 py-2 bg-surface border border-outline-variant text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>View Passcode Card</span>
            </button>

            <button
              type="button"
              onClick={() => setGeneratedCode(null)}
              className="p-2 text-on-surface-variant hover:text-on-surface rounded-lg transition-colors"
              title="Dismiss"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Standard Flash Message Banner (when no generated code is active) */}
      {!generatedCode && message && (
        <div className="p-4 bg-green-tint text-pinoy-green rounded-xl text-xs font-bold flex items-center justify-between gap-2 border border-pinoy-green/20 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{message}</span>
          </div>
        </div>
      )}

      {/* Main Grid: Passcode Generator on Left, Verification & Roster on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Passcode Generator Form / Authority Card */}
        <div className="bento-card space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-tint text-vibrant-orange flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">key</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">
                {isOJTHead ? 'Generate Coordinator Passcode' : 'Staff Governance'}
              </h2>
              <p className="text-[11px] text-on-surface-variant">
                {isOJTHead ? 'OJT Head-issued invitation for coordinators' : 'OJT Head Administrative Authority'}
              </p>
            </div>
          </div>

          {!isOJTHead ? (
            <div className="p-4 bg-surface-container rounded-xl border border-outline-variant text-xs space-y-2.5">
              <div className="flex items-center gap-2 text-vibrant-orange font-bold">
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <span>OJT Head Access Only</span>
              </div>
              <p className="text-on-surface-variant leading-relaxed">
                Only the university's main account (<strong>Institution OJT Head</strong>) has the administrative authority to issue authorization passcodes, onboard new staff, and verify coordinator accounts.
              </p>
            </div>
          ) : (
            <form noValidate onSubmit={handleGenerateCode} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">
                  Staff / Employee ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STF-2026-081"
                  value={staffNumber}
                  onChange={(e) => setStaffNumber(e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 rounded-lg border bg-surface-container-low text-on-surface font-mono font-bold outline-none focus:ring-2 ${duplicateActiveCode || duplicateStaffMember
                      ? 'border-error focus:ring-error text-error'
                      : 'border-outline-variant focus:ring-vibrant-orange'
                    }`}
                />
                {duplicateActiveCode && (
                  <div className="mt-1.5 p-2 rounded bg-error-container text-error text-[10px] font-bold flex items-center gap-1.5 border border-error/20">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    <span>Duplicate ID: Active code ({duplicateActiveCode.code_hash}) already exists (expires {new Date(duplicateActiveCode.expires_at).toLocaleDateString()}).</span>
                  </div>
                )}
                {duplicateStaffMember && (
                  <div className="mt-1.5 p-2 rounded bg-error-container text-error text-[10px] font-bold flex items-center gap-1.5 border border-error/20">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>Duplicate ID: Already assigned to registered staff ({duplicateStaffMember.first_name} {duplicateStaffMember.last_name}).</span>
                  </div>
                )}
                <p className="text-[10px] text-on-surface-variant mt-1">
                  Staff must match this exact Employee ID during passcode registration. Duplicates are strictly blocked.
                </p>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">
                  Staff Position / Role *
                </label>
                <select
                  value={position}
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-on-surface font-bold outline-none cursor-not-allowed"
                >
                  <option value="ojt_coordinator">OJT Coordinator (Full Coordination, Verification & Clearance)</option>
                </select>
                <p className="text-[10px] text-on-surface-variant mt-1 leading-normal">
                  OJT Coordinators possess full institutional authority across student verification, clearance requirements, DTR monitoring, grievance handling, and opportunity approvals.
                </p>
              </div>

              {/* Department / Program Selection */}
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">
                  Assigned Degree Program Scope
                </label>
                <select
                  value={selectedProgram}
                  onChange={(e) => {
                    setSelectedProgram(e.target.value);
                    if (e.target.value) {
                      const prog = programs.find((p) => String(p.program_id) === String(e.target.value));
                      if (prog?.department) setSelectedDepartment(prog.department);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-vibrant-orange"
                >
                  <option value="">All Programs / Institution-Wide</option>
                  {programs.map((p) => (
                    <option key={p.program_id} value={p.program_id}>
                      {p.program_name} ({p.program_code}){p.department ? ` — [${p.department}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <EmailInput
                  label="Coordinator Official Email (Optional)"
                  required={false}
                  placeholder="coordinator@university.edu.ph"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  error={staffEmailError}
                  onErrorChange={setStaffEmailError}
                  ref={emailInputRef}
                  className="bg-surface-container-low text-on-surface"
                />
              </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-on-surface-variant uppercase text-[11px]">
                  Code Expiration Date *
                </label>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setExpirationDate(getDefaultExpirationDate(7))}
                    className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${expirationDate === getDefaultExpirationDate(7)
                        ? 'bg-vibrant-orange text-white'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                      }`}
                  >
                    7d
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpirationDate(getDefaultExpirationDate(14))}
                    className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${expirationDate === getDefaultExpirationDate(14)
                        ? 'bg-vibrant-orange text-white'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                      }`}
                  >
                    14d
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpirationDate(getDefaultExpirationDate(30))}
                    className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${expirationDate === getDefaultExpirationDate(30)
                        ? 'bg-vibrant-orange text-white'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                      }`}
                  >
                    30d
                  </button>
                </div>
              </div>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-bold outline-none focus:ring-2 focus:ring-vibrant-orange"
              />
              <p className="text-[10px] text-on-surface-variant mt-1">
                The staff passcode will automatically expire at 23:59:59 on this date.
              </p>
            </div>

            <div className="p-3 bg-surface-container rounded-lg space-y-2 border border-outline-variant">
              <span className="font-bold text-[11px] text-on-surface uppercase tracking-wider block">
                Assigned System Permissions
              </span>
              <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.can_verify_students}
                  onChange={(e) => setPermissions({ ...permissions, can_verify_students: e.target.checked })}
                  className="rounded text-vibrant-orange"
                />
                <span>Verify student registrations</span>
              </label>
              <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.can_manage_ojt_records}
                  onChange={(e) => setPermissions({ ...permissions, can_manage_ojt_records: e.target.checked })}
                  className="rounded text-vibrant-orange"
                />
                <span>Manage OJT hours & mentor complaints</span>
              </label>
              <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.can_handle_grievances}
                  onChange={(e) => setPermissions({ ...permissions, can_handle_grievances: e.target.checked })}
                  className="rounded text-vibrant-orange"
                />
                <span>Review student formal grievances</span>
              </label>
              <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.can_approve_job_offers}
                  onChange={(e) => setPermissions({ ...permissions, can_approve_job_offers: e.target.checked })}
                  className="rounded text-vibrant-orange"
                />
                <span>Approve hiring org OJT / job offers</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-2.5 bg-vibrant-orange text-white font-bold rounded-lg hover:bg-deep-orange transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Generating Code...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">key</span>
                  <span>Generate Coordinator Passcode</span>
                </>
              )}
            </button>
          </form>
        )}
        </div>

        {/* Staff Tabs & Verification Views */}
        <div className="lg:col-span-2 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex border-b border-outline-variant gap-2 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${activeTab === 'pending'
                  ? 'border-vibrant-orange text-vibrant-orange'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
              <span>Pending Staff Verification</span>
              {data.pendingStaff?.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-vibrant-orange text-white font-bold animate-pulse">
                  {data.pendingStaff.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${activeTab === 'active'
                  ? 'border-vibrant-orange text-vibrant-orange'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">badge</span>
              <span>Active Verified Staff ({data.verifiedStaff?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('codes')}
              className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${activeTab === 'codes'
                  ? 'border-vibrant-orange text-vibrant-orange'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">vpn_key</span>
              <span>Issued Passcodes ({data.accessCodes?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: PENDING STAFF VERIFICATION QUEUE */}
          {activeTab === 'pending' && (
            <div className="bento-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-vibrant-orange text-[20px]">how_to_reg</span>
                    <span>
                      OJT Coordinator Registrations Awaiting Verification ({data.pendingStaff?.length || 0})
                    </span>
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Only OJT Coordinators who registered with a matching OJT Head Passcode and Staff ID appear in this queue.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
                </div>
              ) : !data.pendingStaff || data.pendingStaff.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant text-xs space-y-2">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">verified_user</span>
                  <p className="font-bold text-sm text-on-surface">No Pending Staff Registrations</p>
                  <p>All staff registrations with valid passcodes have been reviewed.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.pendingStaff.map((s) => {
                    const posBadge = formatPosition(s.position);
                    return (
                      <div
                        key={s.staff_id}
                        className={`p-4 bg-surface-container rounded-xl border text-xs space-y-3 transition-colors ${s.has_discrepancy || s.position_mismatch || s.program_mismatch || s.email_mismatch
                            ? 'border-red-500/50 hover:border-red-500'
                            : 'border-outline-variant hover:border-vibrant-orange/40'
                          }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-on-surface">
                                {s.salutation} {s.first_name} {s.middle_name} {s.last_name} {s.suffix}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${posBadge.color}`}>
                                {posBadge.label}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600">
                                Pending Approval
                              </span>
                              {(s.has_discrepancy || s.position_mismatch || s.program_mismatch || s.email_mismatch) && (
                                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-600 flex items-center gap-1 border border-red-500/30 animate-pulse">
                                  <span className="material-symbols-outlined text-[13px]">warning</span>
                                  <span>⚠️ Unmatched Info</span>
                                </span>
                              )}
                            </div>
                            <p className="text-on-surface-variant text-[11px]">
                              <span className={s.email_mismatch ? 'text-red-600 font-bold' : ''}>{s.email}</span> • Staff ID: <span className="font-bold text-on-surface font-mono">{s.staff_number}</span>
                              {s.program_name && <span className={s.program_mismatch ? 'text-red-600 font-bold' : ''}>{` • Program: ${s.program_name}`}</span>}
                              {s.department_name && ` • Dept: ${s.department_name}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setSelectedStaff(s)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors border ${s.has_discrepancy || s.position_mismatch || s.program_mismatch || s.email_mismatch
                                  ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/40'
                                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border-outline-variant'
                                }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                              <span>View Personal Info</span>
                            </button>

                            <button
                              disabled={actionLoading}
                              onClick={() => handleVerifyStaff(s.staff_id, 'approve')}
                              className="px-3 py-1.5 bg-pinoy-green text-white hover:opacity-90 rounded-lg font-bold text-xs flex items-center gap-1 transition-opacity shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                              <span>Approve</span>
                            </button>

                            <button
                              disabled={actionLoading}
                              onClick={() => {
                                const reason = prompt('Please enter rejection reason (optional):');
                                if (reason !== null) {
                                  handleVerifyStaff(s.staff_id, 'reject', reason);
                                }
                              }}
                              className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>

                        {/* Extra Detail Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-outline-variant text-[11px] text-on-surface-variant">
                          <div>
                            <span className="font-bold block text-on-surface">Contact:</span>
                            <span>{s.contact_number || 'Not provided'}</span>
                          </div>
                          <div>
                            <span className="font-bold block text-on-surface">Office Location:</span>
                            <span>{s.office_location || 'Campus / Office'}</span>
                          </div>
                          <div>
                            <span className="font-bold block text-on-surface">Passcode Used:</span>
                            <span className="font-mono text-vibrant-orange font-bold">{s.passcode_used || 'Verified Match'}</span>
                          </div>
                          <div>
                            <span className="font-bold block text-on-surface">Registered At:</span>
                            <span>{s.registration_submitted_at ? new Date(s.registration_submitted_at).toLocaleDateString() : 'Recent'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE VERIFIED STAFF ROSTER (CLEAN, UNIFORM TABLE VIEW) */}
          {activeTab === 'active' && (
            <div className="bento-card space-y-4">
              {/* Header & Meta Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant pb-4">
                <div>
                  <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-pinoy-green text-[22px]">verified</span>
                    <span>Active Institution Staff & Appointed Officers</span>
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Official roster of verified OJT coordinators, department heads, and academic supervisors.
                  </p>
                </div>
                {data.verifiedStaff?.length > 0 && (
                  <span className="px-3 py-1 bg-surface-container text-on-surface rounded-full text-xs font-bold border border-outline-variant self-start sm:self-auto shrink-0">
                    {filteredVerifiedStaff.length} of {data.verifiedStaff.length} {data.verifiedStaff.length === 1 ? 'Staff Member' : 'Staff Members'}
                  </span>
                )}
              </div>

              {/* Search & Department Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                    search
                  </span>
                  <input
                    type="text"
                    value={activeStaffSearch}
                    onChange={(e) => setActiveStaffSearch(e.target.value)}
                    placeholder="Search by name, Staff ID, email, program, or department..."
                    className="w-full pl-9 pr-8 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-vibrant-orange focus:ring-2 focus:ring-vibrant-orange/10 transition-all"
                  />
                  {activeStaffSearch && (
                    <button
                      type="button"
                      onClick={() => setActiveStaffSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-[14px]"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                {/* Department Filter Dropdown */}
                {departments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={activeStaffDeptFilter}
                      onChange={(e) => setActiveStaffDeptFilter(e.target.value)}
                      className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface font-semibold outline-none focus:border-vibrant-orange focus:ring-2 focus:ring-vibrant-orange/10 cursor-pointer"
                    >
                      <option value="all">All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
                </div>
              ) : !data.verifiedStaff || data.verifiedStaff.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-outline-variant rounded-2xl space-y-3 bg-surface-container-lowest">
                  <div className="w-12 h-12 rounded-full bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant/60">
                    <span className="material-symbols-outlined text-[28px]">groups</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-on-surface">No Active Staff Accounts</p>
                    <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                      No staff accounts have been verified yet. Check the Pending Verification tab to review registrations.
                    </p>
                  </div>
                </div>
              ) : filteredVerifiedStaff.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-outline-variant rounded-2xl space-y-3 bg-surface-container-lowest">
                  <div className="w-12 h-12 rounded-full bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant/60">
                    <span className="material-symbols-outlined text-[28px]">person_search</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-on-surface">No Matching Staff Found</p>
                    <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                      No verified staff matched your search query. Try adjusting your search keywords or resetting filters.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStaffSearch('');
                      setActiveStaffDeptFilter('all');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline-variant transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">refresh</span>
                    <span>Reset Filters</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop & Tablet Organized Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-outline-variant bg-surface">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead>
                        <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant whitespace-nowrap font-bold">
                          <th className="py-3.5 px-4">Staff Member & Contact</th>
                          <th className="py-3.5 px-4">Role & Academic Scope</th>
                          <th className="py-3.5 px-4 text-center">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/60">
                        {filteredVerifiedStaff.map((s) => {
                          const posBadge = formatPosition(s.position);
                          return (
                            <tr
                              key={s.staff_id}
                              className="hover:bg-surface-container-low/80 transition-colors"
                            >
                              {/* Staff Member & Contact */}
                              <td className="py-3.5 px-4 align-middle">
                                <div className="space-y-1">
                                  <div className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                                    <span>
                                      {s.salutation} {s.first_name} {s.middle_name} {s.last_name} {s.suffix}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[13px] text-on-surface-variant/70">mail</span>
                                    <span className="truncate max-w-[240px]">{s.email}</span>
                                  </div>
                                  <div className="text-[11px] font-mono text-on-surface-variant flex items-center gap-1">
                                    <span className="text-[10px] uppercase font-bold text-on-surface-variant/70">Staff ID:</span>
                                    <span className="font-bold text-on-surface">{s.staff_number || s.employee_id || 'N/A'}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Role & Scope */}
                              <td className="py-3.5 px-4 align-middle">
                                <div className="space-y-1.5 max-w-[320px]">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${posBadge.color}`}>
                                      {posBadge.label}
                                    </span>
                                    {(s.has_discrepancy || s.position_mismatch || s.program_mismatch || s.email_mismatch) && (
                                      <span
                                        title="Registration data differs from initial passcode configuration"
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap"
                                      >
                                        <span className="material-symbols-outlined text-[12px]">warning</span>
                                        <span>Note: Passcode Variance</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-on-surface-variant space-y-0.5">
                                    {s.program_name && (
                                      <p className="flex items-center gap-1 text-on-surface font-medium truncate" title={s.program_name}>
                                        <span className="material-symbols-outlined text-[13px] text-vibrant-orange shrink-0">school</span>
                                        <span className="truncate">{s.program_name}</span>
                                      </p>
                                    )}
                                    {s.department_name && (
                                      <p className="flex items-center gap-1 text-[10.5px] truncate" title={s.department_name}>
                                        <span className="material-symbols-outlined text-[13px] text-on-surface-variant/70 shrink-0">domain</span>
                                        <span className="truncate">Dept: {s.department_name}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Clean, Uniform Status Indicator */}
                              <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-green-tint text-pinoy-green border border-pinoy-green/30 shadow-2xs whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-pinoy-green animate-pulse" />
                                  <span className="material-symbols-outlined text-[14px]">verified</span>
                                  <span>Active & Verified</span>
                                </div>
                              </td>

                              {/* Action */}
                              <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStaff(s)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface hover:bg-surface-container-highest rounded-lg font-bold text-xs transition-colors border border-outline-variant hover:border-vibrant-orange/40 shadow-2xs cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[15px]">info</span>
                                  <span>Details</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Responsive Mobile Cards View (Screen < 768px) */}
                  <div className="md:hidden space-y-3">
                    {filteredVerifiedStaff.map((s) => {
                      const posBadge = formatPosition(s.position);
                      return (
                        <div
                          key={s.staff_id}
                          className="p-4 bg-surface rounded-xl border border-outline-variant space-y-3 shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-outline-variant/60 pb-2.5">
                            <div className="space-y-0.5">
                              <span className="font-bold text-sm text-on-surface block">
                                {s.salutation} {s.first_name} {s.middle_name} {s.last_name} {s.suffix}
                              </span>
                              <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-mono">
                                <span>Staff ID:</span>
                                <span className="font-bold text-on-surface">{s.staff_number || s.employee_id || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-tint text-pinoy-green border border-pinoy-green/30 whitespace-nowrap shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-pinoy-green animate-pulse" />
                              <span>Active & Verified</span>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${posBadge.color}`}>
                                {posBadge.label}
                              </span>
                              {(s.has_discrepancy || s.position_mismatch || s.program_mismatch || s.email_mismatch) && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center gap-1 border border-amber-500/30">
                                  <span className="material-symbols-outlined text-[12px]">warning</span>
                                  <span>Note: Passcode Variance</span>
                                </span>
                              )}
                            </div>

                            <div className="p-2.5 bg-surface-container-low rounded-lg text-[11px] text-on-surface-variant space-y-1">
                              <p className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[13px] text-on-surface-variant/70">mail</span>
                                <span className="truncate">{s.email}</span>
                              </p>
                              {s.program_name && (
                                <p className="flex items-center gap-1.5 text-on-surface font-medium">
                                  <span className="material-symbols-outlined text-[13px] text-vibrant-orange shrink-0">school</span>
                                  <span className="truncate">{s.program_name}</span>
                                </p>
                              )}
                              {s.department_name && (
                                <p className="flex items-center gap-1.5 text-[10.5px]">
                                  <span className="material-symbols-outlined text-[13px] text-on-surface-variant/70 shrink-0">domain</span>
                                  <span className="truncate">Dept: {s.department_name}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedStaff(s)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface hover:bg-surface-container-highest rounded-lg font-bold text-xs transition-colors border border-outline-variant"
                            >
                              <span className="material-symbols-outlined text-[15px]">info</span>
                              <span>View Staff Details</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: ISSUED PASSCODES HISTORY */}
          {activeTab === 'codes' && (
            <div className="bento-card space-y-5">
              {/* Header & Description */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant pb-4">
                <div>
                  <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-vibrant-orange text-[22px]">key</span>
                    <span>Issued Staff Passcodes & Status</span>
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Monitor authorization codes issued for staff coordinators, advisors, registrars, and deans.
                  </p>
                </div>
                {passcodeStats.total > 0 && (
                  <span className="px-3 py-1 bg-surface-container text-on-surface rounded-full text-xs font-bold border border-outline-variant self-start sm:self-auto">
                    {filteredAccessCodes.length} of {passcodeStats.total} {passcodeStats.total === 1 ? 'Code' : 'Codes'}
                  </span>
                )}
              </div>

              {/* Passcode Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setPasscodeStatusFilter('all')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${passcodeStatusFilter === 'all'
                      ? 'bg-surface-container border-vibrant-orange ring-2 ring-vibrant-orange/20 shadow-xs'
                      : 'bg-surface-container-low border-outline-variant hover:bg-surface-container'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">All Codes</span>
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">vpn_key</span>
                  </div>
                  <div className="text-xl font-extrabold text-on-surface mt-1">{passcodeStats.total}</div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5">Total issued</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPasscodeStatusFilter('active')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${passcodeStatusFilter === 'active'
                      ? 'bg-vibrant-orange/10 border-vibrant-orange ring-2 ring-vibrant-orange/20 shadow-xs'
                      : 'bg-surface-container-low border-outline-variant hover:bg-surface-container'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-vibrant-orange uppercase tracking-wider">Active</span>
                    <span className="material-symbols-outlined text-[16px] text-vibrant-orange">verified</span>
                  </div>
                  <div className="text-xl font-extrabold text-vibrant-orange mt-1">{passcodeStats.active}</div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5">Ready for signup</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPasscodeStatusFilter('used')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${passcodeStatusFilter === 'used'
                      ? 'bg-green-tint border-pinoy-green ring-2 ring-pinoy-green/20 shadow-xs'
                      : 'bg-surface-container-low border-outline-variant hover:bg-surface-container'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-pinoy-green uppercase tracking-wider">Claimed</span>
                    <span className="material-symbols-outlined text-[16px] text-pinoy-green">how_to_reg</span>
                  </div>
                  <div className="text-xl font-extrabold text-pinoy-green mt-1">{passcodeStats.used}</div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5">Redeemed by staff</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPasscodeStatusFilter('expired')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${passcodeStatusFilter === 'expired'
                      ? 'bg-red-500/10 border-red-500 ring-2 ring-red-500/20 shadow-xs'
                      : 'bg-surface-container-low border-outline-variant hover:bg-surface-container'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Inactive</span>
                    <span className="material-symbols-outlined text-[16px] text-red-500">timer_off</span>
                  </div>
                  <div className="text-xl font-extrabold text-red-500 mt-1">{passcodeStats.expired}</div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5">Expired / Revoked</div>
                </button>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                    search
                  </span>
                  <input
                    type="text"
                    value={passcodeSearch}
                    onChange={(e) => setPasscodeSearch(e.target.value)}
                    placeholder="Search by passcode, Staff ID, role, or email..."
                    className="w-full pl-9 pr-8 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-vibrant-orange focus:ring-2 focus:ring-vibrant-orange/10 transition-all"
                  />
                  {passcodeSearch && (
                    <button
                      type="button"
                      onClick={() => setPasscodeSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-[14px]"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                  <button
                    type="button"
                    onClick={() => setPasscodeStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${passcodeStatusFilter === 'all'
                        ? 'bg-on-surface text-surface'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    All ({passcodeStats.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasscodeStatusFilter('active')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${passcodeStatusFilter === 'active'
                        ? 'bg-vibrant-orange text-white'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    Active ({passcodeStats.active})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasscodeStatusFilter('used')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${passcodeStatusFilter === 'used'
                        ? 'bg-pinoy-green text-white'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    Used ({passcodeStats.used})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasscodeStatusFilter('expired')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${passcodeStatusFilter === 'expired'
                        ? 'bg-red-500 text-white'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    Expired ({passcodeStats.expired})
                  </button>
                </div>
              </div>

              {/* Passcodes List */}
              {filteredAccessCodes.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-outline-variant rounded-2xl space-y-3 bg-surface-container-lowest">
                  <div className="w-12 h-12 rounded-full bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant/60">
                    <span className="material-symbols-outlined text-[28px]">vpn_key_off</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-on-surface">No Passcodes Found</p>
                    <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                      {passcodeSearch || passcodeStatusFilter !== 'all'
                        ? 'No passcodes match your current search criteria or status filter.'
                        : 'No staff invitation passcodes have been generated yet. Use the Passcode Generator on the left to issue one.'}
                    </p>
                  </div>
                  {(passcodeSearch || passcodeStatusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setPasscodeSearch('');
                        setPasscodeStatusFilter('all');
                      }}
                      className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-outline-variant bg-surface">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant whitespace-nowrap">
                        <tr>
                          <th className="py-3 px-4">Passcode & Target ID</th>
                          <th className="py-3 px-4">Assigned Role & Academic Scope</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/60">
                        {filteredAccessCodes.map((c) => {
                          const roleInfo = formatPosition(c.intended_position);
                          const isExpired = new Date(c.expires_at) <= new Date();

                          return (
                            <tr key={c.code_id} className="hover:bg-surface-container-low/80 transition-colors">
                              {/* Passcode & Target ID */}
                              <td className="py-3.5 px-4 align-middle">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-extrabold text-vibrant-orange text-sm tracking-wide">
                                      {c.code_hash}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(c.code_hash, c.code_id)}
                                      title="Click to copy passcode"
                                      className={`p-1 rounded transition-colors cursor-pointer ${
                                        copiedCodeId === c.code_id
                                          ? 'bg-green-tint text-pinoy-green'
                                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-[14px]">
                                        {copiedCodeId === c.code_id ? 'check' : 'content_copy'}
                                      </span>
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-mono">
                                    <span className="text-[10px] uppercase font-bold text-on-surface-variant/70">Staff ID:</span>
                                    <span className="font-bold text-on-surface">{c.target_identifier}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Role & Scope */}
                              <td className="py-3.5 px-4 align-middle">
                                <div className="space-y-1 max-w-[280px]">
                                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${roleInfo.color}`}>
                                    {roleInfo.label}
                                  </span>
                                  {c.intended_position === 'dean' ? (
                                    <p
                                      className="text-[11px] font-bold text-vibrant-orange flex items-center gap-1 truncate"
                                      title={c.intended_department || c.program_name || 'Academic Department'}
                                    >
                                      <span className="material-symbols-outlined text-[13px] shrink-0">domain</span>
                                      <span className="truncate">Dept: {c.intended_department || c.program_name || 'Department-Wide'}</span>
                                    </p>
                                  ) : (
                                    <p
                                      className="text-[11px] text-on-surface-variant truncate flex items-center gap-1"
                                      title={c.program_name || c.intended_department || 'All Programs'}
                                    >
                                      {c.program_name ? (
                                        <>
                                          <span className="material-symbols-outlined text-[13px] text-vibrant-orange shrink-0">school</span>
                                          <span className="truncate">{c.program_name}</span>
                                        </>
                                      ) : c.intended_department ? (
                                        <>
                                          <span className="material-symbols-outlined text-[13px] shrink-0">domain</span>
                                          <span className="truncate">Dept: {c.intended_department}</span>
                                        </>
                                      ) : (
                                        <span>Scope: Institution-Wide</span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* Clean, Uniform Status Indicator */}
                              <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                                {c.is_used ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-green-tint text-pinoy-green border border-pinoy-green/30 shadow-2xs whitespace-nowrap">
                                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                    <span>Claimed</span>
                                  </span>
                                ) : isExpired ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-surface-container-high text-on-surface-variant border border-outline-variant shadow-2xs whitespace-nowrap">
                                    <span className="material-symbols-outlined text-[13px]">history</span>
                                    <span>Expired</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-2xs whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    <span>Active</span>
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPasscode(c)}
                                    title="View Full Passcode & Claim Details"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface hover:bg-surface-container-highest rounded-lg font-bold text-xs transition-colors border border-outline-variant hover:border-vibrant-orange/40 shadow-2xs cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">info</span>
                                    <span>Details</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCopy(c.code_hash, c.code_id)}
                                    title="Copy Passcode"
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                                      copiedCodeId === c.code_id
                                        ? 'bg-green-tint text-pinoy-green border-pinoy-green/30'
                                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high border-outline-variant'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      {copiedCodeId === c.code_id ? 'check' : 'content_copy'}
                                    </span>
                                    <span className="hidden xl:inline">{copiedCodeId === c.code_id ? 'Copied' : 'Copy'}</span>
                                  </button>

                                  {!c.is_used && !isExpired && (
                                    <button
                                      type="button"
                                      disabled={actionLoading}
                                      onClick={() => setConfirmModal({ isOpen: true, type: 'deactivate', code: c })}
                                      title="Deactivate passcode immediately"
                                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-500/10 border border-outline-variant hover:border-amber-300 transition-colors cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">block</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => setConfirmModal({ isOpen: true, type: 'delete', code: c })}
                                    title="Delete passcode and free Staff ID"
                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 border border-outline-variant hover:border-red-300 transition-colors cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View (Hidden on Desktop) */}
                  <div className="md:hidden space-y-3">
                    {filteredAccessCodes.map((c) => {
                      const roleInfo = formatPosition(c.intended_position);
                      const isExpired = new Date(c.expires_at) <= new Date();

                      return (
                        <div
                          key={c.code_id}
                          className="p-4 bg-surface rounded-xl border border-outline-variant space-y-3 shadow-xs text-xs"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-outline-variant/60 pb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-vibrant-orange text-base tracking-wide">
                                  {c.code_hash}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(c.code_hash, c.code_id)}
                                  className="p-1 rounded text-on-surface-variant hover:text-on-surface"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    {copiedCodeId === c.code_id ? 'check' : 'content_copy'}
                                  </span>
                                </button>
                              </div>
                              <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                                Staff ID: <span className="font-bold text-on-surface">{c.target_identifier}</span>
                              </p>
                            </div>

                            <div className="shrink-0">
                              {c.is_used ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-tint text-pinoy-green border border-pinoy-green/30 whitespace-nowrap">
                                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                  <span>Claimed</span>
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface-variant border border-outline-variant whitespace-nowrap">
                                  <span className="material-symbols-outlined text-[12px]">history</span>
                                  <span>Expired</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  <span>Active</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleInfo.color}`}>
                              {roleInfo.label}
                            </span>
                            {c.intended_position === 'dean' ? (
                              <span className="text-vibrant-orange font-bold truncate max-w-[220px] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">domain</span>
                                <span>Dept: {c.intended_department || c.program_name || 'Department-Wide'}</span>
                              </span>
                            ) : c.program_name ? (
                              <span className="text-on-surface-variant truncate max-w-[180px]">
                                • {c.program_name}
                              </span>
                            ) : c.intended_department ? (
                              <span className="text-on-surface-variant truncate max-w-[180px]">
                                • Dept: {c.intended_department}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-outline-variant/60">
                            <button
                              type="button"
                              onClick={() => setSelectedPasscode(c)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface hover:bg-surface-container-highest rounded-lg font-bold text-xs transition-colors border border-outline-variant cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">info</span>
                              <span>View Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopy(c.code_hash, c.code_id)}
                              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-bold transition-colors flex items-center gap-1 text-[11px] border border-outline-variant cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {copiedCodeId === c.code_id ? 'check' : 'content_copy'}
                              </span>
                              <span>{copiedCodeId === c.code_id ? 'Copied' : 'Copy'}</span>
                            </button>

                            {!c.is_used && !isExpired && (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setConfirmModal({ isOpen: true, type: 'deactivate', code: c })}
                                className="p-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg font-bold transition-colors disabled:opacity-50 cursor-pointer"
                                title="Deactivate Passcode"
                              >
                                <span className="material-symbols-outlined text-[16px]">block</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => setConfirmModal({ isOpen: true, type: 'delete', code: c })}
                              className="p-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 rounded-lg font-bold transition-colors disabled:opacity-50 cursor-pointer"
                              title="Delete Passcode"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>

              )}
            </div>
          )}
        </div>
      </div>

            {/* FULL PERSONAL DETAILS MODAL FOR OJT HEAD VERIFICATION WITH UNMATCHED INFO WARNINGS */}
      {selectedStaff && (() => {
        const isDeanPosition =
          selectedStaff.position === 'dean' ||
          selectedStaff.passcode_intended_position === 'dean';

        const isPosMismatch = Boolean(
          selectedStaff.position_mismatch ||
          (selectedStaff.passcode_intended_position &&
            selectedStaff.position &&
            selectedStaff.passcode_intended_position.toLowerCase() !== selectedStaff.position.toLowerCase())
        );

        const isProgMismatch = Boolean(
          !isDeanPosition && (
            selectedStaff.program_mismatch ||
            (selectedStaff.passcode_intended_program_id &&
              selectedStaff.program_id &&
              String(selectedStaff.passcode_intended_program_id) !== String(selectedStaff.program_id))
          )
        );

        const staffDept = selectedStaff.department_name || selectedStaff.department || '';
        const intendedDept = selectedStaff.passcode_intended_department || '';
        const isDeanDeptMismatch = Boolean(
          isDeanPosition &&
          intendedDept &&
          staffDept &&
          intendedDept.trim().toLowerCase() !== staffDept.trim().toLowerCase()
        );

        const isEmailMismatch = Boolean(
          selectedStaff.email_mismatch ||
          (selectedStaff.passcode_intended_email &&
            selectedStaff.email &&
            selectedStaff.passcode_intended_email.trim().toLowerCase() !== selectedStaff.email.trim().toLowerCase())
        );

        const hasAnyMismatch = isPosMismatch || isProgMismatch || isDeanDeptMismatch || isEmailMismatch || selectedStaff.has_discrepancy;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface max-w-2xl w-full rounded-2xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b border-outline-variant bg-surface-container-low flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg ${
                    hasAnyMismatch ? 'bg-red-500/15 text-red-600' : 'bg-orange-tint text-vibrant-orange'
                  }`}>
                    <span className="material-symbols-outlined text-[22px] sm:text-[26px]">
                      {hasAnyMismatch ? 'warning' : 'badge'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-on-surface flex flex-wrap items-center gap-2">
                      <span>Staff Personal Details & Appointment Review</span>
                      {hasAnyMismatch && (
                        <span className="px-2 py-0.5 bg-red-500 text-white rounded text-[10px] font-extrabold uppercase tracking-wider">
                          ⚠️ Discrepancy Found
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Submitted registration data for OJT Head verification & authorization
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="w-8 h-8 shrink-0 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Modal Body: Complete Personal Info Display */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
                
                {/* PROMINENT TOP WARNING ALERT IF UNMATCHED DATA DETECTED */}
                {hasAnyMismatch && (
                  <div className="p-4 bg-red-500/10 border-2 border-red-500/40 rounded-xl space-y-2 text-red-600 animate-fade-in shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <span className="material-symbols-outlined text-red-600 text-[22px]">warning</span>
                      <span>⚠️ Warning: Unmatched Registration Information Detected</span>
                    </div>
                    <p className="text-xs text-red-700 font-medium leading-relaxed">
                      One or more fields submitted during the OJT Coordinator Account Registration do not match the OJT Head's authorized Passcode configuration. Review the <span className="underline font-bold">red highlighted entries</span> below with the warning signs (⚠️) before approving this account.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {isPosMismatch && (
                        <span className="px-2.5 py-1 bg-red-500/20 text-red-800 font-bold rounded text-[11px] flex items-center gap-1 border border-red-500/30">
                          <span className="material-symbols-outlined text-[14px]">badge</span>
                          <span>Staff Position / Role Mismatch</span>
                        </span>
                      )}
                      {isProgMismatch && (
                        <span className="px-2.5 py-1 bg-red-500/20 text-red-800 font-bold rounded text-[11px] flex items-center gap-1 border border-red-500/30">
                          <span className="material-symbols-outlined text-[14px]">school</span>
                          <span>Assigned Program Mismatch</span>
                        </span>
                      )}
                      {isDeanDeptMismatch && (
                        <span className="px-2.5 py-1 bg-red-500/20 text-red-800 font-bold rounded text-[11px] flex items-center gap-1 border border-red-500/30">
                          <span className="material-symbols-outlined text-[14px]">domain</span>
                          <span>Assigned Department / College Mismatch</span>
                        </span>
                      )}
                      {isEmailMismatch && (
                        <span className="px-2.5 py-1 bg-red-500/20 text-red-800 font-bold rounded text-[11px] flex items-center gap-1 border border-red-500/30">
                          <span className="material-symbols-outlined text-[14px]">mail</span>
                          <span>Staff Official Email Mismatch</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 1: Personal Identity */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-vibrant-orange flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    <span>Personal Identity Information</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-surface-container-low rounded-xl border border-outline-variant">
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Title / Salutation</span>
                      <span className="font-bold text-on-surface text-sm">{selectedStaff.salutation || 'Prof.'}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">First Name</span>
                      <span className="font-bold text-on-surface text-sm">{selectedStaff.first_name}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Middle Name</span>
                      <span className="font-bold text-on-surface text-sm">{selectedStaff.middle_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Last Name</span>
                      <span className="font-bold text-on-surface text-sm">{selectedStaff.last_name}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Suffix</span>
                      <span className="font-bold text-on-surface text-sm">{selectedStaff.suffix || '—'}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Staff / Employee ID</span>
                      <span className="font-bold text-on-surface text-sm font-mono text-vibrant-orange">
                        {selectedStaff.staff_number}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Department & Academic Position */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-vibrant-orange flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">school</span>
                    <span>Academic Role & Department Assignment</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Position Card */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                      isPosMismatch
                        ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/40 shadow-sm'
                        : 'bg-surface-container-low border-outline-variant'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`block text-[10px] font-bold uppercase tracking-wider ${isPosMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface-variant'}`}>
                          {isPosMismatch ? '⚠️ Assigned Position / Role (Unmatched)' : 'Assigned Position / Role'}
                        </span>
                        {isPosMismatch && (
                          <span className="px-2 py-0.5 rounded bg-red-500 text-white font-extrabold text-[10px] flex items-center gap-0.5 shadow-sm">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            <span>UNMATCHED</span>
                          </span>
                        )}
                      </div>
                      <span className={`font-bold text-sm block mt-1 ${isPosMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface'}`}>
                        {formatPosition(selectedStaff.position).label}
                      </span>
                      {isPosMismatch && (
                        <div className="mt-2 pt-2 border-t border-red-500/30 text-[11px] text-red-700 space-y-0.5">
                          <span className="font-bold flex items-center gap-1 text-red-600">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            <span>OJT Head Passcode Preset:</span>
                          </span>
                          <span className="font-extrabold text-red-800 bg-red-500/20 px-2 py-0.5 rounded inline-block">
                            {formatPosition(selectedStaff.passcode_intended_position).label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Degree Program Assignment Card */}
                    {isDeanPosition ? (
                      <div className="p-3.5 rounded-xl border bg-surface-container-low border-outline-variant">
                        <div className="flex items-center justify-between">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                            Degree Program Oversight
                          </span>
                          <span className="px-2 py-0.5 rounded bg-green-tint text-pinoy-green font-bold text-[10px] flex items-center gap-0.5 border border-pinoy-green/30">
                            <span className="material-symbols-outlined text-[12px]">domain</span>
                            <span>DEPARTMENT-WIDE</span>
                          </span>
                        </div>
                        <span className="font-bold text-sm block mt-1 text-on-surface">
                          All Degree Programs in {staffDept || 'Assigned Department'}
                        </span>
                        <p className="text-[10px] text-on-surface-variant mt-1 leading-normal">
                          As Department Coordinator, this staff member oversees student monitoring and OJT approvals across all degree programs within this academic department.
                        </p>
                      </div>
                    ) : (
                      <div className={`p-3.5 rounded-xl border transition-all ${
                        isProgMismatch
                          ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/40 shadow-sm'
                          : 'bg-surface-container-low border-outline-variant'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`block text-[10px] font-bold uppercase tracking-wider ${isProgMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface-variant'}`}>
                            {isProgMismatch ? '⚠️ Degree Program Assignment (Unmatched)' : 'Degree Program Assignment'}
                          </span>
                          {isProgMismatch && (
                            <span className="px-2 py-0.5 rounded bg-red-500 text-white font-extrabold text-[10px] flex items-center gap-0.5 shadow-sm">
                              <span className="material-symbols-outlined text-[13px]">warning</span>
                              <span>UNMATCHED</span>
                            </span>
                          )}
                        </div>
                        <span className={`font-bold text-sm block mt-1 ${isProgMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface'}`}>
                          {selectedStaff.program_name || (selectedStaff.program_id ? `Program #${selectedStaff.program_id}` : 'All Academic Programs / Institution-Wide')}
                        </span>
                        {isProgMismatch && (
                          <div className="mt-2 pt-2 border-t border-red-500/30 text-[11px] text-red-700 space-y-0.5">
                            <span className="font-bold flex items-center gap-1 text-red-600">
                              <span className="material-symbols-outlined text-[14px]">error</span>
                              <span>OJT Head Passcode Preset:</span>
                            </span>
                            <span className="font-extrabold text-red-800 bg-red-500/20 px-2 py-0.5 rounded inline-block">
                              {selectedStaff.passcode_intended_program_name
                                ? `${selectedStaff.passcode_intended_program_name} (${selectedStaff.passcode_intended_program_code || ''})`
                                : `Program ID #${selectedStaff.passcode_intended_program_id}`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Department / College */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                      isDeanDeptMismatch
                        ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/40 shadow-sm'
                        : isProgMismatch
                        ? 'border-red-500/50 bg-red-500/5'
                        : 'bg-surface-container-low border-outline-variant'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDeanDeptMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface-variant'}`}>
                          {isDeanDeptMismatch ? '⚠️ Department / College (Unmatched)' : 'Department / College'}
                        </span>
                        {isDeanDeptMismatch && (
                          <span className="px-2 py-0.5 rounded bg-red-500 text-white font-extrabold text-[10px] flex items-center gap-0.5 shadow-sm">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            <span>UNMATCHED</span>
                          </span>
                        )}
                      </div>
                      <span className={`font-bold text-sm block mt-1 ${isDeanDeptMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface'}`}>
                        {staffDept || 'Institution-Wide'}
                      </span>
                      {isDeanDeptMismatch && intendedDept && (
                        <div className="mt-2 pt-2 border-t border-red-500/30 text-[11px] text-red-700 space-y-0.5">
                          <span className="font-bold flex items-center gap-1 text-red-600">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            <span>OJT Head Department Preset:</span>
                          </span>
                          <span className="font-extrabold text-red-800 bg-red-500/20 px-2 py-0.5 rounded inline-block">
                            {intendedDept}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Office Location */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        Office / Campus Location
                      </span>
                      <span className="font-bold text-on-surface text-sm block mt-1">
                        {selectedStaff.office_location || 'Campus Main Office'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Official Contact Details */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-vibrant-orange flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">contact_mail</span>
                    <span>Official Contact & Account Information</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Official Email Card */}
                    <div className={`p-3.5 rounded-xl border transition-all ${isEmailMismatch
                        ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/40 shadow-sm'
                        : 'bg-surface-container-low border-outline-variant'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className={`block text-[10px] font-bold uppercase tracking-wider ${isEmailMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface-variant'}`}>
                          {isEmailMismatch ? '⚠️ Institutional Official Email (Unmatched)' : 'Institutional Official Email'}
                        </span>
                        {isEmailMismatch && (
                          <span className="px-2 py-0.5 rounded bg-red-500 text-white font-extrabold text-[10px] flex items-center gap-0.5 shadow-sm">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            <span>MISMATCH</span>
                          </span>
                        )}
                      </div>
                      <span className={`font-bold text-sm block mt-1 ${isEmailMismatch ? 'text-red-600 font-extrabold' : 'text-on-surface'}`}>
                        {selectedStaff.email}
                      </span>
                      {isEmailMismatch && (
                        <div className="mt-2 pt-2 border-t border-red-500/30 text-[11px] text-red-700 space-y-0.5">
                          <span className="font-bold flex items-center gap-1 text-red-600">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            <span>OJT Head Passcode Preset:</span>
                          </span>
                          <span className="font-extrabold text-red-800 bg-red-500/20 px-2 py-0.5 rounded inline-block font-mono">
                            {selectedStaff.passcode_intended_email}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Contact Number */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">Contact Number</span>
                      <span className="font-bold text-on-surface text-sm block mt-1">
                        {selectedStaff.contact_number || 'Not provided'}
                      </span>
                    </div>

                    {/* Passcode Validated */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">Passcode Validated</span>
                      <span className="font-bold text-vibrant-orange text-sm font-mono block mt-1">
                        {selectedStaff.passcode_used || 'OJT Head Passcode Match'}
                      </span>
                    </div>

                    {/* Registration Date */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">Registration Date</span>
                      <span className="font-bold text-on-surface text-sm block mt-1">
                        {selectedStaff.registration_submitted_at
                          ? new Date(selectedStaff.registration_submitted_at).toLocaleString()
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer / Actions */}
              <div className="p-4 border-t border-outline-variant bg-surface-container-low flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="px-4 py-2 bg-surface-container text-on-surface-variant hover:text-on-surface rounded-lg font-bold text-xs transition-colors w-full sm:w-auto text-center"
                >
                  Close
                </button>

                {!selectedStaff.is_verified && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      disabled={actionLoading}
                      onClick={() => {
                        const reason = prompt('Please enter rejection reason (optional):');
                        if (reason !== null) {
                          handleVerifyStaff(selectedStaff.staff_id, 'reject', reason);
                        }
                      }}
                      className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg font-bold text-xs transition-colors w-full sm:w-auto text-center"
                    >
                      Reject Registration
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleVerifyStaff(selectedStaff.staff_id, 'approve')}
                      className="px-5 py-2 bg-pinoy-green text-white hover:opacity-90 rounded-lg font-bold text-xs transition-opacity shadow-sm flex items-center justify-center gap-1.5 w-full sm:w-auto text-center"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>Approve & Activate Staff Account</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* PASSCODE DETAILS MODAL WITH CLAIM STATUS, EXPIRATION & SCOPE */}
      {selectedPasscode && (() => {
        const code = selectedPasscode;
        const isUsed = Boolean(code.is_used);
        const isExpired = new Date(code.expires_at) <= new Date();
        const roleInfo = formatPosition(code.intended_position);
        const expInfo = formatExpiration(code.expires_at, code.is_used);

        // Look up matching staff coordinator if redeemed or registered
        const redeemingStaff = isUsed
          ? data.verifiedStaff.find(
              (s) =>
                s.email === code.used_by_email ||
                s.employee_id === code.target_identifier ||
                s.staff_number === code.target_identifier ||
                s.passcode_used === code.code_hash
            ) ||
            data.pendingStaff.find(
              (s) =>
                s.email === code.used_by_email ||
                s.employee_id === code.target_identifier ||
                s.staff_number === code.target_identifier ||
                s.passcode_used === code.code_hash
            ) ||
            data.staff.find(
              (s) =>
                s.email === code.used_by_email ||
                s.employee_id === code.target_identifier ||
                s.staff_number === code.target_identifier
            )
          : null;

        // Parse permissions
        let perms = {
          can_verify_students: true,
          can_manage_ojt_records: true,
          can_handle_grievances: true,
          can_approve_job_offers: true
        };
        const rawPerms = code.assigned_permissions || code.permissions;
        if (typeof rawPerms === 'string') {
          try {
            perms = { ...perms, ...JSON.parse(rawPerms) };
          } catch (e) {}
        } else if (typeof rawPerms === 'object' && rawPerms !== null) {
          perms = { ...perms, ...rawPerms };
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface max-w-2xl w-full rounded-2xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col animate-scale-up max-h-[90dvh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-outline-variant bg-surface-container-low flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-vibrant-orange/15 text-vibrant-orange flex items-center justify-center font-bold shrink-0">
                    <span className="material-symbols-outlined text-[24px]">vpn_key</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">Staff Passcode & Claim Details</h3>
                    <p className="text-xs text-on-surface-variant">
                      Detailed claim logs, expiration schedule, and assignment scope
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPasscode(null)}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto text-xs max-h-[calc(90dvh-130px)]">
                {/* Hero Banner: Passcode & Status */}
                <div className="p-4 bg-surface-container rounded-xl border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                      Official Access Passcode
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-vibrant-orange text-lg tracking-wider">
                        {code.code_hash}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(code.code_hash, code.code_id)}
                        title="Copy Passcode"
                        className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                          copiedCodeId === code.code_id
                            ? 'bg-green-tint text-pinoy-green border-pinoy-green/30'
                            : 'bg-surface text-on-surface hover:bg-surface-container-high border-outline-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {copiedCodeId === code.code_id ? 'check' : 'content_copy'}
                        </span>
                        <span>{copiedCodeId === code.code_id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-on-surface-variant font-mono">
                      Target Staff ID: <span className="font-bold text-on-surface">{code.target_identifier}</span>
                    </p>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                      Passcode Status
                    </span>
                    {isUsed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-tint text-pinoy-green border border-pinoy-green/30 shadow-2xs">
                        <span className="material-symbols-outlined text-[15px]">verified</span>
                        <span>Claimed & Redeemed</span>
                      </span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-container-high text-on-surface-variant border border-outline-variant shadow-2xs">
                        <span className="material-symbols-outlined text-[15px]">history</span>
                        <span>Expired</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span>Active & Ready</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Section 1: Claim Status & Expiration Schedule */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-vibrant-orange flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">verified_user</span>
                    <span>Claim Status & Expiration Schedule</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Redemption Status Card */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        Redemption Status
                      </span>
                      <span className="font-bold text-on-surface text-sm block">
                        {isUsed ? 'Redeemed by Coordinator' : isExpired ? 'Expired Unclaimed' : 'Awaiting Registration'}
                      </span>
                      <p className="text-[11px] text-on-surface-variant">
                        {isUsed
                          ? `Claimed on ${code.used_at ? new Date(code.used_at).toLocaleString() : 'Registered account'}`
                          : isExpired
                          ? 'This passcode was not claimed before its deadline.'
                          : 'Can be used by the coordinator during sign-up.'}
                      </p>
                    </div>

                    {/* Redeemed By / Account Card */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        {isUsed ? 'Redeemed By Coordinator' : 'Permitted Registrant'}
                      </span>
                      {isUsed ? (
                        <div className="space-y-0.5">
                          {redeemingStaff && (
                            <span className="font-bold text-on-surface text-sm block">
                              {redeemingStaff.salutation || 'Prof.'} {redeemingStaff.first_name} {redeemingStaff.last_name} {redeemingStaff.suffix || ''}
                            </span>
                          )}
                          <span className="font-bold text-pinoy-green text-xs flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">account_circle</span>
                            <span>{code.used_by_email || redeemingStaff?.email || 'Registered coordinator'}</span>
                          </span>
                        </div>
                      ) : code.intended_email ? (
                        <div>
                          <span className="font-bold text-on-surface text-sm block font-mono">
                            {code.intended_email}
                          </span>
                          <span className="text-[10.5px] text-amber-600 block">Strictly restricted to this email</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-on-surface text-sm block">
                            Any Institutional Email
                          </span>
                          <span className="text-[10.5px] text-on-surface-variant block">Open to authorized domain</span>
                        </div>
                      )}
                    </div>

                    {/* Expiration Date Card */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        Expiration Date & Time
                      </span>
                      <span className={`font-bold text-sm block ${isExpired ? 'text-red-600' : 'text-on-surface'}`}>
                        {code.expires_at ? new Date(code.expires_at).toLocaleString() : 'N/A'}
                      </span>
                      <p className="text-[11px] text-on-surface-variant">
                        {expInfo.sub}
                      </p>
                    </div>

                    {/* Creation Date Card */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        Date Issued / Created
                      </span>
                      <span className="font-bold text-on-surface text-sm block">
                        {code.created_at ? new Date(code.created_at).toLocaleString() : 'Recent'}
                      </span>
                      <p className="text-[11px] text-on-surface-variant font-mono">
                        Passcode Record ID: #{code.code_id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Assigned Role & Academic Scope */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-vibrant-orange flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">school</span>
                    <span>Assigned Role & Academic Scope</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Position */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        Designated Role
                      </span>
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-bold mt-1 ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </div>

                    {/* Academic Department */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        College / Department
                      </span>
                      <span className="font-bold text-on-surface text-sm block mt-1">
                        {code.intended_department || code.program_name || 'Department-Wide'}
                      </span>
                    </div>

                    {/* Academic Program */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase tracking-wider">
                        Degree Program
                      </span>
                      <span className="font-bold text-on-surface text-sm block mt-1">
                        {code.program_name || (code.intended_position === 'dean' ? 'All Department Programs' : 'Institution-Wide')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Granted Coordinator Permissions */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-vibrant-orange flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                    <span>Granted Coordinator Permissions</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/60">
                      <span className={`material-symbols-outlined text-[18px] ${perms.can_verify_students ? 'text-pinoy-green' : 'text-on-surface-variant/40'}`}>
                        {perms.can_verify_students ? 'check_circle' : 'cancel'}
                      </span>
                      <span className="text-[11px] font-medium text-on-surface">
                        Verify & accept student registrations
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/60">
                      <span className={`material-symbols-outlined text-[18px] ${perms.can_manage_ojt_records ? 'text-pinoy-green' : 'text-on-surface-variant/40'}`}>
                        {perms.can_manage_ojt_records ? 'check_circle' : 'cancel'}
                      </span>
                      <span className="text-[11px] font-medium text-on-surface">
                        Manage OJT records & hours tracking
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/60">
                      <span className={`material-symbols-outlined text-[18px] ${perms.can_handle_grievances ? 'text-pinoy-green' : 'text-on-surface-variant/40'}`}>
                        {perms.can_handle_grievances ? 'check_circle' : 'cancel'}
                      </span>
                      <span className="text-[11px] font-medium text-on-surface">
                        Handle student grievances & concerns
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/60">
                      <span className={`material-symbols-outlined text-[18px] ${perms.can_approve_job_offers ? 'text-pinoy-green' : 'text-on-surface-variant/40'}`}>
                        {perms.can_approve_job_offers ? 'check_circle' : 'cancel'}
                      </span>
                      <span className="text-[11px] font-medium text-on-surface">
                        Approve job offers & MOA agreements
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-outline-variant bg-surface-container-low flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedPasscode(null)}
                  className="px-4 py-2 bg-surface-container text-on-surface-variant hover:text-on-surface rounded-lg font-bold text-xs transition-colors text-center cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopy(code.code_hash, code.code_id)}
                    className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-outline-variant cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copiedCodeId === code.code_id ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedCodeId === code.code_id ? 'Passcode Copied' : 'Copy Passcode'}</span>
                  </button>

                  {!isUsed && !isExpired && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => {
                        setSelectedPasscode(null);
                        setConfirmModal({ isOpen: true, type: 'deactivate', code });
                      }}
                      className="px-3.5 py-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">block</span>
                      <span>Deactivate</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => {
                      setSelectedPasscode(null);
                      setConfirmModal({ isOpen: true, type: 'delete', code });
                    }}
                    className="px-3.5 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CUSTOM PASSCODE ACTION CONFIRMATION MODAL (DELETE & DEACTIVATE) */}
      {confirmModal.isOpen && confirmModal.code && (() => {
        const { type, code } = confirmModal;
        const isDelete = type === 'delete';
        const isUsed = Boolean(code.is_used);
        const isExpired = new Date(code.expires_at) <= new Date();
        const roleInfo = formatPosition(code.intended_position);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface max-w-md w-full rounded-2xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col animate-scale-up max-h-[90dvh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-outline-variant bg-surface-container-low flex items-center gap-3 shrink-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${isDelete ? 'bg-red-500/15 text-red-600' : 'bg-amber-500/15 text-amber-600'
                  }`}>
                  <span className="material-symbols-outlined text-[24px]">
                    {isDelete ? 'delete_forever' : 'block'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    {isDelete ? 'Delete Staff Passcode' : 'Deactivate Staff Passcode'}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {isDelete ? 'Permanent removal of access code' : 'Immediate expiration of access code'}
                  </p>
                </div>
              </div>

              {/* Modal Content / Details */}
              <div className="p-5 space-y-4 text-xs overflow-y-auto">
                {/* Passcode Summary Card */}
                <div className="p-3.5 bg-surface-container rounded-xl border border-outline-variant space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Passcode</span>
                    <span className="font-mono font-bold text-vibrant-orange text-sm">{code.code_hash}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-outline-variant/50">
                    <span className="text-[11px] text-on-surface-variant">Target Staff ID</span>
                    <span className="font-mono font-bold text-on-surface">{code.target_identifier}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-on-surface-variant">Assigned Role</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                  {code.program_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-on-surface-variant">Program</span>
                      <span className="font-bold text-on-surface text-[11px] truncate max-w-[200px]">{code.program_name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-on-surface-variant">Current Status</span>
                    <span className="font-bold text-on-surface">
                      {isUsed ? 'Claimed / Used' : isExpired ? 'Expired' : 'Active / Ready'}
                    </span>
                  </div>
                </div>

                {/* Warning message */}
                {isDelete ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      <span>Are you sure you want to delete this passcode?</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-red-600/90">
                      {isUsed
                        ? 'This passcode was already redeemed by a registered coordinator. Deleting it will permanently purge the passcode issuance record from the system.'
                        : 'This will permanently destroy the passcode. Anyone attempting to register with it will be rejected, and the Target Staff ID will be unlocked for reassignment.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      <span>Deactivate passcode immediately</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-700/90">
                      This passcode will immediately expire and can no longer be used for new coordinator registrations. The historical issuance log will be retained in your dashboard as Expired.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-end items-center gap-2.5">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setConfirmModal({ isOpen: false, type: 'delete', code: null })}
                  className="px-4 py-2 bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmAction}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-opacity shadow-sm flex items-center gap-1.5 text-white disabled:opacity-50 ${isDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">
                        {isDelete ? 'delete_forever' : 'block'}
                      </span>
                      <span>{isDelete ? 'Delete Passcode' : 'Deactivate Passcode'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ANIMATED PASSCODE GENERATED CELEBRATION MODAL */}
      <PasscodeGeneratedModal
        isOpen={showGeneratedModal}
        onClose={() => setShowGeneratedModal(false)}
        data={generatedCode}
        onViewLedger={() => setActiveTab('codes')}
      />
    </div>
  );
}
