import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/liabilities/:id
 *
 * BFF endpoint for retrieving a specific liability.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/liabilities/${id}`);
}

/**
 * PATCH /api/liabilities/:id
 *
 * BFF endpoint for partially updating a liability.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/liabilities/${id}`);
}

/**
 * DELETE /api/liabilities/:id
 *
 * BFF endpoint for deleting a liability.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/liabilities/${id}`);
}
