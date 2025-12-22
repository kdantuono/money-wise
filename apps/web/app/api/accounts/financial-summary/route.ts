import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/accounts/financial-summary
 *
 * BFF endpoint for retrieving financial summary with net worth calculation.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/accounts/financial-summary');
}
