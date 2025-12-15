import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/notifications
 *
 * BFF endpoint for retrieving user notifications.
 * Supports query parameters: read, type, page, limit
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams.toString();
  const path = searchParams ? `/api/notifications?${searchParams}` : '/api/notifications';
  return await proxyRequest(request, path);
}
