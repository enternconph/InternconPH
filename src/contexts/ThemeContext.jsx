import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  effectiveTheme: 'light',
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  // 'light' | 'dark' | 'system'
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('interncon_theme');
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        return stored;
      }
    }
    return 'light';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen to system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setSystemPrefersDark(e.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Compute effective theme
  const effectiveTheme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;
  const isDark = effectiveTheme === 'dark';

  // Apply to document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, [isDark]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('interncon_theme', newTheme);
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

