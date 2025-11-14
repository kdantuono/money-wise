import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * POST /api/banking/sync/:accountId
 *
 * BFF endpoint for synchronizing a specific banking account.
 * Fetches latest transactions and balance from banking provider.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;
  return await proxyRequest(request, `/api/banking/sync/${accountId}`);
}
