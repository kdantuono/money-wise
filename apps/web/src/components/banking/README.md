# Banking Integration Components

Production-ready React components for MoneyWise banking integration. All components include full TypeScript types, accessibility support, loading states, and error handling.

## Overview

Six main components for banking integration:

1. **BankingLinkButton** - OAuth flow for linking bank accounts
2. **AccountList** - Grid/list of linked accounts with sync status
3. **AccountDetails** - Detailed view of single account
4. **TransactionList** - Transactions with filtering and search
5. **RevokeConfirmation** - Confirmation dialog for account disconnection
6. **LoadingStates** - Skeleton loaders and loading indicators

## Components

### BankingLinkButton

Initiates the OAuth flow to link a user's bank account via popup window.

**Features:**
- OAuth popup window management
- Loading state during authentication
- Error message display
- Window focus management
- Customizable provider selection

```typescript
import { BankingLinkButton } from '@/components/banking';

export function LinkBankPage() {
  const handleSuccess = () => {
    console.log('Account linked successfully');
    // Refresh account list
  };

  const handleError = (error: string) => {
    console.error('Linking failed:', error);
  };

  return (
    <BankingLinkButton
      provider="SALTEDGE"
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}
```

**Props:**
- `onSuccess?: () => void` - Called when account successfully linked
- `onError?: (error: string) => void` - Called on linking failure
- `provider?: 'SALTEDGE' | 'TINK' | 'YAPILY' | 'TRUELAYER'` - Provider selection
- `className?: string` - CSS classes for styling
- `children?: React.ReactNode` - Button text (default: "Link Bank Account")
- `ariaLabel?: string` - Accessibility label override

---

### AccountList

Displays all linked bank accounts in a responsive grid layout.

**Features:**
- Responsive grid (1 col mobile, 2-3 cols desktop)
- Sync status indicators with color coding
- Balance display with currency formatting
- Skeleton loading states
- Empty state message
- Sync and Revoke action buttons
- Keyboard navigation support
- Live region updates for screen readers

```typescript
import { AccountList } from '@/components/banking';

export function AccountsPage() {
  const [accounts, setAccounts] = useState<BankingAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSync = async (accountId: string) => {
    const response = await fetch(`/api/banking/accounts/${accountId}/sync`, {
      method: 'POST',
    });
    // Handle response
  };

  const handleRevoke = async (accountId: string) => {
    const response = await fetch(`/api/banking/accounts/${accountId}/revoke`, {
      method: 'POST',
    });
    // Handle response
  };

  return (
    <AccountList
      accounts={accounts}
      isLoading={isLoading}
      onSync={handleSync}
      onRevoke={handleRevoke}
    />
  );
}
```

**Props:**
- `accounts: BankingAccount[]` - Array of linked accounts
- `isLoading?: boolean` - Whether accounts are loading
- `onSync: (accountId: string) => void | Promise<void>` - Sync handler
- `onRevoke: (accountId: string) => void | Promise<void>` - Revoke handler
- `className?: string` - CSS classes
- `onSyncStart?: (accountId: string) => void` - Called when sync starts
- `onSyncComplete?: (accountId: string, success: boolean) => void` - Called when sync completes

---

### AccountDetails

Detailed view of a single linked bank account with comprehensive information.

**Features:**
- Full account information display
- Balance with available balance (if applicable)
- Account holder name, IBAN, account number
- Credit limit display
- Sync and revoke action buttons
- Revoke confirmation modal
- Linked and sync timestamps
- Connection status badge
- Responsive layout
- Loading skeleton

```typescript
import { AccountDetails } from '@/components/banking';

export function AccountDetailPage({ accountId }: { accountId: string }) {
  const [account, setAccount] = useState<BankingAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSync = async () => {
    const response = await fetch(`/api/banking/accounts/${accountId}/sync`, {
      method: 'POST',
    });
    const updated = await response.json();
    setAccount(updated);
  };

  const handleRevoke = async () => {
    const response = await fetch(`/api/banking/accounts/${accountId}/revoke`, {
      method: 'POST',
    });
    // Navigate away after successful revoke
  };

  return account ? (
    <AccountDetails
      account={account}
      isLoading={isLoading}
      onSync={handleSync}
      onRevoke={handleRevoke}
    />
  ) : null;
}
```

**Props:**
- `account: BankingAccount` - Account to display
- `isLoading?: boolean` - Whether account is loading
- `onSync: () => void | Promise<void>` - Sync handler
- `onRevoke: () => void | Promise<void>` - Revoke handler
- `balanceHistory?: BalanceHistory[]` - Balance history for chart display
- `className?: string` - CSS classes

---

### TransactionList

Displays transactions for a bank account with advanced filtering and search.

