import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/liabilities/upcoming
 *
 * BFF endpoint for retrieving upcoming liability payments.
 * Accepts optional 'days' query parameter (default: 30).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/liabilities/upcoming');
}
