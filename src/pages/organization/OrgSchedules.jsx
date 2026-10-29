import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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

export default function OrgSchedules() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({
    interns: [],
    dailySchedules: [],
    scheduleRequests: [],
    pendingOvertimeLogs: [],
    attendanceLogs: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState('all');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [filterType, setFilterType] = useState('all'); // 'all' | 'custom' | 'overtime' | 'requests'
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Calendar direct multi-date selection mode
  const [isCalendarSelectMode, setIsCalendarSelectMode] = useState(false);

  // Modals state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isPendingQueueOpen, setIsPendingQueueOpen] = useState(false);
  const [activeDayModal, setActiveDayModal] = useState(null); // { dateKey, day, schedules, attendance, requests }

  // Batch Update form state
  const [batchSelectedStudents, setBatchSelectedStudents] = useState([]);
  const [batchSelectedDates, setBatchSelectedDates] = useState([]);
  const [batchStartTime, setBatchStartTime] = useState('08:00');
  const [batchFinishTime, setBatchFinishTime] = useState('17:00');
  const [batchIsOvertimeAllowed, setBatchIsOvertimeAllowed] = useState(false);
  const [batchMaxOvertime, setBatchMaxOvertime] = useState('2.0');
  const [batchNotes, setBatchNotes] = useState('');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // Single-day schedule override form inside Day Modal
  const [isEditingDaySchedule, setIsEditingDaySchedule] = useState(false);
  const [daySchedStartTime, setDaySchedStartTime] = useState('08:00');
  const [daySchedFinishTime, setDaySchedFinishTime] = useState('17:00');
  const [daySchedOvertimeAllowed, setDaySchedOvertimeAllowed] = useState(false);
  const [daySchedNotes, setDaySchedNotes] = useState('');

  // Attendance editing inside Day Modal
  const [editingAttendanceId, setEditingAttendanceId] = useState(null);
  const [editTimeIn, setEditTimeIn] = useState('');
  const [editTimeOut, setEditTimeOut] = useState('');
  const [editTasks, setEditTasks] = useState('');
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Fetch Schedules & Requests
  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const queryMonth = calendarMonth.month + 1;
      const queryYear = calendarMonth.year;
      const studentParam = selectedStudentId !== 'all' ? `&student_id=${selectedStudentId}` : '';
      const res = await api.get(`/org/schedules?month=${queryMonth}&year=${queryYear}${studentParam}`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setErrorMessage(err.message || 'Could not load work schedules.');
    } finally {
      setLoading(false);
    }
  }, [calendarMonth, selectedStudentId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useRealtimeRefresh(fetchSchedules);

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

  // Quick navigation
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

  // Aggregate daily mapping for the month
  const calendarMap = useMemo(() => {
    const map = {};
    const { dailySchedules, attendanceLogs, scheduleRequests } = data;

    (dailySchedules || []).forEach((ds) => {
      const key = ds.schedule_date_str || toManilaDateKey(ds.schedule_date);
      if (!map[key]) map[key] = { schedules: [], attendance: [], requests: [] };
      map[key].schedules.push(ds);
    });

    (attendanceLogs || []).forEach((att) => {
      const key = att.log_date_str || toManilaDateKey(att.log_date);
      if (!map[key]) map[key] = { schedules: [], attendance: [], requests: [] };
      map[key].attendance.push(att);
    });

    (scheduleRequests || []).forEach((sr) => {
      const key = sr.schedule_date_str || toManilaDateKey(sr.schedule_date);
      if (!map[key]) map[key] = { schedules: [], attendance: [], requests: [] };
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
      const dayData = calendarMap[dateKey] || { schedules: [], attendance: [], requests: [] };
      const pendingReqs = (dayData.requests || []).filter((r) => r.status === 'pending');

      cells.push({
        empty: false,
        day,
        dateKey,
        isToday: dateKey === todayKey,
        schedules: dayData.schedules,
        attendance: dayData.attendance,
        requests: dayData.requests,
        pendingRequests: pendingReqs,
        hasPendingRequest: pendingReqs.length > 0,
        key: dateKey
      });
    }

    return cells;
  }, [calendarMonth, calendarMap]);

  // Pending counts
  const pendingOvertimeCount = useMemo(() => {
    return (data.pendingOvertimeLogs || []).length;
  }, [data.pendingOvertimeLogs]);

  const pendingRequestsCount = useMemo(() => {
    return (data.scheduleRequests || []).filter((r) => r.status === 'pending').length;
  }, [data.scheduleRequests]);

  // Dates with pending student requests
  const datesWithPendingRequests = useMemo(() => {
    const s = new Set();
    (data.scheduleRequests || []).forEach((r) => {
      if (r.status === 'pending') {
        const key = r.schedule_date_str || toManilaDateKey(r.schedule_date);
        if (key) s.add(key);
      }
    });
    return Array.from(s).sort();
  }, [data.scheduleRequests]);

  // Toggle date in multi-selection
  const handleToggleDateSelection = (dateKey) => {
    setBatchSelectedDates((prev) => {
      if (prev.includes(dateKey)) {
        return prev.filter((d) => d !== dateKey);
      } else {
        return [...prev, dateKey].sort();
      }
    });
  };

  // Open batch modal
  const handleOpenBatchModal = (preselectedDates = null) => {
    if (data.interns.length === 0) {
      setErrorMessage('No active interns found under your supervision.');
      return;
    }
    // Default to selected student in dropdown if specific, else all handled interns
    if (selectedStudentId !== 'all') {
      setBatchSelectedStudents([parseInt(selectedStudentId, 10)]);
    } else {
      setBatchSelectedStudents(data.interns.map((i) => i.student_id));
    }

    if (preselectedDates && Array.isArray(preselectedDates) && preselectedDates.length > 0) {
      setBatchSelectedDates(preselectedDates);
    }
    setBatchStartTime('08:00');
    setBatchFinishTime('17:00');
    setBatchIsOvertimeAllowed(false);
    setBatchMaxOvertime('2.0');
    setBatchNotes('');
    setIsBatchModalOpen(true);
  };

  // Quick Preset Date Selectors
  const handleSelectPresetDates = (type) => {
    const { year, month } = calendarMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const selected = [];

    if (type === 'weekdays') {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          selected.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        }
      }
    } else if (type === 'requests') {
      selected.push(...datesWithPendingRequests);
    } else if (type === 'next7days') {
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        selected.push(toManilaDateKey(d));
      }
    } else if (type === 'allMonth') {
      for (let d = 1; d <= daysInMonth; d++) {
        selected.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
    }

    setBatchSelectedDates(Array.from(new Set(selected)).sort());
  };

  // Cell click dispatcher
  const handleCellClick = (cell) => {
    if (cell.empty) return;
    if (isCalendarSelectMode) {
      handleToggleDateSelection(cell.dateKey);
    } else {
      setActiveDayModal({
        dateKey: cell.dateKey,
        day: cell.day,
        schedules: cell.schedules,
        attendance: cell.attendance,
        requests: cell.requests
      });
      setIsEditingDaySchedule(false);
      setEditingAttendanceId(null);
    }
  };

  // Submit batch schedule update
  const handleSubmitBatch = async (e) => {
    e.preventDefault();
    if (batchSelectedStudents.length === 0) {
      setErrorMessage('Please select at least one intern.');
      return;
    }
    if (batchSelectedDates.length === 0) {
      setErrorMessage('Please pick at least one date on the calendar.');
      return;
    }

    try {
      setIsSubmittingBatch(true);
      const res = await api.post('/org/schedules/batch', {
        student_ids: batchSelectedStudents,
        dates: batchSelectedDates,
        start_time: batchStartTime,
        finish_time: batchFinishTime,
        is_overtime_allowed: batchIsOvertimeAllowed,
        max_overtime_hours: parseFloat(batchMaxOvertime) || 0,
        notes: batchNotes
      });

      if (res.success) {
        setMessage(res.message || 'Work schedules updated and students notified!');
        setIsBatchModalOpen(false);
        setIsCalendarSelectMode(false);
        setBatchSelectedDates([]);
        await fetchSchedules();
      } else {
        setErrorMessage(res.message || 'Failed to update schedules.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error updating schedules.');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Single Day Modal: Save Schedule Override
  const handleSaveDayScheduleOverride = async (e) => {
    e.preventDefault();
    if (!activeDayModal) return;
    const targetStudents = selectedStudentId !== 'all'
      ? [parseInt(selectedStudentId, 10)]
      : data.interns.map((i) => i.student_id);

    try {
      const res = await api.post('/org/schedules/batch', {
        student_ids: targetStudents,
        dates: [activeDayModal.dateKey],
        start_time: daySchedStartTime,
        finish_time: daySchedFinishTime,
        is_overtime_allowed: daySchedOvertimeAllowed,
        max_overtime_hours: 2.0,
        notes: daySchedNotes
      });

      if (res.success) {
        setMessage(`Schedule for ${activeDayModal.dateKey} successfully updated!`);
        setIsEditingDaySchedule(false);
        await fetchSchedules();
        setActiveDayModal(null);
      } else {
        setErrorMessage(res.message || 'Failed to update schedule.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error updating schedule.');
    }
  };

  // Respond to Student Schedule Request
  const handleRespondRequest = async (requestId, action, mentorNotes = '') => {
    try {
      const res = await api.post(`/org/schedules/requests/${requestId}/respond`, {
        action,
        mentor_notes: mentorNotes
      });
      if (res.success) {
        setMessage(res.message || `Request ${action}d successfully!`);
        await fetchSchedules();
        if (activeDayModal) {
          const updatedReqs = activeDayModal.requests.map((r) =>
            r.request_id === requestId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r
          );
          setActiveDayModal((prev) => ({ ...prev, requests: updatedReqs }));
        }
      } else {
        setErrorMessage(res.message || 'Failed to respond to request.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error processing request.');
    }
  };

  // Approve / Reject Overtime
  const handleApproveOvertime = async (attendanceId, action, approvedHours = null) => {
    try {
      const res = await api.post(`/org/schedules/overtime/${attendanceId}/approve`, {
        action,
        approved_hours: approvedHours
      });
      if (res.success) {
        setMessage(res.message || `Overtime ${action}d successfully!`);
        await fetchSchedules();
        if (activeDayModal) {
          const updatedAtt = activeDayModal.attendance.map((a) =>
            a.attendance_id === attendanceId
              ? { ...a, overtime_status: action === 'approve' ? 'approved' : 'rejected' }
              : a
          );
          setActiveDayModal((prev) => ({ ...prev, attendance: updatedAtt }));
        }
      } else {
        setErrorMessage(res.message || 'Failed to process overtime.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error updating overtime.');
    }
  };

  // Save Attendance adjustment
  const handleSaveAttendanceAdjustment = async (attendanceId) => {
    try {
      setIsSavingAttendance(true);
      const res = await api.put(`/org/schedules/attendance/${attendanceId}`, {
        time_in: editTimeIn || null,
        time_out: editTimeOut || null,
        tasks_accomplished: editTasks || null
      });

      if (res.success) {
        setMessage(res.message || 'Attendance record adjusted and student notified!');
        setEditingAttendanceId(null);
        await fetchSchedules();
        if (activeDayModal) {
          const updatedAtt = activeDayModal.attendance.map((a) =>
            a.attendance_id === attendanceId
              ? {
                  ...a,
                  time_in: res.data.time_in,
                  time_out: res.data.time_out,
                  hours_rendered: res.data.hours_rendered,
                  regular_hours: res.data.regular_hours,
                  overtime_hours: res.data.overtime_hours,
                  overtime_status: res.data.overtime_status
                }
              : a
          );
          setActiveDayModal((prev) => ({ ...prev, attendance: updatedAtt }));
        }
      } else {
        setErrorMessage(res.message || 'Failed to adjust attendance.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error saving attendance adjustment.');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-16">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange text-2xl">
                calendar_month
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
                Work Schedule & Shift Management
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant font-medium">
              Standard Daily Work Schedule: <span className="font-bold text-on-surface">08:00 AM - 05:00 PM</span>. Select multiple dates & students to update shifts in 1 click.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Multi-Date Selection Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setIsCalendarSelectMode(!isCalendarSelectMode);
                if (isCalendarSelectMode) setBatchSelectedDates([]);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                isCalendarSelectMode
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md font-black'
                  : 'bg-surface hover:bg-surface-container-high border-outline-variant text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isCalendarSelectMode ? 'check_box' : 'checklist'}
              </span>
              <span>{isCalendarSelectMode ? 'Selecting Dates...' : 'Multi-Select Dates'}</span>
            </button>

            {/* Pending Requests & Overtime Pill */}
            {(pendingOvertimeCount > 0 || pendingRequestsCount > 0) && (
              <button
                type="button"
                onClick={() => setIsPendingQueueOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-900 dark:text-purple-200 text-xs font-bold flex items-center gap-2 hover:bg-purple-500/25 transition-all cursor-pointer shadow-2xs animate-pulse"
              >
                <span className="material-symbols-outlined text-sm">mark_email_unread</span>
                <span>
                  {pendingRequestsCount} Request(s) • {pendingOvertimeCount} Overtime
                </span>
              </button>
            )}

            {/* Batch Update Button */}
            <button
              type="button"
              onClick={() => handleOpenBatchModal(batchSelectedDates.length > 0 ? batchSelectedDates : null)}
              className="px-4 py-2.5 rounded-xl bg-vibrant-orange text-accent-ink text-xs sm:text-sm font-extrabold flex items-center gap-2 hover:opacity-95 shadow-md transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">edit_calendar</span>
              <span>Update Work Schedule</span>
            </button>
          </div>
        </div>

        {/* Filters & Intern Select Bar */}
        <div className="mt-6 pt-4 border-t border-outline-variant/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">badge</span>
              <span>Interns Handled:</span>
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-surface border border-outline-variant text-xs font-bold text-on-surface focus:outline-hidden focus:border-vibrant-orange cursor-pointer"
            >
              <option value="all">All Assigned Interns ({data.interns.length})</option>
              {data.interns.map((i) => (
                <option key={i.student_id} value={i.student_id}>
                  {i.first_name} {i.last_name} ({i.student_number || i.job_title || 'Intern'})
                </option>
              ))}
            </select>
          </div>

          {/* Schedule view mode filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'all', label: 'All Dates', icon: 'grid_view' },
              { id: 'custom', label: 'Custom Overrides', icon: 'tune' },
              { id: 'requests', label: `Student Requests (${pendingRequestsCount})`, icon: 'front_hand' },
              { id: 'overtime', label: `Overtime Claims (${pendingOvertimeCount})`, icon: 'alarm_on' }
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
      </div>

      {/* Notifications / Alerts */}
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
        {/* Month Navigation Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-vibrant-orange text-2xl">
              event_note
            </span>
            <h2 className="font-black text-base sm:text-xl text-on-surface">
              {calendarMonthLabel}
            </h2>
            {isCalendarSelectMode && (
              <span className="px-2.5 py-1 rounded-lg bg-teal-600 text-white text-xs font-black animate-pulse">
                Click dates to select for batch update
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Color Legend with Prominent Student Request Indicator */}
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-container-high border border-outline" />
                <span>Standard Shift</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span>Custom Override</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-purple-600 text-white flex items-center justify-center text-[8px] font-black">
                  !
                </span>
                <span className="text-purple-700 dark:text-purple-300 font-extrabold">Student Request Indicator</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Overtime Pending</span>
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

        {/* Weekday Labels */}
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

        {/* Calendar Grid */}
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
                    className="min-h-[85px] sm:min-h-[115px] rounded-2xl bg-transparent"
                  />
                );
              }

              const hasCustom = cell.schedules.length > 0;
              const hasAttendance = cell.attendance.length > 0;
              const hasPendingOvertime = cell.attendance.some(
                (a) => a.overtime_status === 'pending_approval'
              );
              const hasPendingRequest = cell.hasPendingRequest;
              const isSelectedInBatch = batchSelectedDates.includes(cell.dateKey);

              // Apply active filter if selected
              let isDimmed = false;
              if (filterType === 'custom' && !hasCustom) isDimmed = true;
              if (filterType === 'overtime' && !hasPendingOvertime) isDimmed = true;
              if (filterType === 'requests' && !hasPendingRequest) isDimmed = true;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => handleCellClick(cell)}
                  className={`min-h-[85px] sm:min-h-[115px] p-2 sm:p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                    isDimmed
                      ? 'opacity-35 bg-surface/40 border-outline-variant/40'
                      : isSelectedInBatch
                      ? 'bg-teal-500/20 border-2 border-teal-600 shadow-md ring-2 ring-teal-500/40'
                      : hasPendingRequest
                      ? 'bg-purple-500/15 border-2 border-purple-500 shadow-sm ring-1 ring-purple-500/40 hover:border-purple-600 hover:shadow-md'
                      : hasPendingOvertime
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-xs hover:border-amber-500'
                      : hasCustom
                      ? 'bg-teal-500/10 border-teal-500/60 hover:border-teal-500'
                      : cell.isToday
                      ? 'bg-surface border-vibrant-orange/70 shadow-2xs'
                      : 'bg-surface/80 border-outline-variant hover:border-outline hover:bg-surface'
                  }`}
                >
                  {/* Cell Top Header */}
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

                    {/* TOP INDICATORS: STUDENT SCHEDULE REQUEST INDICATOR */}
                    <div className="flex items-center gap-1">
                      {isSelectedInBatch && (
                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                          ✓
                        </span>
                      )}

                      {/* Prominent High-Visibility Student Request Indicator Badge */}
                      {hasPendingRequest && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-purple-600 text-white shadow-xs animate-bounce flex items-center gap-0.5"
                          title="Student submitted a schedule update request for this date!"
                        >
                          <span className="material-symbols-outlined text-[11px]">mark_email_unread</span>
                          <span>Request ({cell.pendingRequests.length})</span>
                        </span>
                      )}

                      {hasPendingOvertime && (
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"
                          title="Pending Overtime Approval"
                        />
                      )}
                    </div>
                  </div>

                  {/* Day Content Badges */}
                  <div className="space-y-1 w-full mt-1.5 overflow-hidden">
                    {/* High-Visibility Student Request Banner in Cell Body */}
                    {hasPendingRequest && (
                      <div className="px-2 py-1 rounded-lg bg-purple-600 text-white text-[10px] font-black shadow-xs flex items-center gap-1 truncate">
                        <span className="material-symbols-outlined text-[12px]">front_hand</span>
                        <span className="truncate">
                          Req: {formatTime12(cell.pendingRequests[0].requested_start_time)} - {formatTime12(cell.pendingRequests[0].requested_finish_time)}
                        </span>
                      </div>
                    )}

                    {/* Custom Schedule Badge */}
                    {hasCustom ? (
                      <div className="px-1.5 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-300 text-[10px] font-extrabold truncate">
                        Custom: {formatTime12(cell.schedules[0].start_time)} - {formatTime12(cell.schedules[0].finish_time)}
                      </div>
                    ) : (
                      !hasPendingRequest && (
                        <div className="hidden sm:block text-[10px] font-semibold text-on-surface-variant/80 truncate">
                          08:00 AM - 05:00 PM
                        </div>
                      )
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
                          <span>OT: +{cell.attendance[0].overtime_hours || 0}h Review</span>
                        ) : (
                          <span>
                            Attended: {cell.attendance[0].hours_rendered || 0}h
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Bar when Multi-Dates are selected directly on calendar */}
      {batchSelectedDates.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface border-2 border-teal-500 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-slideUp">
          <div className="text-xs font-black text-on-surface flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs">
              {batchSelectedDates.length}
            </span>
            <span>Date(s) Selected</span>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBatchModal(batchSelectedDates)}
            className="px-4 py-2 rounded-xl bg-vibrant-orange text-accent-ink text-xs font-black shadow-md hover:opacity-95 cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">bolt</span>
            <span>Update Schedule Just 1 Time</span>
          </button>

          <button
            type="button"
            onClick={() => setBatchSelectedDates([])}
            className="text-xs font-bold text-on-surface-variant hover:text-error cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BATCH SCHEDULE UPDATE (Multi-Date & Multi-Intern in 1 Click)      */}
      {/* ========================================================================= */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-scrim/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-3xl border border-outline-variant p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <div>
                <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange">edit_calendar</span>
                  <span>Batch Update Schedule (1-Click Update)</span>
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Select multiple students and multiple dates to apply working hours simultaneously just 1 time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 rounded-xl text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitBatch} className="space-y-5">
              {/* 1. Multiple Student Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-vibrant-orange">group</span>
                    <span>1. Select Students ({batchSelectedStudents.length} of {data.interns.length} Selected)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (batchSelectedStudents.length === data.interns.length) {
                        setBatchSelectedStudents([]);
                      } else {
                        setBatchSelectedStudents(data.interns.map((i) => i.student_id));
                      }
                    }}
                    className="text-xs font-bold text-vibrant-orange hover:underline cursor-pointer"
                  >
                    {batchSelectedStudents.length === data.interns.length ? 'Deselect All' : 'Select All Students'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2.5 rounded-2xl bg-surface-container-low border border-outline-variant">
                  {data.interns.map((intern) => {
                    const isChecked = batchSelectedStudents.includes(intern.student_id);
                    return (
                      <label
                        key={intern.student_id}
                        className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          isChecked ? 'bg-orange-tint text-accent-text ring-1 ring-vibrant-orange/50' : 'hover:bg-surface-container'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setBatchSelectedStudents(batchSelectedStudents.filter((id) => id !== intern.student_id));
                            } else {
                              setBatchSelectedStudents([...batchSelectedStudents, intern.student_id]);
                            }
                          }}
                          className="rounded text-vibrant-orange focus:ring-vibrant-orange"
                        />
                        <span className="truncate">
                          {intern.first_name} {intern.last_name} ({intern.student_number || intern.job_title || 'Intern'})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 2. Multiple Date Selection with Presets */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-teal-600">date_range</span>
                    <span>2. Pick Target Dates ({batchSelectedDates.length} Selected)</span>
                  </label>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {datesWithPendingRequests.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectPresetDates('requests')}
                        className="px-2 py-0.5 rounded-lg bg-purple-600 text-white text-[11px] font-black hover:bg-purple-700 cursor-pointer shadow-2xs"
                        title="Auto-select all dates where students requested an update"
                      >
                        Dates with Requests ({datesWithPendingRequests.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelectPresetDates('weekdays')}
                      className="px-2 py-0.5 rounded-lg bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high cursor-pointer"
                    >
                      Weekdays (Mon-Fri)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPresetDates('next7days')}
                      className="px-2 py-0.5 rounded-lg bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high cursor-pointer"
                    >
                      Next 7 Days
                    </button>
                    {batchSelectedDates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setBatchSelectedDates([])}
                        className="px-2 py-0.5 rounded-lg text-xs font-bold text-error hover:bg-error/10 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected dates chips */}
                {batchSelectedDates.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-surface-container-low border border-outline-variant max-h-24 overflow-y-auto">
                    {batchSelectedDates.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-800 dark:text-teal-200 text-xs font-bold"
                      >
                        <span>{d}</span>
                        {datesWithPendingRequests.includes(d) && (
                          <span className="text-[10px] font-black text-purple-700 dark:text-purple-300">
                            (Req)
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleDateSelection(d)}
                          className="hover:text-error cursor-pointer ml-1 text-sm font-black"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant italic">
                    Click dates below to select multiple dates for this schedule update.
                  </p>
                )}

                {/* Mini Clickable Date Grid */}
                <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant">
                  <div className="text-xs font-bold text-on-surface mb-2">
                    {calendarMonthLabel} — Click dates to toggle:
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {WEEKDAYS.map((w) => (
                      <span key={w} className="text-[10px] font-black text-on-surface-variant">
                        {w}
                      </span>
                    ))}
                    {calendarCells.map((c) => {
                      if (c.empty) return <div key={c.key} className="h-8" />;
                      const isPicked = batchSelectedDates.includes(c.dateKey);
                      const hasReq = c.hasPendingRequest;

                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => handleToggleDateSelection(c.dateKey)}
                          className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer relative ${
                            isPicked
                              ? 'bg-teal-500 text-white font-black shadow-xs scale-105'
                              : hasReq
                              ? 'bg-purple-600 text-white font-black'
                              : 'bg-surface hover:bg-surface-container-high text-on-surface'
                          }`}
                        >
                          <span>{c.day}</span>
                          {hasReq && !isPicked && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Schedule Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-on-surface">Scheduled Start Time</label>
                  <input
                    type="time"
                    value={batchStartTime}
                    onChange={(e) => setBatchStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-xs font-bold text-on-surface focus:outline-hidden focus:border-vibrant-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-on-surface">Scheduled Finish Time</label>
                  <input
                    type="time"
                    value={batchFinishTime}
                    onChange={(e) => setBatchFinishTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-xs font-bold text-on-surface focus:outline-hidden focus:border-vibrant-orange"
                  />
                </div>
              </div>

              {/* 4. Overtime Permission */}
              <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batchIsOvertimeAllowed}
                    onChange={(e) => setBatchIsOvertimeAllowed(e.target.checked)}
                    className="rounded text-vibrant-orange focus:ring-vibrant-orange"
                  />
                  <span className="text-xs font-bold text-on-surface">
                    Allow Overtime for these dates
                  </span>
                </label>

                {batchIsOvertimeAllowed && (
                  <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/60">
                    <span className="text-xs font-semibold text-on-surface-variant">Max Allowed Overtime:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="6"
                      value={batchMaxOvertime}
                      onChange={(e) => setBatchMaxOvertime(e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg bg-surface border border-outline-variant text-xs font-bold text-on-surface"
                    />
                    <span className="text-xs text-on-surface-variant">hours</span>
                  </div>
                )}
              </div>

              {/* 5. Notes / Assignment */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-on-surface">Instructions / Work Note</label>
                <textarea
                  rows="2"
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="e.g. Special deployment schedule or adjusted evening shift."
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-xs font-medium text-on-surface focus:outline-hidden focus:border-vibrant-orange"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="px-6 py-2.5 rounded-xl bg-vibrant-orange text-accent-ink text-xs font-black shadow-md hover:opacity-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  <span>{isSubmittingBatch ? 'Updating...' : `Save Schedule (${batchSelectedStudents.length} Students, ${batchSelectedDates.length} Dates) Just 1 Time`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DAY INSPECTION & ATTENDANCE RESCHEDULING MODAL                   */}
      {/* ========================================================================= */}
      {activeDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-scrim/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-3xl border border-outline-variant p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-vibrant-orange">
                  Day Inspection & Shift Details
                </span>
                <h3 className="text-xl font-black text-on-surface">
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

            {/* TOP ALERT: STUDENT SCHEDULE UPDATE REQUESTS FOR THIS SPECIFIC DATE */}
            {activeDayModal.requests.length > 0 && (
              <div className="p-4 rounded-2xl bg-purple-500/15 border-2 border-purple-500 space-y-3 shadow-xs animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-purple-700">mark_email_unread</span>
                    <span>Student Schedule Request Indicator</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase">
                    Needs Review
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeDayModal.requests.map((req) => (
                    <div
                      key={req.request_id}
                      className="p-3.5 rounded-xl bg-surface border border-purple-300 dark:border-purple-800 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-black text-on-surface">
                            {req.first_name} {req.last_name}
                          </div>
                          <div className="text-xs font-extrabold text-purple-700 dark:text-purple-300 mt-0.5">
                            Requested Shift: {formatTime12(req.requested_start_time)} - {formatTime12(req.requested_finish_time)}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase self-start sm:self-auto ${
                            req.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-700'
                              : req.status === 'rejected'
                              ? 'bg-error/20 text-error'
                              : 'bg-purple-600 text-white shadow-2xs'
                          }`}
                        >
                          {req.status === 'pending' ? 'Pending Approval' : req.status}
                        </span>
                      </div>

                      {req.reason && (
                        <div className="text-xs text-on-surface-variant italic font-medium p-2 rounded-lg bg-surface-container-low">
                          Reason: "{req.reason}"
                        </div>
                      )}

                      {req.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-outline-variant/60">
                          <button
                            type="button"
                            onClick={() => handleRespondRequest(req.request_id, 'reject')}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-error hover:bg-error/10 cursor-pointer"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespondRequest(req.request_id, 'approve')}
                            className="px-4 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-black hover:bg-teal-700 cursor-pointer shadow-xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">check</span>
                            <span>Approve & Apply Schedule (1-Click)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section A: Scheduled Shift & Quick Override */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  <span>Work Shift for this Date</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditingDaySchedule(!isEditingDaySchedule)}
                  className="text-xs font-bold text-vibrant-orange hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>{isEditingDaySchedule ? 'Cancel Edit' : 'Edit Shift for this Date'}</span>
                </button>
              </div>

              {isEditingDaySchedule ? (
                <form onSubmit={handleSaveDayScheduleOverride} className="p-3.5 rounded-xl bg-surface border border-outline-variant space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface">Start Time</label>
                      <input
                        type="time"
                        value={daySchedStartTime}
                        onChange={(e) => setDaySchedStartTime(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface">Finish Time</label>
                      <input
                        type="time"
                        value={daySchedFinishTime}
                        onChange={(e) => setDaySchedFinishTime(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface">Shift Note</label>
                    <input
                      type="text"
                      value={daySchedNotes}
                      onChange={(e) => setDaySchedNotes(e.target.value)}
                      placeholder="e.g. Schedule adjustment confirmed"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-xs font-medium"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingDaySchedule(false)}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-vibrant-orange text-accent-ink text-xs font-black shadow-xs hover:opacity-95 cursor-pointer"
                    >
                      Save Shift Override
                    </button>
                  </div>
                </form>
              ) : activeDayModal.schedules.length > 0 ? (
                <div className="space-y-2">
                  {activeDayModal.schedules.map((ds) => (
                    <div
                      key={ds.schedule_id}
                      className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-black text-teal-900 dark:text-teal-200">
                          {ds.first_name} {ds.last_name}: Custom Shift
                        </div>
                        <div className="text-xs text-on-surface-variant mt-0.5">
                          {formatTime12(ds.start_time)} - {formatTime12(ds.finish_time)}
                          {ds.notes ? ` • Note: ${ds.notes}` : ''}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-teal-500 text-white text-[10px] font-extrabold uppercase self-start sm:self-auto">
                        Custom Shift Active
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-surface border border-outline-variant flex items-center justify-between">
                  <div className="text-xs font-bold text-on-surface">
                    Standard Daily Schedule: <span className="font-extrabold text-vibrant-orange">08:00 AM - 05:00 PM</span>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                    Standard Working Hours
                  </span>
                </div>
              )}
            </div>

            {/* Section B: Attendance Logs & Time-In / Time-Out Rescheduling */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">punch_clock</span>
                <span>Recorded Attendance on this Date</span>
              </h4>

              {activeDayModal.attendance.length > 0 ? (
                <div className="space-y-3">
                  {activeDayModal.attendance.map((att) => {
                    const isEditing = editingAttendanceId === att.attendance_id;
                    const isOtPending = att.overtime_status === 'pending_approval';

                    return (
                      <div
                        key={att.attendance_id}
                        className="p-3.5 rounded-2xl bg-surface border border-outline-variant space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-black text-on-surface">
                              {att.first_name} {att.last_name} ({att.student_number || 'Intern'})
                            </div>
                            <div className="text-xs text-on-surface-variant mt-0.5">
                              In: <span className="font-bold text-on-surface">{formatTime12(att.time_in) || 'N/A'}</span> • Out: <span className="font-bold text-on-surface">{formatTime12(att.time_out) || 'Open / Clocked In'}</span> • Credited: <span className="font-extrabold text-vibrant-orange">{att.hours_rendered || 0} hrs</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isOtPending && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-black uppercase border border-amber-500/40">
                                OT +{att.overtime_hours}h Pending
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingAttendanceId(null);
                                } else {
                                  setEditingAttendanceId(att.attendance_id);
                                  setEditTimeIn(att.time_in ? String(att.time_in).slice(0, 5) : '08:00');
                                  setEditTimeOut(att.time_out ? String(att.time_out).slice(0, 5) : '17:00');
                                  setEditTasks(att.tasks_accomplished || '');
                                }
                              }}
                              className="px-2.5 py-1 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-[11px] font-bold text-on-surface cursor-pointer"
                            >
                              {isEditing ? 'Cancel Edit' : 'Reschedule Time In/Out'}
                            </button>
                          </div>
                        </div>

                        {/* Overtime Approval Banner if pending */}
                        {isOtPending && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                              Student worked <span className="font-bold">{att.overtime_hours} hrs overtime</span>. Approve to credit these hours?
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleApproveOvertime(att.attendance_id, 'approve')}
                                className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                              >
                                Approve (+{att.overtime_hours}h)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveOvertime(att.attendance_id, 'reject')}
                                className="px-3 py-1 rounded-lg bg-surface border border-outline-variant text-xs font-bold text-error hover:bg-error/10 cursor-pointer"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Inline Time-In & Time-Out Rescheduling */}
                        {isEditing && (
                          <div className="p-3.5 rounded-xl bg-orange-tint/40 border border-vibrant-orange/40 space-y-3 animate-fadeIn">
                            <div className="text-xs font-black text-accent-text">
                              Mentor Time-In & Time-Out Rescheduling:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-on-surface">Time-In</label>
                                <input
                                  type="time"
                                  value={editTimeIn}
                                  onChange={(e) => setEditTimeIn(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-xs font-bold"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-on-surface">Time-Out</label>
                                <input
                                  type="time"
                                  value={editTimeOut}
                                  onChange={(e) => setEditTimeOut(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-xs font-bold"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-on-surface">Tasks Accomplished</label>
                              <input
                                type="text"
                                value={editTasks}
                                onChange={(e) => setEditTasks(e.target.value)}
                                placeholder="Accomplished daily tasks note"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-xs font-medium"
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingAttendanceId(null)}
                                className="px-3 py-1 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={isSavingAttendance}
                                onClick={() => handleSaveAttendanceAdjustment(att.attendance_id)}
                                className="px-4 py-1.5 rounded-lg bg-vibrant-orange text-accent-ink text-xs font-black shadow-xs hover:opacity-95 cursor-pointer"
                              >
                                {isSavingAttendance ? 'Saving...' : 'Save & Adjust Attendance'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant italic">
                  No attendance logged on this date yet.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveDayModal(null)}
                className="px-5 py-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PENDING QUEUE (Overtime Approvals & Student Requests)             */}
      {/* ========================================================================= */}
      {isPendingQueueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-scrim/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-3xl border border-outline-variant p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <div>
                <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600">mark_email_unread</span>
                  <span>Pending Actions: Requests & Overtime</span>
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Review student schedule update requests and overtime claims.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPendingQueueOpen(false)}
                className="p-1 rounded-xl text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Student Requests */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-purple-600">edit_notifications</span>
                <span>Pending Schedule Update Requests ({pendingRequestsCount})</span>
              </h4>
              {pendingRequestsCount === 0 ? (
                <p className="text-xs text-on-surface-variant italic p-3 rounded-xl bg-surface-container-low">
                  No student schedule update requests pending.
                </p>
              ) : (
                data.scheduleRequests
                  .filter((r) => r.status === 'pending')
                  .map((req) => (
                    <div
                      key={req.request_id}
                      className="p-4 rounded-2xl bg-purple-500/10 border-2 border-purple-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="text-xs font-black text-on-surface">
                          {req.first_name} {req.last_name} • Target Date: <span className="font-extrabold text-purple-700 dark:text-purple-300">{req.schedule_date_str}</span>
                        </div>
                        <div className="text-xs text-on-surface-variant mt-1">
                          Requested Shift: <span className="font-extrabold text-on-surface">{formatTime12(req.requested_start_time)} - {formatTime12(req.requested_finish_time)}</span>
                        </div>
                        {req.reason && (
                          <div className="text-xs text-on-surface-variant italic mt-1 p-2 rounded-lg bg-surface">
                            Reason: "{req.reason}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRespondRequest(req.request_id, 'approve')}
                          className="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-black hover:bg-teal-700 cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">check</span>
                          <span>Approve & Apply</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondRequest(req.request_id, 'reject')}
                          className="px-3 py-1.5 rounded-xl bg-surface border border-outline-variant text-xs font-bold text-error hover:bg-error/10 cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Overtime Approvals */}
            <div className="space-y-3 pt-4 border-t border-outline-variant">
              <h4 className="text-xs font-black uppercase text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-amber-600">alarm_on</span>
                <span>Pending Overtime Claims ({pendingOvertimeCount})</span>
              </h4>
              {pendingOvertimeCount === 0 ? (
                <p className="text-xs text-on-surface-variant italic p-3 rounded-xl bg-surface-container-low">
                  No overtime hours pending approval.
                </p>
              ) : (
                data.pendingOvertimeLogs.map((att) => (
                  <div
                    key={att.attendance_id}
                    className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-black text-on-surface">
                        {att.first_name} {att.last_name} • Date: {att.log_date_str}
                      </div>
                      <div className="text-xs text-on-surface-variant mt-1">
                        Clocked In: <span className="font-bold">{formatTime12(att.time_in)}</span> • Clocked Out: <span className="font-bold">{formatTime12(att.time_out)}</span>
                      </div>
                      <div className="text-xs font-extrabold text-amber-800 dark:text-amber-200 mt-1">
                        Rendered regular: {att.regular_hours || att.hours_rendered}h • Overtime claimed: +{att.overtime_hours}h
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveOvertime(att.attendance_id, 'approve')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 cursor-pointer shadow-xs"
                      >
                        Approve (+{att.overtime_hours}h)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveOvertime(att.attendance_id, 'reject')}
                        className="px-3 py-1.5 rounded-xl bg-surface border border-outline-variant text-xs font-bold text-error hover:bg-error/10 cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsPendingQueueOpen(false)}
                className="px-5 py-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high cursor-pointer"
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
