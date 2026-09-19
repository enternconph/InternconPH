import React, { useState, useEffect } from 'react';
import api from '../../api/client';

export default function InstRequirements() {
  const [data, setData] = useState({ requirements: [], submissions: [], programs: [], staff_scope: null });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
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
        if (uploadRes.success && uploadRes.url) {
          document_template_url = uploadRes.url;
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
        setMessage('OJT requirement created and published! Affected students have been notified.');
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

  const handleVerifySubmission = async (id, status) => {
    try {
      const res = await api.post(`/inst/requirements/submissions/${id}/verify`, { status });
      if (res.success) {
        setMessage(`Submission marked as ${status}.`);
        fetchRequirements();
      } else {
        alert(res.message || 'Action failed.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to verify submission.');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
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
            ? `Reviewing requirement submissions strictly for students belonging to your assigned degree program.`
            : 'Define mandatory internship requirements (MOA, Medical, Endorsement), attach fillable forms/templates, and review student submissions.'}
        </p>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-pinoy-green hover:opacity-75">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Requirement Form */}
        <div className="bento-card space-y-4 h-fit">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange text-[22px]">note_add</span>
            <span>Create Requirement</span>
          </h2>

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
                Attach a blank form, MOA template, or document that students need to download, complete, and return.
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
                Mandatory for OJT deployment
              </label>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2.5 bg-vibrant-orange text-white font-bold rounded-xl hover:bg-deep-orange transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">publish</span>
              {actionLoading ? 'Publishing...' : 'Publish Requirement'}
            </button>
          </form>
        </div>

        {/* Requirements & Submissions Review */}
        <div className="lg:col-span-2 space-y-6">
          {/* Published Requirements List */}
          <div className="bento-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-outline-variant pb-2">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange text-[20px]">fact_check</span>
                <span>Active Requirements ({data.requirements?.length || 0})</span>
              </h2>
              <span className="text-xs text-on-surface-variant">Visible in Student Clearance</span>
            </div>

            {loading ? (
              <div className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-7 w-7 border-4 border-vibrant-orange border-t-transparent"></div>
              </div>
            ) : data.requirements?.length === 0 ? (
              <div className="text-center py-6 text-on-surface-variant text-xs">
                <p>No requirements currently created. Use the form on the left to add one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.requirements.map((req) => (
                  <div
                    key={req.requirement_id}
                    className="p-3.5 bg-surface-container rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-outline-variant text-xs"
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

                    <div className="flex items-center gap-2 flex-wrap">
                      {req.document_template_url && (
                        <a
                          href={req.document_template_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="px-2.5 py-1.5 bg-surface-container-high text-on-surface hover:text-vibrant-orange rounded-lg border border-outline-variant font-bold text-xs flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">file_download</span>
                          Download Template
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteRequirement(req.requirement_id, req.requirement_name)}
                        className="px-2.5 py-1.5 text-error hover:bg-rose-50 rounded-lg border border-error/20 font-bold text-xs flex items-center gap-1 transition-colors"
                        title="Delete requirement"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submissions Review Bento */}
          <div className="bento-card space-y-4">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange text-[20px]">assignment_late</span>
              <span>Student Submissions For Review ({data.submissions?.length || 0})</span>
            </h2>

            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
              </div>
            ) : data.submissions?.length === 0 ? (
              <div className="text-center py-6 text-on-surface-variant text-xs">
                <p>No document submissions to review.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.submissions.map((sub) => (
                  <div key={sub.id} className="p-3.5 bg-surface-container rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-outline-variant text-xs">
                    <div className="space-y-1">
                      <p className="font-bold text-on-surface">{sub.first_name} {sub.last_name} ({sub.student_number})</p>
                      <p className="text-vibrant-orange font-medium">{sub.requirement_name}</p>
                      <p className="text-[10px] text-on-surface-variant">Submitted: {new Date(sub.submitted_at).toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View Student Submitted File */}
                      {sub.file_url ? (
                        <a
                          href={sub.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-surface-container-high text-on-surface hover:text-vibrant-orange border border-outline-variant rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          View Submitted File
                        </a>
                      ) : (
                        <span className="text-on-surface-variant text-[11px] italic">No file attached</span>
                      )}

                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        sub.status === 'approved' ? 'bg-green-tint text-pinoy-green' :
                        sub.status === 'rejected' ? 'bg-surface-container-high text-error' :
                        'bg-orange-tint text-vibrant-orange'
                      }`}>
                        {sub.status}
                      </span>

                      <button
                        onClick={() => handleVerifySubmission(sub.id, 'approved')}
                        className="px-2.5 py-1 bg-pinoy-green text-white rounded-lg text-xs font-bold hover:opacity-90 shadow-sm flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        Approve
                      </button>
                      <button
                        onClick={() => handleVerifySubmission(sub.id, 'rejected')}
                        className="px-2.5 py-1 bg-error text-white rounded-lg text-xs font-bold hover:opacity-90 shadow-sm flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
