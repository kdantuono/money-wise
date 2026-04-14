/**
 * Next.js Middleware — Supabase Auth Route Protection
 *
 * 1. Refreshes Supabase auth tokens on every request (via updateSession)
 * 2. Protects /dashboard/* routes — redirects to /auth/login if no session
 * 3. Redirects authenticated users away from /auth/* pages
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const PROTECTED_PREFIXES = ['/dashboard']

const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']

export async function middleware(request: NextRequest) {
  // Refresh Supabase session (updates cookies if needed)
  const response = await updateSession(request)

  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))

  if (!isProtected && !isAuthRoute) {
    return response
  }

  // Check session by reading the Supabase auth cookie
  // The updateSession call above already refreshed the token
  const hasSession = response.headers
    .getSetCookie()
    .some((c) => c.includes('sb-') && c.includes('auth-token'))
    || request.cookies.getAll().some((c) => c.name.includes('sb-') && c.name.includes('auth-token'))

  if (isProtected && !hasSession) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('returnUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
