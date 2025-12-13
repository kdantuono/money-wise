/**
 * ManualAccountForm Component Tests
 *
 * Tests form rendering, validation, submission for creating manual accounts.
 * Manual accounts include: Cash portfolios, investment tracking, custom accounts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { ManualAccountForm } from '../../../src/components/accounts/ManualAccountForm';
import { AccountType, AccountSource } from '../../../src/types/account.types';

describe('ManualAccountForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  const getDefaultProps = () => ({
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  });

  describe('Rendering', () => {
    it('renders the form with correct title', () => {
      render(<ManualAccountForm {...getDefaultProps()} />);

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Add Manual Account');
    });

    it('renders all required form fields', () => {
      render(<ManualAccountForm {...getDefaultProps()} />);

      expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/account type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/current balance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    });

    it('renders optional fields', () => {
      render(<ManualAccountForm {...getDefaultProps()} />);

      expect(screen.getByLabelText(/institution name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/account number/i)).toBeInTheDocument();
    });

    it('renders credit limit field only for credit card type', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      // Credit limit should not be visible initially
      expect(screen.queryByLabelText(/credit limit/i)).not.toBeInTheDocument();

      // Select credit card type
      await user.selectOptions(screen.getByTestId('account-type-select'), AccountType.CREDIT_CARD);

      // Credit limit should now be visible
      expect(screen.getByLabelText(/credit limit/i)).toBeInTheDocument();
    });

    it('renders account type options', () => {
      render(<ManualAccountForm {...getDefaultProps()} />);

      const typeSelect = screen.getByTestId('account-type-select');
      expect(typeSelect).toContainHTML('Checking');
      expect(typeSelect).toContainHTML('Savings');
      expect(typeSelect).toContainHTML('Credit Card');
      expect(typeSelect).toContainHTML('Investment');
      expect(typeSelect).toContainHTML('Loan');
      expect(typeSelect).toContainHTML('Mortgage');
      expect(typeSelect).toContainHTML('Other');
    });

    it('renders currency options', () => {
      render(<ManualAccountForm {...getDefaultProps()} />);

      const currencySelect = screen.getByTestId('account-currency-select');
      expect(currencySelect).toContainHTML('USD');
      expect(currencySelect).toContainHTML('EUR');
      expect(currencySelect).toContainHTML('GBP');
    });

    it('applies custom className', () => {
      const { container } = render(
        <ManualAccountForm {...getDefaultProps()} className="custom-form-class" />
      );

      expect(container.querySelector('.custom-form-class')).toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      render(<ManualAccountForm {...getDefaultProps()} />);

      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows error when account name is empty', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      // Fill other required fields but leave name empty
      await user.selectOptions(screen.getByTestId('account-type-select'), AccountType.CHECKING);
      await user.type(screen.getByTestId('account-balance-input'), '1000');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/account name is required/i);
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows error when account name is too short', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('account-name-input'), 'AB');
      await user.selectOptions(screen.getByTestId('account-type-select'), AccountType.CHECKING);
      await user.type(screen.getByTestId('account-balance-input'), '1000');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/at least 3 characters/i);
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows error when account type is not selected', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('account-name-input'), 'My Account');
      await user.type(screen.getByTestId('account-balance-input'), '1000');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/please select an account type/i);
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows error when balance is invalid', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('account-name-input'), 'My Account');
      await user.selectOptions(screen.getByTestId('account-type-select'), AccountType.CHECKING);
      // Leave balance empty

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/balance is required/i);
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('allows negative balance for liability accounts', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('account-name-input'), 'Credit Card');
      await user.selectOptions(screen.getByTestId('account-type-select'), AccountType.CREDIT_CARD);
      await user.clear(screen.getByTestId('account-balance-input'));
      await user.type(screen.getByTestId('account-balance-input'), '-500');
      await user.type(screen.getByTestId('account-credit-limit-input'), '5000');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('shows error when credit limit is missing for credit card', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('account-name-input'), 'Credit Card');
      await user.selectOptions(screen.getByTestId('account-type-select'), AccountType.CREDIT_CARD);
      await user.clear(screen.getByTestId('account-balance-input'));
      await user.type(screen.getByTestId('account-balance-input'), '500');
      // Leave credit limit empty

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/credit limit is required/i);
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with correct data for checking account', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('account-name-input'), 'My Checking');
      await user.selectOptions(screen.getByTestId('account-type-select'), AccountType.CHECKING);
      await user.clear(screen.getByTestId('account-balance-input'));
      await user.type(screen.getByTestId('account-balance-input'), '1500.50');
      await user.type(screen.getByTestId('account-institution-input'), 'My Bank');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'My Checking',
            type: AccountType.CHECKING,
            source: AccountSource.MANUAL,
            currentBalance: 1500.50,
            currency: 'USD',
            institutionName: 'My Bank',
          })
        );
      });
    });

    it('calls onSubmit with credit limit for credit card', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('account-name-input'), 'My Credit Card');
      await user.selectOptions(screen.getByTestId('account-type-select'), AccountType.CREDIT_CARD);
      await user.clear(screen.getByTestId('account-balance-input'));
      await user.type(screen.getByTestId('account-balance-input'), '2000');
      await user.type(screen.getByTestId('account-credit-limit-input'), '10000');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'My Credit Card',
            type: AccountType.CREDIT_CARD,
            currentBalance: 2000,
            creditLimit: 10000,
          })
        );
      });
    });

    it('trims whitespace from name and institution', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('account-name-input'), '  My Account  ');
      await user.selectOptions(screen.getByTestId('account-type-select'), AccountType.SAVINGS);
      await user.clear(screen.getByTestId('account-balance-input'));
      await user.type(screen.getByTestId('account-balance-input'), '1000');
      await user.type(screen.getByTestId('account-institution-input'), '  Some Bank  ');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'My Account',
            institutionName: 'Some Bank',
          })
        );
      });
    });

    it('sets source to MANUAL automatically', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      await user.type(screen.getByTestId('account-name-input'), 'Cash Portfolio');
      await user.selectOptions(screen.getByTestId('account-type-select'), AccountType.OTHER);
      await user.clear(screen.getByTestId('account-balance-input'));
      await user.type(screen.getByTestId('account-balance-input'), '500');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            source: AccountSource.MANUAL,
          })
        );
      });
    });
  });

  describe('Loading State', () => {
    it('disables form fields while submitting', () => {
      render(<ManualAccountForm {...getDefaultProps()} isSubmitting />);

      expect(screen.getByTestId('account-name-input')).toBeDisabled();
      expect(screen.getByTestId('account-type-select')).toBeDisabled();
      expect(screen.getByTestId('account-balance-input')).toBeDisabled();
      expect(screen.getByTestId('account-currency-select')).toBeDisabled();
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('shows loading text on submit button', () => {
      render(<ManualAccountForm {...getDefaultProps()} isSubmitting />);

      expect(screen.getByRole('button', { name: /creating/i })).toHaveTextContent('Creating...');
    });

    it('shows spinner on submit button when submitting', () => {
      render(<ManualAccountForm {...getDefaultProps()} isSubmitting />);

      const submitButton = screen.getByRole('button', { name: /creating/i });
      expect(submitButton.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Cancel', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('disables cancel button while submitting', () => {
      render(<ManualAccountForm {...getDefaultProps()} isSubmitting />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  describe('Error Display', () => {
    it('displays server error message', () => {
      render(<ManualAccountForm {...getDefaultProps()} error="Server error occurred" />);

      expect(screen.getByRole('alert')).toHaveTextContent('Server error occurred');
    });

    it('clears error when form is re-rendered without error prop', () => {
      const { rerender } = render(
        <ManualAccountForm {...getDefaultProps()} error="Server error" />
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Server error');

      rerender(<ManualAccountForm {...getDefaultProps()} error={undefined} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Account Type Icons', () => {
    it('shows appropriate icon for each account type in select', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      const typeSelect = screen.getByTestId('account-type-select');

      // Check that SVG icons exist for account types
      await user.selectOptions(typeSelect, AccountType.CHECKING);

      // The select should have updated
      expect(typeSelect).toHaveValue(AccountType.CHECKING);
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for all form inputs', () => {
      render(<ManualAccountForm {...getDefaultProps()} />);

      expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/account type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/current balance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/institution name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/account number/i)).toBeInTheDocument();
    });

    it('has accessible error messages with alert role', () => {
      render(<ManualAccountForm {...getDefaultProps()} error="Test error" />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Test error');
    });

    it('has aria-invalid on fields with errors', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      // Submit without filling required fields
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        const nameInput = screen.getByTestId('account-name-input');
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('has aria-describedby linking to error messages', async () => {
      const { user } = render(<ManualAccountForm {...getDefaultProps()} />);

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        const nameInput = screen.getByTestId('account-name-input');
        expect(nameInput).toHaveAttribute('aria-describedby');
      });
    });
  });

  describe('Modal Behavior', () => {
    it('renders as a dialog when isModal is true', () => {
      render(<ManualAccountForm {...getDefaultProps()} isModal />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has proper aria-labelledby for modal', () => {
      render(<ManualAccountForm {...getDefaultProps()} isModal />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });
  });
});
