/**
 * Auth API Client
 *
 * Provides authentication services using HttpOnly cookie-based auth with CSRF protection.
 * Cookies (accessToken, refreshToken) are managed by the browser automatically.
 * CSRF tokens are stored in localStorage and included in mutation requests.
 *
 * @module lib/auth
 */

import { getCsrfToken, setCsrfToken, clearCsrfToken, requiresCsrf, isCsrfError, refreshCsrfToken } from '@/utils/csrf'
import { sanitizeUser } from '@/utils/sanitize'

/**
 * User interface matching backend response
 */
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  avatar?: string
  timezone?: string
  currency?: string
  
  preferences?: any
  lastLoginAt?: string
  emailVerifiedAt?: string
  createdAt: string
  updatedAt: string
  fullName: string
  isEmailVerified: boolean
  isActive: boolean
}

/**
 * Auth response from login/register endpoints
 * Backend returns user data and CSRF token (cookies set automatically)
 */
export interface AuthResponse {
  user: User
  csrfToken: string
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string
  password: string
}

/**
 * Registration credentials
 */
export interface RegisterCredentials {
  email: string
  password: string
  firstName: string
  lastName: string
}

/**
 * Error response from backend
 */
export interface ErrorResponse {
  statusCode: number
  message: string | string[]
  error?: string
}

/**
 * API Client configuration
 *
 * IMPORTANT: Frontend always calls BFF routes (same-origin /api),
 * which then proxy to backend. Never call backend directly from browser.
 *
 * BFF Architecture:
 * - Browser → Next.js BFF (/api/auth/*) → NestJS Backend (NEXT_PUBLIC_API_URL)
 */
const API_BASE_URL = '/api'

/**
 * Make authenticated API request with cookie and CSRF support
 *
 * @param endpoint - API endpoint (e.g., '/auth/profile')
 * @param options - Fetch options
 * @returns Response object
 * @throws Error if request fails
 *
 * @example
 * const response = await apiRequest('/auth/profile', { method: 'GET' });
 * const user = await response.json();
 */
async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const csrfToken = getCsrfToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Add CSRF token for mutation requests
  if (requiresCsrf(options.method) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Enable cookie sending
  })

  // Handle CSRF token errors
  if (response.status === 403) {
    try {
      const errorData: ErrorResponse = await response.json()
      if (isCsrfError(errorData)) {
        // Attempt to refresh CSRF token
        try {
          await refreshCsrfToken(API_BASE_URL)
          // Retry request with new token
          const newCsrfToken = getCsrfToken()
          if (newCsrfToken && requiresCsrf(options.method)) {
            headers['X-CSRF-Token'] = newCsrfToken
          }
          return fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',
          })
        } catch (refreshError) {
          console.error('CSRF token refresh failed:', refreshError)
          throw new Error('CSRF token validation failed. Please refresh the page.')
        }
      }
    } catch (parseError) {
      // If we can't parse the error, just return the original response
      return response
    }
  }

  return response
}

/**
 * Auth service with cookie-based authentication
 */
export const authService = {
  /**
   * Login user with email and password
   * Backend sets HttpOnly cookies and returns CSRF token
   *
   * @param credentials - Login credentials
   * @returns User data and CSRF token
   * @throws Error if login fails
   *
   * @example
   * const { user, csrfToken } = await authService.login({ email, password });
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Enable cookies
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json()
      const errorMessage = Array.isArray(errorData.message)
        ? errorData.message.join(', ')
        : errorData.message || 'Login failed'
      throw new Error(errorMessage)
    }

    const data: AuthResponse = await response.json()

    // Sanitize user data before returning
    const sanitizedUser = sanitizeUser(data.user)

    setCsrfToken(data.csrfToken)
    return { user: sanitizedUser, csrfToken: data.csrfToken }
  },

  /**
   * Register new user
   * Backend sets HttpOnly cookies and returns CSRF token
   *
   * @param credentials - Registration credentials
   * @returns User data and CSRF token
   * @throws Error if registration fails
   *
   * @example
   * const { user, csrfToken } = await authService.register({
   *   email, password, firstName, lastName
   * });
   */
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Enable cookies
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json()
      const errorMessage = Array.isArray(errorData.message)
        ? errorData.message.join(', ')
        : errorData.message || 'Registration failed'
      throw new Error(errorMessage)
    }

    const data: AuthResponse = await response.json()

    // Sanitize user data before returning
    const sanitizedUser = sanitizeUser(data.user)

    setCsrfToken(data.csrfToken)
    return { user: sanitizedUser, csrfToken: data.csrfToken }
  },

  /**
   * Get current user profile
   * Uses access token from HttpOnly cookie
   *
   * @returns User data
   * @throws Error if request fails
   *
   * @example
   * const user = await authService.getProfile();
   */
  getProfile: async (): Promise<User> => {
    const response = await apiRequest('/auth/profile', {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch profile')
    }

    const rawUser = await response.json()

    // Sanitize user data before returning
    return sanitizeUser(rawUser)
  },

  /**
   * Logout user
   * Backend clears HttpOnly cookies
   *
   * @throws Error if logout fails
   *
   * @example
   * await authService.logout();
   * clearCsrfToken();
   */
  logout: async (): Promise<void> => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      })
    } finally {
      // Always clear CSRF token, even if logout request fails
      clearCsrfToken()
    }
  },

  /**
   * Refresh CSRF token
   * Call this when CSRF token becomes invalid
   *
   * @returns New CSRF token
   * @throws Error if refresh fails
   *
   * @example
   * const newToken = await authService.refreshCsrfToken();
   */
  refreshCsrfToken: async (): Promise<string> => {
    return refreshCsrfToken(API_BASE_URL)
  },
}