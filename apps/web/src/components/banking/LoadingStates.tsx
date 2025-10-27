'use client';

/**
 * LoadingStates Module
 *
 * Collection of skeleton loaders and loading indicators for banking components.
 * Used to show placeholder content while data is loading.
 *
 * Exports:
 * - AccountSkeleton: Skeleton for account list item
 * - AccountDetailsSkeleton: Skeleton for full account details view
 * - TransactionSkeleton: Skeleton for transaction list item
 * - SyncingIndicator: Animated indicator showing sync in progress
 * - ErrorAlert: Generic error display component
 * - ErrorBoundary: React error boundary wrapper
 */

import React, { ReactNode } from 'react';

/**
 * Reusable skeleton pulse animation
 */
function PulseBox({
  className = 'h-6 bg-gray-200 rounded',
}: {
  className?: string;
}) {
  return <div className={`${className} animate-pulse`} aria-hidden="true" />;
}

/**
 * AccountSkeleton Component
 * Placeholder for account list item while loading
 */
export function AccountSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-50 p-4 border-b border-gray-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <PulseBox className="h-6 w-3/4 bg-gray-200 rounded mb-2" />
            <PulseBox className="h-4 w-1/2 bg-gray-200 rounded" />
          </div>
          <PulseBox className="h-6 w-20 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Balance */}
        <PulseBox className="h-8 w-2/3 bg-gray-200 rounded" />

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <PulseBox className="h-4 w-full bg-gray-200 rounded" />
          <PulseBox className="h-4 w-full bg-gray-200 rounded" />
          <PulseBox className="h-4 w-full bg-gray-200 rounded" />
          <PulseBox className="h-4 w-full bg-gray-200 rounded" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <PulseBox className="flex-1 h-10 bg-gray-200 rounded" />
          <PulseBox className="flex-1 h-10 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * AccountDetailsSkeleton Component
 * Placeholder for full account details view while loading
 */
export function AccountDetailsSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-6 py-8 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <PulseBox className="h-8 w-1/2 bg-gray-300 rounded mb-2" />
            <PulseBox className="h-5 w-1/3 bg-gray-200 rounded" />
          </div>
          <PulseBox className="h-8 w-32 bg-gray-200 rounded-full" />
        </div>

        {/* Balance */}
        <div className="flex items-baseline gap-2">
          <PulseBox className="h-12 w-2/3 bg-gray-300 rounded" />
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200">
          {/* Basic Info */}
          <section className="space-y-3">
            <PulseBox className="h-4 w-32 bg-gray-300 rounded" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <PulseBox className="h-3 w-20 bg-gray-200 rounded mb-1" />
                <PulseBox className="h-4 w-full bg-gray-200 rounded" />
              </div>
            ))}
          </section>

          {/* Additional Info */}
          <section className="space-y-3">
            <PulseBox className="h-4 w-32 bg-gray-300 rounded" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <PulseBox className="h-3 w-20 bg-gray-200 rounded mb-1" />
                <PulseBox className="h-4 w-full bg-gray-200 rounded" />
              </div>
            ))}
          </section>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <PulseBox className="flex-1 h-12 bg-gray-200 rounded-lg" />
          <PulseBox className="flex-1 h-12 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * TransactionSkeleton Component
 * Placeholder for transaction list item while loading
 */
export function TransactionSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Transaction Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <PulseBox className="h-5 w-3/4 bg-gray-200 rounded" />
          <PulseBox className="h-4 w-1/2 bg-gray-200 rounded" />
          <PulseBox className="h-3 w-1/3 bg-gray-200 rounded" />
        </div>

        {/* Amount */}
        <div className="text-right space-y-2 flex-shrink-0">
          <PulseBox className="h-6 w-24 bg-gray-200 rounded" />
        </div>

        {/* Indicator */}
        <PulseBox className="w-1 h-12 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

/**
 * SyncingIndicator Component
 * Shows that a sync operation is in progress
 */
interface SyncingIndicatorProps {
  accountName?: string;
  className?: string;
}

export function SyncingIndicator({
  accountName = 'Account',
  className = '',
}: SyncingIndicatorProps) {
  return (
    <div
      className={`flex items-center justify-center gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Syncing account data"
    >
      <svg
        className="w-5 h-5 text-blue-600 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <div>
        <p className="font-medium text-blue-900">Syncing {accountName}</p>
        <p className="text-sm text-blue-700">Please wait...</p>
      </div>
    </div>
  );
}

/**
 * ErrorAlert Component
 * Generic error display with icon and message
 */
interface ErrorAlertProps {
  title?: string;
  message: string;
  details?: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorAlert({
  title = 'Error',
  message,
  details,
  onDismiss,
  className = '',
}: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <svg
          className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4v2m0-11a9 9 0 110 18 9 9 0 010-18z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-red-900">{title}</h3>
          <p className="text-sm text-red-800 mt-1">{message}</p>
          {details && (
            <p className="text-xs text-red-700 mt-2 bg-red-100 rounded px-2 py-1 font-mono">
              {details}
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="text-red-600 hover:text-red-700 font-semibold text-sm flex-shrink-0
              focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded p-1"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * ErrorBoundary Component
 * React error boundary to catch and display component errors
 */
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
    console.error('Banking component error:', error);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error) ?? (
          <ErrorAlert
            title="Component Error"
            message="Something went wrong while displaying this banking component."
            details={this.state.error.message}
            onDismiss={() => this.setState({ hasError: false, error: null })}
          />
        )
      );
    }

    return this.props.children;
  }
}
