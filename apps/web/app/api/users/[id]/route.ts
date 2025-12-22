import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * PUT /api/users/[id]
 *
 * BFF endpoint for updating user profile.
 * Validates request and proxies to backend users service.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/users/${id}`);
}

/**
 * GET /api/users/[id]
 *
 * BFF endpoint for retrieving user by ID.
 * Validates request and proxies to backend users service.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/users/${id}`);
}
