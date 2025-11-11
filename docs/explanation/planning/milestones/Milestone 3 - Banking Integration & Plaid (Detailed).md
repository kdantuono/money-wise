# Milestone 3: Banking Integration & Plaid - Detailed Breakdown
## 42 Points → 156 Micro-Tasks

---

## Quick Reference for Claude Code

```yaml
Total Tasks: 156
Parallel Branches: 7
Estimated Time: Week 4
Critical Path: TASK-012 (Plaid setup) → TASK-014 (accounts) → TASK-016 (transactions)
Dependencies: Milestones 1-2 must be complete
```

---

## [EPIC-003] Plaid Integration (26 points → 95 tasks)

### [STORY-005] Plaid Connection Flow (13 points → 48 tasks)

#### Phase 3.1: Plaid Setup and Configuration

##### [TASK-012-001] Create Plaid Configuration Module
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/config`
- **File**: `apps/backend/app/core/config/plaid.py`
- **Dependencies**: Milestone 2 complete
```python
from pydantic import BaseSettings

class PlaidSettings(BaseSettings):
    client_id: str
    secret: str
    environment: str  # sandbox/development/production
    webhook_url: str
    
    class Config:
        env_prefix = "PLAID_"
```
**Acceptance Criteria**:
- [ ] Environment variables loaded
- [ ] Validation for required fields
- [ ] Environment-specific settings
- [ ] Webhook URL construction

---

##### [TASK-012-002] Create Plaid Client Factory
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/client-factory`
- **File**: `apps/backend/app/services/plaid/client.py`
- **Dependencies**: [TASK-012-001]
```python
from plaid.api import plaid_api
from plaid.configuration import Configuration

def create_plaid_client() -> PlaidApi:
    configuration = Configuration(
        host=get_plaid_host(),
        api_key={'clientId': settings.client_id, 'secret': settings.secret}
    )
    return plaid_api.PlaidApi(ApiClient(configuration))
```
**Acceptance Criteria**:
- [ ] Singleton pattern
- [ ] Environment detection
- [ ] Error handling
- [ ] Connection pooling

---

##### [TASK-012-003] Define Plaid Data Models
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/models`
- **File**: `apps/backend/app/models/plaid.py`
- **Dependencies**: Database models from Milestone 2
```python
class PlaidItem(BaseModel):
    __tablename__ = "plaid_items"
    
    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    item_id = Column(String(255), unique=True)
    access_token = Column(String(255))  # Encrypted
    institution_id = Column(String(50))
    institution_name = Column(String(255))
```
**Acceptance Criteria**:
- [ ] Item tracking model
- [ ] Token storage (encrypted)
- [ ] Institution metadata
- [ ] Consent tracking fields

---

##### [TASK-012-004] Create Plaid Schema Definitions
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/schemas`
- **File**: `apps/backend/app/schemas/plaid.py`
- **Dependencies**: None
```python
class LinkTokenRequest(BaseModel):
    user_id: str
    
class LinkTokenResponse(BaseModel):
    link_token: str
    expiration: datetime
    
class PublicTokenExchange(BaseModel):
    public_token: str
    metadata: Optional[dict]
```
**Acceptance Criteria**:
- [ ] Request validation schemas
- [ ] Response schemas
- [ ] Webhook payload schemas
- [ ] Error response schemas

---

##### [TASK-012-005] Create Plaid Error Handler
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/error-handler`
- **File**: `apps/backend/app/services/plaid/errors.py`
- **Dependencies**: [TASK-012-002]
```python
class PlaidErrorHandler:
    def handle_error(self, error: PlaidError) -> dict:
        # Map Plaid errors to user-friendly messages
        # Log for monitoring
        # Trigger alerts if needed
        pass
```
**Acceptance Criteria**:
- [ ] Error code mapping
- [ ] User-friendly messages
- [ ] Logging integration
- [ ] Retry logic for transient errors

---

##### [TASK-012-006] Create Link Token Service
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/link-token-service`
- **File**: `apps/backend/app/services/plaid/link_token.py`
- **Dependencies**: [TASK-012-002]
```python
class LinkTokenService:
    async def create_link_token(self, user_id: str) -> str:
        request = LinkTokenCreateRequest(
            products=[Products('transactions')],
            client_name="MoneyWise",
            country_codes=[CountryCode('IT'), CountryCode('GB')],
            language='it',
            user=LinkTokenCreateRequestUser(client_user_id=user_id)
        )
        response = await self.client.link_token_create(request)
        return response['link_token']
```
**Acceptance Criteria**:
- [ ] Multi-country support
- [ ] Product configuration
- [ ] Language settings
- [ ] User context passing

---

##### [TASK-012-007] Create Link Token API Endpoint
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/link-token-endpoint`
- **File**: `apps/backend/app/api/v1/endpoints/plaid/link.py`
- **Dependencies**: [TASK-012-006]
```python
@router.post("/link/token", response_model=LinkTokenResponse)
async def create_link_token(
    current_user: User = Depends(get_current_user),
    service: LinkTokenService = Depends(get_link_token_service)
):
    token = await service.create_link_token(str(current_user.id))
    return LinkTokenResponse(link_token=token)
```
**Acceptance Criteria**:
- [ ] Authentication required
- [ ] Rate limiting applied
- [ ] Response formatting
- [ ] Error handling

---

##### [TASK-012-008] Create Public Token Exchange Service
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/token-exchange`
- **File**: `apps/backend/app/services/plaid/exchange.py`
- **Dependencies**: [TASK-012-002, TASK-012-003]
```python
class TokenExchangeService:
    async def exchange_public_token(
        self, 
        user_id: str, 
        public_token: str,
        metadata: dict
    ) -> str:
        # Exchange public token for access token
        # Store encrypted token
        # Save institution info
        # Trigger initial sync
        pass
```
**Acceptance Criteria**:
- [ ] Token exchange with Plaid
- [ ] Secure token storage
- [ ] Metadata persistence
- [ ] Initial sync trigger

