/**
 * Dashboard Accounts Page
 *
 * Main page for managing ALL accounts (both manual and linked).
 * Displays accounts with sync status, actions, and error handling.
 *
 * Features:
 * - Display ALL accounts (manual + linked banking accounts)
 * - Create manual accounts (cash, portfolio, custom)
 * - Initiate new bank account linking via OAuth
 * - Sync individual accounts
 * - Revoke account access
 * - Handle loading and error states
 * - WCAG 2.2 AA accessibility compliance
 *
 * @module app/dashboard/accounts/page
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BankingLinkButton,
  AccountList,
  RevokeConfirmation,
  ErrorAlert,
  ErrorBoundary,
} from '@/components/banking';
import { OAuthPopupModal } from '@/components/banking/OAuthPopupModal';
import { AddAccountDropdown, ManualAccountForm, EditAccountForm, DeleteAccountConfirmation } from '@/components/accounts';
import {
  useBanking,
  useBankingStore,
  useAccounts,
  useBankingError,
  useBankingLoading,
} from '@/store';
import { accountsClient, RelinkRequiredError, type Account, type CreateAccountRequest, type UpdateAccountRequest } from '@/services/accounts.client';
import { BankingAccount, BankingSyncStatus, BankingConnectionStatus, BankingProvider } from '@/lib/banking-types';
import { AccountStatus, type DeletionEligibilityResponse } from '@/types/account.types';
import { Wallet, RefreshCw, Eye, EyeOff, RotateCcw, Trash2, AlertCircle, LinkIcon } from 'lucide-react';

/**
 * AccountsPage Component
 *
 * Main banking management page with account list, linking, and sync functionality.
 * Rendered within the dashboard layout.
 *
 * @returns {JSX.Element} Accounts page with account management UI
 */
