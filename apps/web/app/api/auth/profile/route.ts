import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/auth/profile
 *
 * BFF endpoint for retrieving user profile.
 * Validates request and proxies to backend authentication service.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/auth/profile');
}
