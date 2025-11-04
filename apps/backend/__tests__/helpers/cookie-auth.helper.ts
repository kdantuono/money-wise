/**
 * Cookie-Based Authentication Test Helpers
 *
 * Utilities for testing HttpOnly cookie authentication and CSRF protection
 */

import { Response } from 'supertest';
import * as request from 'supertest';

export interface CookieTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

export interface SafeUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  emailVerified: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: SafeUser;
  csrfToken?: string;
  expiresIn?: string;
}

/**
 * Parse cookies from Set-Cookie header
 *
 * @param response - Supertest response
 * @returns Object with accessToken and refreshToken
 *
 * @example
 * const cookies = parseCookies(response);
 * expect(cookies.accessToken).toBeTruthy();
 */
export function parseCookies(response: Response): CookieTokens {
  const setCookieHeaders = response.headers['set-cookie'];
  const cookies: CookieTokens = {
    accessToken: null,
    refreshToken: null,
  };

  // Ensure we have an array
  const cookieArray = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : setCookieHeaders
      ? [setCookieHeaders]
      : [];

  cookieArray.forEach((cookieStr: string) => {
    if (cookieStr.startsWith('accessToken=')) {
      // Extract value between accessToken= and first semicolon
      const match = cookieStr.match(/accessToken=([^;]+)/);
      if (match) {
        cookies.accessToken = match[1];
      }
    } else if (cookieStr.startsWith('refreshToken=')) {
      const match = cookieStr.match(/refreshToken=([^;]+)/);
      if (match) {
        cookies.refreshToken = match[1];
      }
    }
  });

  return cookies;
}

/**
 * Get cookie string for subsequent requests
 *
 * Formats cookies from response into Cookie header format
 *
 * @param response - Supertest response with Set-Cookie headers
 * @returns Cookie header string
 *
 * @example
 * const cookieHeader = getCookieHeader(loginResponse);
 * await request(app)
 *   .get('/api/auth/profile')
 *   .set('Cookie', cookieHeader);
 */
export function getCookieHeader(response: Response): string {
  const cookies = parseCookies(response);
  const cookieParts: string[] = [];

  if (cookies.accessToken) {
    cookieParts.push(`accessToken=${cookies.accessToken}`);
  }
  if (cookies.refreshToken) {
    cookieParts.push(`refreshToken=${cookies.refreshToken}`);
  }

  return cookieParts.join('; ');
}

/**
 * Verify cookie attributes for security
 *
 * Checks that cookies have HttpOnly, Secure (in production), SameSite=Strict
 *
 * @param response - Supertest response
 * @param cookieName - Name of cookie to verify ('accessToken' or 'refreshToken')
 *
 * @example
 * verifyCookieAttributes(response, 'accessToken');
 */
export function verifyCookieAttributes(
  response: Response,
  cookieName: 'accessToken' | 'refreshToken',
): void {
  const setCookieHeaders = response.headers['set-cookie'];
  const cookieArray = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : setCookieHeaders
      ? [setCookieHeaders]
      : [];

  const cookieHeader = cookieArray.find((header: string) =>
    header.startsWith(`${cookieName}=`),
  );

  expect(cookieHeader).toBeDefined();
  expect(cookieHeader).toContain('HttpOnly'); // Critical: prevents XSS access
  expect(cookieHeader).toContain('SameSite=Strict'); // CSRF protection

  // Secure flag should be present in production (but may not be in test environment)
  // We can check for Path=/
  expect(cookieHeader).toContain('Path=/');
}

/**
 * Verify cookies were cleared (logout)
 *
 * Checks that Set-Cookie headers contain Max-Age=0 or expires in past
 *
 * @param response - Supertest response
 *
 * @example
 * verifyCookiesCleared(logoutResponse);
 */
export function verifyCookiesCleared(response: Response): void {
  const setCookieHeaders = response.headers['set-cookie'];

  // Normalize to array
  const cookieArray = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : setCookieHeaders
      ? [setCookieHeaders]
      : [];

  if (cookieArray.length === 0) {
    // No Set-Cookie headers means cookies weren't touched (might be OK for some implementations)
    // But for our implementation, we expect explicit clearing
    throw new Error('Expected Set-Cookie headers for cookie clearing');
  }

  // Check that both accessToken and refreshToken are being cleared
  const accessTokenHeader = cookieArray.find((header: string) =>
    header.startsWith('accessToken='),
  );
  const refreshTokenHeader = cookieArray.find((header: string) =>
    header.startsWith('refreshToken='),
  );

  // Cookies can be cleared by setting Max-Age=0 or Expires to past date (1970)
  if (accessTokenHeader) {
    const isCleared =
      accessTokenHeader.includes('Max-Age=0') ||
      accessTokenHeader.includes('Expires=Thu, 01 Jan 1970') ||
      accessTokenHeader.includes('expires=Thu, 01 Jan 1970');
    expect(isCleared).toBe(true);
  }

  if (refreshTokenHeader) {
    const isCleared =
      refreshTokenHeader.includes('Max-Age=0') ||
      refreshTokenHeader.includes('Expires=Thu, 01 Jan 1970') ||
      refreshTokenHeader.includes('expires=Thu, 01 Jan 1970');
    expect(isCleared).toBe(true);
  }
}

