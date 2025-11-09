/**
 * Tests for CSRF Token Utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCsrfToken,
  setCsrfToken,
  clearCsrfToken,
  refreshCsrfToken,
  requiresCsrf,
  isCsrfError,
} from '../../src/utils/csrf';

describe('CSRF Token Utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('getCsrfToken', () => {
    it('returns null when no token is stored', () => {
      expect(getCsrfToken()).toBeNull();
    });

    it('returns the stored CSRF token', () => {
      localStorage.setItem('csrfToken', 'test-token-123');
      expect(getCsrfToken()).toBe('test-token-123');
    });

    it('returns null when window is undefined (SSR)', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      expect(getCsrfToken()).toBeNull();

      global.window = originalWindow;
    });
  });

  describe('setCsrfToken', () => {
    it('stores CSRF token in localStorage', () => {
      setCsrfToken('new-token-456');
      expect(localStorage.getItem('csrfToken')).toBe('new-token-456');
    });

    it('overwrites existing CSRF token', () => {
      localStorage.setItem('csrfToken', 'old-token');
      setCsrfToken('new-token');
      expect(localStorage.getItem('csrfToken')).toBe('new-token');
    });

    it('does nothing when window is undefined (SSR)', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      setCsrfToken('test-token');

      global.window = originalWindow;

      // Token should not be set
      expect(localStorage.getItem('csrfToken')).toBeNull();
    });
  });

  describe('clearCsrfToken', () => {
    it('removes CSRF token from localStorage', () => {
      localStorage.setItem('csrfToken', 'token-to-clear');
      clearCsrfToken();
      expect(localStorage.getItem('csrfToken')).toBeNull();
    });

    it('does nothing if no token exists', () => {
      expect(() => clearCsrfToken()).not.toThrow();
      expect(localStorage.getItem('csrfToken')).toBeNull();
    });

    it('does nothing when window is undefined (SSR)', () => {
      const originalWindow = global.window;
      localStorage.setItem('csrfToken', 'test-token');

      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      clearCsrfToken();

      global.window = originalWindow;

      // Token should still exist
      expect(localStorage.getItem('csrfToken')).toBe('test-token');
    });
  });

  describe('refreshCsrfToken', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('fetches and stores new CSRF token', async () => {
      const mockToken = 'new-csrf-token-789';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken }),
      });

      const token = await refreshCsrfToken('http://localhost:3000');

      expect(token).toBe(mockToken);
      expect(localStorage.getItem('csrfToken')).toBe(mockToken);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/csrf-token',
        {
          method: 'GET',
          credentials: 'include',
        }
      );
    });

    it('throws error when API request fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      await expect(
        refreshCsrfToken('http://localhost:3000')
      ).rejects.toThrow('CSRF token refresh failed: Unauthorized');
    });

    it('throws error when CSRF token is missing from response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(
        refreshCsrfToken('http://localhost:3000')
      ).rejects.toThrow('CSRF token not found in response');
    });

    it('deduplicates concurrent refresh requests', async () => {
      const mockToken = 'concurrent-token';
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => delayedPromise
      );

      // Start two concurrent refresh requests
      const promise1 = refreshCsrfToken('http://localhost:3000');
      const promise2 = refreshCsrfToken('http://localhost:3000');

      // Resolve the fetch
      resolvePromise!({
        ok: true,
        json: async () => ({ csrfToken: mockToken }),
      });

      const [token1, token2] = await Promise.all([promise1, promise2]);

      // Both should return the same token
      expect(token1).toBe(mockToken);
      expect(token2).toBe(mockToken);

      // Fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('clears mutex after successful refresh', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token-1' }),
      });

      await refreshCsrfToken('http://localhost:3000');

      // Second refresh should make a new fetch call
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token-2' }),
      });

      const token2 = await refreshCsrfToken('http://localhost:3000');

      expect(token2).toBe('token-2');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('clears mutex after failed refresh', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Error',
      });

      await expect(
        refreshCsrfToken('http://localhost:3000')
      ).rejects.toThrow();

      // Second refresh should make a new fetch call
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'recovery-token' }),
      });

      const token = await refreshCsrfToken('http://localhost:3000');

      expect(token).toBe('recovery-token');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('requiresCsrf', () => {
    it('returns true for POST method', () => {
      expect(requiresCsrf('POST')).toBe(true);
    });

    it('returns true for PUT method', () => {
      expect(requiresCsrf('PUT')).toBe(true);
    });

    it('returns true for PATCH method', () => {
      expect(requiresCsrf('PATCH')).toBe(true);
    });

    it('returns true for DELETE method', () => {
      expect(requiresCsrf('DELETE')).toBe(true);
    });

    it('returns false for GET method', () => {
      expect(requiresCsrf('GET')).toBe(false);
    });

    it('returns false for HEAD method', () => {
      expect(requiresCsrf('HEAD')).toBe(false);
    });

    it('returns false for OPTIONS method', () => {
      expect(requiresCsrf('OPTIONS')).toBe(false);
    });

    it('is case-insensitive for method names', () => {
      expect(requiresCsrf('post')).toBe(true);
      expect(requiresCsrf('Post')).toBe(true);
      expect(requiresCsrf('get')).toBe(false);
      expect(requiresCsrf('Get')).toBe(false);
    });

    it('returns false when method is undefined', () => {
      expect(requiresCsrf(undefined)).toBe(false);
    });

    it('returns false when method is empty string', () => {
      expect(requiresCsrf('')).toBe(false);
    });
  });

  describe('isCsrfError', () => {
    it('returns true for CSRF_TOKEN_INVALID error', () => {
      const error = { error: 'CSRF_TOKEN_INVALID' };
      expect(isCsrfError(error)).toBe(true);
    });

    it('returns true for CSRF_TOKEN_MISSING error', () => {
      const error = { error: 'CSRF_TOKEN_MISSING' };
      expect(isCsrfError(error)).toBe(true);
    });

    it('returns true for CSRF validation failed message', () => {
      const error = { message: 'CSRF token validation failed' };
      expect(isCsrfError(error)).toBe(true);
    });

    it('returns true for message containing "csrf"', () => {
      const error = { message: 'Invalid CSRF token provided' };
      expect(isCsrfError(error)).toBe(true);
    });

    it('returns true for message containing "CSRF" (case-insensitive)', () => {
      const error = { message: 'The CSRF token is expired' };
      expect(isCsrfError(error)).toBe(true);
    });

    it('returns false for non-CSRF errors', () => {
      const error = { error: 'UNAUTHORIZED' };
      expect(isCsrfError(error)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isCsrfError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isCsrfError(undefined)).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isCsrfError('error string')).toBe(false);
      expect(isCsrfError(123)).toBe(false);
      expect(isCsrfError(true)).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isCsrfError({})).toBe(false);
    });

    it('returns false when message is not a string', () => {
      const error = { message: 123 };
      expect(isCsrfError(error)).toBe(false);
    });
  });
});
