# Banking Client - Quick Start Guide

**5-minute guide to using the Banking API Client**

## 🚀 Import

```typescript
import { bankingClient } from '@/services';
// or with types
import { bankingClient, BankingAccount, SyncResponse } from '@/services';
```

## 📝 Essential Code Snippets

### 1. Link Bank Account (OAuth Flow)

```typescript
// Step 1: Initiate (on "Link Bank" button click)
const { redirectUrl, connectionId } = await bankingClient.initiateLink('SALTEDGE');
sessionStorage.setItem('banking_connection_id', connectionId);
window.location.href = redirectUrl;

// Step 2: Complete (after OAuth redirect)
const connectionId = sessionStorage.getItem('banking_connection_id')!;
const { accounts } = await bankingClient.completeLink(connectionId);
console.log(`Linked ${accounts.length} accounts`);
```

### 2. Display Accounts

```typescript
const { accounts } = await bankingClient.getAccounts();

accounts.forEach(account => {
  console.log(`${account.name}: ${account.balance} ${account.currency}`);
  console.log(`Status: ${account.syncStatus}`);
});
```

### 3. Sync Account

```typescript
const result = await bankingClient.syncAccount(accountId);

if (result.status === 'SYNCED') {
  console.log(`Synced ${result.transactionsSynced} transactions`);
} else if (result.status === 'ERROR') {
  console.error(`Sync failed: ${result.error}`);
}
```

### 4. Disconnect Bank

```typescript
await bankingClient.revokeConnection(connectionId);
console.log('Bank disconnected');
```

## 🚨 Error Handling

```typescript
import { bankingClient, AuthenticationError, ValidationError, NotFoundError, BankingApiError } from '@/services';

try {
  await bankingClient.getAccounts();
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Token expired - redirect to login
    router.push('/login');
  } else if (error instanceof ValidationError) {
    // Bad request data
    toast.error(error.message);
  } else if (error instanceof NotFoundError) {
    // Resource not found
    toast.error('Account not found');
  } else if (error instanceof BankingApiError) {
    // Other API error
    toast.error(`Error: ${error.message}`);
  } else {
    // Unknown error
    toast.error('An unexpected error occurred');
  }
}
```

## ⚛️ React Hook

```typescript
import { useState, useEffect } from 'react';
import { bankingClient, BankingAccount } from '@/services';

function useBankingAccounts() {
  const [accounts, setAccounts] = useState<BankingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bankingClient.getAccounts()
      .then(({ accounts }) => setAccounts(accounts))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { accounts, loading, error };
}

// Usage in component
function AccountList() {
  const { accounts, loading, error } = useBankingAccounts();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {accounts.map(account => (
        <div key={account.id}>{account.name}</div>
      ))}
    </div>
  );
}
```

## 🔧 Configuration

**Environment Variable** (`.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

**Authentication**:

- Token automatically read from `localStorage.getItem('auth_token')`
- Automatically added as `Authorization: Bearer {token}` header

## 📊 Type Reference

```typescript
interface BankingAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  bankName?: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'ERROR' | 'DISCONNECTED';
  lastSynced?: string | null;
  linkedAt: string;
  accountNumber?: string | null;
  accountType?: string | null;
  bankCountry?: string | null;
}

interface SyncResponse {
  syncLogId: string;
  status: 'SYNCED' | 'PENDING' | 'ERROR';
  transactionsSynced: number;
  balanceUpdated: boolean;
  error?: string | null;
}
```

## 🎯 Common Patterns

### Show Sync Status

```typescript
function getSyncStatusBadge(status: string) {
  const badges = {
    SYNCED: '✓ Synced',
    PENDING: '⏳ Pending',
    SYNCING: '🔄 Syncing...',
    ERROR: '✗ Error',
    DISCONNECTED: '⚠ Disconnected',
  };
  return badges[status] || status;
}
```

### Format Balance

```typescript
function formatBalance(balance: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(balance);
}

// Usage
formatBalance(1234.56, 'EUR'); // €1,234.56
```

### Filter Accounts

```typescript
// Only synced accounts
const synced = accounts.filter(a => a.syncStatus === 'SYNCED');

// Only EUR accounts
const eurAccounts = accounts.filter(a => a.currency === 'EUR');

// Sort by balance
const sorted = [...accounts].sort((a, b) => b.balance - a.balance);
```

## 🧪 Testing

```typescript
// Mock the client
jest.mock('@/services/banking.client', () => ({
  __esModule: true,
  default: {
    getAccounts: jest.fn().mockResolvedValue({
      accounts: [{ id: '1', name: 'Test', balance: 1000, currency: 'EUR' }],
    }),
  },
}));

// Test
import { bankingClient } from '@/services';

test('loads accounts', async () => {
  const { accounts } = await bankingClient.getAccounts();
  expect(accounts).toHaveLength(1);
  expect(accounts[0].name).toBe('Test');
});
```

## 📚 Full Documentation

- **Complete Guide**: `src/services/README.md`
- **Examples**: `src/services/banking.client.example.ts`
- **API Reference**: JSDoc in `src/services/banking.client.ts`

## 💡 Tips

1. **Always handle errors** - Use try-catch with typed errors
2. **Show loading states** - Improve UX during async operations
3. **Cache responses** - Consider React Query or SWR
4. **Validate before API calls** - Check accountId exists, etc.
5. **Log errors** - Send to Sentry or error tracking service

## 🆘 Common Issues

**"Token expired" error?** → Clear localStorage and log in again

**"Account not found" error?** → Check that accountId is valid and belongs to user

**CORS error?** → Verify backend CORS allows frontend origin

**Network error?** → Check that backend is running and `NEXT_PUBLIC_API_URL` is correct

## ✨ Quick Commands

```bash
# Check TypeScript
pnpm exec tsc --noEmit src/services/banking.client.ts

# Lint
pnpm exec eslint src/services/banking.client.ts

# Test
pnpm test src/services/
```

---

**Need more help?** See `README.md` in the same directory for comprehensive documentation.
