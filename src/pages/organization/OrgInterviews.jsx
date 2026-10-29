import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { DetailLink } from '../../components/ui/kit';
import { playInterviewAlarm } from '../../utils/audio';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Returns YYYY-MM-DD key in Asia/Manila timezone */
function toManilaDateKey(dateInput) {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (y && m && day) return `${y}-${m}-${day}`;
  } catch (_) {}
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatManilaDateTime(dateInput) {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  try {
    return d.toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (_) {
    return d.toLocaleString();
  }
}

function formatManilaTimeShort(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (_) {
    return d.toLocaleTimeString();
  }
}

function formatRelativeAdded(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const diffMs = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Added just now';
  if (mins < 60) return `Added ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Added ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Added ${days}d ago`;
  return `Added ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export default function OrgInterviews() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ interviews: [], candidates: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Form State (Online & Onsite only — Phone removed)
  const [appId, setAppId] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [mode, setMode] = useState('online');
  const [autoGenerateMeet, setAutoGenerateMeet] = useState(true);
  const [locLink, setLocLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);
  const [meetConfigured, setMeetConfigured] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Tabs & Filters State
  // activeTab: 'scheduled' | 'history'
  const [activeTab, setActiveTab] = useState('scheduled');
  // historySubFilter: 'completed' | 'all'
  const [historySubFilter, setHistorySubFilter] = useState('completed');
  // filterType: 'all' | 'recent' | 'online' | 'onsite'
  const [filterType, setFilterType] = useState('all');

  // Calendar Month State (year, month 0-11)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Modal State: supports inspecting either a single interview OR all interviews on a pressed calendar date
  const [modalGroup, setModalGroup] = useState(null); // { dateLabel?: string, items: Interview[], activeIndex: number }

  // Live clock tick for "Starting in Xm" badges
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [alarmTested, setAlarmTested] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/org/interviews');
      if (res.success && res.data) {
        let candidatesList = res.data.candidates || [];

        const targetId =
          location.state?.candidateId ||
          location.state?.applicationId ||
          searchParams.get('candidateId');
        if (targetId && location.state?.candidateName) {
          const exists = candidatesList.some(
            (c) => String(c.application_id) === String(targetId)
          );
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
    } finally {
      setLoading(false);
    }
  }, [location.state, searchParams]);

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

  // Request Desktop Notification permission gently on first interaction if supported
  const handleTestAdvanceAlarm = async () => {
    playInterviewAlarm(0.55, true);
    setAlarmTested(true);
    setTimeout(() => setAlarmTested(false), 2500);
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  useRealtimeRefresh(fetchInterviews);

  // Open modal automatically if navigated from 5-min alarm banner (?inspectId=...)
  useEffect(() => {
    const inspectId = searchParams.get('inspectId');
    if (!inspectId || !data.interviews?.length) return;
    const match = data.interviews.find(
      (i) => String(i.interview_id) === String(inspectId)
    );
    if (match) {
      setModalGroup({ items: [match], activeIndex: 0, dateLabel: null });
      const next = new URLSearchParams(searchParams);
      next.delete('inspectId');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, data.interviews, setSearchParams]);

  useEffect(() => {
    const targetId =
      location.state?.candidateId ||
      location.state?.applicationId ||
      searchParams.get('candidateId');
    if (targetId) {
      setAppId(String(targetId));
      if (location.state?.candidateName) {
        setMessage(
          `Scheduling interview invitation for ${location.state.candidateName} (${
            location.state.jobTitle || 'Applicant'
          }). Fill out the interview details below and send the invitation.`
        );
      }
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const isoLocal = new Date(
        tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      setScheduleAt(isoLocal);
    }
  }, [location.state, searchParams]);

  const handleInstantGenerateMeet = async () => {
    setIsGeneratingMeet(true);
    try {
      const selectedCandidate = data.candidates?.find(
        (c) => String(c.application_id) === String(appId)
      );
      const candName = selectedCandidate
        ? `${selectedCandidate.first_name} ${selectedCandidate.last_name}`
        : 'Candidate';
      const res = await api.post('/org/interviews/generate-meet', {
        topic: `OJT Interview - ${candName}`,
        schedule_at: scheduleAt || null
      });

      if (res.success && res.meetingUri) {
        setLocLink(res.meetingUri);
        setMessage(`Google Meet room created: ${res.meetingUri}`);
      } else {
        alert(
          res.message ||
            'Could not generate Google Meet link. Check your Google Calendar API OAuth credentials or switch to Custom URL.'
        );
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

    // Unlock browser AudioContext & Desktop Notification permission so 5-min alarm can ring unobstructed
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch (_) {}

    const isOnline = mode === 'online';
    const res = await api.post('/org/interviews', {
      application_id: appId,
      schedule_at: scheduleAt,
      mode: isOnline ? 'online' : 'onsite',
      auto_generate_meet: isOnline && autoGenerateMeet,
      location_or_link: isOnline && autoGenerateMeet && !locLink ? '' : locLink,
      notes
    });

    if (res.success) {
      const generatedNote = res.meetLinkGenerated
        ? ` with dedicated Google Meet space created (${res.location_or_link})`
        : '';
      setMessage(
        `Interview invitation sent successfully${generatedNote}! Candidate status updated to Interview.`
      );

      // Jump calendar to the scheduled interview's month
      const schedDate = new Date(scheduleAt);
      if (!isNaN(schedDate.getTime())) {
        setCalendarMonth({
          year: schedDate.getFullYear(),
          month: schedDate.getMonth()
        });
      }

      setActiveTab('scheduled');
      setAppId('');
      setScheduleAt('');
      setLocLink('');
      setNotes('');
      await fetchInterviews();
      window.dispatchEvent(new Event('interncon:interviews-changed'));
    } else {
      alert(res.message || 'Failed to schedule interview.');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    const res = await api.put(`/org/interviews/${id}`, { status });
    if (res.success) {
      if (status === 'completed') {
        setMessage('Interview marked as Done and moved to Interview History.');
      } else if (status === 'cancelled') {
        setMessage('Interview cancelled and archived to Interview History.');
      }
      await fetchInterviews();
      window.dispatchEvent(new Event('interncon:interviews-changed'));

      // Update or close active modal if open
      setModalGroup((prev) => {
        if (!prev) return null;
        const updatedItems = prev.items.map((it) =>
          it.interview_id === id ? { ...it, status } : it
        );
        // If user marked it done from Scheduled tab and there are no other items in modal, close cleanly
        if (status !== 'scheduled' && activeTab === 'scheduled' && updatedItems.length === 1) {
          return null;
        }
        return { ...prev, items: updatedItems };
      });
    }
  };

  const handleCopyLink = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Partition interviews into Active Scheduled vs Done/Concluded History
  const { scheduledList, historyCompletedList, historyAllList } = useMemo(() => {
    const all = Array.isArray(data.interviews) ? data.interviews : [];
    const scheduled = all.filter((i) => i.status === 'scheduled');
    const completed = all.filter((i) => i.status === 'completed');
    const historyAll = all.filter((i) => i.status !== 'scheduled');
    return {
      scheduledList: scheduled,
      historyCompletedList: completed,
      historyAllList: historyAll
    };
  }, [data.interviews]);

  // Apply Mode + Sort Filter ('all' | 'recent' | 'online' | 'onsite')
  const applyFilters = useCallback(
    (sourceList, isHistoryTab = false) => {
      let filtered = [...sourceList];

      if (filterType === 'online') {
        filtered = filtered.filter((i) => (i.mode || 'online').toLowerCase() === 'online');
      } else if (filterType === 'onsite') {
        filtered = filtered.filter((i) => (i.mode || '').toLowerCase() === 'onsite');
      }

      if (filterType === 'recent') {
        filtered.sort((a, b) => {
          const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
          if (cb !== ca) return cb - ca;
          return (b.interview_id || 0) - (a.interview_id || 0);
        });
      } else if (isHistoryTab) {
        filtered.sort((a, b) => {
          const ua = new Date(a.updated_at || a.schedule_at || 0).getTime();
          const ub = new Date(b.updated_at || b.schedule_at || 0).getTime();
          return ub - ua;
        });
      } else {
        filtered.sort(
          (a, b) => new Date(a.schedule_at || 0).getTime() - new Date(b.schedule_at || 0).getTime()
        );
      }

      return filtered;
    },
    [filterType]
  );

  const visibleScheduled = useMemo(
    () => applyFilters(scheduledList, false),
    [scheduledList, applyFilters]
  );

  const visibleHistory = useMemo(() => {
    const base = historySubFilter === 'completed' ? historyCompletedList : historyAllList;
    return applyFilters(base, true);
  }, [historySubFilter, historyCompletedList, historyAllList, applyFilters]);

  // Group scheduled interviews by Manila YYYY-MM-DD for Calendar markings
  const calendarMap = useMemo(() => {
    const map = {};
    visibleScheduled.forEach((item) => {
      const key = toManilaDateKey(item.schedule_at);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    // Sort each day's interviews chronologically
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => new Date(a.schedule_at).getTime() - new Date(b.schedule_at).getTime())
    );
    return map;
  }, [visibleScheduled]);

  // Build Calendar Grid Cells for `calendarMonth`
  const calendarCells = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ empty: true, key: `pad-start-${i}` });
    }

    const todayKey = toManilaDateKey(new Date());

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayInterviews = calendarMap[dateKey] || [];
      cells.push({
        empty: false,
        day,
        dateKey,
        isToday: dateKey === todayKey,
        interviews: dayInterviews,
        key: dateKey
      });
    }

    return cells;
  }, [calendarMonth, calendarMap]);

  const calendarMonthLabel = useMemo(() => {
    return new Date(calendarMonth.year, calendarMonth.month, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }, [calendarMonth]);

  const shiftMonth = (delta) => {
    setCalendarMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const jumpToToday = () => {
    const now = new Date();
    setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() });
  };

  const openSingleInterviewModal = (item) => {
    setModalGroup({
      dateLabel: null,
      items: [item],
      activeIndex: 0
    });
  };

  const openDateInterviewsModal = (dateKey, items) => {
    if (!items || items.length === 0) return;
    const [y, m, d] = dateKey.split('-').map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    setModalGroup({
      dateLabel: label,
      items,
      activeIndex: 0
    });
  };

  const activeModalInterview = modalGroup?.items?.[modalGroup.activeIndex] || null;

  const renderInterviewCard = (item, isHistory = false) => {
    const meetUrl = item.meeting_link || item.location_or_link;
    const isLink = meetUrl?.startsWith('http');
    const normalizedMode = (item.mode || 'online').toLowerCase() === 'onsite' ? 'onsite' : 'online';
    const isOnline = normalizedMode === 'online';
    const isMeet = isOnline && (item.meeting_link || meetUrl?.includes('meet.google.com'));

    const schedMs = new Date(item.schedule_at).getTime();
    const diffMins = !isNaN(schedMs) ? Math.ceil((schedMs - nowMs) / 60000) : null;
    const isStartingSoon = !isHistory && item.status === 'scheduled' && diffMins !== null && diffMins > 0 && diffMins <= 60;
    const isWithinFiveMins = !isHistory && item.status === 'scheduled' && diffMins !== null && diffMins >= -2 && diffMins <= 5;

    return (
      <div
        key={item.interview_id}
        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isWithinFiveMins
            ? 'bg-orange-tint/40 border-vibrant-orange shadow-md'
            : 'bg-surface-container-low border-outline-variant hover:border-outline'
        }`}
      >
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <DetailLink
              onClick={() => openSingleInterviewModal(item)}
              className="font-bold text-sm text-on-surface hover:text-vibrant-orange"
            >
              {item.first_name} {item.last_name}
            </DetailLink>

            {item.student_number && (
              <span className="text-xs text-on-surface-variant">({item.student_number})</span>
            )}

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                item.status === 'completed'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : item.status === 'cancelled' || item.status === 'no_show'
                  ? 'bg-surface-container-high text-error border border-error/20'
                  : 'bg-orange-tint text-accent-text border border-brand-teal/30'
              }`}
            >
              {item.status === 'completed' ? 'Done • Completed' : item.status.replace('_', ' ')}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                isOnline
                  ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                  : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
              }`}
            >
              <span className="material-symbols-outlined text-[12px]">
                {isOnline ? 'videocam' : 'business'}
              </span>
              <span>{isOnline ? (isMeet ? 'Online • Google Meet' : 'Online Interview') : 'Onsite Interview'}</span>
            </span>

            {isWithinFiveMins && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-vibrant-orange text-accent-ink animate-pulse">
                <span className="material-symbols-outlined text-[13px]">notifications_active</span>
                <span>{diffMins <= 0 ? 'Starting Now!' : `Starts in ${diffMins}m`}</span>
              </span>
            )}

            {!isWithinFiveMins && isStartingSoon && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <span className="material-symbols-outlined text-[12px]">alarm</span>
                <span>In {diffMins} mins</span>
              </span>
            )}

            {filterType === 'recent' && item.created_at && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container text-on-surface-variant">
                {formatRelativeAdded(item.created_at)}
              </span>
            )}
          </div>

          <p className="text-xs text-on-surface-variant font-medium">
            Applied for: <span className="font-bold text-on-surface">{item.job_title}</span>
            {item.institution_name ? ` • ${item.institution_name}` : ''}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <p className="text-vibrant-orange font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              <span>{formatManilaDateTime(item.schedule_at)} PHT</span>
            </p>
            {!isOnline && item.location_or_link && (
              <span className="text-on-surface-variant flex items-center gap-1 truncate max-w-xs">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                <span className="truncate">{item.location_or_link}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {isLink && item.status === 'scheduled' && (
              <a
                href={meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-vibrant-orange hover:bg-deep-orange text-white font-bold text-xs transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isMeet ? 'video_call' : 'open_in_new'}
                </span>
                <span>Join {isMeet ? 'Google Meet' : 'Meeting'}</span>
              </a>
            )}

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

            <button
              type="button"
              onClick={() => openSingleInterviewModal(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-on-surface font-bold text-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px] text-teal-500">visibility</span>
              <span>View Full Details</span>
            </button>
          </div>
        </div>

        {/* Right Actions: Mark Done -> Moves to History */}
        <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
          {item.status === 'scheduled' && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(item.interview_id, 'completed')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              title="Mark interview as done and move to Interview History"
            >
              <span className="material-symbols-outlined text-[15px]">task_alt</span>
              <span>Mark Done</span>
            </button>
          )}

          <select
            value={item.status}
            onChange={(e) => handleUpdateStatus(item.interview_id, e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-outline-variant bg-surface-container text-on-surface text-xs font-bold cursor-pointer"
          >
            <option value="scheduled">Scheduled</option>
            <option value="completed">Done (Completed)</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Interview Management</h1>
          <p className="text-sm text-on-surface-variant">
            Schedule online or on-site candidate evaluations, inspect calendar dates, and receive 5-minute advance alarms
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 5-Minute Advance Notification Alarm Pill & Audition Trigger */}
          <button
            type="button"
            onClick={handleTestAdvanceAlarm}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-tint text-accent-text border border-brand-teal/30 hover:opacity-90 transition-opacity cursor-pointer"
            title="Click to test the 5-minute advance interview alarm chime and enable desktop notifications"
          >
            <span className="material-symbols-outlined text-[15px] text-vibrant-orange">
              notifications_active
            </span>
            <span>{alarmTested ? 'Alarm Tested!' : '5m Advance Alarm On'}</span>
          </button>

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
        <div className="p-3 bg-green-tint text-pinoy-green rounded-xl text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
            <span className="break-all">{message}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage('')}
            className="text-pinoy-green/70 hover:text-pinoy-green p-0.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Schedule New Interview Form (lg:col-span-4) */}
        <div className="lg:col-span-4 bento-card space-y-4">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange text-[22px]">calendar_add_on</span>
            <span>Schedule New Interview</span>
          </h2>

          <form onSubmit={handleSchedule} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">
                Select Candidate
              </label>
              <select
                required
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none"
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
              <label className="block font-bold text-on-surface-variant uppercase mb-1">
                Date &amp; Time
              </label>
              <input
                type="datetime-local"
                required
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none"
              />
              <span className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[12px] text-vibrant-orange">alarm</span>
                <span>System automatically triggers an alarm 5 minutes before start</span>
              </span>
            </div>

            {/* Interview Mode: Online Video & On-Site ONLY (Phone Interview removed) */}
            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">
                Interview Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'online', label: 'Online Interview', icon: 'videocam' },
                  { id: 'onsite', label: 'Onsite Interview', icon: 'business' }
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
                    className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      mode === item.id
                        ? 'border-vibrant-orange bg-orange-tint text-accent-text shadow-xs'
                        : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {mode === 'online' && (
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-on-surface text-xs flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-vibrant-orange text-[16px]">
                      video_call
                    </span>
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
                      <span className="material-symbols-outlined text-vibrant-orange text-[16px] shrink-0 mt-0.5">
                        smart_toy
                      </span>
                      <div>
                        <p className="font-semibold text-on-surface">Automated Google Meet Space</p>
                        <p className="mt-0.5">
                          A dedicated Google Meet room will be generated automatically upon dispatching the invitation.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Optional: pre-generated link will show here"
                        value={locLink}
                        onChange={(e) => setLocLink(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container text-on-surface outline-none"
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
                    <label className="block font-bold text-on-surface-variant uppercase text-[10px] mb-1">
                      Custom Meeting Link (Zoom, Teams, etc.)
                    </label>
                    <input
                      type="url"
                      required={!autoGenerateMeet}
                      placeholder="https://zoom.us/j/... or https://teams.microsoft.com/..."
                      value={locLink}
                      onChange={(e) => setLocLink(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-on-surface outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {mode === 'onsite' && (
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">
                  Office Location / Room
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5th Floor Conference Room, Ayala Ave, Makati"
                  value={locLink}
                  onChange={(e) => setLocLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">
                Instructions / Agenda Notes
              </label>
              <textarea
                rows="3"
                placeholder="Prepare portfolio, capstone demo, dress code, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-vibrant-orange text-white font-bold rounded-xl hover:bg-deep-orange transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>Send Interview Invitation</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Scheduled Candidate Interviews (Calendar + List) & History Tab (lg:col-span-8) */}
        <div className="lg:col-span-8 bento-card space-y-5">
          {/* Primary Section Tabs: Scheduled Candidate Interviews vs Interview History */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('scheduled')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'scheduled'
                    ? 'bg-vibrant-orange text-accent-ink shadow-xs'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                <span>Scheduled Candidate Interviews</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black/10">
                  {scheduledList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-vibrant-orange text-accent-ink shadow-xs'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
                <span>Interview History</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black/10">
                  {historyCompletedList.length}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={fetchInterviews}
              className="self-end sm:self-auto p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              title="Refresh interviews"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>

          {/* Filter Bar: All, Recent Added, Online Interview, Onsite Interview */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mr-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">filter_list</span>
                <span>Filter:</span>
              </span>

              {[
                { id: 'all', label: 'All Interviews', icon: 'apps' },
                { id: 'recent', label: 'Recent Added', icon: 'new_releases' },
                { id: 'online', label: 'Online Interview', icon: 'videocam' },
                { id: 'onsite', label: 'Onsite Interview', icon: 'business' }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    filterType === f.id
                      ? 'bg-orange-tint text-accent-text border-brand-teal/50 shadow-2xs'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{f.icon}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>

            {activeTab === 'history' && historyAllList.length > historyCompletedList.length && (
              <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl text-[11px]">
                <button
                  type="button"
                  onClick={() => setHistorySubFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    historySubFilter === 'completed'
                      ? 'bg-surface text-on-surface shadow-2xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  Done Only ({historyCompletedList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistorySubFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    historySubFilter === 'all'
                      ? 'bg-surface text-on-surface shadow-2xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  All Concluded ({historyAllList.length})
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-10 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : activeTab === 'scheduled' ? (
            <div className="space-y-5">
              {/* INTERACTIVE SCHEDULED INTERVIEWS CALENDAR WITH DATE MARKINGS */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant space-y-3">
                {/* Calendar Month Controls & Legend */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-vibrant-orange text-[20px]">
                      event_note
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-on-surface">
                      {calendarMonthLabel}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold text-on-surface-variant">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                        <span>Online</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-vibrant-orange" />
                        <span>Onsite</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => shiftMonth(-1)}
                        className="p-1.5 rounded-lg bg-surface hover:bg-surface-container-high border border-outline-variant text-on-surface cursor-pointer"
                        title="Previous Month"
                      >
                        <span className="material-symbols-outlined text-[18px] block">chevron_left</span>
                      </button>
                      <button
                        type="button"
                        onClick={jumpToToday}
                        className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-container-high border border-outline-variant text-[11px] font-bold text-on-surface cursor-pointer"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => shiftMonth(1)}
                        className="p-1.5 rounded-lg bg-surface hover:bg-surface-container-high border border-outline-variant text-on-surface cursor-pointer"
                        title="Next Month"
                      >
                        <span className="material-symbols-outlined text-[18px] block">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Day Cells */}
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarCells.map((cell) => {
                    if (cell.empty) {
                      return <div key={cell.key} className="min-h-[62px] sm:min-h-[78px] rounded-xl bg-transparent" />;
                    }

                    const hasInterviews = cell.interviews.length > 0;
                    const hasOnline = cell.interviews.some(
                      (i) => (i.mode || 'online').toLowerCase() === 'online'
                    );
                    const hasOnsite = cell.interviews.some(
                      (i) => (i.mode || '').toLowerCase() === 'onsite'
                    );

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        disabled={!hasInterviews}
                        onClick={() => openDateInterviewsModal(cell.dateKey, cell.interviews)}
                        title={
                          hasInterviews
                            ? `${cell.interviews.length} scheduled interview(s) — Click to view full info`
                            : undefined
                        }
                        className={`min-h-[62px] sm:min-h-[78px] p-1.5 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          hasInterviews
                            ? 'bg-orange-tint/45 dark:bg-brand-teal/15 border-vibrant-orange/70 hover:border-vibrant-orange hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                            : cell.isToday
                            ? 'bg-surface border-teal-500/60 cursor-default'
                            : 'bg-surface/60 border-outline-variant/60 cursor-default'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span
                            className={`text-xs font-bold leading-none ${
                              cell.isToday
                                ? 'px-1.5 py-0.5 rounded-md bg-teal-500 text-white'
                                : hasInterviews
                                ? 'text-on-surface font-extrabold'
                                : 'text-on-surface-variant'
                            }`}
                          >
                            {cell.day}
                          </span>

                          {hasInterviews && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-vibrant-orange text-accent-ink leading-none">
                              {cell.interviews.length}
                            </span>
                          )}
                        </div>

                        {hasInterviews && (
                          <div className="space-y-1 w-full mt-1 overflow-hidden">
                            {/* Desktop preview pill */}
                            <div className="hidden sm:block space-y-0.5">
                              {cell.interviews.slice(0, 2).map((iv) => {
                                const ivOnline = (iv.mode || 'online').toLowerCase() === 'online';
                                return (
                                  <div
                                    key={iv.interview_id}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate ${
                                      ivOnline
                                        ? 'bg-teal-500/20 text-teal-800 dark:text-teal-200'
                                        : 'bg-amber-500/25 text-amber-900 dark:text-amber-200'
                                    }`}
                                  >
                                    {formatManilaTimeShort(iv.schedule_at)} • {iv.first_name}
                                  </div>
                                );
                              })}
                              {cell.interviews.length > 2 && (
                                <span className="text-[9px] font-bold text-accent-text block pl-1">
                                  +{cell.interviews.length - 2} more
                                </span>
                              )}
                            </div>

                            {/* Mobile compact marker dots */}
                            <div className="flex sm:hidden items-center gap-1 pt-1">
                              {hasOnline && <span className="w-2 h-2 rounded-full bg-teal-500" />}
                              {hasOnsite && <span className="w-2 h-2 rounded-full bg-vibrant-orange" />}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5 pt-1">
                  <span className="material-symbols-outlined text-[15px] text-teal-500">touch_app</span>
                  <span>Press any highlighted date on the calendar to pop up full interview details.</span>
                </p>
              </div>

              {/* Filtered Scheduled Interviews List */}
              {visibleScheduled.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant text-xs bg-surface-container-low rounded-2xl border border-outline-variant/60">
                  <span className="material-symbols-outlined text-[34px] mb-1.5 text-on-surface-variant/60">
                    event_busy
                  </span>
                  <p className="font-semibold text-on-surface">No active scheduled interviews match this filter.</p>
                  <p className="mt-0.5">Schedule an interview on the left or check the Interview History tab for completed sessions.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-on-surface-variant">
                      {filterType === 'recent'
                        ? `Recently Added Scheduled Interviews (${visibleScheduled.length})`
                        : `Upcoming Scheduled List (${visibleScheduled.length})`}
                    </span>
                  </div>
                  {visibleScheduled.map((item) => renderInterviewCard(item, false))}
                </div>
              )}
            </div>
          ) : (
            /* INTERVIEW HISTORY TAB (All Done / Completed Interviews) */
            <div className="space-y-3">
              {visibleHistory.length === 0 ? (
                <div className="text-center py-10 text-on-surface-variant text-xs bg-surface-container-low rounded-2xl border border-outline-variant/60">
                  <span className="material-symbols-outlined text-[36px] mb-2 text-on-surface-variant/60">
                    history
                  </span>
                  <p className="font-semibold text-on-surface">No completed interviews in history yet.</p>
                  <p className="mt-1">
                    Once an interview is marked as <strong>Done</strong>, it automatically moves here for permanent record-keeping.
                  </p>
                </div>
              ) : (
                visibleHistory.map((item) => renderInterviewCard(item, true))
              )}
            </div>
          )}
        </div>
      </div>

      {/* FULL INFO POP-UP MODAL (Triggered from Calendar Marked Dates or Interview Cards) */}
      {modalGroup && activeModalInterview && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setModalGroup(null)}
        >
          <div
            className="bg-surface text-on-surface border border-outline-variant rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Optional Multi-Interview Date Switcher when user pressed a Calendar Date with >1 interviews */}
            {modalGroup.dateLabel && (
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-vibrant-orange">
                      calendar_today
                    </span>
                    <span>{modalGroup.dateLabel}</span>
                  </span>
                  <span className="text-[11px] font-bold text-accent-text">
                    {modalGroup.items.length} Interview{modalGroup.items.length > 1 ? 's' : ''}
                  </span>
                </div>

                {modalGroup.items.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {modalGroup.items.map((iv, idx) => (
                      <button
                        key={iv.interview_id}
                        type="button"
                        onClick={() => setModalGroup((prev) => ({ ...prev, activeIndex: idx }))}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer border ${
                          modalGroup.activeIndex === idx
                            ? 'bg-vibrant-orange text-accent-ink border-vibrant-orange'
                            : 'bg-surface text-on-surface-variant border-outline-variant hover:text-on-surface'
                        }`}
                      >
                        {formatManilaTimeShort(iv.schedule_at)} • {iv.first_name} {iv.last_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-outline-variant pb-3 gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                      activeModalInterview.status === 'completed'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : activeModalInterview.status === 'cancelled' || activeModalInterview.status === 'no_show'
                        ? 'bg-surface-container-high text-error'
                        : 'bg-orange-tint text-accent-text'
                    }`}
                  >
                    {activeModalInterview.status === 'completed'
                      ? 'Done • Completed'
                      : activeModalInterview.status.replace('_', ' ')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-bold uppercase text-[10px]">
                    {(activeModalInterview.mode || 'online').toLowerCase() === 'onsite'
                      ? 'Onsite Interview'
                      : 'Online Interview'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-on-surface mt-1.5">
                  {activeModalInterview.first_name} {activeModalInterview.last_name}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Applied for <strong className="text-on-surface">{activeModalInterview.job_title}</strong>
                  {activeModalInterview.institution_name ? ` • ${activeModalInterview.institution_name}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalGroup(null)}
                className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Full Candidate & Schedule Metadata */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 bg-surface-container rounded-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                    Scheduled Date &amp; Time
                  </span>
                  <span className="font-bold text-vibrant-orange">
                    {formatManilaDateTime(activeModalInterview.schedule_at)} PHT
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                    Student ID Number
                  </span>
                  <span className="font-semibold text-on-surface font-mono">
                    {activeModalInterview.student_number || 'N/A'}
                  </span>
                </div>
                {activeModalInterview.program_name && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                      Degree Program
                    </span>
                    <span className="font-semibold text-on-surface">
                      {activeModalInterview.program_name}
                    </span>
                  </div>
                )}
                {activeModalInterview.student_email && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                      Candidate Email
                    </span>
                    <span className="font-semibold text-on-surface break-all">
                      {activeModalInterview.student_email}
                    </span>
                  </div>
                )}
                {activeModalInterview.contact_number && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                      Contact Number
                    </span>
                    <span className="font-semibold text-on-surface">
                      {activeModalInterview.contact_number}
                    </span>
                  </div>
                )}
                {activeModalInterview.created_at && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                      Date Added
                    </span>
                    <span className="font-semibold text-on-surface">
                      {formatManilaDateTime(activeModalInterview.created_at)}
                    </span>
                  </div>
                )}
              </div>

              {/* Meeting Link or Physical Location */}
              <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-2">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                  {(activeModalInterview.mode || 'online').toLowerCase() === 'onsite'
                    ? 'Onsite Office Location / Room'
                    : 'Online Video Meeting Room'}
                </span>
                <p className="font-medium text-xs text-on-surface break-all">
                  {activeModalInterview.meeting_link ||
                    activeModalInterview.location_or_link ||
                    'No specific location provided'}
                </p>

                {(activeModalInterview.meeting_link || activeModalInterview.location_or_link)?.startsWith(
                  'http'
                ) && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <a
                      href={activeModalInterview.meeting_link || activeModalInterview.location_or_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-vibrant-orange text-white font-bold rounded-xl text-xs hover:bg-deep-orange transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">video_call</span>
                      <span>Open Meeting Room</span>
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyLink(
                          activeModalInterview.meeting_link || activeModalInterview.location_or_link,
                          activeModalInterview.interview_id
                        )
                      }
                      className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-xl font-bold text-xs text-on-surface transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {copiedId === activeModalInterview.interview_id ? 'check' : 'content_copy'}
                      </span>
                      <span>
                        {copiedId === activeModalInterview.interview_id ? 'Copied' : 'Copy Link'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Agenda / Instructions Notes */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                  Instructions / Agenda Notes
                </span>
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/60 text-on-surface leading-relaxed whitespace-pre-wrap">
                  {activeModalInterview.notes || 'No additional instructions provided.'}
                </div>
              </div>

              {/* Status Controls inside Modal */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant">Status:</span>
                  <select
                    value={activeModalInterview.status}
                    onChange={(e) =>
                      handleUpdateStatus(activeModalInterview.interview_id, e.target.value)
                    }
                    className="px-3 py-1.5 rounded-xl border border-outline-variant bg-surface-container text-on-surface text-xs font-bold cursor-pointer"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Done (Completed)</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>

                {activeModalInterview.status === 'scheduled' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStatus(activeModalInterview.interview_id, 'completed')
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">task_alt</span>
                    <span>Mark Interview as Done</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setModalGroup(null)}
                className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer"
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
