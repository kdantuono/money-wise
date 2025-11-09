import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * POST /api/banking/complete-link
 *
 * BFF endpoint for completing banking OAuth flow.
 * Exchanges connection ID for linked accounts.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/banking/complete-link');
}
