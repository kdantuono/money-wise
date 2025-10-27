/**
 * Banking API Client - Usage Examples
 *
 * This file demonstrates common usage patterns for the banking client.
 * These examples can be used as reference when implementing banking features.
 *
 * @module services/banking.client.example
 */

/* eslint-disable no-console */
/* eslint-disable security/detect-object-injection */

import bankingClient, {
  SyncResponse,
  BankingApiError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
} from './banking.client';

// =============================================================================
// Example 1: Complete Banking Link Flow
// =============================================================================

/**
 * Complete flow: Initiate OAuth → Redirect → Complete Link
 *
 * This demonstrates the full user flow for linking a bank account.
 */
export async function exampleCompleteLinkFlow() {
  try {
    // Step 1: User clicks "Link Bank Account" button
    console.log('Step 1: Initiating banking link...');

    const { redirectUrl, connectionId } =
      await bankingClient.initiateLink('SALTEDGE');

    // Store connectionId for later (after OAuth redirect)
    sessionStorage.setItem('banking_connection_id', connectionId);

    console.log('Redirecting to bank authorization...');
    // Redirect user to OAuth page
    window.location.href = redirectUrl;

    // Step 2: User authorizes at bank and is redirected back to app
    // (This happens in a separate page load)

    // Step 3: After redirect, complete the link
    // (This would be in a callback/redirect handler component)
    const savedConnectionId = sessionStorage.getItem('banking_connection_id');

    if (!savedConnectionId) {
      throw new Error('Connection ID not found in session');
    }

    console.log('Step 3: Completing banking link...');
    const { accounts } = await bankingClient.completeLink(savedConnectionId);

    console.log(`Successfully linked ${accounts.length} accounts`);
    accounts.forEach(account => {
      console.log(`- ${account.name}: ${account.balance} ${account.currency}`);
    });

    // Clean up session storage
    sessionStorage.removeItem('banking_connection_id');

    return accounts;
  } catch (error) {
    handleBankingError(error);
  }
}

// =============================================================================
// Example 2: Display Linked Accounts
// =============================================================================

/**
 * Fetch and display all linked accounts
 *
 * This is commonly used in dashboard or account list views.
 */
export async function exampleDisplayAccounts() {
  try {
    console.log('Fetching linked accounts...');

    const { accounts } = await bankingClient.getAccounts();

    if (accounts.length === 0) {
      console.log('No accounts linked yet');
      return [];
    }

    console.log(`Found ${accounts.length} linked accounts:`);

    accounts.forEach(account => {
      console.log(`
Account: ${account.name}
Bank: ${account.bankName || 'Unknown'}
Balance: ${account.balance} ${account.currency}
Status: ${account.syncStatus}
Last Synced: ${account.lastSynced ? new Date(account.lastSynced).toLocaleString() : 'Never'}
      `);
    });

    return accounts;
  } catch (error) {
    handleBankingError(error);
    return [];
  }
}

// =============================================================================
// Example 3: Sync Account with Progress Tracking
// =============================================================================

/**
 * Sync a banking account and show progress
 *
 * This demonstrates handling the sync operation with user feedback.
 */
export async function exampleSyncAccount(accountId: string) {
  try {
    console.log(`Syncing account ${accountId}...`);

    // Show loading state to user
    const startTime = Date.now();

    const result: SyncResponse = await bankingClient.syncAccount(accountId);

    const duration = Date.now() - startTime;

    if (result.status === 'SYNCED') {
      console.log(`✓ Sync completed in ${duration}ms`);
      console.log(`- Transactions synced: ${result.transactionsSynced}`);
      console.log(`- Balance updated: ${result.balanceUpdated ? 'Yes' : 'No'}`);
      return { success: true, result };
    } else if (result.status === 'PENDING') {
      console.log('Sync is pending... Please check back later');
      return { success: false, result };
    } else if (result.status === 'ERROR') {
      console.error(`Sync failed: ${result.error}`);
      return { success: false, result };
    }
  } catch (error) {
    handleBankingError(error);
    return { success: false, result: null };
  }
}

// =============================================================================
// Example 4: Revoke Connection with Confirmation
// =============================================================================

/**
 * Revoke a banking connection after user confirmation
 *
 * This shows proper user confirmation flow before destructive actions.
 */
export async function exampleRevokeConnection(
  connectionId: string,
  bankName: string
) {
  // Ask for user confirmation
  const confirmed = confirm(
    `Are you sure you want to disconnect ${bankName}?\n\n` +
      'This will remove all linked accounts and stop automatic synchronization.'
  );

  if (!confirmed) {
    console.log('Revoke cancelled by user');
    return false;
  }

  try {
    console.log(`Revoking connection ${connectionId}...`);

    await bankingClient.revokeConnection(connectionId);

    console.log('✓ Connection revoked successfully');
    return true;
  } catch (error) {
    handleBankingError(error);
    return false;
  }
}

// =============================================================================
// Example 5: Check Available Providers
// =============================================================================

/**
 * Check which banking providers are available
 *
 * This is useful for displaying provider selection UI.
 */
export async function exampleCheckProviders() {
  try {
    console.log('Checking available banking providers...');

    const { providers, enabled } = await bankingClient.getProviders();

    if (!enabled) {
      console.log('⚠ Banking integration is currently disabled');
      return { providers: [], enabled };
    }

    console.log(`Available providers: ${providers.join(', ')}`);

    return { providers, enabled };
  } catch (error) {
    handleBankingError(error);
    return { providers: [], enabled: false };
  }
}

// =============================================================================
// Example 6: React Hook Usage Pattern
// =============================================================================