---

##### [TASK-012-009] Create Token Encryption Service
- **Points**: 0.5
- **Agent**: Claude-Security
- **Branch**: `plaid/encryption`
- **File**: `apps/backend/app/services/plaid/encryption.py`
- **Dependencies**: Security setup from Milestone 2
```python
class TokenEncryption:
    def encrypt_token(self, token: str) -> str:
        # AES-256 encryption
        # Key rotation support
        pass
    
    def decrypt_token(self, encrypted: str) -> str:
        # Secure decryption
        pass
```
**Acceptance Criteria**:
- [ ] AES-256-GCM encryption
- [ ] Key management
- [ ] Rotation support
- [ ] Audit logging

---

##### [TASK-012-010] Create Exchange Token Endpoint
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/exchange-endpoint`
- **File**: `apps/backend/app/api/v1/endpoints/plaid/exchange.py`
- **Dependencies**: [TASK-012-008]
```python
@router.post("/link/exchange")
async def exchange_public_token(
    data: PublicTokenExchange,
    current_user: User = Depends(get_current_user),
    service: TokenExchangeService = Depends()
):
    await service.exchange_public_token(
        str(current_user.id),
        data.public_token,
        data.metadata
    )
    return {"status": "success"}
```
**Acceptance Criteria**:
- [ ] Input validation
- [ ] Idempotency support
- [ ] Success confirmation
- [ ] Error responses

---

##### [TASK-012-011] Create Plaid Repository Interface
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/repository-interface`
- **File**: `apps/backend/app/repositories/interfaces/plaid.py`
- **Dependencies**: Repository pattern from Milestone 2
```python
class IPlaidRepository(ABC):
    @abstractmethod
    async def store_item(self, user_id: str, item_data: dict) -> PlaidItem:
        pass
    
    @abstractmethod
    async def get_user_items(self, user_id: str) -> List[PlaidItem]:
        pass
```
**Acceptance Criteria**:
- [ ] CRUD operations
- [ ] User filtering
- [ ] Token management
- [ ] Soft delete support

---

##### [TASK-012-012] Implement Plaid Repository
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/repository-impl`
- **File**: `apps/backend/app/repositories/plaid.py`
- **Dependencies**: [TASK-012-011]
```python
class PlaidRepository(BaseRepository[PlaidItem], IPlaidRepository):
    async def store_item(self, user_id: str, item_data: dict) -> PlaidItem:
        # Create or update item
        # Encrypt sensitive data
        # Return item
        pass
```
**Acceptance Criteria**:
- [ ] Secure storage
- [ ] Upsert logic
- [ ] Query optimization
- [ ] Transaction support

---

##### [TASK-012-013] Create Account Fetching Service
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/accounts-fetch`
- **File**: `apps/backend/app/services/plaid/accounts.py`
- **Dependencies**: [TASK-012-008]
```python
class PlaidAccountService:
    async def fetch_accounts(self, access_token: str) -> List[Account]:
        request = AccountsGetRequest(access_token=access_token)
        response = await self.client.accounts_get(request)
        return self.map_accounts(response['accounts'])
```
**Acceptance Criteria**:
- [ ] Account retrieval
- [ ] Balance updates
- [ ] Type mapping
- [ ] Error handling

---

##### [TASK-012-014] Create Account Mapping Service
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/account-mapper`
- **File**: `apps/backend/app/services/plaid/mappers/account.py`
- **Dependencies**: [TASK-012-013]
```python
class AccountMapper:
    def map_plaid_account(self, plaid_account: dict) -> Account:
        # Map Plaid account to internal model
        # Handle different account types
        # Currency conversion
        pass
```
**Acceptance Criteria**:
- [ ] Type conversion
- [ ] Currency handling
- [ ] Balance mapping
- [ ] Metadata preservation

---

##### [TASK-012-015] Create Account Sync Service
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/account-sync`
- **File**: `apps/backend/app/services/plaid/sync/accounts.py`
- **Dependencies**: [TASK-012-014]
```python
class AccountSyncService:
    async def sync_accounts(self, user_id: str, plaid_item_id: str):
        # Fetch from Plaid
        # Compare with existing
        # Update or create
        # Track changes
        pass
```
**Acceptance Criteria**:
- [ ] Delta sync logic
- [ ] Create/update/delete
- [ ] Change tracking
- [ ] Notification triggers

---

##### [TASK-012-016] Create Transaction Fetch Service - Basic
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/transactions-basic`
- **File**: `apps/backend/app/services/plaid/transactions/fetch.py`
- **Dependencies**: [TASK-012-008]
```python
class TransactionFetchService:
    async def fetch_transactions(
        self,
        access_token: str,
        start_date: date,
        end_date: date
    ) -> List[Transaction]:
        request = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date
        )
        response = await self.client.transactions_get(request)
        return response['transactions']
```
**Acceptance Criteria**:
- [ ] Date range support
- [ ] Basic pagination
- [ ] Error handling
- [ ] Response validation

---

##### [TASK-012-017] Create Transaction Pagination Service
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/transactions-pagination`
- **File**: `apps/backend/app/services/plaid/transactions/paginate.py`
- **Dependencies**: [TASK-012-016]
```python
class TransactionPaginator:
    async def fetch_all_transactions(
        self,
        access_token: str,
        start_date: date
    ) -> AsyncIterator[List[Transaction]]:
        offset = 0
        while True:
            batch = await self.fetch_batch(access_token, start_date, offset)
            if not batch:
                break
            yield batch
            offset += len(batch)
```
**Acceptance Criteria**:
- [ ] Async iteration
- [ ] Batch processing
- [ ] Memory efficiency
- [ ] Progress tracking

