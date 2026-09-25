import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { useTimeFormat } from '../../contexts/TimeContext';
import Pagination from '../../components/ui/Pagination';

export const DEFAULT_STUDENT_VIOLATION_CATEGORIES = [
  {
    category_id: 1,
    category_name: 'Workplace Harassment & Sexual Harassment',
    description: 'Unwelcome conduct, sexual harassment, inappropriate sexualized remarks, or hostile advances in the workplace.',
    group: 'Workplace Safety & Conduct'
  },
  {
    category_id: 2,
    category_name: 'Safety & Substandard Working Conditions',
    description: 'Substandard occupational health and safety, lack of mandatory PPE, hazardous exposure, or unsanitary environment.',
    group: 'Workplace Safety & Conduct'
  },
  {
    category_id: 6,
    category_name: 'Verbal Abuse, Bullying & Intimidation',
    description: 'Hostile work environment, insults, public humiliation, or psychological intimidation by mentors or colleagues.',
    group: 'Workplace Safety & Conduct'
  },
  {
    category_id: 3,
    category_name: 'Excessive Hours & Schedule Exploitation',
    description: 'Hours exceeding CHED (maximum 8 hrs/day, 40 hrs/week) or DOLE labor guidelines, or forced graveyard shifts.',
    group: 'Labor Standards & Scheduling'
  },
  {
    category_id: 4,
    category_name: 'Allowance / Stipend Non-Payment & Delays',
    description: 'Delayed, reduced, or completely unpaid agreed student allowance, meal or transportation stipend.',
    group: 'Compensation & Allowances'
  },
  {
    category_id: 5,
    category_name: 'Task Misalignment / Training Plan Violation',
    description: 'Assigned duties outside the agreed MOA Training Plan or menial tasks irrelevant to the academic curriculum.',
    group: 'Academic & Training Alignment'
  },
  {
    category_id: 7,
    category_name: 'Breach of MOA / Internship Agreement',
    description: 'Failure to provide designated workplace mentor, required equipment, or non-compliance with institutional MOA.',
    group: 'Academic & Training Alignment'
  },
  {
    category_id: 8,
    category_name: 'Discrimination & Unfair Workplace Treatment',
    description: 'Bias, discrimination, or exclusion based on gender, SOGIE, religion, ethnicity, socio-economic status, or disability.',
    group: 'Fairness & Civil Rights'
  },
  {
    category_id: 9,
    category_name: 'Unfair Evaluation / Retaliatory Grading',
    description: 'Retaliatory, punitive, or biased performance evaluation due to personal disagreements or reporting grievances.',
    group: 'Academic & Training Alignment'
  },
  {
    category_id: 10,
    category_name: 'Unethical Demands / Coercion',
    description: 'Pressure to perform personal errands, illegal tasks, unauthorized signature forging, or falsifying documents.',
    group: 'Ethics & Compliance'
  },
  {
    category_id: 11,
    category_name: 'Other Workplace Grievance',
    description: 'General workplace grievances, administrative conflicts, or concerns not listed above.',
    group: 'General Grievances'
  }
];

