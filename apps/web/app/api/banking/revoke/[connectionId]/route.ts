import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * DELETE /api/banking/revoke/:connectionId
 *
 * BFF endpoint for revoking a banking connection.
 * Disconnects linked accounts and removes access.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
): Promise<NextResponse> {
  const { connectionId } = await params;
  return await proxyRequest(request, `/api/banking/revoke/${connectionId}`);
}
