/**
 * Tests for TransactionsPage component
 *
 * Tests the full transactions page with header, "Add Transaction" button,
 * transaction list rendering, and account filter.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import TransactionsPage from '../../../app/dashboard/transactions/page';

// Mock service clients
vi.mock('../../../src/services/transactions.client', () => ({
  transactionsClient: {
    getTransactions: vi.fn().mockResolvedValue([]),
    getTransaction: vi.fn(),
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
  },
}));

vi.mock('../../../src/services/accounts.client', () => ({
  accountsClient: {
    getAccounts: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../src/services/categories.client', () => ({
  categoriesClient: {
    getOptions: vi.fn().mockResolvedValue([]),
  },
}));

// Mock banking components that have complex sub-dependencies
vi.mock('../../../src/components/banking', () => ({
  ErrorAlert: ({ title, message, onDismiss }: { title: string; message: string; onDismiss: () => void }) => (
    <div data-testid="error-alert">
      <span>{title}</span>
      <span>{message}</span>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock transaction components
vi.mock('../../../src/components/transactions', () => ({
  QuickAddTransaction: ({ trigger, onSuccess }: {
    trigger: (props: { onClick: () => void }) => React.ReactNode;
    onSuccess: () => void;
  }) => <>{trigger({ onClick: vi.fn() })}</>,
  EnhancedTransactionList: ({
    transactions,
    isLoading,
  }: {
    transactions: unknown[];
    isLoading: boolean;
    categoryMap: Map<string, string>;
    accountMap: Map<string, string>;
    onRefresh: () => void;
  }) => (
    <div data-testid="transaction-list">
      {isLoading ? 'Loading...' : `${transactions.length} transactions`}
    </div>
  ),
}));

import { transactionsClient } from '../../../src/services/transactions.client';
import { accountsClient } from '../../../src/services/accounts.client';
import { categoriesClient } from '../../../src/services/categories.client';

const mockTransactionsClient = vi.mocked(transactionsClient);
const mockAccountsClient = vi.mocked(accountsClient);
const mockCategoriesClient = vi.mocked(categoriesClient);

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactionsClient.getTransactions.mockResolvedValue([]);
    mockAccountsClient.getAccounts.mockResolvedValue([]);
    mockCategoriesClient.getOptions.mockResolvedValue([]);
  });

  describe('Header', () => {
    it('renders the page heading', async () => {
      render(<TransactionsPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Transactions');
    });

    it('renders the description text', () => {
      render(<TransactionsPage />);

      expect(screen.getByText('View and manage your transaction history')).toBeInTheDocument();
    });

    it('renders the CreditCard icon in header', () => {
      const { container } = render(<TransactionsPage />);

      const headerIcon = container.querySelector('.bg-green-100 svg');
      expect(headerIcon).toBeInTheDocument();
    });
  });

  describe('Add Transaction Button', () => {
    it('renders Add Transaction button', () => {
      render(<TransactionsPage />);

      const addButton = screen.getByRole('button', { name: /Add Transaction/i });
      expect(addButton).toBeInTheDocument();
    });

    it('Add Transaction button is enabled', () => {
      render(<TransactionsPage />);

      const addButton = screen.getByRole('button', { name: /Add Transaction/i });
      expect(addButton).not.toBeDisabled();
    });
  });

  describe('Transaction List', () => {
    it('renders the transaction list component', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('transaction-list')).toBeInTheDocument();
      });
    });

    it('fetches transactions on mount', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(mockTransactionsClient.getTransactions).toHaveBeenCalled();
      });
    });

    it('fetches accounts and categories on mount', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(mockAccountsClient.getAccounts).toHaveBeenCalled();
        expect(mockCategoriesClient.getOptions).toHaveBeenCalled();
      });
    });
  });

  describe('Transaction Statistics', () => {
    it('shows statistics when transactions exist', async () => {
      mockTransactionsClient.getTransactions.mockResolvedValue([
        {
          id: 'tx-1',
          accountId: 'acc-1',
          amount: 100,
          type: 'CREDIT',
          description: 'Salary',
          date: '2024-01-15',
          status: 'POSTED',
          source: 'MANUAL',
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
        {
          id: 'tx-2',
          accountId: 'acc-1',
          amount: 50,
          type: 'DEBIT',
          description: 'Groceries',
          date: '2024-01-16',
          status: 'POSTED',
          source: 'MANUAL',
          createdAt: '2024-01-16T00:00:00Z',
          updatedAt: '2024-01-16T00:00:00Z',
        },
      ] as any);

      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Transactions')).toBeInTheDocument();
        expect(screen.getByText('Total Income')).toBeInTheDocument();
        expect(screen.getByText('Total Expenses')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows connect bank prompt when no accounts and no transactions', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText('Connect Your Bank')).toBeInTheDocument();
      });
    });

    it('has link to accounts page in empty state', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        const connectLink = screen.getByRole('link', { name: /Connect Accounts/i });
        expect(connectLink).toHaveAttribute('href', '/dashboard/accounts');
      });
    });
  });

  describe('Account Filter', () => {
    it('shows account filter when accounts exist', async () => {
      mockAccountsClient.getAccounts.mockResolvedValue([
        {
          id: 'acc-1',
          name: 'Checking',
          displayName: 'My Checking',
          type: 'CHECKING',
          status: 'ACTIVE',
          source: 'MANUAL',
          currentBalance: 1000,
          currency: 'USD',
          isActive: true,
          isManualAccount: true,
          isPlaidAccount: false,
          isSyncable: false,
          needsSync: false,
          syncEnabled: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ] as any);

      render(<TransactionsPage />);

      await waitFor(() => {
        const filterSelect = screen.getByLabelText('Filter by account');
        expect(filterSelect).toBeInTheDocument();
      });
    });

    it('does not show account filter when no accounts', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('transaction-list')).toBeInTheDocument();
      });

      expect(screen.queryByLabelText('Filter by account')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error when transaction fetch fails', async () => {
      mockTransactionsClient.getTransactions.mockRejectedValue(new Error('Network error'));

      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument();
      });
    });
  });

  describe('Container', () => {
    it('renders within transactions container', () => {
      render(<TransactionsPage />);

      expect(screen.getByTestId('transactions-container')).toBeInTheDocument();
    });
  });
});
