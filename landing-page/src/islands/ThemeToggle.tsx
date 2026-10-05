import React, { useEffect, useState, useCallback } from 'react';
import type { Theme } from '../types';
import { STORAGE_KEYS, safeStorageGet, safeStorageSet } from '../utils/storage';

export interface ThemeToggleProps {
  /** Optional custom aria-label, e.g. from dictionary.nav.themeToggleAria */
  ariaLabel?: string;
  /** Optional custom CSS class name */
  className?: string;
  /** Callback triggered when theme changes */
  onThemeChange?: (theme: Theme) => void;
}

/**
 * Apply the given theme classes and attributes to document.documentElement.
 */
export function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root) return;

  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }

  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

/**
 * Resolve current theme from document class, safeStorage, or matchMedia.
 */
export function getCurrentTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement) {
    if (document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
    if (document.documentElement.classList.contains('light')) {
      return 'light';
    }
  }

  const stored = safeStorageGet(STORAGE_KEYS.THEME);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      // media query check failed
    }
  }

  return 'dark';
}

/**
 * ThemeToggle Island:
 * - Toggles between 'dark' and 'light' modes.
 * - Persists manual selection in localStorage (via safeStorageSet with in-memory fallback).
 * - Dynamically tracks OS prefers-color-scheme changes when no manual preference is stored.
 * - Provides accessible keyboard interaction and ARIA states adhering to Google Material Design 3.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  ariaLabel,
  className = '',
  onThemeChange,
}) => {
  const [theme, setTheme] = useState<Theme>(() => getCurrentTheme());
  const [mounted, setMounted] = useState<boolean>(false);

  // Sync state with DOM on mount and attach OS theme listener
  useEffect(() => {
    setMounted(true);
    const initial = getCurrentTheme();
    setTheme(initial);

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (event: MediaQueryListEvent | MediaQueryList) => {
      // Only track OS theme dynamically if no manual override is set in storage
      const manualPreference = safeStorageGet(STORAGE_KEYS.THEME);
      if (!manualPreference) {
        const nextTheme: Theme = event.matches ? 'dark' : 'light';
        setTheme(nextTheme);
        applyThemeToDocument(nextTheme);
        onThemeChange?.(nextTheme);
      }
    };

    // Modern browsers support addEventListener, older use addListener
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (typeof (mediaQuery as any).addListener === 'function') {
      (mediaQuery as any).addListener(handleSystemThemeChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else if (typeof (mediaQuery as any).removeListener === 'function') {
        (mediaQuery as any).removeListener(handleSystemThemeChange);
      }
    };
  }, [onThemeChange]);

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyThemeToDocument(nextTheme);
    safeStorageSet(STORAGE_KEYS.THEME, nextTheme);
    onThemeChange?.(nextTheme);
  }, [theme, onThemeChange]);

  const currentLabel =
    ariaLabel || (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={currentLabel}
      aria-pressed={theme === 'dark'}
      title={currentLabel}
      data-testid="theme-toggle-button"
      className={`theme-toggle-btn ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '9999px',
        border: '1px solid var(--color-border-subtle, #36383a)',
        backgroundColor: 'var(--color-surface, #1e1f20)',
        color: 'var(--color-text-primary, #e3e3e3)',
        cursor: 'pointer',
        padding: '8px',
        transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
      }}
    >
      {mounted && theme === 'light' ? (
        // Moon Icon for switching to dark mode
        <svg
          data-testid="icon-moon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        // Sun Icon for switching to light mode (default/SSR fallback)
        <svg
          data-testid="icon-sun"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
