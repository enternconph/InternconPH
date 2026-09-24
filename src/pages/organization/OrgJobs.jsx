import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import PhAddressSelector from '../../components/ui/PhAddressSelector';
import { resolveFileUrl } from '../../utils/fileHelper';

export default function OrgJobs() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showApprovalsModal, setShowApprovalsModal] = useState(null);
  const [showNoMentorWarning, setShowNoMentorWarning] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [programSearch, setProgramSearch] = useState('');
  const [flyerUploading, setFlyerUploading] = useState(false);

  const initialAddress = {
    region: '', regionCode: '',
    province: '', provinceCode: '',
    city: '', cityCode: '',
    barangay: '', barangayCode: '',
    postalCode: '',
    street: ''
  };

  const [address, setAddress] = useState(initialAddress);

  const initialForm = {
    title: '',
    description: '',
    requirements: '',
    deliverables: '',
    posting_type: 'ojt', // 'ojt', 'career_job', 'on_call'
    location: '',
    workplace_area: '',
    flyer_image_url: '',
    work_setup: 'hybrid',
    slots_available: 1,
    mentor_id: '',
    start_time: '08:00',
    finish_time: '17:00',
    on_call_days: 3,
    salary_rate: '',
    salary_rate_type: 'daily',
    target_audience: 'ojt_students',
    institution_ids: [],
    program_ids: []
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, instsRes, progsRes, mentorsRes] = await Promise.all([
        api.get('/org/jobs'),
        api.get('/org/institutions'),
        api.get('/org/programs'),
        api.get('/org/mentors')
      ]);

      if (jobsRes.success && jobsRes.data) setJobs(jobsRes.data);
      if (instsRes.success && instsRes.data) setInstitutions(instsRes.data);
      if (progsRes.success && progsRes.data) setPrograms(progsRes.data);
      if (mentorsRes.success && mentorsRes.data) setMentors(mentorsRes.data);
    } catch (err) {
      console.error('Error fetching org job data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time synchronization
  useRealtimeRefresh(fetchData);

  // Auto-trigger create modal if navigated with ?create=true
  useEffect(() => {
    if (!loading && searchParams.get('create') === 'true') {
      if (!mentors || mentors.length === 0) {
        setShowNoMentorWarning(true);
      } else {
        handleOpenCreate();
      }
    }
  }, [loading, searchParams, mentors]);

  // Compute available institutions dynamically based on selected program_ids
  const availableInstitutions = useMemo(() => {
    if (!formData.program_ids || formData.program_ids.length === 0) return [];

    const selectedProgs = programs.filter(p => formData.program_ids.includes(p.program_id));
    const selectedCodes = new Set(selectedProgs.map(p => p.program_code?.toUpperCase()).filter(Boolean));
    const offeringInstIds = new Set();

    selectedProgs.forEach(p => {
      if (Array.isArray(p.institution_ids)) {
        p.institution_ids.forEach(id => offeringInstIds.add(id));
      }
    });

    return institutions.filter(inst => {
      // 1. Direct ID in program's institution_ids
      if (offeringInstIds.has(inst.institution_id)) return true;

      // 2. Institution has matching program_ids or master_program_ids
      const instPIds = inst.program_ids || [];
      const instMpIds = inst.master_program_ids || [];
      if (formData.program_ids.some(id => instPIds.includes(id) || instMpIds.includes(id))) {
        return true;
      }

      // 3. Institution has matching program code
      const instCodes = (inst.program_codes || []).map(c => c?.toUpperCase());
      return Array.from(selectedCodes).some(code => instCodes.includes(code));
    });
  }, [formData.program_ids, programs, institutions]);

  const handleOpenCreate = () => {
    if (!mentors || mentors.length === 0) {
      setShowNoMentorWarning(true);
      return;
    }
    setEditingJob(null);
    setAddress(initialAddress);
    setFormData({
      ...initialForm,
      mentor_id: mentors.length > 0 ? mentors[0].org_staff_id : '',
      institution_ids: [],
      program_ids: []
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title || '',
      description: job.description || '',
      requirements: job.requirements || '',
      deliverables: job.deliverables || '',
      posting_type: job.posting_type || 'ojt',
      location: job.location || '',
      workplace_area: job.workplace_area || '',
      flyer_image_url: job.flyer_image_url || '',
      work_setup: job.work_setup || 'hybrid',
      slots_available: job.slots_available || 1,
      mentor_id: job.mentor_id || (mentors.length > 0 ? mentors[0].org_staff_id : ''),
      start_time: job.start_time || '08:00',
      finish_time: job.finish_time || '17:00',
      on_call_days: job.on_call_days || 3,
      salary_rate: job.salary_rate || '',
      salary_rate_type: job.salary_rate_type || 'daily',
      target_audience: job.target_audience || 'ojt_students',
      institution_ids: (job.institution_approvals || []).map(a => a.institution_id),
      program_ids: (job.target_programs || []).map(tp => tp.program_id)
    });
    setAddress(initialAddress);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleFlyerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, JPEG, WEBP) for the opportunity flyer.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Flyer image must not exceed 10MB.');
      return;
    }

    setFlyerUploading(true);
    setErrorMsg('');
    try {
      const uploadData = new FormData();
      uploadData.append('flyer', file);
      const res = await api.post('/org/jobs/upload-flyer', uploadData);
      if (res.success && res.url) {
        setFormData(prev => ({ ...prev, flyer_image_url: res.url }));
        setMessage('Flyer poster uploaded successfully!');
      } else {
        setErrorMsg(res.message || 'Failed to upload flyer poster.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error uploading flyer poster.');
    } finally {
      setFlyerUploading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setMessage('');

    if (!formData.program_ids || formData.program_ids.length === 0) {
      setErrorMsg('Target Degree Programs / Courses are required. Please select at least one program first.');
      return;
    }

    if (!formData.institution_ids || formData.institution_ids.length === 0) {
      setErrorMsg('Please select at least one Target Academic Institution for Approval.');
      return;
    }

    setSubmitting(true);

    // Compute Philippine address if address selector was utilized
    const formattedPhAddress = [
      address.street,
      address.barangay,
      address.city,
      address.province && address.province !== 'NCR' ? address.province : '',
      address.region,
      address.postalCode ? `Postal Code ${address.postalCode}` : ''
    ].filter(Boolean).join(', ');

    const finalLocation = formattedPhAddress || formData.location || 'Metro Manila, Philippines';

    const submitData = {
      ...formData,
      location: finalLocation,
      ...(formData.posting_type === 'ojt' ? { salary_rate: '', salary_rate_type: '' } : {})
    };

    try {
      let res;
      if (editingJob) {
        res = await api.put(`/org/jobs/${editingJob.job_id}`, submitData);
      } else {
        res = await api.post('/org/jobs', submitData);
      }

      if (res.success) {
        setMessage(res.message || 'Opportunity saved successfully!');
        setShowModal(false);
        fetchData();
      } else {
        setErrorMsg(res.message || 'Failed to save opportunity.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (jobId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'closed' : 'active';
    const res = await api.put(`/org/jobs/${jobId}/status`, { status: nextStatus });
    if (res.success) {
      setMessage(`Opportunity status set to ${nextStatus}.`);
      fetchData();
    } else {
      alert(res.message || 'Failed to update job status.');
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to permanently delete this opportunity posting?')) return;
    const res = await api.delete(`/org/jobs/${jobId}`);
    if (res.success) {
      setMessage('Opportunity deleted.');
      fetchData();
    } else {
      alert(res.message || 'Failed to delete posting.');
    }
  };

  const toggleProgramSelection = (id) => {
    setFormData(prev => {
      const exists = prev.program_ids.includes(id);
      const nextProgramIds = exists
        ? prev.program_ids.filter(p => p !== id)
        : [...prev.program_ids, id];

      if (nextProgramIds.length === 0) {
        return {
          ...prev,
          program_ids: [],
          institution_ids: []
        };
      }

      // Determine eligible institutions for nextProgramIds
      const selectedProgs = programs.filter(p => nextProgramIds.includes(p.program_id));
      const selectedCodes = new Set(selectedProgs.map(p => p.program_code?.toUpperCase()).filter(Boolean));
      const offeringInstIds = new Set();
      selectedProgs.forEach(p => {
        if (Array.isArray(p.institution_ids)) {
          p.institution_ids.forEach(instId => offeringInstIds.add(instId));
        }
      });

      const eligible = institutions.filter(inst => {
        if (offeringInstIds.has(inst.institution_id)) return true;
        const instPIds = inst.program_ids || [];
        const instMpIds = inst.master_program_ids || [];
        if (nextProgramIds.some(pId => instPIds.includes(pId) || instMpIds.includes(pId))) return true;
        const instCodes = (inst.program_codes || []).map(c => c?.toUpperCase());
        return Array.from(selectedCodes).some(code => instCodes.includes(code));
      });

      const eligibleIds = new Set(eligible.map(i => i.institution_id));
      let nextInstIds = prev.institution_ids.filter(iId => eligibleIds.has(iId));

      // Auto-select newly eligible institutions if adding
      if (!exists) {
        eligible.forEach(inst => {
          if (!nextInstIds.includes(inst.institution_id)) {
            nextInstIds.push(inst.institution_id);
          }
        });
      }

      return {
        ...prev,
        program_ids: nextProgramIds,
        institution_ids: nextInstIds
      };
    });
  };

  const toggleInstitutionSelection = (id) => {
    setFormData(prev => {
      const exists = prev.institution_ids.includes(id);
      return {
        ...prev,
        institution_ids: exists
          ? prev.institution_ids.filter(i => i !== id)
          : [...prev.institution_ids, id]
      };
    });
  };

  const selectAllPrograms = () => {
    const allProgramIds = programs.map(p => p.program_id);
    const eligibleInsts = institutions.filter(inst => {
      const instPIds = inst.program_ids || [];
      const instMpIds = inst.master_program_ids || [];
      return allProgramIds.some(id => instPIds.includes(id) || instMpIds.includes(id)) || (inst.program_codes && inst.program_codes.length > 0);
    });

    setFormData(prev => ({
      ...prev,
      program_ids: allProgramIds,
      institution_ids: eligibleInsts.map(i => i.institution_id)
    }));
  };

  const clearAllPrograms = () => {
    setFormData(prev => ({
      ...prev,
      program_ids: [],
      institution_ids: []
    }));
  };

  const selectAllInstitutions = () => {
    setFormData(prev => ({
      ...prev,
      institution_ids: availableInstitutions.map(i => i.institution_id)
    }));
  };

  const filteredJobs = jobs.filter(j => {
    if (activeTab === 'ojt') return j.posting_type === 'ojt' || j.job_type === 'internship';
    if (activeTab === 'career_job') return j.posting_type === 'career_job' || (j.posting_type !== 'ojt' && j.posting_type !== 'on_call');
    if (activeTab === 'on_call') return j.posting_type === 'on_call';
    return true;
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Manage Opportunities & Job Postings</h1>
          <p className="text-sm text-on-surface-variant">
            Create OJT internships, career openings for graduates, and on-call job offers with institutional approval dispatch.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-vibrant-orange text-white rounded-lg font-bold text-sm hover:bg-deep-orange transition-colors shadow-sm flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>+ Post Opportunity</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {/* Warning Banner when no Workplace Mentor exists */}
      {!loading && mentors.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">supervisor_account</span>
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">
                You don't have a mentor yet. Please add your mentor now.
              </p>
              <p className="text-[11px] text-amber-700">
                A registered Workplace Mentor is required before dispatching opportunities to partner institutions.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/organization/mentors"
            state={{ openGeneratePasscode: true }}
            className="px-4 py-2 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-sm whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">supervisor_account</span>
            <span>Workplace Mentors Module</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'all' ? 'bg-vibrant-orange text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span>All Opportunities</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10">{jobs.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('ojt')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'ojt' ? 'bg-vibrant-orange text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span>OJT Internships</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10">
            {jobs.filter(j => j.posting_type === 'ojt' || j.job_type === 'internship').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('career_job')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'career_job' ? 'bg-vibrant-orange text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span>Career Openings (Graduates)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10">
            {jobs.filter(j => j.posting_type === 'career_job' || (j.posting_type !== 'ojt' && j.posting_type !== 'on_call')).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('on_call')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'on_call' ? 'bg-vibrant-orange text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span>On-Call Offers</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10">
            {jobs.filter(j => j.posting_type === 'on_call').length}
          </span>
        </button>
      </div>

      {/* Main Table Bento */}
      <div className="bento-card space-y-4">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] mb-2">post_add</span>
            <p className="text-base font-bold text-on-surface">No opportunities found in this category.</p>
            <p className="text-xs mt-1">Click the "+ Post Opportunity" button to dispatch a new vacancy.</p>
            <button
              onClick={handleOpenCreate}
              className="mt-3 px-4 py-2 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>+ Post Opportunity</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[850px]">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                  <th className="py-3 px-4">Opportunity & Details</th>
                  <th className="py-3 px-4">Type & Target Audience</th>
                  <th className="py-3 px-4">Mentor / On-Call Specs</th>
                  <th className="py-3 px-4">Institution Approvals</th>
                  <th className="py-3 px-4">Applicants</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filteredJobs.map((job) => {
                  const pType = job.posting_type || 'ojt';
                  const approvals = job.institution_approvals || [];
                  const approvedCount = approvals.filter(a => a.approval_status === 'approved').length;
                  const totalApprovals = approvals.length;

                  return (
                    <tr key={job.job_id} className="hover:bg-surface-container-low transition-colors">
                      {/* Title & Setup */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-3">
                          {job.flyer_image_url && (
                            <img
                              src={resolveFileUrl(job.flyer_image_url)}
                              alt="Flyer thumbnail"
                              className="w-12 h-12 object-cover rounded-lg border border-outline-variant shrink-0"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <p className="font-bold text-on-surface">{job.title}</p>
                            <div className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[14px]">location_on</span>
                                <span>{job.location || 'On-site / Hybrid'}</span>
                              </span>
                              {job.workplace_area && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 font-semibold text-on-surface px-1.5 py-0.5 rounded bg-orange-tint/40 text-vibrant-orange border border-vibrant-orange/20 text-[11px]">
                                    <span className="material-symbols-outlined text-[12px]">meeting_room</span>
                                    <span>Area: {job.workplace_area}</span>
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span className="capitalize">{job.work_setup}</span>
                              <span>•</span>
                              <span>{job.slots_available || 1} slots</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type & Audience */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                          pType === 'ojt'
                            ? 'bg-blue-500/10 text-blue-600'
                            : pType === 'on_call'
                            ? 'bg-amber-500/10 text-amber-700'
                            : 'bg-green-tint text-pinoy-green'
                        }`}>
                          <span className="material-symbols-outlined text-[13px]">
                            {pType === 'ojt' ? 'badge' : pType === 'on_call' ? 'bolt' : 'work'}
                          </span>
                          {pType === 'ojt' ? 'OJT Internship' : pType === 'on_call' ? 'On-Call' : 'Career Job'}
                        </span>
                        <p className="text-[11px] text-on-surface-variant mt-1">
                          {pType === 'ojt'
                            ? 'OJT Undergrads'
                            : pType === 'on_call'
                            ? 'OJT Completers / Alumni'
                            : 'Graduated Alumni Only'}
                        </p>
                      </td>

                      {/* Mentor / On-Call Specs */}
                      <td className="py-3 px-4 text-xs">
                        {pType === 'ojt' ? (
                          job.mentor_first_name ? (
                            <div>
                              <p className="font-bold text-on-surface flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-vibrant-orange">supervisor_account</span>
                                {job.mentor_first_name} {job.mentor_last_name}
                              </p>
                              <p className="text-[11px] text-on-surface-variant">{job.mentor_department || 'Supervisor'}</p>
                              <p className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-1 font-medium bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                <span className="material-symbols-outlined text-[12px] text-vibrant-orange">schedule</span>
                                <span>{job.start_time || '08:00'} - {job.finish_time || '17:00'} (PST)</span>
                              </p>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[11px] text-error font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                No Mentor Assigned
                              </span>
                              <p className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-1 font-medium bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                <span className="material-symbols-outlined text-[12px] text-vibrant-orange">schedule</span>
                                <span>{job.start_time || '08:00'} - {job.finish_time || '17:00'} (PST)</span>
                              </p>
                            </div>
                          )
                        ) : pType === 'on_call' ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-on-surface">
                              ₱{job.salary_rate ? parseFloat(job.salary_rate).toLocaleString() : '0'}{' '}
                              <span className="text-[10px] font-normal text-on-surface-variant">/{job.salary_rate_type || 'day'}</span>
                            </p>
                            <p className="text-[11px] text-on-surface-variant">
                              {job.on_call_days || 1} day(s) on-call • {job.finish_time || 'Flexible'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant">Standard Career Role</span>
                        )}
                      </td>

                      {/* Institution Approvals */}
                      <td className="py-3 px-4">
                        {totalApprovals === 0 ? (
                          <span className="text-xs text-on-surface-variant">Global (All)</span>
                        ) : (
                          <button
                            onClick={() => setShowApprovalsModal(job)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-xs font-bold hover:bg-surface-container-high border border-outline-variant transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px] text-pinoy-green">verified</span>
                            <span>{approvedCount}/{totalApprovals} Approved</span>
                          </button>
                        )}
                      </td>

                      {/* Applicants */}
                      <td className="py-3 px-4 font-bold text-xs text-on-surface">
                        {job.applicant_count || 0} candidate(s)
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                          job.status === 'active' ? 'bg-green-tint text-pinoy-green' : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {job.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(job)}
                            title="Edit opportunity details"
                            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(job.job_id, job.status)}
                            title={job.status === 'active' ? 'Close opening' : 'Reactivate'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              job.status === 'active'
                                ? 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20'
                                : 'bg-green-tint text-pinoy-green hover:bg-green-200'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {job.status === 'active' ? 'pause_circle' : 'play_circle'}
                            </span>
                          </button>

                          <button
                            onClick={() => handleDeleteJob(job.job_id)}
                            title="Delete opening"
                            className="p-1.5 rounded-lg bg-error-container text-error hover:bg-red-200 transition-colors"
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
        )}
      </div>

      {/* INSTITUTION APPROVALS MODAL */}
      {showApprovalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-outline-variant p-6 w-full max-w-md space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-bold text-on-surface">Institutional Approvals Tracker</h3>
                <p className="text-xs text-on-surface-variant">{showApprovalsModal.title}</p>
              </div>
              <button
                onClick={() => setShowApprovalsModal(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              As per Philippine OJT guidelines (Step 4 & 5), opportunities dispatched to academic institutions require coordinator approval before being distributed to student dashboards.
            </p>

            <div className="space-y-2">
              {(showApprovalsModal.institution_approvals || []).map((appr) => (
                <div
                  key={appr.approval_id}
                  className="p-3 bg-slate-50 rounded-xl border border-outline-variant flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-on-surface">{appr.institution_name}</p>
                    <p className="text-[11px] text-on-surface-variant">Code: {appr.institution_code || 'N/A'}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    appr.approval_status === 'approved'
                      ? 'bg-green-tint text-pinoy-green'
                      : appr.approval_status === 'rejected'
                      ? 'bg-error-container text-error'
                      : 'bg-orange-tint text-vibrant-orange'
                  }`}>
                    {appr.approval_status}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowApprovalsModal(null)}
                className="px-4 py-2 bg-slate-100 text-on-surface font-bold text-xs rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT OPPORTUNITY MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-outline-variant p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <div>
                <h3 className="text-lg font-bold text-on-surface">
                  {editingJob ? 'Edit Opportunity Posting' : 'Post New Opportunity'}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Configure OJT Internship, Career Job, or On-Call Offer parameters
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              {/* Opportunity Type Selector */}
              <div>
                <label className="font-bold text-on-surface block mb-1.5">Opportunity Category / Type *</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <label className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-colors ${
                    formData.posting_type === 'ojt'
                      ? 'border-vibrant-orange bg-orange-tint/30 text-vibrant-orange font-bold'
                      : 'border-outline-variant bg-slate-50 text-on-surface'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="posting_type"
                        value="ojt"
                        checked={formData.posting_type === 'ojt'}
                        onChange={() => setFormData({ ...formData, posting_type: 'ojt', target_audience: 'ojt_students', salary_rate: '', salary_rate_type: 'daily' })}
                        className="hidden"
                      />
                      <span className="material-symbols-outlined text-[18px]">badge</span>
                      <span>🎓 OJT Internship</span>
                    </div>
                    <p className="text-[10px] font-normal text-on-surface-variant mt-1">For undergraduate students rendering academic hours</p>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-colors ${
                    formData.posting_type === 'career_job'
                      ? 'border-vibrant-orange bg-orange-tint/30 text-vibrant-orange font-bold'
                      : 'border-outline-variant bg-slate-50 text-on-surface'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="posting_type"
                        value="career_job"
                        checked={formData.posting_type === 'career_job'}
                        onChange={() => setFormData({ ...formData, posting_type: 'career_job', target_audience: 'graduated_students' })}
                        className="hidden"
                      />
                      <span className="material-symbols-outlined text-[18px]">work</span>
                      <span>💼 Career Job</span>
                    </div>
                    <p className="text-[10px] font-normal text-on-surface-variant mt-1">For graduated alumni candidates only</p>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-colors ${
                    formData.posting_type === 'on_call'
                      ? 'border-vibrant-orange bg-orange-tint/30 text-vibrant-orange font-bold'
                      : 'border-outline-variant bg-slate-50 text-on-surface'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="posting_type"
                        value="on_call"
                        checked={formData.posting_type === 'on_call'}
                        onChange={() => setFormData({ ...formData, posting_type: 'on_call', target_audience: 'ojt_completers_or_graduates' })}
                        className="hidden"
                      />
                      <span className="material-symbols-outlined text-[18px]">bolt</span>
                      <span>⚡ On-Call / Part-Time</span>
                    </div>
                    <p className="text-[10px] font-normal text-on-surface-variant mt-1">For past completers or graduate talents on demand</p>
                  </label>
                </div>
              </div>

              {/* Title & Mentor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-on-surface block mb-1">Position / Role Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineering Intern"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white text-on-surface outline-none focus:border-vibrant-orange"
                  />
                </div>

                <div>
                  <label className="font-bold text-on-surface block mb-1">
                    Designated Workplace Mentor {formData.posting_type === 'ojt' ? '*' : '(Optional)'}
                  </label>
                  {mentors.length === 0 ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-amber-900">
                        <span className="material-symbols-outlined text-amber-700 text-[18px]">warning</span>
                        <span>You don't have a mentor yet. Please add your mentor now.</span>
                      </div>
                      <Link
                        to="/dashboard/organization/mentors"
                        state={{ openGeneratePasscode: true }}
                        className="px-2.5 py-1 bg-vibrant-orange text-white rounded font-bold text-[11px] hover:bg-deep-orange transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">supervisor_account</span>
                        <span>Add Mentor</span>
                      </Link>
                    </div>
                  ) : (
                    <select
                      value={formData.mentor_id}
                      required={formData.posting_type === 'ojt'}
                      onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white text-on-surface outline-none focus:border-vibrant-orange"
                    >
                      <option value="">-- Select Assigned Mentor --</option>
                      {mentors.map(m => (
                        <option key={m.org_staff_id} value={m.org_staff_id}>
                          {m.first_name} {m.last_name} ({m.position || 'Mentor'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Work Setup, Slots, Location & Workplace Assignment Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-on-surface block mb-1">Work Setup</label>
                  <select
                    value={formData.work_setup}
                    onChange={(e) => setFormData({ ...formData, work_setup: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white text-on-surface outline-none"
                  >
                    <option value="on-site">🏢 On-Site</option>
                    <option value="remote">🏠 Remote / Work-From-Home</option>
                    <option value="hybrid">🔄 Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-on-surface block mb-1">Available Slots</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.slots_available}
                    onChange={(e) => setFormData({ ...formData, slots_available: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white text-on-surface outline-none"
                  />
                </div>
              </div>

              {/* PHILIPPINE GEOGRAPHIC ADDRESS SELECTOR */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-outline-variant space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                    <span className="material-symbols-outlined text-[16px] text-vibrant-orange">location_on</span>
                    <span>Office Address / City Location (Philippines Standard) *</span>
                  </label>
                  {formData.location && (
                    <span className="text-[10px] text-on-surface-variant font-mono truncate max-w-[280px]" title={formData.location}>
                      Current: {formData.location}
                    </span>
                  )}
                </div>
                <PhAddressSelector
                  value={address}
                  onChange={(field, val) => setAddress(prev => ({ ...prev, [field]: val }))}
                />
              </div>

              {/* Workplace Assignment Area / Station */}
              <div>
                <label className="font-bold text-on-surface block mb-1">
                  Workplace Assignment Area / Station
                </label>
                <input
                  type="text"
                  list="workplace-area-options"
                  placeholder="e.g. Office, Kitchen, Front Desk, Accounting, IT Lab"
                  value={formData.workplace_area}
                  onChange={(e) => setFormData({ ...formData, workplace_area: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white text-on-surface outline-none focus:border-vibrant-orange"
                />
                <datalist id="workplace-area-options">
                  <option value="Office" />
                  <option value="Kitchen" />
                  <option value="Front Desk" />
                  <option value="Customer Service" />
                  <option value="Accounting & Finance" />
                  <option value="IT Room / Tech Lab" />
                  <option value="Operations / Warehouse" />
                  <option value="Food & Beverage / Dining Area" />
                  <option value="Housekeeping / Facilities" />
                  <option value="Sales & Marketing" />
                </datalist>
                <div className="flex items-center gap-1 flex-wrap mt-1">
                  <span className="text-[10px] text-on-surface-variant font-medium">Quick suggestions:</span>
                  {['Office', 'Kitchen', 'Front Desk', 'IT Lab', 'Operations'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFormData({ ...formData, workplace_area: tag })}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium border transition-colors ${
                        formData.workplace_area === tag
                          ? 'bg-orange-tint text-vibrant-orange border-vibrant-orange font-bold'
                          : 'bg-slate-100 text-on-surface-variant border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* DIGITAL OPPORTUNITY FLYER / PROMOTIONAL POSTER */}
              {/* Digital Opportunity Flyer / Promotional Poster */}
              <div className="p-3.5 bg-gradient-to-br from-orange-50/50 to-slate-50 rounded-xl border border-orange-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-vibrant-orange">image</span>
                      <span>Digital Opportunity Flyer / Promotional Poster</span>
                    </label>
                    <p className="text-[10px] text-on-surface-variant">
                      Upload an official promotional flyer or poster (PNG, JPG, WEBP - Max 10MB) for students browsing this opportunity.
                    </p>
                  </div>
                  {formData.flyer_image_url && (
                    <span className="text-[10px] bg-green-tint text-pinoy-green font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      Flyer Uploaded
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Preview Container */}
                  <div className="w-full sm:w-40 h-40 rounded-xl border-2 border-dashed border-outline-variant bg-white flex items-center justify-center overflow-hidden shrink-0 relative group shadow-xs">
                    {formData.flyer_image_url ? (
                      <>
                        <img
                          src={resolveFileUrl(formData.flyer_image_url)}
                          alt="Opportunity Flyer"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, flyer_image_url: '' }))}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove flyer image"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-3 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[32px] text-slate-300">add_photo_alternate</span>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">No Flyer Selected</p>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <label className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-vibrant-orange/40 bg-orange-50/40 hover:bg-orange-50 cursor-pointer font-bold text-xs text-vibrant-orange transition-all w-full sm:w-auto shadow-xs ${
                      flyerUploading ? 'opacity-50 pointer-events-none' : ''
                    }`}>
                      <span className="material-symbols-outlined text-[20px] text-vibrant-orange">
                        {flyerUploading ? 'sync' : 'cloud_upload'}
                      </span>
                      <span className={flyerUploading ? 'animate-pulse' : ''}>
                        {flyerUploading ? 'Uploading Image...' : formData.flyer_image_url ? 'Replace Flyer Image' : 'Select & Upload Image File'}
                      </span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleFlyerUpload}
                        disabled={flyerUploading}
                        className="hidden"
                      />
                    </label>

                    <div className="text-[11px] text-on-surface-variant space-y-0.5">
                      <p className="font-medium text-slate-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-pinoy-green">verified</span>
                        Accepted Formats: PNG, JPG, JPEG, WEBP
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Recommended size: 1200x630 or square 1080x1080. Max file size: 10MB.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Schedule Inputs based on Posting Type */}
              {formData.posting_type === 'ojt' && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-outline-variant space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-vibrant-orange flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      <span>Standard Daily Work Schedule (Philippine Time - UTC+8)</span>
                    </span>
                    <span className="text-[10px] bg-orange-tint text-vibrant-orange font-semibold px-2 py-0.5 rounded-full">
                      PST Clock Target
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
                        Standard Daily Time-In / Start Time <span className="text-error">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.start_time || '08:00'}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-white text-on-surface outline-none focus:border-vibrant-orange font-mono text-xs"
                        required
                      />
                      <p className="text-[10px] text-on-surface-variant mt-0.5">
                        Students clocking in after this will be marked <span className="font-semibold text-amber-700">Late</span>.
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
                        Standard Daily Time-Out / Finish Time <span className="text-error">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.finish_time || '17:00'}
                        onChange={(e) => setFormData({ ...formData, finish_time: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-white text-on-surface outline-none focus:border-vibrant-orange font-mono text-xs"
                        required
                      />
                      <p className="text-[10px] text-on-surface-variant mt-0.5">
                        Clock-out before is <span className="font-semibold text-amber-700">Early</span>. Overtime is capped & not credited.
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-2 bg-blue-50/70 border border-blue-200/60 rounded-lg flex items-start gap-2 text-[11px] text-blue-900">
                    <span className="material-symbols-outlined text-[16px] text-blue-600 mt-0.5 shrink-0">info</span>
                    <span>
                      <strong>Automated Attendance Policy:</strong> Intern clock-ins/outs are strictly timed via Philippine Standard Time (PST). If an intern works overtime beyond the standard finish time, the additional overtime will not be credited to OJT required hours.
                    </span>
                  </div>
                </div>
              )}

              {formData.posting_type === 'on_call' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-outline-variant space-y-2">
                  <span className="text-xs font-bold text-vibrant-orange flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">bolt</span>
                    <span>On-Call Assignment Parameters</span>
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-on-surface-variant block mb-1">Maximum Notice / Call-in Days</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={formData.on_call_days}
                        onChange={(e) => setFormData({ ...formData, on_call_days: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-white text-on-surface outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-on-surface-variant block mb-1">Engagement Pay / Honorarium</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Rate"
                          value={formData.salary_rate}
                          onChange={(e) => setFormData({ ...formData, salary_rate: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-white text-on-surface outline-none"
                        />
                        <select
                          value={formData.salary_rate_type}
                          onChange={(e) => setFormData({ ...formData, salary_rate_type: e.target.value })}
                          className="px-2 py-1.5 rounded-lg border border-outline-variant bg-white text-on-surface outline-none text-xs"
                        >
                          <option value="hourly">/ Hour</option>
                          <option value="project">/ Project</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {formData.posting_type === 'career_job' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-outline-variant space-y-2">
                  <span className="text-xs font-bold text-vibrant-orange flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    <span>Career Compensation</span>
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-on-surface-variant block mb-1">Salary Offer Amount (PHP)</label>
                      <input
                        type="number"
                        placeholder="e.g. 28000"
                        value={formData.salary_rate}
                        onChange={(e) => setFormData({ ...formData, salary_rate: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-white text-on-surface outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-on-surface-variant block mb-1">Pay Period Frequency</label>
                      <select
                        value={formData.salary_rate_type}
                        onChange={(e) => setFormData({ ...formData, salary_rate_type: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-white text-on-surface outline-none text-xs"
                      >
                        <option value="monthly">Monthly Salary</option>
                        <option value="yearly">Annual Package</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="font-bold text-on-surface block mb-1">Opportunity Description *</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Overview of duties, core projects, day-to-day role expectations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white text-on-surface outline-none resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface block mb-1">Qualifications / Requirements</label>
                <textarea
                  rows="2"
                  placeholder="Required skills, prerequisite courses, GPA, or portfolio proficiencies..."
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white text-on-surface outline-none resize-none"
                />
              </div>

              {/* STEP 1: TARGET ACADEMIC PROGRAMS (MANDATORY & FIRST) */}
              <div className="p-4 bg-white rounded-xl border-2 border-vibrant-orange/40 shadow-sm space-y-2">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <label className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[18px] text-vibrant-orange">school</span>
                      <span>Target Degree Programs / Courses *</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-tint text-vibrant-orange">
                        Required First
                      </span>
                    </label>
                    <p className="text-[11px] text-on-surface-variant">
                      Select target degree courses first. Partner academic institutions will automatically filter based on your selection.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllPrograms}
                      className="text-[11px] font-bold text-vibrant-orange hover:underline"
                    >
                      Select All ({programs.length})
                    </button>
                    {formData.program_ids.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllPrograms}
                        className="text-[11px] font-bold text-on-surface-variant hover:underline"
                      >
                        Clear ({formData.program_ids.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Search / Filter */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant pointer-events-none">search</span>
                  <input
                    type="text"
                    placeholder="Search degree programs by name or code…"
                    value={programSearch}
                    onChange={(e) => setProgramSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-outline-variant bg-white text-xs text-on-surface outline-none focus:ring-2 focus:ring-vibrant-orange/40 focus:border-vibrant-orange transition-colors"
                  />
                  {programSearch && (
                    <button
                      type="button"
                      onClick={() => setProgramSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-outline-variant">
                  {programs
                    .filter((prog) => {
                      if (!programSearch.trim()) return true;
                      const q = programSearch.trim().toLowerCase();
                      return (
                        prog.program_name.toLowerCase().includes(q) ||
                        (prog.program_code && prog.program_code.toLowerCase().includes(q))
                      );
                    })
                    .map((prog) => {
                    const isChecked = formData.program_ids.includes(prog.program_id);
                    return (
                      <label
                        key={prog.program_id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs border ${
                          isChecked
                            ? 'bg-orange-tint/40 border-vibrant-orange font-bold text-on-surface shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-100 text-on-surface-variant'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProgramSelection(prog.program_id)}
                            className="rounded text-vibrant-orange focus:ring-vibrant-orange"
                          />
                          <span className="truncate">{prog.program_name}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-200 font-bold text-on-surface ml-2 shrink-0">
                          {prog.program_code}
                        </span>
                      </label>
                    );
                  })}
                  {programs.length > 0 && programSearch.trim() && programs.filter((p) => {
                    const q = programSearch.trim().toLowerCase();
                    return p.program_name.toLowerCase().includes(q) || (p.program_code && p.program_code.toLowerCase().includes(q));
                  }).length === 0 && (
                    <div className="col-span-2 text-center py-4 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-lg text-slate-400 block mb-1">search_off</span>
                      No programs matching "{programSearch}"
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: TARGET INSTITUTIONS DISPATCH (FILTERED BY SELECTED PROGRAMS) */}
              <div className="p-4 bg-white rounded-xl border border-outline-variant shadow-sm space-y-2">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <label className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[18px] text-pinoy-green">apartment</span>
                      <span>Target Academic Institutions for Approval *</span>
                    </label>
                    <p className="text-[11px] text-on-surface-variant">
                      Only universities offering your selected degree courses are displayed and selectable.
                    </p>
                  </div>
                  {availableInstitutions.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllInstitutions}
                      className="text-[11px] font-bold text-vibrant-orange hover:underline"
                    >
                      Select All Eligible ({availableInstitutions.length})
                    </button>
                  )}
                </div>

                {formData.program_ids.length === 0 ? (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-600 text-2xl">info</span>
                    <div className="text-xs">
                      <p className="font-bold">No Degree Programs Selected</p>
                      <p className="text-[11px] text-amber-800">
                        Please select at least one Target Degree Program / Course above. Target institutions offering that course will then be available here.
                      </p>
                    </div>
                  </div>
                ) : availableInstitutions.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-100 border border-slate-200 text-on-surface-variant flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-500 text-2xl">search_off</span>
                    <div className="text-xs">
                      <p className="font-bold">No Partner Institutions Found</p>
                      <p className="text-[11px]">
                        None of the registered active institutions currently offer the selected degree program(s).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-outline-variant">
                    {availableInstitutions.map((inst) => {
                      const isChecked = formData.institution_ids.includes(inst.institution_id);
                      return (
                        <label
                          key={inst.institution_id}
                          className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors text-xs border ${
                            isChecked
                              ? 'bg-orange-tint/40 border-vibrant-orange font-bold text-on-surface shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-on-surface-variant'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleInstitutionSelection(inst.institution_id)}
                            className="rounded text-vibrant-orange focus:ring-vibrant-orange"
                          />
                          <div className="min-w-0">
                            <span className="truncate block font-medium">{inst.institution_name}</span>
                            <span className="text-[10px] text-on-surface-variant block">
                              {inst.institution_code ? `[${inst.institution_code}] ` : ''}
                              {inst.city ? `${inst.city}, ${inst.province || ''}` : ''}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-on-surface rounded-lg font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {submitting && <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>}
                  <span>{editingJob ? 'Save Changes' : 'Dispatch Opportunity'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NO WORKPLACE MENTOR WARNING MODAL */}
      {showNoMentorWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-surface rounded-2xl border border-outline-variant p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl relative max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Workplace Mentor Required</h3>
                  <p className="text-[11px] text-on-surface-variant">Host Training Establishment Requirement</p>
                </div>
              </div>
              <button
                onClick={() => setShowNoMentorWarning(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 text-xs">
                <p className="font-bold text-amber-900 text-sm mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-700 text-[18px]">error</span>
                  You don't have a mentor yet. Please add your mentor now.
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Before you can post an opportunity, you must add and designate a Workplace Mentor for your organization. Mentors are responsible for overseeing student interns, recording daily attendance, and submitting required evaluations.
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant text-xs space-y-1.5">
                <p className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-vibrant-orange text-[16px]">location_on</span>
                  Where to add your mentor:
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  Go to the <strong className="text-on-surface font-semibold">Workplace Mentors</strong> module in your navigation bar to generate an invitation passcode for your mentor.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowNoMentorWarning(false)}
                className="w-full sm:w-1/3 py-2.5 bg-slate-100 text-on-surface font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNoMentorWarning(false);
                  navigate('/dashboard/organization/mentors', { state: { openGeneratePasscode: true } });
                }}
                className="w-full sm:w-2/3 py-2.5 bg-vibrant-orange hover:bg-deep-orange text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 order-1 sm:order-2"
              >
                <span className="material-symbols-outlined text-[18px]">supervisor_account</span>
                <span>Workplace Mentors</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
