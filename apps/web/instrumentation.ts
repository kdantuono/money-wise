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

// Client-side instrumentation is handled separately via sentry.client.config.ts
// and imported automatically by Next.js
