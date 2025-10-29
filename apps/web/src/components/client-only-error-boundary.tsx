'use client'

import React, { Component, type ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'

interface ClientOnlyErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ClientOnlyErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * ClientOnlyErrorBoundary Component
 *
 * Error boundary specifically designed for the ClientOnly component.
 * Catches rendering errors and provides graceful degradation.
 *
 * Features:
 * - Automatic Sentry error reporting
 * - Graceful fallback UI
 * - Prevents full page crashes
 * - Development-friendly error messages
 *
 * @example
 * ```tsx
 * <ClientOnlyErrorBoundary fallback={<ErrorFallback />}>
 *   <ClientOnly>
 *     <FormComponent />
 *   </ClientOnly>
 * </ClientOnlyErrorBoundary>
 * ```
 */
export class ClientOnlyErrorBoundary extends Component<
  ClientOnlyErrorBoundaryProps,
  ClientOnlyErrorBoundaryState
> {
  constructor(props: ClientOnlyErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ClientOnlyErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ClientOnly Error Boundary caught an error:', error, errorInfo)
    }

    // Report to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          errorBoundary: 'ClientOnlyErrorBoundary',
        },
      })
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div
          className="p-4 bg-yellow-50 border border-yellow-200 rounded-md"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Component Loading Issue
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  We encountered an issue loading this component. Please try refreshing the page.
                  If the problem persists, contact support.
                </p>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-3">
                  <summary className="text-sm font-medium text-yellow-800 cursor-pointer">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs text-yellow-900 bg-yellow-100 p-2 rounded overflow-auto max-h-48">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
