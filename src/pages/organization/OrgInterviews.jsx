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
  const [autoGenerateMeet, setAutoGenerateMeet] = useState(true);
  const [locLink, setLocLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);
  const [meetConfigured, setMeetConfigured] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

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

  // Check Google Meet API configuration status
  useEffect(() => {
    const checkMeetStatus = async () => {
      try {
        const res = await api.get('/org/interviews/meet-status');
        if (res && res.configured) {
          setMeetConfigured(true);
        }
      } catch (err) {
        console.warn('Could not check Google Meet configuration status', err);
      }
    };
    checkMeetStatus();
  }, []);

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

  const handleInstantGenerateMeet = async () => {
    setIsGeneratingMeet(true);
    try {
      const selectedCandidate = data.candidates?.find(c => String(c.application_id) === String(appId));
      const candName = selectedCandidate ? `${selectedCandidate.first_name} ${selectedCandidate.last_name}` : 'Candidate';
      const res = await api.post('/org/interviews/generate-meet', {
        topic: `OJT Interview - ${candName}`
      });

      if (res.success && res.meetingUri) {
        setLocLink(res.meetingUri);
        setMessage(`Google Meet space generated: ${res.meetingUri}`);
      } else if (res.fallbackUri) {
        setLocLink(res.fallbackUri);
        setMessage(`Generated meeting link: ${res.fallbackUri}`);
      } else {
        alert(res.message || 'Could not generate Google Meet space. You can enter a link manually.');
      }
    } catch (err) {
      alert('Error generating Google Meet link: ' + err.message);
    } finally {
      setIsGeneratingMeet(false);
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!appId || !scheduleAt) return;
    setMessage('');

    const isOnline = mode === 'online';
    const res = await api.post('/org/interviews', {
      application_id: appId,
      schedule_at: scheduleAt,
      mode,
      auto_generate_meet: isOnline && autoGenerateMeet,
      location_or_link: isOnline && autoGenerateMeet && !locLink ? '' : locLink,
      notes
    });

    if (res.success) {
      const generatedNote = res.meetLinkGenerated
        ? ` with dedicated Google Meet space created (${res.location_or_link})`
        : '';
      setMessage(`Interview invitation sent successfully${generatedNote}! Candidate status updated to Interview.`);
      setAppId('');
      setScheduleAt('');
      setLocLink('');
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

  const handleCopyLink = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Interview Management</h1>
          <p className="text-sm text-on-surface-variant">Schedule technical screening calls, face-to-face evaluations, and coordinate candidate recruitment</p>
        </div>
        <div className="flex items-center gap-2">
          {meetConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-tint text-pinoy-green border border-pinoy-green/20">
              <span className="w-2 h-2 rounded-full bg-pinoy-green animate-pulse"></span>
              Google Meet API Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface-container-high text-on-surface-variant border border-outline-variant">
              <span className="material-symbols-outlined text-[16px] text-vibrant-orange">videocam</span>
              Google Meet Ready
            </span>
          )}
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span className="break-all">{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Form */}
        <div className="bento-card space-y-4">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange text-[22px]">calendar_add_on</span>
            <span>Schedule New Interview</span>
          </h2>

          <form onSubmit={handleSchedule} className="space-y-3.5 text-xs">
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

            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">Interview Mode</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'online', label: 'Online Video', icon: 'videocam' },
                  { id: 'onsite', label: 'On-Site', icon: 'business' },
                  { id: 'phone', label: 'Phone Call', icon: 'call' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMode(item.id);
                      if (item.id !== 'online') {
                        setLocLink('');
                      }
                    }}
                    className={`py-2 px-2 rounded-lg border font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      mode === item.id
                        ? 'border-vibrant-orange bg-orange-tint text-vibrant-orange shadow-xs'
                        : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {mode === 'online' && (
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-on-surface text-xs flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-vibrant-orange text-[16px]">video_call</span>
                    Video Meeting Platform
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-on-surface-variant">
                      <input
                        type="radio"
                        name="meet_type"
                        checked={autoGenerateMeet}
                        onChange={() => setAutoGenerateMeet(true)}
                        className="accent-vibrant-orange"
                      />
                      <span>Auto Google Meet</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-on-surface-variant">
                      <input
                        type="radio"
                        name="meet_type"
                        checked={!autoGenerateMeet}
                        onChange={() => {
                          setAutoGenerateMeet(false);
                          if (!locLink || locLink.includes('meet.google.com')) setLocLink('');
                        }}
                        className="accent-vibrant-orange"
                      />
                      <span>Custom URL</span>
                    </label>
                  </div>
                </div>

                {autoGenerateMeet ? (
                  <div className="space-y-2">
                    <div className="text-[11px] text-on-surface-variant bg-surface-container p-2.5 rounded-lg border border-outline-variant/60 flex items-start gap-2">
                      <span className="material-symbols-outlined text-vibrant-orange text-[16px] shrink-0 mt-0.5">smart_toy</span>
                      <div>
                        <p className="font-semibold text-on-surface">Automated Google Meet Space</p>
                        <p className="mt-0.5">A dedicated Google Meet room will be generated server-side via the REST API upon dispatching the invitation.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Optional: pre-generated link will show here"
                        value={locLink}
                        onChange={(e) => setLocLink(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleInstantGenerateMeet}
                        disabled={isGeneratingMeet}
                        className="px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant rounded-lg font-bold text-xs text-vibrant-orange flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        title="Generate a real Google Meet link right now"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isGeneratingMeet ? 'hourglass_top' : 'bolt'}
                        </span>
                        <span>{isGeneratingMeet ? 'Creating...' : 'Generate Now'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-on-surface-variant uppercase text-[10px] mb-1">Custom Meeting Link (Zoom, Teams, etc.)</label>
                    <input
                      type="url"
                      required={!autoGenerateMeet}
                      placeholder="https://zoom.us/j/... or https://teams.microsoft.com/..."
                      value={locLink}
                      onChange={(e) => setLocLink(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {mode === 'onsite' && (
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Office Location / Room</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5th Floor Conference Room, Ayala Ave, Makati"
                  value={locLink}
                  onChange={(e) => setLocLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low outline-none"
                />
              </div>
            )}

            {mode === 'phone' && (
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Phone Number / Instructions</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Recruiter will call student at candidate's mobile number"
                  value={locLink}
                  onChange={(e) => setLocLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low outline-none"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">Instructions / Agenda Notes</label>
              <textarea
                rows="3"
                placeholder="Prepare portfolio, capstone demo, dress code, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low outline-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-vibrant-orange text-white font-bold rounded-lg hover:bg-deep-orange transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>Send Interview Invitation</span>
            </button>
          </form>
        </div>

        {/* Interviews List */}
        <div className="lg:col-span-2 bento-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange text-[20px]">event_available</span>
              <span>Scheduled Candidate Interviews ({data.interviews?.length || 0})</span>
            </h2>
            <button
              onClick={fetchInterviews}
              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              title="Refresh list"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>

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
              {data.interviews.map((item) => {
                const meetUrl = item.meeting_link || item.location_or_link;
                const isLink = meetUrl?.startsWith('http');
                const isOnline = item.mode === 'online';
                const isMeet = isOnline && (item.meeting_link || meetUrl?.includes('meet.google.com'));

                return (
                  <div key={item.interview_id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-on-surface">{item.first_name} {item.last_name}</span>
                        {item.student_number && (
                          <span className="text-xs text-on-surface-variant">({item.student_number})</span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          item.status === 'completed' ? 'bg-green-tint text-pinoy-green' :
                          item.status === 'cancelled' ? 'bg-surface-container-high text-error' :
                          'bg-orange-tint text-vibrant-orange'
                        }`}>
                          {item.status}
                        </span>

                        {isMeet && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-tint text-pinoy-green">
                            <span className="material-symbols-outlined text-[12px]">videocam</span>
                            Google Meet
                          </span>
                        )}

                        {item.meeting_code && (
                          <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-on-surface-variant font-medium">
                            {item.meeting_code}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-on-surface-variant font-medium">
                        Applied for: <span className="font-bold text-on-surface">{item.job_title}</span> • {item.institution_name}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        <p className="text-vibrant-orange font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <span>{new Date(item.schedule_at).toLocaleString()}</span>
                        </p>
                        <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-bold uppercase text-[10px]">
                          {item.mode}
                        </span>
                      </div>

                      {/* Location / Meeting Link */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {isLink ? (
                          <>
                            <a
                              href={meetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-vibrant-orange/10 hover:bg-vibrant-orange text-vibrant-orange hover:text-white font-bold text-xs transition-colors shadow-xs"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isMeet ? 'video_call' : 'open_in_new'}
                              </span>
                              <span>Join {isMeet ? 'Google Meet' : 'Meeting'}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(meetUrl, item.interview_id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-semibold text-xs transition-colors cursor-pointer"
                              title="Copy Meeting URL"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {copiedId === item.interview_id ? 'check' : 'content_copy'}
                              </span>
                              <span>{copiedId === item.interview_id ? 'Copied' : 'Copy'}</span>
                            </button>
                            <span className="text-[11px] text-on-surface-variant truncate max-w-xs opacity-75">
                              {meetUrl}
                            </span>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                            <span className="material-symbols-outlined text-[16px] text-vibrant-orange">
                              {item.mode === 'phone' ? 'phone_in_talk' : 'location_on'}
                            </span>
                            <span className="font-medium">{item.location_or_link || 'No specific location indicated'}</span>
                          </div>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-on-surface-variant italic pt-0.5">
                          Note: "{item.notes}"
                        </p>
                      )}
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
