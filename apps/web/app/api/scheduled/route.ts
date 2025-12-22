import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/scheduled
 *
 * BFF endpoint for retrieving all scheduled transactions.
 * Supports optional query parameters for filtering.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/scheduled');
}

/**
 * POST /api/scheduled
 *
 * BFF endpoint for creating a new scheduled transaction.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/scheduled');
}
