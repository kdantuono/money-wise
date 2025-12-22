/**
 * Theme Provider
 *
 * Manages application theme state and applies dark mode class.
 * Supports light, dark, and system-based themes with SSR-safe hydration.
 *
 * Features:
 * - Reads initial theme from user preferences or localStorage
 * - Listens to system preference changes when theme is 'system'
 * - Persists theme selection to localStorage
 * - Applies .dark class to document root
 * - Handles SSR hydration without flash
 *
 * @module components/providers/theme-provider
 */

'use client';

import { createContext, useEffect, useState, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import type { Theme, ResolvedTheme, ThemeContextType } from '@/hooks/useTheme';

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'moneywise-theme';

/**
 * Get system color scheme preference
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolve theme to actual light/dark value
 */
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Apply theme class to document element
 */
function applyTheme(resolved: ResolvedTheme): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Get initial theme from user preferences, localStorage, or system
 */
function getInitialTheme(userPreference?: string | null): Theme {
  // Priority 1: User preference from backend
  if (userPreference === 'light' || userPreference === 'dark' || userPreference === 'auto') {
    // Backend uses 'auto', frontend uses 'system'
    return userPreference === 'auto' ? 'system' : userPreference;
  }

  // Priority 2: localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  }

  // Priority 3: System preference
  return 'system';
}

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider Component
 *
 * Wraps the application to provide theme context and management.
 *
 * @example
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { user } = useAuthStore();
  const [theme, setThemeState] = useState<Theme>(() => {
    // Initialize from user preferences if available
    return getInitialTheme(user?.preferences?.theme);
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    return resolveTheme(theme);
  });
  const [mounted, setMounted] = useState(false);

  // Update theme when user preferences change
  useEffect(() => {
    if (user?.preferences?.theme) {
      const userTheme = user.preferences.theme === 'auto' ? 'system' : user.preferences.theme;
      if (userTheme !== theme) {
        setThemeState(userTheme as Theme);
      }
    }
  }, [user?.preferences?.theme, theme]);

  // Apply theme and set up system preference listener
  useEffect(() => {
    setMounted(true);

    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, theme);

    // Listen for system preference changes when theme is 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e: MediaQueryListEvent) => {
        const newResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      };

      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setTheme,
  };

  // Prevent hydration mismatch by only applying theme after mount
  if (!mounted) {
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
