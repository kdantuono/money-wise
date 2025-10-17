/**
 * Next.js Instrumentation - Runtime Coordination
 *
 * This file is REQUIRED for Next.js 15 App Router Sentry integration.
 * It coordinates Sentry initialization across all three Next.js runtimes:
 * - Node.js (server-side rendering, API routes)
 * - Edge (middleware, edge functions)
 * - Browser (client-side)
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup
 */

export async function register() {
  // Server-side instrumentation (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  // Edge runtime instrumentation (middleware, edge functions)
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * Error handler for nested React Server Components
 * Required by Sentry for Next.js 15 App Router
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#errors-from-nested-react-server-components
 */
export async function onRequestError(
  err: unknown,
  request: Request,
  context: { routerKind: 'Pages Router' | 'App Router' },
) {
  // Only instrument on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureRequestError(err, request as any, context as any);
  }
}

// Client-side instrumentation is handled separately via instrumentation-client.ts