/**
 * Extract CSRF token from response body
 *
 * @param response - Supertest response
 * @returns CSRF token string or null
 *
 * @example
 * const csrfToken = extractCsrfToken(loginResponse);
 * await request(app)
 *   .post('/api/auth/logout')
 *   .set('Cookie', cookieHeader)
 *   .set('X-CSRF-Token', csrfToken);
 */
export function extractCsrfToken(response: Response): string | null {
  return response.body?.csrfToken || null;
}

/**
 * Make authenticated request with cookies and CSRF token
 *
 * Helper to simplify making requests that require authentication
 *
 * @param requestBuilder - Supertest request builder
 * @param authResponse - Response from login/register containing cookies and CSRF
 * @returns Request builder with cookies and CSRF token set
 *
 * @example
 * const loginResponse = await request(app).post('/api/auth/login').send(credentials);
 * const profileResponse = await makeAuthenticatedRequest(
 *   request(app).get('/api/auth/profile'),
 *   loginResponse
 * );
 */
export function makeAuthenticatedRequest(
  requestBuilder: request.Test,
  authResponse: Response,
): request.Test {
  const cookieHeader = getCookieHeader(authResponse);
  const csrfToken = extractCsrfToken(authResponse);

  requestBuilder.set('Cookie', cookieHeader);

  if (csrfToken) {
    requestBuilder.set('X-CSRF-Token', csrfToken);
  }

  return requestBuilder;
}

/**
 * Assert response has cookie-based auth format
 *
 * Verifies that response contains cookies and CSRF token, but NOT tokens in body
 *
 * @param response - Supertest response
 *
 * @example
 * const response = await request(app).post('/api/auth/login').send(credentials);
 * assertCookieAuthResponse(response);
 */
export function assertCookieAuthResponse(response: Response): void {
  // Should have Set-Cookie headers
  expect(response.headers['set-cookie']).toBeDefined();
  expect(response.headers['set-cookie'].length).toBeGreaterThan(0);

  // Should have cookies for access and refresh tokens
  const cookies = parseCookies(response);
  expect(cookies.accessToken).toBeTruthy();
  expect(cookies.refreshToken).toBeTruthy();

  // Should have CSRF token in body
  expect(response.body.csrfToken).toBeDefined();
  expect(typeof response.body.csrfToken).toBe('string');
  expect(response.body.csrfToken.length).toBeGreaterThan(0);

  // Should NOT have tokens in response body (security)
  expect(response.body.accessToken).toBeUndefined();
  expect(response.body.refreshToken).toBeUndefined();

  // Should still have user data
  expect(response.body.user).toBeDefined();
}

/**
 * Verify CSRF token format
 *
 * Checks that CSRF token has expected format: {random}.{timestamp}.{signature}
 *
 * @param csrfToken - CSRF token string
 *
 * @example
 * verifyCsrfTokenFormat(csrfToken);
 */
export function verifyCsrfTokenFormat(csrfToken: string): void {
  expect(csrfToken).toBeDefined();
  expect(typeof csrfToken).toBe('string');

  const parts = csrfToken.split('.');
  expect(parts.length).toBe(3); // randomToken.timestamp.signature

  // Verify each part is non-empty
  expect(parts[0].length).toBeGreaterThan(0); // random token
  expect(parts[1].length).toBeGreaterThan(0); // timestamp
  expect(parts[2].length).toBeGreaterThan(0); // signature

  // Verify timestamp is a valid number
  const timestamp = parseInt(parts[1], 10);
  expect(isNaN(timestamp)).toBe(false);

  // Timestamp should be reasonably recent (within last minute)
  const now = Date.now();
  const age = now - timestamp;
  expect(age).toBeGreaterThanOrEqual(0); // Not from future
  expect(age).toBeLessThan(60000); // Less than 1 minute old
}