---

##### [TASK-012-018] Create Transaction Mapper Service
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/transaction-mapper`
- **File**: `apps/backend/app/services/plaid/mappers/transaction.py`
- **Dependencies**: None
```python
class TransactionMapper:
    def map_plaid_transaction(self, plaid_tx: dict) -> Transaction:
        return Transaction(
            plaid_transaction_id=plaid_tx['transaction_id'],
            amount=abs(plaid_tx['amount']),  # Plaid uses negative for debits
            description=plaid_tx['name'],
            merchant_name=plaid_tx.get('merchant_name'),
            transaction_date=plaid_tx['date']
        )
```
**Acceptance Criteria**:
- [ ] Field mapping
- [ ] Amount normalization
- [ ] Null handling
- [ ] Category mapping

---

##### [TASK-012-019] Create Transaction Deduplication
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/deduplication`
- **File**: `apps/backend/app/services/plaid/transactions/dedup.py`
- **Dependencies**: [TASK-012-018]
```python
class TransactionDeduplicator:
    async def deduplicate(
        self,
        user_id: str,
        transactions: List[Transaction]
    ) -> List[Transaction]:
        # Check existing by plaid_transaction_id
        # Handle pending transactions
        # Return only new/updated
        pass
```
**Acceptance Criteria**:
- [ ] ID-based dedup
- [ ] Pending transaction handling
- [ ] Update detection
- [ ] Performance optimization

---

##### [TASK-012-020] Create Transaction Sync Service
- **Points**: 0.8
- **Agent**: Claude-Banking
- **Branch**: `plaid/transaction-sync`
- **File**: `apps/backend/app/services/plaid/sync/transactions.py`
- **Dependencies**: [TASK-012-017, TASK-012-019]
```python
class TransactionSyncService:
    async def sync_transactions(
        self,
        user_id: str,
        plaid_item_id: str,
        start_date: Optional[date] = None
    ):
        # Determine sync window
        # Fetch transactions
        # Deduplicate
        # Bulk insert
        # Trigger categorization
        pass
```
**Acceptance Criteria**:
- [ ] Smart sync window
- [ ] Bulk operations
- [ ] Progress tracking
- [ ] Event emission

---

##### [TASK-012-021] Create Webhook Verification Service
- **Points**: 0.5
- **Agent**: Claude-Security
- **Branch**: `plaid/webhook-verification`
- **File**: `apps/backend/app/services/plaid/webhooks/verify.py`
- **Dependencies**: [TASK-012-001]
```python
class WebhookVerification:
    async def verify_webhook(
        self,
        body: bytes,
        headers: dict
    ) -> bool:
        # Verify JWT signature
        # Check timestamp
        # Validate payload
        pass
```
**Acceptance Criteria**:
- [ ] JWT verification
- [ ] Timestamp validation
- [ ] Replay protection
- [ ] Logging

---

##### [TASK-012-022] Create Webhook Router
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/webhook-router`
- **File**: `apps/backend/app/services/plaid/webhooks/router.py`
- **Dependencies**: [TASK-012-021]
```python
class WebhookRouter:
    async def route(self, webhook_type: str, webhook_code: str, item_id: str):
        handlers = {
            "TRANSACTIONS": {
                "INITIAL_UPDATE": self.handle_initial_update,
                "DEFAULT_UPDATE": self.handle_default_update,
            }
        }
        handler = handlers.get(webhook_type, {}).get(webhook_code)
        if handler:
            await handler(item_id)
```
**Acceptance Criteria**:
- [ ] Event routing
- [ ] Handler mapping
- [ ] Unknown event handling
- [ ] Error recovery

---

##### [TASK-012-023] Create Transaction Update Handler
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/webhook-transactions`
- **File**: `apps/backend/app/services/plaid/webhooks/handlers/transactions.py`
- **Dependencies**: [TASK-012-022, TASK-012-020]
```python
class TransactionWebhookHandler:
    async def handle_transactions_update(
        self,
        item_id: str,
        new_transactions: int
    ):
        # Get item details
        # Trigger sync
        # Notify user
        pass
```
**Acceptance Criteria**:
- [ ] Async processing
- [ ] Sync triggering
- [ ] User notification
- [ ] Error handling

---

##### [TASK-012-024] Create Webhook Endpoint
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/webhook-endpoint`
- **File**: `apps/backend/app/api/v1/endpoints/webhooks/plaid.py`
- **Dependencies**: [TASK-012-022]
```python
@router.post("/webhooks/plaid")
async def plaid_webhook(
    request: Request,
    router: WebhookRouter = Depends()
):
    body = await request.body()
    headers = request.headers
    
    # Verify webhook
    # Parse payload
    # Route to handler
    # Return 200 quickly
    pass
```
**Acceptance Criteria**:
- [ ] Signature verification
- [ ] Async processing
- [ ] Quick response
- [ ] Error logging

---

##### [TASK-012-025] Create Rate Limiting for Plaid
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/rate-limiting`
- **File**: `apps/backend/app/services/plaid/rate_limit.py`
- **Dependencies**: Rate limiting from Milestone 2
```python
class PlaidRateLimiter:
    FREE_TIER_DAILY_REFRESH = 2
    PREMIUM_TIER_DAILY_REFRESH = None  # Unlimited
    
    async def check_refresh_limit(self, user_id: str, tier: str) -> bool:
        # Check Redis counter
        # Apply tier limits
        # Return availability
        pass
```
**Acceptance Criteria**:
- [ ] Tier-based limits
- [ ] Redis counters
- [ ] Reset logic
- [ ] Limit headers

