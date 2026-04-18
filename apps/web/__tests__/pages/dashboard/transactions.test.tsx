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

      // Tab labels include counts, e.g. "Tutte (0)", "Fisse (0)"
      // Sprint 1.7: tabs reorganized around expense_class (Fisse/Variabili)
      // instead of transaction type (Uscite/Entrate).
      await waitFor(() => {
        expect(screen.getByText(/Tutte \(/)).toBeInTheDocument();
        expect(screen.getByText(/Fisse \(/)).toBeInTheDocument();
        expect(screen.getByText(/Variabili \(/)).toBeInTheDocument();
        expect(screen.getByText(/Ricorrenti \(/)).toBeInTheDocument();
      });
    });

    // Sprint 1.7 semantic check: the page is "Spese" so CREDIT rows should
    // never be counted in any tab — all tabs partition the DEBIT universe.
    it('excludes CREDIT (income) transactions from all tab counts', async () => {
      const mixed = [
        // 3 DEBIT expenses, 2 CREDIT income
        { id: 't1', type: 'DEBIT', amount: -10, categoryId: 'cat-fixed', isRecurring: false, date: '2026-04-01', description: 'x', merchantName: null, accountId: 'a', status: 'POSTED' },
        { id: 't2', type: 'DEBIT', amount: -20, categoryId: 'cat-var', isRecurring: true, date: '2026-04-02', description: 'y', merchantName: null, accountId: 'a', status: 'POSTED' },
        { id: 't3', type: 'DEBIT', amount: -30, categoryId: null, isRecurring: false, date: '2026-04-03', description: 'z', merchantName: null, accountId: 'a', status: 'POSTED' },
        { id: 't4', type: 'CREDIT', amount: 500, categoryId: 'cat-income', isRecurring: false, date: '2026-04-04', description: 'salary', merchantName: null, accountId: 'a', status: 'POSTED' },
        { id: 't5', type: 'CREDIT', amount: 100, categoryId: 'cat-income', isRecurring: true, date: '2026-04-05', description: 'dividend', merchantName: null, accountId: 'a', status: 'POSTED' },
      ];
      mockTransactionsClient.getTransactions.mockResolvedValue(
        mixed as unknown as Awaited<ReturnType<typeof mockTransactionsClient.getTransactions>>
      );
      mockCategoriesClient.getOptions.mockResolvedValue([
        { id: 'cat-fixed', name: 'Rent', slug: 'rent', type: 'EXPENSE', expenseClass: 'FIXED' },
        { id: 'cat-var', name: 'Food', slug: 'food', type: 'EXPENSE', expenseClass: 'VARIABLE' },
        { id: 'cat-income', name: 'Salary', slug: 'salary', type: 'INCOME', expenseClass: null },
        // deno-lint-ignore no-explicit-any
      ] as unknown as any);

      render(<TransactionsPage />);

      // Tutte = 3 (DEBITs only, CREDITs excluded)
      await waitFor(() => {
        expect(screen.getByText(/Tutte \(3\)/)).toBeInTheDocument();
      });
      // Fisse = 1 (t1), Variabili = 1 (t2), Ricorrenti = 1 (t2 only; t5 is CREDIT)
      expect(screen.getByText(/Fisse \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Variabili \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Ricorrenti \(1\)/)).toBeInTheDocument();
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
