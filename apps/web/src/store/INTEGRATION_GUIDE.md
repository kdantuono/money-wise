# Banking Store Integration Guide

Quick guide to integrate the banking store into your MoneyWise components.

## Quick Start

### 1. Import the Store

```typescript
// ✅ Best Practice: Import from store index
import { useBanking, useAccounts } from '@/store';

// ⚠️ Also works: Direct import
import { useBanking } from '@/store/banking.store';
```

### 2. Use in Components

```typescript
function BankingDashboard() {
  const { accounts, fetchAccounts, isLoading } = useBanking();

  useEffect(() => {
    fetchAccounts();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {accounts.map(account => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
}
```

## Common Integration Patterns

### Pattern 1: Dashboard Widget

Display total balance across all accounts.

**File:** `components/dashboard/BankingWidget.tsx`

```typescript
import { useAccounts } from '@/store';

export function BankingWidget() {
  const accounts = useAccounts();

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + acc.balance,
    0
  );

  return (
    <div className="banking-widget">
      <h3>Total Balance</h3>
      <p className="text-2xl">{totalBalance.toFixed(2)} EUR</p>
      <p className="text-sm">{accounts.length} accounts</p>
    </div>
  );
}
```

### Pattern 2: Account List Page

Full account listing with sync functionality.

**File:** `app/banking/accounts/page.tsx`

```typescript
import { useBanking, useSyncStatus } from '@/store';

export default function AccountsPage() {
  const { accounts, fetchAccounts, syncAccount } = useBanking();

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <div className="container">
      <h1>Your Accounts</h1>
      <div className="grid gap-4">
        {accounts.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            onSync={() => syncAccount(account.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AccountCard({ account, onSync }) {
  const isSyncing = useSyncStatus(account.id);

  return (
    <div className="card">
      <h3>{account.name}</h3>
      <p>{account.balance} {account.currency}</p>
      <button onClick={onSync} disabled={isSyncing}>
        {isSyncing ? 'Syncing...' : 'Sync'}
      </button>
    </div>
  );
}
```

### Pattern 3: Link Bank Flow

Complete OAuth integration flow.

**File:** `app/banking/link/page.tsx`

```typescript
import { useBanking } from '@/store';

export default function LinkBankPage() {
  const { initiateLinking, isLinking, linkError, clearError } = useBanking();

  const handleLink = async (provider: string) => {
    try {
      clearError();
      const { redirectUrl, connectionId } = await initiateLinking(provider);

      // Store for OAuth callback
      sessionStorage.setItem('banking_connection_id', connectionId);

      // Redirect to bank
      window.location.href = redirectUrl;
    } catch (error) {
      // Error is already in state
      console.error('Link failed:', error);
    }
  };

  return (
    <div className="container">
      <h1>Link Your Bank</h1>

      {linkError && (
        <Alert variant="error">
          {linkError}
          <button onClick={clearError}>Dismiss</button>
        </Alert>
      )}

      <div className="provider-list">
        <button
          onClick={() => handleLink('SALTEDGE')}
          disabled={isLinking}
        >
          {isLinking ? 'Connecting...' : 'Link with Salt Edge'}
        </button>
      </div>
    </div>
  );
}
```

**File:** `app/banking/callback/page.tsx`

```typescript
import { useBanking } from '@/store';

export default function OAuthCallbackPage() {
  const { completeLinking } = useBanking();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const connectionId = sessionStorage.getItem('banking_connection_id');

    if (!connectionId) {
      setStatus('error');
      return;
    }

    completeLinking(connectionId)
      .then(() => {
        sessionStorage.removeItem('banking_connection_id');
        setStatus('success');
        setTimeout(() => router.push('/banking/accounts'), 2000);
      })
      .catch(() => {
        setStatus('error');
      });
  }, []);

  return (
    <div className="container text-center">
      {status === 'loading' && <p>Completing bank connection...</p>}
      {status === 'success' && <p>Success! Redirecting...</p>}
      {status === 'error' && <p>Failed to connect bank. Please try again.</p>}
    </div>
  );
}
```

### Pattern 4: Real-time Sync Status

Show sync status in real-time with toast notifications.

**File:** `components/banking/SyncButton.tsx`

```typescript
import { useBanking, useSyncStatus, useSyncError } from '@/store';
import { toast } from '@/components/ui/toast';

export function SyncButton({ accountId }: { accountId: string }) {
  const { syncAccount, clearSyncError } = useBanking();
  const isSyncing = useSyncStatus(accountId);
  const syncError = useSyncError(accountId);

  const handleSync = async () => {
    try {
      clearSyncError(accountId);
      await syncAccount(accountId);
      toast.success('Account synced successfully');
    } catch (error) {
      toast.error('Sync failed. Please try again.');
    }
  };

  return (
    <div>
      <button onClick={handleSync} disabled={isSyncing}>
        {isSyncing ? (
          <>
            <Spinner className="mr-2" />
            Syncing...
          </>
        ) : (
          'Sync Now'
        )}
      </button>

      {syncError && (
        <p className="text-sm text-red-600 mt-1">{syncError}</p>
      )}
    </div>
  );
}
```

