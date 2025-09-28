'use client';

import React from 'react';
import { AlertTriangle, RotateCcw, MessageSquare } from 'lucide-react';

interface ErrorFallbackProps {
  error?: Error;
  resetError: () => void;
  onShowDialog?: () => void;
}

export function ErrorFallback({ error, resetError, onShowDialog }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>

        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          Oops! Something went wrong
        </h1>

        <p className="text-sm text-gray-600 mb-6">
          We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-6 p-3 bg-red-50 rounded border text-left">
            <p className="text-sm font-medium text-red-800 mb-1">
              Error: {error.message}
            </p>
            <pre className="text-xs text-red-700 overflow-auto">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={resetError}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </button>

          {onShowDialog && (
            <button
              onClick={onShowDialog}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Report Issue
            </button>
          )}

          <button
            onClick={() => window.location.href = '/'}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Homepage
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Error ID: {Math.random().toString(36).substr(2, 9)}
        </p>
      </div>
    </div>
  );
}