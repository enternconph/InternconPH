import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getTimeFormatPreference,
  setTimeFormatPreference as persistTimeFormat,
  formatTime as formatTimeUtil,
  formatDateTime as formatDateTimeUtil,
  DEFAULT_TIME_FORMAT
} from '../utils/timeFormat';

const TimeContext = createContext({
  timeFormat: DEFAULT_TIME_FORMAT,
  is24Hour: true,
  setTimeFormat: () => {},
  formatTime: () => '',
  formatDateTime: () => '',
  currentTime: new Date()
});

export function TimeProvider({ children }) {
  const [timeFormat, setTimeFormatState] = useState(() => getTimeFormatPreference());
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Listen for storage or custom events
  useEffect(() => {
    const handleFormatChange = (e) => {
      const newFmt = e.detail?.format || getTimeFormatPreference();
      setTimeFormatState(newFmt);
    };

    const handleStorage = (e) => {
      if (e.key === 'interncon_time_format') {
        setTimeFormatState(e.newValue || DEFAULT_TIME_FORMAT);
      }
    };

    window.addEventListener('interncon_time_format_changed', handleFormatChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('interncon_time_format_changed', handleFormatChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Live second ticker for system clocks
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const setTimeFormat = useCallback((format) => {
    const resolved = persistTimeFormat(format);
    setTimeFormatState(resolved);
  }, []);

  const formatTime = useCallback(
    (dateInput, options = {}) => {
      return formatTimeUtil(dateInput, { format: timeFormat, ...options });
    },
    [timeFormat]
  );

  const formatDateTime = useCallback(
    (dateInput, options = {}) => {
      return formatDateTimeUtil(dateInput, { format: timeFormat, ...options });
    },
    [timeFormat]
  );

  const is24Hour = timeFormat === '24h';

  const value = {
    timeFormat,
    is24Hour,
    setTimeFormat,
    formatTime,
    formatDateTime,
    currentTime
  };

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
}

export function useTimeFormat() {
  const context = useContext(TimeContext);
  if (!context) {
    return {
      timeFormat: getTimeFormatPreference(),
      is24Hour: getTimeFormatPreference() === '24h',
      setTimeFormat: persistTimeFormat,
      formatTime: formatTimeUtil,
      formatDateTime: formatDateTimeUtil,
      currentTime: new Date()
    };
  }
  return context;
}
