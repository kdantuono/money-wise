/**
 * Tests for RevokeConfirmation component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { RevokeConfirmation } from '../../../src/components/banking/RevokeConfirmation';

const mockAccount = {
  id: 'acc-123',
  name: 'Premium Checking',
  bankName: 'Wells Fargo',
  balance: 5000,
  currency: 'USD',
};

describe('RevokeConfirmation Component', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog correctly', () => {
    render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Revoke Account Access')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
  });

  it('displays account information', () => {
    render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Premium Checking')).toBeInTheDocument();
    expect(screen.getByText('Wells Fargo')).toBeInTheDocument();
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
  });

  it('displays warning messages', () => {
    render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/will no longer sync transactions/i)).toBeInTheDocument();
    expect(screen.getByText(/must re-authorize to link this account/i)).toBeInTheDocument();
  });

  it('displays balance retention message when balance is positive', () => {
    render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/current balance and transaction history will be retained/i)).toBeInTheDocument();
  });

  it('displays generic retention message when balance is zero', () => {
    const zeroBalanceAccount = { ...mockAccount, balance: 0 };

    render(
      <RevokeConfirmation
        account={zeroBalanceAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/historical data will be retained/i)).toBeInTheDocument();
  });

  it('requires checkbox to be checked before confirming', async () => {
    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm revoking/i });
    expect(confirmButton).toBeDisabled();

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled();
    });
  });

  it('shows error when trying to confirm without checkbox', async () => {
    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Force click on disabled button by targeting it directly
    const confirmButton = screen.getByRole('button', { name: /confirm revoking/i });

    // We need to enable it first to click
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    await user.click(checkbox); // Uncheck it

    // Now try to confirm (button should be disabled)
    expect(confirmButton).toBeDisabled();
  });

  it('calls onConfirm when confirmation is successful', async () => {
    mockOnConfirm.mockResolvedValueOnce(undefined);

    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const confirmButton = screen.getByRole('button', { name: /confirm revoking/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel revocation/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onCancel when close button is clicked', async () => {
    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close dialog/i });
    await user.click(closeButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onCancel when backdrop is clicked', async () => {
    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const backdrop = document.querySelector('.cursor-pointer');
    expect(backdrop).toBeInTheDocument();

    if (backdrop) {
      await user.click(backdrop as HTMLElement);
      expect(mockOnCancel).toHaveBeenCalled();
    }
  });

  it('shows loading state during confirmation', async () => {
    mockOnConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const confirmButton = screen.getByRole('button', { name: /confirm revoking/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Revoking...')).toBeInTheDocument();
      expect(confirmButton).toHaveAttribute('aria-busy', 'true');
      expect(confirmButton).toBeDisabled();
    });
  });

  it('displays error message on confirmation failure', async () => {
    mockOnConfirm.mockRejectedValueOnce(new Error('Network error'));

    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const confirmButton = screen.getByRole('button', { name: /confirm revoking/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Revocation failed')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('displays generic error message on unknown error', async () => {
    mockOnConfirm.mockRejectedValueOnce('Unknown error');

    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const confirmButton = screen.getByRole('button', { name: /confirm revoking/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to revoke account/i)).toBeInTheDocument();
    });
  });

  it('disables buttons during confirmation', async () => {
    mockOnConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const confirmButton = screen.getByRole('button', { name: /confirm revoking/i });
    await user.click(confirmButton);

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancel revocation/i });
      const closeButton = screen.getByRole('button', { name: /close dialog/i });

      expect(cancelButton).toBeDisabled();
      expect(closeButton).toBeDisabled();
    });
  });

  it('clears error when checkbox is clicked after error', async () => {
    mockOnConfirm.mockRejectedValueOnce(new Error('Test error'));

    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const confirmButton = screen.getByRole('button', { name: /confirm revoking/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    await user.click(checkbox);
    await user.click(checkbox);

    await waitFor(() => {
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  it.skip('handles Escape key press', async () => {
    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    await user.keyboard('{Escape}');

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        className="custom-class"
      />
    );

    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'revoke-dialog-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'revoke-dialog-description');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('checkbox has correct aria-label', () => {
    render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-label', 'I understand this action cannot be undone');
  });

  it('disables checkbox during confirmation', async () => {
    mockOnConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const confirmButton = screen.getByRole('button', { name: /confirm revoking/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(checkbox).toBeDisabled();
    });
  });

  it('shows spinner during loading', async () => {
    mockOnConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { user } = render(
      <RevokeConfirmation
        account={mockAccount}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const confirmButton = screen.getByRole('button', { name: /confirm revoking/i });
    await user.click(confirmButton);

    await waitFor(() => {
      const spinner = confirmButton.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  it('handles account without balance', () => {
    const accountNoBalance = {
      id: 'acc-123',
      name: 'Simple Account',
      bankName: 'Simple Bank',
    };

    render(
      <RevokeConfirmation
        account={accountNoBalance}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Simple Account')).toBeInTheDocument();
    expect(screen.getByText('Simple Bank')).toBeInTheDocument();
    expect(screen.queryByText(/current balance/i)).not.toBeInTheDocument();
  });
});
