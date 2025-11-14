/**
 * Tests for LoadingStates components
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import {
  AccountSkeleton,
  AccountDetailsSkeleton,
  TransactionSkeleton,
  SyncingIndicator,
  ErrorAlert,
  ErrorBoundary,
} from '../../../src/components/banking/LoadingStates';

describe('LoadingStates Components', () => {
  describe('AccountSkeleton', () => {
    it('renders skeleton correctly', () => {
      const { container } = render(<AccountSkeleton />);

      const pulseElements = container.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('has correct structure', () => {
      const { container } = render(<AccountSkeleton />);

      expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
      expect(container.querySelector('.border')).toBeInTheDocument();
      expect(container.querySelector('.bg-white')).toBeInTheDocument();
    });

    it('includes header and content sections', () => {
      const { container } = render(<AccountSkeleton />);

      const sections = container.querySelectorAll('.p-4');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('has grid layout for info', () => {
      const { container } = render(<AccountSkeleton />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('AccountDetailsSkeleton', () => {
    it('renders skeleton correctly', () => {
      const { container } = render(<AccountDetailsSkeleton />);

      const pulseElements = container.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('has gradient header', () => {
      const { container } = render(<AccountDetailsSkeleton />);

      const header = container.querySelector('.bg-gradient-to-r');
      expect(header).toBeInTheDocument();
    });

    it('includes multiple sections', () => {
      const { container } = render(<AccountDetailsSkeleton />);

      const sections = container.querySelectorAll('section');
      expect(sections.length).toBe(2); // Basic Info and Additional Info
    });

    it('has action buttons placeholder', () => {
      const { container } = render(<AccountDetailsSkeleton />);

      const flexContainer = container.querySelector('.flex.gap-3');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe('TransactionSkeleton', () => {
    it('renders skeleton correctly', () => {
      const { container } = render(<TransactionSkeleton />);

      const pulseElements = container.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('has correct layout structure', () => {
      const { container } = render(<TransactionSkeleton />);

      expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
      expect(container.querySelector('.border')).toBeInTheDocument();
    });

    it('includes transaction info placeholders', () => {
      const { container } = render(<TransactionSkeleton />);

      const infoSection = container.querySelector('.flex-1.min-w-0');
      expect(infoSection).toBeInTheDocument();
    });

    it('includes amount placeholder', () => {
      const { container } = render(<TransactionSkeleton />);

      const amountSection = container.querySelector('.text-right');
      expect(amountSection).toBeInTheDocument();
    });

    it('includes visual indicator', () => {
      const { container } = render(<TransactionSkeleton />);

      const indicator = container.querySelector('.rounded-full');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('SyncingIndicator', () => {
    it('renders with default props', () => {
      render(<SyncingIndicator />);

      expect(screen.getByText('Syncing Account')).toBeInTheDocument();
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('renders with custom account name', () => {
      render(<SyncingIndicator accountName="Premium Checking" />);

      expect(screen.getByText('Syncing Premium Checking')).toBeInTheDocument();
    });

    it('has animated spinner', () => {
      const { container } = render(<SyncingIndicator />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('has correct accessibility attributes', () => {
      render(<SyncingIndicator />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-label', 'Syncing account data');
    });

    it('applies custom className', () => {
      const { container } = render(<SyncingIndicator className="custom-class" />);

      const element = container.querySelector('.custom-class');
      expect(element).toBeInTheDocument();
    });
  });

  describe('ErrorAlert', () => {
    it('renders with required props', () => {
      render(<ErrorAlert message="Something went wrong" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders with custom title', () => {
      render(<ErrorAlert title="Custom Error" message="Test message" />);

      expect(screen.getByText('Custom Error')).toBeInTheDocument();
    });

    it('displays details when provided', () => {
      render(
        <ErrorAlert
          message="Operation failed"
          details="Network timeout after 30s"
        />
      );

      expect(screen.getByText('Network timeout after 30s')).toBeInTheDocument();
    });

    it('shows dismiss button when onDismiss provided', () => {
      const onDismiss = vi.fn();

      render(<ErrorAlert message="Test error" onDismiss={onDismiss} />);

      expect(screen.getByRole('button', { name: /dismiss error/i })).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button clicked', async () => {
      const onDismiss = vi.fn();

      const { user } = render(<ErrorAlert message="Test error" onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalled();
    });

    it('does not show dismiss button when onDismiss not provided', () => {
      render(<ErrorAlert message="Test error" />);

      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ErrorAlert message="Test" className="custom-class" />
      );

      const alert = container.querySelector('.custom-class');
      expect(alert).toBeInTheDocument();
    });

    it('has error icon', () => {
      const { container } = render(<ErrorAlert message="Test error" />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('ErrorBoundary', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    // Suppress console.error for these tests
    const originalError = console.error;
    beforeEach(() => {
      console.error = vi.fn();
    });

    afterEach(() => {
      console.error = originalError;
    });

    it('renders children when no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('catches and displays error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Component Error')).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('displays error message in details', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('uses custom fallback when provided', () => {
      const customFallback = (error: Error) => (
        <div>Custom error: {error.message}</div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
    });

    it('can dismiss error and re-render children', async () => {
      const { user, rerender } = render(
        <ErrorBoundary key="error-state">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      // After dismissing, re-render with a fresh ErrorBoundary (new key) and no error
      rerender(
        <ErrorBoundary key="no-error-state">
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('logs error to console', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Banking component error:',
        expect.any(Error)
      );
    });
  });

  describe('PulseBox (internal)', () => {
    it('renders with default className', () => {
      // PulseBox is internal but we can test it through AccountSkeleton
      const { container } = render(<AccountSkeleton />);

      const pulseBoxes = container.querySelectorAll('.animate-pulse');
      expect(pulseBoxes.length).toBeGreaterThan(0);
    });

    it('has correct default styles', () => {
      const { container } = render(<AccountSkeleton />);

      const pulseBox = container.querySelector('.animate-pulse');
      expect(pulseBox).toHaveClass('bg-gray-200');
    });
  });

  describe('Integration scenarios', () => {
    it('multiple skeletons can be rendered together', () => {
      const { container } = render(
        <div>
          <AccountSkeleton />
          <TransactionSkeleton />
          <AccountDetailsSkeleton />
        </div>
      );

      const pulseElements = container.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(10);
    });

    it('loading state and error can be shown together', () => {
      render(
        <div>
          <SyncingIndicator accountName="Test Account" />
          <ErrorAlert message="Previous sync failed" />
        </div>
      );

      expect(screen.getByText('Syncing Test Account')).toBeInTheDocument();
      expect(screen.getByText('Previous sync failed')).toBeInTheDocument();
    });

    it('error boundary can wrap syncing indicator', () => {
      render(
        <ErrorBoundary>
          <SyncingIndicator accountName="Protected Account" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Syncing Protected Account')).toBeInTheDocument();
    });
  });
});
