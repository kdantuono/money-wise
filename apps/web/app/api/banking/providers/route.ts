import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/banking/providers
 *
 * BFF endpoint for retrieving available banking providers.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/banking/providers');
}
