import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * POST /api/banking/initiate-link
 *
 * BFF endpoint for initiating banking connection via OAuth.
 * Returns redirect URL and connection ID for OAuth flow.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/banking/initiate-link');
}
