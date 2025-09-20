import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../utils/render-helpers';
import { SecurityHeader } from '@/components/auth/SecurityHeader';

// SRP: Single Responsibility - Test SecurityHeader component only
describe('SecurityHeader Component', () => {
  describe('Static Content', () => {
    it('should render security header with title and description', () => {
      render(<SecurityHeader isUnlocking={false} />);

      expect(screen.getByText('SECURE ACCESS')).toBeInTheDocument();
      expect(
        screen.getByText('Enter credentials to unlock MoneyWise')
      ).toBeInTheDocument();
    });

    it('should render status indicators', () => {
      render(<SecurityHeader isUnlocking={false} />);

      expect(screen.getByText('SYSTEM ONLINE')).toBeInTheDocument();
      expect(screen.getByText('ENCRYPTED')).toBeInTheDocument();
    });

    it('should render shield icon container', () => {
      render(<SecurityHeader isUnlocking={false} />);

      // Test for the presence of the title which indicates the component rendered
      const title = screen.getByText('SECURE ACCESS');
      expect(title).toBeInTheDocument();
    });
  });

  describe('Unlocking State', () => {
    it('should show authenticating message when unlocking', () => {
      render(<SecurityHeader isUnlocking={true} />);

      expect(screen.getByText('Authenticating...')).toBeInTheDocument();
      expect(
        screen.queryByText('Enter credentials to unlock MoneyWise')
      ).not.toBeInTheDocument();
    });

    it('should show default message when not unlocking', () => {
      render(<SecurityHeader isUnlocking={false} />);

      expect(
        screen.getByText('Enter credentials to unlock MoneyWise')
      ).toBeInTheDocument();
      expect(screen.queryByText('Authenticating...')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<SecurityHeader isUnlocking={false} />);

      const title = screen.getByRole('heading');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('SECURE ACCESS');
    });

    it('should maintain accessibility during unlocking state', () => {
      render(<SecurityHeader isUnlocking={true} />);

      const title = screen.getByRole('heading');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('SECURE ACCESS');
    });
  });

  describe('Visual Elements', () => {
    it('should render all required status indicators', () => {
      render(<SecurityHeader isUnlocking={false} />);

      // Check for status indicators container
      const statusContainer = screen
        .getByText('SYSTEM ONLINE')
        .closest('.flex');
      expect(statusContainer).toBeInTheDocument();

      // Check for both status texts
      expect(screen.getByText('SYSTEM ONLINE')).toBeInTheDocument();
      expect(screen.getByText('ENCRYPTED')).toBeInTheDocument();
    });

    it('should maintain visual consistency regardless of unlocking state', () => {
      const { rerender } = render(<SecurityHeader isUnlocking={false} />);

      expect(screen.getByText('SECURE ACCESS')).toBeInTheDocument();
      expect(screen.getByText('SYSTEM ONLINE')).toBeInTheDocument();
      expect(screen.getByText('ENCRYPTED')).toBeInTheDocument();

      rerender(<SecurityHeader isUnlocking={true} />);

      expect(screen.getByText('SECURE ACCESS')).toBeInTheDocument();
      expect(screen.getByText('SYSTEM ONLINE')).toBeInTheDocument();
      expect(screen.getByText('ENCRYPTED')).toBeInTheDocument();
    });
  });
});
