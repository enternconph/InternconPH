import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  getTimeFormatPreference,
  setTimeFormatPreference as persistTimeFormat,
  formatTime as formatTimeUtil,
  formatDateTime as formatDateTimeUtil,
} from '../utils/timeFormat';

const TimeContext = createContext({
  timeFormat: '12h',
  is24Hour: false,
  setTimeFormat: () => {},
  formatTime: () => '',
  formatDateTime: () => '',
  currentTime: null
});

export function TimeProvider({ children }) {
  const [timeFormat, setTimeFormatState] = useState(() => getTimeFormatPreference());

  // Listen for storage or custom events
  useEffect(() => {
    const handleFormatChange = (e) => {
      const newFmt = e.detail?.format || '12h';
      setTimeFormatState(newFmt);
    };

    const handleStorage = (e) => {
      if (e.key === 'interncon_time_format') {
        setTimeFormatState('12h');
      }
    };

    window.addEventListener('interncon_time_format_changed', handleFormatChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('interncon_time_format_changed', handleFormatChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setTimeFormat = useCallback(() => {
    const resolved = persistTimeFormat('12h');
    setTimeFormatState(resolved);
  }, []);

  const formatTime = useCallback(
    (dateInput, options = {}) => {
      return formatTimeUtil(dateInput, { ...options, format: '12h' });
    },
    []
  );

  const formatDateTime = useCallback(
    (dateInput, options = {}) => {
      return formatDateTimeUtil(dateInput, { ...options, format: '12h' });
    },
    []
  );

  const value = useMemo(() => ({
    timeFormat: timeFormat || '12h',
    is24Hour: false,
    setTimeFormat,
    formatTime,
    formatDateTime,
    get currentTime() {
      return new Date();
    }
  }), [timeFormat, setTimeFormat, formatTime, formatDateTime]);

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
}

export function useTimeFormat() {
  const context = useContext(TimeContext);
  if (!context) {
    return {
      timeFormat: '12h',
      is24Hour: false,
      setTimeFormat: persistTimeFormat,
      formatTime: formatTimeUtil,
      formatDateTime: formatDateTimeUtil,
      currentTime: new Date()
    };
  }
  return context;
}
