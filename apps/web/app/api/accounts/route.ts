import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/accounts
 *
 * BFF endpoint for retrieving user accounts.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/accounts');
}

/**
 * POST /api/accounts
 *
 * BFF endpoint for creating a new account.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/accounts');
}