## Advanced Patterns

### Auto-refresh with Polling

```typescript
function useAutoRefreshAccounts(intervalMs = 5 * 60 * 1000) {
  const { fetchAccounts } = useBanking();

  useEffect(() => {
    // Initial fetch
    fetchAccounts();

    // Poll at interval
    const interval = setInterval(() => {
      fetchAccounts().catch(console.error);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [fetchAccounts, intervalMs]);
}
```

### Optimistic Updates

```typescript
function AccountBalance({ accountId }: { accountId: string }) {
  const { syncAccount, updateAccount } = useBanking();
  const account = useAccounts().find(a => a.id === accountId);

  const handleOptimisticSync = async () => {
    // Optimistic update
    const previousStatus = account?.syncStatus;
    updateAccount(accountId, { syncStatus: 'SYNCING' });

    try {
      await syncAccount(accountId);
      // Success - real state updated by API
    } catch (error) {
      // Revert on error
      if (previousStatus) {
        updateAccount(accountId, { syncStatus: previousStatus });
      }
      toast.error('Sync failed');
    }
  };

  return (
    <button onClick={handleOptimisticSync}>
      Sync ({account?.syncStatus})
    </button>
  );
}
```

### Batch Operations

```typescript
function SyncAllButton() {
  const { accounts, syncAccount } = useBanking();
  const [syncing, setSyncing] = useState(false);

  const handleSyncAll = async () => {
    setSyncing(true);

    const activeAccounts = accounts.filter(
      acc => acc.syncStatus !== 'DISCONNECTED'
    );

    const results = await Promise.allSettled(
      activeAccounts.map(acc => syncAccount(acc.id))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    setSyncing(false);
    toast.info(`Synced: ${succeeded} successful, ${failed} failed`);
  };

  return (
    <button onClick={handleSyncAll} disabled={syncing}>
      {syncing ? 'Syncing all accounts...' : 'Sync All'}
    </button>
  );
}
```

## Testing Integration

### Unit Test Example

```typescript
import { renderHook, act } from '@testing-library/react';
import { useBanking } from '@/store';

test('should fetch accounts on mount', async () => {
  const { result } = renderHook(() => useBanking());

  await act(async () => {
    await result.current.fetchAccounts();
  });

  expect(result.current.accounts.length).toBeGreaterThan(0);
});
```

### Integration Test Example

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountsPage from './page';

test('should sync account on button click', async () => {
  render(<AccountsPage />);

  await waitFor(() => {
    expect(screen.getByText('Your Accounts')).toBeInTheDocument();
  });

  const syncButton = screen.getByRole('button', { name: /sync/i });
  await userEvent.click(syncButton);

  await waitFor(() => {
    expect(screen.getByText('Syncing...')).toBeInTheDocument();
  });
});
```

## Performance Optimization

### Selective Subscriptions

```typescript
// ❌ BAD - Re-renders on ANY state change
function Component() {
  const state = useBanking();
  return <div>{state.accounts.length}</div>;
}

// ✅ GOOD - Only re-renders when accounts change
function Component() {
  const accounts = useAccounts();
  return <div>{accounts.length}</div>;
}
```

### Memoization

```typescript
function AccountList() {
  const accounts = useAccounts();

  const sortedAccounts = useMemo(
    () => accounts.sort((a, b) => b.balance - a.balance),
    [accounts]
  );

  return (
    <div>
      {sortedAccounts.map(account => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
}
```

## Troubleshooting

### Issue: Store not updating

**Solution:** Ensure you're using hooks inside React components

```typescript
// ❌ BAD - Outside component
const accounts = useAccounts();

// ✅ GOOD - Inside component
function MyComponent() {
  const accounts = useAccounts();
}
```

### Issue: Stale data after sync

**Solution:** Manually refresh if needed

```typescript
await syncAccount(accountId);
await fetchAccounts(); // Refresh all accounts
```

### Issue: TypeScript errors

**Solution:** Import types from store index

```typescript
import type { BankingAccount } from '@/store';
```

## Next Steps

1. **Read full documentation**: `apps/web/src/store/README.md`
2. **View examples**: `apps/web/src/store/banking.store.example.tsx`
3. **Run tests**: `pnpm test:unit banking.store`
4. **Check API client**: `apps/web/src/services/banking.client.ts`

## Support

For questions or issues:
- Check the full README in `apps/web/src/store/README.md`
- Review examples in `banking.store.example.tsx`
- Run tests to see usage patterns
- Contact the MoneyWise development team

---

**Last Updated:** 2025-01-25
**Version:** 1.0.0
