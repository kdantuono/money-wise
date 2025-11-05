import { NextRequest } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * POST /api/auth/logout
 *
 * BFF endpoint for user logout.
 * Proxies to backend logout service to invalidate tokens.
 *
 * @param request - Next.js request object
 * @returns Response clearing authentication cookies
 */
export async function POST(request: NextRequest) {
  // Proxy request to backend (will clear cookies)
  return await proxyRequest(request, '/api/auth/logout');
}
