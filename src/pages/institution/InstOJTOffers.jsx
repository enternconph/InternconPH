import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { resolveFileUrl, formatAddress } from '../../utils/fileHelper';

export default function InstOJTOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedOffer, setSelectedOffer] = useState(null); // Full opportunity inspect modal
  const [flyerLightbox, setFlyerLightbox] = useState(null);

  const fetchOffers = useCallback(async () => {
    try {
      const res = await api.get('/inst/ojt-offers');
      if (res.success && res.data) {
        setOffers(res.data);
      }
    } catch (err) {
      console.error('Fetch offers error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Live real-time sync
  useRealtimeRefresh(fetchOffers);

  const handleAction = async (approvalId, action) => {
    setMessage('');
    const res = await api.put(`/inst/ojt-offers/${approvalId}`, {
      approval_status: action
    });
    if (res.success) {
      setMessage(`Opportunity ${action === 'approved' ? 'approved & published to students' : 'rejected'} successfully!`);
      setSelectedOffer(null);
      fetchOffers();
    } else {
      alert(res.message || 'Failed to update opportunity.');
    }
  };

  const filteredOffers = offers.filter(o => {
    if (filter === 'all') return true;
    return o.approval_status === filter;
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Dispatched OJT & Career Opportunities</h1>
          <p className="text-sm text-on-surface-variant">
            Review, inspect, and approve pre-screened OJT internship and career job offers submitted by hiring organizations.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                filter === f
                  ? 'bg-vibrant-orange text-white shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span>{f}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                {f === 'all' ? offers.length : offers.filter(o => o.approval_status === f).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Toast Message */}
      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2 border border-pinoy-green/20 animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {/* Opportunity Grid */}
      <div className="bento-card space-y-4">
        <h2 className="text-lg font-bold text-on-surface">
          Incoming Dispatched Opportunities ({filteredOffers.length})
        </h2>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] mb-2">work_outline</span>
            <p className="text-base font-bold text-on-surface">No {filter !== 'all' ? filter : ''} Opportunities</p>
            <p className="text-xs mt-1">Dispatched job opportunities from partner employers will appear here for review.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredOffers.map((offer) => {
              const pType = offer.posting_type || 'ojt';
              const isOjt = pType === 'ojt';
              const isOnCall = pType === 'on_call';

              return (
                <div
                  key={offer.approval_id}
                  className="bg-surface-container-low rounded-xl p-5 border border-outline-variant space-y-3 hover:border-vibrant-orange/40 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Top Badges */}
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isOnCall
                          ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                          : isOjt
                          ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                          : 'bg-green-tint text-pinoy-green border border-pinoy-green/20'
                      }`}>
                        <span className="material-symbols-outlined text-[13px]">
                          {isOnCall ? 'bolt' : isOjt ? 'badge' : 'work'}
                        </span>
                        {isOnCall ? 'On-Call Opportunity' : isOjt ? 'OJT Internship' : 'Career Job Opening'}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        offer.approval_status === 'approved'
                          ? 'bg-green-tint text-pinoy-green'
                          : offer.approval_status === 'rejected'
                          ? 'bg-error-container text-error'
                          : 'bg-orange-tint text-vibrant-orange'
                      }`}>
                        {offer.approval_status || 'pending'}
                      </span>
                    </div>

                    {/* Title & Organization */}
                    <div>
                      <h3 className="font-bold text-base text-on-surface">{offer.title}</h3>
                      <p className="text-xs font-bold text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">business</span>
                        <span>{offer.organization_name}</span>
                        {offer.industry && <span>• {offer.industry}</span>}
                      </p>
                    </div>

                    {/* Flyer banner thumbnail if present */}
                    {offer.flyer_image_url && (
                      <div className="w-full h-32 rounded-lg overflow-hidden bg-surface-container border border-outline-variant relative group">
                        <img
                          src={resolveFileUrl(offer.flyer_image_url)}
                          alt={`${offer.title} flyer`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}

                    {/* On-Call or Mentor Specifics */}
                    {isOnCall && (
                      <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20 text-xs text-amber-900 space-y-0.5">
                        <div className="flex justify-between font-bold">
                          <span>₱{parseFloat(offer.salary_rate || 0).toLocaleString()} / {offer.salary_rate_type || 'day'}</span>
                          <span>{offer.on_call_days || 1} Day(s) On-Call</span>
                        </div>
                        <p className="text-[11px] opacity-90">Deadline: {offer.finish_time || 'Immediate'}</p>
                      </div>
                    )}

                    {isOjt && offer.mentor_first_name && (
                      <div className="p-2.5 bg-orange-tint/30 rounded-lg border border-vibrant-orange/20 text-xs space-y-0.5">
                        <span className="text-[10px] font-bold text-vibrant-orange uppercase block">Assigned Workplace Mentor</span>
                        <p className="font-bold text-on-surface">{offer.mentor_first_name} {offer.mentor_last_name} ({offer.mentor_job_title || 'Mentor'})</p>
                        <p className="text-[11px] text-on-surface-variant">Dept: {offer.mentor_department || 'General'} • Phone: {offer.mentor_contact || 'N/A'}</p>
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-xs text-on-surface-variant line-clamp-2">
                      {offer.description}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-2 text-[11px] text-on-surface-variant pt-1">
                      <span className="flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-outline-variant">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        <span>{offer.location || 'Hybrid'}</span>
                      </span>
                      {offer.workplace_area && (
                        <span className="flex items-center gap-1 bg-orange-tint/40 text-vibrant-orange px-2 py-0.5 rounded border border-vibrant-orange/20 font-bold">
                          <span className="material-symbols-outlined text-[13px]">meeting_room</span>
                          <span>Area: {offer.workplace_area}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-outline-variant">
                        <span className="material-symbols-outlined text-[13px]">group</span>
                        <span>{offer.slots_available || 1} slot(s)</span>
                      </span>
                      <span className="flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-outline-variant">
                        <span className="material-symbols-outlined text-[13px]">tune</span>
                        <span className="capitalize">{offer.work_setup || 'Hybrid'}</span>
                      </span>
                    </div>

                    {/* Target Programs */}
                    {offer.target_programs?.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center pt-1 text-[10px]">
                        <span className="text-on-surface-variant font-bold">Programs:</span>
                        {offer.target_programs.map(tp => (
                          <span key={tp.program_id} className="px-1.5 py-0.5 bg-surface-container rounded text-on-surface">
                            {tp.program_code || tp.program_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-outline-variant flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedOffer(offer)}
                      className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-bold text-on-surface transition-colors flex items-center gap-1.5 cursor-pointer border border-outline-variant"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Inspect Details</span>
                    </button>

                    {offer.approval_status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(offer.approval_id, 'approved')}
                          className="px-3.5 py-1.5 bg-pinoy-green hover:opacity-90 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">check</span>
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleAction(offer.approval_id, 'rejected')}
                          className="px-3 py-1.5 bg-error-container text-error rounded-lg text-xs font-bold hover:bg-red-200 transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {offer.approval_status === 'approved' && (
                      <span className="text-xs text-pinoy-green font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">verified</span>
                        <span>Approved & Published</span>
                      </span>
                    )}

                    {offer.approval_status === 'rejected' && (
                      <span className="text-xs text-error font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">cancel</span>
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL COMPREHENSIVE OPPORTUNITY INSPECT MODAL */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-surface-container-lowest dark:bg-surface text-on-surface rounded-2xl border border-outline-variant shadow-2xl w-full max-w-3xl space-y-5 max-h-[92vh] overflow-y-auto p-5 sm:p-7 animate-scale-in">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-outline-variant pb-4 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-tint text-vibrant-orange border border-vibrant-orange/20">
                    Opportunity Review & Full Inspection
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedOffer.approval_status === 'approved'
                      ? 'bg-green-tint text-pinoy-green'
                      : selectedOffer.approval_status === 'rejected'
                      ? 'bg-error-container text-error'
                      : 'bg-orange-tint text-vibrant-orange'
                  }`}>
                    Status: {selectedOffer.approval_status || 'Pending Review'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-on-surface">{selectedOffer.title}</h2>
                <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant flex-wrap">
                  <span className="text-vibrant-orange">{selectedOffer.organization_name}</span>
                  {selectedOffer.industry && <span>• {selectedOffer.industry}</span>}
                  {selectedOffer.business_structure && <span>• ({selectedOffer.business_structure})</span>}
                </div>
              </div>

              <button
                onClick={() => setSelectedOffer(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                title="Close Modal"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Flyer / Promotional Media Banner (if available) */}
            {selectedOffer.flyer_image_url && (
              <div className="rounded-xl overflow-hidden border border-outline-variant bg-surface-container relative group">
                <img
                  src={resolveFileUrl(selectedOffer.flyer_image_url)}
                  alt="Opportunity Flyer"
                  loading="lazy"
                  decoding="async"
                  className="w-full max-h-64 object-contain mx-auto bg-black/5"
                />
                <button
                  type="button"
                  onClick={() => setFlyerLightbox(resolveFileUrl(selectedOffer.flyer_image_url))}
                  className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">fullscreen</span>
                  <span>View Full Flyer</span>
                </button>
              </div>
            )}

            {/* Core Specifications Bento Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-0.5">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Posting Type</span>
                <p className="font-bold text-on-surface capitalize">
                  {selectedOffer.posting_type === 'ojt' ? 'OJT Internship' : selectedOffer.posting_type === 'on_call' ? 'On-Call Opportunity' : 'Career Job Opening'}
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-0.5">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Work Setup</span>
                <p className="font-bold text-on-surface capitalize">{selectedOffer.work_setup || 'Hybrid'}</p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-0.5">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Available Slots</span>
                <p className="font-bold text-on-surface">{selectedOffer.slots_available || 1} Intern / Candidate(s)</p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-0.5">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Target Audience</span>
                <p className="font-bold text-on-surface capitalize">{selectedOffer.target_audience?.replace('_', ' ') || 'All Students'}</p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-0.5 col-span-2">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Office Location</span>
                <p className="font-bold text-on-surface leading-snug">{formatAddress(selectedOffer.location || selectedOffer.org_address)}</p>
                {selectedOffer.workplace_area && (
                  <p className="text-[11px] text-vibrant-orange font-medium mt-1">Work Area / Station: {selectedOffer.workplace_area}</p>
                )}
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-0.5 col-span-2">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Compensation / Allowance</span>
                <p className="font-bold text-on-surface">
                  {selectedOffer.salary_rate ? `₱${parseFloat(selectedOffer.salary_rate).toLocaleString()} (${selectedOffer.salary_rate_type || 'monthly'})` : 'Allowance / Competitive Standard'}
                </p>
                {(selectedOffer.start_time || selectedOffer.finish_time) && (
                  <p className="text-[11px] text-on-surface-variant">Working Hours: {selectedOffer.start_time || '08:00'} - {selectedOffer.finish_time || '17:00'}</p>
                )}
              </div>
            </div>

            {/* On-Call Specific Highlights (if applicable) */}
            {selectedOffer.posting_type === 'on_call' && (
              <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">bolt</span>
                  <span>On-Call Gig Terms & Compensation</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Required Working Days: <strong>{selectedOffer.on_call_days || 1} Day(s)</strong> • Expected Turnaround/Deadline: <strong>{selectedOffer.finish_time || 'Immediate'}</strong> • Compensation Rate: <strong>₱{parseFloat(selectedOffer.salary_rate || 0).toLocaleString()} ({selectedOffer.salary_rate_type || 'daily'})</strong>.
                </p>
              </div>
            )}

            {/* Full Job Description */}
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5 text-xs">
              <span className="font-bold text-on-surface uppercase text-[10px] tracking-wider block">
                Full Role Description & Responsibilities
              </span>
              <p className="text-on-surface-variant whitespace-pre-line leading-relaxed">
                {selectedOffer.description || 'No detailed description provided.'}
              </p>
            </div>

            {/* Requirements & Prerequisites */}
            {selectedOffer.requirements && (
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5 text-xs">
                <span className="font-bold text-on-surface uppercase text-[10px] tracking-wider block">
                  Qualifications & Prerequisites
                </span>
                <p className="text-on-surface-variant whitespace-pre-line leading-relaxed">
                  {selectedOffer.requirements}
                </p>
              </div>
            )}

            {/* Deliverables & Portfolio Crediting */}
            {selectedOffer.deliverables && (
              <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-1.5 text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-300 uppercase text-[10px] tracking-wider block">
                  Scope of Deliverables & Portfolio Crediting
                </span>
                <p className="text-amber-800 dark:text-amber-200 whitespace-pre-line leading-relaxed">
                  {selectedOffer.deliverables}
                </p>
              </div>
            )}

            {/* Eligible Academic Programs */}
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-2 text-xs">
              <span className="font-bold text-on-surface uppercase text-[10px] tracking-wider block">
                Target Degree Programs / Curriculums
              </span>
              {selectedOffer.target_programs?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedOffer.target_programs.map(tp => (
                    <span key={tp.program_id} className="px-2.5 py-1 bg-surface-container rounded-lg font-bold text-on-surface border border-outline-variant">
                      {tp.program_code ? `[${tp.program_code}] ` : ''}{tp.program_name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-on-surface-variant italic">Open to all accredited academic programs.</p>
              )}
            </div>

            {/* Assigned Workplace Mentor Details */}
            {selectedOffer.mentor_first_name && (
              <div className="p-4 bg-orange-tint/20 rounded-xl border border-vibrant-orange/30 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-vibrant-orange">
                  <span className="material-symbols-outlined text-[16px]">supervisor_account</span>
                  <span className="uppercase text-[10px]">Assigned Workplace Mentor</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-on-surface">
                  <div>
                    <p className="font-bold text-sm">{selectedOffer.mentor_first_name} {selectedOffer.mentor_last_name}</p>
                    <p className="text-on-surface-variant">{selectedOffer.mentor_job_title || 'Workplace Mentor'} • {selectedOffer.mentor_department || 'General'}</p>
                  </div>
                  <div className="space-y-0.5 text-on-surface-variant">
                    <p>Staff ID: <strong>{selectedOffer.mentor_staff_number || 'Recorded'}</strong></p>
                    <p>Direct Contact: <strong>{selectedOffer.mentor_contact || 'Via Organization'}</strong></p>
                  </div>
                </div>
              </div>
            )}

            {/* Hiring Organization Profile & Regulatory Details */}
            <div className="p-4 sm:p-5 bg-surface-container-low rounded-2xl border border-outline-variant space-y-3 text-xs">
              <span className="font-bold text-on-surface uppercase text-[11px] tracking-wider block">
                Employer Corporate Profile &amp; Regulatory Registrations
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-on-surface-variant">
                <div className="space-y-2 min-w-0">
                  <p><strong className="text-on-surface font-semibold">Registered Business:</strong> <span className="text-on-surface">{selectedOffer.organization_name}</span></p>
                  <p><strong className="text-on-surface font-semibold">Industry:</strong> {selectedOffer.industry || 'General Commerce'}</p>
                  <p><strong className="text-on-surface font-semibold">Corporate Structure:</strong> <span className="capitalize">{selectedOffer.business_structure || 'Corporation'}</span></p>
                  <p className="leading-relaxed"><strong className="text-on-surface font-semibold">Office Address:</strong> {formatAddress(selectedOffer.org_address || selectedOffer.location)}</p>
                </div>
                <div className="space-y-2 min-w-0">
                  <p><strong className="text-on-surface font-semibold">SEC / DTI Reg #:</strong> <span className="font-mono text-on-surface font-medium">{selectedOffer.sec_dti_number || 'Verified Partner'}</span></p>
                  <p><strong className="text-on-surface font-semibold">BIR TIN:</strong> <span className="font-mono text-on-surface font-medium">{selectedOffer.bir_tin || 'Verified'}</span></p>
                  <p className="break-all"><strong className="text-on-surface font-semibold">Official Email:</strong> {selectedOffer.contact_email || 'N/A'}</p>
                  <p><strong className="text-on-surface font-semibold">Official Phone:</strong> {selectedOffer.contact_phone || 'N/A'}</p>
                  {selectedOffer.website && (
                    <p className="break-all">
                      <strong className="text-on-surface font-semibold">Website:</strong>{' '}
                      <a href={selectedOffer.website.startsWith('http') ? selectedOffer.website : `https://${selectedOffer.website}`} target="_blank" rel="noreferrer" className="text-vibrant-orange hover:underline font-bold inline-flex items-center gap-0.5">
                        <span className="break-all">{selectedOffer.website}</span>
                        <span className="material-symbols-outlined text-[13px] shrink-0">open_in_new</span>
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t border-outline-variant flex justify-between items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedOffer(null)}
                className="px-4 py-2 bg-surface-container text-on-surface font-bold text-xs rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Close Inspection
              </button>

              {selectedOffer.approval_status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(selectedOffer.approval_id, 'rejected')}
                    className="px-4 py-2 bg-error-container text-error rounded-lg text-xs font-bold hover:bg-red-200 transition-colors cursor-pointer"
                  >
                    Reject Opportunity
                  </button>
                  <button
                    onClick={() => handleAction(selectedOffer.approval_id, 'approved')}
                    className="px-5 py-2 bg-pinoy-green text-white rounded-lg text-xs font-bold hover:opacity-90 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Approve & Publish to Students</span>
                  </button>
                </div>
              )}

              {selectedOffer.approval_status === 'approved' && (
                <span className="text-xs text-pinoy-green font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Approved & Currently Visible to Department Students</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FLYER LIGHTBOX MODAL */}
      {flyerLightbox && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4" onClick={() => setFlyerLightbox(null)}>
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={flyerLightbox}
              alt="High-Res Flyer"
              className="max-h-[85vh] w-auto object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setFlyerLightbox(null)}
              className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
              title="Close Full View"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
