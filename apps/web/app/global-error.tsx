'use client';

/**
 * Global Error Handler for Next.js App Router
 *
 * This component catches React rendering errors in the app directory
 * and reports them to Sentry. Required for proper error tracking in
 * Next.js 15 App Router with Sentry.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#global-errorjs
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#react-render-errors-in-app-router
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-red-200 bg-white p-6 shadow-lg">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-red-600">
                Something went wrong!
              </h1>
              <p className="text-gray-600">
                An unexpected error occurred. Our team has been notified and is
                working on a fix.
              </p>
              {error.digest && (
                <p className="text-sm text-gray-500">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={reset}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Go to homepage
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 rounded border border-gray-200 bg-gray-50 p-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 overflow-auto text-xs text-gray-600">
                  {error.message}
                  {'\n'}
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
