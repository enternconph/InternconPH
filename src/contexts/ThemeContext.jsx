import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';

const ThemeContext = createContext({
  theme: 'light',
  effectiveTheme: 'light',
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {}
});

function applyThemeToDom(isDark) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
}

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

  const transitionTimerRef = useRef(null);

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

  // Ensure DOM stays in sync on initial mount or system preference change
  useEffect(() => {
    applyThemeToDom(isDark);
  }, [isDark]);

  const setTheme = useCallback((newTheme) => {
    try {
      localStorage.setItem('interncon_theme', newTheme);
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e);
    }

    const nextEffective = newTheme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : newTheme;
    const nextIsDark = nextEffective === 'dark';

    if (typeof document === 'undefined') {
      setThemeState(newTheme);
      return;
    }

    const root = document.documentElement;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      applyThemeToDom(nextIsDark);
      setThemeState(newTheme);
      return;
    }

    // Use GPU-composited View Transitions API when supported for a zero-jank cross-fade
    if (typeof document.startViewTransition === 'function') {
      root.classList.add('theme-view-transition');
      try {
        const vt = document.startViewTransition(() => {
          flushSync(() => {
            setThemeState(newTheme);
          });
          applyThemeToDom(nextIsDark);
        });
        vt.finished.finally(() => {
          root.classList.remove('theme-view-transition');
        });
        return;
      } catch {
        root.classList.remove('theme-view-transition');
      }
    }

    // Fallback: synchronized CSS transition across all surfaces, borders, and text
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    root.classList.add('theme-transitioning');
    applyThemeToDom(nextIsDark);
    setThemeState(newTheme);
    transitionTimerRef.current = setTimeout(() => {
      root.classList.remove('theme-transitioning');
      transitionTimerRef.current = null;
    }, 300);
  }, [systemPrefersDark]);

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  const contextValue = useMemo(
    () => ({ theme, effectiveTheme, isDark, setTheme, toggleTheme }),
    [theme, effectiveTheme, isDark, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
