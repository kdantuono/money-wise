/**
 * EditAccountForm Component Tests
 *
 * Tests form rendering, validation, submission for editing manual accounts.
 * Supports editing name, balance, currency, type, institution, icon, and color.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { EditAccountForm } from '../../../src/components/accounts/EditAccountForm';
import { AccountType, AccountSource } from '../../../src/types/account.types';

describe('EditAccountForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  const mockOnCancel = vi.fn();

  const mockAccount = {
    id: 'acc-123',
    userId: 'user-1',
    name: 'My Savings',
    type: AccountType.SAVINGS,
    source: AccountSource.MANUAL,
    currentBalance: 1500.50,
    currency: 'USD',
    institutionName: 'Local Bank',
    displayName: 'Local Bank - My Savings',
    isManualAccount: true,
    isPlaidAccount: false,
    needsSync: false,
    isActive: true,
    syncEnabled: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  const getDefaultProps = () => ({
    account: mockAccount,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  });

  describe('Rendering', () => {
    it('renders the form with correct title', () => {
      render(<EditAccountForm {...getDefaultProps()} />);

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Edit Account');
    });

    it('renders form fields pre-filled with account data', () => {
      render(<EditAccountForm {...getDefaultProps()} />);

      expect(screen.getByTestId('account-name-input')).toHaveValue('My Savings');
      expect(screen.getByTestId('account-type-select')).toHaveValue(AccountType.SAVINGS);
      expect(screen.getByTestId('account-balance-input')).toHaveValue(1500.50);
      expect(screen.getByTestId('account-currency-select')).toHaveValue('USD');
      expect(screen.getByTestId('account-institution-input')).toHaveValue('Local Bank');
    });

    it('renders update and cancel buttons', () => {
      render(<EditAccountForm {...getDefaultProps()} />);

      expect(screen.getByRole('button', { name: /update account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders icon selector', () => {
      render(<EditAccountForm {...getDefaultProps()} />);

      expect(screen.getByTestId('account-icon-selector')).toBeInTheDocument();
    });

    it('renders color picker', () => {
      render(<EditAccountForm {...getDefaultProps()} />);

      expect(screen.getByTestId('account-color-picker')).toBeInTheDocument();
    });

    it('renders credit limit field only for credit card type', async () => {
      const creditCardAccount = {
        ...mockAccount,
        type: AccountType.CREDIT_CARD,
        creditLimit: 5000,
      };

      render(<EditAccountForm {...getDefaultProps()} account={creditCardAccount} />);

      expect(screen.getByLabelText(/credit limit/i)).toBeInTheDocument();
      expect(screen.getByTestId('account-credit-limit-input')).toHaveValue(5000);
    });

    it('applies custom className', () => {
      const { container } = render(
        <EditAccountForm {...getDefaultProps()} className="custom-form-class" />
      );

      expect(container.querySelector('.custom-form-class')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows error when account name is empty', async () => {
      const { user } = render(<EditAccountForm {...getDefaultProps()} />);

      await user.clear(screen.getByTestId('account-name-input'));
      await user.click(screen.getByRole('button', { name: /update account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/account name is required/i);
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows error when account name is too short', async () => {
      const { user } = render(<EditAccountForm {...getDefaultProps()} />);

      await user.clear(screen.getByTestId('account-name-input'));
      await user.type(screen.getByTestId('account-name-input'), 'AB');
      await user.click(screen.getByRole('button', { name: /update account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/at least 3 characters/i);
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('allows updating balance to zero', async () => {
      const { user } = render(<EditAccountForm {...getDefaultProps()} />);

      await user.clear(screen.getByTestId('account-balance-input'));
      await user.type(screen.getByTestId('account-balance-input'), '0');
      await user.click(screen.getByRole('button', { name: /update account/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('allows negative balance', async () => {
      const { user } = render(<EditAccountForm {...getDefaultProps()} />);

      await user.clear(screen.getByTestId('account-balance-input'));
      await user.type(screen.getByTestId('account-balance-input'), '-500');
      await user.click(screen.getByRole('button', { name: /update account/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            currentBalance: -500,
          })
        );
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with updated data', async () => {
      const { user } = render(<EditAccountForm {...getDefaultProps()} />);

      await user.clear(screen.getByTestId('account-name-input'));
      await user.type(screen.getByTestId('account-name-input'), 'Updated Savings');
      await user.clear(screen.getByTestId('account-balance-input'));
      await user.type(screen.getByTestId('account-balance-input'), '2000');

      await user.click(screen.getByRole('button', { name: /update account/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Savings',
            currentBalance: 2000,
          })
        );
      });
    });

    it('calls onSubmit with account ID', async () => {
      const { user } = render(<EditAccountForm {...getDefaultProps()} />);

      await user.click(screen.getByRole('button', { name: /update account/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'acc-123',
          })
        );
      });
    });

    it('includes icon and color when selected', async () => {
      const { user } = render(<EditAccountForm {...getDefaultProps()} />);

      // Select an icon
      const iconButton = screen.getByTestId('icon-wallet');
      await user.click(iconButton);

      // Select a color
      const colorButton = screen.getByTestId('color-blue');
      await user.click(colorButton);

      await user.click(screen.getByRole('button', { name: /update account/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            settings: expect.objectContaining({
              icon: 'wallet',
              color: 'blue',
            }),
          })
        );
      });
    });

    it('trims whitespace from name and institution', async () => {
      const { user } = render(<EditAccountForm {...getDefaultProps()} />);

      await user.clear(screen.getByTestId('account-name-input'));
      await user.type(screen.getByTestId('account-name-input'), '  Trimmed Name  ');
      await user.clear(screen.getByTestId('account-institution-input'));
      await user.type(screen.getByTestId('account-institution-input'), '  Some Bank  ');

      await user.click(screen.getByRole('button', { name: /update account/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Trimmed Name',
            institutionName: 'Some Bank',
          })
        );
      });
    });
  });

  describe('Loading State', () => {
    it('disables form fields while submitting', () => {
      render(<EditAccountForm {...getDefaultProps()} isSubmitting />);

      expect(screen.getByTestId('account-name-input')).toBeDisabled();
      expect(screen.getByTestId('account-type-select')).toBeDisabled();
      expect(screen.getByTestId('account-balance-input')).toBeDisabled();
      expect(screen.getByTestId('account-currency-select')).toBeDisabled();
      expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('shows loading text on submit button', () => {
      render(<EditAccountForm {...getDefaultProps()} isSubmitting />);

      expect(screen.getByRole('button', { name: /updating/i })).toHaveTextContent('Updating...');
    });
  });

  describe('Cancel', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const { user } = render(<EditAccountForm {...getDefaultProps()} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Error Display', () => {
    it('displays server error message', () => {
      render(<EditAccountForm {...getDefaultProps()} error="Server error occurred" />);

      expect(screen.getByRole('alert')).toHaveTextContent('Server error occurred');
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for all form inputs', () => {
      render(<EditAccountForm {...getDefaultProps()} />);

      expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/account type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/current balance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    });

    it('has accessible error messages with alert role', () => {
      render(<EditAccountForm {...getDefaultProps()} error="Test error" />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Test error');
    });
  });

  describe('Modal Behavior', () => {
    it('renders as a dialog when isModal is true', () => {
      render(<EditAccountForm {...getDefaultProps()} isModal />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has proper aria-labelledby for modal', () => {
      render(<EditAccountForm {...getDefaultProps()} isModal />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });
  });
});
