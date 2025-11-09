/**
 * Tests for AccountList component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { AccountList } from '../../../src/components/banking/AccountList';
import { BankingConnectionStatus, BankingSyncStatus } from '../../../src/lib/banking-types';

const mockAccounts = [
  {
    id: 'acc-1',
    name: 'Checking Account',
    balance: 5000.50,
    currency: 'USD',
    bankName: 'Chase Bank',
    iban: 'US12345678901234567890',
    syncStatus: BankingSyncStatus.SYNCED,
    connectionStatus: BankingConnectionStatus.AUTHORIZED,
    lastSyncedAt: new Date('2024-01-15T10:00:00Z'),
    linkedAt: new Date('2024-01-01T08:00:00Z'),
    accountNumber: '****1234',
    accountType: 'checking',
    country: 'United States',
  },
  {
    id: 'acc-2',
    name: 'Savings Account',
    balance: 12000,
    currency: 'USD',
    bankName: 'Bank of America',
    iban: 'US98765432109876543210',
    syncStatus: BankingSyncStatus.PENDING,
    connectionStatus: BankingConnectionStatus.AUTHORIZED,
    linkedAt: new Date('2024-01-10T12:00:00Z'),
  },
  {
    id: 'acc-3',
    name: 'Credit Card',
    balance: -1500,
    currency: 'USD',
    bankName: 'Citibank',
    iban: 'US11111111111111111111',
    syncStatus: BankingSyncStatus.ERROR,
    connectionStatus: BankingConnectionStatus.AUTHORIZED,
    lastSyncedAt: new Date('2024-01-14T09:00:00Z'),
    linkedAt: new Date('2024-01-05T14:00:00Z'),
  },
];

describe('AccountList Component', () => {
  const mockOnSync = vi.fn();
  const mockOnRevoke = vi.fn();
  const mockOnSyncStart = vi.fn();
  const mockOnSyncComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders accounts correctly', () => {
    render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('Checking Account')).toBeInTheDocument();
    expect(screen.getByText('Savings Account')).toBeInTheDocument();
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
  });

  it('displays loading skeleton when isLoading is true', () => {
    render(
      <AccountList
        accounts={[]}
        isLoading={true}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    // AccountSkeleton should be rendered 3 times
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays empty state when no accounts', () => {
    render(
      <AccountList
        accounts={[]}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByRole('status', { name: /no accounts linked/i })).toBeInTheDocument();
    expect(screen.getByText('No accounts linked')).toBeInTheDocument();
    expect(screen.getByText(/link a bank account to start tracking/i)).toBeInTheDocument();
  });

  it('displays account balances correctly', () => {
    render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('$5,000.50')).toBeInTheDocument();
    expect(screen.getByText('$12,000.00')).toBeInTheDocument();
    expect(screen.getByText('-$1,500.00')).toBeInTheDocument();
  });

  it('displays sync status badges correctly', () => {
    render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('Synced')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Sync Error')).toBeInTheDocument();
  });

  it('calls onSync when sync button is clicked', async () => {
    const { user } = render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const syncButtons = screen.getAllByRole('button', { name: /sync/i });
    await user.click(syncButtons[0]);

    expect(mockOnSync).toHaveBeenCalledWith('acc-1');
  });

  it('calls onRevoke when revoke button is clicked', async () => {
    const { user } = render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
    await user.click(revokeButtons[0]);

    expect(mockOnRevoke).toHaveBeenCalledWith('acc-1');
  });

  it.skip('disables sync button during sync', async () => {
    const { user } = render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const syncButtons = screen.getAllByRole('button', { name: /sync/i });
    await user.click(syncButtons[0]);

    await waitFor(() => {
      expect(syncButtons[0]).toBeDisabled();
      expect(screen.getByText('Syncing')).toBeInTheDocument();
    });
  });

  it('calls onSyncStart when sync begins', async () => {
    const { user } = render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
        onSyncStart={mockOnSyncStart}
      />
    );

    const syncButtons = screen.getAllByRole('button', { name: /sync/i });
    await user.click(syncButtons[0]);

    expect(mockOnSyncStart).toHaveBeenCalledWith('acc-1');
  });

  it('calls onSyncComplete on successful sync', async () => {
    mockOnSync.mockResolvedValueOnce(undefined);

    const { user } = render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
        onSyncComplete={mockOnSyncComplete}
      />
    );

    const syncButtons = screen.getAllByRole('button', { name: /sync/i });
    await user.click(syncButtons[0]);

    await waitFor(() => {
      expect(mockOnSyncComplete).toHaveBeenCalledWith('acc-1', true);
    });
  });

  it('calls onSyncComplete with false on sync failure', async () => {
    mockOnSync.mockRejectedValueOnce(new Error('Sync failed'));

    const { user } = render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
        onSyncComplete={mockOnSyncComplete}
      />
    );

    const syncButtons = screen.getAllByRole('button', { name: /sync/i });
    await user.click(syncButtons[0]);

    await waitFor(() => {
      expect(mockOnSyncComplete).toHaveBeenCalledWith('acc-1', false);
    });
  });

  it('displays account details correctly', () => {
    render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('Chase Bank')).toBeInTheDocument();
    expect(screen.getByText('****1234')).toBeInTheDocument();
    expect(screen.getByText('checking', { exact: false })).toBeInTheDocument();
  });

  it('displays IBAN correctly', () => {
    render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('US12345678901234567890')).toBeInTheDocument();
  });

  it('displays last synced timestamp when available', () => {
    render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    // Check that last synced dates are rendered
    const dates = screen.getAllByText(/1\/15\/2024/i);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
        className="custom-class"
      />
    );

    const grid = container.querySelector('.custom-class');
    expect(grid).toBeInTheDocument();
  });

  it('shows spinning icon during sync', async () => {
    const { user } = render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const syncButtons = screen.getAllByRole('button', { name: /sync/i });
    await user.click(syncButtons[0]);

    await waitFor(() => {
      const spinners = document.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });
  });

  it('handles focus and blur for account cards', async () => {
    const { user } = render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const firstSyncButton = screen.getAllByRole('button', { name: /sync/i })[0];
    await user.click(firstSyncButton);

    // Focus should be managed
    expect(firstSyncButton).toHaveFocus();
  });

  it.skip('disables revoke button during sync', async () => {
    const { user } = render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const syncButtons = screen.getAllByRole('button', { name: /sync/i });
    const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });

    await user.click(syncButtons[0]);

    await waitFor(() => {
      expect(revokeButtons[0]).toBeDisabled();
    });
  });

  it('renders accounts in a grid layout', () => {
    const { container } = render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const grid = container.querySelector('[role="list"]');
    expect(grid).toHaveClass('grid');
  });

  it('has correct accessibility attributes', () => {
    render(
      <AccountList
        accounts={mockAccounts}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    const list = screen.getByRole('list', { name: /linked bank accounts/i });
    expect(list).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('handles accounts with minimal data', () => {
    const minimalAccount = [
      {
        id: 'acc-min',
        name: 'Minimal Account',
        balance: 100,
        currency: 'USD',
        bankName: 'Simple Bank',
        iban: 'US00000000000000000000',
        syncStatus: BankingSyncStatus.SYNCED,
        connectionStatus: BankingConnectionStatus.AUTHORIZED,
        linkedAt: new Date('2024-01-01'),
      },
    ];

    render(
      <AccountList
        accounts={minimalAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('Minimal Account')).toBeInTheDocument();
    expect(screen.getByText('Simple Bank')).toBeInTheDocument();
  });

  it('displays syncing status for accounts already syncing', () => {
    const syncingAccount = [
      {
        ...mockAccounts[0],
        syncStatus: BankingSyncStatus.SYNCING,
      },
    ];

    render(
      <AccountList
        accounts={syncingAccount}
        onSync={mockOnSync}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('Syncing...')).toBeInTheDocument();
    const syncButton = screen.getByRole('button', { name: /sync/i });
    expect(syncButton).toBeDisabled();
  });
});
