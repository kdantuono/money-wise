/**
 * useTheme Hook Unit Tests
 *
 * Tests for the theme management hook and ThemeProvider.
 * Uses Vitest with mocked localStorage and matchMedia.
 *
 * @module hooks/__tests__/useTheme.test
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useTheme } from '../useTheme';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { useAuthStore } from '@/stores/auth-store';

// Mock auth store
vi.mock('@/stores/auth-store', () => ({
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

    // Default auth store mock
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
    // Suppress console.error for this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleErrorSpy.mockRestore();
  });

  it('should initialize with system theme by default', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('light');
    expect(result.current.isDark).toBe(false);
  });

  it('should resolve system theme to dark when system prefers dark', () => {
    window.matchMedia = createMatchMediaMock(true);

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(result.current.isDark).toBe(true);
  });

  it('should allow changing theme to light', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('moneywise-theme', 'light');
  });

  it('should allow changing theme to dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('moneywise-theme', 'dark');
  });

  it('should allow changing theme to system', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('system');
    });

    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('moneywise-theme', 'system');
  });

  it('should read theme from user preferences', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        preferences: {
          theme: 'dark',
        },
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(result.current.isDark).toBe(true);
  });

  it('should convert "auto" from backend to "system"', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        preferences: {
          theme: 'auto',
        },
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('system');
  });

  it('should read theme from localStorage if no user preference', () => {
    localStorageMock.setItem('moneywise-theme', 'dark');

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('should prioritize user preferences over localStorage', () => {
    localStorageMock.setItem('moneywise-theme', 'dark');
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        preferences: {
          theme: 'light',
        },
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('light');
  });
});
