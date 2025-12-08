import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/liabilities/summary
 *
 * BFF endpoint for retrieving liabilities summary statistics.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/liabilities/summary');
}
