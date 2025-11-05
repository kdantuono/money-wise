import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * POST /api/auth/register
 *
 * BFF endpoint for user registration.
 * Validates request and proxies to backend registration service.
 *
 * @param request - Next.js request object
 * @returns Response with user data and cookies, or error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Directly proxy to backend - backend will handle validation
  // This avoids consuming the request body twice (once here, once in proxy)
  return await proxyRequest(request, '/api/auth/register');
}
