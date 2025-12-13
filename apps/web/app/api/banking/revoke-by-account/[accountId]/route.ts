import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * DELETE /api/banking/revoke-by-account/:accountId
 *
 * BFF endpoint for revoking a banking connection by account ID.
 * Looks up the banking connection via the account and revokes it.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;
  return await proxyRequest(request, `/api/banking/revoke-by-account/${accountId}`);
}
