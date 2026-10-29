import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function formatTime12(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':').map(Number);
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function StudentSchedule() {
  const [data, setData] = useState({
    activeOjt: null,
    standardSchedule: { start_time: '08:00', finish_time: '17:00' },
    dailySchedules: [],
    scheduleRequests: [],
    attendanceLogs: []
  });
  const [loading, setLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [filterType, setFilterType] = useState('all'); // 'all' | 'custom' | 'attended' | 'requests'
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modals state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [activeDayModal, setActiveDayModal] = useState(null);

  // Request form state
  const [requestDate, setRequestDate] = useState(() => toManilaDateKey(new Date()));
  const [requestStartTime, setRequestStartTime] = useState('08:00');
  const [requestFinishTime, setRequestFinishTime] = useState('17:00');
  const [requestReason, setRequestReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Fetch Student Schedule Data
  const fetchScheduleData = useCallback(async () => {
    try {
      setLoading(true);
      const queryMonth = calendarMonth.month + 1;
      const queryYear = calendarMonth.year;
      const res = await api.get(`/student/schedule?month=${queryMonth}&year=${queryYear}`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching student schedule:', err);
      setErrorMessage(err.message || 'Could not load work schedule.');
    } finally {
      setLoading(false);
    }
  }, [calendarMonth]);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  useRealtimeRefresh(fetchScheduleData);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(''), 6000);
      return () => clearTimeout(t);
    }
  }, [message]);

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(''), 7000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  // Navigation
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

  const calendarMonthLabel = useMemo(() => {
    return new Date(calendarMonth.year, calendarMonth.month, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }, [calendarMonth]);

  // Map daily items by dateKey (YYYY-MM-DD)
  const calendarMap = useMemo(() => {
    const map = {};
    const { dailySchedules, attendanceLogs, scheduleRequests } = data;

    (dailySchedules || []).forEach((ds) => {
      const key = ds.schedule_date_str || toManilaDateKey(ds.schedule_date);
      if (!map[key]) map[key] = { schedule: null, attendance: null, requests: [] };
      map[key].schedule = ds;
    });

    (attendanceLogs || []).forEach((att) => {
      const key = att.log_date_str || toManilaDateKey(att.log_date);
      if (!map[key]) map[key] = { schedule: null, attendance: null, requests: [] };
      map[key].attendance = att;
    });

    (scheduleRequests || []).forEach((sr) => {
      const key = sr.schedule_date_str || toManilaDateKey(sr.schedule_date);
      if (!map[key]) map[key] = { schedule: null, attendance: null, requests: [] };
      map[key].requests.push(sr);
    });

    return map;
  }, [data]);

  // Compute calendar cells
  const calendarCells = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ empty: true, key: `pad-${i}` });
    }

    const todayKey = toManilaDateKey(new Date());

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = calendarMap[dateKey] || { schedule: null, attendance: null, requests: [] };
      cells.push({
        empty: false,
        day,
        dateKey,
        isToday: dateKey === todayKey,
        schedule: dayData.schedule,
        attendance: dayData.attendance,
        requests: dayData.requests,
        key: dateKey
      });
    }

    return cells;
  }, [calendarMonth, calendarMap]);

  // Open Request Modal
  const handleOpenRequestModal = (targetDate = null) => {
    const d = targetDate || toManilaDateKey(new Date());
    setRequestDate(d);
    setRequestStartTime('08:00');
    setRequestFinishTime('17:00');
    setRequestReason('');
    setIsRequestModalOpen(true);
  };

  // Submit Request
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!requestDate) {
      setErrorMessage('Please select a date for your schedule request.');
      return;
    }
    if (!requestStartTime || !requestFinishTime) {
      setErrorMessage('Please provide both requested start and finish times.');
      return;
    }

    try {
      setIsSubmittingRequest(true);
      const res = await api.post('/student/schedule-requests', {
        schedule_date: requestDate,
        requested_start_time: requestStartTime,
        requested_finish_time: requestFinishTime,
        reason: requestReason
      });

      if (res.success) {
        setMessage(res.message || 'Schedule request submitted to your workplace mentor!');
        setIsRequestModalOpen(false);
        await fetchScheduleData();
      } else {
        setErrorMessage(res.message || 'Failed to submit request.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error submitting schedule request.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Day Cell click
  const handleOpenDayModal = (cell) => {
    if (cell.empty) return;
    setActiveDayModal({
      dateKey: cell.dateKey,
      day: cell.day,
      schedule: cell.schedule,
      attendance: cell.attendance,
      requests: cell.requests
    });
  };

  const activeMentorName = data.activeOjt
    ? (data.activeOjt.mentor_first_name
        ? `${data.activeOjt.mentor_first_name} ${data.activeOjt.mentor_last_name}`
        : (data.activeOjt.supervisor_name || 'Assigned Workplace Mentor'))
    : 'Workplace Mentor';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header Card */}
      <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange text-2xl">
                calendar_month
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
                My Work Schedule & Daily Shifts
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant font-medium">
              View your standard daily work hours, mentor custom schedule overrides, and request schedule adjustments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenRequestModal()}
            className="px-4 py-2.5 rounded-xl bg-vibrant-orange text-accent-ink text-xs sm:text-sm font-extrabold flex items-center gap-2 hover:opacity-95 shadow-md transition-all cursor-pointer self-start lg:self-auto"
          >
            <span className="material-symbols-outlined text-base">schedule_send</span>
            <span>Request Schedule Update</span>
          </button>
        </div>

        {/* Quick Info Strip */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-outline-variant/60">
          <div className="p-3 rounded-2xl bg-surface border border-outline-variant">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
              Standard Daily Schedule
            </div>
            <div className="text-sm font-black text-on-surface mt-0.5">
              {formatTime12(data.standardSchedule?.start_time || '08:00')} - {formatTime12(data.standardSchedule?.finish_time || '17:00')}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface border border-outline-variant">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
              Workplace Mentor
            </div>
            <div className="text-sm font-black text-on-surface mt-0.5 truncate">
              {activeMentorName}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface border border-outline-variant">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
              Host Organization
            </div>
            <div className="text-sm font-black text-on-surface mt-0.5 truncate">
              {data.activeOjt?.organization_name || 'Hiring Organization'}
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {[
            { id: 'all', label: 'All Days', icon: 'grid_view' },
            { id: 'custom', label: 'Mentor Overrides', icon: 'tune' },
            { id: 'attended', label: 'Attended Shifts', icon: 'verified' },
            { id: 'requests', label: 'My Requests', icon: 'front_hand' }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                filterType === f.id
                  ? 'bg-orange-tint text-accent-text border-brand-teal/50 shadow-2xs'
                  : 'bg-surface text-on-surface-variant border-outline-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-200 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-fadeIn">
          <span className="material-symbols-outlined text-teal-600">check_circle</span>
          <span>{message}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-error/10 border border-error/30 text-error text-xs sm:text-sm font-semibold flex items-center gap-2 animate-fadeIn">
          <span className="material-symbols-outlined text-error">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* MAIN CALENDAR CARD (Matching OrgInterviews calendar design) */}
      <div className="p-4 sm:p-6 rounded-3xl bg-surface-container-low border border-outline-variant space-y-4">
        {/* Month Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-vibrant-orange text-2xl">
              event_note
            </span>
            <h2 className="font-black text-base sm:text-xl text-on-surface">
              {calendarMonthLabel}
            </h2>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span>Mentor Custom Shift</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Attended Shift</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Pending Request</span>
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="p-2 rounded-xl bg-surface hover:bg-surface-container-high border border-outline-variant text-on-surface cursor-pointer"
                title="Previous Month"
              >
                <span className="material-symbols-outlined text-sm block">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={jumpToToday}
                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="p-2 rounded-xl bg-surface hover:bg-surface-container-high border border-outline-variant text-on-surface cursor-pointer"
                title="Next Month"
              >
                <span className="material-symbols-outlined text-sm block">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Weekdays Header */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-on-surface-variant py-1.5"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-vibrant-orange border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarCells.map((cell) => {
              if (cell.empty) {
                return (
                  <div
                    key={cell.key}
                    className="min-h-[80px] sm:min-h-[110px] rounded-2xl bg-transparent"
                  />
                );
              }

              const hasCustom = Boolean(cell.schedule);
              const hasAttendance = Boolean(cell.attendance);
              const hasPendingRequest = (cell.requests || []).some((r) => r.status === 'pending');
              const hasPendingOvertime = cell.attendance?.overtime_status === 'pending_approval';

              let isDimmed = false;
              if (filterType === 'custom' && !hasCustom) isDimmed = true;
              if (filterType === 'attended' && !hasAttendance) isDimmed = true;
              if (filterType === 'requests' && !hasPendingRequest) isDimmed = true;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => handleOpenDayModal(cell)}
                  className={`min-h-[80px] sm:min-h-[110px] p-2 sm:p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isDimmed
                      ? 'opacity-35 bg-surface/40 border-outline-variant/40'
                      : hasCustom
                      ? 'bg-teal-500/10 border-teal-500/60 hover:border-teal-500'
                      : hasPendingOvertime
                      ? 'bg-amber-500/10 border-amber-500/60 hover:border-amber-500'
                      : hasPendingRequest
                      ? 'bg-purple-500/10 border-purple-500/60 hover:border-purple-500'
                      : cell.isToday
                      ? 'bg-surface border-vibrant-orange/70 shadow-2xs'
                      : 'bg-surface/80 border-outline-variant hover:border-outline hover:bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span
                      className={`text-xs font-black leading-none ${
                        cell.isToday
                          ? 'px-2 py-1 rounded-lg bg-vibrant-orange text-accent-ink'
                          : 'text-on-surface'
                      }`}
                    >
                      {cell.day}
                    </span>

                    <div className="flex items-center gap-1">
                      {hasPendingRequest && (
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-purple-500"
                          title="Pending Schedule Request"
                        />
                      )}
                      {hasPendingOvertime && (
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"
                          title="Overtime Pending Mentor Review"
                        />
                      )}
                    </div>
                  </div>

                  {/* Day Content Badges */}
                  <div className="space-y-1 w-full mt-1.5 overflow-hidden">
                    {/* Shift Pill */}
                    {hasCustom ? (
                      <div className="px-1.5 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-300 text-[10px] font-extrabold truncate">
                        Custom: {formatTime12(cell.schedule.start_time)} - {formatTime12(cell.schedule.finish_time)}
                      </div>
                    ) : (
                      <div className="hidden sm:block text-[10px] font-semibold text-on-surface-variant/80 truncate">
                        08:00 AM - 05:00 PM
                      </div>
                    )}

                    {/* Attendance Pill */}
                    {hasAttendance && (
                      <div
                        className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold truncate ${
                          hasPendingOvertime
                            ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {hasPendingOvertime ? (
                          <span>OT: +{cell.attendance.overtime_hours}h Pending</span>
                        ) : (
                          <span>
                            Attended: {cell.attendance.hours_rendered || 0}h
                          </span>
                        )}
                      </div>
                    )}

                    {/* Pending Request Pill */}
                    {hasPendingRequest && (
                      <div className="px-1.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-800 dark:text-purple-300 text-[9px] sm:text-[10px] font-bold truncate">
                        Request: {formatTime12(cell.requests[0].requested_start_time)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: REQUEST SCHEDULE UPDATE FORM                                    */}
      {/* ========================================================================= */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-scrim/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-3xl border border-outline-variant p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <div>
                <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange">schedule_send</span>
                  <span>Request Schedule Update</span>
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Submit a requested shift adjustment to your workplace mentor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1 rounded-xl text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-on-surface">Target Schedule Date</label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-xs font-bold text-on-surface focus:outline-hidden focus:border-vibrant-orange cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-on-surface">Requested Start Time</label>
                  <input
                    type="time"
                    value={requestStartTime}
                    onChange={(e) => setRequestStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-xs font-bold text-on-surface focus:outline-hidden focus:border-vibrant-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-on-surface">Requested Finish Time</label>
                  <input
                    type="time"
                    value={requestFinishTime}
                    onChange={(e) => setRequestFinishTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-xs font-bold text-on-surface focus:outline-hidden focus:border-vibrant-orange"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-on-surface">Reason / Mentor Instruction</label>
                <textarea
                  rows="3"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="e.g. My mentor Denmark instructed me to cover the afternoon-to-evening shift 1:00 PM - 9:00 PM today."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-xs font-medium text-on-surface focus:outline-hidden focus:border-vibrant-orange"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-5 py-2.5 rounded-xl bg-vibrant-orange text-accent-ink text-xs font-black shadow-md hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingRequest ? 'Submitting...' : 'Send Request to Mentor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DAY DETAILS & ATTENDANCE INSPECTION                              */}
      {/* ========================================================================= */}
      {activeDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-scrim/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-3xl border border-outline-variant p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-vibrant-orange">
                  Shift Information
                </span>
                <h3 className="text-lg sm:text-xl font-black text-on-surface">
                  {new Date(activeDayModal.dateKey + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDayModal(null)}
                className="p-1 rounded-xl text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Scheduled Shift */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
                Scheduled Working Hours
              </div>
              {activeDayModal.schedule ? (
                <div className="space-y-1">
                  <div className="text-sm font-black text-teal-800 dark:text-teal-300">
                    Custom Shift: {formatTime12(activeDayModal.schedule.start_time)} - {formatTime12(activeDayModal.schedule.finish_time)}
                  </div>
                  {activeDayModal.schedule.notes && (
                    <div className="text-xs text-on-surface-variant italic">
                      Mentor note: "{activeDayModal.schedule.notes}"
                    </div>
                  )}
                  <div className="text-[10px] font-bold text-teal-700 dark:text-teal-400">
                    Set by Workplace Mentor
                  </div>
                </div>
              ) : (
                <div className="text-sm font-black text-on-surface">
                  Standard Shift: 08:00 AM - 05:00 PM
                </div>
              )}
            </div>

            {/* Attendance Record */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
                Attendance Record
              </div>
              {activeDayModal.attendance ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Time-In:</span>
                    <span className="font-bold text-on-surface">
                      {formatTime12(activeDayModal.attendance.time_in) || 'N/A'} ({activeDayModal.attendance.time_in_status === 'on_time' ? 'On-Time' : 'Late'})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Time-Out:</span>
                    <span className="font-bold text-on-surface">
                      {formatTime12(activeDayModal.attendance.time_out) || 'Open / Currently Clocked In'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-outline-variant">
                    <span className="text-on-surface-variant">Hours Credited:</span>
                    <span className="font-extrabold text-vibrant-orange text-sm">
                      {activeDayModal.attendance.hours_rendered || 0} hrs
                    </span>
                  </div>

                  {activeDayModal.attendance.overtime_status === 'pending_approval' && (
                    <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold">
                      Overtime Claimed: <span className="font-bold">+{activeDayModal.attendance.overtime_hours} hrs</span> (Pending workplace mentor review & approval).
                    </div>
                  )}

                  {activeDayModal.attendance.overtime_status === 'approved' && (
                    <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                      Overtime Approved (+{activeDayModal.attendance.overtime_hours} hrs credited to total OJT).
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant italic">
                  No attendance logged on this date.
                </p>
              )}
            </div>

            {/* Requests on this date */}
            {activeDayModal.requests.length > 0 && (
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-200">
                  Your Schedule Update Request
                </div>
                {activeDayModal.requests.map((r) => (
                  <div key={r.request_id} className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-on-surface">
                        {formatTime12(r.requested_start_time)} - {formatTime12(r.requested_finish_time)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          r.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-700'
                            : r.status === 'rejected'
                            ? 'bg-error/20 text-error'
                            : 'bg-purple-500/20 text-purple-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    {r.reason && (
                      <p className="text-on-surface-variant italic">"{r.reason}"</p>
                    )}
                    {r.mentor_notes && (
                      <p className="text-teal-800 dark:text-teal-300 font-medium">Mentor reply: "{r.mentor_notes}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  const target = activeDayModal.dateKey;
                  setActiveDayModal(null);
                  handleOpenRequestModal(target);
                }}
                className="px-3.5 py-2 rounded-xl bg-orange-tint text-accent-text border border-brand-teal/40 text-xs font-bold hover:bg-orange-tint/70 cursor-pointer"
              >
                Request Schedule Update for this Day
              </button>

              <button
                type="button"
                onClick={() => setActiveDayModal(null)}
                className="px-4 py-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high cursor-pointer"
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

