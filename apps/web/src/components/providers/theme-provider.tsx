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
import { useAuthStore } from '@/store/auth.store';
import type { Theme, ResolvedTheme, ThemeContextType } from '@/hooks/useTheme';

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'moneywise-theme';

/**
 * Dracula theme CSS variable overrides
 * Applied on top of the dark class to create the Dracula color scheme
 */
const DRACULA_VARS: Record<string, string> = {
  '--background': '#282a36',
  '--foreground': '#f8f8f2',
  '--card': '#21222c',
  '--card-foreground': '#f8f8f2',
  '--popover': '#21222c',
  '--popover-foreground': '#f8f8f2',
  '--primary': '#bd93f9',
  '--primary-foreground': '#282a36',
  '--secondary': '#44475a',
  '--secondary-foreground': '#f8f8f2',
  '--muted': '#44475a',
  '--muted-foreground': '#6272a4',
  '--accent': '#44475a',
  '--accent-foreground': '#f8f8f2',
  '--destructive': '#ff5555',
  '--destructive-foreground': '#f8f8f2',
  '--border': '#44475a',
  '--input': '#44475a',
  '--ring': '#bd93f9',
};

/**
 * Italian Style theme CSS variable overrides
 * Inspired by the Italian tricolor — green accents, red warnings, elegant dark base
 */
const ITALIAN_VARS: Record<string, string> = {
  '--background': '#1a1a2e',
  '--foreground': '#f0f0f0',
  '--card': '#16213e',
  '--card-foreground': '#f0f0f0',
  '--popover': '#16213e',
  '--popover-foreground': '#f0f0f0',
  '--primary': '#009246',
  '--primary-foreground': '#ffffff',
  '--secondary': '#1f3050',
  '--secondary-foreground': '#f0f0f0',
  '--muted': '#1f3050',
  '--muted-foreground': '#8899aa',
  '--accent': '#1f3050',
  '--accent-foreground': '#f0f0f0',
  '--destructive': '#CE2B37',
  '--destructive-foreground': '#ffffff',
  '--border': '#2a3a5c',
  '--input': '#1f3050',
  '--ring': '#009246',
};

/**
 * Get system color scheme preference
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolve theme to actual applied value
 */
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Apply theme class and CSS variables to document element
 */
function applyTheme(resolved: ResolvedTheme): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  root.classList.remove('dark', 'dracula', 'italian');
  // Clear all custom theme properties
  [...Object.keys(DRACULA_VARS), ...Object.keys(ITALIAN_VARS)].forEach(k => root.style.removeProperty(k));

  if (resolved === 'dark') {
    root.classList.add('dark');
  } else if (resolved === 'dracula') {
    root.classList.add('dark', 'dracula');
    Object.entries(DRACULA_VARS).forEach(([k, v]) => root.style.setProperty(k, v));
  } else if (resolved === 'italian') {
    root.classList.add('dark', 'italian');
    Object.entries(ITALIAN_VARS).forEach(([k, v]) => root.style.setProperty(k, v));
  }
  // 'light' = no classes, no custom props
}

/**
 * Get initial theme from user preferences, localStorage, or system
 */
function getInitialTheme(userPreference?: string | null): Theme {
  // Priority 1: User preference from backend
  if (userPreference === 'dracula') return 'dracula';
  if (userPreference === 'italian') return 'italian';
  if (userPreference === 'auto' || userPreference === 'system') return 'system';

  // Priority 2: localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'system' || stored === 'dracula' || stored === 'italian') return stored;
  }

  // Priority 3: Dracula as default
  return 'dracula';
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
    return getInitialTheme(user?.preferences?.theme as string | undefined);
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    return resolveTheme(theme);
  });
  const [mounted, setMounted] = useState(false);

  // Update theme when user preferences change
  useEffect(() => {
    if (user?.preferences?.theme) {
      const pref = user.preferences.theme as string;
      const userTheme: Theme =
        pref === 'system' || pref === 'auto' ? 'system' :
        pref === 'italian' ? 'italian' :
        'dracula';
      if (userTheme !== theme) {
        setThemeState(userTheme);
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
    isDark: resolvedTheme === 'dark' || resolvedTheme === 'dracula' || resolvedTheme === 'italian',
    setTheme,
  };

  // Prevent hydration mismatch by only applying theme after mount
  if (!mounted) {
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
