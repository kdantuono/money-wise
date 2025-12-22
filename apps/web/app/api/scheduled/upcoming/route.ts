import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/scheduled/upcoming
 *
 * BFF endpoint for retrieving upcoming scheduled transactions.
 * Supports optional 'days' query parameter.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/scheduled/upcoming');
}
