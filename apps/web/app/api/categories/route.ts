import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy';

/**
 * GET /api/categories
 *
 * BFF endpoint for retrieving user categories.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/categories');
}

/**
 * POST /api/categories
 *
 * BFF endpoint for creating a new category.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return await proxyRequest(request, '/api/categories');
}
