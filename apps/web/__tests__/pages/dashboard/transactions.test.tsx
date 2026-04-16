/**
 * Tests for TransactionsPage (now ExpensesPage) component
 *
 * After the Figma Design Sprint, this page is now called "Spese" (Expenses)
 * and renders summary cards, a bar chart, tab filters, and an
 * EnhancedTransactionList. It starts in loading state until data fetches resolve.
 * All text is in Italian.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target: unknown, prop: string | symbol) => {
      if (prop === '__esModule') return false;
      return ({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, ...rest }: Record<string, unknown>) => {
        const Tag = typeof prop === 'string' ? prop : 'div';
        return React.createElement(Tag as string, rest, children as React.ReactNode);
      };
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

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
    getSpending: vi.fn().mockResolvedValue({ categories: [], totalSpending: 0, startDate: '', endDate: '' }),
  },
}));

// Mock transaction components
vi.mock('../../../src/components/transactions', () => ({
  QuickAddTransaction: ({ trigger }: {
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

import TransactionsPage from '../../../app/dashboard/transactions/page';
import { transactionsClient } from '../../../src/services/transactions.client';
import { accountsClient } from '../../../src/services/accounts.client';
import { categoriesClient } from '../../../src/services/categories.client';

const mockTransactionsClient = vi.mocked(transactionsClient);
const mockAccountsClient = vi.mocked(accountsClient);
const mockCategoriesClient = vi.mocked(categoriesClient);

describe('TransactionsPage (ExpensesPage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactionsClient.getTransactions.mockResolvedValue([]);
    mockAccountsClient.getAccounts.mockResolvedValue([]);
    mockCategoriesClient.getOptions.mockResolvedValue([]);
    mockCategoriesClient.getSpending.mockResolvedValue({ categories: [], totalSpending: 0, startDate: '', endDate: '' });
  });

  describe('Header', () => {
    it('renders the page heading in Italian', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Spese');
      });
    });

    it('renders the description text in Italian', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText('Monitora e gestisci le tue spese')).toBeInTheDocument();
      });
    });
  });

  describe('Add Transaction Button', () => {
    it('renders Aggiungi Spesa button', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Aggiungi Spesa/i })).toBeInTheDocument();
      });
    });
  });

  describe('Summary Cards', () => {
    it('renders Spese Totali label after data loads', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText('Spese Totali')).toBeInTheDocument();
      });
    });

    it('renders Costi Fissi label after data loads', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText('Costi Fissi')).toBeInTheDocument();
      });
    });

    it('renders Costi Variabili label after data loads', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText('Costi Variabili')).toBeInTheDocument();
      });
    });

    it('renders Ricorrenti label after data loads', async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText('Ricorrenti')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Filters', () => {
    it('renders tab filter buttons', async () => {
      render(<TransactionsPage />);

      // Tab labels include counts, e.g. "Tutte (0)", "Uscite (0)"
      await waitFor(() => {
        expect(screen.getByText(/Tutte \(/)).toBeInTheDocument();
        expect(screen.getByText(/Uscite \(/)).toBeInTheDocument();
        expect(screen.getByText(/Entrate \(/)).toBeInTheDocument();
        expect(screen.getByText(/Ricorrenti \(/)).toBeInTheDocument();
      });
    });
  });

  describe('Transaction List', () => {
    it('renders the transaction list component after loading', async () => {
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

  describe('Loading State', () => {
    it('shows skeleton UI while loading', () => {
      // Make the fetch hang so we stay in loading state
      mockTransactionsClient.getTransactions.mockImplementation(() => new Promise(() => {}));
      mockAccountsClient.getAccounts.mockImplementation(() => new Promise(() => {}));
      mockCategoriesClient.getOptions.mockImplementation(() => new Promise(() => {}));
      mockCategoriesClient.getSpending.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<TransactionsPage />);

      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
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
          currency: 'EUR',
          isActive: true,
          isManualAccount: true,
          isPlaidAccount: false,
          isSyncable: false,
          needsSync: false,
          syncEnabled: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]);

      render(<TransactionsPage />);

      await waitFor(() => {
        const filterSelect = screen.getByLabelText('Filtra per conto');
        expect(filterSelect).toBeInTheDocument();
      });
    });
  });
});
