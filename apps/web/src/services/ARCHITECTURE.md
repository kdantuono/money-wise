# Banking Client Architecture

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Components                           │
│  (AccountList, LinkBankButton, SyncControl, etc.)              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ import { bankingClient }
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Banking Client API                           │
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐│
│  │ initiateLink() │  │ completeLink() │  │  getAccounts()   ││
│  └────────────────┘  └────────────────┘  └──────────────────┘│
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐│
│  │ syncAccount()  │  │revokeConnection│  │  getProviders()  ││
│  └────────────────┘  └────────────────┘  └──────────────────┘│
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Type-safe HTTP requests
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Request/Response Layer                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Request Interceptors                                      │ │
│  │  • Add Authorization: Bearer {token}                      │ │
│  │  • Add Content-Type: application/json                     │ │
│  │  • Log requests (development)                             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Response Interceptors                                     │ │
│  │  • Parse JSON responses                                   │ │
│  │  • Handle 204 No Content                                  │ │
│  │  • Parse error responses                                  │ │
│  │  • Log responses (development)                            │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ HTTP fetch()
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Error Handling Layer                         │
│                                                                 │
│  Status Code → Error Class Mapping:                            │
│  • 400 → ValidationError                                       │
│  • 401 → AuthenticationError                                   │
│  • 403 → AuthorizationError                                    │
│  • 404 → NotFoundError                                         │
│  • 500 → ServerError                                           │
│  • Other → BankingApiError                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ throw typed error
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Component Error Handling                      │
│                                                                 │
│  try {                                                          │
│    await bankingClient.method()                                │
│  } catch (error) {                                             │
│    if (error instanceof AuthenticationError) { ... }           │
│    else if (error instanceof ValidationError) { ... }          │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### 1. Initiate Banking Link Flow

```
User Click
    ↓
Component calls bankingClient.initiateLink('SALTEDGE')
    ↓
Request Layer adds Authorization header
    ↓
POST /api/banking/initiate-link
    ↓
Backend returns { redirectUrl, connectionId }
    ↓
Component stores connectionId in sessionStorage
    ↓
Component redirects to redirectUrl
    ↓
User authorizes at bank
    ↓
Bank redirects back to app
```

### 2. Complete Banking Link Flow

```
OAuth Callback Page
    ↓
Component retrieves connectionId from sessionStorage
    ↓
Component calls bankingClient.completeLink(connectionId)
    ↓
Request Layer adds Authorization header
    ↓
POST /api/banking/complete-link { connectionId }
    ↓
Backend fetches accounts from provider
    ↓
Backend stores accounts in database
    ↓
Backend returns { accounts: BankingAccount[] }
    ↓
Component displays linked accounts
```

### 3. Sync Account Flow

```
User Click "Sync"
    ↓
Component calls bankingClient.syncAccount(accountId)
    ↓
Request Layer adds Authorization header
    ↓
POST /api/banking/sync/:accountId
    ↓
Backend fetches latest transactions from provider
    ↓
Backend stores transactions in database
    ↓
Backend updates account balance
    ↓
Backend returns SyncResponse { status, transactionsSynced, ... }
    ↓
Component shows sync result
```

## 🏗️ Layer Responsibilities

### Component Layer
- **Responsibility**: UI, user interactions, state management
- **Does**: Calls client methods, handles UI updates, shows loading/error states
- **Doesn't**: HTTP logic, authentication, error parsing

### Client API Layer
- **Responsibility**: Type-safe API interface
- **Does**: Provides typed methods, constructs requests, returns typed responses
- **Doesn't**: UI concerns, state management

### Request/Response Layer
- **Responsibility**: HTTP interceptors and middleware
- **Does**: Auth header injection, logging, response parsing
- **Doesn't**: Business logic, error handling decisions

### Error Handling Layer
- **Responsibility**: HTTP error parsing and classification
- **Does**: Maps status codes to error classes, sanitizes messages
- **Doesn't**: UI error display, retry logic

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Logs In                                             │
│    → Backend returns JWT token                              │
│    → Frontend stores in localStorage('auth_token')          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Client Request                                           │
│    → getAuthToken() reads localStorage('auth_token')        │
│    → Request interceptor adds Authorization header          │
│    → Request sent with Bearer token                         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend Validates Token                                  │
│    → JwtAuthGuard verifies token                            │
│    → If valid: proceed with request                         │
│    → If invalid: return 401                                 │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Error Handling (if 401)                                  │
│    → Response parser catches 401                            │
│    → Throws AuthenticationError                             │
│    → Component catches error                                │
│    → Component redirects to /login                          │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Design Patterns

### 1. Singleton Pattern
- **Usage**: Single instance of `bankingClient` exported
- **Benefit**: Shared configuration, consistent state

### 2. Factory Pattern
- **Usage**: `request<T>()` function creates HTTP requests
- **Benefit**: Consistent request handling, DRY

### 3. Strategy Pattern
- **Usage**: Different error classes for different status codes
- **Benefit**: Type-safe error handling, clear error types

### 4. Interceptor Pattern
- **Usage**: Request/response interceptors
- **Benefit**: Cross-cutting concerns (auth, logging)

### 5. Repository Pattern
- **Usage**: Client abstracts HTTP details from components
- **Benefit**: Components don't know about HTTP

## 📦 Module Structure

```
services/
├── banking.client.ts          # Main client implementation
│   ├── Type Definitions (BankingAccount, SyncResponse, etc.)
│   ├── Error Classes (BankingApiError hierarchy)
│   ├── HTTP Configuration (getApiBaseUrl, getAuthToken)
│   ├── Interceptors (logRequest, logResponse, handleError)
│   ├── Request Function (request<T>)
│   └── API Methods (bankingClient object)
│
├── banking.client.example.ts  # Usage examples
│   ├── Example 1: Complete Link Flow
│   ├── Example 2: Display Accounts
│   ├── Example 3: Sync Account
│   ├── Example 4: Revoke Connection
│   ├── Example 5: Check Providers
│   ├── Example 6: React Hook
│   ├── Example 7: Error Handling
│   ├── Example 8: Batch Operations
│   ├── Example 9: Filtering/Sorting
│   └── Example 10: Retry Logic
│
├── index.ts                   # Barrel export
│   └── Re-exports all types and client
│
├── README.md                  # Full documentation
│   ├── Quick Start
│   ├── API Methods
│   ├── Type Definitions
│   ├── Error Handling
│   ├── Configuration
│   ├── React Integration
│   └── Testing
│
└── QUICK_START.md            # Quick reference
    ├── Essential Snippets
    ├── Error Handling Example
    ├── React Hook Example
    └── Common Patterns
```

## 🔄 Type Safety Flow

```
TypeScript Interfaces
       ↓
Client Method Returns Type
       ↓
Component Receives Typed Data
       ↓
TypeScript Validates Usage
       ↓
Compile-time Safety
```

**Example:**

```typescript
// Type defined in client
interface BankingAccount {
  id: string;
  name: string;
  balance: number;
  // ...
}

// Method returns type
async getAccounts(): Promise<{ accounts: BankingAccount[] }>

// Component receives type
const { accounts } = await bankingClient.getAccounts();
//      ^^^^^^^^^^ TypeScript knows this is BankingAccount[]

// TypeScript validates
accounts.forEach(account => {
  console.log(account.name);  // ✓ Valid
  console.log(account.foo);   // ✗ Compile error: Property 'foo' does not exist
});
```

## 🧪 Testing Strategy

### Unit Tests
- Test individual methods in isolation
- Mock fetch() calls
- Verify correct request/response handling
- Test error scenarios

### Integration Tests
- Test complete flows (initiate → complete)
- Use test backend or mock server
- Verify token handling
- Test error recovery

### Component Tests
- Test components using the client
- Mock the client methods
- Verify loading/error states
- Test user interactions

## 🚀 Performance Considerations

1. **Request Batching**: Client supports Promise.all for parallel requests
2. **Caching**: Consider React Query/SWR for response caching
3. **Lazy Loading**: Import client only when needed
4. **Error Recovery**: Implement retry logic for transient failures
5. **Token Management**: Token stored in memory (localStorage) for fast access

## 🔒 Security Best Practices

1. **Token Storage**: Currently uses localStorage (consider httpOnly cookies)
2. **HTTPS**: Always use HTTPS in production
3. **Error Sanitization**: No sensitive data in error messages
4. **CORS**: Backend must validate origin
5. **Token Expiration**: Handle 401 errors gracefully

## 📈 Future Enhancements

1. **Token Refresh**: Automatic token refresh before expiration
2. **Request Retry**: Exponential backoff for failed requests
3. **Offline Support**: Queue requests when offline
4. **Response Caching**: Cache account data to reduce API calls
5. **Websocket Support**: Real-time sync status updates
6. **Request Cancellation**: Cancel in-flight requests on unmount

---

**See Also:**
- `/apps/web/src/services/README.md` - Complete API documentation
- `/apps/web/src/services/banking.client.example.ts` - Usage examples
- `/BANKING_CLIENT_IMPLEMENTATION.md` - Implementation summary
