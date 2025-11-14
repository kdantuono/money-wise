import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/transactions
 *
 * BFF endpoint for retrieving user transactions.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/transactions');
}

/**
 * POST /api/transactions
 *
 * BFF endpoint for creating a new transaction.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/transactions');
}
