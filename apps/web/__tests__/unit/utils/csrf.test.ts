/**
 * Tests for CSRF Token Utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCsrfToken,
  setCsrfToken,
  clearCsrfToken,
  refreshCsrfToken,
  requiresCsrf,
  isCsrfError,
} from '../../../src/utils/csrf';

describe('CSRF Token Utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getCsrfToken', () => {
    it('returns null when no token is stored', () => {
      expect(getCsrfToken()).toBeNull();
    });

    it('returns stored token when available', () => {
      localStorage.setItem('csrfToken', 'test-token-123');
      expect(getCsrfToken()).toBe('test-token-123');
    });

    it('returns null in SSR environment', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Simulating SSR
      delete global.window;

      expect(getCsrfToken()).toBeNull();

      global.window = originalWindow;
    });
  });

  describe('setCsrfToken', () => {
    it('stores token in localStorage', () => {
      setCsrfToken('new-token-456');
      expect(localStorage.getItem('csrfToken')).toBe('new-token-456');
    });

    it('overwrites existing token', () => {
      localStorage.setItem('csrfToken', 'old-token');
      setCsrfToken('new-token');
      expect(localStorage.getItem('csrfToken')).toBe('new-token');
    });

    it('does nothing in SSR environment', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Simulating SSR
      delete global.window;

      setCsrfToken('test-token');
      // Should not throw error

      global.window = originalWindow;
    });
  });

  describe('clearCsrfToken', () => {
    it('removes token from localStorage', () => {
      localStorage.setItem('csrfToken', 'test-token');
      clearCsrfToken();
      expect(localStorage.getItem('csrfToken')).toBeNull();
    });

    it('does nothing when no token is stored', () => {
      clearCsrfToken();
      expect(localStorage.getItem('csrfToken')).toBeNull();
    });

    it('does nothing in SSR environment', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Simulating SSR
      delete global.window;

      clearCsrfToken();
      // Should not throw error

      global.window = originalWindow;
    });
  });

  describe('refreshCsrfToken', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('fetches and stores new CSRF token', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'refreshed-token-789' }),
      });

      const token = await refreshCsrfToken('http://localhost:3001/api');

      expect(token).toBe('refreshed-token-789');
      expect(localStorage.getItem('csrfToken')).toBe('refreshed-token-789');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/csrf-token',
        {
          method: 'GET',
          credentials: 'include',
        }
      );
    });

    it('throws error when response is not ok', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      await expect(
        refreshCsrfToken('http://localhost:3001/api')
      ).rejects.toThrow('CSRF token refresh failed: Unauthorized');
    });

    it('throws error when csrfToken missing in response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // No csrfToken field
      });

      await expect(
        refreshCsrfToken('http://localhost:3001/api')
      ).rejects.toThrow('CSRF token not found in response');
    });

    it('deduplicates concurrent refresh requests with mutex', async () => {
      let resolveFirst: (value: any) => void;
      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      (global.fetch as any).mockImplementationOnce(() => firstPromise);

      // Start first refresh (won't resolve yet)
      const refresh1 = refreshCsrfToken('http://localhost:3001/api');

      // Start second refresh while first is pending
      const refresh2 = refreshCsrfToken('http://localhost:3001/api');

      // Resolve the first fetch
      resolveFirst!({
        ok: true,
        json: async () => ({ csrfToken: 'mutex-token' }),
      });

      // Both should return the same token
      const [token1, token2] = await Promise.all([refresh1, refresh2]);

      expect(token1).toBe('mutex-token');
      expect(token2).toBe('mutex-token');
      // Fetch should only be called once due to mutex
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('clears mutex after successful refresh', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'first-token' }),
      });

      await refreshCsrfToken('http://localhost:3001/api');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'second-token' }),
      });

      await refreshCsrfToken('http://localhost:3001/api');

      // Should have made 2 separate calls (mutex was cleared)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('clears mutex after failed refresh', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        refreshCsrfToken('http://localhost:3001/api')
      ).rejects.toThrow('Network error');

      // Mutex should be cleared, allowing another attempt
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'retry-token' }),
      });

      const token = await refreshCsrfToken('http://localhost:3001/api');
      expect(token).toBe('retry-token');
    });
  });

  describe('requiresCsrf', () => {
    it('returns true for POST requests', () => {
      expect(requiresCsrf('POST')).toBe(true);
    });

    it('returns true for PUT requests', () => {
      expect(requiresCsrf('PUT')).toBe(true);
    });

    it('returns true for PATCH requests', () => {
      expect(requiresCsrf('PATCH')).toBe(true);
    });

    it('returns true for DELETE requests', () => {
      expect(requiresCsrf('DELETE')).toBe(true);
    });

    it('returns false for GET requests', () => {
      expect(requiresCsrf('GET')).toBe(false);
    });

    it('returns false for HEAD requests', () => {
      expect(requiresCsrf('HEAD')).toBe(false);
    });

    it('returns false for OPTIONS requests', () => {
      expect(requiresCsrf('OPTIONS')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(requiresCsrf('post')).toBe(true);
      expect(requiresCsrf('Post')).toBe(true);
      expect(requiresCsrf('get')).toBe(false);
      expect(requiresCsrf('Get')).toBe(false);
    });

    it('returns false for undefined method', () => {
      expect(requiresCsrf()).toBe(false);
      expect(requiresCsrf(undefined)).toBe(false);
    });
  });

  describe('isCsrfError', () => {
    it('detects CSRF_TOKEN_INVALID error', () => {
      const error = {
        error: 'CSRF_TOKEN_INVALID',
        message: 'Token is invalid',
      };
      expect(isCsrfError(error)).toBe(true);
    });

    it('detects CSRF_TOKEN_MISSING error', () => {
      const error = {
        error: 'CSRF_TOKEN_MISSING',
        message: 'Token is missing',
      };
      expect(isCsrfError(error)).toBe(true);
    });

    it('detects CSRF validation failed message', () => {
      const error = {
        message: 'CSRF token validation failed',
      };
      expect(isCsrfError(error)).toBe(true);
    });

    it('detects csrf in message (case insensitive)', () => {
      const error = {
        message: 'Invalid CSRF token provided',
      };
      expect(isCsrfError(error)).toBe(true);
    });

    it('returns false for non-CSRF errors', () => {
      const error = {
        error: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      };
      expect(isCsrfError(error)).toBe(false);
    });

    it('returns false for null error', () => {
      expect(isCsrfError(null)).toBe(false);
    });

    it('returns false for undefined error', () => {
      expect(isCsrfError(undefined)).toBe(false);
    });

    it('returns false for non-object error', () => {
      expect(isCsrfError('string error')).toBe(false);
      expect(isCsrfError(123)).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isCsrfError({})).toBe(false);
    });
  });
});