---

##### [TASK-012-026] Create Manual Refresh Service
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/manual-refresh`
- **File**: `apps/backend/app/services/plaid/refresh.py`
- **Dependencies**: [TASK-012-025, TASK-012-020]
```python
class ManualRefreshService:
    async def refresh_accounts(self, user_id: str):
        # Check rate limit
        # Get all items
        # Sync accounts
        # Sync transactions
        # Update last refresh
        pass
```
**Acceptance Criteria**:
- [ ] Rate limit check
- [ ] All accounts sync
- [ ] Progress tracking
- [ ] User feedback

---

##### [TASK-012-027] Create Refresh Endpoint
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/refresh-endpoint`
- **File**: `apps/backend/app/api/v1/endpoints/plaid/refresh.py`
- **Dependencies**: [TASK-012-026]
```python
@router.post("/accounts/refresh")
async def refresh_accounts(
    current_user: User = Depends(get_current_user),
    service: ManualRefreshService = Depends()
):
    await service.refresh_accounts(str(current_user.id))
    return {"status": "refreshing", "message": "Your accounts are being updated"}
```
**Acceptance Criteria**:
- [ ] Auth required
- [ ] Rate limit response
- [ ] Async processing
- [ ] Status feedback

---

##### [TASK-012-028] Create Institution Service
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/institutions`
- **File**: `apps/backend/app/services/plaid/institutions.py`
- **Dependencies**: [TASK-012-002]
```python
class InstitutionService:
    async def get_institution(self, institution_id: str) -> dict:
        # Fetch institution details
        # Cache result
        # Return metadata
        pass
```
**Acceptance Criteria**:
- [ ] Institution lookup
- [ ] Logo URLs
- [ ] Caching layer
- [ ] Fallback data

---

##### [TASK-012-029] Create Balance Service
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/balances`
- **File**: `apps/backend/app/services/plaid/balances.py`
- **Dependencies**: [TASK-012-013]
```python
class BalanceService:
    async def get_real_time_balance(
        self,
        access_token: str,
        account_id: str
    ) -> Decimal:
        # Fetch current balance
        # Handle currency
        # Return normalized
        pass
```
**Acceptance Criteria**:
- [ ] Real-time fetch
- [ ] Currency conversion
- [ ] Cache invalidation
- [ ] Error handling

---

##### [TASK-012-030] Create Plaid React Hook
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `plaid/react-hook`
- **File**: `apps/web/src/hooks/usePlaidLink.ts`
- **Dependencies**: Frontend setup from Milestone 2
```typescript
export const usePlaidLink = () => {
  const [linkToken, setLinkToken] = useState<string>()
  
  const onSuccess = useCallback((public_token: string, metadata: any) => {
    // Exchange token
    // Trigger sync
    // Update UI
  }, [])
  
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  })
  
  return { open, ready }
}
```
**Acceptance Criteria**:
- [ ] Token fetching
- [ ] Success handling
- [ ] Error handling
- [ ] Loading states

---

##### [TASK-012-031] Create Plaid Link Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `plaid/link-component`
- **File**: `apps/web/src/features/banking/components/PlaidLink.tsx`
- **Dependencies**: [TASK-012-030]
```typescript
export const PlaidLinkButton: React.FC = () => {
  const { open, ready } = usePlaidLink()
  
  return (
    <Button
      onClick={() => open()}
      disabled={!ready}
    >
      Connect Bank Account
    </Button>
  )
}
```
**Acceptance Criteria**:
- [ ] Button styling
- [ ] Disabled state
- [ ] Loading indicator
- [ ] Success feedback

---

##### [TASK-012-032] Create Account List Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `plaid/account-list`
- **File**: `apps/web/src/features/banking/components/AccountList.tsx`
- **Dependencies**: None
```typescript
export const AccountList: React.FC = () => {
  const accounts = useSelector(selectAccounts)
  
  return (
    <div>
      {accounts.map(account => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  )
}
```
**Acceptance Criteria**:
- [ ] Account cards
- [ ] Balance display
- [ ] Institution logos
- [ ] Actions menu

---

##### [TASK-012-033] Create Sync Status Component
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `plaid/sync-status`
- **File**: `apps/web/src/features/banking/components/SyncStatus.tsx`
- **Dependencies**: None
```typescript
export const SyncStatus: React.FC = () => {
  const syncStatus = useSelector(selectSyncStatus)
  const lastSync = useSelector(selectLastSync)
  
  return (
    <div>
      {/* Status indicator */}
      {/* Last sync time */}
      {/* Refresh button */}
    </div>
  )
}
```
**Acceptance Criteria**:
- [ ] Status states
- [ ] Time display
- [ ] Refresh action
- [ ] Rate limit display

---

##### [TASK-012-034] Create Refresh Button Component
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `plaid/refresh-button`
- **File**: `apps/web/src/features/banking/components/RefreshButton.tsx`
- **Dependencies**: [TASK-012-025]
```typescript
export const RefreshButton: React.FC = () => {
  const remainingRefreshes = useSelector(selectRemainingRefreshes)
  const [refreshing, setRefreshing] = useState(false)
  
  return (
    <Button
      onClick={handleRefresh}
      disabled={refreshing || remainingRefreshes === 0}
    >
      {remainingRefreshes > 0 
        ? `Refresh (${remainingRefreshes} left today)`
        : 'Refresh limit reached'}
    </Button>
  )
}
```
**Acceptance Criteria**:
- [ ] Remaining count
- [ ] Disabled states
- [ ] Loading state
- [ ] Limit messaging

---

