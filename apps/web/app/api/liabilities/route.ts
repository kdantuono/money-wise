import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/liabilities
 *
 * BFF endpoint for retrieving all liabilities for the current user.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/liabilities');
}

/**
 * POST /api/liabilities
 *
 * BFF endpoint for creating a new liability.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/liabilities');
}
