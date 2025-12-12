import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * POST /api/scheduled/generate-from-liabilities
 *
 * BFF endpoint for generating scheduled transactions from active liabilities.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/scheduled/generate-from-liabilities');
}
