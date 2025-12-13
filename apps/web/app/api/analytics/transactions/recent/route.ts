import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/analytics/transactions/recent
 *
 * BFF endpoint for retrieving recent transactions.
 * Supports limit query parameter (e.g., ?limit=10).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/analytics/transactions/recent');
}
