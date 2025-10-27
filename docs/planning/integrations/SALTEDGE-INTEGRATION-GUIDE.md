# SaltEdge Integration Guide - MoneyWise MVP

**Status**: Ready for Implementation
**Target Timeline**: 2-3 months
**Budget**: €0/month MVP (under 100 connections)
**Italian Banks**: All 4 target banks fully supported

---

## Quick Start (15 minutes)

### 1. Create SaltEdge Developer Account

1. Visit: https://www.saltedge.com/users/sign_up
2. Sign up with email
3. Create developer application
4. Generate API credentials:
   - **Client ID**: Store securely in `.env.local`
   - **Secret**: Store securely in vault
5. Access developer console: https://www.saltedge.com/dashboard

### 2. Get Free Tier Details

- **Free Tier**: 100 live bank connections/month
- **Sandbox**: Unlimited connections for testing
- **Cost**: €0/month (until exceeding 100 connections)
- **Upgrade**: Automatic when hitting 100 connections (no overage charges, just billing)

### 3. Test Italian Banks

Available in sandbox immediately:
1. Intesa Sanpaolo
2. UniCredit
3. Fineco Bank
4. Monte dei Paschi di Siena (MPS)
5. + 100 more Italian banks

---

## API Documentation

### Official Resources

- **Main Docs**: https://docs.saltedge.com/general/v5/
- **Account Information API**: https://docs.saltedge.com/account_information/v5/
- **API Reference**: https://api.saltedge.com/docs
- **GitHub Examples**: https://github.com/saltedge

### Key Endpoints

#### Authentication
```bash
POST https://api.saltedge.com/api/v5/sessions
```
Required: `client_id`, `secret`, `signature`

#### Create Connection (Requisition)
```bash
POST https://api.saltedge.com/api/v5/connections
```
Initiates OAuth flow with Italian bank

#### Get Connection Status
```bash
GET https://api.saltedge.com/api/v5/connections/:id
```
Check if user completed bank authorization

#### Fetch Accounts
```bash
GET https://api.saltedge.com/api/v5/accounts?connection_id=:id
```
List all accounts from linked connection

#### Fetch Transactions
```bash
GET https://api.saltedge.com/api/v5/transactions?account_id=:id&from_date=2025-01-01
```
90-day transaction history available

---

## MoneyWise Integration Points

### Database Schema Requirements

```prisma
model Account {
  // Existing fields
  id            String   @id @default(cuid())
  userId        String

  // SaltEdge integration fields
  saltEdgeConnectionId  String?    @unique
  saltEdgeCustomerId    String?
  bankingProvider       BankingProvider? // ENUM: MANUAL, SALTEDGE, [TINK], [YAPILY]

  // Sync tracking
  lastSyncedAt          DateTime?
  syncStatus            SyncStatus  // ENUM: PENDING, SYNCING, SYNCED, ERROR, DISCONNECTED
  syncError             String?

  // Banking metadata
  bankName              String?
  bankCountry           String?
  accountHolderName     String?
  accountType           String?     // checking, savings, credit, etc.
}

model BankingConnection {
  id                String   @id @default(cuid())
  userId            String
  provider          BankingProvider // SALTEDGE

  // SaltEdge specific
  connectionId      String   @unique
  connectionSecret  String   // Encrypted

  // Status tracking
  status            String   // pending, authorized, revoked
  redirectUrl       String?  // OAuth flow URL

  // Dates
  createdAt         DateTime @default(now())
  authorizedAt      DateTime?
  expiresAt         DateTime? // For session tokens
}

model BankingSyncLog {
  id                String   @id @default(cuid())
  accountId         String
  provider          String   // SALTEDGE

  // Sync details
  syncStatus        String   // PENDING, SYNCING, SYNCED, ERROR
  startedAt         DateTime @default(now())
  completedAt       DateTime?

  // Results
  accountsSynced    Int?
  transactionsSynced Int?

  // Error tracking
  error             String?
  errorCode         String?
}
```

