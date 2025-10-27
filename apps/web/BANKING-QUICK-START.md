# Banking Integration - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Configure Environment
```bash
# Edit apps/web/.env.local
NEXT_PUBLIC_BANKING_ENABLED=true
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_OAUTH_REDIRECT_BASE=http://localhost:3000
```

### 2. Start Development Server
```bash
# From project root
pnpm dev:web

# Or from web directory
cd apps/web
pnpm dev
```

### 3. Access Banking Pages
- **Main Page**: http://localhost:3000/banking
- **Callback**: http://localhost:3000/banking/callback

---

## 📋 Quick Routes

| Route | Purpose | Protected |
|-------|---------|-----------|
| `/banking` | Main banking dashboard | ✅ Yes |
| `/banking/callback` | OAuth callback handler | ❌ No |
| `/dashboard` | App dashboard (has Banking nav item) | ✅ Yes |

---

## 🎯 Common Tasks

### Link a Bank Account
1. Navigate to `/banking`
2. Click "Link Bank Account" button
3. Popup opens with SaltEdge OAuth
4. Select bank and authorize
5. Redirected to callback → Shows success
6. Auto-redirect to `/banking` after 5s

### Sync an Account
1. Go to `/banking`
2. Find account card
3. Click "Sync Now" button
4. Wait for sync to complete
5. Account status updates to "Synced"

### Revoke an Account
1. Go to `/banking`
2. Find account card
3. Click "Revoke" button
4. Read warning in modal
5. Check confirmation checkbox
6. Click "Revoke Access"
7. Account removed from list

---

## 🔧 Troubleshooting

### Problem: Banking page not accessible
**Solution**: Ensure user is logged in (ProtectedRoute)

### Problem: "Missing connection ID" error
**Solution**: Check backend `/banking/initiate-link` returns connectionId

### Problem: OAuth popup blocked
**Solution**: Allow popups for localhost:3000 in browser

### Problem: Accounts not showing
**Solution**: Check API_URL in .env.local, verify backend is running

---

## 🧪 Testing

```bash
# Run all tests (should see 267 passing)
cd apps/web
pnpm test

# Run specific test file
pnpm test banking

# Run in watch mode
pnpm test:watch
```

---

## 📦 Import Examples

### Using Components
```typescript
import {
  BankingLinkButton,
  AccountList,
  RevokeConfirmation,
  ErrorAlert,
} from '@/components/banking';
```

### Using Store
```typescript
import {
  useBanking,
  useAccounts,
  useBankingError,
} from '@/store';

function MyComponent() {
  const { fetchAccounts, syncAccount } = useBanking();
  const accounts = useAccounts();
  const error = useBankingError();

  // ...
}
```

### Using API Client
```typescript
import { bankingClient } from '@/services/banking.client';

// Initiate OAuth
const { redirectUrl, connectionId } = await bankingClient.initiateLink();

// Complete linking
const { accounts } = await bankingClient.completeLink(connectionId);

// Get accounts
const { accounts } = await bankingClient.getAccounts();

// Sync account
const result = await bankingClient.syncAccount(accountId);

// Revoke connection
await bankingClient.revokeConnection(connectionId);
```

---

## 🎨 Customization

### Change Banking Icon
Edit `components/layout/dashboard-layout.tsx`:
```typescript
import { Wallet } from 'lucide-react'; // Instead of Building2

const navigation = [
  { name: 'Banking', href: '/banking', icon: Wallet },
  // ...
];
```

### Modify Auto-Redirect Timing
Edit `app/banking/callback/page.tsx`:
```typescript
const [redirectCountdown, setRedirectCountdown] = useState<number>(10); // 10 seconds
```

### Customize Empty State
Edit `app/banking/page.tsx` - look for:
```typescript
{!isLoading && accounts.length === 0 && (
  // Customize this section
)}
```

---

## 📚 Documentation

- **Full Guide**: `/apps/web/app/banking/README.md`
- **Components**: `/apps/web/src/components/banking/README.md`
- **Store**: `/apps/web/src/store/banking.store.ts` (JSDoc)
- **API Client**: `/apps/web/src/services/banking.client.ts` (JSDoc)
- **Types**: `/apps/web/src/lib/banking-types.ts`

---

## 🆘 Need Help?

1. Check the [main README](/apps/web/app/banking/README.md)
2. Review [component examples](/apps/web/src/components/banking/examples.tsx)
3. Look at [test files](/apps/web/__tests__/) for usage patterns
4. Check backend [integration guide](/docs/integrations/SALTEDGE-INTEGRATION-GUIDE.md)

---

## ✅ Checklist

Before testing:
- [ ] Backend server running (`pnpm dev:backend`)
- [ ] Frontend server running (`pnpm dev:web`)
- [ ] `.env.local` configured
- [ ] User logged in (go to `/auth/login`)
- [ ] SaltEdge sandbox credentials configured (backend)

---

**Last Updated**: October 25, 2024