export default function StudentComplaints() {
  const [data, setData] = useState({
    complaints: [],
    categories: DEFAULT_STUDENT_VIOLATION_CATEGORIES,
    orgs: [],
    assigned_organization: null,
    can_file: true
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const [catId, setCatId] = useState('');
  const [studentStatus, setStudentStatus] = useState('ongoing_ojt');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');

  // Search, filter, and pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const fetchComplaints = useCallback(async () => {
    try {
      const [res, ojtRes] = await Promise.all([
        api.get('/student/complaints'),
        api.get('/student/ojt').catch(() => ({ success: false }))
      ]);

      if (res.success && res.data) {
        const incomingCategories = (res.data.categories && res.data.categories.length > 0)
          ? res.data.categories
          : DEFAULT_STUDENT_VIOLATION_CATEGORIES;

        // Resolve active OJT record directly from ojt API if not already in complaints response
        const ojtActiveRecord = ojtRes.success && ojtRes.data?.records
          ? (ojtRes.data.records.find((r) => r.status === 'ongoing' || r.status === 'active' || r.status === 'in_progress') || ojtRes.data.records[0])
          : null;

        const resolvedOjtPlacement = res.data.active_ojt_placement || res.data.assigned_organization || (ojtActiveRecord ? {
          organization_id: ojtActiveRecord.organization_id,
          organization_name: ojtActiveRecord.organization_name,
          industry: ojtActiveRecord.industry
        } : null);

        // Merge OJT host into organizations list if not already present
        let updatedOrgs = res.data.orgs || [];
        if (resolvedOjtPlacement?.organization_id) {
          const exists = updatedOrgs.some((o) => String(o.organization_id) === String(resolvedOjtPlacement.organization_id));
          if (!exists) {
            updatedOrgs = [
              {
                organization_id: resolvedOjtPlacement.organization_id,
                organization_name: resolvedOjtPlacement.organization_name,
                industry: resolvedOjtPlacement.industry,
                is_my_employer: 1
              },
              ...updatedOrgs
            ];
          }
        }

        setData({
          ...res.data,
          categories: incomingCategories,
          orgs: updatedOrgs,
          active_ojt_placement: resolvedOjtPlacement,
          assigned_organization: resolvedOjtPlacement
        });

        if (res.data.default_student_status) {
          setStudentStatus((prev) => prev || res.data.default_student_status);
        }

        // Automatically pre-select the active OJT Host organization
        if (resolvedOjtPlacement?.organization_id) {
          setSelectedOrgId(String(resolvedOjtPlacement.organization_id));
        } else if (updatedOrgs.length > 0) {
          const myOrg = updatedOrgs.find((o) => o.is_my_employer) || updatedOrgs[0];
          setSelectedOrgId(String(myOrg.organization_id));
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

  const activeOjtOrg = data.active_ojt_placement || data.assigned_organization;

  // Auto-sync selected target org when student status is ongoing_ojt
  useEffect(() => {
    if ((studentStatus === 'ongoing_ojt' || studentStatus === 'ojt') && activeOjtOrg?.organization_id && !selectedOrgId) {
      setSelectedOrgId(String(activeOjtOrg.organization_id));
    }
  }, [studentStatus, activeOjtOrg, selectedOrgId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const targetOrgId = selectedOrgId || activeOjtOrg?.organization_id;

    if (!targetOrgId) {
      alert('Please select the target hiring organization you are filing against.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const res = await api.post('/student/complaints', {
        category_id: catId,
        student_status: studentStatus,
        organization_id: targetOrgId,
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
        {/* Form to submit complaint */}
        <div className="bento-card space-y-4 lg:sticky lg:top-6 h-fit">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[22px]">gavel</span>
            <span>File a Formal Grievance</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Student Status Selector (3 Clear Categories) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-on-surface-variant uppercase text-xs">My Current Status *</label>
                <span className="text-[11px] text-on-surface-variant">Select your role</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Current OJT */}
                <button
                  type="button"
                  onClick={() => {
                    setStudentStatus('ongoing_ojt');
                    if (data.active_ojt_placement?.organization_id) {
                      setSelectedOrgId(String(data.active_ojt_placement.organization_id));
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    studentStatus === 'ongoing_ojt' || studentStatus === 'ojt'
                      ? 'border-vibrant-orange bg-orange-tint text-vibrant-orange font-bold ring-2 ring-vibrant-orange/40 shadow-xs'
                      : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    studentStatus === 'ongoing_ojt' || studentStatus === 'ojt'
                      ? 'bg-vibrant-orange text-white'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    <span className="material-symbols-outlined text-[17px]">school</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Current OJT</p>
                    <p className="text-[10px] opacity-75 truncate">Active Practicum</p>
                  </div>
                </button>

                {/* 2. On-Call / Part-Time */}
                <button
                  type="button"
                  onClick={() => {
                    setStudentStatus('on_call');
                    if (data.active_career_placement?.organization_id) {
                      setSelectedOrgId(String(data.active_career_placement.organization_id));
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    studentStatus === 'on_call'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold ring-2 ring-purple-500/40 shadow-xs'
                      : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    studentStatus === 'on_call'
                      ? 'bg-purple-600 text-white'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    <span className="material-symbols-outlined text-[17px]">bolt</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">On-Call / Part-Time</p>
                    <p className="text-[10px] opacity-75 truncate">Freelance / Gig</p>
                  </div>
                </button>

                {/* 3. Career Job */}
                <button
                  type="button"
                  onClick={() => {
                    setStudentStatus('career_job');
                    if (data.active_career_placement?.organization_id) {
                      setSelectedOrgId(String(data.active_career_placement.organization_id));
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    studentStatus === 'career_job' || studentStatus === 'graduated'
                      ? 'border-pinoy-green bg-green-tint text-pinoy-green font-bold ring-2 ring-pinoy-green/40 shadow-xs'
                      : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    studentStatus === 'career_job' || studentStatus === 'graduated'
                      ? 'bg-pinoy-green text-white'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    <span className="material-symbols-outlined text-[17px]">work</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Career Job</p>
                    <p className="text-[10px] opacity-75 truncate">Hired / Graduate</p>
                  </div>
                </button>
              </div>

              {/* Dynamic Jurisdiction Routing Notice */}
              <div className="mt-2.5">
                {studentStatus === 'ongoing_ojt' || studentStatus === 'ojt' ? (
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2 text-xs">
                    <span className="material-symbols-outlined text-blue-600 text-[18px] shrink-0 mt-0.5">account_balance</span>
                    <div className="text-[11px] text-on-surface leading-tight space-y-0.5">
                      <p className="font-bold text-blue-800 dark:text-blue-300">OJT Academic & Training Routing</p>
                      <p className="text-on-surface-variant">
                        This grievance will be submitted directly to your <strong>Institution OJT Coordinator & Dean</strong>, and forwarded to Host Company HR.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-start gap-2 text-xs">
                    <span className="material-symbols-outlined text-purple-600 text-[18px] shrink-0 mt-0.5">admin_panel_settings</span>
                    <div className="text-[11px] text-on-surface leading-tight space-y-0.5">
                      <p className="font-bold text-purple-800 dark:text-purple-300">Direct System Admin & Labor Review (School Bypassed)</p>
                      <p className="text-on-surface-variant">
                        Non-OJT employment grievances are routed directly to the <strong>System Administrator & Labor Compliance</strong> team.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Target Organization Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-on-surface-variant uppercase text-xs">Target Host / Hiring Organization *</label>
                {activeOjtOrg?.organization_id && (studentStatus === 'ongoing_ojt' || studentStatus === 'ojt') && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Default: Current OJT Host
                  </span>
                )}
              </div>

              {/* If Current OJT Host exists, show quick-select badge card */}
              {activeOjtOrg?.organization_id && (
                <div
                  onClick={() => setSelectedOrgId(String(activeOjtOrg.organization_id))}
                  className={`mb-2 p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    selectedOrgId === String(activeOjtOrg.organization_id)
                      ? 'bg-orange-tint/40 border-vibrant-orange ring-1 ring-vibrant-orange/50 shadow-xs'
                      : 'bg-surface-container-low border-outline-variant hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-vibrant-orange/10 text-vibrant-orange flex items-center justify-center font-bold text-xs shrink-0">
                      <span className="material-symbols-outlined text-[18px]">apartment</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-xs text-on-surface truncate">{activeOjtOrg.organization_name}</p>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-vibrant-orange text-white">
                          Current OJT Host
                        </span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant truncate">
                        {activeOjtOrg.industry || 'Host Employer'} • Active Training Placement
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {selectedOrgId === String(activeOjtOrg.organization_id) ? (
                      <span className="material-symbols-outlined text-vibrant-orange text-[20px]">check_circle</span>
                    ) : (
                      <span className="text-[10px] font-bold text-on-surface-variant px-2 py-0.5 bg-surface-container rounded-md">
                        Use Host
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Complete Organization Dropdown */}
              <select
                required
                value={selectedOrgId || (activeOjtOrg?.organization_id ? String(activeOjtOrg.organization_id) : '')}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-medium outline-none focus:ring-2 focus:ring-vibrant-orange text-xs"
              >
                {!activeOjtOrg?.organization_id && !selectedOrgId && (
                  <option value="">Select target employer / host organization...</option>
                )}
                {(() => {
                  const orgList = data.orgs || [];
                  const myEmps = orgList.filter((o) => o.is_my_employer || String(o.organization_id) === String(activeOjtOrg?.organization_id));
                  const otherOrgs = orgList.filter((o) => !o.is_my_employer && String(o.organization_id) !== String(activeOjtOrg?.organization_id));

                  return (
                    <>
                      {myEmps.length > 0 && (
                        <optgroup label="⭐ My Current & Associated Organizations" className="font-bold text-on-surface bg-surface">
                          {myEmps.map((org) => (
                            <option key={org.organization_id} value={org.organization_id} className="font-normal py-1">
                              {org.organization_name} {String(org.organization_id) === String(activeOjtOrg?.organization_id) ? '(Active OJT Host)' : '(Associated Employer)'} {org.industry ? `— ${org.industry}` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherOrgs.length > 0 && (
                        <optgroup label="🏢 All Registered Hiring Organizations & Companies" className="font-bold text-on-surface bg-surface">
                          {otherOrgs.map((org) => (
                            <option key={org.organization_id} value={org.organization_id} className="font-normal py-1">
                              {org.organization_name} {org.industry ? `— ${org.industry}` : ''} {org.city ? `(${org.city})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  );
                })()}
              </select>

              <p className="text-[10px] text-on-surface-variant mt-1.5">
                Select the specific company or employer where the infraction occurred.
              </p>
            </div>

            {/* Violation Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-on-surface-variant uppercase text-xs">Violation Category *</label>
                <span className="text-[11px] text-vibrant-orange font-semibold">Select specific infraction</span>
              </div>
              <select
                required
                value={catId}
                onChange={(e) => setCatId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-medium outline-none focus:ring-2 focus:ring-vibrant-orange text-sm"
              >
                <option value="">Select violation category...</option>
                {(() => {
                  const cats = (data.categories && data.categories.length > 0)
                    ? data.categories
                    : DEFAULT_STUDENT_VIOLATION_CATEGORIES;

                  // Group categories
                  const groups = {};
                  cats.forEach((c) => {
                    const grp = c.group || 'Workplace & Training Infractions';
                    if (!groups[grp]) groups[grp] = [];
                    groups[grp].push(c);
                  });

                  return Object.entries(groups).map(([groupName, items]) => (
                    <optgroup key={groupName} label={groupName} className="font-bold text-on-surface bg-surface">
                      {items.map((c) => (
                        <option key={c.category_id} value={c.category_id} className="font-normal py-1">
                          {c.category_name}
                        </option>
                      ))}
                    </optgroup>
                  ));
                })()}
              </select>

              {/* Dynamic Violation Category Definition Callout */}
              {(() => {
                const cats = (data.categories && data.categories.length > 0)
                  ? data.categories
                  : DEFAULT_STUDENT_VIOLATION_CATEGORIES;
                const activeCat = cats.find((c) => String(c.category_id) === String(catId));
                if (!activeCat || !activeCat.description) return null;
                return (
                  <div className="mt-2 p-2.5 rounded-lg bg-orange-tint/40 dark:bg-orange-950/20 border border-vibrant-orange/30 flex items-start gap-2.5 text-xs text-on-surface">
                    <span className="material-symbols-outlined text-[18px] text-vibrant-orange shrink-0 mt-0.5">verified_user</span>
                    <div>
                      <span className="font-bold text-vibrant-orange block">{activeCat.category_name}</span>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">{activeCat.description}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Routing Notice Banner */}
            {studentStatus === 'ongoing_ojt' ? (
              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-1 text-blue-950 dark:text-blue-100">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="material-symbols-outlined text-[17px] text-blue-600 dark:text-blue-400">school</span>
                  <span>Academic Institution Review</span>
                </div>
                <p className="text-[11px] text-blue-900/85 dark:text-blue-200 leading-relaxed">
                  As a Current OJT student, your grievance is submitted directly to your Institution OJT Coordinator and Dean for formal review and workplace mediation.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 rounded-xl space-y-1 text-purple-950 dark:text-purple-100">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400">admin_panel_settings</span>
                  <span>Direct System Administrator Escrow (Institution Bypassed)</span>
                </div>
                <p className="text-[11px] text-purple-900/85 dark:text-purple-200 leading-relaxed">
                  For {studentStatus === 'on_call' ? 'On-Call / Part-Time' : studentStatus === 'career_job' ? 'Career Job' : 'OJT Completer'} engagements, the complaint <strong>will no longer go to the institution</strong> — it is directed straight to the <strong>System Administrator</strong> for platform investigation and workplace compliance.
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
                            <> • Status: <span className={`font-bold ${
                              c.student_status === 'ongoing_ojt' || c.student_status === 'ojt'
                                ? 'text-vibrant-orange'
                                : c.student_status === 'ojt_completer'
                                ? 'text-blue-600 dark:text-blue-400'
                                : c.student_status === 'on_call'
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-pinoy-green'
                            }`}>
                              {c.student_status === 'ongoing_ojt' || c.student_status === 'ojt'
                                ? 'Ongoing OJT'
                                : c.student_status === 'ojt_completer'
                                ? 'OJT Completer'
                                : c.student_status === 'on_call'
                                ? 'On-Call'
                                : 'Graduated / Career'}
                            </span></>
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
                            Issued on: {formatDateTime(c.warning_sent_at)}
                          </span>
                        )}
                      </div>
                    )}

                    <span className="text-[10px] text-on-surface-variant block">Filed on: {formatDateTime(c.filed_at)}</span>
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
