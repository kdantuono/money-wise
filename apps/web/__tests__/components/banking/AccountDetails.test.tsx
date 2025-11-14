/**
 * Tests for AccountDetails component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { AccountDetails } from '../../../src/components/banking/AccountDetails';
import { BankingConnectionStatus, BankingSyncStatus } from '../../../src/lib/banking-types';

const mockAccount = {
  id: 'acc-123',
  name: 'Premium Checking',
  balance: 15000.75,
  currency: 'USD',
  bankName: 'Wells Fargo',
  iban: 'US12345678901234567890',
  syncStatus: BankingSyncStatus.SYNCED,
  connectionStatus: BankingConnectionStatus.AUTHORIZED,
  lastSyncedAt: new Date('2024-01-15T14:30:00Z'),
  linkedAt: new Date('2024-01-01T10:00:00Z'),
  accountNumber: '****5678',
  accountType: 'checking',
  country: 'United States',
  accountHolderName: 'John Doe',
  creditLimit: 5000,
  availableBalance: 14000,
};

describe('AccountDetails Component', () => {
  const mockOnSync = vi.fn();
  const mockOnRevoke = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders account details correctly', () => {
    render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('Premium Checking')).toBeInTheDocument();
    expect(screen.getByText('Wells Fargo')).toBeInTheDocument();
    expect(screen.getByText('$15,000.75')).toBeInTheDocument();
  });

  it('displays loading skeleton when isLoading is true', () => {
    render(
      <AccountDetails
        account={mockAccount}
        isLoading={true}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays connection status badge', () => {
    render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('displays available balance when different from balance', () => {
    render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText(/Available:/)).toBeInTheDocument();
    expect(screen.getByText(/\$14,000\.00/)).toBeInTheDocument();
  });

  it('does not display available balance when same as balance', () => {
    const accountWithSameBalance = {
      ...mockAccount,
      availableBalance: mockAccount.balance,
    };

    render(
      <AccountDetails
        account={accountWithSameBalance}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.queryByText(/Available:/)).not.toBeInTheDocument();
  });

  it('displays account holder name', () => {
    render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays account number', () => {
    render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('****5678')).toBeInTheDocument();
  });

  it('displays IBAN', () => {
    render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('US12345678901234567890')).toBeInTheDocument();
  });

  it('displays credit limit when available', () => {
    render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText(/Credit Limit/)).toBeInTheDocument();
    expect(screen.getByText(/\$5,000\.00/)).toBeInTheDocument();
  });

  it('displays last synced timestamp', () => {
    render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText(/Last Synced/)).toBeInTheDocument();
  });

  it('displays linked date', () => {
    render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText(/Linked Date/)).toBeInTheDocument();
  });

  it('calls onSync when sync button is clicked', async () => {
    mockOnSync.mockResolvedValueOnce(undefined);

    const { user } = render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const syncButton = screen.getByRole('button', { name: /sync.*bank account/i });
    await user.click(syncButton);

    expect(mockOnSync).toHaveBeenCalled();
  });

  it('shows syncing state during sync', async () => {
    mockOnSync.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { user } = render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const syncButton = screen.getByRole('button', { name: /sync.*bank account/i });
    await user.click(syncButton);

    await waitFor(() => {
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
      expect(syncButton).toHaveAttribute('aria-busy', 'true');
      expect(syncButton).toBeDisabled();
    });
  });

  it('displays error message on sync failure', async () => {
    mockOnSync.mockRejectedValueOnce(new Error('Network timeout'));

    const { user } = render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const syncButton = screen.getByRole('button', { name: /sync.*bank account/i });
    await user.click(syncButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Sync failed')).toBeInTheDocument();
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });
  });

  it('disables sync button when connection is not authorized', () => {
    const unauthorizedAccount = {
      ...mockAccount,
      connectionStatus: BankingConnectionStatus.REVOKED,
    };

    render(
      <AccountDetails
        account={unauthorizedAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const syncButton = screen.getByRole('button', { name: /sync.*bank account/i });
    expect(syncButton).toBeDisabled();
  });

  it('disables sync button when already syncing', () => {
    const syncingAccount = {
      ...mockAccount,
      syncStatus: BankingSyncStatus.SYNCING,
    };

    render(
      <AccountDetails
        account={syncingAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const syncButton = screen.getByRole('button', { name: /sync.*bank account/i });
    expect(syncButton).toBeDisabled();
  });

  it('opens revoke confirmation modal when revoke is clicked', async () => {
    const { user } = render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const revokeButton = screen.getByRole('button', { name: /revoke access for/i });
    await user.click(revokeButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Revoke Account Access')).toBeInTheDocument();
    });
  });

  it('closes revoke modal on cancel', async () => {
    const { user } = render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const revokeButton = screen.getByRole('button', { name: /revoke access for/i });
    await user.click(revokeButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel revocation/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('calls onRevoke when confirmed', async () => {
    mockOnRevoke.mockResolvedValueOnce(undefined);

    const { user } = render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const revokeButton = screen.getByRole('button', { name: /revoke access for/i });
    await user.click(revokeButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Check the confirmation checkbox
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const confirmButton = screen.getByRole('button', { name: /confirm revoking/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockOnRevoke).toHaveBeenCalled();
    });
  });

  it('disables revoke button during sync', async () => {
    mockOnSync.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { user } = render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const syncButton = screen.getByRole('button', { name: /sync.*bank account/i });
    await user.click(syncButton);

    await waitFor(() => {
      const revokeButton = screen.getByRole('button', { name: /revoke access for/i });
      expect(revokeButton).toBeDisabled();
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
        className="custom-class"
      />
    );

    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });

  it('displays sync status info for non-synced accounts', () => {
    const pendingAccount = {
      ...mockAccount,
      syncStatus: BankingSyncStatus.PENDING,
    };

    render(
      <AccountDetails
        account={pendingAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText(/Sync Status:/)).toBeInTheDocument();
    expect(screen.getByText(/PENDING/)).toBeInTheDocument();
  });

  it('does not display sync status info for synced accounts', () => {
    render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.queryByText(/Sync Status:/)).not.toBeInTheDocument();
  });

  it('handles accounts with minimal data', () => {
    const minimalAccount = {
      id: 'acc-min',
      name: 'Minimal Account',
      balance: 1000,
      currency: 'USD',
      bankName: 'Simple Bank',
      iban: 'US00000000000000000000',
      syncStatus: BankingSyncStatus.SYNCED,
      connectionStatus: BankingConnectionStatus.AUTHORIZED,
      linkedAt: new Date('2024-01-01'),
    };

    render(
      <AccountDetails
        account={minimalAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('Minimal Account')).toBeInTheDocument();
    expect(screen.getByText('Simple Bank')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
  });

  it('displays different connection statuses correctly', () => {
    const statuses = [
      { status: BankingConnectionStatus.PENDING, label: 'Pending' },
      { status: BankingConnectionStatus.IN_PROGRESS, label: 'Connecting...' },
      { status: BankingConnectionStatus.EXPIRED, label: 'Expired' },
      { status: BankingConnectionStatus.FAILED, label: 'Connection Failed' },
    ];

    statuses.forEach(({ status, label }) => {
      const { unmount } = render(
        <AccountDetails
          account={{ ...mockAccount, connectionStatus: status }}
          onSync={mockOnSync}
          onRevoke={mockOnRevoke}
        />
      );

      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });

  it('has correct accessibility attributes', () => {
    render(
      <AccountDetails
        account={mockAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const statusBadge = screen.getByRole('status', { name: /connection status/i });
    expect(statusBadge).toBeInTheDocument();
  });
});
