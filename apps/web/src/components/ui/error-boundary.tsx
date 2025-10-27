/**
 * Error Boundary Component
 *
 * Catches React errors and displays fallback UI.
 */

'use client';

import React, { ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
    console.error('Error boundary caught:', error);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error) ?? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-red-800 font-semibold">Something went wrong</h2>
            <p className="text-red-600 text-sm mt-2">{this.state.error.message}</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
