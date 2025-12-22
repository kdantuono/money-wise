import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * PATCH /api/notifications/read-all
 *
 * BFF endpoint for marking all notifications as read.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/notifications/read-all');
}
