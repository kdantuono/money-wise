import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/scheduled/:id
 *
 * BFF endpoint for retrieving a specific scheduled transaction.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/scheduled/${id}`);
}

/**
 * PATCH /api/scheduled/:id
 *
 * BFF endpoint for partially updating a scheduled transaction.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/scheduled/${id}`);
}

/**
 * DELETE /api/scheduled/:id
 *
 * BFF endpoint for deleting a scheduled transaction.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/scheduled/${id}`);
}