##### [TASK-012-035] Create Banking Store Slice
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `plaid/store-slice`
- **File**: `apps/web/src/store/banking.ts`
- **Dependencies**: None
```typescript
const bankingSlice = createSlice({
  name: 'banking',
  initialState: {
    accounts: [],
    institutions: {},
    syncStatus: 'idle',
    lastSync: null,
  },
  reducers: {
    setAccounts: (state, action) => {
      state.accounts = action.payload
    },
    // More reducers
  }
})
```
**Acceptance Criteria**:
- [ ] Account state
- [ ] Sync status
- [ ] Error handling
- [ ] Loading states

---

##### [TASK-012-036] Create Banking API Client
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `plaid/api-client`
- **File**: `apps/web/src/services/banking.ts`
- **Dependencies**: [TASK-012-035]
```typescript
export const bankingAPI = {
  createLinkToken: async () => {
    const response = await api.post('/plaid/link/token')
    return response.data
  },
  exchangeToken: async (publicToken: string, metadata: any) => {
    const response = await api.post('/plaid/link/exchange', {
      public_token: publicToken,
      metadata
    })
    return response.data
  },
  // More methods
}
```
**Acceptance Criteria**:
- [ ] All endpoints
- [ ] Error handling
- [ ] Type safety
- [ ] Interceptors

---

##### [TASK-012-037] Create Plaid Unit Tests - Services
- **Points**: 0.5
- **Agent**: Copilot
- **Branch**: `plaid/test-services`
- **File**: `apps/backend/tests/unit/services/plaid/test_services.py`
- **Dependencies**: All Plaid services
```python
async def test_create_link_token():
    # Test link token creation
    pass

async def test_exchange_public_token():
    # Test token exchange
    pass
```
**Acceptance Criteria**:
- [ ] All services tested
- [ ] Mock Plaid client
- [ ] Error scenarios
- [ ] Edge cases

---

##### [TASK-012-038] Create Plaid Unit Tests - Webhooks
- **Points**: 0.5
- **Agent**: Copilot
- **Branch**: `plaid/test-webhooks`
- **File**: `apps/backend/tests/unit/services/plaid/test_webhooks.py`
- **Dependencies**: [TASK-012-021 through TASK-012-024]
```python
async def test_webhook_verification():
    # Test signature verification
    pass

async def test_webhook_routing():
    # Test event routing
    pass
```
**Acceptance Criteria**:
- [ ] Verification tests
- [ ] Routing tests
- [ ] Handler tests
- [ ] Error cases

---

##### [TASK-012-039] Create Plaid Integration Tests
- **Points**: 0.8
- **Agent**: Claude-Banking
- **Branch**: `plaid/integration-tests`
- **File**: `apps/backend/tests/integration/test_plaid_flow.py`
- **Dependencies**: [TASK-012-037, TASK-012-038]
```python
async def test_complete_plaid_flow():
    # Create link token
    # Exchange public token
    # Sync accounts
    # Sync transactions
    # Handle webhook
    pass
```
**Acceptance Criteria**:
- [ ] Full flow test
- [ ] Sandbox mode
- [ ] Data persistence
- [ ] Event handling

---

##### [TASK-012-040] Create Plaid E2E Tests
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `plaid/e2e-tests`
- **File**: `apps/web/tests/e2e/plaid.spec.ts`
- **Dependencies**: [TASK-012-031, TASK-012-032]
```typescript
test('user can connect bank account', async ({ page }) => {
  // Click connect button
  // Complete Plaid Link
  // Verify accounts appear
  // Check sync status
})
```
**Acceptance Criteria**:
- [ ] Link flow test
- [ ] Account display
- [ ] Sync verification
- [ ] Error handling

---

##### [TASK-012-041] Create Rate Limit Tests
- **Points**: 0.3
- **Agent**: Copilot
- **Branch**: `plaid/test-rate-limit`
- **File**: `apps/backend/tests/unit/services/plaid/test_rate_limit.py`
- **Dependencies**: [TASK-012-025]
```python
async def test_rate_limiting():
    # Test free tier limits
    # Test premium tier
    # Test reset logic
    pass
```
**Acceptance Criteria**:
- [ ] Limit enforcement
- [ ] Tier logic
- [ ] Reset timing
- [ ] Headers validation

---

##### [TASK-012-042] Create Plaid Mock Service
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/mock-service`
- **File**: `apps/backend/tests/mocks/plaid.py`
- **Dependencies**: None
```python
class MockPlaidClient:
    async def link_token_create(self, request):
        return {'link_token': 'test-link-token'}
    
    async def item_public_token_exchange(self, request):
        return {'access_token': 'test-access-token'}
    
    # More mock methods
```
**Acceptance Criteria**:
- [ ] All methods mocked
- [ ] Realistic responses
- [ ] Error simulation
- [ ] Configurable behavior

---

##### [TASK-012-043] Create Plaid Security Tests
- **Points**: 0.5
- **Agent**: Claude-Security
- **Branch**: `plaid/security-tests`
- **File**: `apps/backend/tests/security/test_plaid_security.py`
- **Dependencies**: [TASK-012-009]
```python
async def test_token_encryption():
    # Test encryption strength
    # Test key rotation
    pass

async def test_webhook_security():
    # Test signature verification
    # Test replay attacks
    pass
```
**Acceptance Criteria**:
- [ ] Encryption tests
- [ ] Signature tests
- [ ] Injection tests
- [ ] Access control

---

##### [TASK-012-044] Create Plaid Performance Tests
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/performance-tests`
- **File**: `apps/backend/tests/performance/test_plaid_perf.py`
- **Dependencies**: [TASK-012-020]
```python
async def test_bulk_transaction_sync():
    # Test with 10k transactions
    # Measure time
    # Check memory
    pass
```
**Acceptance Criteria**:
- [ ] Bulk sync tests
- [ ] Memory usage
- [ ] Query performance
- [ ] Concurrent requests

