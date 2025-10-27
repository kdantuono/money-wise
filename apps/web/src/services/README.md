# Services Module

This directory contains API client services for the MoneyWise frontend application.

## 📦 Available Services

### Banking Client (`banking.client.ts`)

Type-safe HTTP client for banking provider integration endpoints.

**Features:**

- ✅ Full TypeScript support with comprehensive type definitions
- ✅ Automatic JWT authentication from localStorage
- ✅ Typed error handling with custom error classes
- ✅ Request/response logging in development mode
- ✅ Environment-aware configuration
- ✅ Production-ready error messages

## 🚀 Quick Start

### Installation

The service is already part of the web app. Import from the services module:

```typescript
import { bankingClient } from '@/services';
// or
import bankingClient from '@/services/banking.client';
```

### Basic Usage

```typescript
// 1. Initiate banking link
const { redirectUrl, connectionId } = await bankingClient.initiateLink('SALTEDGE');
sessionStorage.setItem('banking_connection_id', connectionId);
window.location.href = redirectUrl;

// 2. Complete link after OAuth (in redirect handler)
const connectionId = sessionStorage.getItem('banking_connection_id');
const { accounts } = await bankingClient.completeLink(connectionId!);

// 3. Get all accounts
const { accounts } = await bankingClient.getAccounts();

// 4. Sync specific account
const result = await bankingClient.syncAccount(accountId);

// 5. Revoke connection
await bankingClient.revokeConnection(connectionId);
```

## 📚 API Methods

### `initiateLink(provider?)`

Start OAuth flow to link a bank account.

**Parameters:**

- `provider` (optional): `'SALTEDGE' | 'TINK' | 'YAPILY'` - defaults to `'SALTEDGE'`

**Returns:**

```typescript
{
  redirectUrl: string; // OAuth URL to redirect user to
  connectionId: string; // Use this in completeLink()
}
```

**Example:**

```typescript
const { redirectUrl, connectionId } = await bankingClient.initiateLink();
```

---

### `completeLink(connectionId)`

Complete OAuth flow and fetch linked accounts.

**Parameters:**

- `connectionId` (required): `string` - Connection ID from `initiateLink()`

**Returns:**

```typescript
{
  accounts: BankingAccount[];  // Array of linked accounts
}
```

**Example:**

```typescript
const { accounts } = await bankingClient.completeLink(connectionId);
console.log(`Linked ${accounts.length} accounts`);
```

---

### `getAccounts()`

Get all linked banking accounts for the authenticated user.

**Parameters:** None

**Returns:**

```typescript
{
  accounts: BankingAccount[];  // Array of linked accounts
}
```

**Example:**

```typescript
const { accounts } = await bankingClient.getAccounts();
```

---

### `syncAccount(accountId)`

Sync transactions and balance for a specific account.

**Parameters:**

- `accountId` (required): `string` - Account ID to sync

**Returns:**

```typescript
{
  syncLogId: string;
  status: 'SYNCED' | 'PENDING' | 'ERROR';
  transactionsSynced: number;
  balanceUpdated: boolean;
  error?: string;
}
```

**Example:**

```typescript
const result = await bankingClient.syncAccount(accountId);
if (result.status === 'SYNCED') {
  console.log(`Synced ${result.transactionsSynced} transactions`);
}
```

---

### `revokeConnection(connectionId)`

Disconnect a banking provider connection.

**Parameters:**

- `connectionId` (required): `string` - Connection ID to revoke

**Returns:** `void` (204 No Content)

**Example:**

```typescript
await bankingClient.revokeConnection(connectionId);
console.log('Connection revoked');
```

---

### `getProviders()`

Get list of available banking providers.

**Parameters:** None

**Returns:**

```typescript
{
  providers: BankingProvider[];  // ['SALTEDGE', 'TINK', etc.]
  enabled: boolean;               // Whether banking is enabled
}
```

**Example:**

```typescript
const { providers, enabled } = await bankingClient.getProviders();
```

## 🎯 Type Definitions

### `BankingAccount`

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
  accountHolderName?: string | null;
}
```

### `SyncResponse`

```typescript
interface SyncResponse {
  syncLogId: string;
  status: 'SYNCED' | 'PENDING' | 'ERROR';
  transactionsSynced: number;
  balanceUpdated: boolean;
  error?: string | null;
}
```

## 🚨 Error Handling

The client throws typed errors for different HTTP status codes:

### Error Classes

```typescript
BankingApiError; // Base error (all status codes)
AuthenticationError; // 401 - Token expired/invalid
AuthorizationError; // 403 - Insufficient permissions
NotFoundError; // 404 - Resource not found
ValidationError; // 400 - Invalid request data
ServerError; // 500 - Internal server error
```

### Error Handling Example

```typescript
import { bankingClient, AuthenticationError, ValidationError, NotFoundError, BankingApiError } from '@/services';

