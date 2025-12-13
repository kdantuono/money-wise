import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * POST /api/liabilities/:id/installment-plan
 *
 * BFF endpoint for creating an installment plan for a liability.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return await proxyRequest(request, `/api/liabilities/${id}/installment-plan`);
}
