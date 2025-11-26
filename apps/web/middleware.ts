/**
 * Next.js Middleware - Route Protection
 * 
 * Protects authenticated routes by checking for auth cookies on the server.
 * Redirects unauthenticated users to login page.
 * 
 * This is critical for E2E tests that verify protected route behavior.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * List of routes that require authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/accounts',
  '/transactions',
  '/budgets',
  '/reports',
  '/settings',
  '/profile',
  '/banking'
]

/**
 * List of public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms'
]

/**
 * Middleware function to protect routes
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathname.startsWith(route)
  )

  // If not a protected route, allow access
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Check for auth cookies set by backend (HttpOnly)
  // Security: require a valid accessToken cookie for navigation
  const accessToken = request.cookies.get('accessToken')?.value

  if (!accessToken) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('returnUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // User is authenticated, allow access
  return NextResponse.next()
}

/**
 * Configure which routes the middleware should run on
 * Excludes API routes, static files, and Next.js internals
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (API routes handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, etc. (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