---

##### [TASK-012-045] Create Plaid Monitoring
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/monitoring`
- **File**: `apps/backend/app/monitoring/plaid.py`
- **Dependencies**: None
```python
class PlaidMonitoring:
    async def track_api_call(self, endpoint: str, success: bool, latency: float):
        # Log to metrics
        # Update dashboards
        pass
```
**Acceptance Criteria**:
- [ ] API metrics
- [ ] Success rates
- [ ] Latency tracking
- [ ] Error rates

---

##### [TASK-012-046] Create Plaid Documentation
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/documentation`
- **File**: `docs/plaid_integration.md`
- **Dependencies**: All Plaid tasks
```markdown
# Plaid Integration
## Setup
## API Flow
## Webhooks
## Rate Limiting
```
**Acceptance Criteria**:
- [ ] Setup guide
- [ ] API reference
- [ ] Flow diagrams
- [ ] Troubleshooting

---

##### [TASK-012-047] Create Plaid Migration Script
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `plaid/migration`
- **File**: `apps/backend/scripts/migrate_plaid_data.py`
- **Dependencies**: [TASK-012-003]
```python
async def migrate_plaid_items():
    # Migration from old schema
    # Data transformation
    # Validation
    pass
```
**Acceptance Criteria**:
- [ ] Schema migration
- [ ] Data validation
- [ ] Rollback support
- [ ] Progress tracking

---

##### [TASK-012-048] Create Plaid Admin Tools
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `plaid/admin-tools`
- **File**: `apps/backend/app/admin/plaid.py`
- **Dependencies**: [TASK-012-012]
```python
class PlaidAdmin:
    async def disconnect_item(self, user_id: str, item_id: str):
        # Remove item
        # Clean data
        # Notify user
        pass
    
    async def refresh_all_users(self):
        # Batch refresh
        # Progress tracking
        pass
```
**Acceptance Criteria**:
- [ ] Disconnect support
- [ ] Batch operations
- [ ] Audit logging
- [ ] Error recovery

---

### [STORY-006] Account Management (13 points → 47 tasks)

#### Phase 3.2: Multi-Account Support

##### [TASK-014-001] Create Account Service Interface
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `accounts/service-interface`
- **File**: `apps/backend/app/services/interfaces/account.py`
- **Dependencies**: Repository from Milestone 2
```python
class IAccountService(ABC):
    @abstractmethod
    async def create_manual_account(
        self, user_id: str, data: AccountCreate
    ) -> Account:
        pass
    
    @abstractmethod
    async def get_user_accounts(self, user_id: str) -> List[Account]:
        pass
```
**Acceptance Criteria**:
- [ ] CRUD operations
- [ ] Balance methods
- [ ] Aggregation methods
- [ ] Sync methods

---

##### [TASK-014-002] Implement Account Service
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `accounts/service-impl`
- **File**: `apps/backend/app/services/account.py`
- **Dependencies**: [TASK-014-001]
```python
class AccountService(IAccountService):
    def __init__(self, account_repo: IAccountRepository):
        self.account_repo = account_repo
        
    async def create_manual_account(
        self, user_id: str, data: AccountCreate
    ) -> Account:
        # Create account
        # Set initial balance
        # Return account
        pass
```
**Acceptance Criteria**:
- [ ] Manual account creation
- [ ] Plaid account handling
- [ ] Balance tracking
- [ ] Validation logic

---

##### [TASK-014-003] Create Account Schemas
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `accounts/schemas`
- **File**: `apps/backend/app/schemas/account.py`
- **Dependencies**: None
```python
class AccountCreate(BaseModel):
    name: str
    type: AccountType
    currency: str = "EUR"
    initial_balance: Decimal = Decimal("0.00")
    
class AccountResponse(BaseModel):
    id: UUID
    name: str
    type: AccountType
    balance: Decimal
    currency: str
```
**Acceptance Criteria**:
- [ ] Create schema
- [ ] Update schema
- [ ] Response schema
- [ ] Validation rules

---

##### [TASK-014-004] Create Account CRUD Endpoints
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `accounts/crud-endpoints`
- **File**: `apps/backend/app/api/v1/endpoints/accounts.py`
- **Dependencies**: [TASK-014-002]
```python
@router.post("/accounts", response_model=AccountResponse)
async def create_account(
    data: AccountCreate,
    current_user: User = Depends(get_current_user),
    service: IAccountService = Depends()
):
    return await service.create_manual_account(str(current_user.id), data)

@router.get("/accounts", response_model=List[AccountResponse])
async def list_accounts(
    current_user: User = Depends(get_current_user),
    service: IAccountService = Depends()
):
    return await service.get_user_accounts(str(current_user.id))
```
**Acceptance Criteria**:
- [ ] CREATE endpoint
- [ ] READ endpoints
- [ ] UPDATE endpoint
- [ ] DELETE endpoint

---

##### [TASK-014-005] Create Account Balance Service
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `accounts/balance-service`
- **File**: `apps/backend/app/services/account_balance.py`
- **Dependencies**: [TASK-014-002]
```python
class AccountBalanceService:
    async def calculate_balance(
        self, account_id: str, as_of: Optional[date] = None
    ) -> Decimal:
        # Get initial balance
        # Sum transactions
        # Return current balance
        pass
    
    async def update_balance_cache(self, account_id: str):
        # Calculate balance
        # Update cache
        pass
```
**Acceptance Criteria**:
- [ ] Balance calculation
- [ ] Point-in-time balance
- [ ] Cache management
- [ ] Currency handling

