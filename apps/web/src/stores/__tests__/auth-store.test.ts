/**
 * Auth Store Unit Tests
 *
 * Tests for authentication state management store with cookie-based auth.
 * Uses Vitest and testing utilities.
 *
 * @module stores/__tests__/auth-store.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../auth-store';
import * as authLib from '../../../lib/auth';
import * as csrfUtils from '@/utils/csrf';

// Mock the auth library
vi.mock('../../../lib/auth', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
    refreshCsrfToken: vi.fn(),
  },
}));

// Mock CSRF utilities
vi.mock('@/utils/csrf', () => ({
  getCsrfToken: vi.fn(),
  setCsrfToken: vi.fn(),
  clearCsrfToken: vi.fn(),
  requiresCsrf: vi.fn(),
  isCsrfError: vi.fn(),
  refreshCsrfToken: vi.fn(),
}));

// Mock console methods to avoid cluttering test output
const originalConsoleError = console.error;

describe('Auth Store', () => {
  const mockUser: authLib.User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
    status: 'ACTIVE',
    fullName: 'John Doe',
    isEmailVerified: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.setUser(null);
      result.current.clearError();
    });

    // Clear all mocks
    vi.clearAllMocks();

    // Mock console.error to avoid cluttering test output
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user and update authentication state', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should clear user when set to null', () => {
      const { result } = renderHook(() => useAuthStore());

      // First set a user
      act(() => {
        result.current.setUser(mockUser);
      });

      // Then clear it
      act(() => {
        result.current.setUser(null);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error message', async () => {
      const { result } = renderHook(() => useAuthStore());

      // Set an error by triggering a failed login
      vi.mocked(authLib.authService.login).mockRejectedValue(
        new Error('Login failed')
      );

      await act(async () => {
        await result.current.login('test@example.com', 'password').catch(() => {});
      });

      // Wait for error to be set
      await new Promise(resolve => setTimeout(resolve, 100));

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockAuthResponse: authLib.AuthResponse = {
        user: mockUser,
        csrfToken: 'csrf-token-123',
      };

      vi.mocked(authLib.authService.login).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(authLib.authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });

    it('should handle login error', async () => {
      const error = new Error('Invalid credentials');
      vi.mocked(authLib.authService.login).mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrong-password');
        } catch (err) {
          // Expected error
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
    });

    it('should handle login error with string', async () => {
      vi.mocked(authLib.authService.login).mockRejectedValue('String error');

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password');
        } catch (err) {
          // Expected error
        }
      });

      expect(result.current.error).toBe('String error');
    });

    it('should handle login error with Response object', async () => {
      const mockResponse = new Response('Error', { status: 401 });
      vi.mocked(authLib.authService.login).mockRejectedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password');
        } catch (err) {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Request failed');
    });

    it('should handle unknown error type', async () => {
      vi.mocked(authLib.authService.login).mockRejectedValue({ unknown: 'error' });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password');
        } catch (err) {
          // Expected error
        }
      });

      expect(result.current.error).toBe('An unexpected error occurred');
    });

    it('should set loading state during login', async () => {
      const mockAuthResponse: authLib.AuthResponse = {
        user: mockUser,
        csrfToken: 'csrf-token-123',
      };

      let resolveLogin: ((value: authLib.AuthResponse) => void) | undefined;
      const loginPromise = new Promise<authLib.AuthResponse>((resolve) => {
        resolveLogin = resolve;
      });

      vi.mocked(authLib.authService.login).mockReturnValue(loginPromise);

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('test@example.com', 'password');
      });

      // Check loading state is true while request is pending
      expect(result.current.isLoading).toBe(true);

      // Resolve the login
      await act(async () => {
        resolveLogin?.(mockAuthResponse);
        await loginPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockAuthResponse: authLib.AuthResponse = {
        user: mockUser,
        csrfToken: 'csrf-token-123',
      };

      vi.mocked(authLib.authService.register).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register(
          'test@example.com',
          'password',
          'John',
          'Doe'
        );
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(authLib.authService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should handle register error', async () => {
      const error = new Error('Email already exists');
      vi.mocked(authLib.authService.register).mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.register(
            'test@example.com',
            'password',
            'John',
            'Doe'
          );
        } catch (err) {
          // Expected error
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Email already exists');
    });

    it('should set loading state during registration', async () => {
      const mockAuthResponse: authLib.AuthResponse = {
        user: mockUser,
        csrfToken: 'csrf-token-123',
      };

      let resolveRegister: ((value: authLib.AuthResponse) => void) | undefined;
      const registerPromise = new Promise<authLib.AuthResponse>((resolve) => {
        resolveRegister = resolve;
      });

      vi.mocked(authLib.authService.register).mockReturnValue(registerPromise);

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.register('test@example.com', 'password', 'John', 'Doe');
      });

      // Check loading state is true while request is pending
      expect(result.current.isLoading).toBe(true);

      // Resolve the registration
      await act(async () => {
        resolveRegister?.(mockAuthResponse);
        await registerPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      vi.mocked(authLib.authService.logout).mockResolvedValue(undefined);
      vi.mocked(csrfUtils.clearCsrfToken).mockImplementation(() => {});

      const { result } = renderHook(() => useAuthStore());

      // First set a user
      act(() => {
        result.current.setUser(mockUser);
      });

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
      expect(authLib.authService.logout).toHaveBeenCalled();
    });

    it('should clear local state even if logout API fails', async () => {
      vi.mocked(authLib.authService.logout).mockRejectedValue(
        new Error('Logout failed')
      );
      vi.mocked(csrfUtils.clearCsrfToken).mockImplementation(() => {});

      const { result } = renderHook(() => useAuthStore());

      // First set a user
      act(() => {
        result.current.setUser(mockUser);
      });

      // Then logout (should not throw)
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Logout API call failed:',
        expect.any(Error)
      );
    });
  });

  describe('validateSession', () => {
    it('should validate session successfully with CSRF token', async () => {
      vi.mocked(csrfUtils.getCsrfToken).mockReturnValue('csrf-token-123');
      vi.mocked(authLib.authService.getProfile).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthStore());

      let isValid: boolean = false;
      await act(async () => {
        isValid = await result.current.validateSession();
      });

      expect(isValid).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(authLib.authService.getProfile).toHaveBeenCalled();
    });

    it('should fail validation without CSRF token', async () => {
      vi.mocked(csrfUtils.getCsrfToken).mockReturnValue(null);

      const { result } = renderHook(() => useAuthStore());

      let isValid: boolean = true;
      await act(async () => {
        isValid = await result.current.validateSession();
      });

      expect(isValid).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(authLib.authService.getProfile).not.toHaveBeenCalled();
    });

    it('should handle validation error', async () => {
      vi.mocked(csrfUtils.getCsrfToken).mockReturnValue('csrf-token-123');
      vi.mocked(authLib.authService.getProfile).mockRejectedValue(
        new Error('Unauthorized')
      );
      vi.mocked(csrfUtils.clearCsrfToken).mockImplementation(() => {});

      const { result } = renderHook(() => useAuthStore());

      let isValid: boolean = true;
      await act(async () => {
        isValid = await result.current.validateSession();
      });

      expect(isValid).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Session validation failed:',
        expect.any(Error)
      );
    });
  });

  describe('loadUserFromStorage', () => {
    it('should load user from storage when CSRF token exists', async () => {
      vi.mocked(csrfUtils.getCsrfToken).mockReturnValue('csrf-token-123');
      vi.mocked(authLib.authService.getProfile).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.loadUserFromStorage();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should not load user when no CSRF token exists', async () => {
      vi.mocked(csrfUtils.getCsrfToken).mockReturnValue(null);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.loadUserFromStorage();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(authLib.authService.getProfile).not.toHaveBeenCalled();
    });

    it('should handle load error and clear state', async () => {
      vi.mocked(csrfUtils.getCsrfToken).mockReturnValue('csrf-token-123');
      vi.mocked(authLib.authService.getProfile).mockRejectedValue(
        new Error('Load failed')
      );
      vi.mocked(csrfUtils.clearCsrfToken).mockImplementation(() => {});

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.loadUserFromStorage();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      // loadUserFromStorage calls validateSession internally, which logs "Session validation failed"
      expect(console.error).toHaveBeenCalledWith(
        'Session validation failed:',
        expect.any(Error)
      );
    });
  });
});
