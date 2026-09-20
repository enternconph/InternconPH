import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../../components/ui/Pagination';

export default function InstStudents() {
  const { user } = useAuth();
  const [data, setData] = useState({
    pendingStudents: [],
    verifiedStudents: [],
    rejectedStudents: [],
    accessCodes: [],
    programs: [],
    staff_assignment: null
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Active tab: 'pending', 'verified', 'rejected', 'codes'
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('all');

  // Server-side Pagination State for Verified Students
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState({ pending: 0, verified: 0, rejected: 0, codes: 0 });

  // Staff Program / Department Assignment
  const staffAssignment = useMemo(() => {
    if (data.staff_assignment) {
      return data.staff_assignment;
    }
    if (user?.role === 'institution_staff') {
      const progId = user.details?.program_id || user.program_id;
      const progName = user.details?.program_name || user.program_name;
      const progCode = user.details?.program_code || user.program_code;
      const dept = user.details?.department || user.department;
      if (progId) {
        return {
          is_restricted: true,
          program_id: progId,
          program_name: progName,
          program_code: progCode,
          department: dept
        };
      }
    }
    return { is_restricted: false };
  }, [data.staff_assignment, user]);

  // Student Passcode Generator Modal
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeForm, setCodeForm] = useState({
    program_id: '',
    assigned_staff_id: '',
    expiration_date: '',
    force: false,
    intended_classification: 'regular', // regular, returnee, transferee
    intended_status: 'starting_ojt' // starting_ojt, ongoing_ojt, completed_ojt
  });
  const [activeCodeWarning, setActiveCodeWarning] = useState(null);

  const getDefaultExpirationDate = (days = 14) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Resolve currently selected program details and departmental OJT supervisors
  const selectedProgramObj = useMemo(() => {
    if (!codeForm.program_id) return null;
    return data.programs?.find((p) => String(p.program_id) === String(codeForm.program_id)) || null;
  }, [data.programs, codeForm.program_id]);

  const selectedDept = selectedProgramObj?.department || '';

  const deptSupervisors = useMemo(() => {
    if (!data.supervisors || data.supervisors.length === 0) return [];
    return data.supervisors.filter((s) => {
      if (codeForm.program_id && s.program_id && String(s.program_id) === String(codeForm.program_id)) return true;
      if (selectedDept && s.department && s.department.toLowerCase().trim() === selectedDept.toLowerCase().trim()) return true;
      return false;
    });
  }, [data.supervisors, codeForm.program_id, selectedDept]);

  const otherSupervisors = useMemo(() => {
    if (!data.supervisors || data.supervisors.length === 0) return [];
    const deptIds = new Set(deptSupervisors.map((s) => s.staff_id));
    return data.supervisors.filter((s) => !deptIds.has(s.staff_id));
  }, [data.supervisors, deptSupervisors]);

  // Student Profile Review Modal
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    regId: null,
    studentName: '',
    studentNumber: '',
    email: '',
    reason: ''
  });

  const fetchStudents = useCallback(async (targetPage = 1, targetSearch = '', targetProg = 'all') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', targetPage);
      params.append('limit', 25);
      if (targetSearch.trim()) params.append('search', targetSearch.trim());
      if (targetProg && targetProg !== 'all') params.append('program', targetProg);

      const res = await api.get(`/inst/students?${params.toString()}`);
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
        if (res.data.counts) {
          setCounts(res.data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search and program filter update
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(page, searchTerm, selectedProgram);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, searchTerm, selectedProgram, fetchStudents]);

  // Live real-time update hook
  useRealtimeRefresh(() => fetchStudents(page, searchTerm, selectedProgram));

  const showToast = (msg, isErr = false) => {
    if (isErr) {
      setErrorMessage(msg);
      setMessage('');
      setTimeout(() => setErrorMessage(''), 5000);
    } else {
      setMessage(msg);
      setErrorMessage('');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Open Program Passcode Generator Modal with assigned program preset
  const handleOpenCodeModal = (presetProgramId = null) => {
    setShowCodeModal(true);
    setGeneratedCode(null);
    setActiveCodeWarning(null);
    const defaultProgramId = presetProgramId
      ? String(presetProgramId)
      : staffAssignment.is_restricted
      ? (staffAssignment.program_id || (data.programs && data.programs.length > 0 ? String(data.programs[0].program_id) : ''))
      : (data.programs && data.programs.length === 1 ? String(data.programs[0].program_id) : '');

    const defaultProg = data.programs?.find((p) => String(p.program_id) === String(defaultProgramId));
    const dept = defaultProg?.department || '';
    const matchingSups = (data.supervisors || []).filter((s) => {
      if (defaultProgramId && s.program_id && String(s.program_id) === String(defaultProgramId)) return true;
      if (dept && s.department && s.department.toLowerCase().trim() === dept.toLowerCase().trim()) return true;
      return false;
    });

    let defaultStaffId = '';
    if (staffAssignment.is_restricted && staffAssignment.position === 'ojt_supervisor' && staffAssignment.staff_id) {
      defaultStaffId = String(staffAssignment.staff_id);
    } else if (matchingSups.length === 1) {
      defaultStaffId = String(matchingSups[0].staff_id);
    }

    setCodeForm({
      program_id: defaultProgramId ? String(defaultProgramId) : '',
      assigned_staff_id: defaultStaffId,
      expiration_date: getDefaultExpirationDate(14),
      force: false,
      intended_classification: 'regular',
      intended_status: 'starting_ojt'
    });
  };

  const handleProgramSelect = (progId) => {
    const chosenProg = data.programs?.find((p) => String(p.program_id) === String(progId));
    const dept = chosenProg?.department || '';
    const matchingSups = (data.supervisors || []).filter((s) => {
      if (progId && s.program_id && String(s.program_id) === String(progId)) return true;
      if (dept && s.department && s.department.toLowerCase().trim() === dept.toLowerCase().trim()) return true;
      return false;
    });

    let newStaffId = '';
    if (matchingSups.length === 1) {
      newStaffId = String(matchingSups[0].staff_id);
    } else if (matchingSups.length > 1) {
      if (matchingSups.some((s) => String(s.staff_id) === String(codeForm.assigned_staff_id))) {
        newStaffId = codeForm.assigned_staff_id;
      }
    }

    setCodeForm((prev) => ({
      ...prev,
      program_id: progId,
      assigned_staff_id: newStaffId
    }));
    setActiveCodeWarning(null);
  };

  const handleStatusChange = (newStatus) => {
    let newStaffId = codeForm.assigned_staff_id;
    if (newStatus === 'starting_ojt') {
      if (!newStaffId && deptSupervisors.length === 1) {
        newStaffId = String(deptSupervisors[0].staff_id);
      }
    }
    setCodeForm((prev) => ({
      ...prev,
      intended_status: newStatus,
      assigned_staff_id: newStaffId
    }));
  };

  // Generate Program Access Code
  const handleGenerateCode = async (e, forceOverride = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!codeForm.program_id) {
      showToast('Please select an Academic Degree Program.', true);
      return;
    }
    if (!codeForm.expiration_date) {
      showToast('Please select an expiration date.', true);
      return;
    }
    if (codeForm.intended_status === 'starting_ojt' && deptSupervisors.length > 1 && !codeForm.assigned_staff_id) {
      showToast(`Please select the OJT Supervisor / Adviser for ${selectedDept || 'this department'}.`, true);
      return;
    }

    setCodeLoading(true);
    try {
      const payload = { ...codeForm, force: Boolean(forceOverride || codeForm.force) };
      const res = await api.post('/inst/students/access-code', payload);
      if (res.success && res.data) {
        setGeneratedCode(res.data);
        setActiveCodeWarning(null);
        showToast(`Program Passcode [${res.data.access_code}] generated for ${res.data.program_name || 'Program'}!`);
        fetchStudents();
      } else if (res.requires_confirmation) {
        setActiveCodeWarning(res.message);
      } else {
        showToast(res.message || 'Failed to generate program access code.', true);
      }
    } catch (err) {
      showToast(err.message || 'Server error while generating passcode.', true);
    } finally {
      setCodeLoading(false);
    }
  };

  // Handle Approve
  const handleApprove = async (regId, studentName) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/inst/students/${regId}/verify`, { action: 'verify' });
      if (res.success) {
        showToast(res.message || `Student ${studentName} verified and account activated.`);
        setSelectedStudent(null);
        fetchStudents();
      } else {
        showToast(res.message || 'Verification failed.', true);
      }
    } catch (err) {
      showToast(err.message || 'Error during verification.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Reject Modal
  const openRejectModal = (student) => {
    setRejectModal({
      isOpen: true,
      regId: student.registration_id,
      studentName: `${student.first_name} ${student.last_name}`,
      studentNumber: student.student_number,
      email: student.email,
      reason: ''
    });
  };

  // Confirm Reject
  const handleConfirmReject = async () => {
    if (!rejectModal.regId) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/inst/students/${rejectModal.regId}/verify`, {
        action: 'reject',
        reason: rejectModal.reason.trim() || 'Registration rejected by institution staff'
      });

      if (res.success) {
        showToast(res.message || 'Student registration rejected and account deactivated.');
        setRejectModal({ isOpen: false, regId: null, studentName: '', studentNumber: '', email: '', reason: '' });
        setSelectedStudent(null);
        fetchStudents();
      } else {
        showToast(res.message || 'Failed to reject student.', true);
      }
    } catch (err) {
      showToast(err.message || 'Error rejecting student.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (studentId, studentName, currentActive) => {
    const nextState = !currentActive;
    const confirmMsg = nextState
      ? `Are you sure you want to re-activate the account for ${studentName}?`
      : `Are you sure you want to deactivate / disable the account for ${studentName}? They will not be able to log in.`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/inst/students/${studentId}/toggle-status`, { is_active: nextState });
      if (res.success) {
        showToast(res.message);
        fetchStudents();
      } else {
        showToast(res.message || 'Failed to update status.', true);
      }
    } catch (err) {
      showToast(err.message || 'Error updating status.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper badge formatters
  const getClassificationBadge = (cls) => {
    switch (cls) {
      case 'returnee':
        return { label: 'Returnee (Registrar Review)', color: 'bg-purple-500/10 text-purple-600' };
      case 'transferee':
        return { label: 'Transferee (Registrar Review)', color: 'bg-blue-500/10 text-blue-600' };
      default:
        return { label: 'Regular Student', color: 'bg-surface-container text-on-surface' };
    }
  };

  const getOjtStatusBadge = (status) => {
    switch (status) {
      case 'completed_ojt':
        return { label: 'OJT Completer', color: 'bg-green-tint text-pinoy-green' };
      case 'ongoing_ojt':
        return { label: 'Ongoing OJT', color: 'bg-orange-tint text-vibrant-orange' };
      case 'graduated':
        return { label: 'Graduated / Alumni', color: 'bg-yellow-500/10 text-yellow-600' };
      default:
        return { label: 'Starting / Pre-OJT', color: 'bg-blue-500/10 text-blue-600' };
    }
  };

  // Filter list
  const currentList = useMemo(() => {
    let list = [];
    if (activeTab === 'pending') list = data.pendingStudents || [];
    else if (activeTab === 'verified') return data.verifiedStudents || []; // Server-side paginated & filtered
    else if (activeTab === 'rejected') list = data.rejectedStudents || [];
    else return [];

    return list.filter((s) => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const num = (s.student_number || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const matchSearch = name.includes(searchTerm.toLowerCase()) ||
        num.includes(searchTerm.toLowerCase()) ||
        email.includes(searchTerm.toLowerCase());

      const matchProg = selectedProgram === 'all' || s.program_name === selectedProgram;
      return matchSearch && matchProg;
    });
  }, [data, activeTab, searchTerm, selectedProgram]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header with Generate Passcode CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-on-surface">Student Verification & Passcode Management</h1>
            {staffAssignment.is_restricted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-tint text-vibrant-orange font-bold text-xs border border-vibrant-orange/30 shadow-xs">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Assigned: {staffAssignment.program_name || staffAssignment.department} {staffAssignment.program_code ? `(${staffAssignment.program_code})` : ''}</span>
              </span>
            )}
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {staffAssignment.is_restricted
              ? `You are authorized to generate program passcodes and verify accounts strictly for your assigned program / department.`
              : 'Issue shared program passcodes, verify OJT status, and route returnees / transferees to registrars.'}
          </p>
        </div>

        <button
          onClick={() => handleOpenCodeModal()}
          className="px-5 py-2.5 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors shadow-sm flex items-center gap-2 self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">key</span>
          <span>Generate Program Passcode</span>
        </button>
      </div>

      {/* Toast Messages */}
      {message && (
        <div className="p-4 bg-green-tint text-pinoy-green rounded-xl text-xs font-bold flex items-center justify-between gap-2 border border-pinoy-green/20 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{message}</span>
          </div>
          {generatedCode && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedCode.access_code);
                alert(`Passcode ${generatedCode.access_code} copied to clipboard!`);
              }}
              className="px-3 py-1.5 bg-pinoy-green text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
              <span>Copy Code</span>
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-error-container text-error rounded-xl text-xs font-bold flex items-center gap-2 border border-error/20 animate-fade-in">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-outline-variant gap-2 overflow-x-auto max-w-full">
          <button
            onClick={() => { setActiveTab('pending'); setPage(1); }}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'pending'
                ? 'border-vibrant-orange text-vibrant-orange'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            <span>Pending Verification ({counts.pending || data.pendingStudents?.length || 0})</span>
          </button>

          <button
            onClick={() => { setActiveTab('verified'); setPage(1); }}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'verified'
                ? 'border-vibrant-orange text-vibrant-orange'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Verified Students ({counts.verified ?? data.verifiedStudents?.length ?? 0})</span>
          </button>

          <button
            onClick={() => { setActiveTab('codes'); setPage(1); }}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'codes'
                ? 'border-vibrant-orange text-vibrant-orange'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">vpn_key</span>
            <span>Program Access Codes ({counts.codes ?? data.accessCodes?.length ?? 0})</span>
          </button>

          <button
            onClick={() => { setActiveTab('rejected'); setPage(1); }}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'rejected'
                ? 'border-vibrant-orange text-vibrant-orange'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">block</span>
            <span>Rejected / Disabled Accounts ({counts.rejected ?? data.rejectedStudents?.length ?? 0})</span>
          </button>
        </div>

        {/* TAB 1: PENDING / VERIFIED / REJECTED TABLES */}
        {activeTab !== 'codes' && (
          <div className="bento-card space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by student name, ID number, email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-on-surface outline-none focus:ring-2 focus:ring-vibrant-orange"
                />
              </div>

              {data.programs?.length > 0 && (
                <select
                  value={selectedProgram}
                  onChange={(e) => {
                    setSelectedProgram(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-vibrant-orange"
                >
                  <option value="all">All Degree Programs</option>
                  {data.programs.map((p) => (
                    <option key={p.program_id} value={p.program_name}>
                      {p.program_name} ({p.program_code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {loading ? (
              <div className="p-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
              </div>
            ) : currentList.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant text-xs space-y-2">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">school</span>
                <p className="font-bold text-sm text-on-surface">No Students Found</p>
                <p>
                  {activeTab === 'pending'
                    ? 'No student registrations currently awaiting verification.'
                    : 'No matching student records for this view.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentList.map((s) => {
                  const clsBadge = getClassificationBadge(s.classification);
                  const ojtBadge = getOjtStatusBadge(s.ojt_status);

                  return (
                    <div
                      key={s.student_id || s.registration_id}
                      className="p-4 bg-surface-container rounded-xl border border-outline-variant hover:border-vibrant-orange/40 text-xs space-y-3 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-on-surface">
                              {s.first_name} {s.middle_name} {s.last_name}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${clsBadge.color}`}>
                              {clsBadge.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ojtBadge.color}`}>
                              {ojtBadge.label}
                            </span>
                            {activeTab === 'pending' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600">
                                Pending Approval
                              </span>
                            )}
                          </div>

                          <p className="text-on-surface-variant text-[11px]">
                            {s.email} • Student ID: <span className="font-mono font-bold text-on-surface">{s.student_number}</span>
                            {s.program_name && (
                              <span>
                                {` • Program: ${s.program_name} (${s.program_code || ''})`}
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setSelectedStudent(s)}
                            className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors border bg-surface-container-high text-on-surface hover:bg-surface-container-highest border-outline-variant"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            <span>Review Profile</span>
                          </button>

                          {activeTab === 'pending' && (
                            <>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleApprove(s.registration_id, `${s.first_name} ${s.last_name}`)}
                                className="px-3 py-1.5 bg-pinoy-green text-white hover:opacity-90 rounded-lg font-bold text-xs flex items-center gap-1 transition-opacity shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[16px]">check</span>
                                <span>Approve</span>
                              </button>

                              <button
                                disabled={actionLoading}
                                onClick={() => openRejectModal(s)}
                                className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {activeTab === 'verified' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleToggleStatus(s.student_id, `${s.first_name} ${s.last_name}`, s.is_active)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                                s.is_active
                                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                  : 'bg-green-tint text-pinoy-green hover:opacity-90'
                              }`}
                            >
                              {s.is_active ? 'Disable Account' : 'Re-activate Account'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Detail row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-outline-variant text-[11px] text-on-surface-variant">
                        <div>
                          <span className="font-bold block text-on-surface">Contact:</span>
                          <span>{s.contact_number || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="font-bold block text-on-surface">Passcode Validated:</span>
                          <span className="font-mono text-vibrant-orange font-bold">{s.passcode_used || 'Passcode Verified'}</span>
                        </div>
                        <div>
                          <span className="font-bold block text-on-surface">Review Routing:</span>
                          <span className="font-medium text-on-surface">{s.verification_notes || 'Standard OJT Review'}</span>
                        </div>
                        <div>
                          <span className="font-bold block text-on-surface">Submitted Date:</span>
                          <span>{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : 'Recent'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls for Verified Students */}
            {activeTab === 'verified' && pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  fetchStudents(newPage, searchTerm, selectedProgram);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </div>
        )}

        {/* TAB 4: PROGRAM ACCESS CODES & EXPIRATIONS */}
        {activeTab === 'codes' && (
          <div className="bento-card space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange text-[20px]">key</span>
                  <span>Program Access Codes ({data.accessCodes?.length || 0})</span>
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Shared cohort registration codes per program with expiration dates and late registration renewal
                </p>
              </div>

              <button
                onClick={() => handleOpenCodeModal()}
                className="px-4 py-2 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Generate Program Passcode</span>
              </button>
            </div>

            {!data.accessCodes || data.accessCodes.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-outline-variant rounded-xl space-y-3">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-40">key</span>
                <p className="text-sm font-semibold text-on-surface">No program access codes generated yet</p>
                <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                  Staff coordinators can generate a single shared access code per program. All students in that program will use that single code to register until it expires.
                </p>
                <button
                  onClick={() => handleOpenCodeModal()}
                  className="px-4 py-2 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">key</span>
                  <span>Generate First Program Passcode</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[800px]">
                  <thead>
                    <tr className="border-b border-outline-variant text-on-surface-variant whitespace-nowrap">
                      <th className="py-2.5 px-3">Access Code</th>
                      <th className="py-2.5 px-3">Academic Program</th>
                      <th className="py-2.5 px-3">Target Scope</th>
                      <th className="py-2.5 px-3">Enrolled Students</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Expires At</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {data.accessCodes.map((c) => {
                      const isExpired = new Date(c.expires_at) <= new Date();
                      const isActive = !c.is_used && !isExpired;
                      const isSuperseded = Boolean(c.is_used);

                      return (
                        <tr key={c.code_id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-vibrant-orange text-sm">
                            <span className="cursor-pointer hover:underline" onClick={() => {
                              navigator.clipboard.writeText(c.code_hash);
                              showToast(`Passcode ${c.code_hash} copied!`);
                            }}>
                              {c.code_hash}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-on-surface">
                              {c.program_name ? `${c.program_name} ${c.program_code ? `(${c.program_code})` : ''}` : (c.intended_department || 'All Programs')}
                            </div>
                            {c.program_department && (
                              <div className="text-[10px] text-on-surface-variant">{c.program_department}</div>
                            )}
                            {c.supervisor_first_name && (
                              <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-orange-tint/70 text-vibrant-orange text-[10px] font-bold border border-vibrant-orange/20">
                                <span className="material-symbols-outlined text-[12px]">assignment_ind</span>
                                <span>Adviser: {c.supervisor_first_name} {c.supervisor_last_name}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-container text-on-surface">
                              {c.target_identifier || 'PROGRAM_STUDENTS'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-semibold text-[11px]">
                              <span className="material-symbols-outlined text-[13px] text-on-surface-variant">group</span>
                              <span>{c.registered_count || 0} registered</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-emerald-600 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Active
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                                <span className="material-symbols-outlined text-[12px]">timer_off</span>
                                Expired
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                <span className="material-symbols-outlined text-[12px]">sync</span>
                                Superseded
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-on-surface-variant">
                            <div className={`font-medium ${isExpired ? 'text-red-500 font-bold' : ''}`}>
                              {new Date(c.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="text-[10px] text-on-surface-variant">
                              {new Date(c.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-on-surface-variant text-[11px]">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(c.code_hash);
                                  showToast(`Passcode ${c.code_hash} copied to clipboard!`);
                                }}
                                className="px-2.5 py-1 bg-surface-container text-on-surface hover:bg-surface-container-high rounded text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                                title="Copy Access Code"
                              >
                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                <span>Copy</span>
                              </button>

                              <button
                                onClick={() => handleOpenCodeModal(c.program_id)}
                                className="px-2.5 py-1 bg-vibrant-orange/10 text-vibrant-orange hover:bg-vibrant-orange/20 rounded text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                                title="Generate new access code for late registrations or renewal"
                              >
                                <span className="material-symbols-outlined text-[14px]">autorenew</span>
                                <span>New / Late Code</span>
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
      </div>

      {/* MODAL 1: GENERATE PROGRAM ACCESS CODE */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface max-w-lg w-full rounded-2xl shadow-2xl border border-outline-variant overflow-hidden max-h-[90dvh] flex flex-col">
            <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-tint text-vibrant-orange flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">key</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">Generate Program Access Code</h3>
                  <p className="text-xs text-on-surface-variant">Shared registration access code for degree programs</p>
                </div>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {generatedCode ? (
              <div className="p-5 sm:p-6 space-y-4 text-center overflow-y-auto">
                <div className="p-5 bg-orange-tint/40 border border-vibrant-orange/30 rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Active Program Access Code
                  </span>
                  <p className="text-3xl font-mono font-black text-vibrant-orange tracking-widest">
                    {generatedCode.access_code}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface text-xs font-semibold text-on-surface border border-outline-variant">
                      <span className="material-symbols-outlined text-vibrant-orange text-sm">school</span>
                      <span>{generatedCode.program_name} {generatedCode.program_code ? `(${generatedCode.program_code})` : ''}</span>
                    </div>
                    {generatedCode.supervisor_name && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface text-xs font-semibold text-on-surface border border-outline-variant">
                        <span className="material-symbols-outlined text-vibrant-orange text-sm">assignment_ind</span>
                        <span>OJT Adviser: <strong className="text-on-surface">{generatedCode.supervisor_name}</strong></span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-medium text-on-surface-variant pt-1">
                    Valid Until:{' '}
                    <strong className="text-on-surface">
                      {new Date(generatedCode.expires_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-surface-container-low rounded-xl text-left border border-outline-variant space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                    <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                    <span>Shared Single Code for Entire Cohort</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    All students enrolling in this program will use this single access code to register. The code will remain valid for all incoming students until the expiration date.
                  </p>
                  {generatedCode.is_superseded_previous && (
                    <p className="text-[10px] text-amber-600 font-semibold pt-1">
                      Note: Any prior active code for this program has been superseded.
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode.access_code);
                      showToast(`Passcode ${generatedCode.access_code} copied to clipboard!`);
                    }}
                    className="flex-1 py-2.5 bg-vibrant-orange text-white font-bold rounded-lg text-xs hover:bg-deep-orange transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copy Access Code</span>
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedCode(null);
                      setShowCodeModal(false);
                    }}
                    className="px-5 py-2.5 bg-surface-container text-on-surface rounded-lg text-xs font-bold hover:bg-surface-container-high transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handleGenerateCode(e, Boolean(activeCodeWarning))} className="p-6 space-y-4 text-xs">
                {/* Departmental Authorization Notice when staff is restricted */}
                {staffAssignment.is_restricted && (
                  <div className="p-3 bg-orange-500/10 border border-vibrant-orange/30 rounded-xl flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-vibrant-orange text-base mt-0.5">lock</span>
                    <div className="space-y-0.5">
                      <p className="font-bold text-on-surface text-xs">
                        Departmental Program Assignment
                      </p>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        As institution staff, you can <strong>ONLY</strong> generate program access codes for your assigned program / department: <strong className="text-vibrant-orange">{staffAssignment.program_name || staffAssignment.department} {staffAssignment.program_code ? `(${staffAssignment.program_code})` : ''}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Active Code Conflict / Late Registration Warning */}
                {activeCodeWarning && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                    <div className="flex items-start gap-2 text-amber-600">
                      <span className="material-symbols-outlined text-base mt-0.5">warning</span>
                      <div>
                        <div className="font-bold text-xs">Active Program Code Detected</div>
                        <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                          {activeCodeWarning}
                        </p>
                      </div>
                    </div>
                    <div className="pt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleGenerateCode(e, true)}
                        disabled={codeLoading}
                        className="flex-1 py-2 bg-amber-600 text-white font-bold rounded-lg text-[11px] hover:bg-amber-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">autorenew</span>
                        <span>Supersede & Generate Late Registration Code</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCodeWarning(null)}
                        className="px-3 py-2 bg-surface-container text-on-surface rounded-lg text-[11px] font-bold hover:bg-surface-container-high transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Degree Program Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-on-surface-variant uppercase">
                      Academic Degree Program *
                    </label>
                    {staffAssignment.is_restricted && (
                      <span className="text-[10px] font-bold text-vibrant-orange flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">lock</span>
                        Locked to your assignment
                      </span>
                    )}
                  </div>

                  {staffAssignment.is_restricted ? (
                    data.programs && data.programs.length > 1 ? (
                      <select
                        required
                        value={codeForm.program_id}
                        onChange={(e) => handleProgramSelect(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-vibrant-orange/40 bg-orange-tint/10 text-on-surface font-bold outline-none focus:ring-2 focus:ring-vibrant-orange"
                      >
                        {data.programs.map((p) => (
                          <option key={p.program_id} value={p.program_id}>
                            {p.program_name} ({p.program_code})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full px-3 py-2.5 rounded-lg border border-vibrant-orange/40 bg-orange-tint/15 text-on-surface font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-vibrant-orange text-[16px]">school</span>
                          <span>
                            {staffAssignment.program_name || (data.programs && data.programs[0]?.program_name) || 'Assigned Program'} {staffAssignment.program_code ? `(${staffAssignment.program_code})` : ''}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-vibrant-orange text-sm">lock</span>
                      </div>
                    )
                  ) : (
                    <select
                      required
                      value={codeForm.program_id}
                      onChange={(e) => handleProgramSelect(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-vibrant-orange font-semibold"
                    >
                      <option value="">Select Academic Degree Program...</option>
                      {data.programs?.map((p) => (
                        <option key={p.program_id} value={p.program_id}>
                          {p.program_name} ({p.program_code})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    All students registering for this degree program will use this single shared access code.
                  </p>
                </div>

                {/* Expiration Date with Quick Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-on-surface-variant uppercase">
                      Code Expiration Date *
                    </label>
                    <span className="text-[10px] text-on-surface-variant">
                      Expires at 11:59 PM on date
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={codeForm.expiration_date}
                    onChange={(e) => {
                      setCodeForm({ ...codeForm, expiration_date: e.target.value });
                      setActiveCodeWarning(null);
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-semibold outline-none focus:ring-2 focus:ring-vibrant-orange"
                  />

                  {/* Preset validity buttons */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-on-surface-variant font-bold">Presets:</span>
                    {[
                      { label: '+7 Days', days: 7 },
                      { label: '+14 Days (Default)', days: 14 },
                      { label: '+30 Days', days: 30 },
                      { label: '+60 Days', days: 60 }
                    ].map((btn) => {
                      const presetDate = getDefaultExpirationDate(btn.days);
                      const isSelected = codeForm.expiration_date === presetDate;
                      return (
                        <button
                          key={btn.days}
                          type="button"
                          onClick={() => {
                            setCodeForm({ ...codeForm, expiration_date: presetDate });
                            setActiveCodeWarning(null);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                            isSelected
                              ? 'bg-vibrant-orange text-white'
                              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                          }`}
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    The code becomes invalid once this date is reached. If students need to register after expiration, you can issue a new late registration code anytime.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-on-surface-variant uppercase mb-1">
                      Student Classification
                    </label>
                    <select
                      value={codeForm.intended_classification}
                      onChange={(e) => setCodeForm({ ...codeForm, intended_classification: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-semibold outline-none focus:ring-2 focus:ring-vibrant-orange"
                    >
                      <option value="regular">Regular Student</option>
                      <option value="returnee">Returnee (Registrar)</option>
                      <option value="transferee">Transferee (Registrar)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-on-surface-variant uppercase mb-1">
                      OJT Status
                    </label>
                    <select
                      value={codeForm.intended_status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-semibold outline-none focus:ring-2 focus:ring-vibrant-orange"
                    >
                      <option value="starting_ojt">Starting / Pre-OJT</option>
                      <option value="ongoing_ojt">Ongoing OJT</option>
                      <option value="completed_ojt">Completed OJT</option>
                    </select>
                  </div>
                </div>

                {/* OJT Supervisor / Adviser Selection for starting_ojt */}
                {codeForm.intended_status === 'starting_ojt' && (
                  <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-on-surface uppercase text-[11px] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-vibrant-orange text-[16px]">assignment_ind</span>
                        <span>OJT Supervisor / Adviser *</span>
                      </label>
                      {selectedDept && (
                        <span className="text-[10px] font-semibold text-on-surface-variant bg-surface px-2 py-0.5 rounded border border-outline-variant">
                          Dept: {selectedDept}
                        </span>
                      )}
                    </div>

                    {deptSupervisors.length > 1 ? (
                      <div className="space-y-1.5">
                        <select
                          required
                          value={codeForm.assigned_staff_id}
                          onChange={(e) => setCodeForm({ ...codeForm, assigned_staff_id: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg border border-vibrant-orange/50 bg-surface text-on-surface font-semibold outline-none focus:ring-2 focus:ring-vibrant-orange text-xs"
                        >
                          <option value="">Select OJT Supervisor / Adviser for this Department...</option>
                          {deptSupervisors.map((s) => (
                            <option key={s.staff_id} value={s.staff_id}>
                              {s.first_name} {s.last_name} {s.employee_id ? `(${s.employee_id})` : s.email ? `(${s.email})` : ''} — {s.position === 'ojt_supervisor' ? 'OJT Supervisor / Adviser' : s.position}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">
                          The <strong className="text-on-surface">{selectedDept}</strong> department has <strong>{deptSupervisors.length} OJT Supervisors/Advisers</strong>. Please select which supervisor is assigned to this registration passcode cohort.
                        </p>
                      </div>
                    ) : deptSupervisors.length === 1 ? (
                      <div className="p-3 bg-surface rounded-lg border border-vibrant-orange/30 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-orange-tint text-vibrant-orange flex items-center justify-center font-bold shrink-0">
                            <span className="material-symbols-outlined text-[18px]">verified_user</span>
                          </div>
                          <div>
                            <div className="font-bold text-on-surface text-xs">
                              {deptSupervisors[0].first_name} {deptSupervisors[0].last_name}
                            </div>
                            <div className="text-[10px] text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                              <span>{deptSupervisors[0].position === 'ojt_supervisor' ? 'OJT Supervisor / Adviser' : deptSupervisors[0].position}</span>
                              {deptSupervisors[0].employee_id && <span>• ID: {deptSupervisors[0].employee_id}</span>}
                              {deptSupervisors[0].email && <span>• {deptSupervisors[0].email}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                          <span className="material-symbols-outlined text-[13px]">lock</span>
                          Included / Auto-Assigned
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1.5">
                        <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs">
                          <span className="material-symbols-outlined text-sm">info</span>
                          <span>No Supervisor Registered for {selectedDept || 'this Department'}</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">
                          No dedicated OJT Supervisor is currently assigned under this department.
                          {otherSupervisors.length > 0
                            ? ' You may optionally select an institution-wide supervisor below or leave unassigned:'
                            : ' Incoming students will be routed for general review.'}
                        </p>
                        {otherSupervisors.length > 0 && (
                          <select
                            value={codeForm.assigned_staff_id}
                            onChange={(e) => setCodeForm({ ...codeForm, assigned_staff_id: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs outline-none focus:ring-2 focus:ring-vibrant-orange font-medium mt-1"
                          >
                            <option value="">Leave Unassigned (General Review)</option>
                            {otherSupervisors.map((s) => (
                              <option key={s.staff_id} value={s.staff_id}>
                                {s.first_name} {s.last_name} ({s.department || 'General'}) — {s.position}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={codeLoading}
                  className="w-full py-2.5 bg-vibrant-orange text-white font-bold rounded-lg hover:bg-deep-orange transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {codeLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Generating Program Access Code...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">key</span>
                      <span>{activeCodeWarning ? 'Supersede & Generate Late Code' : 'Generate Program Access Code'}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: FULL STUDENT PROFILE & VERIFICATION REVIEW */}
      {selectedStudent && (() => {
        const regClsBadge = getClassificationBadge(selectedStudent.classification);
        const regOjtBadge = getOjtStatusBadge(selectedStudent.ojt_status);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface max-w-2xl w-full rounded-2xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg bg-orange-tint text-vibrant-orange">
                    <span className="material-symbols-outlined text-[26px]">school</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                      <span>Student Personal Details & Academic Review</span>
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Submitted registration data for Coordinator / Registrar verification & authorization
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Modal Body: Complete Personal & Academic Info Display */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {/* Section 1: Personal Identity */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-vibrant-orange flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    <span>Student Personal Identity</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-surface-container-low rounded-xl border border-outline-variant">
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">First Name</span>
                      <span className="font-bold text-on-surface text-sm">{selectedStudent.first_name}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Middle Name</span>
                      <span className="font-bold text-on-surface text-sm">{selectedStudent.middle_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Last Name</span>
                      <span className="font-bold text-on-surface text-sm">{selectedStudent.last_name}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Email Address</span>
                      <span className="font-bold text-on-surface text-xs truncate block">{selectedStudent.email}</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Academic Profile & OJT Status Review */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-vibrant-orange flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">badge</span>
                    <span>Enrollment & Academic Appointment Review</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Student ID Number Card */}
                    <div className="p-3.5 rounded-xl border bg-surface-container-low border-outline-variant">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Student ID Number
                      </span>
                      <span className="font-mono font-bold text-sm block mt-1 text-vibrant-orange">
                        {selectedStudent.student_number}
                      </span>
                    </div>

                    {/* Degree Program Card */}
                    <div className="p-3.5 rounded-xl border bg-surface-container-low border-outline-variant">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Degree Program
                      </span>
                      <span className="font-bold text-sm block mt-1 text-on-surface">
                        {selectedStudent.program_name ? `${selectedStudent.program_name} (${selectedStudent.program_code || ''})` : 'General Academic Program'}
                      </span>
                    </div>

                    {/* Student Classification Card */}
                    <div className="p-3.5 rounded-xl border bg-surface-container-low border-outline-variant">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Student Classification
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-bold text-sm block text-on-surface">
                          {regClsBadge.label}
                        </span>
                      </div>
                    </div>

                    {/* Current OJT Status Card */}
                    <div className="p-3.5 rounded-xl border bg-surface-container-low border-outline-variant">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Current OJT Status
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-bold text-sm block text-on-surface">
                          {regOjtBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Passcode & Registration Metadata */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-vibrant-orange flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">vpn_key</span>
                    <span>Passcode & Verification Routing Metadata</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-surface-container-low rounded-xl border border-outline-variant">
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Passcode Validated</span>
                      <span className="font-mono text-vibrant-orange font-bold text-sm">
                        {selectedStudent.passcode_used || selectedStudent.passcode_code_hash || 'Passcode Verified'}
                      </span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Contact Phone</span>
                      <span className="font-bold text-on-surface text-sm">
                        {selectedStudent.contact_number || 'Not provided'}
                      </span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Department / College</span>
                      <span className="font-bold text-on-surface text-sm">
                        {selectedStudent.department || selectedStudent.passcode_intended_department || 'General Academic'}
                      </span>
                    </div>
                    <div className="sm:col-span-3 pt-2 border-t border-outline-variant">
                      <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Verification Notes & Routing</span>
                      <span className="font-medium text-xs block mt-0.5 text-on-surface">
                        {selectedStudent.verification_notes || 'Standard OJT Student Verification'}
                      </span>
                    </div>
                    {selectedStudent.assigned_supervisor && (
                      <div className="sm:col-span-3 pt-2 border-t border-outline-variant flex items-center justify-between">
                        <div>
                          <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Assigned OJT Supervisor / Adviser</span>
                          <span className="font-bold text-xs text-vibrant-orange flex items-center gap-1.5 mt-0.5">
                            <span className="material-symbols-outlined text-[15px]">assignment_ind</span>
                            <span>{selectedStudent.assigned_supervisor.first_name} {selectedStudent.assigned_supervisor.last_name}</span>
                            {selectedStudent.assigned_supervisor.email && (
                              <span className="text-on-surface-variant font-normal">({selectedStudent.assigned_supervisor.email})</span>
                            )}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-emerald-600 border border-emerald-500/20">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span>
                          Supervisor Assigned
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-between items-center gap-3">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 bg-surface-container text-on-surface-variant hover:text-on-surface rounded-lg font-bold text-xs transition-colors"
                >
                  Close
                </button>

                {activeTab === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => openRejectModal(selectedStudent)}
                      className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg font-bold text-xs transition-colors"
                    >
                      Reject Registration
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleApprove(selectedStudent.registration_id, `${selectedStudent.first_name} ${selectedStudent.last_name}`)}
                      className="px-5 py-2 bg-pinoy-green text-white hover:opacity-90 rounded-lg font-bold text-xs transition-opacity shadow-sm flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>Approve & Activate Student</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: REJECT CONFIRMATION */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface max-w-md w-full rounded-2xl shadow-2xl border border-outline-variant p-5 sm:p-6 space-y-4 text-xs max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center gap-3 text-red-500">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="text-base font-bold text-on-surface">Reject Student Registration</h3>
            </div>

            <p className="text-on-surface-variant leading-relaxed">
              Are you sure you want to reject the registration for <strong className="text-on-surface">{rejectModal.studentName}</strong> ({rejectModal.studentNumber})? The student account will be deactivated.
            </p>

            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">
                Reason for Rejection (Optional)
              </label>
              <textarea
                rows="3"
                placeholder="e.g. Ineligible enrollment status, invalid student ID, returnee clearance pending..."
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setRejectModal({ isOpen: false, regId: null, studentName: '', studentNumber: '', email: '', reason: '' })}
                className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-bold hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
