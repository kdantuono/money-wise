/**
 * Banking Store Usage Examples
 *
 * Demonstrates how to use the banking store in React components.
 * These examples show real-world usage patterns for common scenarios.
 *
 * @module store/banking.store.example
 */

import React, { useEffect, useState } from 'react';
import {
  useBanking,
  useAccounts,
  useBankingError,
  useSyncStatus,
  useSyncError,
  useBankingLoading,
} from './banking.store';

// =============================================================================
// Example 1: Account List Component
// =============================================================================

/**
 * Displays all linked banking accounts with sync status
 */
export function AccountListExample() {
  const accounts = useAccounts();
  const { fetchAccounts, syncAccount } = useBanking();
  const error = useBankingError();

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts().catch(console.error);
  }, [fetchAccounts]);

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (accounts.length === 0) {
    return <div className="empty">No accounts linked</div>;
  }

  return (
    <div className="account-list">
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onSync={() => syncAccount(account.id)}
        />
      ))}
    </div>
  );
}

/**
 * Single account card with sync button
 */
function AccountCard({ account, onSync }: any) {
  const isSyncing = useSyncStatus(account.id);
  const syncError = useSyncError(account.id);

  return (
    <div className="account-card">
      <h3>{account.name}</h3>
      <p>
        {account.balance} {account.currency}
      </p>
      <p>Status: {account.syncStatus}</p>
      {account.lastSynced && (
        <p>Last synced: {new Date(account.lastSynced).toLocaleString()}</p>
      )}

      <button onClick={onSync} disabled={isSyncing}>
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {syncError && <div className="error">{syncError}</div>}
    </div>
  );
}

// =============================================================================
// Example 2: Bank Linking Flow
// =============================================================================

/**
 * Complete bank linking flow component
 */
