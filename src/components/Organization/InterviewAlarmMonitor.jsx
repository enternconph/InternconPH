import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { playInterviewAlarm } from '../../utils/audio';

const RUNG_STORAGE_KEY = 'interncon_interview_alarm_rung_v1';
const DISMISSED_STORAGE_KEY = 'interncon_interview_alarm_dismissed_v1';
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const GRACE_AFTER_START_MS = 2 * 60 * 1000;

function readKeyMap(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeKeyMap(storageKey, mapObj) {
  try {
    // Prune entries older than 24h so storage stays tiny
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const cleaned = {};
    Object.entries(mapObj).forEach(([k, ts]) => {
      if (typeof ts === 'number' && ts > cutoff) {
        cleaned[k] = ts;
      }
    });
    localStorage.setItem(storageKey, JSON.stringify(cleaned));
  } catch (_) {}
}

function formatCountdown(diffMs) {
  if (diffMs <= 0) return 'Starting Now!';
  const totalSec = Math.ceil(diffMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function InterviewAlarmMonitor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scheduledInterviews, setScheduledInterviews] = useState([]);
  const [activeAlarms, setActiveAlarms] = useState([]);

  const role = user?.role_name || user?.role || '';
  const isOrgHR = ['hiring_organization', 'hr_staff', 'org_admin'].includes(role);

  const fetchScheduled = useCallback(async () => {
    if (!isOrgHR) return;
    try {
      const res = await api.get('/org/interviews');
      if (res?.success && res?.data?.interviews) {
        const upcoming = res.data.interviews.filter((i) => i.status === 'scheduled' && i.schedule_at);
        setScheduledInterviews(upcoming);
      }
    } catch (_) {}
  }, [isOrgHR]);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  useRealtimeRefresh(fetchScheduled);

  useEffect(() => {
    const onInterviewsChanged = () => fetchScheduled();
    window.addEventListener('interncon:interviews-changed', onInterviewsChanged);
    return () => window.removeEventListener('interncon:interviews-changed', onInterviewsChanged);
  }, [fetchScheduled]);

  useEffect(() => {
    if (!isOrgHR || scheduledInterviews.length === 0) {
      setActiveAlarms([]);
      return;
    }

    const evaluateAlarms = () => {
      const now = Date.now();
      const rungMap = readKeyMap(RUNG_STORAGE_KEY);
      const dismissedMap = readKeyMap(DISMISSED_STORAGE_KEY);
      let rungUpdated = false;
      const dueList = [];

      scheduledInterviews.forEach((item) => {
        const schedMs = new Date(item.schedule_at).getTime();
        if (isNaN(schedMs)) return;

        const diffMs = schedMs - now;
        const alarmKey = `${item.interview_id}_${schedMs}`;

        if (dismissedMap[alarmKey]) return;

        if (diffMs <= FIVE_MINUTES_MS && diffMs >= -GRACE_AFTER_START_MS) {
          dueList.push({ ...item, diffMs, alarmKey });

          if (!rungMap[alarmKey]) {
            rungMap[alarmKey] = now;
            rungUpdated = true;

            // 1. Audible 3-pulse desk-bell alarm
            playInterviewAlarm(0.55);

            // 2. OS / Browser Desktop Notification if permitted
            try {
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                const candName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Candidate';
                const minsLeft = Math.max(1, Math.ceil(diffMs / 60000));
                new Notification(`⏰ Interview in ${minsLeft} Minute${minsLeft === 1 ? '' : 's'}!`, {
                  body: `${candName} — ${item.job_title} (${(item.mode || 'online').toUpperCase()})`,
                  icon: '/logo.png',
                  tag: `interview-5m-${alarmKey}`
                });
              }
            } catch (_) {}
          }
        }
      });

      if (rungUpdated) {
        writeKeyMap(RUNG_STORAGE_KEY, rungMap);
      }

      setActiveAlarms(dueList);
    };

    evaluateAlarms();
    const timer = setInterval(evaluateAlarms, 1000);
    return () => clearInterval(timer);
  }, [isOrgHR, scheduledInterviews]);

  const handleDismissAlarm = (alarmKey) => {
    const dismissedMap = readKeyMap(DISMISSED_STORAGE_KEY);
    dismissedMap[alarmKey] = Date.now();
    writeKeyMap(DISMISSED_STORAGE_KEY, dismissedMap);
    setActiveAlarms((prev) => prev.filter((a) => a.alarmKey !== alarmKey));
  };

  if (!isOrgHR || activeAlarms.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[90] w-[min(calc(100vw-2rem),25rem)] space-y-3 pointer-events-none">
      {activeAlarms.map((alarm) => {
        const meetUrl = alarm.meeting_link || alarm.location_or_link;
        const isOnlineLink = alarm.mode === 'online' && meetUrl && meetUrl.startsWith('http');
        const candName = `${alarm.first_name || ''} ${alarm.last_name || ''}`.trim();

        return (
          <div
            key={alarm.alarmKey}
            role="alert"
            className="pointer-events-auto rounded-2xl bg-surface border-2 border-vibrant-orange shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300"
          >
            {/* Urgent Alarm Header */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-vibrant-orange to-deep-orange text-accent-ink flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[20px] animate-bounce">
                  notifications_active
                </span>
                <span className="text-xs font-black uppercase tracking-wider truncate">
                  5-Min Advance Interview Alarm
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-black/15 font-mono text-xs font-extrabold shrink-0">
                {formatCountdown(alarm.diffMs)}
              </span>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 text-xs">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-on-surface">{candName}</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-container text-on-surface-variant">
                    {alarm.mode === 'onsite' ? 'Onsite Interview' : 'Online Interview'}
                  </span>
                </div>
                <p className="text-on-surface-variant mt-0.5">
                  Position: <strong className="text-on-surface">{alarm.job_title}</strong>
                </p>
                <p className="text-[11px] font-semibold text-vibrant-orange mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  <span>
                    {new Date(alarm.schedule_at).toLocaleTimeString('en-US', {
                      timeZone: 'Asia/Manila',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}{' '}
                    PHT
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {isOnlineLink && (
                  <a
                    href={meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">video_call</span>
                    <span>Join Meet</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigate(`/dashboard/organization/interviews?inspectId=${alarm.interview_id}`);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">visibility</span>
                  <span>Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDismissAlarm(alarm.alarmKey)}
                  className="py-2 px-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-bold transition-colors cursor-pointer"
                  title="Dismiss alarm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

