import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/analytics/trends
 *
 * BFF endpoint for retrieving analytics trends.
 * Supports period query parameter (e.g., ?period=month).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/analytics/trends');
}
