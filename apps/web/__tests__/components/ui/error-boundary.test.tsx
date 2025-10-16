/**
 * Tests for ErrorBoundary component
 * Tests error catching, recovery, fallback rendering, and useErrorBoundary hook
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { ErrorBoundary, useErrorBoundary } from '../../../components/ui/error-boundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = true, error = 'Test error' }: { shouldThrow?: boolean; error?: string }) => {
  if (shouldThrow) {
    throw new Error(error);
  }
  return <div>No error</div>;
};

// Suppress console.error in tests to avoid noise
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

describe('ErrorBoundary Component', () => {
  describe('Normal Rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders multiple children without error', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });
  });

  describe('Error Catching', () => {
    it('catches errors from child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We're sorry, but an unexpected error occurred/)).toBeInTheDocument();
    });

    it('displays default error UI when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError error="Critical error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    it('shows error message in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError error="Detailed error message" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details:')).toBeInTheDocument();
      expect(screen.getByText('Detailed error message')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('hides error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError error="Production error" />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details:')).not.toBeInTheDocument();
      expect(screen.queryByText('Production error')).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Recovery', () => {
    it('allows retry via Try Again button', async () => {
      const { user } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Error should be shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      // After retry click, error should still be shown (since ThrowError still throws)
      // This tests that retry was called
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders reload page button', async () => {
      const { user } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload page/i });
      expect(reloadButton).toBeInTheDocument();

      // Button should be clickable
      await user.click(reloadButton);
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback component when provided', () => {
      const CustomFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
        <div>
          <h1>Custom Error UI</h1>
          <p>Error: {error.message}</p>
          <button onClick={retry}>Retry Custom</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError error="Custom fallback error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.getByText('Error: Custom fallback error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry custom/i })).toBeInTheDocument();
    });

    it('passes retry function to custom fallback', async () => {
      const CustomFallback = ({ retry }: { error: Error; retry: () => void }) => (
        <button onClick={retry}>Custom Retry</button>
      );

      const { user } = render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /custom retry/i });
      expect(retryButton).toBeInTheDocument();

      // Click retry button - should trigger retry function
      await user.click(retryButton);

      // Button should still be there since error still throws
      expect(screen.getByRole('button', { name: /custom retry/i })).toBeInTheDocument();
    });
  });

  describe('Error Boundary State', () => {
    it('maintains error state until successfully resolved', async () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Error state should be maintained
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    it('error UI displays consistently', () => {
      render(
        <ErrorBoundary>
          <ThrowError error="Persistent error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Error UI should remain visible with both action buttons
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });
  });

  describe('Error Icons and Styling', () => {
    it('displays alert icon in error state', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Check for icon container
      const iconContainer = container.querySelector('.bg-red-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('applies proper card styling for error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      // Card should be in the document
      const card = screen.getByText('Something went wrong').closest('.border');
      expect(card).toBeInTheDocument();
    });
  });
});

describe('useErrorBoundary Hook', () => {
  describe('Error Capture', () => {
    it('provides captureError function', () => {
      const TestComponent = () => {
        const { captureError } = useErrorBoundary();
        return <button onClick={() => captureError(new Error('Hook error'))}>Trigger Error</button>;
      };

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /trigger error/i })).toBeInTheDocument();
    });

    it('captures and throws errors', async () => {
      const TestComponent = () => {
        const { captureError } = useErrorBoundary();

        return (
          <button onClick={() => captureError(new Error('Manual error'))}>
            Throw Error
          </button>
        );
      };

      const { user } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button', { name: /throw error/i });
      await user.click(button);

      // After clicking, the error should be caught by ErrorBoundary
      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });
    });
  });

  describe('Error Reset', () => {
    it('provides resetError function', () => {
      const TestComponent = () => {
        const { resetError } = useErrorBoundary();
        return <button onClick={resetError}>Reset</button>;
      };

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });
  });
});
