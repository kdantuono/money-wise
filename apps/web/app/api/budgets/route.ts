import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/budgets
 *
 * BFF endpoint for retrieving user budgets.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/budgets');
}

/**
 * POST /api/budgets
 *
 * BFF endpoint for creating a new budget.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/budgets');
}
