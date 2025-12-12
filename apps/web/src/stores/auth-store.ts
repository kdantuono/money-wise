/**
 * Auth Store
 *
 * Zustand store for authentication state with cookie-based authentication.
 * Manages user authentication state using HttpOnly cookies with CSRF protection.
 *
 * Features:
 * - Login/Register with HttpOnly cookie authentication
 * - CSRF token management
 * - Session validation and restoration
 * - Secure logout with backend notification
 * - Comprehensive error handling
 *
 * Changes from JWT implementation:
 * - Removed accessToken/refreshToken from localStorage
 * - Added csrfToken storage and management
 * - Cookies handled automatically by browser
 * - Simplified token refresh (backend handles via cookies)
 *
 * @module stores/auth-store
 */

import { create } from 'zustand';
import { authService, type User } from '../../lib/auth';
import { getCsrfToken, clearAllAppStorage } from '@/utils/csrf';

/**
 * Auth Store Interface
 */
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  clearError: () => void;
  loadUserFromStorage: () => Promise<void>;
  setUser: (user: User | null) => void;
}

/**
 * Helper: Clear all auth and app data from storage
 * Note: Cookies are cleared by backend, we clear all localStorage data
 */
const clearAuthStorage = (): void => {
  // Clear CSRF token and all persisted store data (budgets, banking, etc.)
  // This prevents stale data from being shown to the next user
  clearAllAppStorage();
};

/**
 * Helper: Parse backend error response
 */
const parseErrorMessage = (error: unknown): string => {
  if (error instanceof Response) {
    // Will be handled by the calling function
    return 'Request failed';
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
};

/**
 * Auth Store Implementation
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  /**
   * Set user and update authentication state
   */
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  /**
   * Clear error message
   */
  clearError: () => set({ error: null }),

  /**
   * Initialize auth state on app startup
   * Fetches user data from backend using HttpOnly cookies if CSRF token exists
   */
  loadUserFromStorage: async () => {
    try {
      const csrfToken = getCsrfToken();

      if (csrfToken) {
        // CSRF token exists, try to fetch user from backend
        // This will succeed if the HttpOnly cookie is still valid
        await get().validateSession();
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
      clearAuthStorage();
      set({ user: null, isAuthenticated: false });
    }
  },

  /**
   * Login user with email and password
   * Backend sets HttpOnly cookies and returns CSRF token
   */
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const { user } = await authService.login({ email, password });

      // User data stored only in memory (cookies and CSRF handled by authService)
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = parseErrorMessage(error);
      set({
        error: errorMessage,
        isLoading: false,
        user: null,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  /**
   * Register new user
   * Backend sets HttpOnly cookies and returns CSRF token
   */
  register: async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    set({ isLoading: true, error: null });

    try {
      const { user } = await authService.register({
        email,
        password,
        firstName,
        lastName
      });

      // User data stored only in memory (cookies and CSRF handled by authService)
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = parseErrorMessage(error);
      set({
        error: errorMessage,
        isLoading: false,
        user: null,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  /**
   * Logout user and clear all auth data
   * Backend clears HttpOnly cookies
   */
  logout: async () => {
    try {
      // Notify backend to clear cookies
      await authService.logout();
    } catch (error) {
      // Log error but still clear local state
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local state regardless of API response
      clearAuthStorage();
      set({
        user: null,
        isAuthenticated: false,
        error: null
      });
    }
  },

  /**
   * Validate current session with backend
   * Uses HttpOnly cookie for authentication
   *
   * @returns true if session is valid, false otherwise
   */
  validateSession: async (): Promise<boolean> => {
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
      set({ user: null, isAuthenticated: false });
      return false;
    }

    try {
      const user = await authService.getProfile();

      // User data stored only in memory
      set({ user, isAuthenticated: true });

      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      clearAuthStorage();
      set({ user: null, isAuthenticated: false });
      return false;
    }
  },
}));
