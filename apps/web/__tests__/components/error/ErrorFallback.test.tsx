/**
 * Tests for ErrorFallback component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { ErrorFallback } from '../../../src/components/error/ErrorFallback';

describe('ErrorFallback Component', () => {
  const mockResetError = vi.fn();
  const mockShowDialog = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    window.location = { href: '' } as any;
  });

  describe('Basic Rendering', () => {
    it('renders error fallback UI with default props', () => {
      render(<ErrorFallback resetError={mockResetError} />);

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(
        screen.getByText(
          /We're sorry, but something unexpected happened/
        )
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('renders alert icon', () => {
      const { container } = render(<ErrorFallback resetError={mockResetError} />);

      // Check for the icon container
      const iconContainer = container.querySelector('.bg-red-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('displays error ID', () => {
      render(<ErrorFallback resetError={mockResetError} />);

      const errorIdText = screen.getByText(/Error ID:/);
      expect(errorIdText).toBeInTheDocument();
    });
  });

  describe('Error Display in Development', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('shows error message in development mode', () => {
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n  at test.ts:10:5';

      const { container } = render(<ErrorFallback error={error} resetError={mockResetError} />);

      // Check for error details container in development
      const errorDetails = container.querySelector('.bg-red-50');
      expect(errorDetails).toBeInTheDocument();
      expect(errorDetails).toHaveTextContent('Error: Test error message');
      expect(errorDetails).toHaveTextContent('at test.ts:10:5');
    });

    it('does not show error details in production', () => {
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n  at test.ts:10:5';

      render(<ErrorFallback error={error} resetError={mockResetError} />);

      expect(screen.queryByText(/Error: Test error message/)).not.toBeInTheDocument();
    });
  });

  describe('User Actions', () => {
    it('calls resetError when "Try Again" button is clicked', async () => {
      const { user } = render(<ErrorFallback resetError={mockResetError} />);

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      expect(mockResetError).toHaveBeenCalledTimes(1);
    });

    it('renders and calls onShowDialog when provided', async () => {
      const { user } = render(
        <ErrorFallback
          resetError={mockResetError}
          onShowDialog={mockShowDialog}
        />
      );

      const reportButton = screen.getByRole('button', { name: /report issue/i });
      expect(reportButton).toBeInTheDocument();

      await user.click(reportButton);

      expect(mockShowDialog).toHaveBeenCalledTimes(1);
    });

    it('does not render "Report Issue" button when onShowDialog is not provided', () => {
      render(<ErrorFallback resetError={mockResetError} />);

      expect(
        screen.queryByRole('button', { name: /report issue/i })
      ).not.toBeInTheDocument();
    });

    it('redirects to homepage when "Go to Homepage" button is clicked', async () => {
      const { user } = render(<ErrorFallback resetError={mockResetError} />);

      const homepageButton = screen.getByRole('button', {
        name: /go to homepage/i,
      });
      await user.click(homepageButton);

      expect(window.location.href).toBe('/');
    });
  });

  describe('Button Styling and Icons', () => {
    it('renders Try Again button with correct icon', () => {
      const { container } = render(<ErrorFallback resetError={mockResetError} />);

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainButton).toHaveClass('bg-blue-600');

      // Check for RotateCcw icon
      const icon = tryAgainButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders Report Issue button with correct icon when provided', () => {
      render(
        <ErrorFallback
          resetError={mockResetError}
          onShowDialog={mockShowDialog}
        />
      );

      const reportButton = screen.getByRole('button', { name: /report issue/i });
      expect(reportButton).toHaveClass('bg-white');

      // Check for MessageSquare icon
      const icon = reportButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders Go to Homepage button with correct styling', () => {
      render(<ErrorFallback resetError={mockResetError} />);

      const homepageButton = screen.getByRole('button', {
        name: /go to homepage/i,
      });
      expect(homepageButton).toHaveClass('bg-white');
    });
  });

  describe('Full Error Scenario', () => {
    it('renders complete error UI with all elements', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Complete test error');

      const { container } = render(
        <ErrorFallback
          error={error}
          resetError={mockResetError}
          onShowDialog={mockShowDialog}
        />
      );

      // Check main elements
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

      // Check for error in the error details container
      const errorDetails = container.querySelector('.bg-red-50');
      expect(errorDetails).toHaveTextContent('Complete test error');

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /report issue/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /go to homepage/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Accessibility', () => {
    it('has accessible button labels', () => {
      render(
        <ErrorFallback
          resetError={mockResetError}
          onShowDialog={mockShowDialog}
        />
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /report issue/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /go to homepage/i })
      ).toBeInTheDocument();
    });

    it('maintains visual hierarchy with headings', () => {
      render(<ErrorFallback resetError={mockResetError} />);

      const heading = screen.getByRole('heading', {
        name: 'Oops! Something went wrong',
      });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H1');
    });
  });
});
