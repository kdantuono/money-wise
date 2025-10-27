# Banking Store Documentation

Complete guide to the banking state management store for MoneyWise web application.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Store Structure](#store-structure)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Overview

The banking store is built with Zustand and provides a single source of truth for all banking-related state in the MoneyWise application. It handles:

- **Account Management**: Store and manage linked banking accounts
- **Linking Flow**: OAuth flow for connecting banks
- **Synchronization**: Per-account sync tracking with status
- **Error Handling**: Comprehensive error state management
- **Persistence**: Automatic localStorage persistence
- **Type Safety**: Full TypeScript support with strict typing

### Key Features

✅ **Immer Middleware**: Immutable state updates with mutable-style code
✅ **Persist Middleware**: Automatic localStorage synchronization
✅ **Per-Account Tracking**: Individual sync status and errors per account
✅ **Loading States**: Granular loading indicators for better UX
✅ **Error Recovery**: Clear error states with easy recovery methods
✅ **Convenience Hooks**: Optimized hooks for common use cases

## Installation

The store is already set up with all required dependencies:

```bash
pnpm add zustand immer  # Already installed
```

## Store Structure

### State Shape

```typescript
interface BankingState {
  // Account Data
  accounts: BankingAccount[];
  linkedConnections: number;

  // Loading States
  isLoading: boolean;        // General loading (fetch accounts)
  isLinking: boolean;        // Linking flow in progress
  isSyncing: Record<string, boolean>; // Per-account sync status

  // Error States
  error: string | null;      // General error
  linkError: string | null;  // Linking flow error
  syncErrors: Record<string, string>; // Per-account errors

  // Actions (see API Reference below)
}
```

### BankingAccount Type

```typescript
interface BankingAccount {
  id: string;                 // UUID
  name: string;               // Display name
  balance: number;            // Current balance
  currency: string;           // ISO 4217 code (EUR, USD)
  bankName?: string;          // Institution name
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'ERROR' | 'DISCONNECTED';
  lastSynced?: string | null; // ISO 8601 timestamp
  linkedAt: string;           // ISO 8601 timestamp
  accountNumber?: string | null;     // Usually IBAN
  accountType?: string | null;       // CHECKING, SAVINGS, etc.
  bankCountry?: string | null;       // ISO 3166-1 alpha-2
  accountHolderName?: string | null; // Account holder
}
```

## Usage Examples

### 1. Basic Account List

```typescript
import { useAccounts, useBanking } from '@/store/banking.store';

function AccountList() {
  const accounts = useAccounts();
  const { fetchAccounts } = useBanking();

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <div>
      {accounts.map(account => (
        <div key={account.id}>
          <h3>{account.name}</h3>
          <p>{account.balance} {account.currency}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2. Bank Linking Flow

```typescript
import { useBanking } from '@/store/banking.store';

function LinkBankButton() {
  const { initiateLinking, isLinking } = useBanking();

  const handleLink = async () => {
    try {
      const { redirectUrl, connectionId } = await initiateLinking('SALTEDGE');

      // Store for later use
      sessionStorage.setItem('banking_connection_id', connectionId);

      // Redirect to bank authorization
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Linking failed:', error);
    }
  };

  return (
    <button onClick={handleLink} disabled={isLinking}>
      {isLinking ? 'Connecting...' : 'Link Bank'}
    </button>
  );
}
```

### 3. Complete Linking (OAuth Callback)

```typescript
import { useBanking } from '@/store/banking.store';

function OAuthCallback() {
  const { completeLinking } = useBanking();

  useEffect(() => {
    const connectionId = sessionStorage.getItem('banking_connection_id');
    if (connectionId) {
      completeLinking(connectionId)
        .then(() => {
          sessionStorage.removeItem('banking_connection_id');
          // Redirect to dashboard
          router.push('/dashboard');
        })
        .catch(console.error);
    }
  }, []);

  return <div>Completing bank connection...</div>;
}
```

### 4. Sync Single Account

```typescript
import { useBanking, useSyncStatus, useSyncError } from '@/store/banking.store';

function SyncButton({ accountId }: { accountId: string }) {
  const { syncAccount } = useBanking();
  const isSyncing = useSyncStatus(accountId);
  const syncError = useSyncError(accountId);

  return (
    <div>
      <button
        onClick={() => syncAccount(accountId)}
        disabled={isSyncing}
      >
        {isSyncing ? 'Syncing...' : 'Sync'}
      </button>
      {syncError && <p className="error">{syncError}</p>}
    </div>
  );
}
```

### 5. Dashboard Summary

```typescript
import { useAccounts } from '@/store/banking.store';

function DashboardSummary() {
  const accounts = useAccounts();

  // Calculate total by currency
  const totals = accounts.reduce((acc, account) => {
    if (!acc[account.currency]) acc[account.currency] = 0;
    acc[account.currency] += account.balance;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {Object.entries(totals).map(([currency, total]) => (
        <div key={currency}>
          {total.toFixed(2)} {currency}
        </div>
      ))}
    </div>
  );
}
```

### 6. Error Handling

```typescript
import { useBankingError, useBanking } from '@/store/banking.store';

function ErrorDisplay() {
  const error = useBankingError();
  const { clearError } = useBanking();

  if (!error) return null;

  return (
    <div className="error-banner">
      <p>{error}</p>
      <button onClick={clearError}>Dismiss</button>
    </div>
  );
}
```

## API Reference

### Store Actions

#### Account Management

##### `setAccounts(accounts: BankingAccount[])`
Replace all accounts in the store.

```typescript
const { setAccounts } = useBanking();
setAccounts([account1, account2]);
```

##### `addAccount(account: BankingAccount)`
Add or update a single account.

```typescript
const { addAccount } = useBanking();
addAccount(newAccount);
```

##### `removeAccount(accountId: string)`
Remove an account from the store.

```typescript
const { removeAccount } = useBanking();
removeAccount('acc-123');
```

##### `updateAccount(accountId: string, updates: Partial<BankingAccount>)`
Update specific fields of an account.

```typescript
const { updateAccount } = useBanking();
updateAccount('acc-123', { balance: 1500 });
```

#### Linking Flow

##### `initiateLinking(provider?: string): Promise<{ redirectUrl, connectionId }>`
Start OAuth flow with banking provider.

**Parameters:**
- `provider` (optional): Provider name (SALTEDGE, TINK, etc.)

**Returns:** Promise with redirect URL and connection ID

**Throws:** `BankingApiError` on failure

```typescript
const { redirectUrl, connectionId } = await initiateLinking('SALTEDGE');
```

##### `completeLinking(connectionId: string): Promise<void>`
Complete OAuth flow and fetch linked accounts.

**Parameters:**
- `connectionId`: Connection ID from initiate-linking

**Throws:** `BankingApiError` on failure

```typescript
await completeLinking('conn-123');
```

##### `fetchAccounts(): Promise<void>`
Fetch all linked accounts from API.

**Throws:** `BankingApiError` on failure

```typescript
await fetchAccounts();
```

#### Syncing

##### `syncAccount(accountId: string): Promise<void>`
Sync transactions and balance for a specific account.

**Parameters:**
- `accountId`: Account UUID to sync

**Throws:** `BankingApiError` on failure

```typescript
await syncAccount('acc-123');
```

##### `revokeConnection(connectionId: string): Promise<void>`
Disconnect and remove a banking connection.

**Parameters:**
- `connectionId`: Connection UUID to revoke

**Throws:** `BankingApiError` on failure

```typescript
await revokeConnection('conn-123');
```

#### Error Management

##### `setError(error: string | null)`
Set general error message.

```typescript
const { setError } = useBanking();
setError('Something went wrong');
```

##### `clearError()`
Clear all error states.

```typescript
const { clearError } = useBanking();
clearError();
```

##### `clearSyncError(accountId: string)`
Clear sync error for specific account.

```typescript
const { clearSyncError } = useBanking();
clearSyncError('acc-123');
```

### Convenience Hooks

#### `useBanking()`
Access full store state and actions.

```typescript
const { accounts, isLoading, fetchAccounts } = useBanking();
```

#### `useAccounts()`
Access only accounts array (optimized).

```typescript
const accounts = useAccounts();
```

#### `useBankingError()`
Access current error message.

```typescript
const error = useBankingError();
```

#### `useSyncStatus(accountId: string)`
Check if specific account is syncing.

```typescript
const isSyncing = useSyncStatus('acc-123');
```

#### `useSyncError(accountId: string)`
Get sync error for specific account.

```typescript
const syncError = useSyncError('acc-123');
```

#### `useBankingLoading()`
Access all loading states.

```typescript
const { isLoading, isLinking, isSyncing } = useBankingLoading();
```

## Testing

### Running Tests

```bash
cd apps/web
pnpm test:unit banking.store
```

### Test Coverage

The store includes comprehensive unit tests covering:

- ✅ Initial state
- ✅ Account management (add, update, remove)
- ✅ Linking flow (initiate, complete)
- ✅ Account fetching
- ✅ Syncing operations
- ✅ Error handling
- ✅ Convenience hooks
- ✅ Persistence

### Testing Example

```typescript
import { renderHook, act } from '@testing-library/react';
import { useBankingStore } from './banking.store';

test('should add account', () => {
  const { result } = renderHook(() => useBankingStore());

  act(() => {
    result.current.addAccount(mockAccount);
  });

  expect(result.current.accounts).toHaveLength(1);
});
```

## Best Practices

### 1. Error Handling

Always handle errors when calling async actions:

```typescript
try {
  await fetchAccounts();
} catch (error) {
  // Error is already stored in state
  console.error('Failed to fetch accounts:', error);
}
```

### 2. Loading States

Use loading states for better UX:

```typescript
const { isLoading } = useBanking();

if (isLoading) {
  return <Skeleton />;
}
```

### 3. Optimistic Updates

Update UI optimistically during long operations:

```typescript
const { syncAccount, updateAccount } = useBanking();

// Optimistic update
updateAccount(accountId, { syncStatus: 'SYNCING' });

try {
  await syncAccount(accountId);
} catch (error) {
  // Revert on error
  updateAccount(accountId, { syncStatus: 'ERROR' });
}
```

### 4. Cleanup

Clear errors when component unmounts:

```typescript
useEffect(() => {
  return () => {
    clearError();
  };
}, []);
```

### 5. Selective Subscriptions

Use convenience hooks to avoid unnecessary re-renders:

```typescript
// ❌ BAD - Re-renders on any state change
const state = useBanking();

// ✅ GOOD - Only re-renders when accounts change
const accounts = useAccounts();
```

### 6. Sync Status Tracking

Track sync status per account, not globally:

```typescript
// ✅ GOOD
const isSyncing = useSyncStatus(accountId);

// ❌ BAD - Can't distinguish which account is syncing
const { isSyncing } = useBanking();
```

### 7. Error Recovery

Provide clear recovery actions:

```typescript
if (error) {
  return (
    <ErrorBanner
      message={error}
      onRetry={() => fetchAccounts()}
      onDismiss={() => clearError()}
    />
  );
}
```

## Advanced Patterns

### Auto-Refresh Accounts

```typescript
useEffect(() => {
  // Initial fetch
  fetchAccounts();

  // Refresh every 5 minutes
  const interval = setInterval(() => {
    fetchAccounts().catch(console.error);
  }, 5 * 60 * 1000);

  return () => clearInterval(interval);
}, []);
```

### Sync All Accounts

```typescript
const syncAll = async () => {
  const activeAccounts = accounts.filter(
    acc => acc.syncStatus !== 'DISCONNECTED'
  );

  await Promise.allSettled(
    activeAccounts.map(acc => syncAccount(acc.id))
  );
};
```

### Filtered Account Lists

```typescript
// Active accounts only
const activeAccounts = accounts.filter(
  acc => acc.syncStatus !== 'DISCONNECTED'
);

// Accounts needing sync
const needsSync = accounts.filter(
  acc => {
    if (!acc.lastSynced) return true;
    const lastSync = new Date(acc.lastSynced);
    const hoursSince = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    return hoursSince > 24;
  }
);
```

## Troubleshooting

### Store Not Persisting

Check localStorage key: `banking-storage`

```typescript
// Clear persisted state
localStorage.removeItem('banking-storage');
```

### Stale Data After Sync

Manually refresh after sync if needed:

```typescript
await syncAccount(accountId);
await fetchAccounts(); // Refresh all accounts
```

### TypeScript Errors

Ensure types are imported correctly:

```typescript
import type { BankingAccount } from '@/services/banking.client';
```

## Migration Guide

If migrating from another state management solution:

1. Replace Redux/Context with Zustand hooks
2. Update action calls (no dispatch needed)
3. Remove reducers and action creators
4. Update selectors to convenience hooks
5. Test all banking flows thoroughly

---

**Version:** 1.0.0
**Last Updated:** 2025-01-25
**Maintainer:** MoneyWise Development Team
