import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/accounts/:id
 *
 * BFF endpoint for retrieving a specific account.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/accounts/${id}`);
}

/**
 * PUT /api/accounts/:id
 *
 * BFF endpoint for updating an account.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/accounts/${id}`);
}

/**
 * DELETE /api/accounts/:id
 *
 * BFF endpoint for deleting an account.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/accounts/${id}`);
}
