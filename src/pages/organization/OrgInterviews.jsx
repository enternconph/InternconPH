import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';

export default function OrgInterviews() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState({ interviews: [], candidates: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Form State
  const [appId, setAppId] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [mode, setMode] = useState('online');
  const [locLink, setLocLink] = useState('https://meet.google.com/ojt-interview');
  const [notes, setNotes] = useState('');

  const fetchInterviews = async () => {
    setLoading(true);
    const res = await api.get('/org/interviews');
    if (res.success && res.data) {
      let candidatesList = res.data.candidates || [];

      // If a candidate was passed via navigation state or query param, ensure they are in the selectable options
      const targetId = location.state?.candidateId || location.state?.applicationId || searchParams.get('candidateId');
      if (targetId && location.state?.candidateName) {
        const exists = candidatesList.some(c => String(c.application_id) === String(targetId));
        if (!exists) {
          const names = location.state.candidateName.split(' ');
          candidatesList = [
            {
              application_id: Number(targetId),
              first_name: names[0] || 'Candidate',
              last_name: names.slice(1).join(' ') || '',
              job_title: location.state.jobTitle || 'Applicant'
            },
            ...candidatesList
          ];
        }
      }

      setData({ ...res.data, candidates: candidatesList });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  useRealtimeRefresh(fetchInterviews);

  useEffect(() => {
    const targetId = location.state?.candidateId || location.state?.applicationId || searchParams.get('candidateId');
    if (targetId) {
      setAppId(String(targetId));
      if (location.state?.candidateName) {
        setMessage(`Scheduling interview invitation for ${location.state.candidateName} (${location.state.jobTitle || 'Applicant'}). Fill out the interview details below and send the invitation.`);
      }
      // Set default interview time to tomorrow 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const isoLocal = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setScheduleAt(isoLocal);
    }
  }, [location.state, searchParams]);

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!appId || !scheduleAt) return;
    setMessage('');
    const res = await api.post('/org/interviews', {
      application_id: appId,
      schedule_at: scheduleAt,
      mode,
      location_or_link: locLink,
      notes
    });
    if (res.success) {
      setMessage('Interview invitation sent to candidate successfully! Candidate status is now updated to Interview.');
      setAppId('');
      setScheduleAt('');
      setNotes('');
      fetchInterviews();
    } else {
      alert(res.message || 'Failed to schedule interview.');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    const res = await api.put(`/org/interviews/${id}`, { status });
    if (res.success) fetchInterviews();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Interview Management</h1>
        <p className="text-sm text-on-surface-variant">Schedule technical screening calls, face-to-face evaluations, and coordinate candidate recruitment</p>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Form */}
        <div className="bento-card space-y-4">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange text-[22px]">calendar_add_on</span>
            <span>Schedule New Interview</span>
          </h2>

          <form onSubmit={handleSchedule} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">Select Candidate</label>
              <select
                required
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low outline-none"
              >
                <option value="">Choose applicant...</option>
                {data.candidates?.map((c) => (
                  <option key={c.application_id} value={c.application_id}>
                    {c.first_name} {c.last_name} — {c.job_title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Interview Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low outline-none font-bold"
                >
                  <option value="online">Online (Video)</option>
                  <option value="onsite">On-Site (Office)</option>
                  <option value="phone">Phone Call</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Meeting Link / Address</label>
                <input
                  type="text"
                  value={locLink}
                  onChange={(e) => setLocLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">Instructions / Notes</label>
              <textarea
                rows="3"
                placeholder="Prepare portfolio, capstone demo, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low outline-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-vibrant-orange text-white font-bold rounded-lg hover:bg-deep-orange transition-colors shadow-sm cursor-pointer"
            >
              Send Interview Invitation
            </button>
          </form>
        </div>

        {/* Interviews List */}
        <div className="lg:col-span-2 bento-card space-y-4">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange text-[20px]">event_available</span>
            <span>Scheduled Candidate Interviews ({data.interviews?.length || 0})</span>
          </h2>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : data.interviews?.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-xs">
              <span className="material-symbols-outlined text-[36px] mb-2">event_busy</span>
              <p>No interviews scheduled yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.interviews.map((item) => (
                <div key={item.interview_id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-on-surface">{item.first_name} {item.last_name}</span>
                      <span className="text-xs text-on-surface-variant">({item.student_number})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        item.status === 'completed' ? 'bg-green-tint text-pinoy-green' :
                        item.status === 'cancelled' ? 'bg-surface-container-high text-error' :
                        'bg-orange-tint text-vibrant-orange'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant font-medium">
                      Applied for: <span className="font-bold text-on-surface">{item.job_title}</span> • {item.institution_name}
                    </p>
                    <p className="text-[11px] text-vibrant-orange font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span>{new Date(item.schedule_at).toLocaleString()} ({item.mode.toUpperCase()})</span>
                    </p>
                    <p className="text-[11px] text-on-surface-variant truncate max-w-md">Link/Location: {item.location_or_link}</p>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <select
                      value={item.status}
                      onChange={(e) => handleUpdateStatus(item.interview_id, e.target.value)}
                      className="px-2.5 py-1 rounded border border-outline-variant bg-surface-container text-xs font-bold"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Mark Completed</option>
                      <option value="cancelled">Cancel</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
