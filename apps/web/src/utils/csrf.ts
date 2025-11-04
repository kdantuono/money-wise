/**
 * CSRF Token Utilities
 *
 * Manages CSRF tokens for secure cookie-based authentication.
 * Tokens are stored in localStorage and included in mutation requests.
 *
 * Features:
 * - Thread-safe CSRF token refresh with mutex
 * - Deduplication of concurrent refresh requests
 * - Automatic retry on refresh failure
 *
 * @module utils/csrf
 */

/**
 * Storage key for CSRF token
 */
const CSRF_TOKEN_KEY = 'csrfToken';

/**
 * Mutex for CSRF token refresh operations
 * Prevents concurrent refreshes and deduplicates requests
 */
let csrfRefreshPromise: Promise<string> | null = null;

/**
 * Get stored CSRF token
 *
 * @returns The CSRF token or null if not found
 *
 * @example
 * const token = getCsrfToken();
 * if (token) {
 *   headers['X-CSRF-Token'] = token;
 * }
 */
export function getCsrfToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(CSRF_TOKEN_KEY);
}

/**
 * Store CSRF token in localStorage
 *
 * @param token - The CSRF token to store
 *
 * @example
 * const { csrfToken } = await loginResponse.json();
 * setCsrfToken(csrfToken);
 */
export function setCsrfToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(CSRF_TOKEN_KEY, token);
}

/**
 * Clear CSRF token from storage
 *
 * @example
 * await logout();
 * clearCsrfToken();
 */
export function clearCsrfToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(CSRF_TOKEN_KEY);
}

/**
 * Refresh CSRF token from backend with mutex protection
 *
 * This function uses a promise-based mutex to ensure only one refresh
 * operation happens at a time. Concurrent calls will wait for the
 * in-progress refresh to complete and return the same result.
 *
 * @param apiBaseUrl - Base URL for API requests
 * @returns New CSRF token
 * @throws Error if refresh fails
 *
 * @example
 * try {
 *   const newToken = await refreshCsrfToken(API_BASE_URL);
 *   console.log('CSRF token refreshed');
 * } catch (error) {
 *   console.error('CSRF refresh failed:', error);
 * }
 */
export async function refreshCsrfToken(apiBaseUrl: string): Promise<string> {
  // If a refresh is already in progress, wait for it and return the result
  if (csrfRefreshPromise) {
    return csrfRefreshPromise;
  }

  // Create new refresh promise and store in mutex
  csrfRefreshPromise = (async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/auth/csrf-token`, {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        throw new Error(`CSRF token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      const { csrfToken } = data;

      if (!csrfToken) {
        throw new Error('CSRF token not found in response');
      }

      setCsrfToken(csrfToken);
      return csrfToken;
    } finally {
      // Clear the mutex after completion (success or failure)
      csrfRefreshPromise = null;
    }
  })();

  return csrfRefreshPromise;
}

/**
 * Check if HTTP method requires CSRF token
 *
 * @param method - HTTP method (GET, POST, PUT, etc.)
 * @returns true if method requires CSRF token
 *
 * @example
 * if (requiresCsrf(method)) {
 *   headers['X-CSRF-Token'] = getCsrfToken();
 * }
 */
export function requiresCsrf(method?: string): boolean {
  if (!method) {
    return false;
  }
  const upperMethod = method.toUpperCase();
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod);
}

/**
 * Check if error is a CSRF token error
 *
 * @param error - Error response object
 * @returns true if error is related to CSRF token
 *
 * @example
 * if (response.status === 403 && isCsrfError(await response.json())) {
 *   await refreshCsrfToken(API_BASE_URL);
 *   // Retry request
 * }
 */
export function isCsrfError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const errorObj = error as Record<string, unknown>;

  // Check for CSRF-specific error codes/messages
  return (
    errorObj.error === 'CSRF_TOKEN_INVALID' ||
    errorObj.error === 'CSRF_TOKEN_MISSING' ||
    errorObj.message === 'CSRF token validation failed' ||
    (typeof errorObj.message === 'string' &&
     errorObj.message.toLowerCase().includes('csrf'))
  );
}
