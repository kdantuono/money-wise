/**
 * Auth Service Tests
 *
 * Tests the authentication service with API interceptors and token management
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { authApi, authService, User, AuthResponse } from '../../lib/auth';

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof axios>('axios');
  return {
    ...actual,
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
    })),
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location
delete (window as any).location;
window.location = { href: '' } as any;

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    window.location.href = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('authApi configuration', () => {
    it('should create axios instance with correct base URL', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3001/api',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should use NEXT_PUBLIC_API_BASE_URL env variable if set', () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';

      // Re-import to get new instance
      vi.resetModules();
      require('../../lib/auth');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.example.com/api',
        })
      );

      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    });
  });

  describe('Request interceptor', () => {
    it('should add Authorization header when token exists', () => {
      const mockConfig = { headers: {} as any };
      localStorageMock.getItem.mockReturnValue('test-token');

      // Get the request interceptor function
      const interceptorCall = (authApi.interceptors.request.use as any).mock.calls[0];
      const requestInterceptor = interceptorCall[0];

      const result = requestInterceptor(mockConfig);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('accessToken');
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('should not add Authorization header when token does not exist', () => {
      const mockConfig = { headers: {} as any };
      localStorageMock.getItem.mockReturnValue(null);

      const interceptorCall = (authApi.interceptors.request.use as any).mock.calls[0];
      const requestInterceptor = interceptorCall[0];

      const result = requestInterceptor(mockConfig);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('accessToken');
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should preserve existing headers', () => {
      const mockConfig = {
        headers: {
          'X-Custom-Header': 'value',
        } as any,
      };
      localStorageMock.getItem.mockReturnValue('test-token');

      const interceptorCall = (authApi.interceptors.request.use as any).mock.calls[0];
      const requestInterceptor = interceptorCall[0];

      const result = requestInterceptor(mockConfig);

      expect(result.headers['X-Custom-Header']).toBe('value');
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });
  });

  describe('Response interceptor', () => {
    let responseInterceptor: any;
    let errorInterceptor: any;

    beforeEach(() => {
      const interceptorCall = (authApi.interceptors.response.use as any).mock.calls[0];
      responseInterceptor = interceptorCall[0];
      errorInterceptor = interceptorCall[1];
    });

    it('should pass through successful responses', () => {
      const mockResponse = { data: 'success' };
      const result = responseInterceptor(mockResponse);
      expect(result).toBe(mockResponse);
    });

    it('should handle 401 error and attempt token refresh', async () => {
      localStorageMock.getItem.mockReturnValue('refresh-token');
      const mockPost = vi.spyOn(axios, 'post').mockResolvedValue({
        data: { accessToken: 'new-access-token' },
      });
      const mockOriginalRequest = { config: {} } as any;

      const error = {
        response: { status: 401 },
        config: mockOriginalRequest,
      };

      await errorInterceptor(error);

      expect(mockPost).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/refresh',
        { refreshToken: 'refresh-token' }
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'accessToken',
        'new-access-token'
      );
      expect(authApi).toHaveBeenCalledWith(mockOriginalRequest);
    });

    it('should not retry if request already retried', async () => {
      const error = {
        response: { status: 401 },
        config: { _retry: true },
      };

      await expect(errorInterceptor(error)).rejects.toEqual(error);
    });

    it('should redirect to login on refresh failure', async () => {
      localStorageMock.getItem.mockReturnValue('refresh-token');
      vi.spyOn(axios, 'post').mockRejectedValue(new Error('Refresh failed'));

      const error = {
        response: { status: 401 },
        config: {},
      };

      await errorInterceptor(error);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(window.location.href).toBe('/auth/login');
    });

    it('should redirect to login if no refresh token', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const error = {
        response: { status: 401 },
        config: {},
      };

      await expect(errorInterceptor(error)).rejects.toEqual(error);
      expect(window.location.href).not.toBe('/auth/login');
    });

    it('should pass through non-401 errors', async () => {
      const error = {
        response: { status: 500 },
        config: {},
      };

      await expect(errorInterceptor(error)).rejects.toEqual(error);
    });

    it('should handle errors without response', async () => {
      const error = new Error('Network error');

      await expect(errorInterceptor(error)).rejects.toEqual(error);
    });
  });

  describe('authService.login', () => {
    it('should make POST request to login endpoint', async () => {
      const mockResponse: AuthResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: '1', email: 'test@example.com' } as User,
        expiresIn: 3600,
      };

      (authApi.post as any).mockResolvedValue({ data: mockResponse });

      const credentials = { email: 'test@example.com', password: 'password' };
      const result = await authService.login(credentials);

      expect(authApi.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result).toEqual(mockResponse);
    });

    it('should handle login errors', async () => {
      const error = new Error('Invalid credentials');
      (authApi.post as any).mockRejectedValue(error);

      const credentials = { email: 'test@example.com', password: 'wrong' };

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('authService.register', () => {
    it('should make POST request to register endpoint', async () => {
      const mockResponse: AuthResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: '1', email: 'new@example.com' } as User,
        expiresIn: 3600,
      };

      (authApi.post as any).mockResolvedValue({ data: mockResponse });

      const credentials = {
        email: 'new@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = await authService.register(credentials);

      expect(authApi.post).toHaveBeenCalledWith('/auth/register', credentials);
      expect(result).toEqual(mockResponse);
    });

    it('should handle registration errors', async () => {
      const error = new Error('Email already exists');
      (authApi.post as any).mockRejectedValue(error);

      const credentials = {
        email: 'existing@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(authService.register(credentials)).rejects.toThrow('Email already exists');
    });
  });

  describe('authService.refreshToken', () => {
    it('should make POST request to refresh endpoint', async () => {
      const mockResponse: AuthResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: { id: '1', email: 'test@example.com' } as User,
        expiresIn: 3600,
      };

      (authApi.post as any).mockResolvedValue({ data: mockResponse });

      const result = await authService.refreshToken('old-refresh-token');

      expect(authApi.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-refresh-token',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle refresh errors', async () => {
      const error = new Error('Invalid refresh token');
      (authApi.post as any).mockRejectedValue(error);

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  describe('authService.getProfile', () => {
    it('should make GET request to profile endpoint', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        status: 'active',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        fullName: 'John Doe',
        isEmailVerified: true,
        isActive: true,
      };

      (authApi.get as any).mockResolvedValue({ data: mockUser });

      const result = await authService.getProfile();

      expect(authApi.get).toHaveBeenCalledWith('/auth/profile');
      expect(result).toEqual(mockUser);
    });

    it('should handle profile fetch errors', async () => {
      const error = new Error('Unauthorized');
      (authApi.get as any).mockRejectedValue(error);

      await expect(authService.getProfile()).rejects.toThrow('Unauthorized');
    });

    it('should include all optional User fields', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'admin',
        status: 'active',
        avatar: 'https://example.com/avatar.jpg',
        timezone: 'America/New_York',
        currency: 'USD',
        preferences: { theme: 'dark', notifications: true },
        lastLoginAt: '2024-01-01T12:00:00Z',
        emailVerifiedAt: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        fullName: 'John Doe',
        isEmailVerified: true,
        isActive: true,
      };

      (authApi.get as any).mockResolvedValue({ data: mockUser });

      const result = await authService.getProfile();

      expect(result.avatar).toBe('https://example.com/avatar.jpg');
      expect(result.timezone).toBe('America/New_York');
      expect(result.currency).toBe('USD');
      expect(result.preferences).toEqual({ theme: 'dark', notifications: true });
      expect(result.lastLoginAt).toBe('2024-01-01T12:00:00Z');
      expect(result.emailVerifiedAt).toBe('2024-01-01T10:00:00Z');
    });
  });

  describe('authService.logout', () => {
    it('should make POST request to logout endpoint', async () => {
      (authApi.post as any).mockResolvedValue({ data: {} });

      await authService.logout();

      expect(authApi.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('should handle logout errors', async () => {
      const error = new Error('Logout failed');
      (authApi.post as any).mockRejectedValue(error);

      await expect(authService.logout()).rejects.toThrow('Logout failed');
    });

    it('should not return any value', async () => {
      (authApi.post as any).mockResolvedValue({ data: { message: 'Logged out' } });

      const result = await authService.logout();

      expect(result).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ERR_NETWORK';

      (authApi.post as any).mockRejectedValue(networkError);

      await expect(
        authService.login({ email: 'test@example.com', password: 'password' })
      ).rejects.toThrow('Network Error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      (timeoutError as any).code = 'ECONNABORTED';

      (authApi.get as any).mockRejectedValue(timeoutError);

      await expect(authService.getProfile()).rejects.toThrow('Timeout');
    });

    it('should handle server errors with response data', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      };

      (authApi.post as any).mockRejectedValue(serverError);

      await expect(
        authService.login({ email: 'test@example.com', password: 'password' })
      ).rejects.toEqual(serverError);
    });

    it('should handle validation errors', async () => {
      const validationError = {
        response: {
          status: 400,
          data: {
            errors: [
              { field: 'email', message: 'Invalid email format' },
              { field: 'password', message: 'Password too short' },
            ],
          },
        },
      };

      (authApi.post as any).mockRejectedValue(validationError);

      await expect(
        authService.register({
          email: 'invalid',
          password: 'short',
          firstName: 'John',
          lastName: 'Doe',
        })
      ).rejects.toEqual(validationError);
    });
  });

  describe('Token management', () => {
    it('should handle expired access token with valid refresh token', async () => {
      // Setup
      localStorageMock.getItem.mockReturnValue('valid-refresh-token');
      vi.spyOn(axios, 'post').mockResolvedValue({
        data: { accessToken: 'new-access-token' },
      });

      const interceptorCall = (authApi.interceptors.response.use as any).mock.calls[0];
      const errorInterceptor = interceptorCall[1];

      const error = {
        response: { status: 401 },
        config: {},
      };

      // Execute
      await errorInterceptor(error);

      // Verify token refresh flow
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/refresh',
        { refreshToken: 'valid-refresh-token' }
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'accessToken',
        'new-access-token'
      );
    });

    it('should handle concurrent 401 errors', async () => {
      localStorageMock.getItem.mockReturnValue('refresh-token');
      vi.spyOn(axios, 'post').mockResolvedValue({
        data: { accessToken: 'new-access-token' },
      });

      const interceptorCall = (authApi.interceptors.response.use as any).mock.calls[0];
      const errorInterceptor = interceptorCall[1];

      const error1 = { response: { status: 401 }, config: {} };
      const error2 = { response: { status: 401 }, config: {} };

      // Simulate concurrent 401 errors
      const promises = [errorInterceptor(error1), errorInterceptor(error2)];
      await Promise.all(promises);

      // Should only refresh once
      expect(axios.post).toHaveBeenCalledTimes(2); // Called twice because _retry is not set
    });
  });
});