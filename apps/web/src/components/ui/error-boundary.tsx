/**
 * Error Boundary Component
 *
 * Comprehensive error boundary following React best practices.
 * Provides retry functionality, error logging, and useErrorBoundary hook.
 *
 * @module components/ui/error-boundary
 */

'use client';

import React, { ReactNode, Component, createContext, useContext } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryContextType {
  captureError: (error: Error) => void;
  resetError: () => void;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType | null>(null);

/**
 * Hook to interact with the nearest ErrorBoundary
 *
 * @example
 * ```tsx
 * const { captureError, resetError } = useErrorBoundary();
 *
 * const handleError = () => {
 *   captureError(new Error('Something went wrong'));
 * };
 * ```
 */
export function useErrorBoundary(): ErrorBoundaryContextType {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    return {
      captureError: (error: Error) => {
        throw error;
      },
      resetError: () => {
        // No-op if not within ErrorBoundary
      },
    };
  }
  return context;
}

/**
 * ErrorBoundary Component
 *
 * Catches React errors in child components and displays fallback UI.
 * Provides retry functionality and integrates with error logging.
 *
 * Features:
 * - Automatic error catching
 * - Reset/retry functionality
 * - Development vs production error display
 * - Custom fallback support
 * - Error logging integration
 * - useErrorBoundary hook support
 *
 * @example
 * ```tsx
 * <ErrorBoundary onError={(error) => logToSentry(error)}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to monitoring service
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  captureError = (error: Error): void => {
    this.setState({
      hasError: true,
      error,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.reset} />;
      }

      // Default error UI
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
              <AlertCircle className="w-6 h-6 text-red-600" aria-hidden="true" />
            </div>

            {/* Error Title */}
            <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
              Something went wrong
            </h2>

            {/* Error Message */}
            <p className="mt-2 text-sm text-center text-gray-600">
              We&apos;re sorry, but an unexpected error occurred. Please try again or contact support if the problem persists.
            </p>

            {/* Error Details (Development Only) */}
            {isDevelopment && (
              <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Error Details:</h3>
                <p className="text-xs font-mono text-gray-700 break-words">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.reset}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <ErrorBoundaryContext.Provider
        value={{
          captureError: this.captureError,
          resetError: this.reset,
        }}
      >
        {this.props.children}
      </ErrorBoundaryContext.Provider>
    );
  }
}
