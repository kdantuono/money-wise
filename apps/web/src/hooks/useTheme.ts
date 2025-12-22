/**
 * useTheme Hook
 *
 * Provides theme state and controls for the application.
 * Integrates with ThemeProvider to manage light/dark/system themes.
 *
 * @module hooks/useTheme
 */

import { useContext } from 'react';
import { ThemeContext } from '@/components/providers/theme-provider';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
}

/**
 * Hook to access theme context
 *
 * @returns Theme state and controls
 * @throws Error if used outside ThemeProvider
 *
 * @example
 * const { theme, resolvedTheme, isDark, setTheme } = useTheme();
 *
 * // Get current theme preference
 * console.log(theme); // 'light' | 'dark' | 'system'
 *
 * // Get actual applied theme
 * console.log(resolvedTheme); // 'light' | 'dark'
 *
 * // Check if dark mode is active
 * if (isDark) {
 *   // Dark mode UI
 * }
 *
 * // Change theme
 * setTheme('dark');
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