### API Endpoints (NestJS)

#### 1. Initiate Banking Link
```typescript
POST /api/banking/initiate-link
Authorization: Bearer JWT_TOKEN

Response:
{
  "redirectUrl": "https://saltedge.com/connect/...",
  "connectionId": "abc123"
}
```

User redirected to SaltEdge OAuth page, selects Italian bank, authorizes access.

#### 2. Complete Banking Link (Callback)
```typescript
POST /api/banking/complete-link
Authorization: Bearer JWT_TOKEN
Body: { "connectionId": "abc123" }

Response:
[
  {
    "id": "account-1",
    "name": "Conto Corrente Intesa",
    "iban": "IT60X0123456789...",
    "balance": 5000.00,
    "currency": "EUR",
    "type": "checking"
  }
]
```

Creates Account records in MoneyWise database.

#### 3. Get Linked Accounts
```typescript
GET /api/banking/accounts
Authorization: Bearer JWT_TOKEN

Response:
[
  {
    "id": "account-1",
    "bankName": "Intesa Sanpaolo",
    "accountType": "checking",
    "currentBalance": 5000.00,
    "lastSyncedAt": "2025-01-15T10:30:00Z",
    "syncStatus": "SYNCED"
  }
]
```

#### 4. Trigger Sync
```typescript
POST /api/banking/sync
Authorization: Bearer JWT_TOKEN
Body: { "accountId": "account-1" }

Response:
{
  "syncJobId": "sync-12345",
  "status": "SYNCING"
}
```

Fetches latest transactions and balance from SaltEdge.

#### 5. Get Sync Status
```typescript
GET /api/banking/sync/:syncJobId
Authorization: Bearer JWT_TOKEN

Response:
{
  "status": "SYNCED",
  "startedAt": "2025-01-15T10:30:00Z",
  "completedAt": "2025-01-15T10:35:00Z",
  "transactionsSynced": 42,
  "error": null
}
```

---

## Implementation Checklist

### Week 1: Setup & Testing
- [ ] SaltEdge developer account created
- [ ] API credentials stored securely
- [ ] Test connection to Intesa Sanpaolo (sandbox)
- [ ] Test connection to UniCredit (sandbox)
- [ ] Test connection to Fineco (sandbox)
- [ ] Test connection to MPS (sandbox)
- [ ] Verified 90-day transaction history retrieval
- [ ] Verified balance update functionality

### Week 2-3: Backend Development
- [ ] Database migrations created
- [ ] Provider abstraction layer implemented
- [ ] SaltEdgeProvider class completed
- [ ] BankingService created
- [ ] API endpoints implemented (initiate, complete, sync)
- [ ] Background sync scheduler configured
- [ ] Error handling and retries implemented

### Week 4: Frontend Integration
- [ ] Bank selection UI created
- [ ] OAuth redirect handling
- [ ] Account dashboard showing linked accounts
- [ ] Manual sync button
- [ ] Transaction history view

### Week 5: Testing & Monitoring
- [ ] Integration tests passing
- [ ] Security audit completed
- [ ] Cost monitoring dashboard setup
- [ ] Production readiness checklist

---

## Cost Management

### Free Tier Limits
- **100 live connections/month** = 100 users
- **4 syncs/day per account** (scheduled limits)
- **No overage protection** (must upgrade when hitting limit)

### Budget Tracking

Create dashboard to track:
```javascript
// Daily check
GET /api/banking/cost-tracking

Response:
{
  "totalConnections": 42,
  "freeLimit": 100,
  "usagePercent": 42,
  "upgradeThreshold": 80,
  "upgradeThresholdConnections": 80,
  "costPerMonth": 0  // Current
}
```

### Upgrade Triggers

