/**
 * Auth Service Tests
 *
 * Tests the cookie-based authentication service with fetch API and CSRF protection.
 * Validates login, register, getProfile, logout, and error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock CSRF utilities before importing authService
vi.mock('../../src/utils/csrf', () => ({
  getCsrfToken: vi.fn(() => 'mock-csrf-token'),
  setCsrfToken: vi.fn(),
  clearCsrfToken: vi.fn(),
  requiresCsrf: vi.fn((method?: string) => {
    if (!method) return false;
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }),
  isCsrfError: vi.fn(() => false),
  refreshCsrfToken: vi.fn(),
}));

// Mock sanitize utilities - sanitizeUser returns the user as-is in tests
vi.mock('../../src/utils/sanitize', () => ({
  sanitizeUser: vi.fn((user: unknown) => user),
}));

// Import after mocks are set up
import { authService } from '../../lib/auth';
import type { User, AuthResponse } from '../../lib/auth';
import { getCsrfToken, setCsrfToken, clearCsrfToken, refreshCsrfToken } from '../../src/utils/csrf';

// Helper to create a mock Response
function mockResponse(data: unknown, options: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = options;
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
    headers: new Headers(),
  } as unknown as Response;
}

// Standard mock user for tests
const mockUser: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'USER',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  fullName: 'John Doe',
  isEmailVerified: true,
  isActive: true,
};

const originalFetch = global.fetch;

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  describe('authService.login', () => {
    it('should make POST request to login endpoint with credentials', async () => {
      const mockAuthResponse: AuthResponse = {
        user: mockUser,
        csrfToken: 'csrf-token-123',
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse(mockAuthResponse));

      const credentials = { email: 'test@example.com', password: 'password' };
      const result = await authService.login(credentials);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(credentials),
        })
      );
      expect(result.user).toEqual(mockUser);
      expect(result.csrfToken).toBe('csrf-token-123');
    });

    it('should store CSRF token on successful login', async () => {
      const mockAuthResponse: AuthResponse = {
        user: mockUser,
        csrfToken: 'new-csrf-token',
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse(mockAuthResponse));

      await authService.login({ email: 'test@example.com', password: 'password' });

      expect(setCsrfToken).toHaveBeenCalledWith('new-csrf-token');
    });

    it('should throw on login failure with error message', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse(
          { statusCode: 401, message: 'Invalid credentials' },
          { ok: false, status: 401 }
        )
      );

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should join array error messages', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse(
          { statusCode: 400, message: ['Email is required', 'Password is required'] },
          { ok: false, status: 400 }
        )
      );

      await expect(
        authService.login({ email: '', password: '' })
      ).rejects.toThrow('Email is required, Password is required');
    });

    it('should use default error message when none provided', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse(
          { statusCode: 500 },
          { ok: false, status: 500 }
        )
      );

      await expect(
        authService.login({ email: 'test@example.com', password: 'password' })
      ).rejects.toThrow('Login failed');
    });
  });

  describe('authService.register', () => {
    it('should make POST request to register endpoint', async () => {
      const mockAuthResponse: AuthResponse = {
        user: mockUser,
        csrfToken: 'csrf-token-reg',
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse(mockAuthResponse));

      const credentials = {
        email: 'new@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = await authService.register(credentials);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(credentials),
        })
      );
      expect(result.user).toEqual(mockUser);
      expect(result.csrfToken).toBe('csrf-token-reg');
    });

    it('should store CSRF token on successful registration', async () => {
      const mockAuthResponse: AuthResponse = {
        user: mockUser,
        csrfToken: 'reg-csrf-token',
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse(mockAuthResponse));

      await authService.register({
        email: 'new@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(setCsrfToken).toHaveBeenCalledWith('reg-csrf-token');
    });

    it('should throw on registration failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse(
          { statusCode: 409, message: 'Email already exists' },
          { ok: false, status: 409 }
        )
      );

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'password',
          firstName: 'John',
          lastName: 'Doe',
        })
      ).rejects.toThrow('Email already exists');
    });

    it('should handle array validation errors on registration', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse(
          { statusCode: 400, message: ['Password too short', 'Invalid email'] },
          { ok: false, status: 400 }
        )
      );

      await expect(
        authService.register({
          email: 'bad',
          password: 'x',
          firstName: 'John',
          lastName: 'Doe',
        })
      ).rejects.toThrow('Password too short, Invalid email');
    });
  });

  describe('authService.getProfile', () => {
    it('should make GET request to profile endpoint with credentials', async () => {
      vi.mocked(global.fetch).mockResolvedValue(mockResponse(mockUser));

      const result = await authService.getProfile();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/profile',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw on profile fetch failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse(
          { statusCode: 401, message: 'Unauthorized' },
          { ok: false, status: 401 }
        )
      );

      await expect(authService.getProfile()).rejects.toThrow('Failed to fetch profile');
    });

    it('should include all optional User fields', async () => {
      const fullUser: User = {
        ...mockUser,
        avatar: 'https://example.com/avatar.jpg',
        timezone: 'America/New_York',
        currency: 'USD',
        preferences: { theme: 'dark', notifications: true },
        lastLoginAt: '2024-01-01T12:00:00.000Z',
        emailVerifiedAt: '2024-01-01T10:00:00.000Z',
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse(fullUser));

      const result = await authService.getProfile();

      expect(result.avatar).toBe('https://example.com/avatar.jpg');
      expect(result.timezone).toBe('America/New_York');
      expect(result.currency).toBe('USD');
      expect(result.preferences).toEqual({ theme: 'dark', notifications: true });
      expect(result.lastLoginAt).toBe('2024-01-01T12:00:00.000Z');
      expect(result.emailVerifiedAt).toBe('2024-01-01T10:00:00.000Z');
    });

    it('should not include CSRF token header for GET requests', async () => {
      vi.mocked(global.fetch).mockResolvedValue(mockResponse(mockUser));

      await authService.getProfile();

      // apiRequest adds Content-Type but not CSRF for GET (requiresCsrf returns false for GET)
      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      expect(callArgs[1]).toEqual(
        expect.objectContaining({
          credentials: 'include',
        })
      );
      // CSRF header must NOT be present on GET requests
      const headers = callArgs[1]?.headers as Record<string, string> | undefined;
      expect(headers?.['X-CSRF-Token']).toBeUndefined();
    });
  });

  describe('authService.logout', () => {
    it('should make POST request to logout endpoint', async () => {
      vi.mocked(global.fetch).mockResolvedValue(mockResponse({}));

      await authService.logout();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });

    it('should clear CSRF token on successful logout', async () => {
      vi.mocked(global.fetch).mockResolvedValue(mockResponse({}));

      await authService.logout();

      expect(clearCsrfToken).toHaveBeenCalled();
    });

    it('should clear CSRF token even when logout API call fails', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      // logout uses try/finally (no catch), so errors propagate
      // but clearCsrfToken is still called in the finally block
      await expect(authService.logout()).rejects.toThrow('Network error');

      expect(clearCsrfToken).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle network errors on login', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network Error'));

      await expect(
        authService.login({ email: 'test@example.com', password: 'password' })
      ).rejects.toThrow('Network Error');
    });

    it('should handle network errors on register', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('fetch failed'));

      await expect(
        authService.register({
          email: 'new@example.com',
          password: 'password',
          firstName: 'John',
          lastName: 'Doe',
        })
      ).rejects.toThrow('fetch failed');
    });

    it('should handle network errors on getProfile', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Connection refused'));

      await expect(authService.getProfile()).rejects.toThrow('Connection refused');
    });
  });

  describe('CSRF token management', () => {
    it('should include CSRF token in POST requests via apiRequest', async () => {
      vi.mocked(getCsrfToken).mockReturnValue('test-csrf-token');
      vi.mocked(global.fetch).mockResolvedValue(mockResponse({}));

      await authService.logout();

      // apiRequest adds CSRF header for POST methods
      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers['X-CSRF-Token']).toBe('test-csrf-token');
    });

    it('should not include CSRF token when getCsrfToken returns null', async () => {
      vi.mocked(getCsrfToken).mockReturnValue(null);
      vi.mocked(global.fetch).mockResolvedValue(mockResponse({}));

      await authService.logout();

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers['X-CSRF-Token']).toBeUndefined();
    });
  });

  describe('authService.refreshCsrfToken', () => {
    it('should delegate to refreshCsrfToken utility', async () => {
      vi.mocked(refreshCsrfToken).mockResolvedValue('new-csrf-token');

      const result = await authService.refreshCsrfToken();

      expect(refreshCsrfToken).toHaveBeenCalledWith('/api');
      expect(result).toBe('new-csrf-token');
    });
  });
});
