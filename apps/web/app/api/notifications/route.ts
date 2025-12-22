import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/notifications
 *
 * BFF endpoint for retrieving user notifications.
 * Supports query parameters: read, type, page, limit
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Don't add query params to path - proxyRequest will forward them from the original request
  return await proxyRequest(request, '/api/notifications');
}
