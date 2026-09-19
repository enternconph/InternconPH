import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';

export default function InstOJTOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedOffer, setSelectedOffer] = useState(null); // Full opportunity inspect modal

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
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-colors flex items-center gap-1.5 whitespace-nowrap ${
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
                      className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-bold text-on-surface transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Inspect</span>
                    </button>

                    {offer.approval_status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(offer.approval_id, 'approved')}
                          className="px-3.5 py-1.5 bg-pinoy-green hover:opacity-90 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[15px]">check</span>
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleAction(offer.approval_id, 'rejected')}
                          className="px-3 py-1.5 bg-error-container text-error rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
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

      {/* FULL OPPORTUNITY INSPECT MODAL */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-outline-variant shadow-2xl w-full max-w-xl space-y-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start border-b border-outline-variant pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-vibrant-orange tracking-wider block mb-0.5">
                  Opportunity Review & Inspection
                </span>
                <h2 className="text-xl font-bold text-on-surface">{selectedOffer.title}</h2>
                <p className="text-xs text-on-surface-variant font-bold">{selectedOffer.organization_name}</p>
              </div>

              <button
                onClick={() => setSelectedOffer(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                <span className="font-bold text-on-surface uppercase text-[10px]">Description</span>
                <p className="text-on-surface-variant whitespace-pre-line">{selectedOffer.description}</p>
              </div>

              {selectedOffer.requirements && (
                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                  <span className="font-bold text-on-surface uppercase text-[10px]">Qualifications & Prerequisites</span>
                  <p className="text-on-surface-variant whitespace-pre-line">{selectedOffer.requirements}</p>
                </div>
              )}

              {selectedOffer.deliverables && (
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-1">
                  <span className="font-bold text-amber-900 uppercase text-[10px]">Scope of Deliverables & Portfolio Crediting</span>
                  <p className="text-amber-800 whitespace-pre-line">{selectedOffer.deliverables}</p>
                </div>
              )}

              {selectedOffer.mentor_first_name && (
                <div className="p-3 bg-orange-tint/20 rounded-xl border border-vibrant-orange/30 space-y-1">
                  <span className="font-bold text-vibrant-orange uppercase text-[10px]">Assigned Workplace Mentor</span>
                  <p className="text-on-surface font-bold">{selectedOffer.mentor_first_name} {selectedOffer.mentor_last_name} ({selectedOffer.mentor_job_title || 'Mentor'})</p>
                  <p className="text-on-surface-variant">Department: {selectedOffer.mentor_department || 'N/A'} • Contact: {selectedOffer.mentor_contact || 'N/A'}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-outline-variant flex justify-between items-center">
              <button
                type="button"
                onClick={() => setSelectedOffer(null)}
                className="px-4 py-2 bg-surface-container text-on-surface font-bold text-xs rounded-lg hover:bg-surface-container-high"
              >
                Close
              </button>

              {selectedOffer.approval_status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(selectedOffer.approval_id, 'rejected')}
                    className="px-4 py-2 bg-error-container text-error rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                  >
                    Reject Offer
                  </button>
                  <button
                    onClick={() => handleAction(selectedOffer.approval_id, 'approved')}
                    className="px-5 py-2 bg-pinoy-green text-white rounded-lg text-xs font-bold hover:opacity-90 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Approve & Distribute to Students</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
