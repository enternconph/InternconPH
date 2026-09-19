import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchApplications = useCallback(async () => {
    try {
      const res = await api.get('/student/applications');
      if (res.success && res.data) {
        setApplications(res.data);
      }
    } catch (err) {
      console.error('Fetch applications error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Live real-time sync
  useRealtimeRefresh(fetchApplications);

  const handleRespond = async (appId, action) => {
    setMessage('');
    setError('');
    const res = await api.post(`/student/applications/${appId}/respond`, { action });
    if (res.success) {
      setMessage(res.message);
      fetchApplications();
    } else {
      setError(res.message || 'Action failed.');
    }
  };

  const handleWithdraw = async (appId, jobTitle) => {
    if (!window.confirm(`Are you sure you want to withdraw your application for "${jobTitle}"?`)) return;
    setMessage('');
    setError('');
    const res = await api.delete(`/student/applications/${appId}`);
    if (res.success) {
      setMessage(res.message);
      fetchApplications();
    } else {
      setError(res.message || 'Failed to withdraw application.');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Application History</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant">
            Track your ongoing applications, interview invitations, and status responses.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-error-container text-error rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      <div className="bento-card">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px] mb-2">inbox</span>
            <p className="text-sm">You have not submitted any applications yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {applications.map((app) => (
                  <tr key={app.application_id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-4 font-bold text-on-surface">
                      {app.job_title}
                      <span className="block text-xs font-normal text-on-surface-variant">{app.location || 'Flexible Setup'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-on-surface text-xs">{app.organization_name}</span>
                      <span className="block text-[11px] text-on-surface-variant">{app.contact_email}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-on-surface-variant">
                      {new Date(app.applied_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                        app.status === 'offered' ? 'bg-orange-tint text-vibrant-orange animate-pulse' :
                        app.status === 'accepted' ? 'bg-green-tint text-pinoy-green' :
                        app.status === 'shortlisted' ? 'bg-blue-100 text-blue-700' :
                        app.status === 'rejected' ? 'bg-red-100 text-error' :
                        app.status === 'withdrawn' ? 'bg-gray-100 text-gray-500' :
                        'bg-surface-container text-on-surface-variant'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {app.status === 'offered' && (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => handleRespond(app.application_id, 'accepted')}
                            className="px-3 py-1 bg-pinoy-green text-white rounded text-xs font-bold hover:opacity-90 shadow-sm"
                          >
                            Accept Offer
                          </button>
                          <button
                            onClick={() => handleRespond(app.application_id, 'declined')}
                            className="px-3 py-1 bg-error text-white rounded text-xs font-bold hover:opacity-90 shadow-sm"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {['submitted', 'pending', 'reviewed', 'shortlisted'].includes(app.status) && (
                        <button
                          onClick={() => handleWithdraw(app.application_id, app.job_title)}
                          className="px-3 py-1 bg-surface-container text-error hover:bg-red-50 rounded text-xs font-bold transition-colors"
                          title="Withdraw Application"
                        >
                          Withdraw
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
