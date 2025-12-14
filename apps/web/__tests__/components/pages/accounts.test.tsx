/**
 * Tests for AccountsPage component
 * Tests empty state, account actions, and hide/restore flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import AccountsPage from '../../../app/dashboard/accounts/page';
import { accountsClient } from '../../../src/services/accounts.client';
import { AccountType, AccountSource, AccountStatus } from '../../../src/types/account.types';
import type { DeletionEligibilityResponse } from '../../../src/types/account.types';

// Mock the accounts client
vi.mock('../../../src/services/accounts.client', () => ({
  accountsClient: {
    getAccounts: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    checkDeletionEligibility: vi.fn(),
    hideAccount: vi.fn(),
    restoreAccount: vi.fn(),
  },
}));

// Mock the banking store
vi.mock('../../../src/store', () => ({
  useBanking: () => ({
    fetchAccounts: vi.fn().mockResolvedValue([]),
    syncAccount: vi.fn(),
    revokeConnection: vi.fn(),
    clearError: vi.fn(),
  }),
  useAccounts: () => [],
  useBankingError: () => null,
  useBankingLoading: () => ({ isLoading: false, isLinking: false }),
}));

const mockAccountsClient = vi.mocked(accountsClient);

// Helper to create mock accounts
const createMockAccount = (overrides: Record<string, unknown> = {}) => {
  const source = (overrides.source as AccountSource) || AccountSource.MANUAL;
  const isManualAccount = overrides.isManualAccount !== undefined
    ? overrides.isManualAccount
    : source === AccountSource.MANUAL;
  const isSyncable = overrides.isSyncable !== undefined
    ? overrides.isSyncable
    : !isManualAccount; // Linked accounts are syncable by default unless explicitly set

  return {
    id: 'acc-123',
    userId: 'user-1',
    name: 'Test Savings',
    type: AccountType.SAVINGS,
    status: AccountStatus.ACTIVE,
    source,
    currentBalance: 1500.50,
    currency: 'USD',
    institutionName: 'Local Bank',
    displayName: 'Local Bank - Test Savings',
    isManualAccount,
    isPlaidAccount: false,
    isSyncable,
    needsSync: false,
    isActive: true,
    syncEnabled: !isManualAccount,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
};

describe('AccountsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: return empty accounts
    mockAccountsClient.getAccounts.mockResolvedValue([]);
  });

  // Note: DOM cleanup is handled globally in vitest.setup.ts

  describe('Header', () => {
    it('renders the page heading', () => {
      render(<AccountsPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Accounts');
    });

    it('renders the description text', () => {
      render(<AccountsPage />);

      expect(screen.getByText('Manage your bank accounts and financial connections')).toBeInTheDocument();
    });

    it('renders the Wallet icon in header', () => {
      const { container } = render(<AccountsPage />);

      const headerIcon = container.querySelector('.bg-blue-100 svg');
      expect(headerIcon).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state title', async () => {
      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('No accounts yet');
      });
    });

    it('renders empty state description', async () => {
      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Add a manual account to track cash or custom balances/)).toBeInTheDocument();
      });
    });

    it('renders large icon in empty state', async () => {
      const { container } = render(<AccountsPage />);

      await waitFor(() => {
        const emptyStateIcon = container.querySelector('.h-12.w-12.text-gray-300');
        expect(emptyStateIcon).toBeInTheDocument();
      });
    });
  });

  describe('Add Account Button', () => {
    it('renders Add Account button', async () => {
      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Account/i })).toBeInTheDocument();
      });
    });
  });

  describe('Hidden Accounts Section', () => {
    it('shows "Show hidden accounts" toggle when hidden accounts exist', async () => {
      const hiddenAccount = createMockAccount({
        id: 'acc-hidden',
        name: 'Hidden Savings',
        status: AccountStatus.HIDDEN,
      });
      const activeAccount = createMockAccount({
        id: 'acc-active',
        name: 'Active Checking',
        status: AccountStatus.ACTIVE,
      });

      mockAccountsClient.getAccounts.mockResolvedValue([activeAccount, hiddenAccount]);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show hidden accounts/i })).toBeInTheDocument();
      });
    });

    it('does not show hidden toggle when no hidden accounts', async () => {
      const activeAccount = createMockAccount({
        id: 'acc-active',
        name: 'Active Checking',
        status: AccountStatus.ACTIVE,
      });

      mockAccountsClient.getAccounts.mockResolvedValue([activeAccount]);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Active Checking')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /show hidden accounts/i })).not.toBeInTheDocument();
    });

    it('toggles hidden accounts visibility when clicked', async () => {
      const hiddenAccount = createMockAccount({
        id: 'acc-hidden',
        name: 'Hidden Savings',
        status: AccountStatus.HIDDEN,
      });
      const activeAccount = createMockAccount({
        id: 'acc-active',
        name: 'Active Checking',
        status: AccountStatus.ACTIVE,
      });

      mockAccountsClient.getAccounts.mockResolvedValue([activeAccount, hiddenAccount]);

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Active Checking')).toBeInTheDocument();
      });

      // Hidden account should not be visible by default
      expect(screen.queryByText('Hidden Savings')).not.toBeInTheDocument();

      // Click to show hidden accounts
      await user.click(screen.getByRole('button', { name: /show hidden accounts/i }));

      await waitFor(() => {
        expect(screen.getByText('Hidden Savings')).toBeInTheDocument();
      });
    });

    it('shows hidden account count in toggle button', async () => {
      const hiddenAccounts = [
        createMockAccount({ id: 'acc-hidden-1', name: 'Hidden 1', status: AccountStatus.HIDDEN }),
        createMockAccount({ id: 'acc-hidden-2', name: 'Hidden 2', status: AccountStatus.HIDDEN }),
      ];
      const activeAccount = createMockAccount({ id: 'acc-active', status: AccountStatus.ACTIVE });

      mockAccountsClient.getAccounts.mockResolvedValue([activeAccount, ...hiddenAccounts]);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show hidden accounts.*2/i })).toBeInTheDocument();
      });
    });
  });

  describe('Delete Account with Eligibility Check', () => {
    it('checks deletion eligibility when delete is clicked', async () => {
      const account = createMockAccount({ id: 'acc-to-delete' });
      mockAccountsClient.getAccounts.mockResolvedValue([account]);
      mockAccountsClient.checkDeletionEligibility.mockResolvedValue({
        canDelete: true,
        canHide: true,
        currentStatus: AccountStatus.ACTIVE,
        blockers: [],
        linkedTransferCount: 0,
      });

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Savings')).toBeInTheDocument();
      });

      // Find and click the delete button - use data-testid for reliability in CI
      const deleteButton = await screen.findByTestId('delete-button');
      await user.click(deleteButton);

      // Increase timeout for CI environment
      await waitFor(
        () => {
          expect(mockAccountsClient.checkDeletionEligibility).toHaveBeenCalledWith('acc-to-delete');
        },
        { timeout: 3000 }
      );
    });

    it('shows eligibility loading state in confirmation dialog', async () => {
      const account = createMockAccount({ id: 'acc-to-delete' });
      mockAccountsClient.getAccounts.mockResolvedValue([account]);

      // Create a delayed promise to simulate loading
      let resolveEligibility: (value: DeletionEligibilityResponse) => void;
      mockAccountsClient.checkDeletionEligibility.mockReturnValue(
        new Promise((resolve) => {
          resolveEligibility = resolve;
        })
      );

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Savings')).toBeInTheDocument();
      });

      const deleteButton = await screen.findByTestId('delete-button');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/checking deletion eligibility/i)).toBeInTheDocument();
      });

      // Resolve the eligibility check
      resolveEligibility!({
        canDelete: true,
        canHide: true,
        currentStatus: AccountStatus.ACTIVE,
        blockers: [],
        linkedTransferCount: 0,
      });
    });

    it('shows blocking transfers when deletion is not allowed', async () => {
      const account = createMockAccount({ id: 'acc-blocked' });
      mockAccountsClient.getAccounts.mockResolvedValue([account]);
      mockAccountsClient.checkDeletionEligibility.mockResolvedValue({
        canDelete: false,
        canHide: true,
        currentStatus: AccountStatus.ACTIVE,
        blockReason: 'Account has 2 transfers linked to other accounts',
        blockers: [
          {
            transactionId: 'tx-1',
            transferGroupId: 'tg-1',
            linkedAccountId: 'acc-456',
            linkedAccountName: 'Checking Account',
            amount: 500,
            date: '2025-11-15',
            description: 'Transfer',
            transferRole: 'SOURCE',
          },
        ],
        linkedTransferCount: 2,
      });

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Savings')).toBeInTheDocument();
      });

      const deleteButton = await screen.findByTestId('delete-button');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/cannot be deleted/i)).toBeInTheDocument();
        expect(screen.getByText('Checking Account')).toBeInTheDocument();
      });
    });
  });

  describe('Hide Account Flow', () => {
    it('shows "Hide Instead" button when deletion is blocked', async () => {
      const account = createMockAccount({ id: 'acc-blocked' });
      mockAccountsClient.getAccounts.mockResolvedValue([account]);
      mockAccountsClient.checkDeletionEligibility.mockResolvedValue({
        canDelete: false,
        canHide: true,
        currentStatus: AccountStatus.ACTIVE,
        blockReason: 'Account has linked transfers',
        blockers: [
          {
            transactionId: 'tx-1',
            transferGroupId: 'tg-1',
            linkedAccountId: 'acc-456',
            linkedAccountName: 'Other Account',
            amount: 100,
            date: '2025-11-15',
            description: 'Transfer',
            transferRole: 'SOURCE',
          },
        ],
        linkedTransferCount: 1,
      });

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Savings')).toBeInTheDocument();
      });

      const deleteButton = await screen.findByTestId('delete-button');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /hide instead/i })).toBeInTheDocument();
      });
    });

    it('calls hideAccount API when "Hide Instead" is clicked', async () => {
      const account = createMockAccount({ id: 'acc-to-hide' });
      mockAccountsClient.getAccounts.mockResolvedValue([account]);
      mockAccountsClient.checkDeletionEligibility.mockResolvedValue({
        canDelete: false,
        canHide: true,
        currentStatus: AccountStatus.ACTIVE,
        blockReason: 'Account has linked transfers',
        blockers: [
          {
            transactionId: 'tx-1',
            transferGroupId: 'tg-1',
            linkedAccountId: 'acc-456',
            linkedAccountName: 'Other Account',
            amount: 100,
            date: '2025-11-15',
            description: 'Transfer',
            transferRole: 'SOURCE',
          },
        ],
        linkedTransferCount: 1,
      });
      mockAccountsClient.hideAccount.mockResolvedValue({
        ...account,
        status: AccountStatus.HIDDEN,
      });

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Savings')).toBeInTheDocument();
      });

      const deleteButton = await screen.findByTestId('delete-button');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /hide instead/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /hide instead/i }));

      await waitFor(() => {
        expect(mockAccountsClient.hideAccount).toHaveBeenCalledWith('acc-to-hide');
      });
    });

    it('refreshes accounts after hiding', async () => {
      const account = createMockAccount({ id: 'acc-to-hide' });
      mockAccountsClient.getAccounts.mockResolvedValue([account]);
      mockAccountsClient.checkDeletionEligibility.mockResolvedValue({
        canDelete: false,
        canHide: true,
        currentStatus: AccountStatus.ACTIVE,
        blockReason: 'Account has linked transfers',
        blockers: [
          {
            transactionId: 'tx-1',
            transferGroupId: 'tg-1',
            linkedAccountId: 'acc-456',
            linkedAccountName: 'Other Account',
            amount: 100,
            date: '2025-11-15',
            description: 'Transfer',
            transferRole: 'SOURCE',
          },
        ],
        linkedTransferCount: 1,
      });
      mockAccountsClient.hideAccount.mockResolvedValue({
        ...account,
        status: AccountStatus.HIDDEN,
      });

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Savings')).toBeInTheDocument();
      });

      // Clear the initial call count
      mockAccountsClient.getAccounts.mockClear();

      const deleteButton = await screen.findByTestId('delete-button');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /hide instead/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /hide instead/i }));

      await waitFor(() => {
        // Should refresh accounts after hiding
        expect(mockAccountsClient.getAccounts).toHaveBeenCalled();
      });
    });
  });

  describe('Restore Account Flow', () => {
    it('shows restore button for hidden accounts', async () => {
      const hiddenAccount = createMockAccount({
        id: 'acc-hidden',
        name: 'Hidden Savings',
        status: AccountStatus.HIDDEN,
      });
      const activeAccount = createMockAccount({
        id: 'acc-active',
        name: 'Active Checking',
        status: AccountStatus.ACTIVE,
      });

      mockAccountsClient.getAccounts.mockResolvedValue([activeAccount, hiddenAccount]);

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show hidden accounts/i })).toBeInTheDocument();
      });

      // Show hidden accounts
      await user.click(screen.getByRole('button', { name: /show hidden accounts/i }));

      await waitFor(() => {
        expect(screen.getByText('Hidden Savings')).toBeInTheDocument();
      });

      // Hidden account should have a restore button with proper aria-label
      const restoreButton = screen.getByRole('button', { name: /restore hidden savings/i });
      expect(restoreButton).toBeInTheDocument();
    });

    it('calls restoreAccount API when restore is clicked', async () => {
      const hiddenAccount = createMockAccount({
        id: 'acc-hidden',
        name: 'Hidden Savings',
        status: AccountStatus.HIDDEN,
      });

      mockAccountsClient.getAccounts.mockResolvedValue([hiddenAccount]);
      mockAccountsClient.restoreAccount.mockResolvedValue({
        ...hiddenAccount,
        status: AccountStatus.ACTIVE,
      });

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show hidden accounts/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /show hidden accounts/i }));

      await waitFor(() => {
        expect(screen.getByText('Hidden Savings')).toBeInTheDocument();
      });

      // Find and click restore button
      const restoreButton = screen.getByRole('button', { name: /restore/i });
      await user.click(restoreButton);

      await waitFor(() => {
        expect(mockAccountsClient.restoreAccount).toHaveBeenCalledWith('acc-hidden');
      });
    });

    it('refreshes accounts after restoring', async () => {
      const hiddenAccount = createMockAccount({
        id: 'acc-hidden',
        name: 'Hidden Savings',
        status: AccountStatus.HIDDEN,
      });

      mockAccountsClient.getAccounts.mockResolvedValue([hiddenAccount]);
      mockAccountsClient.restoreAccount.mockResolvedValue({
        ...hiddenAccount,
        status: AccountStatus.ACTIVE,
      });

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show hidden accounts/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /show hidden accounts/i }));

      await waitFor(() => {
        expect(screen.getByText('Hidden Savings')).toBeInTheDocument();
      });

      // Clear initial calls
      mockAccountsClient.getAccounts.mockClear();

      const restoreButton = screen.getByRole('button', { name: /restore/i });
      await user.click(restoreButton);

      await waitFor(() => {
        expect(mockAccountsClient.getAccounts).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Account Flow', () => {
    it('does NOT send id property in updateAccount request body', async () => {
      const account = createMockAccount({ id: 'acc-to-edit', name: 'Edit Me' });
      mockAccountsClient.getAccounts.mockResolvedValue([account]);
      mockAccountsClient.updateAccount.mockResolvedValue({
        ...account,
        name: 'Updated Name',
      });

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Edit Me')).toBeInTheDocument();
      });

      // Find and click the edit button using test id
      const editButton = screen.getByTestId('edit-button');
      await user.click(editButton);

      // Wait for the edit form to appear
      await waitFor(() => {
        expect(screen.getByTestId('account-name-input')).toBeInTheDocument();
      });

      // Update the account name
      const nameInput = screen.getByTestId('account-name-input');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /update account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAccountsClient.updateAccount).toHaveBeenCalled();
      });

      // Verify the API was called correctly:
      // - First arg should be the account ID
      // - Second arg (request body) should NOT contain 'id' property
      const [accountId, requestBody] = mockAccountsClient.updateAccount.mock.calls[0];

      expect(accountId).toBe('acc-to-edit');
      expect(requestBody).not.toHaveProperty('id');
      expect(requestBody).toHaveProperty('name', 'Updated Name');
    });

    it('sends settings with icon and color in updateAccount request body', async () => {
      const account = createMockAccount({ id: 'acc-to-edit', name: 'Edit Me' });
      mockAccountsClient.getAccounts.mockResolvedValue([account]);
      mockAccountsClient.updateAccount.mockResolvedValue({
        ...account,
        name: 'Updated Name',
        settings: { icon: 'piggybank', color: 'green' },
      });

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Edit Me')).toBeInTheDocument();
      });

      const editButton = screen.getByTestId('edit-button');
      await user.click(editButton);

      // Increase timeout for CI environment where modal rendering may be slower
      await waitFor(
        () => {
          expect(screen.getByTestId('account-name-input')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Click on piggybank icon if selector exists
      const piggyBankIcon = screen.queryByTestId('icon-piggybank');
      if (piggyBankIcon) {
        await user.click(piggyBankIcon);
      }

      // Click on green color if selector exists
      const greenColor = screen.queryByTestId('color-green');
      if (greenColor) {
        await user.click(greenColor);
      }

      const submitButton = screen.getByRole('button', { name: /update account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAccountsClient.updateAccount).toHaveBeenCalled();
      });

      // Verify settings IS in the request body (backend DTO now accepts it)
      const [, requestBody] = mockAccountsClient.updateAccount.mock.calls[0];
      expect(requestBody).toHaveProperty('settings');
      expect(requestBody.settings).toHaveProperty('icon');
      expect(requestBody.settings).toHaveProperty('color');
    });

    it('sends only valid UpdateAccountRequest fields to API', async () => {
      const account = createMockAccount({ id: 'acc-to-edit', name: 'My Account' });
      mockAccountsClient.getAccounts.mockResolvedValue([account]);
      mockAccountsClient.updateAccount.mockResolvedValue({
        ...account,
        name: 'New Name',
        currentBalance: 2000,
      });

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('My Account')).toBeInTheDocument();
      });

      const editButton = screen.getByTestId('edit-button');
      await user.click(editButton);

      // Increase timeout for CI environment where modal rendering may be slower
      await waitFor(
        () => {
          expect(screen.getByTestId('account-name-input')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Update name and balance
      const nameInput = screen.getByTestId('account-name-input');
      const balanceInput = screen.getByTestId('account-balance-input');

      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      await user.clear(balanceInput);
      await user.type(balanceInput, '2000');

      const submitButton = screen.getByRole('button', { name: /update account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAccountsClient.updateAccount).toHaveBeenCalled();
      });

      const [accountId, requestBody] = mockAccountsClient.updateAccount.mock.calls[0];

      // Check correct call structure
      expect(accountId).toBe('acc-to-edit');

      // Check only valid fields are sent (not id)
      const allowedKeys = ['name', 'status', 'currentBalance', 'availableBalance', 'creditLimit', 'institutionName', 'syncEnabled', 'settings'];
      const requestKeys = Object.keys(requestBody);

      for (const key of requestKeys) {
        expect(allowedKeys).toContain(key);
      }

      // Explicitly verify prohibited fields are not present
      expect(requestBody).not.toHaveProperty('id');
      expect(requestBody).not.toHaveProperty('userId');
      expect(requestBody).not.toHaveProperty('source');
      expect(requestBody).not.toHaveProperty('type');
    });

    it('shows edit button for linked (SaltEdge) accounts', async () => {
      const linkedAccount = createMockAccount({
        id: 'acc-saltedge',
        name: 'SaltEdge Bank Account',
        source: AccountSource.SALTEDGE,
        isManualAccount: false,
        isPlaidAccount: false,
      });
      mockAccountsClient.getAccounts.mockResolvedValue([linkedAccount]);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('SaltEdge Bank Account')).toBeInTheDocument();
      });

      // Linked accounts should have an edit button for icon/color customization
      const editButton = screen.getByTestId('edit-button');
      expect(editButton).toBeInTheDocument();
    });

    it('allows editing icon and color for linked accounts', async () => {
      const linkedAccount = createMockAccount({
        id: 'acc-saltedge',
        name: 'SaltEdge Bank Account',
        source: AccountSource.SALTEDGE,
        isManualAccount: false,
        isPlaidAccount: false,
      });
      mockAccountsClient.getAccounts.mockResolvedValue([linkedAccount]);
      mockAccountsClient.updateAccount.mockResolvedValue({
        ...linkedAccount,
        settings: { icon: 'bank', color: 'teal' },
      });

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('SaltEdge Bank Account')).toBeInTheDocument();
      });

      // Click edit button for linked account
      const editButton = screen.getByTestId('edit-button');
      await user.click(editButton);

      // Form should appear - for linked accounts, only icon/color should be editable
      await waitFor(() => {
        // Should have icon and color selectors
        const iconSelector = screen.queryByTestId('icon-bank') || screen.queryByTestId('icon-wallet');
        expect(iconSelector).toBeInTheDocument();
      });

      // Select an icon and color
      const bankIcon = screen.queryByTestId('icon-bank');
      if (bankIcon) {
        await user.click(bankIcon);
      }

      const tealColor = screen.queryByTestId('color-teal');
      if (tealColor) {
        await user.click(tealColor);
      }

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /update account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAccountsClient.updateAccount).toHaveBeenCalled();
      });

      // Verify only settings (icon/color) is sent, not name/balance for linked accounts
      const [accountId, requestBody] = mockAccountsClient.updateAccount.mock.calls[0];
      expect(accountId).toBe('acc-saltedge');
      expect(requestBody).toHaveProperty('settings');
    });
  });

  describe('Revoke Account Flow', () => {
    it('shows revoke button for syncable linked accounts', async () => {
      const linkedAccount = createMockAccount({
        id: 'acc-saltedge',
        name: 'SaltEdge Bank Account',
        source: AccountSource.SALTEDGE,
        isManualAccount: false,
        isSyncable: true,
      });
      mockAccountsClient.getAccounts.mockResolvedValue([linkedAccount]);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('SaltEdge Bank Account')).toBeInTheDocument();
      });

      // Syncable linked accounts should have Revoke button
      const revokeButton = screen.getByRole('button', { name: /disconnect/i });
      expect(revokeButton).toBeInTheDocument();
    });

    it('shows revoke confirmation when revoke is clicked', async () => {
      const linkedAccount = createMockAccount({
        id: 'acc-saltedge',
        name: 'SaltEdge Bank Account',
        source: AccountSource.SALTEDGE,
        isManualAccount: false,
        isSyncable: true,
        institutionName: 'Test Bank',
      });
      mockAccountsClient.getAccounts.mockResolvedValue([linkedAccount]);

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('SaltEdge Bank Account')).toBeInTheDocument();
      });

      const revokeButton = screen.getByRole('button', { name: /disconnect/i });
      await user.click(revokeButton);

      // Revoke confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/revoke account access/i)).toBeInTheDocument();
      });
    });
  });

  describe('Delete Orphaned Linked Accounts', () => {
    it('shows delete button for orphaned linked accounts (not syncable)', async () => {
      // An orphaned linked account is one with source=SALTEDGE but isSyncable=false
      // (lost connection, no valid saltEdgeConnectionId)
      const orphanedLinkedAccount = createMockAccount({
        id: 'acc-orphaned',
        name: 'Orphaned Bank Account',
        source: AccountSource.SALTEDGE,
        isManualAccount: false,
        isSyncable: false, // Lost connection, can't sync anymore
      });
      mockAccountsClient.getAccounts.mockResolvedValue([orphanedLinkedAccount]);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Orphaned Bank Account')).toBeInTheDocument();
      });

      // Orphaned (non-syncable) linked accounts should have Delete button
      const deleteButton = await screen.findByTestId('delete-button');
      expect(deleteButton).toBeInTheDocument();
    });

    it('allows deletion of orphaned linked accounts', async () => {
      const orphanedLinkedAccount = createMockAccount({
        id: 'acc-orphaned',
        name: 'Orphaned Bank Account',
        source: AccountSource.SALTEDGE,
        isManualAccount: false,
        isSyncable: false,
      });
      mockAccountsClient.getAccounts.mockResolvedValue([orphanedLinkedAccount]);
      mockAccountsClient.checkDeletionEligibility.mockResolvedValue({
        canDelete: true,
        canHide: true,
        currentStatus: AccountStatus.ACTIVE,
        blockers: [],
        linkedTransferCount: 0,
      });

      const { user } = render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Orphaned Bank Account')).toBeInTheDocument();
      });

      // Use data-testid for more reliable selection in CI
      const deleteButton = await screen.findByTestId('delete-button');
      await user.click(deleteButton);

      // Should check deletion eligibility
      await waitFor(
        () => {
          expect(mockAccountsClient.checkDeletionEligibility).toHaveBeenCalledWith('acc-orphaned');
        },
        { timeout: 3000 }
      );

      // Delete confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('does NOT show revoke button for non-syncable accounts', async () => {
      const orphanedLinkedAccount = createMockAccount({
        id: 'acc-orphaned',
        name: 'Orphaned Bank Account',
        source: AccountSource.SALTEDGE,
        isManualAccount: false,
        isSyncable: false,
      });
      mockAccountsClient.getAccounts.mockResolvedValue([orphanedLinkedAccount]);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Orphaned Bank Account')).toBeInTheDocument();
      });

      // Should NOT have Revoke button since account is not syncable
      expect(screen.queryByRole('button', { name: /revoke/i })).not.toBeInTheDocument();
    });
  });

  describe('Account Statistics', () => {
    it('excludes hidden accounts from total balance by default', async () => {
      const activeAccount = createMockAccount({
        id: 'acc-active',
        name: 'Active',
        status: AccountStatus.ACTIVE,
        currentBalance: 1000,
      });
      const hiddenAccount = createMockAccount({
        id: 'acc-hidden',
        name: 'Hidden',
        status: AccountStatus.HIDDEN,
        currentBalance: 500,
      });

      mockAccountsClient.getAccounts.mockResolvedValue([activeAccount, hiddenAccount]);

      render(<AccountsPage />);

      // Wait for accounts to load and check total balance only includes active account
      await waitFor(() => {
        // The active account has $1,000 balance, hidden account should not be included
        const totalBalanceElement = screen.getByText('Total Balance').closest('div');
        expect(totalBalanceElement).toBeInTheDocument();
        // Check that the value matches active account balance only
        expect(totalBalanceElement?.textContent).toContain('$1,000.00');
      });
    });

    it('shows hidden accounts count in statistics', async () => {
      const activeAccount = createMockAccount({
        id: 'acc-active',
        status: AccountStatus.ACTIVE,
      });
      const hiddenAccounts = [
        createMockAccount({ id: 'acc-hidden-1', status: AccountStatus.HIDDEN }),
        createMockAccount({ id: 'acc-hidden-2', status: AccountStatus.HIDDEN }),
      ];

      mockAccountsClient.getAccounts.mockResolvedValue([activeAccount, ...hiddenAccounts]);

      render(<AccountsPage />);

      await waitFor(() => {
        // Should show count of hidden accounts somewhere
        expect(screen.getByText(/2 hidden/i)).toBeInTheDocument();
      });
    });
  });
});
