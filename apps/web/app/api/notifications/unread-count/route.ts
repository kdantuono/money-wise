import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/notifications/unread-count
 *
 * BFF endpoint for retrieving unread notification count.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/notifications/unread-count');
}
