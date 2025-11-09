/**
 * Tests for TransactionList component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { TransactionList } from '../../../src/components/banking/TransactionList';

const mockTransactions = [
  {
    id: 'tx-1',
    date: new Date('2024-01-15T10:30:00Z'),
    description: 'Grocery Shopping',
    amount: -85.50,
    type: 'DEBIT' as const,
    merchant: 'Whole Foods Market',
    reference: 'REF-001',
    status: 'completed' as const,
    currency: 'USD',
  },
  {
    id: 'tx-2',
    date: new Date('2024-01-14T15:00:00Z'),
    description: 'Salary Payment',
    amount: 3500,
    type: 'CREDIT' as const,
    merchant: 'Acme Corp',
    status: 'completed' as const,
    currency: 'USD',
  },
  {
    id: 'tx-3',
    date: new Date('2024-01-13T12:00:00Z'),
    description: 'Coffee Shop',
    amount: -5.75,
    type: 'DEBIT' as const,
    merchant: 'Starbucks',
    status: 'pending' as const,
    currency: 'USD',
  },
  {
    id: 'tx-4',
    date: new Date('2024-01-12T09:00:00Z'),
    description: 'Gas Station',
    amount: -45.00,
    type: 'DEBIT' as const,
    merchant: 'Shell',
    status: 'completed' as const,
    currency: 'USD',
  },
];

describe('TransactionList Component', () => {
  const mockOnLoadMore = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders transactions correctly', () => {
    render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    expect(screen.getByText('Whole Foods Market')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Starbucks')).toBeInTheDocument();
  });

  it('displays loading skeleton when isLoading is true', () => {
    render(
      <TransactionList
        accountId="acc-123"
        isLoading={true}
      />
    );

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays empty state when no transactions', () => {
    render(
      <TransactionList
        accountId="acc-123"
        transactions={[]}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('No transactions found')).toBeInTheDocument();
  });

  it('displays transaction amounts correctly', () => {
    render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    expect(screen.getByText(/\$85\.50/)).toBeInTheDocument();
    expect(screen.getByText(/\$3,500\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\$5\.75/)).toBeInTheDocument();
  });

  it('shows positive sign for credit transactions', () => {
    render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    const creditAmount = screen.getByText(/\+\$3,500\.00/);
    expect(creditAmount).toBeInTheDocument();
  });

  it('shows negative sign for debit transactions', () => {
    render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    const debitAmount = screen.getByText(/−\$85\.50/);
    expect(debitAmount).toBeInTheDocument();
  });

  it('displays pending badge for pending transactions', () => {
    render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('filters transactions by search query', async () => {
    const { user } = render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    const searchInput = screen.getByLabelText(/search transactions/i);
    await user.type(searchInput, 'coffee');

    await waitFor(() => {
      expect(screen.getByText('Starbucks')).toBeInTheDocument();
      expect(screen.queryByText('Whole Foods Market')).not.toBeInTheDocument();
    });
  });

  it('filters transactions by date range', async () => {
    const { user } = render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    const dateFromInput = screen.getByLabelText(/from date/i);
    await user.type(dateFromInput, '2024-01-14');

    await waitFor(() => {
      expect(screen.getByText('Whole Foods Market')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.queryByText('Gas Station')).not.toBeInTheDocument();
    });
  });

  it('clears filters when clear button is clicked', async () => {
    const { user } = render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    const searchInput = screen.getByLabelText(/search transactions/i);
    await user.type(searchInput, 'coffee');

    await waitFor(() => {
      expect(screen.queryByText('Whole Foods Market')).not.toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /clear all filters/i });
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText('Whole Foods Market')).toBeInTheDocument();
    });
  });

  it('displays results info when transactions exist', () => {
    render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    expect(screen.getByText(/showing/i)).toBeInTheDocument();
    expect(screen.getByText(/transactions/i)).toBeInTheDocument();
  });

  it('shows load more button when more transactions available', () => {
    const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
      ...mockTransactions[0],
      id: `tx-${i}`,
    }));

    render(
      <TransactionList
        accountId="acc-123"
        transactions={manyTransactions}
      />
    );

    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('increments local pagination when clicking load more', async () => {
    const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
      ...mockTransactions[0],
      id: `tx-${i}`,
      date: new Date(2024, 0, Math.max(1, 15 - Math.floor(i / 2)), 10, 0, 0),
    }));

    const { user } = render(
      <TransactionList
        accountId="acc-123"
        transactions={manyTransactions}
        hasMore={false}
      />
    );

    // Initial render shows 20 items
    const allCards = document.querySelectorAll('.rounded-lg.border');
    expect(allCards.length).toBeGreaterThan(15); // At least showing transactions

    // Load more
    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    await user.click(loadMoreButton);

    // Should show all 25 now
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
    });
  });

  it('displays reference number when available', () => {
    render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    expect(screen.getByText(/Ref: REF-001/)).toBeInTheDocument();
  });

  it('displays merchant name instead of description when available', () => {
    render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    expect(screen.getByText('Whole Foods Market')).toBeInTheDocument();
    expect(screen.queryByText('Grocery Shopping')).not.toBeInTheDocument();
  });

  it('displays description when no merchant is available', () => {
    const transactionNoMerchant = [
      {
        ...mockTransactions[0],
        merchant: undefined,
      },
    ];

    render(
      <TransactionList
        accountId="acc-123"
        transactions={transactionNoMerchant}
      />
    );

    expect(screen.getByText('Grocery Shopping')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    const dates = screen.getAllByText(/Jan 15, 2024|Jan 14, 2024|Jan 13, 2024/);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('applies green color to credit transactions', () => {
    const { container } = render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    const creditAmounts = container.querySelectorAll('.text-green-600');
    expect(creditAmounts.length).toBeGreaterThan(0);
  });

  it('displays visual indicator for transaction type', () => {
    const { container } = render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    const indicators = container.querySelectorAll('.rounded-full');
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
        className="custom-class"
      />
    );

    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });

  it('resets pagination when filters change', async () => {
    const manyTransactions = Array.from({ length: 30 }, (_, i) => ({
      ...mockTransactions[0],
      id: `tx-${i}`,
      description: i < 5 ? 'Coffee' : 'Other',
    }));

    const { user } = render(
      <TransactionList
        accountId="acc-123"
        transactions={manyTransactions}
      />
    );

    // Load more to show more than initial
    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    await user.click(loadMoreButton);

    // Apply filter
    const searchInput = screen.getByLabelText(/search transactions/i);
    await user.type(searchInput, 'coffee');

    // Should reset to showing first page
    await waitFor(() => {
      const showingText = screen.getByText(/showing/i).textContent;
      expect(showingText).toMatch(/5/); // Should show filtered count
    });
  });

  it('handles search by merchant', async () => {
    const { user } = render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    const searchInput = screen.getByLabelText(/search transactions/i);
    await user.type(searchInput, 'starbucks');

    await waitFor(() => {
      expect(screen.getByText('Starbucks')).toBeInTheDocument();
      expect(screen.queryByText('Whole Foods Market')).not.toBeInTheDocument();
    });
  });

  it('has correct accessibility attributes', () => {
    render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    const searchInput = screen.getByLabelText(/search transactions/i);
    expect(searchInput).toHaveAttribute('aria-label', 'Search transactions by description or merchant');

    const dateFromInput = screen.getByLabelText(/from date/i);
    expect(dateFromInput).toHaveAttribute('aria-label', 'Filter transactions from this date');
  });

  it('shows empty state message when filters return no results', async () => {
    const { user } = render(
      <TransactionList
        accountId="acc-123"
        transactions={mockTransactions}
      />
    );

    const searchInput = screen.getByLabelText(/search transactions/i);
    await user.type(searchInput, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText('No transactions found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });
  });

});
