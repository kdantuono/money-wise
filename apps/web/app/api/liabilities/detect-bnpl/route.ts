import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * POST /api/liabilities/detect-bnpl
 *
 * BFF endpoint for detecting BNPL (Buy Now, Pay Later) from transaction description.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/liabilities/detect-bnpl');
}
