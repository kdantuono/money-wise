import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/transactions/:id
 *
 * BFF endpoint for retrieving a specific transaction.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/transactions/${id}`);
}

/**
 * PUT /api/transactions/:id
 *
 * BFF endpoint for updating a transaction.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/transactions/${id}`);
}

/**
 * DELETE /api/transactions/:id
 *
 * BFF endpoint for deleting a transaction.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/transactions/${id}`);
}