export function BankLinkingFlowExample() {
  const { initiateLinking, completeLinking, clearError } = useBanking();
  const { isLinking } = useBankingLoading();
  const error = useBankingError();
  const [connectionId, setConnectionId] = useState<string | null>(null);

  // Step 1: Initiate linking
  const handleInitiateLink = async () => {
    try {
      clearError();
      const { redirectUrl, connectionId } = await initiateLinking('SALTEDGE');

      // Store connection ID for later
      sessionStorage.setItem('banking_connection_id', connectionId);
      setConnectionId(connectionId);

      // Redirect to bank authorization
      window.location.href = redirectUrl;
    } catch (err) {
      console.error('Failed to initiate linking:', err);
    }
  };

  // Step 2: Complete linking (after OAuth redirect)
  useEffect(() => {
    // Check if we're returning from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const isCallback = urlParams.has('connection_id') || urlParams.has('success');

    if (isCallback) {
      const storedConnectionId = sessionStorage.getItem('banking_connection_id');
      if (storedConnectionId) {
        completeLinking(storedConnectionId)
          .then(() => {
            // Success! Accounts are now linked
            sessionStorage.removeItem('banking_connection_id');
            console.log('Bank accounts linked successfully');
          })
          .catch((err) => {
            console.error('Failed to complete linking:', err);
          });
      }
    }
  }, [completeLinking]);

  return (
    <div className="bank-linking">
      <h2>Link Your Bank Account</h2>

      <button onClick={handleInitiateLink} disabled={isLinking}>
        {isLinking ? 'Connecting...' : 'Link Bank Account'}
      </button>

      {error && (
        <div className="error">
          {error}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      {connectionId && (
        <div className="info">
          Redirecting to bank authorization...
          <p className="text-sm">Connection ID: {connectionId}</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Example 3: Dashboard Summary
// =============================================================================

/**
 * Dashboard summary showing total balance across all accounts
 */
export function DashboardSummaryExample() {
  const accounts = useAccounts();
  const { isLoading } = useBankingLoading();
  const { fetchAccounts } = useBanking();

  // Fetch accounts periodically
  useEffect(() => {
    fetchAccounts();

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchAccounts().catch(console.error);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchAccounts]);

  // Calculate total balance by currency
  const balances = accounts.reduce((acc, account) => {
    if (account.syncStatus === 'DISCONNECTED') return acc;

    if (!acc[account.currency]) {
      acc[account.currency] = 0;
    }
    acc[account.currency] += account.balance;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading && accounts.length === 0) {
    return <div>Loading banking data...</div>;
  }

  return (
    <div className="dashboard-summary">
      <h2>Total Balance</h2>
      {Object.entries(balances).map(([currency, total]) => (
        <div key={currency} className="balance-item">
          <span className="amount">
            {total.toFixed(2)} {currency}
          </span>
          <span className="accounts">
            {accounts.filter((a) => a.currency === currency).length} accounts
          </span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Example 4: Sync All Accounts
// =============================================================================

/**
 * Sync all accounts button with progress tracking
 */
export function SyncAllAccountsExample() {
  const accounts = useAccounts();
  const { syncAccount } = useBanking();
  const [syncingCount, setSyncingCount] = useState(0);

  const handleSyncAll = async () => {
    const activeAccounts = accounts.filter(
      (acc) => acc.syncStatus !== 'DISCONNECTED'
    );

    setSyncingCount(activeAccounts.length);

    // Sync all accounts in parallel (with rate limiting if needed)
    const results = await Promise.allSettled(
      activeAccounts.map((account) => syncAccount(account.id))
    );

    setSyncingCount(0);

    // Count successes and failures
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`Sync complete: ${succeeded} succeeded, ${failed} failed`);
  };

  const isSyncing = syncingCount > 0;

  return (
    <div className="sync-all">
      <button onClick={handleSyncAll} disabled={isSyncing}>
        {isSyncing ? `Syncing ${syncingCount} accounts...` : 'Sync All Accounts'}
      </button>
    </div>
  );
}

// =============================================================================
// Example 5: Account Revocation
// =============================================================================

/**
 * Revoke banking connection with confirmation
 */
export function RevokeConnectionExample({ connectionId }: { connectionId: string }) {
  const { revokeConnection, clearError } = useBanking();
  const { isLoading } = useBankingLoading();
  const error = useBankingError();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRevoke = async () => {
    try {
      clearError();
      await revokeConnection(connectionId);
      setShowConfirm(false);
      console.log('Connection revoked successfully');
    } catch (err) {
      console.error('Failed to revoke connection:', err);
    }
  };

  return (
    <div className="revoke-connection">
      <button onClick={() => setShowConfirm(true)} className="danger">
        Disconnect Bank
      </button>

      {showConfirm && (
        <div className="confirmation-dialog">
          <h3>Disconnect Bank Account?</h3>
          <p>
            This will remove all linked accounts from this bank. You will need to
            re-authorize to link them again.
          </p>

          <div className="actions">
            <button onClick={handleRevoke} disabled={isLoading} className="danger">
              {isLoading ? 'Disconnecting...' : 'Yes, Disconnect'}
            </button>
            <button onClick={() => setShowConfirm(false)}>Cancel</button>
          </div>

          {error && <div className="error">{error}</div>}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Example 6: Error Handling Pattern
// =============================================================================

/**
 * Demonstrates comprehensive error handling
 */
export function ErrorHandlingExample() {
  const { fetchAccounts, clearError } = useBanking();
  const error = useBankingError();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchAccounts().catch((err) => {
      console.error('Failed to fetch accounts:', err);

      // Auto-retry on network errors (up to 3 times)
      if (retryCount < 3 && err.message.includes('Network')) {
        setTimeout(() => {
          setRetryCount((c) => c + 1);
          fetchAccounts();
        }, 2000 * (retryCount + 1)); // Exponential backoff
      }
    });
  }, [fetchAccounts, retryCount]);

  if (!error) return null;

  return (
    <div className="error-toast">
      <strong>Error</strong>
      <p>{error}</p>
      <button onClick={clearError}>Dismiss</button>
      <button onClick={() => fetchAccounts()}>Retry</button>
    </div>
  );
}

// =============================================================================
// Example 7: Optimistic Updates
// =============================================================================

/**
 * Demonstrates optimistic UI updates during sync
 */
export function OptimisticSyncExample({ accountId }: { accountId: string }) {
  const { syncAccount, updateAccount } = useBanking();
  const isSyncing = useSyncStatus(accountId);

  const handleOptimisticSync = async () => {
    // Optimistically update UI
    updateAccount(accountId, { syncStatus: 'SYNCING' });

    try {
      await syncAccount(accountId);
      // Success - state updated by syncAccount
    } catch (err) {
      // Revert on error
      updateAccount(accountId, { syncStatus: 'ERROR' });
      console.error('Sync failed:', err);
    }
  };

  return (
    <button onClick={handleOptimisticSync} disabled={isSyncing}>
      {isSyncing ? 'Syncing...' : 'Sync'}
    </button>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default {
  AccountListExample,
  BankLinkingFlowExample,
  DashboardSummaryExample,
  SyncAllAccountsExample,
  RevokeConnectionExample,
  ErrorHandlingExample,
  OptimisticSyncExample,
};
