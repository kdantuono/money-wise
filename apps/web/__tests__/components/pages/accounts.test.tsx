/**
 * Smoke tests for the rewritten AccountsPage component.
 *
 * The page was fully rewritten during the Figma Design Sprint.
 * These tests verify basic rendering and Italian UI text.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, whileHover, whileTap, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the accounts client
vi.mock('@/services/accounts.client', () => ({
  accountsClient: {
    getAccounts: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

// Mock the transactions client
vi.mock('@/services/transactions.client', () => ({
  transactionsClient: {
    getTransactions: vi.fn(),
  },
}));

// Mock the banking store
vi.mock('@/store', () => ({
  useBankingStore: () => ({
    syncAccount: vi.fn(),
  }),
}));

// Mock the banking client
vi.mock('@/services/banking.client', () => ({
  initiateLink: vi.fn(),
}));

// Mock ManualAccountForm and EditAccountForm
vi.mock('@/components/accounts', () => ({
  ManualAccountForm: () => <div data-testid="manual-account-form">Manual Account Form</div>,
}));

vi.mock('@/components/accounts/EditAccountForm', () => ({
  EditAccountForm: () => <div data-testid="edit-account-form">Edit Account Form</div>,
}));

// Import mocked module
import { accountsClient } from '@/services/accounts.client';
import { transactionsClient } from '@/services/transactions.client';
import AccountsPage from '../../../app/dashboard/accounts/page';

const mockAccountsClient = vi.mocked(accountsClient);
const mockTransactionsClient = vi.mocked(transactionsClient);

// Helper to create a mock account matching the Account type from the service
const createMockAccount = (overrides: Record<string, unknown> = {}) => ({
  id: 'acc-1',
  userId: 'user-1',
  name: 'Conto Corrente Principale',
  type: 'CHECKING',
  status: 'ACTIVE',
  source: 'MANUAL',
  currentBalance: 2500.50,
  currency: 'EUR',
  institutionName: null,
  displayName: 'Conto Corrente Principale',
  isManualAccount: true,
  isSyncable: false,
  needsSync: false,
  isActive: true,
  syncEnabled: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('AccountsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: return empty accounts
    mockAccountsClient.getAccounts.mockResolvedValue([]);
    mockTransactionsClient.getTransactions.mockResolvedValue([]);
  });

  it('renders the page heading in Italian', async () => {
    render(<AccountsPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Conti e Carte');
    });
  });

  it('renders the Italian description text', async () => {
    render(<AccountsPage />);

    await waitFor(() => {
      expect(screen.getByText(/gestisci i tuoi conti/i)).toBeInTheDocument();
    });
  });

  it('renders the "Aggiungi Conto" button', async () => {
    render(<AccountsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /aggiungi conto/i })).toBeInTheDocument();
    });
  });

  it('renders account name when accounts are returned', async () => {
    const account = createMockAccount({ name: 'Il Mio Conto' });
    mockAccountsClient.getAccounts.mockResolvedValue([account]);

    render(<AccountsPage />);

    await waitFor(() => {
      // Account name appears in card + details sidebar
      const elements = screen.getAllByText('Il Mio Conto');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows account balance formatted in EUR with Italian locale', async () => {
    const account = createMockAccount({ currentBalance: 1234.56 });
    mockAccountsClient.getAccounts.mockResolvedValue([account]);

    render(<AccountsPage />);

    await waitFor(() => {
      // Node/jsdom may format as "1234,56" or "1.234,56" depending on ICU data
      const balanceElements = screen.getAllByText(/€1\.?234,56/);
      expect(balanceElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows account type label in Italian', async () => {
    const account = createMockAccount({ type: 'SAVINGS' });
    mockAccountsClient.getAccounts.mockResolvedValue([account]);

    render(<AccountsPage />);

    await waitFor(() => {
      // Account type label may appear in card and details
      const elements = screen.getAllByText('Risparmio');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