export default function AccountsPage() {
  // Router for navigation
  const router = useRouter();

  // Zustand store hooks (for banking accounts)
  const { fetchAccounts: fetchBankingAccounts, syncAccount, revokeConnection, clearError } = useBanking();
  const _bankingAccounts = useAccounts(); // Reserved for banking sync status
  const bankingError = useBankingError();
  const { isLoading: isBankingLoading, isLinking } = useBankingLoading();

  // Local state for ALL accounts (manual + linked)
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [accountToRevoke, setAccountToRevoke] = useState<BankingAccount | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Manual account form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  // Edit account state
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [editError, setEditError] = useState<string | undefined>();

  // Delete manual account state
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Deletion eligibility state
  const [deletionEligibility, setDeletionEligibility] = useState<DeletionEligibilityResponse | undefined>();
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [isHidingAccount, setIsHidingAccount] = useState(false);
  const [isRestoringAccount, setIsRestoringAccount] = useState(false);

  // Hidden accounts visibility
  const [showHiddenAccounts, setShowHiddenAccounts] = useState(false);

  // Sibling account count for revoke warning
  const [revokeSiblingCount, setRevokeSiblingCount] = useState(0);

  // Re-link prompt state (for banking accounts with revoked connections)
  const [relinkPrompt, setRelinkPrompt] = useState<{
    accountId: string;
    message: string;
    siblingAccountCount: number;
    providerName?: string;
    suggestion?: string;
  } | null>(null);

  // OAuth popup modal state
  const [oauthPopup, setOAuthPopup] = useState<{
    redirectUrl: string;
    connectionId: string;
    title: string;
  } | null>(null);

  /**
   * Fetch ALL accounts from /api/accounts endpoint
   */
  const fetchAllAccounts = useCallback(async () => {
    try {
      setIsLoadingAccounts(true);
      const accounts = await accountsClient.getAccounts();
      setAllAccounts(accounts);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
      setLocalError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  /**
   * Fetch accounts on component mount
   */
  useEffect(() => {
    fetchAllAccounts();
    // Also fetch banking accounts for sync/revoke capabilities
    fetchBankingAccounts().catch(console.error);
  }, [fetchAllAccounts, fetchBankingAccounts]);

  /**
   * Handle successful bank linking
   */
  const handleLinkSuccess = async () => {
    try {
      setLocalError(null);
      await fetchAllAccounts();
      await fetchBankingAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to refresh accounts after linking. Please refresh the page.';
      setLocalError(errorMessage);
    }
  };

  /**
   * Handle bank linking error
   */
  const handleLinkError = (errorMessage: string) => {
    setLocalError(errorMessage);
  };

  /**
   * Handle manual account refresh
   */
  const handleRefreshAccounts = async () => {
    try {
      setIsRefreshing(true);
      setLocalError(null);
      clearError();
      await fetchAllAccounts();
      await fetchBankingAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to refresh accounts. Please try again.';
      setLocalError(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Handle manual account form open
   */
  const handleManualAccountClick = () => {
    setShowManualForm(true);
    setFormError(undefined);
  };

  /**
   * Handle bank link click (trigger OAuth)
   */
  const handleLinkBankClick = () => {
    // Trigger the BankingLinkButton programmatically
    const linkButton = document.querySelector('[data-testid="link-bank-button"]') as HTMLButtonElement;
    linkButton?.click();
  };

  /**
   * Handle manual account form submission
   */
  const handleCreateManualAccount = async (data: CreateAccountRequest) => {
    try {
      setIsCreatingAccount(true);
      setFormError(undefined);
      await accountsClient.createAccount(data);
      setShowManualForm(false);
      await fetchAllAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to create account. Please try again.';
      setFormError(errorMessage);
      throw err; // Re-throw so the form knows submission failed
    } finally {
      setIsCreatingAccount(false);
    }
  };

  /**
   * Handle manual account form cancel
   */
  const handleCancelManualAccount = () => {
    setShowManualForm(false);
    setFormError(undefined);
  };

  /**
   * Handle account sync
   */
  const handleSync = async (accountId: string) => {
    try {
      setLocalError(null);
      await syncAccount(accountId);
      await fetchAllAccounts(); // Refresh all accounts after sync
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  /**
   * Handle account revocation
   * Uses allAccounts for lookup since it's the source of truth for the AccountList
   */
  const handleRevoke = (accountId: string) => {
    // Find in allAccounts (source of truth), then convert to BankingAccount format
    const account = allAccounts.find((acc) => acc.id === accountId);
    if (account) {
      // Calculate sibling account count (other accounts on the same connection)
      // This is important: revoking one account will revoke ALL accounts on the same connection
      let siblingCount = 0;
      if (account.saltEdgeConnectionId) {
        siblingCount = allAccounts.filter(
          (acc) =>
            acc.id !== accountId &&
            acc.saltEdgeConnectionId === account.saltEdgeConnectionId &&
            acc.status !== AccountStatus.HIDDEN
        ).length;
      }
      setRevokeSiblingCount(siblingCount);

      // Convert to BankingAccount format for RevokeConfirmation component
      // Using type assertion as Account has all properties needed for display
      const bankingAccount = {
        id: account.id,
        userId: account.userId,
        connectionId: account.saltEdgeConnectionId || '',
        provider: account.source === 'SALTEDGE' ? BankingProvider.SALTEDGE : BankingProvider.MANUAL,
        providerAccountId: account.id,
        name: account.name,
        balance: account.currentBalance,
        currency: account.currency,
        bankName: account.institutionName || 'Unknown Bank',
        iban: account.maskedAccountNumber || '',
        syncStatus: account.needsSync ? BankingSyncStatus.PENDING : (account.syncError ? BankingSyncStatus.ERROR : BankingSyncStatus.SYNCED),
        connectionStatus: account.isActive ? BankingConnectionStatus.AUTHORIZED : BankingConnectionStatus.REVOKED,
        lastSyncedAt: account.lastSyncAt ? new Date(account.lastSyncAt) : undefined,
        linkedAt: new Date(account.createdAt),
      } as BankingAccount;
      setAccountToRevoke(bankingAccount);
    }
  };

  /**
   * Confirm account revocation
   */
  const handleConfirmRevoke = async () => {
    if (!accountToRevoke) return;

    try {
      setLocalError(null);
      await revokeConnection(accountToRevoke.id);
      setAccountToRevoke(null);
      setRevokeSiblingCount(0);
      await fetchAllAccounts();
      await fetchBankingAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to revoke account access. Please try again.';
      setLocalError(errorMessage);
      setAccountToRevoke(null);
      setRevokeSiblingCount(0);
    }
  };

  /**
   * Cancel account revocation
   */
  const handleCancelRevoke = () => {
    setAccountToRevoke(null);
    setRevokeSiblingCount(0);
  };

  /**
   * Handle view account details
   * Navigates to the account details page
   */
  const handleView = useCallback((accountId: string) => {
    router.push(`/dashboard/accounts/${accountId}`);
  }, [router]);

  /**
   * Handle edit account click
   * For manual accounts: edit all fields (name, balance, etc.)
   * For linked accounts: edit only display settings (icon, color)
   */
  const handleEdit = (accountId: string) => {
    const account = allAccounts.find((acc) => acc.id === accountId);
    if (account) {
      setAccountToEdit(account);
      setEditError(undefined);
    }
  };

  /**
   * Handle update account
   */
  const handleUpdateAccount = async (data: UpdateAccountRequest & { id?: string }) => {
    if (!accountToEdit) return;

    try {
      setIsUpdatingAccount(true);
      setEditError(undefined);
      // Strip id from request body - id is in URL path
      const { id: _id, ...updateData } = data;
      await accountsClient.updateAccount(accountToEdit.id, updateData);
      setAccountToEdit(null);
      await fetchAllAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to update account. Please try again.';
      setEditError(errorMessage);
      throw err; // Re-throw so the form knows submission failed
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  /**
   * Cancel edit account
   */
  const handleCancelEdit = () => {
    setAccountToEdit(null);
    setEditError(undefined);
  };

  /**
   * Handle delete account click
   * Works for:
   * - Manual accounts (isManualAccount: true)
   * - Orphaned linked accounts (isSyncable: false, e.g., lost banking connection)
   * - Hidden accounts (status: HIDDEN)
   *
   * Checks deletion eligibility before showing confirmation
   */
  const handleDelete = async (accountId: string) => {
    const account = allAccounts.find((acc) => acc.id === accountId);
    // Allow deletion for:
    // 1. Manual accounts (source: MANUAL)
    // 2. Orphaned linked accounts (source: SALTEDGE/PLAID but isSyncable: false)
    // 3. Hidden accounts (already soft-deleted, can be permanently deleted)
    // These are accounts that have lost their banking connection and can't sync
    const isHiddenAccount = account?.status === AccountStatus.HIDDEN;
    const canDelete = account && (account.isManualAccount || !account.isSyncable || isHiddenAccount);

    if (account && canDelete) {
      setAccountToDelete(account);
      setDeletionEligibility(undefined);
      setIsCheckingEligibility(true);

      try {
        const eligibility = await accountsClient.checkDeletionEligibility(accountId);
        setDeletionEligibility(eligibility);
      } catch (err) {
        console.error('Failed to check deletion eligibility:', err);
        // Default to allowing deletion if check fails
        setDeletionEligibility({
          canDelete: true,
          canHide: true,
          currentStatus: AccountStatus.ACTIVE,
          blockers: [],
          linkedTransferCount: 0,
        });
      } finally {
        setIsCheckingEligibility(false);
      }
    }
  };

  /**
   * Confirm delete manual account
   */
  const handleConfirmDelete = async (_transactionHandling: 'delete' | 'unassign') => {
    if (!accountToDelete) return;

    try {
      setIsDeletingAccount(true);
      setLocalError(null);
      // TODO: Pass _transactionHandling option to backend when implemented
      await accountsClient.deleteAccount(accountToDelete.id);
      setAccountToDelete(null);
      await fetchAllAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to delete account. Please try again.';
      setLocalError(errorMessage);
      setAccountToDelete(null);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  /**
   * Cancel delete account
   */
  const handleCancelDelete = () => {
    setAccountToDelete(null);
    setDeletionEligibility(undefined);
  };

  /**
   * Handle hide account (soft delete)
   */
  const handleHideAccount = async () => {
    if (!accountToDelete) return;

    try {
      setIsHidingAccount(true);
      setLocalError(null);
      await accountsClient.hideAccount(accountToDelete.id);
      setAccountToDelete(null);
      setDeletionEligibility(undefined);
      await fetchAllAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to hide account. Please try again.';
      setLocalError(errorMessage);
    } finally {
      setIsHidingAccount(false);
    }
  };

  /**
   * Handle restore hidden account
   * For banking accounts with revoked connections, shows a re-link prompt
   */
  const handleRestoreAccount = async (accountId: string) => {
    try {
      setIsRestoringAccount(true);
      setLocalError(null);
      await accountsClient.restoreAccount(accountId);
      await fetchAllAccounts();
    } catch (err) {
      // Check if this is a re-link required error (banking connection revoked)
      if (err instanceof RelinkRequiredError) {
        setRelinkPrompt({
          accountId,
          message: err.message,
          siblingAccountCount: err.siblingAccountCount,
          providerName: err.providerName,
          suggestion: err.suggestion,
        });
      } else {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to restore account. Please try again.';
        setLocalError(errorMessage);
      }
    } finally {
      setIsRestoringAccount(false);
    }
  };

  /**
   * Handle re-link bank action from the prompt
   * Opens the OAuth flow in a popup modal instead of redirecting
   */
  const handleRelinkBank = async () => {
    try {
      setLocalError(null);
      // Get the initiateLinking function from the store
      const { initiateLinking } = useBankingStore.getState();

      // Start the OAuth flow - get the redirect URL
      const { redirectUrl, connectionId } = await initiateLinking();

      // Close the re-link prompt and show the OAuth popup modal
      setRelinkPrompt(null);
      setOAuthPopup({
        redirectUrl,
        connectionId,
        title: 'Re-link Bank Account',
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to initiate re-linking. Please try again.';
      setLocalError(errorMessage);
      setRelinkPrompt(null);
    }
  };

  /**
   * Handle OAuth popup success - refresh accounts
   */
  const handleOAuthSuccess = async () => {
    setOAuthPopup(null);
    try {
      await fetchAllAccounts();
      await fetchBankingAccounts();
    } catch (err) {
      console.error('Failed to refresh accounts after OAuth:', err);
      setLocalError('Accounts linked successfully. Please refresh the page to see them.');
    }
  };

  /**
   * Handle OAuth popup cancel
   */
  const handleOAuthCancel = () => {
    setOAuthPopup(null);
  };

  /**
   * Dismiss error message
   */
  const handleDismissError = () => {
    setLocalError(null);
    clearError();
  };

  // Compute effective error (local or store error)
  const effectiveError = localError || bankingError;

  // Compute loading state
  const isLoading = isLoadingAccounts || isBankingLoading;

  // Separate active and hidden accounts
  const activeAccounts = allAccounts.filter((acc) => acc.status !== AccountStatus.HIDDEN);
  const hiddenAccounts = allAccounts.filter((acc) => acc.status === AccountStatus.HIDDEN);
  const hasHiddenAccounts = hiddenAccounts.length > 0;

  // Convert Account[] to BankingAccount[] format for AccountList
  // The AccountList component expects BankingAccount format
  const convertToBankingAccount = (acc: Account) => ({
    id: acc.id,
    name: acc.name,
    balance: acc.currentBalance,
    currency: acc.currency,
    bankName: acc.institutionName || (acc.isManualAccount ? 'Manual' : 'Unknown'),
    iban: acc.maskedAccountNumber || '',
    syncStatus: acc.needsSync ? BankingSyncStatus.PENDING : (acc.syncError ? BankingSyncStatus.ERROR : BankingSyncStatus.SYNCED),
    connectionStatus: acc.isActive ? BankingConnectionStatus.AUTHORIZED : BankingConnectionStatus.REVOKED,
    lastSyncedAt: acc.lastSyncAt ? new Date(acc.lastSyncAt) : undefined,
    linkedAt: new Date(acc.createdAt),
    accountNumber: acc.maskedAccountNumber,
    accountType: acc.type.toLowerCase(),
    // Additional metadata for UI
    isManualAccount: acc.isManualAccount,
    isSyncable: acc.isSyncable,
    source: acc.source,
    status: acc.status,
    // Display customization from settings
    icon: acc.settings?.icon,
    color: acc.settings?.color,
  });

  const accountsForList = activeAccounts.map(convertToBankingAccount) as unknown as BankingAccount[];
  const _hiddenAccountsForList = hiddenAccounts.map(convertToBankingAccount) as unknown as BankingAccount[];

  return (
    <ErrorBoundary>
      <div className="space-y-6" data-testid="accounts-container">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wallet className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
              <p className="text-sm text-gray-500">
                Manage your bank accounts and financial connections
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshAccounts}
              disabled={isLoading || isRefreshing || isLinking}
              aria-label="Refresh accounts"
              aria-busy={isRefreshing}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium
                transition-colors duration-200 border border-gray-300
                text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {/* Unified Add Account Dropdown */}
            <AddAccountDropdown
              onManualAccount={handleManualAccountClick}
              onLinkBank={handleLinkBankClick}
              disabled={isLoading || isCreatingAccount}
              isLinking={isLinking}
            />

            {/* Hidden BankingLinkButton for OAuth flow */}
            <div className="hidden">
              <BankingLinkButton
                onSuccess={handleLinkSuccess}
                onError={handleLinkError}
                ariaLabel="Connect a new bank account"
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {effectiveError && (
          <ErrorAlert
            title="Error"
            message={effectiveError}
            onDismiss={handleDismissError}
          />
        )}

        {/* Account Statistics */}
        {!isLoading && allAccounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 font-medium">Total Accounts</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {activeAccounts.length}
              </p>
              {hasHiddenAccounts && (
                <p className="text-xs text-gray-400 mt-1">
                  {hiddenAccounts.length} hidden
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 font-medium">Total Balance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: activeAccounts[0]?.currency || 'USD',
                  minimumFractionDigits: 2,
                }).format(
                  activeAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0)
                )}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 font-medium">Manual Accounts</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {activeAccounts.filter((acc) => acc.isManualAccount).length}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 font-medium">Linked Accounts</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {activeAccounts.filter((acc) => !acc.isManualAccount).length}
              </p>
            </div>
          </div>
        )}

        {/* Account List */}
        {(isLoading || activeAccounts.length > 0) && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                All Accounts
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage your manual and linked bank accounts
              </p>
            </div>
            <div className="p-4">
              <AccountList
                accounts={accountsForList}
                isLoading={isLoading}
                onSync={handleSync}
                onRevoke={handleRevoke}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
              />
            </div>
          </div>
        )}

        {/* Hidden Accounts Section */}
        {hasHiddenAccounts && (
          <div className="space-y-3">
            <button
              onClick={() => setShowHiddenAccounts(!showHiddenAccounts)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                text-sm font-medium text-gray-600
                hover:bg-gray-100 active:bg-gray-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
                transition-colors"
              aria-expanded={showHiddenAccounts}
            >
              {showHiddenAccounts ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
              {showHiddenAccounts ? 'Hide hidden accounts' : `Show hidden accounts (${hiddenAccounts.length})`}
            </button>

            {showHiddenAccounts && (
              <div className="bg-gray-50 rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-700">
                    Hidden Accounts
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    These accounts are hidden but their data is preserved
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  {hiddenAccounts.map((account) => (
                    <div
                      key={account.id}
                      data-account-id={account.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{account.name}</p>
                        <p className="text-sm text-gray-500">
                          {account.institutionName || 'Manual Account'}
                        </p>
                        <p className="text-sm font-medium text-gray-700 mt-1">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: account.currency || 'USD',
                          }).format(account.currentBalance)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestoreAccount(account.id)}
                          disabled={isRestoringAccount || isDeletingAccount}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg
                            text-sm font-medium text-blue-600
                            bg-blue-50 hover:bg-blue-100 active:bg-blue-200
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-colors"
                          aria-label={`Restore ${account.name}`}
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Restore
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
                          disabled={isRestoringAccount || isDeletingAccount}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg
                            text-sm font-medium text-red-600
                            bg-red-50 hover:bg-red-100 active:bg-red-200
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-colors"
                          aria-label={`Delete ${account.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && allAccounts.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              No accounts yet
            </h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Add a manual account to track cash or custom balances, or connect your bank accounts for automatic tracking.
            </p>
            <AddAccountDropdown
              onManualAccount={handleManualAccountClick}
              onLinkBank={handleLinkBankClick}
              disabled={isCreatingAccount}
              isLinking={isLinking}
            />
          </div>
        )}

        {/* Manual Account Form Modal */}
        {showManualForm && (
          <ManualAccountForm
            onSubmit={handleCreateManualAccount}
            onCancel={handleCancelManualAccount}
            isSubmitting={isCreatingAccount}
            error={formError}
            isModal
          />
        )}

        {/* Revoke Confirmation Modal (for linked accounts) */}
        {accountToRevoke && (
          <RevokeConfirmation
            account={accountToRevoke}
            onConfirm={handleConfirmRevoke}
            onCancel={handleCancelRevoke}
            siblingAccountCount={revokeSiblingCount}
          />
        )}

        {/* Edit Account Modal (for all accounts) */}
        {accountToEdit && (
          <EditAccountForm
            account={accountToEdit}
            onSubmit={handleUpdateAccount}
            onCancel={handleCancelEdit}
            isSubmitting={isUpdatingAccount}
            error={editError}
            isModal
            displaySettingsOnly={!accountToEdit.isManualAccount}
          />
        )}

        {/* Delete Account Confirmation (for manual accounts) */}
        {accountToDelete && (
          <DeleteAccountConfirmation
            account={accountToDelete}
            onConfirm={async (options) => {
              const transactionHandling = options.deleteTransactions ? 'delete' : 'unassign';
              await handleConfirmDelete(transactionHandling);
            }}
            onCancel={handleCancelDelete}
            isDeleting={isDeletingAccount}
            eligibility={deletionEligibility}
            isCheckingEligibility={isCheckingEligibility}
            onHide={handleHideAccount}
            isHiding={isHidingAccount}
          />
        )}

        {/* Re-link Bank Prompt (for banking accounts with revoked connections) */}
        {relinkPrompt && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="relink-modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              {/* Backdrop with blur effect */}
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                aria-hidden="true"
                onClick={() => setRelinkPrompt(null)}
              />

              {/* Modal Content */}
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertCircle className="h-6 w-6 text-amber-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <h3
                        className="text-base font-semibold leading-6 text-gray-900"
                        id="relink-modal-title"
                      >
                        Re-linking Required
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          {relinkPrompt.message}
                        </p>
                        {relinkPrompt.siblingAccountCount > 1 && (
                          <p className="mt-2 text-sm text-gray-500">
                            This will restore <span className="font-medium">{relinkPrompt.siblingAccountCount} accounts</span>
                            {relinkPrompt.providerName && (
                              <> from <span className="font-medium">{relinkPrompt.providerName}</span></>
                            )}.
                          </p>
                        )}
                        {relinkPrompt.suggestion && (
                          <p className="mt-3 text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
                            {relinkPrompt.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                    onClick={handleRelinkBank}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                    Re-link Bank
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={() => setRelinkPrompt(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OAuth Popup Modal - for re-linking with blurred background */}
        {oauthPopup && (
          <OAuthPopupModal
            redirectUrl={oauthPopup.redirectUrl}
            connectionId={oauthPopup.connectionId}
            title={oauthPopup.title}
            onSuccess={handleOAuthSuccess}
            onCancel={handleOAuthCancel}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
