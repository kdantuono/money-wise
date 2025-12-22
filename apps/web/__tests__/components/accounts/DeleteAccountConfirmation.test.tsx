/**
 * DeleteAccountConfirmation Component Tests
 *
 * Tests confirmation dialog for deleting manual accounts.
 * Includes transaction handling options.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { DeleteAccountConfirmation } from '../../../src/components/accounts/DeleteAccountConfirmation';
import { AccountType, AccountSource, AccountStatus } from '../../../src/types/account.types';
import type { DeletionEligibilityResponse, LinkedTransfer } from '../../../src/types/account.types';

describe('DeleteAccountConfirmation', () => {
  const mockOnConfirm = vi.fn().mockResolvedValue(undefined);
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
    mockOnConfirm.mockClear();
    mockOnCancel.mockClear();
  });

  const getDefaultProps = () => ({
    account: mockAccount,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  });

  describe('Rendering', () => {
    it('renders confirmation dialog with account name', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/delete account/i)).toBeInTheDocument();
      expect(screen.getByText(/My Savings/i)).toBeInTheDocument();
    });

    it('displays warning about permanent action', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} />);

      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    it('renders delete and cancel buttons', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} />);

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('shows transaction handling options when hasTransactions is true', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} hasTransactions transactionCount={5} />);

      expect(screen.getByText(/what should happen to the \d+ transactions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/delete all transactions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/keep transactions.*unassigned/i)).toBeInTheDocument();
    });

    it('does not show transaction options when hasTransactions is false', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} hasTransactions={false} />);

      expect(screen.queryByText(/what should happen to the \d+ transactions/i)).not.toBeInTheDocument();
    });

    it('shows transaction count when provided', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} hasTransactions transactionCount={42} />);

      expect(screen.getByText(/42 transactions/i)).toBeInTheDocument();
    });

    it('shows current balance in confirmation', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} />);

      expect(screen.getByText(/\$1,500\.50/)).toBeInTheDocument();
    });
  });

  describe('Transaction Handling', () => {
    it('defaults to delete transactions option', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} hasTransactions />);

      const deleteRadio = screen.getByLabelText(/delete all transactions/i);
      expect(deleteRadio).toBeChecked();
    });

    it('allows selecting keep transactions option', async () => {
      const { user } = render(<DeleteAccountConfirmation {...getDefaultProps()} hasTransactions />);

      const keepRadio = screen.getByLabelText(/keep transactions.*unassigned/i);
      await user.click(keepRadio);

      expect(keepRadio).toBeChecked();
    });

    it('passes transaction handling option to onConfirm', async () => {
      const { user } = render(<DeleteAccountConfirmation {...getDefaultProps()} hasTransactions />);

      const keepRadio = screen.getByLabelText(/keep transactions.*unassigned/i);
      await user.click(keepRadio);

      await user.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith({
          deleteTransactions: false,
        });
      });
    });

    it('passes deleteTransactions: true when delete option selected', async () => {
      const { user } = render(<DeleteAccountConfirmation {...getDefaultProps()} hasTransactions />);

      await user.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith({
          deleteTransactions: true,
        });
      });
    });
  });

  describe('Confirmation Flow', () => {
    it('calls onConfirm when delete button is clicked', async () => {
      const { user } = render(<DeleteAccountConfirmation {...getDefaultProps()} />);

      await user.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const { user } = render(<DeleteAccountConfirmation {...getDefaultProps()} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('requires typing account name for confirmation when requireConfirmation is true', async () => {
      const { user } = render(
        <DeleteAccountConfirmation {...getDefaultProps()} requireConfirmation />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeDisabled();

      const confirmInput = screen.getByPlaceholderText(/type "My Savings" to confirm/i);
      await user.type(confirmInput, 'My Savings');

      expect(deleteButton).toBeEnabled();
    });

    it('confirms deletion only when exact name is typed', async () => {
      const { user } = render(
        <DeleteAccountConfirmation {...getDefaultProps()} requireConfirmation />
      );

      const confirmInput = screen.getByPlaceholderText(/type "My Savings" to confirm/i);
      await user.type(confirmInput, 'My savings'); // wrong case

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('disables buttons while deleting', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} isDeleting />);

      expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('shows loading text on delete button', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} isDeleting />);

      expect(screen.getByRole('button', { name: /deleting/i })).toHaveTextContent('Deleting...');
    });

    it('shows spinner on delete button when deleting', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} isDeleting />);

      const deleteButton = screen.getByRole('button', { name: /deleting/i });
      expect(deleteButton.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('displays error message when provided', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} error="Failed to delete account" />);

      expect(screen.getByRole('alert')).toHaveTextContent('Failed to delete account');
    });
  });

  describe('Accessibility', () => {
    it('has accessible dialog role', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has proper aria-labelledby', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('has proper aria-describedby', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('focuses the cancel button by default for safety', () => {
      render(<DeleteAccountConfirmation {...getDefaultProps()} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();
    });

    // TODO: Implement focus trap functionality in component
    it.skip('traps focus within dialog', async () => {
      const { user } = render(<DeleteAccountConfirmation {...getDefaultProps()} />);

      // Tab through all focusable elements
      await user.tab();
      await user.tab();
      await user.tab();

      // Should cycle back to first focusable element
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();
    });
  });

  describe('Close on Escape', () => {
    it('calls onCancel when Escape is pressed', async () => {
      const { user } = render(<DeleteAccountConfirmation {...getDefaultProps()} />);

      await user.keyboard('{Escape}');

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Linked Transfer Warnings', () => {
    const mockLinkedTransfers: LinkedTransfer[] = [
      {
        transactionId: 'tx-1',
        transferGroupId: 'tg-1',
        linkedAccountId: 'acc-456',
        linkedAccountName: 'Checking Account',
        amount: 500,
        date: '2025-11-15',
        description: 'Monthly savings transfer',
        transferRole: 'SOURCE',
      },
      {
        transactionId: 'tx-2',
        transferGroupId: 'tg-2',
        linkedAccountId: 'acc-789',
        linkedAccountName: 'Emergency Fund',
        amount: 200,
        date: '2025-11-10',
        description: 'Emergency fund contribution',
        transferRole: 'DESTINATION',
      },
    ];

    const mockEligibilityBlocked: DeletionEligibilityResponse = {
      canDelete: false,
      canHide: true,
      currentStatus: AccountStatus.ACTIVE,
      blockReason: 'Account has 2 transfers linked to other accounts',
      blockers: mockLinkedTransfers,
      linkedTransferCount: 2,
    };

    const mockEligibilityAllowed: DeletionEligibilityResponse = {
      canDelete: true,
      canHide: true,
      currentStatus: AccountStatus.ACTIVE,
      blockers: [],
      linkedTransferCount: 0,
    };

    it('shows loading state while checking eligibility', () => {
      render(
        <DeleteAccountConfirmation
          {...getDefaultProps()}
          eligibility={undefined}
          isCheckingEligibility={true}
        />
      );

      expect(screen.getByText(/checking deletion eligibility/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
    });

    it('shows transfer warning when deletion is blocked', () => {
      render(
        <DeleteAccountConfirmation
          {...getDefaultProps()}
          eligibility={mockEligibilityBlocked}
        />
      );

      expect(screen.getByText(/cannot be deleted/i)).toBeInTheDocument();
      expect(screen.getByText(/2 transfers linked to other accounts/i)).toBeInTheDocument();
    });

    it('displays list of blocking transfers', () => {
      render(
        <DeleteAccountConfirmation
          {...getDefaultProps()}
          eligibility={mockEligibilityBlocked}
        />
      );

      expect(screen.getByText('Checking Account')).toBeInTheDocument();
      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
      expect(screen.getByText(/\$500/)).toBeInTheDocument();
      expect(screen.getByText(/\$200/)).toBeInTheDocument();
    });

    it('disables delete button when deletion is blocked', () => {
      render(
        <DeleteAccountConfirmation
          {...getDefaultProps()}
          eligibility={mockEligibilityBlocked}
        />
      );

      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
    });

    it('shows Hide Instead button when deletion is blocked and onHide provided', () => {
      const mockOnHide = vi.fn().mockResolvedValue(undefined);
      render(
        <DeleteAccountConfirmation
          {...getDefaultProps()}
          eligibility={mockEligibilityBlocked}
          onHide={mockOnHide}
        />
      );

      expect(screen.getByRole('button', { name: /hide instead/i })).toBeInTheDocument();
    });

    it('calls onHide when Hide Instead button is clicked', async () => {
      const mockOnHide = vi.fn().mockResolvedValue(undefined);
      const { user } = render(
        <DeleteAccountConfirmation
          {...getDefaultProps()}
          eligibility={mockEligibilityBlocked}
          onHide={mockOnHide}
        />
      );

      await user.click(screen.getByRole('button', { name: /hide instead/i }));

      await waitFor(() => {
        expect(mockOnHide).toHaveBeenCalled();
      });
    });

    it('allows deletion when no linked transfers exist', () => {
      render(
        <DeleteAccountConfirmation
          {...getDefaultProps()}
          eligibility={mockEligibilityAllowed}
        />
      );

      expect(screen.getByRole('button', { name: /delete/i })).toBeEnabled();
      expect(screen.queryByText(/cannot be deleted/i)).not.toBeInTheDocument();
    });

    it('does not show Hide Instead button when deletion is allowed', () => {
      const mockOnHide = vi.fn().mockResolvedValue(undefined);
      render(
        <DeleteAccountConfirmation
          {...getDefaultProps()}
          eligibility={mockEligibilityAllowed}
          onHide={mockOnHide}
        />
      );

      // Hide Instead button should not be shown when deletion is allowed (even if onHide is provided)
      expect(screen.queryByRole('button', { name: /hide instead/i })).not.toBeInTheDocument();
    });

    it('shows transfer role badges (SOURCE/DESTINATION)', () => {
      render(
        <DeleteAccountConfirmation
          {...getDefaultProps()}
          eligibility={mockEligibilityBlocked}
        />
      );

      expect(screen.getByText(/sent to/i)).toBeInTheDocument(); // SOURCE = sent to
      expect(screen.getByText(/received from/i)).toBeInTheDocument(); // DESTINATION = received from
    });

    it('handles hide loading state', () => {
      const mockOnHide = vi.fn().mockResolvedValue(undefined);
      render(
        <DeleteAccountConfirmation
          {...getDefaultProps()}
          eligibility={mockEligibilityBlocked}
          onHide={mockOnHide}
          isHiding={true}
        />
      );

      expect(screen.getByRole('button', { name: /hiding/i })).toBeDisabled();
    });
  });
});