| Connections | Status | Action |
|-------------|--------|--------|
| 0-80 | ✅ Safe | Continue MVP |
| 80-95 | ⚠️ Warning | Prepare sales contact |
| 95-100 | 🚨 Critical | Contact SaltEdge sales immediately |
| 100+ | ❌ Requires upgrade | Plan migration to Tink or negotiate |

### Fallback Strategy

**If SaltEdge free tier insufficient**:
1. Contact SaltEdge sales for production pricing quote
2. In parallel: Request Tink quote (€0.50/user guaranteed)
3. Evaluate total cost comparison
4. Proceed with most cost-effective option

**Worst case**: Switch from SaltEdge to Tink
- Estimated cost: €0.50/user/month (transparent)
- Integration effort: 1-2 weeks (provider-agnostic architecture)
- No data loss (historical transactions preserved)

---

## Development Environment Setup

### Environment Variables
```bash
# .env.local
SALTEDGE_CLIENT_ID=your_client_id
SALTEDGE_SECRET=your_secret
SALTEDGE_API_URL=https://api.saltedge.com/api/v5

# Feature flags
BANKING_INTEGRATION_ENABLED=true
BANKING_SYNC_ENABLED=true
BANKING_SYNC_INTERVAL=86400  # 24 hours in seconds
```

### NPM Packages
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "crypto-js": "^4.1.0",
    "bull": "^4.11.0"  // For job queue
  }
}
```

### Docker Services (If needed)
SaltEdge doesn't require local Docker services - all in cloud.

---

## Security Considerations

### API Key Management
- ✅ Store in `.env.local` (not git)
- ✅ Use GitHub Secrets for production
- ✅ Rotate periodically
- ✅ Never commit to repository

### OAuth Token Storage
- ✅ Never store user bank credentials
- ✅ Store connection secret encrypted in database
- ✅ Connection tokens managed by SaltEdge
- ✅ Rate limit OAuth requests

### Data Encryption
- ✅ Encrypt SaltEdge connection secrets at rest
- ✅ TLS for all API calls
- ✅ GDPR compliance (data deletion requests)
- ✅ Audit logging for account access

---

## Troubleshooting

### Common Issues

#### 1. "Connection Unauthorized"
```
Cause: OAuth flow interrupted or user denied access
Fix: Restart OAuth flow, guide user to re-authorize
```

#### 2. "No accounts found"
```
Cause: Bank doesn't support Account Info Service (rare)
Fix: User must select account during OAuth flow
Fallback: Support manual account entry
```

#### 3. "Transaction fetch failed"
```
Cause: Bank API temporarily unavailable (rare)
Fix: Retry with exponential backoff
Alert: Monitor retry rate and notify user
```

#### 4. "Approaching 100 connections"
```
Cause: MVP scale success
Action: Begin Tink quote/migration planning
Timeline: Contact sales 2 weeks before hitting limit
```

---

## Performance Metrics

### Target SLAs
- Connection auth flow: < 30 seconds
- Transaction fetch: < 5 seconds (per account)
- Daily sync completion: < 1 hour (all users)
- API latency (p95): < 2 seconds

### Monitoring
- Connection success rate: Target 99%
- Sync success rate: Target 99%
- Average transaction freshness: < 24 hours

---

## Additional Resources

### SaltEdge Community
- GitHub Issues: https://github.com/saltedge
- Slack Community: Available for enterprise users
- Email Support: support@saltedge.com

### Italy-Specific Resources
- Banking Regulatory Timeline: https://www.ecb.eu/paym/groups/html/
- PSD2 Compliance: https://ec.europa.eu/growth/tools-databases/regpro/

---

## Next Steps

1. **Today**: Create SaltEdge developer account
2. **This week**: Test all 4 Italian banks
3. **Next week**: Begin backend implementation
4. **Week 3**: Frontend OAuth flow
5. **Week 4**: Testing and monitoring setup

---

**Document Version**: 1.0 (Oct 23, 2025)
**Status**: Ready for Implementation
**Last Updated**: Oct 23, 2025
