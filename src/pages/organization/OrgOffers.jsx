import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';

export default function OrgOffers() {
  const [data, setData] = useState({ jobOffers: [], deploymentOffers: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchOffers = useCallback(async () => {
    try {
      const res = await api.get('/org/offers');
      if (res.success && res.data) {
        setData(res.data);
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

  // Real-time synchronization
  useRealtimeRefresh(fetchOffers);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Offers & Deployment Contracts</h1>
        <p className="text-sm text-on-surface-variant">Track formal internship job offers and direct OJT deployment contracts issued to students</p>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Offers */}
        <div className="bento-card space-y-4">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange text-[20px]">assignment_turned_in</span>
            <span>Formal Job & Internship Offers ({data.jobOffers?.length || 0})</span>
          </h2>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : data.jobOffers?.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-xs">
              <p>No job offers issued yet. You can issue offers directly from Candidate Applicants.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.jobOffers.map((o) => (
                <div key={o.offer_id} className="p-3 bg-surface-container rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-outline-variant text-xs">
                  <div>
                    <p className="font-bold text-on-surface">{o.first_name} {o.last_name}</p>
                    <p className="text-on-surface-variant text-[11px]">{o.job_title} • ID: {o.student_number}</p>
                    <span className="text-[10px] text-on-surface-variant block mt-1">
                      {o.status === 'accepted' ? 'Accepted on: ' : 'Offered on: '}
                      {o.offered_at ? new Date(o.offered_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <span className={`self-start sm:self-auto px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                    o.status === 'accepted' || o.status === 'hired' || o.status === 'completed' ? 'bg-green-tint text-pinoy-green' :
                    o.status === 'declined' || o.status === 'rejected' ? 'bg-surface-container-high text-error' :
                    'bg-orange-tint text-vibrant-orange'
                  }`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OJT Deployment Offers */}
        <div className="bento-card space-y-4">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-pinoy-green text-[20px]">handshake</span>
            <span>Direct OJT Deployment Offers ({data.deploymentOffers?.length || 0})</span>
          </h2>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : data.deploymentOffers?.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-xs">
              <p>No direct deployment agreements issued yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.deploymentOffers.map((d) => (
                <div key={d.offer_id} className="p-3 bg-surface-container rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-outline-variant text-xs">
                  <div>
                    <p className="font-bold text-on-surface">{d.first_name} {d.last_name}</p>
                    <p className="text-on-surface-variant text-[11px]">{d.job_title || 'General OJT Placement'} {d.student_number ? `• ID: ${d.student_number}` : ''}</p>
                    <span className="text-[10px] text-on-surface-variant block mt-1">
                      Date: {d.offered_at ? new Date(d.offered_at).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                  <span className={`self-start sm:self-auto px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                    d.status === 'accepted' || d.status === 'ongoing' || d.status === 'completed'
                      ? 'bg-green-tint text-pinoy-green'
                      : 'bg-orange-tint text-vibrant-orange'
                  }`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