/**
 * Example React hook for managing banking accounts
 *
 * This demonstrates how to integrate the client with React.
 */
export function useBankingAccountsExample() {
  // In a real React component, you would use:
  // const [accounts, setAccounts] = useState<BankingAccount[]>([]);
  // const [loading, setLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    // setLoading(true);
    // setError(null);

    try {
      const { accounts } = await bankingClient.getAccounts();
      // setAccounts(accounts);
      return accounts;
    } catch (error) {
      const errorMessage =
        error instanceof BankingApiError
          ? error.message
          : 'Failed to load accounts';
      // setError(errorMessage);
      console.error(errorMessage);
      return [];
    } finally {
      // setLoading(false);
    }
  };

  const syncAccount = async (accountId: string) => {
    try {
      const result = await bankingClient.syncAccount(accountId);

      if (result.status === 'SYNCED') {
        // Reload accounts to get updated data
        await loadAccounts();
        return result;
      }

      throw new Error(result.error || 'Sync failed');
    } catch (error) {
      const errorMessage =
        error instanceof BankingApiError
          ? error.message
          : 'Failed to sync account';
      console.error(errorMessage);
      throw error;
    }
  };

  return {
    loadAccounts,
    syncAccount,
    // In real hook: accounts, loading, error
  };
}

// =============================================================================
// Example 7: Comprehensive Error Handling
// =============================================================================

/**
 * Centralized error handler for banking operations
 *
 * This demonstrates proper error handling with user-friendly messages.
 */
export function handleBankingError(error: unknown): void {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
    // Redirect to login page
    alert('Your session has expired. Please log in again.');
    // window.location.href = '/login';
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
    alert(`Invalid request: ${error.message}`);
  } else if (error instanceof NotFoundError) {
    console.error('Resource not found:', error.message);
    alert('The requested account or connection was not found.');
  } else if (error instanceof BankingApiError) {
    console.error(`Banking API error (${error.statusCode}):`, error.message);
    alert(`An error occurred: ${error.message}`);
  } else if (error instanceof Error) {
    console.error('Unexpected error:', error.message);
    alert('An unexpected error occurred. Please try again.');
  } else {
    console.error('Unknown error:', error);
    alert('An unknown error occurred. Please try again.');
  }
}

// =============================================================================
// Example 8: Batch Operations
// =============================================================================

/**
 * Sync multiple accounts in parallel
 *
 * This demonstrates handling multiple concurrent operations.
 */
export async function exampleBatchSync(accountIds: string[]) {
  console.log(`Syncing ${accountIds.length} accounts in parallel...`);

  const results = await Promise.allSettled(
    accountIds.map(id => bankingClient.syncAccount(id))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`Sync completed: ${successful} successful, ${failed} failed`);

  results.forEach((result, index) => {
    const accountId = accountIds[index];

    if (result.status === 'fulfilled') {
      const syncResult = result.value;
      console.log(
        `✓ ${accountId}: ${syncResult.transactionsSynced} transactions synced`
      );
    } else {
      console.error(`✗ ${accountId}: ${result.reason}`);
    }
  });

  return results;
}

// =============================================================================
// Example 9: Filtering and Sorting Accounts
// =============================================================================

/**
 * Get accounts with filtering and sorting
 *
 * This demonstrates client-side data manipulation.
 */
export async function exampleFilteredAccounts() {
  try {
    const { accounts } = await bankingClient.getAccounts();

    // Filter: Only synced accounts
    const syncedAccounts = accounts.filter(acc => acc.syncStatus === 'SYNCED');

    // Filter: Only EUR accounts
    const eurAccounts = accounts.filter(acc => acc.currency === 'EUR');

    // Sort: By balance (descending)
    const sortedByBalance = [...accounts].sort((a, b) => b.balance - a.balance);

    // Sort: By last synced (most recent first)
    const sortedBySync = [...accounts].sort((a, b) => {
      if (!a.lastSynced) return 1;
      if (!b.lastSynced) return -1;
      return (
        new Date(b.lastSynced).getTime() - new Date(a.lastSynced).getTime()
      );
    });

    return {
      all: accounts,
      synced: syncedAccounts,
      eur: eurAccounts,
      byBalance: sortedByBalance,
      bySync: sortedBySync,
    };
  } catch (error) {
    handleBankingError(error);
    return null;
  }
}

// =============================================================================
// Example 10: Periodic Sync with Retry Logic
// =============================================================================

/**
 * Sync account with retry logic and exponential backoff
 *
 * This demonstrates resilient sync operations.
 */
export async function exampleSyncWithRetry(
  accountId: string,
  maxRetries: number = 3,
  initialDelay: number = 1000
) {
  let attempt = 0;
  let delay = initialDelay;

  while (attempt < maxRetries) {
    try {
      console.log(`Sync attempt ${attempt + 1}/${maxRetries}...`);

      const result = await bankingClient.syncAccount(accountId);

      if (result.status === 'SYNCED') {
        console.log(`✓ Sync succeeded on attempt ${attempt + 1}`);
        return result;
      }

      if (result.status === 'ERROR') {
        throw new Error(result.error || 'Sync failed');
      }

      // If pending, wait and retry
      if (result.status === 'PENDING') {
        console.log('Sync pending, retrying...');
      }
    } catch (error) {
      attempt++;

      if (attempt >= maxRetries) {
        console.error(`✗ Sync failed after ${maxRetries} attempts`);
        throw error;
      }

      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff
      delay *= 2;
    }
  }

  throw new Error('Max retries exceeded');
}
