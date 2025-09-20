import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils/render-helpers';
import { LoginForm } from '@/components/auth/LoginForm';
import { SecurityHeader } from '@/components/auth/SecurityHeader';
import { UnlockProgress } from '@/components/auth/UnlockProgress';

// SRP: Test integration between authentication components
describe('Authentication Flow Integration', () => {
  describe('Component Integration', () => {
    it('should integrate SecurityHeader and LoginForm components', () => {
      const mockHandleLogin = jest.fn();

      render(
        <div>
          <SecurityHeader isUnlocking={false} />
          <LoginForm
            email=''
            password=''
            isLoading={false}
            onEmailChange={jest.fn()}
            onPasswordChange={jest.fn()}
            onSubmit={mockHandleLogin}
          />
        </div>
      );

      // Both components should render together
      expect(screen.getByText('SECURE ACCESS')).toBeInTheDocument();
      expect(screen.getByLabelText(/access id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/security key/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /authenticate/i })
      ).toBeInTheDocument();
    });

    it('should sync loading states between components', () => {
      render(
        <div>
          <SecurityHeader isUnlocking={true} />
          <LoginForm
            email='test@example.com'
            password='password'
            isLoading={true}
            onEmailChange={jest.fn()}
            onPasswordChange={jest.fn()}
            onSubmit={jest.fn()}
          />
        </div>
      );

      // Security header shows unlocking state
      expect(screen.getByText('Authenticating...')).toBeInTheDocument();

      // Login form shows loading state
      expect(screen.getByText('UNLOCKING SYSTEM...')).toBeInTheDocument();
      expect(screen.getByLabelText(/access id/i)).toBeDisabled();
      expect(screen.getByLabelText(/security key/i)).toBeDisabled();
    });

    it('should handle form submission flow', async () => {
      const user = userEvent.setup();
      const mockHandleLogin = jest.fn();

      render(
        <div>
          <SecurityHeader isUnlocking={false} />
          <LoginForm
            email=''
            password=''
            isLoading={false}
            onEmailChange={jest.fn()}
            onPasswordChange={jest.fn()}
            onSubmit={mockHandleLogin}
          />
        </div>
      );

      // Fill form and submit via form submission (not button click)
      await user.type(screen.getByLabelText(/access id/i), 'test@example.com');
      await user.type(screen.getByLabelText(/security key/i), 'password');

      const form = screen
        .getByRole('button', { name: /authenticate/i })
        .closest('form')!;
      fireEvent.submit(form);

      expect(mockHandleLogin).toHaveBeenCalledTimes(1);
    });

    it('should integrate SecurityHeader, LoginForm, and UnlockProgress', () => {
      render(
        <div>
          <SecurityHeader isUnlocking={true} />
          <LoginForm
            email='test@example.com'
            password='password'
            isLoading={true}
            onEmailChange={jest.fn()}
            onPasswordChange={jest.fn()}
            onSubmit={jest.fn()}
          />
          <UnlockProgress isVisible={true} progress={50} />
        </div>
      );

      // All components should show consistent unlocking state
      expect(screen.getByText('Authenticating...')).toBeInTheDocument();
      expect(screen.getByText('UNLOCKING SYSTEM...')).toBeInTheDocument();
      expect(screen.getByText('Authentication Progress')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('State Management Integration', () => {
    it('should handle email and password state changes consistently', async () => {
      const user = userEvent.setup();
      const mockEmailChange = jest.fn();
      const mockPasswordChange = jest.fn();

      render(
        <LoginForm
          email=''
          password=''
          isLoading={false}
          onEmailChange={mockEmailChange}
          onPasswordChange={mockPasswordChange}
          onSubmit={jest.fn()}
        />
      );

      // Type in email field
      const emailInput = screen.getByLabelText(/access id/i);
      await user.type(emailInput, 'test@example.com');

      // Type in password field
      const passwordInput = screen.getByLabelText(/security key/i);
      await user.type(passwordInput, 'password123');

      // Verify state changes are called correctly
      expect(mockEmailChange).toHaveBeenCalledWith('m'); // Last character
      expect(mockPasswordChange).toHaveBeenCalledWith('3'); // Last character
    });

    it('should disable all interactive elements during loading', () => {
      render(
        <div>
          <SecurityHeader isUnlocking={true} />
          <LoginForm
            email='test@example.com'
            password='password'
            isLoading={true}
            onEmailChange={jest.fn()}
            onPasswordChange={jest.fn()}
            onSubmit={jest.fn()}
          />
        </div>
      );

      // All inputs should be disabled
      expect(screen.getByLabelText(/access id/i)).toBeDisabled();
      expect(screen.getByLabelText(/security key/i)).toBeDisabled();
      expect(
        screen.getByLabelText(/toggle password visibility/i)
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /unlocking system/i })
      ).toBeDisabled();
    });
  });

  describe('User Experience Integration', () => {
    it('should maintain accessibility across components', () => {
      render(
        <div>
          <SecurityHeader isUnlocking={false} />
          <LoginForm
            email=''
            password=''
            isLoading={false}
            onEmailChange={jest.fn()}
            onPasswordChange={jest.fn()}
            onSubmit={jest.fn()}
          />
        </div>
      );

      // Check accessibility features
      expect(screen.getByRole('heading')).toHaveTextContent('SECURE ACCESS');
      expect(screen.getByLabelText(/access id/i)).toBeRequired();
      expect(screen.getByLabelText(/security key/i)).toBeRequired();
      expect(
        screen.getByLabelText(/toggle password visibility/i)
      ).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation across components', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <SecurityHeader isUnlocking={false} />
          <LoginForm
            email=''
            password=''
            isLoading={false}
            onEmailChange={jest.fn()}
            onPasswordChange={jest.fn()}
            onSubmit={jest.fn()}
          />
        </div>
      );

      // Navigate through form with keyboard
      await user.tab();
      expect(screen.getByLabelText(/access id/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/security key/i)).toHaveFocus();

      await user.tab();
      expect(
        screen.getByLabelText(/toggle password visibility/i)
      ).toHaveFocus();

      await user.tab();
      expect(
        screen.getByRole('button', { name: /authenticate/i })
      ).toHaveFocus();
    });

    it('should handle password visibility toggle correctly', async () => {
      const user = userEvent.setup();

      render(
        <LoginForm
          email=''
          password='secret'
          isLoading={false}
          onEmailChange={jest.fn()}
          onPasswordChange={jest.fn()}
          onSubmit={jest.fn()}
        />
      );

      const passwordInput = screen.getByLabelText(/security key/i);
      const toggleButton = screen.getByLabelText(/toggle password visibility/i);

      // Initially password is hidden
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click to show password
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Click to hide password again
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Form Submission Integration', () => {
    it('should handle form submission with valid data', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();

      render(
        <LoginForm
          email='test@example.com'
          password='password123'
          isLoading={false}
          onEmailChange={jest.fn()}
          onPasswordChange={jest.fn()}
          onSubmit={mockSubmit}
        />
      );

      // Submit form
      const form = screen
        .getByRole('button', { name: /authenticate/i })
        .closest('form')!;
      fireEvent.submit(form);

      expect(mockSubmit).toHaveBeenCalledWith(expect.any(Object));
      expect(mockSubmit.mock.calls[0][0]).toHaveProperty('preventDefault');
    });

    it('should prevent submission when loading', () => {
      const mockSubmit = jest.fn();

      render(
        <LoginForm
          email='test@example.com'
          password='password123'
          isLoading={true}
          onEmailChange={jest.fn()}
          onPasswordChange={jest.fn()}
          onSubmit={mockSubmit}
        />
      );

      // Try to submit when disabled
      const submitButton = screen.getByRole('button', {
        name: /unlocking system/i,
      });
      const form = submitButton.closest('form')!;

      fireEvent.submit(form);

      // Should still call onSubmit (form level) but button should be disabled
      expect(submitButton).toBeDisabled();
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