---

##### [TASK-014-006] Create Account Aggregation Service
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `accounts/aggregation`
- **File**: `apps/backend/app/services/account_aggregation.py`
- **Dependencies**: [TASK-014-005]
```python
class AccountAggregationService:
    async def get_total_balance(
        self, user_id: str, currency: str = "EUR"
    ) -> Decimal:
        # Get all accounts
        # Convert currencies
        # Sum balances
        pass
    
    async def get_balance_by_type(self, user_id: str) -> Dict[str, Decimal]:
        # Group by type
        # Calculate totals
        pass
```
**Acceptance Criteria**:
- [ ] Total balance
- [ ] By-type aggregation
- [ ] Currency conversion
- [ ] Cache support

---

##### [TASK-014-007] Create Account Limits Service
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `accounts/limits`
- **File**: `apps/backend/app/services/account_limits.py`
- **Dependencies**: [TASK-014-002]
```python
class AccountLimitsService:
    FREE_TIER_LIMIT = 2
    PREMIUM_TIER_LIMIT = None  # Unlimited
    
    async def check_account_limit(self, user_id: str) -> bool:
        # Get user tier
        # Count accounts
        # Check limit
        pass
```
**Acceptance Criteria**:
- [ ] Tier-based limits
- [ ] Count validation
- [ ] Error messages
- [ ] Upgrade prompts

---

##### [TASK-014-008] Create Account Types Configuration
- **Points**: 0.2
- **Agent**: Claude-Banking
- **Branch**: `accounts/types-config`
- **File**: `apps/backend/app/core/account_types.py`
- **Dependencies**: None
```python
ACCOUNT_TYPES = {
    "checking": {
        "name": "Checking Account",
        "icon": "💳",
        "color": "#4CAF50"
    },
    "savings": {
        "name": "Savings Account",
        "icon": "🏦",
        "color": "#2196F3"
    },
    # More types
}
```
**Acceptance Criteria**:
- [ ] All account types
- [ ] Metadata defined
- [ ] Icons and colors
- [ ] Localization ready

---

##### [TASK-014-009] Create Account Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `accounts/account-component`
- **File**: `apps/web/src/features/accounts/components/AccountCard.tsx`
- **Dependencies**: None
```typescript
export const AccountCard: React.FC<{account: Account}> = ({ account }) => {
  return (
    <Card>
      <CardContent>
        <Typography>{account.name}</Typography>
        <Typography>{formatCurrency(account.balance)}</Typography>
        {/* More details */}
      </CardContent>
    </Card>
  )
}
```
**Acceptance Criteria**:
- [ ] Account display
- [ ] Balance formatting
- [ ] Type indicator
- [ ] Action menu

---

##### [TASK-014-010] Create Add Account Dialog
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `accounts/add-dialog`
- **File**: `apps/web/src/features/accounts/components/AddAccountDialog.tsx`
- **Dependencies**: None
```typescript
export const AddAccountDialog: React.FC = () => {
  const [open, setOpen] = useState(false)
  
  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogContent>
        {/* Account form */}
      </DialogContent>
    </Dialog>
  )
}
```
**Acceptance Criteria**:
- [ ] Form fields
- [ ] Validation
- [ ] Type selection
- [ ] Submit handling

---

##### [TASK-014-011] Create Account Balance Chart
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `accounts/balance-chart`
- **File**: `apps/web/src/features/accounts/components/BalanceChart.tsx`
- **Dependencies**: None
```typescript
export const BalanceChart: React.FC = () => {
  const balanceHistory = useSelector(selectBalanceHistory)
  
  return (
    <LineChart data={balanceHistory}>
      {/* Chart configuration */}
    </LineChart>
  )
}
```
**Acceptance Criteria**:
- [ ] Line chart
- [ ] Time range selector
- [ ] Multiple accounts
- [ ] Responsive design

---

##### [TASK-014-012] Create Account Selector Component
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `accounts/selector`
- **File**: `apps/web/src/features/accounts/components/AccountSelector.tsx`
- **Dependencies**: None
```typescript
export const AccountSelector: React.FC = () => {
  const accounts = useSelector(selectAccounts)
  const [selected, setSelected] = useState<string>()
  
  return (
    <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
      {accounts.map(account => (
        <MenuItem key={account.id} value={account.id}>
          {account.name}
        </MenuItem>
      ))}
    </Select>
  )
}
```
**Acceptance Criteria**:
- [ ] Dropdown UI
- [ ] Account list
- [ ] Balance display
- [ ] Default selection

---

##### [TASK-014-013] Create Account Store Actions
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `accounts/store-actions`
- **File**: `apps/web/src/store/accounts.ts`
- **Dependencies**: None
```typescript
const accountsSlice = createSlice({
  name: 'accounts',
  initialState: {
    accounts: [],
    selectedAccount: null,
    loading: false,
  },
  reducers: {
    setAccounts: (state, action) => {
      state.accounts = action.payload
    },
    selectAccount: (state, action) => {
      state.selectedAccount = action.payload
    },
  }
})
```
**Acceptance Criteria**:
- [ ] CRUD actions
- [ ] Selection state
- [ ] Loading states
- [ ] Error handling

---

##### [TASK-014-014] Create Account API Client
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `accounts/api-client`
- **File**: `apps/web/src/services/accounts.ts`
- **Dependencies**: [TASK-014-013]
```typescript
export const accountsAPI = {
  create: async (data: AccountCreate) => {
    const response = await api.post('/accounts', data)
    return response.data
  },
  list: async () => {
    const response = await api.get('/accounts')
    return response.data
  },
  // More methods
}
```
**Acceptance Criteria**:
- [ ] All CRUD methods
- [ ] Type safety
- [ ] Error handling
- [ ] Response mapping

