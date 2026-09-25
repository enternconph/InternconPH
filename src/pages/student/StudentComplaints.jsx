import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import Pagination from '../../components/ui/Pagination';

export default function StudentComplaints() {
  const [data, setData] = useState({ complaints: [], categories: [], orgs: [], assigned_organization: null, can_file: false });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const [catId, setCatId] = useState('');
  const [studentStatus, setStudentStatus] = useState('');
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');

  // Search, filter, and pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const fetchComplaints = useCallback(async () => {
    try {
      const res = await api.get('/student/complaints');
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.default_student_status) {
          setStudentStatus((prev) => prev || res.data.default_student_status);
        }
      }
    } catch (err) {
      console.error('Fetch complaints error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Real-time synchronization
  useRealtimeRefresh(fetchComplaints);

  // Status counts for filters
  const counts = useMemo(() => {
    const list = data.complaints || [];
    return {
      all: list.length,
      submitted: list.filter((c) => c.status === 'submitted').length,
      under_review: list.filter(
        (c) => c.status === 'institution_review' || c.status === 'under_investigation'
      ).length,
      resolved: list.filter((c) => c.status === 'resolved').length,
      warnings: list.filter((c) => !!c.warning_note_to_student).length,
    };
  }, [data.complaints]);

  // Filtered complaints based on search and status
  const filteredComplaints = useMemo(() => {
    let list = data.complaints || [];
    if (statusFilter === 'warnings') {
      list = list.filter((c) => !!c.warning_note_to_student);
    } else if (statusFilter === 'under_review') {
      list = list.filter(
        (c) => c.status === 'institution_review' || c.status === 'under_investigation'
      );
    } else if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.subject?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.organization_name?.toLowerCase().includes(q) ||
          c.category_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data.complaints, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredComplaints.length / pageSize) || 1;
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredComplaints.slice(start, start + pageSize);
  }, [filteredComplaints, currentPage, pageSize]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!data.assigned_organization) {
      alert('You must be assigned to an organization before filing a grievance.');
      return;
    }
    const resolvedStatus = data.is_ojt ? (studentStatus || 'ojt') : data.student_status_type;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await api.post('/student/complaints', {
        category_id: catId,
        student_status: resolvedStatus,
        subject,
        description: desc
      });
      if (res.success) {
        setMessage(res.message || 'Grievance reported successfully.');
        setSubject('');
        setDesc('');
        setCatId('');
        fetchComplaints();
      } else {
        alert(res.message || 'Submission failed.');
      }
    } catch (err) {
      alert('Failed to submit grievance: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (complaintId, subjectTitle) => {
    if (!window.confirm(`Are you sure you want to withdraw the grievance "${subjectTitle}"?`)) return;
    try {
      const res = await api.delete(`/student/complaints/${complaintId}`);
      if (res.success) {
        setMessage('Grievance report withdrawn.');
        fetchComplaints();
      } else {
        alert(res.message || 'Failed to withdraw complaint.');
      }
    } catch (err) {
      alert('Error withdrawing grievance.');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Student Grievance & Complaint Filing</h1>
        <p className="text-sm text-on-surface-variant">Report compliance violations, harassment, or contract breaches to ensure student protection and accountability</p>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form to submit complaint or Locked Notice */}
        {!data.can_file || !data.assigned_organization ? (
          <div className="bento-card space-y-4 lg:sticky lg:top-6 h-fit bg-amber-50/50 dark:bg-amber-950/20 border-amber-300/60 dark:border-amber-700/40">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">lock</span>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-on-surface">Grievance Filing Disabled</h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Grievance and complaint filing is only enabled when you are actively assigned or deployed to a host organization for OJT.
              </p>
            </div>
            <div className="p-3 bg-white/70 dark:bg-surface rounded-xl border border-outline-variant text-[11px] text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-vibrant-orange shrink-0">info</span>
              <span>Target organization will automatically lock to your assigned host employer once deployed.</span>
            </div>
          </div>
        ) : (
          <div className="bento-card space-y-4 lg:sticky lg:top-6 h-fit">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[22px]">gavel</span>
              <span>File a Formal Grievance</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {/* Target Organization (Automatically locked to assigned OJT host) */}
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Target Host Organization *</label>
                <div className="p-3 bg-surface-container rounded-xl border border-outline-variant flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-orange-tint text-vibrant-orange flex items-center justify-center font-bold text-sm shrink-0">
                      <span className="material-symbols-outlined text-[20px]">apartment</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-on-surface truncate">{data.assigned_organization.organization_name}</p>
                      <p className="text-[10px] text-on-surface-variant capitalize truncate">
                        {data.assigned_organization.industry || 'Host Employer'} • Active Placement
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">lock</span>
                    Assigned
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1">
                  Automatically set to your currently assigned OJT placement.
                </p>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Violation Category *</label>
                <select
                  required
                  value={catId}
                  onChange={(e) => setCatId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-medium outline-none focus:ring-2 focus:ring-vibrant-orange"
                >
                  <option value="">Select violation type...</option>
                  {data.categories?.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Status Field (Only shown for OJT students) */}
              {data.is_ojt ? (
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">Student Status *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStudentStatus('ojt')}
                      className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                        studentStatus === 'ojt'
                          ? 'border-vibrant-orange bg-orange-tint text-vibrant-orange font-bold ring-1 ring-vibrant-orange'
                          : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">school</span>
                      <div>
                        <p className="text-xs font-bold">Current OJT</p>
                        <p className="text-[10px] opacity-75">Active Practicum</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatus('graduated')}
                      className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                        studentStatus === 'graduated'
                          ? 'border-pinoy-green bg-green-tint text-pinoy-green font-bold ring-1 ring-pinoy-green'
                          : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                      <div>
                        <p className="text-xs font-bold">Graduated</p>
                        <p className="text-[10px] opacity-75">Alumni Student</p>
                      </div>
                    </button>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    Identifies your academic status so your institution OJT coordinator can properly review your grievance.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 rounded-xl space-y-1 text-purple-950 dark:text-purple-100">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400">admin_panel_settings</span>
                    <span>Direct System Administrator Escrow</span>
                  </div>
                  <p className="text-[11px] text-purple-900/85 dark:text-purple-200 leading-relaxed">
                    As an {data.student_status_type === 'on_call' ? 'On-Call' : 'Career Job'} practitioner, your grievance will bypass institutional review and be forwarded directly to the System Administrator.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Subject / Incident Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of the issue..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low outline-none focus:ring-2 focus:ring-vibrant-orange text-on-surface"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Detailed Description & Evidence Context *</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Provide dates, personnel involved, and specific details..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low outline-none focus:ring-2 focus:ring-vibrant-orange text-on-surface"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-error text-white font-bold rounded-lg hover:opacity-90 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>{submitting ? 'Submitting Report...' : 'Submit Report for Review'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Complaints History List */}
        <div className="lg:col-span-2 bento-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange text-[20px]">history</span>
              <span>My Submitted Grievances ({data.complaints?.length || 0})</span>
            </h2>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-on-surface-variant pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Search grievances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-vibrant-orange"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                statusFilter === 'all'
                  ? 'bg-vibrant-orange text-white font-bold shadow-sm'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('submitted')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                statusFilter === 'submitted'
                  ? 'bg-vibrant-orange text-white font-bold shadow-sm'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant'
              }`}
            >
              Submitted ({counts.submitted})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('under_review')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                statusFilter === 'under_review'
                  ? 'bg-vibrant-orange text-white font-bold shadow-sm'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant'
              }`}
            >
              Under Review ({counts.under_review})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                statusFilter === 'resolved'
                  ? 'bg-vibrant-orange text-white font-bold shadow-sm'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant'
              }`}
            >
              Resolved ({counts.resolved})
            </button>
            {counts.warnings > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('warnings')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
                  statusFilter === 'warnings'
                    ? 'bg-amber-600 text-white font-bold shadow-sm'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">warning</span>
                <span>Warnings ({counts.warnings})</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : data.complaints?.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-xs">
              <span className="material-symbols-outlined text-[36px] mb-2 text-pinoy-green">verified</span>
              <p>No complaints on record. All your interactions are in good standing.</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-xs space-y-2">
              <span className="material-symbols-outlined text-[36px] text-on-surface-variant opacity-60">search_off</span>
              <p>No grievances match your search or filter criteria.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-vibrant-orange font-bold hover:underline inline-block mt-1"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedComplaints.map((c) => (
                  <div key={c.complaint_id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-xs text-on-surface">{c.subject}</h3>
                        <p className="text-[11px] text-on-surface-variant">
                          Against: <span className="font-bold text-on-surface">{c.organization_name}</span> • Category: <span className="font-bold">{c.category_name}</span>
                          {c.student_status && (
                            <> • Status: <span className={`font-bold ${c.student_status === 'ojt' ? 'text-vibrant-orange' : 'text-pinoy-green'}`}>{c.student_status === 'ojt' ? 'OJT Student' : 'Graduated'}</span></>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          c.status === 'resolved' ? 'bg-green-tint text-pinoy-green' :
                          c.status === 'dismissed' ? 'bg-surface-container-high text-on-surface-variant' :
                          'bg-orange-tint text-vibrant-orange animate-pulse'
                        }`}>
                          {c.status.replace(/_/g, ' ')}
                        </span>
                        {c.status === 'submitted' && (
                          <button
                            onClick={() => handleWithdraw(c.complaint_id, c.subject)}
                            className="text-on-surface-variant hover:text-error transition-colors p-1"
                            title="Withdraw Grievance"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant bg-surface-container p-2.5 rounded-lg">{c.description}</p>

                    {/* Institution Warning Note (if issued) */}
                    {c.warning_note_to_student && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-amber-800">
                          <span className="material-symbols-outlined text-[16px]">warning</span>
                          <span className="text-xs font-bold">Official Institution Warning Note</span>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed">{c.warning_note_to_student}</p>
                        {c.warning_sent_at && (
                          <span className="text-[10px] text-amber-700 block">
                            Issued on: {new Date(c.warning_sent_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}

                    <span className="text-[10px] text-on-surface-variant block">Filed on: {new Date(c.filed_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
