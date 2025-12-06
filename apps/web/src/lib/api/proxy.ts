import { NextRequest, NextResponse } from 'next/server';

/**
 * BFF Transparent Proxy Utility
 *
 * Minimal implementation that forwards requests from Next.js to NestJS backend
 * while preserving cookies, headers, and handling errors gracefully.
 *
 * Design Goals:
 * - <5ms overhead
 * - Transparent cookie preservation (HttpOnly)
 * - Zero business logic (pure proxy)
 * - Comprehensive error handling
 */

export interface ProxyOptions {
  /**
   * Backend URL (default: http://localhost:3001)
   * Override for production/staging environments
   */
  backendUrl?: string;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;
}

/**
 * Headers that should NOT be forwarded to backend
 * (security and routing concerns)
 */
const EXCLUDED_HEADERS = new Set([
  'host',           // Next.js host, not backend host
  'connection',     // Hop-by-hop header
  'keep-alive',     // Hop-by-hop header
  'transfer-encoding', // Hop-by-hop header
  'upgrade',        // Hop-by-hop header
]);

/**
 * Proxy a Next.js request to the NestJS backend
 *
 * @param request - Next.js request object
 * @param path - Backend endpoint path (e.g., '/api/auth/login')
 * @param options - Proxy configuration options
 * @returns Next.js response object with backend response
 */
export async function proxyRequest(
  request: NextRequest,
  path: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const {
    // API_URL for server-side (Docker), NEXT_PUBLIC_API_URL for fallback, then localhost
    backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    timeout = 30000,
  } = options;

  // Build backend URL with query parameters from original request
  const originalUrl = new URL(request.url);
  const queryString = originalUrl.search; // includes the '?' if params exist
  const targetUrl = `${backendUrl}${path}${queryString}`;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Forward headers (exclude security-sensitive ones)
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (!EXCLUDED_HEADERS.has(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    // Prepare request body (only for methods that typically have one)
    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE') {
      try {
        const clonedRequest = request.clone();
        const requestBody = await clonedRequest.json();
        body = JSON.stringify(requestBody);
      } catch (_error) {
        // If body parsing fails, continue without body
        body = undefined;
      }
    }

    // Make proxied request to backend
    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response body (handle 204 No Content and other empty responses)
    let responseData: unknown;
    const contentType = backendResponse.headers.get('Content-Type');

    // Handle 204 No Content and similar responses without body
    if (backendResponse.status === 204 || backendResponse.status === 205) {
      responseData = null;
    } else if (contentType?.includes('application/json')) {
      try {
        responseData = await backendResponse.json();
      } catch (_error) {
        // Fallback for malformed JSON
        responseData = { error: 'Invalid JSON response from backend' };
      }
    } else {
      // Non-JSON response (text/html/etc)
      const text = await backendResponse.text();
      responseData = { data: text };
    }

    // Create Next.js response with same status
    const response = NextResponse.json(responseData, {
      status: backendResponse.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Forward Set-Cookie headers from backend to browser
    // Use getSetCookie() for proper handling of multiple Set-Cookie headers
    if (typeof backendResponse.headers.getSetCookie === 'function') {
      const cookies = backendResponse.headers.getSetCookie();
      cookies.forEach(cookie => {
        response.headers.append('Set-Cookie', cookie);
      });
    } else {
      // Fallback for environments without getSetCookie()
      backendResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          response.headers.append('Set-Cookie', value);
        }
      });
    }

    return response;

  } catch (error) {
    // Handle timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: 'Gateway Timeout',
          message: `Backend request timeout after ${timeout}ms`,
          statusCode: 504,
        },
        { status: 504 }
      );
    }

    // Handle network errors (backend unreachable)
    // Check for common network error types
    if (
      error instanceof TypeError ||
      (error instanceof Error && (
        error.message.toLowerCase().includes('network') ||
        error.message.toLowerCase().includes('failed to fetch') ||
        error.message.toLowerCase().includes('fetch failed')
      ))
    ) {
      return NextResponse.json(
        {
          error: 'Bad Gateway',
          message: 'Backend service unavailable',
          statusCode: 502,
        },
        { status: 502 }
      );
    }

    // Generic error handling
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
