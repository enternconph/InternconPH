import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { resolveFileUrl } from '../../utils/fileHelper';
import { useRealtimeRefresh } from '../../contexts/SocketContext';

export default function InstRequirements() {
  const [data, setData] = useState({
    requirements: [],
    submissions: [],
    students: [],
    programs: [],
    staff_scope: null
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [remindingId, setRemindingId] = useState(null);
  const [remindingAll, setRemindingAll] = useState(false);

  // Search & Filter State for Student Cards
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'completed' | 'pending'
  const [programFilter, setProgramFilter] = useState('');

  // Form State for Creating Requirement
  const [reqName, setReqName] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);
  const [programId, setProgramId] = useState('');
  const [templateFile, setTemplateFile] = useState(null);

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inst/requirements');
      if (res.success && res.data) {
        setData({
          requirements: res.data.requirements || [],
          submissions: res.data.submissions || [],
          students: res.data.students || [],
          programs: res.data.programs || [],
          staff_scope: res.data.staff_scope || null
        });
      }
    } catch (err) {
      console.error('Failed to fetch requirements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  useRealtimeRefresh(fetchRequirements);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!reqName.trim()) return;
    setMessage('');
    setActionLoading(true);

    try {
      let document_template_url = null;

      // If a template file is attached, upload it first
      if (templateFile) {
        const formData = new FormData();
        formData.append('file', templateFile);
        const uploadRes = await api.post('/inst/requirements/upload', formData);
        const resolvedUrl = uploadRes.url || uploadRes.file_url || uploadRes.data?.url || uploadRes.data?.file_url || uploadRes.data?.file_path;
        if (uploadRes.success && resolvedUrl) {
          document_template_url = resolvedUrl;
        } else {
          alert(uploadRes.message || 'Failed to upload template file.');
          setActionLoading(false);
          return;
        }
      }

      const res = await api.post('/inst/requirements', {
        requirement_name: reqName.trim(),
        description: reqDesc.trim(),
        is_mandatory: isMandatory,
        program_id: programId ? Number(programId) : null,
        document_template_url
      });

      if (res.success) {
        setMessage('OJT requirement created and published! Affected students have been automatically notified to submit this requirement.');
        setReqName('');
        setReqDesc('');
        setTemplateFile(null);
        setProgramId('');
        const fileInput = document.getElementById('templateFileInput');
        if (fileInput) fileInput.value = '';
        fetchRequirements();
      } else {
        alert(res.message || 'Creation failed.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create requirement.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRequirement = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the requirement "${title}"?`)) return;
    try {
      const res = await api.delete(`/inst/requirements/${id}`);
      if (res.success) {
        setMessage('Requirement deleted successfully.');
        fetchRequirements();
      } else {
        alert(res.message || 'Failed to delete requirement.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete requirement.');
    }
  };

  const handleSendReminder = async (studentId) => {
    setRemindingId(studentId);
    try {
      const res = await api.post(`/inst/requirements/remind/${studentId}`);
      if (res.success) {
        setMessage(res.message || 'Reminder notification sent successfully.');
      } else {
        alert(res.message || 'Failed to send reminder.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reminder.');
    } finally {
      setRemindingId(null);
    }
  };

  const handleRemindAll = async () => {
    if (!window.confirm('Send in-app reminder notifications to all students who have pending requirements?')) return;
    setRemindingAll(true);
    try {
      const res = await api.post('/inst/requirements/remind-all');
      if (res.success) {
        setMessage(res.message || 'Reminder notifications broadcasted.');
      } else {
        alert(res.message || 'Failed to broadcast reminders.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to broadcast reminders.');
    } finally {
      setRemindingAll(false);
    }
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return (data.students || []).filter((s) => {
      // Search filter (name or student number)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q);
        const numMatch = (s.student_number || '').toLowerCase().includes(q);
        if (!nameMatch && !numMatch) return false;
      }

      // Status filter
      if (statusFilter === 'completed') {
        if (s.completion_status !== 'successfully_submitted') return false;
      } else if (statusFilter === 'pending') {
        if (s.completion_status !== 'pending') return false;
      }

      // Program filter
      if (programFilter) {
        if (String(s.program_id) !== String(programFilter)) return false;
      }

      return true;
    });
  }, [data.students, searchQuery, statusFilter, programFilter]);

  const totalStudentsCount = data.students?.length || 0;
  const completedStudentsCount = data.students?.filter((s) => s.completion_status === 'successfully_submitted').length || 0;
  const pendingStudentsCount = data.students?.filter((s) => s.completion_status === 'pending').length || 0;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="border-b border-outline-variant/60 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-on-surface">OJT Clearance & Requirement Management</h1>
          {data.staff_scope?.isRestricted && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-tint text-vibrant-orange font-bold text-xs border border-vibrant-orange/30 shadow-xs">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>Assigned: {data.staff_scope.program?.program_name} {data.staff_scope.program?.program_code ? `(${data.staff_scope.program.program_code})` : ''}</span>
            </span>
          )}
        </div>
        <p className="text-sm text-on-surface-variant mt-1">
          {data.staff_scope?.isRestricted
            ? `Managing clearance requirements strictly for students in your assigned degree program.`
            : 'Define mandatory clearance requirements (MOA, Medical, Endorsement), publish form templates, and track student completion cards in real time.'}
        </p>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs border border-pinoy-green/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-pinoy-green hover:opacity-75">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* TOP SECTION: Configuration & Requirements Grid (5 cols + 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Card: Create Requirement Form (5 columns) */}
        <div className="lg:col-span-5 bento-card space-y-4">
          <div className="border-b border-outline-variant pb-2">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange text-[22px]">note_add</span>
              <span>Create Requirement</span>
            </h2>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Students will automatically receive an in-app notification when a new requirement is published.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">
                Requirement Title <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MOA / Parent Consent / Medical Clearance"
                value={reqName}
                onChange={(e) => setReqName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-vibrant-orange"
              />
            </div>

            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">Description / Guidelines</label>
              <textarea
                rows="3"
                placeholder="Include instructions, submission deadlines, or signing requirements..."
                value={reqDesc}
                onChange={(e) => setReqDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-vibrant-orange"
              ></textarea>
            </div>

            {/* Target Program (if not locked to staff program) */}
            {!data.staff_scope?.isRestricted && data.programs && data.programs.length > 0 && (
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Target Degree Program</label>
                <select
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-vibrant-orange"
                >
                  <option value="">All Degree Programs (Universal Requirement)</option>
                  {data.programs.map((p) => (
                    <option key={p.program_id} value={p.program_id}>
                      {p.program_name} {p.program_code ? `(${p.program_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Attach Template / Form File */}
            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">
                Attach Form Template / Document (Optional)
              </label>
              <p className="text-[11px] text-on-surface-variant mb-1.5">
                Attach a blank form or template that students can download, fill out, and return.
              </p>
              <div className="p-3 bg-surface-container-low rounded-xl border border-dashed border-outline-variant space-y-2">
                <input
                  type="file"
                  id="templateFileInput"
                  onChange={(e) => setTemplateFile(e.target.files[0] || null)}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.zip"
                  className="w-full text-[11px] text-on-surface file:mr-2.5 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-vibrant-orange file:text-white hover:file:bg-deep-orange cursor-pointer"
                />
                {templateFile && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                    <span className="truncate font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">attachment</span>
                      {templateFile.name} ({(templateFile.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateFile(null);
                        const fileInput = document.getElementById('templateFileInput');
                        if (fileInput) fileInput.value = '';
                      }}
                      className="text-error font-bold ml-2"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="mand"
                checked={isMandatory}
                onChange={(e) => setIsMandatory(e.target.checked)}
                className="w-4 h-4 rounded border-outline-variant text-vibrant-orange"
              />
              <label htmlFor="mand" className="font-bold text-on-surface cursor-pointer select-none">
                Mandatory for OJT clearance
              </label>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2.5 bg-vibrant-orange text-white font-bold rounded-xl hover:bg-deep-orange transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">publish</span>
              {actionLoading ? 'Publishing & Notifying...' : 'Publish Requirement'}
            </button>
          </form>
        </div>

        {/* Right Card: Active Requirements List (7 columns) */}
        <div className="lg:col-span-7 bento-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-outline-variant pb-2">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange text-[20px]">fact_check</span>
              <span>Active Requirements ({data.requirements?.length || 0})</span>
            </h2>
            <span className="text-xs text-on-surface-variant font-medium">Visible in Student Clearance</span>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-7 w-7 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : data.requirements?.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant text-xs space-y-2">
              <span className="material-symbols-outlined text-[36px] text-outline">playlist_add</span>
              <p className="font-bold text-on-surface">No requirements currently created.</p>
              <p>Use the form on the left to publish your first clearance document.</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto pr-1 space-y-3">
              {data.requirements.map((req) => (
                <div
                  key={req.requirement_id}
                  className="p-3.5 bg-surface-container rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-outline-variant text-xs hover:border-vibrant-orange/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-on-surface">{req.requirement_name}</p>
                      {req.is_mandatory ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Mandatory
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface-variant">
                          Optional
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {req.program_name || (req.program_id ? 'Assigned Program' : 'All Degree Programs')}
                      </span>
                    </div>
                    {req.description && <p className="text-on-surface-variant text-xs">{req.description}</p>}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {req.document_template_url && (
                      <a
                        href={resolveFileUrl(req.document_template_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="px-2.5 py-1.5 bg-surface-container-high text-on-surface hover:text-vibrant-orange rounded-lg border border-outline-variant font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">file_download</span>
                        <span>Download Template</span>
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteRequirement(req.requirement_id, req.requirement_name)}
                      className="px-2.5 py-1.5 text-error hover:bg-rose-50 rounded-lg border border-error/20 font-bold text-xs flex items-center gap-1 transition-colors"
                      title="Delete requirement"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SECTION: Full-Width Student Clearance & Requirements Tracker */}
      <div className="bento-card space-y-5 w-full">
        {/* Header & Metrics */}
        <div className="space-y-4 border-b border-outline-variant pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange text-[22px]">badge</span>
                <span>Student Clearance Tracker ({totalStudentsCount})</span>
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Individual student cards showing submitted files and needed requirements. Students with all requirements submitted are marked as Successfully Submitted.
              </p>
            </div>

            {pendingStudentsCount > 0 && (
              <button
                onClick={handleRemindAll}
                disabled={remindingAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shrink-0 shadow-xs"
                title="Send reminder notification to all students who have unsubmitted requirements"
              >
                <span className="material-symbols-outlined text-[17px]">campaign</span>
                <span>{remindingAll ? 'Broadcasting Reminders...' : `Remind All Incomplete (${pendingStudentsCount})`}</span>
              </button>
            )}
          </div>

          {/* Summary Stats Row: 3 Wide Executive Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 bg-surface-container rounded-xl border border-outline-variant flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[11px] text-on-surface-variant font-medium">Total Enrolled Students</p>
                <p className="text-2xl font-black text-on-surface font-mono mt-0.5">{totalStudentsCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[24px]">groups</span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">Successfully Submitted (100%)</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">{completedStudentsCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">Pending Requirements</p>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono mt-0.5">{pendingStudentsCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">pending_actions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls: Spacious Horizontal Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search student name or ID (e.g. 2024-04197)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-surface-container rounded-xl border border-outline-variant text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-vibrant-orange text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Status Tabs & Program Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-surface-container p-1 rounded-xl border border-outline-variant gap-1 shrink-0 font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-surface text-on-surface shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All ({totalStudentsCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'completed'
                    ? 'bg-surface text-emerald-600 shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Completed ({completedStudentsCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-surface text-amber-600 shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Pending ({pendingStudentsCount})
              </button>
            </div>

            {/* Degree Program Filter */}
            {data.programs && data.programs.length > 1 && !data.staff_scope?.isRestricted && (
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="px-3 py-2 bg-surface-container rounded-xl border border-outline-variant text-on-surface text-xs outline-none focus:border-vibrant-orange font-medium"
              >
                <option value="">All Programs</option>
                {data.programs.map((p) => (
                  <option key={p.program_id} value={p.program_id}>
                    {p.program_code || p.program_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Student Cards List: Spacious Full-Width Cards */}
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant text-xs space-y-2">
            <span className="material-symbols-outlined text-[40px] text-outline">search_off</span>
            <p className="font-bold text-on-surface text-sm">No students found matching current filters.</p>
            <p>Try resetting the search query or status filter above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStudents.map((stu) => {
              const isComplete = stu.completion_status === 'successfully_submitted';
              const isPending = stu.completion_status === 'pending';
              const initials = `${stu.first_name?.[0] || ''}${stu.last_name?.[0] || ''}`.toUpperCase() || 'ST';

              return (
                <div
                  key={stu.student_id}
                  className="p-4 sm:p-5 bg-surface-container rounded-2xl border border-outline-variant hover:border-vibrant-orange/40 transition-all space-y-4 shadow-xs"
                >
                  {/* Card Header: Student Info + Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
                    <div className="flex items-center gap-3">
                      {/* Student Initials Avatar */}
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
                        isComplete
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      }`}>
                        {initials}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-on-surface">
                            {stu.student_name}
                          </h3>
                          <span className="text-xs font-mono text-on-surface-variant font-medium">
                            ({stu.student_number || 'No ID'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant flex-wrap mt-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-surface-container-high border border-outline-variant font-medium">
                            {stu.program_name || (stu.program_code ? stu.program_code : 'Degree Program')}
                          </span>
                          {stu.email && <span>{stu.email}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge + Action */}
                    <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                      {isComplete ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-xs">
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Successfully Submitted</span>
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs">
                          <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                          <span>Incomplete ({stu.needed_requirements?.length || 0} Needed)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-container-high text-on-surface-variant border border-outline-variant">
                          <span>No Requirements Set</span>
                        </span>
                      )}

                      {isPending && (
                        <button
                          onClick={() => handleSendReminder(stu.student_id)}
                          disabled={remindingId === stu.student_id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                          title="Send reminder notification to student"
                        >
                          <span className="material-symbols-outlined text-[15px]">notifications_active</span>
                          <span>{remindingId === stu.student_id ? 'Sending...' : 'Remind'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Clearance Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-on-surface-variant">
                      <span>
                        Clearance Progress: {stu.submitted_count} of {stu.applicable_count} Submitted
                      </span>
                      <span className={`font-mono text-xs ${isComplete ? 'text-emerald-600 font-black' : 'text-on-surface'}`}>
                        {stu.progress_pct}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden border border-outline-variant/60">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isComplete ? 'bg-emerald-600' : 'bg-vibrant-orange'
                        }`}
                        style={{ width: `${stu.progress_pct}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Card Content: 2 Subsections (Submitted vs Needed to Submit) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                    {/* 1. Submitted Requirements Section */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-2.5">
                      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5">
                        <h4 className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                          <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                          <span>Submitted Documents ({stu.submitted_requirements?.length || 0})</span>
                        </h4>
                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Stored
                        </span>
                      </div>

                      {(!stu.submitted_requirements || stu.submitted_requirements.length === 0) ? (
                        <p className="text-[11px] text-on-surface-variant italic py-3 text-center">
                          No clearance documents submitted yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {stu.submitted_requirements.map((sub, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-2.5 bg-surface-container rounded-lg border border-outline-variant flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <p className="font-bold text-on-surface truncate text-xs">
                                  {sub.requirement_name}
                                </p>
                                <p className="text-[10px] text-on-surface-variant">
                                  Submitted: {new Date(sub.submitted_at).toLocaleDateString()} {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {sub.file_url ? (
                                  <a
                                    href={resolveFileUrl(sub.file_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container-high hover:bg-surface-container text-on-surface hover:text-vibrant-orange rounded-md border border-outline-variant font-bold text-[11px] transition-colors"
                                    title="View submitted file"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                                    <span>View File</span>
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-on-surface-variant italic">Online</span>
                                )}
                                <span className="px-1.5 py-0.5 rounded bg-green-tint text-pinoy-green text-[10px] font-black uppercase">
                                  ✓
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 2. Needed to Submit Section */}
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-2.5">
                      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5">
                        <h4 className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                          <span className="material-symbols-outlined text-amber-600 text-[18px]">pending</span>
                          <span>Needed to Submit ({stu.needed_requirements?.length || 0})</span>
                        </h4>
                        {isComplete ? (
                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            All Cleared
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            Action Needed
                          </span>
                        )}
                      </div>

                      {(!stu.needed_requirements || stu.needed_requirements.length === 0) ? (
                        <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium flex items-center gap-2 justify-center text-center">
                          <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0">task_alt</span>
                          <span>All clearance requirements successfully submitted!</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {stu.needed_requirements.map((req, rIdx) => (
                            <div
                              key={rIdx}
                              className="p-2.5 bg-surface-container rounded-lg border border-outline-variant flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-on-surface truncate text-xs">
                                    {req.requirement_name}
                                  </p>
                                  {req.is_mandatory && (
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded">
                                      Req
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                                  Awaiting Student Submission
                                </p>
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5">
                                {req.document_template_url && (
                                  <a
                                    href={resolveFileUrl(req.document_template_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container-high hover:bg-surface-container text-on-surface rounded-md border border-outline-variant font-medium text-[10px] transition-colors"
                                    title="Download template form"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">file_download</span>
                                    <span>Template</span>
                                  </a>
                                )}
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                  Pending
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