**Features:**
- Date range filtering (from/to date)
- Description/merchant search with highlighting
- Color-coded transaction types (income/expense)
- Transaction status badges
- Pagination or infinite scroll
- Load more button
- Loading skeletons
- Empty state message
- Responsive table/list layout
- Filter summary and clear button

```typescript
import { TransactionList } from '@/components/banking';

export function TransactionsPage({ accountId }: { accountId: string }) {
  const [transactions, setTransactions] = useState<BankingTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const handleLoadMore = async () => {
    const response = await fetch(
      `/api/banking/accounts/${accountId}/transactions?offset=${transactions.length}`,
      { method: 'GET' }
    );
    const moreTransactions = await response.json();
    setTransactions((prev) => [...prev, ...moreTransactions]);
    setHasMore(moreTransactions.length === 20); // Page size
  };

  return (
    <TransactionList
      accountId={accountId}
      transactions={transactions}
      isLoading={isLoading}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
    />
  );
}
```

**Props:**
- `accountId: string` - Account ID for the transactions
- `transactions?: BankingTransaction[]` - Array of transactions
- `isLoading?: boolean` - Whether transactions are loading
- `hasMore?: boolean` - Whether more transactions are available
- `onLoadMore?: () => void | Promise<void>` - Load more handler
- `className?: string` - CSS classes

---

### RevokeConfirmation

Modal dialog to confirm account disconnection with warning message.

**Features:**
- Warning about consequences
- Account information display
- Current balance display
- Confirmation checkbox requirement
- Confirm and Cancel buttons
- Loading state during revocation
- Error message display
- Keyboard support (Escape to cancel, Enter to confirm)
- Backdrop click to dismiss
- Focus management

```typescript
import { RevokeConfirmation } from '@/components/banking';

export function AccountCard({ account }: { account: BankingAccount }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRevoke = async () => {
    const response = await fetch(`/api/banking/accounts/${account.id}/revoke`, {
      method: 'POST',
    });
    // Handle success
    setShowConfirm(false);
  };

  return (
    <>
      <button onClick={() => setShowConfirm(true)}>Revoke Account</button>

      {showConfirm && (
        <RevokeConfirmation
          account={account}
          onConfirm={handleRevoke}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
```

**Props:**
- `account: BankingAccount` - Account being revoked
- `onConfirm: () => void | Promise<void>` - Confirmation handler
- `onCancel: () => void` - Cancellation handler
- `className?: string` - CSS classes

---

### LoadingStates

Collection of skeleton loaders and loading indicators.

```typescript
import {
  AccountSkeleton,
  AccountDetailsSkeleton,
  TransactionSkeleton,
  SyncingIndicator,
  ErrorAlert,
  ErrorBoundary,
} from '@/components/banking';

// Use skeletons during loading
export function AccountListWithSkeleton() {
  const [isLoading, setIsLoading] = useState(true);

  return isLoading ? (
    <div className="grid grid-cols-3 gap-4">
      <AccountSkeleton />
      <AccountSkeleton />
      <AccountSkeleton />
    </div>
  ) : (
    <AccountList accounts={accounts} />
  );
}

// Show syncing state
export function SyncingAccount() {
  return <SyncingIndicator accountName="Chase Checking" />;
}

// Display errors
export function AccountWithError() {
  return (
    <ErrorAlert
      title="Sync Failed"
      message="Unable to sync account"
      details="Connection timeout after 30 seconds"
      onDismiss={() => {
        /* handle dismiss */
      }}
    />
  );
}

// Wrap components to catch errors
export function SafeAccountDetails() {
  return (
    <ErrorBoundary
      onError={(error) => console.error('Component error:', error)}
    >
      <AccountDetails {...props} />
    </ErrorBoundary>
  );
}
```

**Components:**

#### AccountSkeleton
- Placeholder for account list item
- Pulse animation

#### AccountDetailsSkeleton
- Placeholder for full account details
- Multi-section skeleton

#### TransactionSkeleton
- Placeholder for transaction item
- Amount and date placeholders

#### SyncingIndicator
- Animated spinner with text
- Shows account name being synced
- Props: `accountName?: string`, `className?: string`

#### ErrorAlert
- Generic error display with icon
- Shows title, message, and optional details
- Dismissible with optional callback
- Props: `title?: string`, `message: string`, `details?: string`, `onDismiss?: () => void`, `className?: string`

#### ErrorBoundary
- React error boundary to catch component errors
- Props: `children: ReactNode`, `fallback?: (error: Error) => ReactNode`, `onError?: (error: Error) => void`

---

## Types

All banking types are defined in `/apps/web/src/lib/banking-types.ts`:

```typescript
import {
  BankingAccount,
  BankingTransaction,
  BankingProvider,
  BankingConnectionStatus,
  BankingSyncStatus,
  BankingSyncResult,
} from '@/lib/banking-types';
```

---

