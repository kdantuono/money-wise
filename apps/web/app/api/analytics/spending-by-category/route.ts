import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/analytics/spending-by-category
 *
 * BFF endpoint for retrieving spending breakdown by category.
 * Supports period query parameter (e.g., ?period=month).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/analytics/spending-by-category');
}
