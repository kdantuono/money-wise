/**
 * Tests for Loading components
 * Tests LoadingSpinner, LoadingScreen, LoadingCard, and LoadingButton
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import {
  LoadingSpinner,
  LoadingScreen,
  LoadingCard,
  LoadingButton,
} from '../../../src/components/ui/loading';

describe('Loading Components', () => {
  describe('LoadingSpinner', () => {
    it('renders spinner element', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('applies animation classes', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('animate-spin', 'rounded-full');
    });

    it('renders with default medium size', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });

    it('renders different sizes correctly', () => {
      const sizes = [
        { size: 'sm' as const, classes: ['h-4', 'w-4'] },
        { size: 'md' as const, classes: ['h-8', 'w-8'] },
        { size: 'lg' as const, classes: ['h-12', 'w-12'] },
        { size: 'xl' as const, classes: ['h-16', 'w-16'] },
      ];

      sizes.forEach(({ size, classes }) => {
        const { container, unmount } = render(<LoadingSpinner size={size} />);
        const spinner = container.querySelector('.animate-spin');

        classes.forEach(className => {
          expect(spinner).toHaveClass(className);
        });

        unmount();
      });
    });

    it('applies custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-spinner" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('custom-spinner');
    });

    it('applies border styling for visual effect', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('border-2', 'border-gray-300', 'border-t-primary');
    });
  });

  describe('LoadingScreen', () => {
    it('renders loading screen with default message', () => {
      render(<LoadingScreen />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<LoadingScreen message="Please wait while we process your request" />);

      expect(screen.getByText('Please wait while we process your request')).toBeInTheDocument();
    });

    it('includes loading spinner', () => {
      render(<LoadingScreen />);

      const container = screen.getByText('Loading...').parentElement;
      expect(container).toBeInTheDocument();

      // Check for spinner by looking for animation classes
      const spinner = container?.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('applies full-screen layout classes', () => {
      const { container } = render(<LoadingScreen />);

      const loadingScreen = container.firstChild as HTMLElement;
      expect(loadingScreen).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center');
    });

    it('renders with different spinner sizes', () => {
      const { container: containerSm } = render(<LoadingScreen size="sm" />);
      const spinnerSm = containerSm.querySelector('.h-4.w-4');
      expect(spinnerSm).toBeInTheDocument();

      const { container: containerXl } = render(<LoadingScreen size="xl" />);
      const spinnerXl = containerXl.querySelector('.h-16.w-16');
      expect(spinnerXl).toBeInTheDocument();
    });

    it('uses large spinner by default', () => {
      const { container } = render(<LoadingScreen />);

      const spinner = container.querySelector('.h-12.w-12');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('LoadingCard', () => {
    it('renders loading card with default message', () => {
      render(<LoadingCard />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<LoadingCard message="Fetching data..." />);

      expect(screen.getByText('Fetching data...')).toBeInTheDocument();
    });

    it('includes loading spinner', () => {
      const { container } = render(<LoadingCard />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('applies card layout classes', () => {
      const { container } = render(<LoadingCard />);

      const loadingCard = container.firstChild as HTMLElement;
      expect(loadingCard).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'p-8');
    });

    it('applies custom className', () => {
      const { container } = render(<LoadingCard className="custom-card" />);

      const loadingCard = container.firstChild as HTMLElement;
      expect(loadingCard).toHaveClass('custom-card');
    });

    it('uses medium spinner by default', () => {
      const { container } = render(<LoadingCard />);

      const spinner = container.querySelector('.h-8.w-8');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('LoadingButton', () => {
    it('renders children when not loading', () => {
      render(
        <LoadingButton isLoading={false}>
          Submit Form
        </LoadingButton>
      );

      expect(screen.getByText('Submit Form')).toBeInTheDocument();
    });

    it('renders loading text when loading', () => {
      render(
        <LoadingButton isLoading={true}>
          Submit Form
        </LoadingButton>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Submit Form')).not.toBeInTheDocument();
    });

    it('renders custom loading text', () => {
      render(
        <LoadingButton isLoading={true} loadingText="Submitting...">
          Submit Form
        </LoadingButton>
      );

      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });

    it('renders as button element', () => {
      render(
        <LoadingButton isLoading={false}>
          Click me
        </LoadingButton>
      );

      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
    });

    it('is disabled when loading', () => {
      render(
        <LoadingButton isLoading={true}>
          Submit
        </LoadingButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('is enabled when not loading', () => {
      render(
        <LoadingButton isLoading={false}>
          Submit
        </LoadingButton>
      );

      const button = screen.getByRole('button', { name: 'Submit' });
      expect(button).not.toBeDisabled();
    });

    it('shows spinner when loading', () => {
      const { container } = render(
        <LoadingButton isLoading={true}>
          Submit
        </LoadingButton>
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('h-4', 'w-4', 'mr-2'); // sm size with margin
    });

    it('hides spinner when not loading', () => {
      const { container } = render(
        <LoadingButton isLoading={false}>
          Submit
        </LoadingButton>
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <LoadingButton isLoading={false} className="custom-button">
          Submit
        </LoadingButton>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-button');
    });

    it('maintains flex layout for content alignment', () => {
      render(
        <LoadingButton isLoading={true}>
          Submit
        </LoadingButton>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('handles click events when not loading', async () => {
      const handleClick = vi.fn();
      const { user } = render(
        <div onClick={handleClick}>
          <LoadingButton isLoading={false}>
            Click me
          </LoadingButton>
        </div>
      );

      const button = screen.getByRole('button');
      await user.click(button);
      expect(handleClick).toHaveBeenCalled();
    });

    it('prevents interaction when loading (disabled state)', async () => {
      const { user } = render(
        <LoadingButton isLoading={true}>
          Loading content
        </LoadingButton>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      // Button is disabled, so it remains disabled
      expect(button).toBeDisabled();
    });
  });

  describe('Loading Component Integration', () => {
    it('can compose LoadingCard inside a Card', () => {
      render(
        <div data-testid="card-wrapper">
          <LoadingCard message="Loading transactions..." />
        </div>
      );

      expect(screen.getByText('Loading transactions...')).toBeInTheDocument();
      expect(screen.getByTestId('card-wrapper')).toBeInTheDocument();
    });

    it('LoadingButton can be used in forms', () => {
      render(
        <form>
          <LoadingButton isLoading={false}>
            Submit Form
          </LoadingButton>
        </form>
      );

      const button = screen.getByRole('button', { name: 'Submit Form' });
      expect(button.closest('form')).toBeInTheDocument();
    });
  });
});
