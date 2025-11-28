# Banking Integration MVP Plan

## Executive Summary

The banking integration is **80% complete** with a solid foundation. This plan focuses on the remaining 20% needed to deliver a working MVP that allows users to connect bank accounts and view synchronized transactions within MoneyWise.

---

## Current State Analysis

### What's Already Built

| Component | Status | Notes |
|-----------|--------|-------|
| SaltEdge v6 Provider | ✅ Complete | RSA signing, customer management, connect sessions |
| Banking Service | ✅ Complete | Full CRUD, sync logic, webhook handling |
| Database Schema | ✅ Complete | All models defined in Prisma |
| Backend API Routes | ✅ Complete | All endpoints implemented |
| Frontend Pages | ✅ Complete | /banking page and /banking/callback |
| Frontend Components | ✅ Complete | AccountList, BankingLinkButton, etc. |
| Webhook Controllers | ✅ Complete | notify, success, fail handlers |
| OAuth Flow | ⚠️ 90% | Works but needs end-to-end testing |
| Account Sync | ⚠️ 80% | Framework ready, needs real data testing |
| Transaction Import | ⚠️ 70% | Logic exists, needs integration testing |

### What's Been Tested

- ✅ SaltEdge API authentication (RSA signature)
- ✅ Customer creation and lookup
- ✅ Connect session generation (returns valid OAuth URL)
- ✅ Fake provider list endpoint

### What Needs Testing/Fixing

1. **End-to-end OAuth flow** - Complete the flow in browser
2. **Account data storage** - Verify accounts are saved correctly
3. **Transaction sync** - Test transaction import from SaltEdge
4. **UI display** - Ensure accounts show in frontend
5. **Webhook integration** - Test webhook callbacks

---

## MVP Feature Scope

### Phase 1: Core Flow (Priority: CRITICAL)
**Goal**: User can connect a fake bank and see linked accounts

| Task | Effort | Dependencies |
|------|--------|--------------|
| 1.1 Fix callback URL handling | 2h | None |
| 1.2 Test complete OAuth flow with fake provider | 2h | 1.1 |
| 1.3 Verify account storage in database | 1h | 1.2 |
| 1.4 Display linked accounts in UI | 2h | 1.3 |
| 1.5 Handle connection errors gracefully | 2h | 1.4 |

**Acceptance Criteria**:
- User clicks "Link Bank Account"
- Redirected to SaltEdge OAuth
- Uses fake credentials (username/secret)
- Redirected back to MoneyWise
- Sees linked account in dashboard

### Phase 2: Transaction Sync (Priority: HIGH)
**Goal**: User can see transactions from linked accounts

| Task | Effort | Dependencies |
|------|--------|--------------|
| 2.1 Implement transaction fetch from SaltEdge | 3h | Phase 1 |
| 2.2 Map SaltEdge transactions to our schema | 2h | 2.1 |
| 2.3 Store transactions in database | 2h | 2.2 |
| 2.4 Display transactions in UI | 3h | 2.3 |
| 2.5 Manual sync button functionality | 1h | 2.4 |

**Acceptance Criteria**:
- Transactions auto-sync on connection
- User can trigger manual sync
- Transactions display with date, amount, description
- Sync status shows in UI

### Phase 3: Account Management (Priority: MEDIUM)
**Goal**: User can manage their linked accounts

| Task | Effort | Dependencies |
|------|--------|--------------|
| 3.1 Account details view | 2h | Phase 2 |
| 3.2 Revoke connection functionality | 2h | 3.1 |
| 3.3 Reconnect expired connections | 3h | 3.2 |
| 3.4 Multiple account support | 2h | 3.3 |

**Acceptance Criteria**:
- User can view account details
- User can disconnect a bank
- User can reconnect expired links
- User can have multiple banks connected

### Phase 4: Polish & Production (Priority: LOW for MVP)
**Goal**: Production-ready integration

| Task | Effort | Dependencies |
|------|--------|--------------|
| 4.1 Error handling improvements | 3h | Phase 3 |
| 4.2 Loading states and animations | 2h | 4.1 |
| 4.3 Webhook signature verification | 2h | 4.2 |
| 4.4 Rate limiting and retry logic | 3h | 4.3 |
| 4.5 E2E test suite completion | 4h | 4.4 |

---

## Technical Requirements

### Immediate Fixes Needed

#### 1. Callback URL Configuration
The callback URL needs to point to the frontend callback page, not the webhook:

```typescript
// Current (incorrect for OAuth redirect):
return_to: 'http://localhost:3001/api/banking/webhook'

// Should be:
return_to: 'http://localhost:3000/banking/callback'
```

#### 2. State Parameter for CSRF
The OAuth state needs to be generated and validated:

```typescript
// Frontend: Generate state before redirect
const state = crypto.randomUUID();
sessionStorage.setItem('banking_oauth_state', state);

// Include in initiate-link request
const { redirectUrl } = await initiateBankingLink({
  providerCode,
  countryCode,
  state // Pass to backend
});

// Backend: Append state to redirect URL
const connectUrl = `${session.connectUrl}&state=${state}`;
```

#### 3. Connection ID Flow
After OAuth, SaltEdge redirects with connection_id. We need to:
1. Extract connection_id from callback URL
2. Call completeBankingLink with it
3. Fetch and store accounts

### Environment Setup

