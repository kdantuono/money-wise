import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/budgets/:id
 *
 * BFF endpoint for retrieving a specific budget.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/budgets/${id}`);
}

/**
 * PUT /api/budgets/:id
 *
 * BFF endpoint for updating a budget.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/budgets/${id}`);
}

/**
 * DELETE /api/budgets/:id
 *
 * BFF endpoint for deleting a budget.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/budgets/${id}`);
}
