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
  const [autoGenerateMeet, setAutoGenerateMeet] = useState(false);
  const [locLink, setLocLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);
  const [meetConfigured, setMeetConfigured] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // New States for Filter and Modals
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmStatusChange, setConfirmStatusChange] = useState(null); // { id, newStatus, candidateName }
  const [postMeetInterview, setPostMeetInterview] = useState(null); // item object

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
          setAutoGenerateMeet(true);
        } else {
          setMeetConfigured(false);
          setAutoGenerateMeet(false);
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
        const fallback = window.confirm(
          `Auto-generation failed (${res.error || res.message || 'Account limit'}).\n\n` +
          `Automatic Meet generation via API requires a Google Workspace account. ` +
          `Since you may be using a personal account, you can generate a link manually.\n\n` +
          `Click OK to open Google Meet in a new tab. It will instantly create a new meeting. ` +
          `Copy the URL from the address bar and paste it in the Custom URL field.`
        );
        if (fallback) {
          window.open('https://meet.google.com/new', '_blank');
          setAutoGenerateMeet(false);
          setLocLink('');
        }
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

  const confirmAndUpdateStatus = async () => {
    if (!confirmStatusChange) return;
    await handleUpdateStatus(confirmStatusChange.id, confirmStatusChange.newStatus);
    setConfirmStatusChange(null);
    setPostMeetInterview(null); // close post-meet modal if open
  };

  const handleCopyLink = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredInterviews = data.interviews?.filter(
    item => filterStatus === 'all' || item.status === filterStatus
  ) || [];

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
                    {meetConfigured && (
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
                    )}
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

                {autoGenerateMeet && meetConfigured ? (
                  <div className="space-y-2">
                    <div className="text-[11px] text-on-surface-variant bg-surface-container p-2.5 rounded-lg border border-outline-variant/60 flex items-start gap-2">
                      <span className="material-symbols-outlined text-vibrant-orange text-[16px] shrink-0 mt-0.5">smart_toy</span>
                      <div>
                        <p className="font-semibold text-on-surface">Automated Google Meet Space</p>
                        <p className="mt-0.5">A dedicated Google Meet room will be generated server-side via the REST API upon dispatching the invitation.</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="Optional: generated link appears here"
                        value={locLink}
                        onChange={(e) => setLocLink(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface-container outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleInstantGenerateMeet}
                        disabled={isGeneratingMeet}
                        className="w-full px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant rounded-lg font-bold text-xs text-vibrant-orange flex justify-center items-center gap-1.5 transition-colors cursor-pointer"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange text-[20px]">event_available</span>
              <span>Scheduled Candidate Interviews ({filteredInterviews.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container text-xs font-bold text-on-surface outline-none"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
              <button
                onClick={fetchInterviews}
                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                title="Refresh list"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : data.interviews?.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-xs">
              <span className="material-symbols-outlined text-[36px] mb-2">event_busy</span>
              <p>No interviews found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInterviews.map((item) => {
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
                        {item.status === 'completed' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant font-bold text-xs border border-outline-variant opacity-75">
                              <span className="material-symbols-outlined text-[15px] text-pinoy-green">check_circle</span>
                              <span>Interview Completed</span>
                            </span>
                            {isLink && (
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
                            )}
                          </div>
                        ) : item.status === 'cancelled' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-red-500 font-bold text-xs border border-outline-variant opacity-75">
                              <span className="material-symbols-outlined text-[15px]">cancel</span>
                              <span>Interview Cancelled</span>
                            </span>
                            {isLink && (
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
                            )}
                          </div>
                        ) : isLink ? (
                          <>
                            <a
                              href={meetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                if (item.status === 'scheduled') {
                                  setPostMeetInterview(item);
                                }
                              }}
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
                        disabled={item.status !== 'scheduled'}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          if (newStatus !== item.status) {
                            setConfirmStatusChange({
                              id: item.interview_id,
                              newStatus,
                              candidateName: `${item.first_name} ${item.last_name}`,
                            });
                          }
                        }}
                        className="px-2.5 py-1 rounded border border-outline-variant bg-surface-container text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Post Meeting Modal */}
      {postMeetInterview && !confirmStatusChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-outline-variant -95">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-vibrant-orange/10 flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-[24px] text-vibrant-orange">record_voice_over</span>
              </div>
              <h3 className="text-xl font-bold text-on-surface text-center">Interview Session Started</h3>
              <p className="text-sm text-on-surface-variant text-center">
                You have joined the meeting for <span className="font-bold text-on-surface">{postMeetInterview.first_name} {postMeetInterview.last_name}</span>.
                Once the interview is over, how would you like to proceed?
              </p>
              
              <div className="pt-4 flex flex-col gap-3">
                <button
                  onClick={() => setConfirmStatusChange({
                    id: postMeetInterview.interview_id,
                    newStatus: 'completed',
                    candidateName: `${postMeetInterview.first_name} ${postMeetInterview.last_name}`
                  })}
                  className="w-full py-2.5 px-4 bg-pinoy-green text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                >
                  Mark Interview as Completed
                </button>
                <button
                  onClick={() => setPostMeetInterview(null)}
                  className="w-full py-2.5 px-4 bg-surface-container text-on-surface font-bold rounded-lg hover:bg-surface-container-high transition-colors"
                >
                  Will Meet Again (Resume Later)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {confirmStatusChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-outline-variant -95">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-on-surface">Confirm Status Change</h3>
              <p className="text-sm text-on-surface-variant">
                Are you sure you want to mark the interview with <span className="font-bold">{confirmStatusChange.candidateName}</span> as <span className="font-bold uppercase">{confirmStatusChange.newStatus.replace('_', ' ')}</span>?
              </p>
              <div className="p-3 bg-error/10 text-error rounded-lg text-xs font-semibold flex gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
                <p>This action cannot be undone. You will not be able to change the status again once confirmed.</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setConfirmStatusChange(null)}
                  className="flex-1 py-2 rounded-lg font-bold text-sm text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAndUpdateStatus}
                  className="flex-1 py-2 rounded-lg font-bold text-sm text-white bg-vibrant-orange hover:bg-deep-orange transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
