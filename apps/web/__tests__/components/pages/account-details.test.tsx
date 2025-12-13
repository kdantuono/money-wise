/**
 * Account Details Page Tests
 *
 * TDD tests for the /dashboard/accounts/[id] page.
 * Tests account info display, transaction list, and account actions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';

// Mock next/navigation
const mockRouter = {
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
};

const mockParams = { id: 'acc-123' };

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => mockParams,
  usePathname: () => '/dashboard/accounts/acc-123',
}));

// Mock accounts client
const mockAccount = {
  id: 'acc-123',
  userId: 'user-1',
  name: 'Checking Account',
  displayName: 'Checking Account',
  type: 'CHECKING',
  status: 'ACTIVE',
  source: 'SALTEDGE',
  currentBalance: 5432.1,
  availableBalance: 5432.1,
  currency: 'USD',
  institutionName: 'Chase Bank',
  maskedAccountNumber: '****1234',
  isPlaidAccount: false,
  isManualAccount: false,
  isSyncable: true,
  needsSync: false,
  isActive: true,
  syncEnabled: true,
  lastSyncAt: '2024-01-15T10:30:00Z',
  saltEdgeConnectionId: 'conn-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
};

const mockTransactions = [
  {
    id: 'tx-1',
    accountId: 'acc-123',
    categoryId: 'cat-1',
    amount: 125.5,
    displayAmount: 125.5,
    type: 'DEBIT',
    status: 'POSTED',
    source: 'SALTEDGE',
    date: '2024-01-15',
    description: 'Grocery Shopping',
    merchantName: 'Whole Foods',
    currency: 'USD',
    isPending: false,
    isRecurring: false,
    isHidden: false,
    includeInBudget: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    isDebit: true,
    isCredit: false,
  },
  {
    id: 'tx-2',
    accountId: 'acc-123',
    categoryId: 'cat-2',
    amount: 3000.0,
    displayAmount: 3000.0,
    type: 'CREDIT',
    status: 'POSTED',
    source: 'SALTEDGE',
    date: '2024-01-10',
    description: 'Salary Deposit',
    merchantName: null,
    currency: 'USD',
    isPending: false,
    isRecurring: false,
    isHidden: false,
    includeInBudget: true,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
    isDebit: false,
    isCredit: true,
  },
];

vi.mock('@/services/accounts.client', () => ({
  accountsClient: {
    getAccount: vi.fn(),
    updateAccount: vi.fn(),
    hideAccount: vi.fn(),
    deleteAccount: vi.fn(),
    checkDeletionEligibility: vi.fn(),
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(message = 'Account not found') {
      super(message);
      this.name = 'NotFoundError';
    }
  },
}));

vi.mock('@/services/transactions.client', () => ({
  transactionsClient: {
    getTransactions: vi.fn(),
  },
}));

vi.mock('@/services/categories.client', () => ({
  categoriesClient: {
    getOptions: vi.fn().mockResolvedValue([
      { id: 'cat-1', name: 'Groceries', type: 'EXPENSE' },
      { id: 'cat-2', name: 'Income', type: 'INCOME' },
    ]),
  },
}));

// Mock store for sync functionality
vi.mock('@/store', () => ({
  useBanking: () => ({
    syncAccount: vi.fn().mockResolvedValue(undefined),
  }),
}));

import AccountDetailsPage from '../../../app/dashboard/accounts/[id]/page';
import { accountsClient, NotFoundError } from '@/services/accounts.client';
import { transactionsClient } from '@/services/transactions.client';

describe('AccountDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(accountsClient.getAccount).mockResolvedValue(mockAccount);
    // getTransactions returns Transaction[] directly, not wrapped in an object
    vi.mocked(transactionsClient.getTransactions).mockResolvedValue(mockTransactions);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      // Make the API hang
      vi.mocked(accountsClient.getAccount).mockImplementation(
        () => new Promise(() => {})
      );

      render(<AccountDetailsPage />);

      expect(screen.getByTestId('account-loading')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show 404 message for invalid account', async () => {
      vi.mocked(accountsClient.getAccount).mockRejectedValue(
        new NotFoundError('Account not found')
      );

      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText(/account not found/i)).toBeInTheDocument();
      });
    });

    it('should show generic error for other failures', async () => {
      vi.mocked(accountsClient.getAccount).mockRejectedValue(
        new Error('Network error')
      );

      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load account/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(accountsClient.getAccount).mockRejectedValue(
        new Error('Network error')
      );

      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('Account Header', () => {
    it('should display account name', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
          'Checking Account'
        );
      });
    });

    it('should display account balance', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('$5,432.10')).toBeInTheDocument();
      });
    });

    it('should display account type and institution', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        // Account type shown in header info section
        const infoText = screen.getByText(/Chase Bank/i);
        expect(infoText).toBeInTheDocument();
        // Checking type should be displayed
        expect(screen.getByRole('heading', { level: 1 }).parentElement).toHaveTextContent(/Checking/i);
      });
    });

    it('should display masked account number', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText(/\*\*\*\*1234/)).toBeInTheDocument();
      });
    });

    it('should show linked badge for banking accounts', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText(/linked/i)).toBeInTheDocument();
      });
    });

    it('should show manual badge for manual accounts', async () => {
      vi.mocked(accountsClient.getAccount).mockResolvedValue({
        ...mockAccount,
        source: 'MANUAL',
        isManualAccount: true,
        isSyncable: false,
      });

      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText(/manual/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sync Status', () => {
    it('should display last synced time for linked accounts', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText(/last synced/i)).toBeInTheDocument();
      });
    });

    it('should show sync button for syncable accounts', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
      });
    });

    it('should not show sync button for manual accounts', async () => {
      vi.mocked(accountsClient.getAccount).mockResolvedValue({
        ...mockAccount,
        source: 'MANUAL',
        isManualAccount: true,
        isSyncable: false,
      });

      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /sync/i })).not.toBeInTheDocument();
    });

    it('should show sync error indicator when sync failed', async () => {
      vi.mocked(accountsClient.getAccount).mockResolvedValue({
        ...mockAccount,
        syncError: 'Connection expired',
        needsSync: true,
      });

      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText(/sync error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should have back button to accounts list', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back/i });
        expect(backButton).toBeInTheDocument();
      });
    });

    it('should navigate back when back button clicked', async () => {
      const { user } = render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /back/i }));

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('Transaction List', () => {
    it('should fetch transactions filtered by account ID', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(transactionsClient.getTransactions).toHaveBeenCalledWith(
          expect.objectContaining({ accountId: 'acc-123' })
        );
      });
    });

    it('should display transactions for this account', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Grocery Shopping')).toBeInTheDocument();
        expect(screen.getByText('Salary Deposit')).toBeInTheDocument();
      });
    });

    it('should show transaction count', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText(/2 transactions/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no transactions', async () => {
      vi.mocked(transactionsClient.getTransactions).mockResolvedValue([]);

      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText(/no transactions/i)).toBeInTheDocument();
      });
    });
  });

  describe('Account Actions', () => {
    it('should show edit button in account header', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        // Get the account action buttons (in the header section with Edit text)
        const editButton = screen.getByRole('button', { name: 'Edit account' });
        expect(editButton).toBeInTheDocument();
      });
    });

    it('should show hide button for active accounts', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /hide/i })).toBeInTheDocument();
      });
    });

    it('should show delete button for manual accounts', async () => {
      vi.mocked(accountsClient.getAccount).mockResolvedValue({
        ...mockAccount,
        source: 'MANUAL',
        isManualAccount: true,
        isSyncable: false,
      });
      // Return empty transactions to avoid transaction row delete buttons
      vi.mocked(transactionsClient.getTransactions).mockResolvedValue([]);

      render(<AccountDetailsPage />);

      await waitFor(() => {
        // Look for the account action delete button specifically
        const deleteButton = screen.getByRole('button', { name: 'Delete account' });
        expect(deleteButton).toBeInTheDocument();
      });
    });

    it('should not show delete for linked syncable accounts', async () => {
      // Return empty transactions to avoid transaction row delete buttons
      vi.mocked(transactionsClient.getTransactions).mockResolvedValue([]);

      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: 'Delete account' })).not.toBeInTheDocument();
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should show breadcrumb with accounts link', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        const accountsLink = screen.getByRole('link', { name: /accounts/i });
        expect(accountsLink).toHaveAttribute('href', '/dashboard/accounts');
      });
    });

    it('should show current account name in breadcrumb', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        // The account name appears in breadcrumb AND in heading - find the breadcrumb specifically
        const breadcrumb = screen.getByRole('navigation');
        expect(breadcrumb).toHaveTextContent('Checking Account');
      });
    });
  });

  describe('Quick Stats', () => {
    it('should show income/expense summary for the account', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        // Check for income (credit transaction)
        expect(screen.getByText('$3,000.00')).toBeInTheDocument();
        // Check for expenses (debit transaction)
        expect(screen.getByText('$125.50')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      });
    });

    it('should have accessible buttons with labels', async () => {
      render(<AccountDetailsPage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
          expect(button).toHaveAccessibleName();
        });
      });
    });
  });
});