---

##### [TASK-014-015] Create Account Tests - Service
- **Points**: 0.3
- **Agent**: Copilot
- **Branch**: `accounts/test-service`
- **File**: `apps/backend/tests/unit/services/test_account.py`
- **Dependencies**: [TASK-014-002]
```python
async def test_create_manual_account():
    # Test account creation
    pass

async def test_account_limits():
    # Test tier limits
    pass
```
**Acceptance Criteria**:
- [ ] Service tests
- [ ] Limit tests
- [ ] Balance tests
- [ ] Edge cases

---

##### [TASK-014-016] Create Account Tests - Endpoints
- **Points**: 0.3
- **Agent**: Copilot
- **Branch**: `accounts/test-endpoints`
- **File**: `apps/backend/tests/unit/api/test_accounts.py`
- **Dependencies**: [TASK-014-004]
```python
async def test_account_crud_endpoints():
    # Test all CRUD operations
    pass
```
**Acceptance Criteria**:
- [ ] CRUD tests
- [ ] Auth tests
- [ ] Validation tests
- [ ] Error responses

---

##### [TASK-014-017] Create Account Integration Tests
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `accounts/integration-tests`
- **File**: `apps/backend/tests/integration/test_account_flow.py`
- **Dependencies**: [TASK-014-015, TASK-014-016]
```python
async def test_account_lifecycle():
    # Create account
    # Add transactions
    # Update balance
    # Delete account
    pass
```
**Acceptance Criteria**:
- [ ] Full lifecycle
- [ ] Balance updates
- [ ] Multi-account
- [ ] Cleanup logic

---

##### [TASK-014-018] Create Account E2E Tests
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `accounts/e2e-tests`
- **File**: `apps/web/tests/e2e/accounts.spec.ts`
- **Dependencies**: [TASK-014-009, TASK-014-010]
```typescript
test('user can manage accounts', async ({ page }) => {
  // Add account
  // View list
  // Update account
  // Delete account
})
```
**Acceptance Criteria**:
- [ ] CRUD flow
- [ ] UI verification
- [ ] Balance display
- [ ] Error handling

---

##### [TASK-014-019] Create Account Balance Jobs
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `accounts/balance-jobs`
- **File**: `apps/backend/app/jobs/account_balance.py`
- **Dependencies**: [TASK-014-005]
```python
@celery.task
def recalculate_all_balances():
    # Get all accounts
    # Recalculate balances
    # Update cache
    pass
```
**Acceptance Criteria**:
- [ ] Batch processing
- [ ] Schedule config
- [ ] Error recovery
- [ ] Progress tracking

---

##### [TASK-014-020] Create Account Export Service
- **Points**: 0.3
- **Agent**: Claude-Banking
- **Branch**: `accounts/export`
- **File**: `apps/backend/app/services/account_export.py`
- **Dependencies**: [TASK-014-002]
```python
class AccountExportService:
    async def export_to_csv(self, user_id: str) -> bytes:
        # Get accounts
        # Format CSV
        # Return file
        pass
```
**Acceptance Criteria**:
- [ ] CSV export
- [ ] Excel export
- [ ] Date filtering
- [ ] Formatting options

---

##### [TASK-014-021] Create Account Import Service
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `accounts/import`
- **File**: `apps/backend/app/services/account_import.py`
- **Dependencies**: [TASK-014-002]
```python
class AccountImportService:
    async def import_from_csv(self, user_id: str, file: bytes):
        # Parse CSV
        # Validate data
        # Create accounts
        pass
```
**Acceptance Criteria**:
- [ ] CSV parsing
- [ ] Validation
- [ ] Duplicate handling
- [ ] Error reporting

---

##### [TASK-014-022] Create Account Transfer Service
- **Points**: 0.5
- **Agent**: Claude-Banking
- **Branch**: `accounts/transfers`
- **File**: `apps/backend/app/services/account_transfer.py`
- **Dependencies**: [TASK-014-005]
```python
class AccountTransferService:
    async def transfer(
        self,
        from_account_id: str,
        to_account_id: str,
        amount: Decimal
    ):
        # Validate balances
        # Create transactions
        # Update balances
        pass
```
**Acceptance Criteria**:
- [ ] Balance validation
- [ ] Atomic transfer
- [ ] Transaction creation
- [ ] Notification

---

##### [TASK-014-023 through TASK-014-047] 
*[Additional 24 account management micro-tasks following same pattern...]*

---

## [EPIC-004] Transaction Management Core (16 points → 61 tasks)

### [STORY-007] Manual Transaction Entry (8 points → 30 tasks)

*[Tasks for manual transaction entry, categorization, search, filtering...]*

### [STORY-008] Transaction Import/Export (8 points → 31 tasks)

*[Tasks for CSV import/export, bulk operations, reconciliation...]*

---

## Summary Statistics for Milestone 3

```yaml
Total Micro-Tasks: 156
Parallel Execution Paths: 7
Estimated Completion: Week 4 (7-10 days with 4 agents)

Critical Path:
1. Plaid setup (TASK-012-001 to 012-008)
2. Token exchange (TASK-012-009 to 012-012)
3. Account sync (TASK-012-013 to 012-015)
4. Transaction sync (TASK-012-016 to 012-020)

Agent Assignment:
- Claude-Banking: 85 tasks (Plaid, accounts, transactions)
- Claude-Frontend: 35 tasks (UI components, store)
- Copilot: 25 tasks (testing, mocks)
- Claude-Security: 11 tasks (encryption, webhooks)

Branch Strategy:
- plaid/* - All Plaid integration
- accounts/* - Account management
- transactions/* - Transaction handling
```