```bash
# Required in .env.development
BANKING_INTEGRATION_ENABLED=true
SALTEDGE_APP_ID=your_app_id
SALTEDGE_SECRET=your_secret
SALTEDGE_PRIVATE_KEY_PATH=/path/to/private.pem
SALTEDGE_ENVIRONMENT=sandbox

# Frontend callback URL (for OAuth redirect)
NEXT_PUBLIC_BANKING_CALLBACK_URL=http://localhost:3000/banking/callback
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BANKING MVP FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

1. USER INITIATES CONNECTION
   ┌──────────┐     POST /initiate-link      ┌──────────┐
   │ Frontend │ ──────────────────────────▶  │ Backend  │
   │ /banking │                              │   API    │
   └──────────┘                              └────┬─────┘
                                                  │
                                                  ▼
                                        ┌─────────────────┐
                                        │ Create Customer │
                                        │ Create Session  │
                                        │ Save Connection │
                                        └────────┬────────┘
                                                 │
   ┌──────────┐     { redirectUrl }              │
   │ Frontend │ ◀────────────────────────────────┘
   └────┬─────┘
        │
        │ window.open(redirectUrl)
        ▼
   ┌──────────────┐
   │   SaltEdge   │  User authorizes access
   │ OAuth Widget │  with fake credentials
   └──────┬───────┘
          │
          │ Redirect to /banking/callback?connection_id=xxx
          ▼
   ┌────────────────┐
   │    Callback    │  Extract connection_id
   │     Page       │  Validate state
   └───────┬────────┘
           │
           │ POST /complete-link { connectionId }
           ▼
   ┌──────────────┐
   │   Backend    │  Fetch accounts from SaltEdge
   │   Service    │  Store in database
   └──────┬───────┘
          │
          │ Return account list
          ▼
   ┌──────────────┐
   │   Frontend   │  Display linked accounts
   │  /banking    │  Show sync status
   └──────────────┘

2. WEBHOOK FLOW (Parallel)
   ┌──────────┐     POST /webhook/success     ┌──────────┐
   │ SaltEdge │ ─────────────────────────────▶│ Backend  │
   │   API    │                               │ Webhook  │
   └──────────┘                               └────┬─────┘
                                                   │
                                         Auto-sync accounts
                                         Update connection status
```

---

## Testing Strategy

### Manual Testing Checklist

```markdown
## Phase 1 Testing

- [ ] Start backend with correct env vars
- [ ] Start frontend on localhost:3000
- [ ] Login as test user
- [ ] Navigate to /banking
- [ ] Click "Link Bank Account"
- [ ] Verify redirect to SaltEdge
- [ ] Select fakebank_simple_xf
- [ ] Enter credentials: username/secret
- [ ] Complete authorization
- [ ] Verify redirect to /banking/callback
- [ ] Verify success message
- [ ] Navigate to /banking
- [ ] Verify account appears in list
- [ ] Check database for account record

## Phase 2 Testing

- [ ] Verify transactions synced automatically
- [ ] Click "Sync Now" button
- [ ] Verify transactions appear in UI
- [ ] Check date, amount, description display
- [ ] Verify sync timestamp updates

## Phase 3 Testing

- [ ] Click on account for details
- [ ] Test revoke connection
- [ ] Verify account marked as disconnected
- [ ] Test reconnect flow
```

### Fake Provider Credentials

| Provider | Username | Password | Notes |
|----------|----------|----------|-------|
| fakebank_simple_xf | username | secret | Basic auth |
| fakebank_oauth_xf | username | secret | OAuth flow |
| fakebank_interactive_xf | username | secret | MFA required |

---

## Implementation Order

### Sprint 1: Core Connection (Days 1-2)

1. **Fix callback URL** in SaltEdgeProvider
2. **Test OAuth flow** end-to-end
3. **Verify account storage** in database
4. **Fix UI account display** if needed

### Sprint 2: Transaction Sync (Days 3-4)

1. **Implement transaction fetch** in banking service
2. **Map transaction fields** to our schema
3. **Store transactions** with proper relationships
4. **Display transactions** in UI

### Sprint 3: Polish (Days 5-6)

1. **Error handling** improvements
2. **Loading states** and UX polish
3. **Manual sync** functionality
4. **Account management** (revoke, details)

---

## Success Metrics

### MVP Complete When:

1. ✅ User can connect fake bank account in < 2 minutes
2. ✅ Linked accounts display with balance and name
3. ✅ Transactions sync and display correctly
4. ✅ User can disconnect account
5. ✅ Errors are handled gracefully with user feedback
6. ✅ Flow works reliably 95%+ of attempts

### KPIs to Track:

- Connection success rate
- Average time to connect
- Transaction sync accuracy
- User drop-off points

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SaltEdge API changes | High | Low | Version lock, monitoring |
| OAuth redirect issues | Medium | Medium | Thorough testing, fallback |
| Transaction data mismatch | Medium | Medium | Schema validation |
| Webhook delivery failures | Low | Medium | Manual sync fallback |
| Rate limiting | Low | Low | Exponential backoff |

---

## Next Steps

1. **Immediate**: Fix callback URL and test OAuth flow
2. **This Week**: Complete Phase 1 (Core Connection)
3. **Next Week**: Complete Phase 2 (Transaction Sync)
4. **Following**: Phase 3-4 as time permits

---

## Appendix: SaltEdge Response Examples

### Account Response
```json
{
  "data": [
    {
      "id": "123456789",
      "name": "Main Account",
      "nature": "account",
      "balance": 1234.56,
      "currency_code": "EUR",
      "extra": {
        "iban": "DE89370400440532013000",
        "available_amount": 1200.00
      },
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### Transaction Response
```json
{
  "data": [
    {
      "id": "987654321",
      "duplicated": false,
      "mode": "normal",
      "status": "posted",
      "made_on": "2025-01-14",
      "amount": -45.99,
      "currency_code": "EUR",
      "description": "Amazon Purchase",
      "category": "shopping",
      "extra": {
        "merchant_name": "Amazon",
        "original_amount": -45.99
      }
    }
  ]
}
```
