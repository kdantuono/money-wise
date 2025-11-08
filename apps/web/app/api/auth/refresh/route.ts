import { NextRequest } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * POST /api/auth/refresh
 *
 * BFF endpoint for refreshing access tokens.
 * Proxies to backend refresh service with HTTP-only refresh token cookie.
 *
 * @param request - Next.js request object
 * @returns Response with new access token and cookies
 */
export async function POST(request: NextRequest) {
  // Proxy request to backend (refresh token is in HTTP-only cookie)
  return await proxyRequest(request, '/api/auth/refresh');
}
