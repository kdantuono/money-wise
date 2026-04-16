/**
 * useTheme Hook Unit Tests
 *
 * Tests for the theme management hook and ThemeProvider.
 * Theme type is now 'system' | 'dracula' | 'italian' (no raw 'light'/'dark').
 * Default theme is 'dracula'.
 *
 * @module hooks/__tests__/useTheme.test
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useTheme } from '../useTheme';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { useAuthStore } from '@/store/auth.store';

// Mock auth store
vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock matchMedia
const createMatchMediaMock = (matches: boolean) => {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe('useTheme', () => {
  const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();

    // Default auth store mock — no user
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    // Default matchMedia mock (light mode)
    window.matchMedia = createMatchMediaMock(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  it('should throw error when used outside ThemeProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleErrorSpy.mockRestore();
  });

  it('should default to dracula theme when no user and no localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dracula');
    expect(result.current.resolvedTheme).toBe('dracula');
    expect(result.current.isDark).toBe(true);
  });

  it('should allow changing theme to system', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('system');
    });

    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('light'); // matchMedia mocked to false
    expect(result.current.isDark).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('moneywise-theme', 'system');
  });

  it('should resolve system theme to dark when system prefers dark', () => {
    window.matchMedia = createMatchMediaMock(true);

    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('system');
    });

    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(result.current.isDark).toBe(true);
  });

  it('should allow changing theme to italian', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('italian');
    });

    expect(result.current.theme).toBe('italian');
    expect(result.current.resolvedTheme).toBe('italian');
    expect(result.current.isDark).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('moneywise-theme', 'italian');
  });

  it('should allow changing theme to dracula', () => {
    // First switch away, then switch to dracula
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('system');
    });
    act(() => {
      result.current.setTheme('dracula');
    });

    expect(result.current.theme).toBe('dracula');
    expect(result.current.resolvedTheme).toBe('dracula');
    expect(result.current.isDark).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('moneywise-theme', 'dracula');
  });

  it('should read dracula theme from user preferences', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        preferences: { theme: 'dracula' },
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dracula');
    expect(result.current.resolvedTheme).toBe('dracula');
    expect(result.current.isDark).toBe(true);
  });

  it('should read italian theme from user preferences', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        preferences: { theme: 'italian' },
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('italian');
    expect(result.current.resolvedTheme).toBe('italian');
    expect(result.current.isDark).toBe(true);
  });

  it('should convert "auto" from backend to "system"', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        preferences: { theme: 'auto' },
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('system');
  });

  it('should read theme from localStorage if no user preference', () => {
    // localStorage must have a valid theme value
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'moneywise-theme') return 'italian';
      return null;
    });

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('italian');
    expect(result.current.resolvedTheme).toBe('italian');
  });

  it('should prioritize user preferences over localStorage', () => {
    // localStorage says italian, user pref says dracula
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'moneywise-theme') return 'italian';
      return null;
    });

    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        preferences: { theme: 'dracula' },
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dracula');
  });

  it('isDark is true for dracula and italian, false for light', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    // Default is dracula => isDark = true
    expect(result.current.isDark).toBe(true);

    // Switch to system with light preference
    act(() => {
      result.current.setTheme('system');
    });
    expect(result.current.isDark).toBe(false); // matchMedia = false => light
  });
});