## Styling

All components use Tailwind CSS with responsive design:

- **Mobile-first approach** - Base styles for mobile, breakpoints for larger screens
- **Dark mode ready** - Uses semantic color classes that can be adapted
- **Focus indicators** - 2px minimum thickness, 3:1 contrast ratio
- **Color contrast** - All text meets 4.5:1 (normal) or 3:1 (UI components) requirements
- **Animations** - Smooth transitions, respects `prefers-reduced-motion`

### Customizing Styles

Pass `className` prop to customize:

```typescript
<AccountList
  accounts={accounts}
  className="gap-6 lg:grid-cols-4"
  onSync={handleSync}
  onRevoke={handleRevoke}
/>
```

---

## Accessibility

All components meet WCAG 2.2 AA compliance:

**Keyboard Navigation:**
- Tab: Navigate to focusable elements
- Shift+Tab: Navigate backwards
- Enter: Activate buttons
- Space: Toggle checkboxes
- Escape: Close modals

**Screen Reader Support:**
- Semantic HTML (`<button>`, `<dialog>`, etc.)
- ARIA labels on all interactive elements
- ARIA live regions for status updates
- ARIA busy for loading states
- ARIA role declarations

**Focus Management:**
- Visible focus indicators (blue ring)
- Focus trapped in modals
- Focus restored on modal close
- Logical tab order

**Visual Accessibility:**
- Color contrast: 4.5:1 for text, 3:1 for UI components
- Touch targets: Minimum 24x24 CSS pixels
- Touch target spacing: At least 8px apart
- Icon + text for visual indicators
- Reduced motion respected

---

## Error Handling

All components include comprehensive error handling:

```typescript
// Component catches errors and displays them
<BankingLinkButton
  onError={(error) => {
    // Handle error (e.g., show toast notification)
    console.error('Link failed:', error);
  }}
/>

// Wrap components to catch runtime errors
<ErrorBoundary
  onError={(error) => {
    // Log to monitoring service
    logErrorToSentry(error);
  }}
>
  <AccountDetails {...props} />
</ErrorBoundary>
```

---

## Performance

Components are optimized for performance:

- **React Compiler compatible** - No unnecessary memoization
- **Server Components** - Use `'use client'` only where needed
- **Lazy loading** - Transactions load on demand
- **Memoization** - Filtered/sorted data uses `useMemo`
- **Minimal re-renders** - Only necessary state updates
- **Image optimization** - Use next/image for images

---

## Testing

Example test patterns:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { BankingLinkButton } from '@/components/banking';

describe('BankingLinkButton', () => {
  it('calls onSuccess when OAuth completes', async () => {
    const onSuccess = vi.fn();
    render(<BankingLinkButton onSuccess={onSuccess} />);

    // Simulate OAuth completion
    // Assert onSuccess was called
  });

  it('shows error message on failure', async () => {
    render(<BankingLinkButton onError={vi.fn()} />);

    // Simulate OAuth failure
    expect(screen.getByRole('alert')).toHaveTextContent('Error');
  });

  it('is keyboard accessible', async () => {
    const { container } = render(<BankingLinkButton />);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('focus-visible:ring-2');
  });
});
```

---

## API Integration

Components expect these API endpoints:

```
POST   /api/banking/initiate-link
POST   /api/banking/accounts/{accountId}/sync
POST   /api/banking/accounts/{accountId}/revoke
GET    /api/banking/accounts/{accountId}/transactions
```

---

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: Latest versions
- Graceful degradation for older browsers

---

## Dependencies

- React 19+
- TypeScript 5+
- Tailwind CSS 3+

No additional UI library dependencies - built from semantic HTML and Tailwind.

---

## File Structure

```
apps/web/src/components/banking/
├── BankingLinkButton.tsx       # OAuth linking component
├── AccountList.tsx             # Grid/list of accounts
├── AccountDetails.tsx          # Single account details
├── TransactionList.tsx         # Transactions with filtering
├── RevokeConfirmation.tsx      # Confirmation modal
├── LoadingStates.tsx           # Skeletons and loading indicators
├── index.ts                    # Component exports
└── README.md                   # This file

apps/web/src/lib/
└── banking-types.ts            # Type definitions
```

---

## Contributing

When adding new features:

1. **Maintain type safety** - Use strict TypeScript types
2. **Add accessibility** - WCAG 2.2 AA compliance
3. **Include loading states** - Skeleton loaders for async operations
4. **Handle errors** - Error messages and fallbacks
5. **Responsive design** - Mobile-first approach
6. **Document changes** - Update README with usage examples

---

## Related Files

- Backend types: `apps/backend/src/banking/interfaces/banking-provider.interface.ts`
- Banking service: `apps/backend/src/banking/banking.controller.ts`
- Types package: `packages/types/src/common.types.ts`
