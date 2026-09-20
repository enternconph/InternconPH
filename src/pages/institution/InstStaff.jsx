import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import PasscodeGeneratedModal from '../../components/Institution/PasscodeGeneratedModal';

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

  // Expiration Date Helper
  const getDefaultExpirationDate = (days = 14) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Passcode Generator State
  const [staffNumber, setStaffNumber] = useState('');
  const [position, setPosition] = useState('ojt_supervisor'); // ojt_supervisor, registrar, guidance_counselor, dean
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [expirationDate, setExpirationDate] = useState(() => getDefaultExpirationDate(14));
  const [permissions, setPermissions] = useState({
    can_verify_students: true,
    can_manage_ojt_records: true,
    can_handle_grievances: false,
    can_approve_job_offers: false
  });

  const isDean = user?.position === 'dean' || user?.role_name === 'dean' || staffScope?.position === 'dean' || staffScope?.isDean;
  const assignedProgramId = user?.program_id || staffScope?.programId || (isDean && programs.length > 0 ? programs[0].program_id : null);

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

    if (position === 'dean' && !selectedDepartment) {
      alert('Please select the Assigned Academic Department / College for the College Dean.');
      return;
    }

    setIsGenerating(true);
    setMessage('');
    setGeneratedCode(null);

    const payload = {
      staff_number: cleanInputId,
      position,
      intended_email: staffEmail || null,
      permissions,
      expiration_date: expirationDate
    };

    if (position === 'dean') {
      payload.department = selectedDepartment;
      payload.program_id = null;
    } else if (isDean) {
      payload.department = staffScope?.department || user?.department || null;
      payload.program_id = selectedProgram || null;
    } else {
      payload.program_id = selectedProgram || null;
      if (selectedProgram) {
        const prog = programs.find((p) => String(p.program_id) === String(selectedProgram));
        payload.department = prog?.department || null;
      }
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
            : position === 'dean'
            ? effectiveDept || 'Academic Department'
            : effectiveDept
            ? `Dept: ${effectiveDept}`
            : 'All Programs / Institution-Wide',
          permissions
        };
        setGeneratedCode(enrichedData);
        setShowGeneratedModal(true);
        setMessage(
          `${isDean ? 'Department' : 'Director'} Passcode [${res.data.access_code}] generated successfully for Staff ID: ${cleanInputId}! Share this with the staff member.`
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
      case 'ojt_supervisor':
        return { label: 'OJT Supervisor / Adviser', color: 'bg-orange-tint text-vibrant-orange' };
      case 'registrar':
        return { label: 'Registrar', color: 'bg-blue-500/10 text-blue-500' };
      case 'guidance_counselor':
        return { label: 'Guidance Counselor', color: 'bg-purple-500/10 text-purple-500' };
      case 'dean':
        return { label: 'College Dean', color: 'bg-green-tint text-pinoy-green' };
      case 'director':
        return { label: 'Institution Director', color: 'bg-yellow-500/10 text-yellow-600' };
      default:
        return { label: (pos || 'Staff').replace(/_/g, ' '), color: 'bg-surface-container text-on-surface' };
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Institution Staff & Coordinators Management</h1>
          <p className="text-sm text-on-surface-variant">
            Issue Director-authorized passcodes, inspect complete staff personal details, and verify registrations.
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
        {/* Passcode Generator Form */}
        <div className="bento-card space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-tint text-vibrant-orange flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">key</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">
                {isDean ? 'Generate Department Staff Passcode' : 'Generate Staff Passcode'}
              </h2>
              <p className="text-[11px] text-on-surface-variant">
                {isDean ? 'Dean-issued invitation for department faculty & coordinators' : 'Director-issued invitation for coordinators'}
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerateCode} className="space-y-3 text-xs">
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
                onChange={(e) => {
                  const pos = e.target.value;
                  setPosition(pos);
                  setPermissions({
                    can_verify_students: pos === 'registrar' || pos === 'ojt_supervisor',
                    can_manage_ojt_records: pos === 'ojt_supervisor' || pos === 'dean',
                    can_handle_grievances: pos === 'guidance_counselor',
                    can_approve_job_offers: pos === 'dean' || pos === 'ojt_supervisor'
                  });
                }}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-bold outline-none focus:ring-2 focus:ring-vibrant-orange"
              >
                <option value="ojt_supervisor">OJT Supervisor / Adviser (Student Monitoring & Hours)</option>
                {!isDean && <option value="registrar">Registrar (Student Verification & Clearance)</option>}
                {!isDean && <option value="guidance_counselor">Guidance Counselor (Grievances & Student Concerns)</option>}
                {!isDean && <option value="dean">College Dean / Department Head (Department Programs & Staff)</option>}
              </select>
            </div>

            {/* Department / Program Selection */}
            {position === 'dean' ? (
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1 flex items-center justify-between">
                  <span>Assigned Academic Department / College *</span>
                  <span className="text-[10px] text-vibrant-orange font-bold flex items-center gap-1 bg-orange-tint px-2 py-0.5 rounded-full border border-vibrant-orange/30">
                    <span className="material-symbols-outlined text-[12px]">domain</span>
                    Department Head
                  </span>
                </label>
                <select
                  required
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-bold outline-none focus:ring-2 focus:ring-vibrant-orange"
                >
                  <option value="">-- Select Academic Department / College --</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-on-surface-variant mt-1.5 flex items-start gap-1 leading-normal">
                  <span className="material-symbols-outlined text-[14px] text-vibrant-orange shrink-0 mt-0.5">info</span>
                  <span>
                    The College Dean oversees, coordinates, and approves OJT offers across <strong>all academic degree programs</strong> within this department.
                  </span>
                </p>
              </div>
            ) : isDean ? (
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1 flex items-center justify-between">
                  <span>Assigned Program / Scope *</span>
                  <span className="text-[10px] text-vibrant-orange font-bold flex items-center gap-1 bg-orange-tint px-2 py-0.5 rounded-full border border-vibrant-orange/30">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    {staffScope?.department || user?.department || 'Your Department'}
                  </span>
                </label>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-bold outline-none focus:ring-2 focus:ring-vibrant-orange"
                >
                  <option value="">Department-Wide — All Programs in {staffScope?.department || user?.department || 'Department'}</option>
                  {programs.map((p) => (
                    <option key={p.program_id} value={p.program_id}>
                      {p.program_name} ({p.program_code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-on-surface-variant mt-1.5 flex items-center gap-1 leading-normal">
                  <span className="material-symbols-outlined text-[14px] text-vibrant-orange shrink-0">info</span>
                  <span>
                    As College Dean, passcodes you generate are scoped exclusively to your department ({staffScope?.department || user?.department}).
                  </span>
                </p>
              </div>
            ) : (
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">
                  Assigned Program / Department
                </label>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
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
            )}

            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">
                Staff Official Email (Optional)
              </label>
              <input
                type="email"
                placeholder="faculty@university.edu.ph"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-vibrant-orange"
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
                  <span>Generate Staff Passcode</span>
                </>
              )}
            </button>
          </form>
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
                      Staff Registrations Awaiting Verification {isDean && staffScope?.department ? `— ${staffScope.department}` : ''} ({data.pendingStaff?.length || 0})
                    </span>
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    {isDean
                      ? `Only staff registrations belonging to your assigned department (${staffScope?.department || 'Department'}) appear in this queue.`
                      : 'Only staff who registered with a matching Director Passcode and Staff ID appear in this queue.'}
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

          {/* TAB 2: ACTIVE VERIFIED STAFF ROSTER */}
          {activeTab === 'active' && (
            <div className="bento-card space-y-4">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-pinoy-green text-[20px]">verified</span>
                <span>Active Institution Staff & Appointed Officers ({data.verifiedStaff?.length || 0})</span>
              </h2>

              {loading ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
                </div>
              ) : !data.verifiedStaff || data.verifiedStaff.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant text-xs space-y-2">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">groups</span>
                  <p>No active staff accounts verified yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.verifiedStaff.map((s) => {
                    const posBadge = formatPosition(s.position);
                    return (
                      <div
                        key={s.staff_id}
                        className="p-4 bg-surface-container rounded-xl flex items-center justify-between border border-outline-variant text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-on-surface">
                              {s.salutation} {s.first_name} {s.middle_name} {s.last_name} {s.suffix}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${posBadge.color}`}>
                              {posBadge.label}
                            </span>
                            {(s.has_discrepancy || s.position_mismatch || s.program_mismatch || s.email_mismatch) && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 flex items-center gap-1 border border-amber-500/30">
                                <span className="material-symbols-outlined text-[13px]">warning</span>
                                <span>Note: Passcode Variance</span>
                              </span>
                            )}
                          </div>
                          <p className="text-on-surface-variant text-[11px]">
                            {s.email} • Staff ID: <span className="font-bold text-on-surface font-mono">{s.staff_number}</span>
                            {s.program_name && ` • Program: ${s.program_name}`}
                            {s.department_name && ` • Dept: ${s.department_name}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedStaff(s)}
                            className="px-3 py-1.5 bg-surface-container-high text-on-surface hover:bg-surface-container-highest rounded-lg font-bold text-xs transition-colors border border-outline-variant"
                          >
                            Details
                          </button>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-tint text-pinoy-green">
                            Active & Verified
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                      <thead>
                        <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant whitespace-nowrap font-bold">
                          <th className="py-3 px-3.5">Passcode & Target ID</th>
                          <th className="py-3 px-3.5">Assigned Role & Scope</th>
                          <th className="py-3 px-3.5">Email Restriction / Claim</th>
                          <th className="py-3 px-3.5">Status & Expiration</th>
                          <th className="py-3 px-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/60">
                        {filteredAccessCodes.map((c) => {
                          const expInfo = formatExpiration(c.expires_at, c.is_used);
                          const roleInfo = formatPosition(c.intended_position);
                          const isExpired = new Date(c.expires_at) <= new Date();

                          return (
                            <tr key={c.code_id} className="hover:bg-surface-container-low/80 transition-colors">
                              {/* Passcode & Target ID */}
                              <td className="py-3 px-3.5">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-extrabold text-vibrant-orange text-sm tracking-wide">
                                      {c.code_hash}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(c.code_hash, c.code_id)}
                                      title="Click to copy passcode"
                                      className={`p-1 rounded transition-colors ${copiedCodeId === c.code_id
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
                              <td className="py-3 px-3.5">
                                <div className="space-y-1 max-w-[240px]">
                                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${roleInfo.color}`}>
                                    {roleInfo.label}
                                  </span>
                                  {c.intended_position === 'dean' ? (
                                    <p
                                      className="text-[11px] font-bold text-vibrant-orange flex items-center gap-1"
                                      title={c.intended_department || c.program_name || 'Academic Department'}
                                    >
                                      <span className="material-symbols-outlined text-[13px]">domain</span>
                                      <span className="truncate">Dept: {c.intended_department || c.program_name || 'Department-Wide'}</span>
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-on-surface-variant truncate" title={c.program_name || c.intended_department || 'All Programs'}>
                                      {c.program_name
                                        ? `Prog: ${c.program_name}`
                                        : c.intended_department
                                        ? `Dept: ${c.intended_department}`
                                        : 'Scope: Institution-Wide'}
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* Email & Claim Details */}
                              <td className="py-3 px-3.5">
                                <div className="space-y-1">
                                  {c.is_used ? (
                                    <div className="flex items-center gap-1 text-pinoy-green text-[11px] font-bold">
                                      <span className="material-symbols-outlined text-[14px]">account_circle</span>
                                      <span className="truncate max-w-[180px]">{c.used_by_email || 'Registered coordinator'}</span>
                                    </div>
                                  ) : c.intended_email ? (
                                    <div className="flex items-center gap-1 text-on-surface text-[11px]">
                                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">mail</span>
                                      <span className="truncate max-w-[180px] font-medium">{c.intended_email}</span>
                                    </div>
                                  ) : (
                                    <span className="text-on-surface-variant text-[11px] italic">Any institution email</span>
                                  )}
                                  <div className="text-[10px] text-on-surface-variant">
                                    Created: {new Date(c.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </td>

                              {/* Status & Expiration */}
                              <td className="py-3 px-3.5">
                                <div className="space-y-1">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${expInfo.badge}`}>
                                    <span className="material-symbols-outlined text-[12px]">{expInfo.icon}</span>
                                    <span>{expInfo.label}</span>
                                  </span>
                                  <div className="text-[11px] text-on-surface-variant font-medium">
                                    {expInfo.sub}
                                  </div>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3.5 text-right">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(c.code_hash, c.code_id)}
                                    title="Copy Passcode"
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${copiedCodeId === c.code_id
                                        ? 'bg-green-tint text-pinoy-green border-pinoy-green/30'
                                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high border-outline-variant'
                                      }`}
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
                                      title="Deactivate passcode immediately"
                                      className="px-2.5 py-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">block</span>
                                      <span>Deactivate</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => setConfirmModal({ isOpen: true, type: 'delete', code: c })}
                                    title="Delete passcode and free Staff ID"
                                    className="px-2.5 py-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                    <span>Delete</span>
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
                      const expInfo = formatExpiration(c.expires_at, c.is_used);
                      const roleInfo = formatPosition(c.intended_position);
                      const isExpired = new Date(c.expires_at) <= new Date();

                      return (
                        <div
                          key={c.code_id}
                          className="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-3 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
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
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${expInfo.badge}`}>
                              <span className="material-symbols-outlined text-[12px]">{expInfo.icon}</span>
                              <span>{expInfo.label}</span>
                            </span>
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

                          <div className="p-2.5 bg-surface-container-low rounded-lg text-[11px] space-y-1 text-on-surface-variant">
                            {c.is_used ? (
                              <p className="text-pinoy-green font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">account_circle</span>
                                <span>Used by: {c.used_by_email || 'Registered coordinator'}</span>
                              </p>
                            ) : c.intended_email ? (
                              <p>Restricted to: <span className="text-on-surface font-semibold">{c.intended_email}</span></p>
                            ) : (
                              <p>Restricted to: <span className="text-on-surface font-semibold">Any email</span></p>
                            )}
                            <p>{expInfo.sub} (Expires {new Date(c.expires_at).toLocaleDateString()})</p>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-outline-variant/60">
                            <button
                              type="button"
                              onClick={() => handleCopy(c.code_hash, c.code_id)}
                              className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg font-bold transition-colors flex items-center gap-1 text-[11px]"
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
                                className="px-3 py-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg font-bold transition-colors flex items-center gap-1 text-[11px] disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[14px]">block</span>
                                <span>Deactivate</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => setConfirmModal({ isOpen: true, type: 'delete', code: c })}
                              className="px-3 py-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 rounded-lg font-bold transition-colors flex items-center gap-1 text-[11px] disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                              <span>Delete</span>
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

            {/* FULL PERSONAL DETAILS MODAL FOR DIRECTOR VERIFICATION WITH UNMATCHED INFO WARNINGS */}
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
                      Submitted registration data for {isDean ? 'Collegiate Dean' : 'Director'} verification & authorization
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
                      One or more fields submitted during the Institution Staff Account Registration do not match the Director's authorized Passcode configuration. Review the <span className="underline font-bold">red highlighted entries</span> below with the warning signs (⚠️) before approving this account.
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
                            <span>Director Passcode Preset:</span>
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
                          As College Dean, this staff member oversees student monitoring and OJT approvals across all degree programs within this academic department.
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
                              <span>Director Passcode Preset:</span>
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
                            <span>Director Department Preset:</span>
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
                            <span>Director Passcode Preset:</span>
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
                        {selectedStaff.passcode_used || 'Director Passcode Match'}
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
