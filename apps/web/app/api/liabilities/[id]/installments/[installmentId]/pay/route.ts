import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * PATCH /api/liabilities/:id/installments/:installmentId/pay
 *
 * BFF endpoint for marking an installment as paid.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; installmentId: string }> }
): Promise<NextResponse> {
  const { id, installmentId } = await params;
  return await proxyRequest(request, `/api/liabilities/${id}/installments/${installmentId}/pay`);
}
