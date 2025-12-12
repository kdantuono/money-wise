import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/scheduled/calendar
 *
 * BFF endpoint for retrieving calendar events.
 * Requires 'startDate' and 'endDate' query parameters.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/scheduled/calendar');
}
