import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Interview Schedule Modal State
  const [interviewModalApp, setInterviewModalApp] = useState(null);

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

  const getStatusBadge = (app) => {
    const status = app.status;
    switch (status) {
      case 'interview':
        return {
          label: 'Interview Scheduled',
          color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 font-bold',
          icon: 'calendar_month'
        };
      case 'offered':
        return {
          label: 'Offer Received',
          color: 'bg-orange-tint text-vibrant-orange border border-vibrant-orange/30 font-bold animate-pulse',
          icon: 'campaign'
        };
      case 'accepted':
        return {
          label: 'Accepted / Placed',
          color: 'bg-green-tint text-pinoy-green border border-pinoy-green/30 font-bold',
          icon: 'check_circle'
        };
      case 'shortlisted':
        return {
          label: 'Shortlisted Candidate',
          color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 font-bold',
          icon: 'star'
        };
      case 'reviewed':
        return {
          label: 'Application Under Review',
          color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold',
          icon: 'visibility'
        };
      case 'rejected':
        return {
          label: 'Not Selected',
          color: 'bg-red-500/10 text-error border border-red-500/20 font-semibold',
          icon: 'cancel'
        };
      case 'declined':
        return {
          label: 'Offer Declined',
          color: 'bg-surface-container-high text-on-surface-variant font-semibold',
          icon: 'do_not_disturb'
        };
      case 'withdrawn':
        return {
          label: 'Application Withdrawn',
          color: 'bg-surface-container text-on-surface-variant font-semibold',
          icon: 'remove_circle_outline'
        };
      default:
        return {
          label: 'Submitted',
          color: 'bg-surface-container-high text-on-surface font-semibold',
          icon: 'send'
        };
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Application History & Feedback</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant">
            Track your ongoing applications, interview invitations, schedules, and employer responses.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2 border border-pinoy-green/20 animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-error-container text-error rounded-lg text-xs font-bold flex items-center gap-2 border border-error/20 animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      <div className="bento-card">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant space-y-2">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">inbox</span>
            <p className="text-sm font-bold text-on-surface">No Applications Submitted</p>
            <p className="text-xs">Browse open opportunities and submit your profile to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                  <th className="py-3 px-4">Position & Role</th>
                  <th className="py-3 px-4">Hiring Company</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-4">Status & Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {applications.map((app) => {
                  const badge = getStatusBadge(app);
                  const hasInterview = app.status === 'interview' || Boolean(app.interview_schedule_at);

                  return (
                    <tr key={app.application_id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3.5 px-4 font-bold text-on-surface">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{app.job_title}</span>
                          {app.posting_type === 'on_call' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                              ⚡ On-Call
                            </span>
                          )}
                          {app.posting_type === 'career_job' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-tint text-pinoy-green border border-pinoy-green/20">
                              💼 Job
                            </span>
                          )}
                        </div>
                        <span className="block text-xs font-normal text-on-surface-variant mt-0.5">
                          {app.location || 'Philippines'} • Setup: {app.work_setup || 'Flexible'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-on-surface text-xs block">{app.organization_name}</span>
                        <span className="block text-[11px] text-on-surface-variant">{app.contact_email}</span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-on-surface-variant whitespace-nowrap">
                        {new Date(app.applied_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${badge.color}`}>
                              <span className="material-symbols-outlined text-[14px]">{badge.icon}</span>
                              <span>{badge.label}</span>
                            </span>

                            {/* View Interview Schedule Action Button */}
                            {hasInterview && (
                              <button
                                onClick={() => setInterviewModalApp(app)}
                                className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all"
                                title="View Complete Interview Schedule & Link"
                              >
                                <span className="material-symbols-outlined text-[15px]">calendar_month</span>
                                <span>View Interview Schedule</span>
                              </button>
                            )}

                            {/* Accept / Decline Offer Buttons */}
                            {app.status === 'offered' && (
                              <div className="inline-flex gap-1.5">
                                <button
                                  onClick={() => handleRespond(app.application_id, 'accepted')}
                                  className="px-3 py-1 bg-pinoy-green text-white rounded text-xs font-bold hover:opacity-90 shadow-sm flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">check</span>
                                  <span>Accept Offer</span>
                                </button>
                                <button
                                  onClick={() => handleRespond(app.application_id, 'declined')}
                                  className="px-3 py-1 bg-error text-white rounded text-xs font-bold hover:opacity-90 shadow-sm flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">close</span>
                                  <span>Decline</span>
                                </button>
                              </div>
                            )}

                            {/* Withdraw Application Link */}
                            {['submitted', 'pending', 'reviewed', 'shortlisted'].includes(app.status) && (
                              <button
                                onClick={() => handleWithdraw(app.application_id, app.job_title)}
                                className="px-2.5 py-1 bg-surface-container text-error hover:bg-red-500/10 rounded text-xs font-bold transition-colors inline-flex items-center gap-1"
                                title="Withdraw Application"
                              >
                                <span className="material-symbols-outlined text-[13px]">cancel</span>
                                <span>Withdraw</span>
                              </button>
                            )}
                          </div>

                          {/* Feedback / Note display */}
                          {(app.feedback || app.notes) && (
                            <div className="p-2 bg-surface-container-low rounded-lg border border-outline-variant text-[11px] text-on-surface-variant flex items-start gap-1.5 max-w-md">
                              <span className="material-symbols-outlined text-[14px] text-vibrant-orange shrink-0 mt-0.5">comment</span>
                              <div>
                                <span className="font-bold text-on-surface">Employer Note: </span>
                                <span>{app.feedback || app.notes}</span>
                              </div>
                            </div>
                          )}
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

      {/* INTERVIEW SCHEDULE MODAL */}
      {interviewModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface max-w-lg w-full rounded-2xl shadow-2xl border border-outline-variant p-6 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">Interview Invitation Details</h3>
                  <p className="text-xs text-on-surface-variant">
                    {interviewModalApp.job_title} • {interviewModalApp.organization_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInterviewModalApp(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Schedule Highlights */}
            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300 tracking-wider">
                  Confirmed Schedule (Philippine Standard Time)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                  PST (UTC+8)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[32px] text-blue-600">schedule</span>
                <div>
                  <div className="text-base font-bold text-on-surface">
                    {interviewModalApp.interview_schedule_at
                      ? new Date(interviewModalApp.interview_schedule_at).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Schedule to be confirmed'}
                  </div>
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    {interviewModalApp.interview_schedule_at
                      ? new Date(interviewModalApp.interview_schedule_at).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      : 'Pending coordinator assignment'}
                  </div>
                </div>
              </div>
            </div>

            {/* Mode & Location / Video Call Link */}
            <div className="space-y-3">
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                  Interview Mode & Platform
                </span>
                <div className="flex items-center gap-2 font-bold text-on-surface text-sm">
                  <span className="material-symbols-outlined text-vibrant-orange text-[18px]">
                    {interviewModalApp.interview_mode === 'in_person' || interviewModalApp.interview_mode === 'onsite'
                      ? 'location_on'
                      : interviewModalApp.interview_mode === 'phone'
                      ? 'call'
                      : 'videocam'}
                  </span>
                  <span className="capitalize">
                    {interviewModalApp.interview_mode === 'in_person' || interviewModalApp.interview_mode === 'onsite'
                      ? 'Face-to-Face On-site Interview'
                      : interviewModalApp.interview_mode === 'phone'
                      ? 'Phone / Audio Interview'
                      : 'Online Video Conference'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                  Meeting Link or Office Address
                </span>
                <div className="font-mono text-xs text-on-surface break-all">
                  {interviewModalApp.interview_location_or_link || 'Link / Room will be provided by host HR officer.'}
                </div>
                {interviewModalApp.interview_location_or_link?.startsWith('http') && (
                  <div className="pt-1">
                    <a
                      href={interviewModalApp.interview_location_or_link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                      <span>Join Interview Meeting</span>
                    </a>
                  </div>
                )}
              </div>

              {interviewModalApp.interview_notes && (
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                    Interviewer Notes / Preparation Instructions
                  </span>
                  <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                    {interviewModalApp.interview_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-outline-variant flex justify-end">
              <button
                onClick={() => setInterviewModalApp(null)}
                className="px-5 py-2 bg-surface-container text-on-surface rounded-lg font-bold hover:bg-surface-container-high transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
