import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * POST /api/scheduled/:id/skip
 *
 * BFF endpoint for skipping the next occurrence of a recurring transaction.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/scheduled/${id}/skip`);
}
