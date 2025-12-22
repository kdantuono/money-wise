import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * PATCH /api/notifications/:id/dismiss
 *
 * BFF endpoint for dismissing a notification.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/notifications/${id}/dismiss`);
}
