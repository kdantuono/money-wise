import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/accounts/:id/deletion-eligibility
 *
 * BFF endpoint for checking if an account can be deleted.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/accounts/${id}/deletion-eligibility`);
}