try {
  const { accounts } = await bankingClient.getAccounts();
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Redirect to login
    router.push('/login');
  } else if (error instanceof ValidationError) {
    // Show validation error
    toast.error(error.message);
  } else if (error instanceof NotFoundError) {
    // Show not found message
    toast.error('Account not found');
  } else if (error instanceof BankingApiError) {
    // Generic API error
    toast.error(`Error: ${error.message}`);
  } else {
    // Unknown error
    console.error('Unexpected error:', error);
  }
}
```

## ⚙️ Configuration

### Environment Variables

The client uses the following environment variables:

```env
# API Base URL (required)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Authentication

The client automatically:

1. Reads JWT token from `localStorage.getItem('auth_token')`
2. Adds `Authorization: Bearer {token}` header to all requests
3. Throws `AuthenticationError` if token is invalid/expired

### Development Mode

In development (`NODE_ENV=development`):

- All requests and responses are logged to console
- Error details include full error objects
- Helpful debugging information is displayed

## 🔄 React Integration

### Custom Hook Example

```typescript
import { useState, useEffect } from 'react';
import { bankingClient, BankingAccount, BankingApiError } from '@/services';

export function useBankingAccounts() {
  const [accounts, setAccounts] = useState<BankingAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);

    try {
      const { accounts } = await bankingClient.getAccounts();
      setAccounts(accounts);
    } catch (err) {
      const message = err instanceof BankingApiError ? err.message : 'Failed to load accounts';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  return { accounts, loading, error, refetch: loadAccounts };
}
```

### Component Usage

```typescript
export function AccountList() {
  const { accounts, loading, error, refetch } = useBankingAccounts();

  if (loading) return <div>Loading accounts...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {accounts.map(account => (
        <div key={account.id}>
          {account.name}: {account.balance} {account.currency}
        </div>
      ))}
    </div>
  );
}
```

## 🧪 Testing

### Mock Client for Testing

```typescript
// __mocks__/banking.client.ts
export const mockBankingClient = {
  initiateLink: jest.fn(),
  completeLink: jest.fn(),
  getAccounts: jest.fn(),
  syncAccount: jest.fn(),
  revokeConnection: jest.fn(),
  getProviders: jest.fn(),
};

export default mockBankingClient;
```

### Test Example

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { AccountList } from './AccountList';
import { mockBankingClient } from '@/__mocks__/banking.client';

jest.mock('@/services/banking.client', () => ({
  __esModule: true,
  default: mockBankingClient,
}));

test('displays accounts', async () => {
  mockBankingClient.getAccounts.mockResolvedValue({
    accounts: [
      { id: '1', name: 'Test Account', balance: 1000, currency: 'EUR' }
    ]
  });

  render(<AccountList />);

  await waitFor(() => {
    expect(screen.getByText(/Test Account/)).toBeInTheDocument();
  });
});
```

## 📖 Additional Resources

- **Usage Examples**: See `banking.client.example.ts` for comprehensive examples
- **API Documentation**: Backend API docs at `/apps/backend/src/banking/banking.controller.ts`
- **Type Definitions**: All types exported from `banking.client.ts`

## 🔐 Security Considerations

1. **Token Storage**: JWT tokens are stored in localStorage
   - Consider using httpOnly cookies for production
   - Implement token refresh logic

2. **HTTPS**: Always use HTTPS in production
   - Set `NEXT_PUBLIC_API_URL` to HTTPS endpoint

3. **Error Messages**: Error messages are sanitized
   - No sensitive data exposed in client errors

4. **CORS**: Ensure backend CORS is properly configured
   - Only allow trusted origins

## 🎨 Best Practices

1. **Always handle errors**: Use try-catch with typed error handling
2. **Show loading states**: Improve UX during async operations
3. **Implement retries**: Use exponential backoff for transient failures
4. **Cache responses**: Consider using React Query or SWR
5. **Validate inputs**: Check parameters before API calls
6. **Log errors**: Send to error tracking service (e.g., Sentry)

## 📝 Migration Guide

### From Direct Fetch to Banking Client

**Before:**

```typescript
const response = await fetch('/api/banking/accounts', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
const data = await response.json();
```

**After:**

```typescript
const { accounts } = await bankingClient.getAccounts();
```

**Benefits:**

- ✅ Automatic authentication
- ✅ Type safety
- ✅ Error handling
- ✅ Request/response logging
- ✅ Centralized configuration

## 🤝 Contributing

When adding new endpoints:

1. Add method to `bankingClient` object
2. Define request/response types
3. Add JSDoc comments with examples
4. Update this README
5. Add usage examples to `banking.client.example.ts`
6. Write tests

## 📄 License

Part of the MoneyWise application.
