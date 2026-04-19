# PHASE 3.2: Manual API Testing Plan

**Phase**: 3.2 (API Testing & Validation)
**Status**: READY TO EXECUTE
**Estimated Duration**: 1-2 hours
**Tools**: Swagger UI (preferred) or Postman
**Success Criteria**: All 6 scenarios pass without errors

---

## Testing Overview

### Objective
Manually test all 6 REST API endpoints with real SaltEdge API to verify:
- ✅ Endpoint connectivity
- ✅ Request/response formats match DTOs
- ✅ Authentication works correctly
- ✅ Error handling behaves as documented
- ✅ Service integration is functional

### Environment
- **Backend**: Running on `http://localhost:3001`
- **SaltEdge API**: Production sandbox environment
- **Database**: PostgreSQL (with test data)
- **Redis**: Available for session management (if needed)

### Prerequisites
1. ✅ Backend compiles without errors
2. ✅ SaltEdge credentials configured in `.env.local`
3. ✅ Database migrations applied
4. ✅ Backend dev server running

---

## Test Scenarios

### Scenario 1: Get Available Providers

**Endpoint**: `GET /api/banking/providers`

**Purpose**: Verify that API can list available banking providers

**Setup**:
1. Start backend: `pnpm --filter @money-wise/backend dev`
2. Wait for: "Nest application successfully started"
3. Open Swagger: `http://localhost:3001/api`

**Test Steps**:
1. Navigate to "Banking" section in Swagger
2. Find endpoint: "Get available banking providers"
3. Click "Try it out"
4. Click "Execute"

**Expected Response** (Status 200):
```json
{
  "providers": ["SALTEDGE"],
  "enabled": true
}
```

**Validation**:
- [ ] Status code is 200
- [ ] Response has `providers` array (not empty)
- [ ] Response has `enabled` boolean
- [ ] At least "SALTEDGE" is in providers list

**Troubleshooting**:
- If `providers` is empty: Check `BANKING_INTEGRATION_ENABLED` is `true` in `.env`
- If `enabled` is false: Check environment variable
- If 500 error: Check backend logs for service errors

---

### Scenario 2: Initiate Banking Link (OAuth)

**Endpoint**: `POST /api/banking/initiate-link`

**Purpose**: Start OAuth flow to connect a bank account

**Setup**:
1. Ensure you're authenticated (see "Authentication" section below)
2. Have your JWT token ready

**Test Steps**:
1. In Swagger, find "Initiate banking link" endpoint
2. Click "Try it out"
3. Click "Authorize" (top right) if not already authenticated:
   - Click "Authorize"
   - Paste your JWT token in the bearer token field
   - Click "Authorize"
4. For request body, use empty object or specify provider:
   ```json
   {}
   ```
   Or:
   ```json
   {
     "provider": "SALTEDGE"
   }
   ```
5. Click "Execute"

**Expected Response** (Status 201):
```json
{
  "redirectUrl": "https://saltedge.com/oauth/...",
  "connectionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Validation**:
- [ ] Status code is 201 (Created)
- [ ] Response has `redirectUrl` (starts with https://saltedge.com)
- [ ] Response has `connectionId` (valid UUID format)
- [ ] No error messages in response

**Important**:
- Save the `connectionId` - you'll need it for Scenario 3
- Save the `redirectUrl` - this is where the user would authorize in production

**Troubleshooting**:
- If 401 Unauthorized: Token might be expired or invalid
- If 400 Bad Request: Check error message
- If 500 error: Check backend logs for SaltEdge API errors

---

### Scenario 3: Complete Banking Link (Get Accounts)

**Endpoint**: `POST /api/banking/complete-link`

**Purpose**: Fetch accounts after OAuth authorization (in sandbox, this is simulated)

**Prerequisites**:
- Must have completed Scenario 2 to get a `connectionId`
- Have `connectionId` from Scenario 2

**Test Steps**:
1. In Swagger, find "Complete banking link" endpoint
2. Click "Try it out"
3. In request body, enter the `connectionId` from Scenario 2:
   ```json
   {
     "connectionId": "550e8400-e29b-41d4-a716-446655440000"
   }
   ```
4. Click "Execute"

**Expected Response** (Status 200):
```json
{
  "accounts": [
    {
      "id": "account-123",
      "name": "Conto Corrente",
      "iban": "IT60X0542811101000000123456",
      "balance": 5000.50,
      "currency": "EUR",
      "bankName": "Intesa Sanpaolo",
      "bankCountry": "IT",
      "accountHolderName": "Mario Rossi",
      "type": "checking",
      "status": "active"
    }
  ]
}
```

**Validation**:
- [ ] Status code is 200
- [ ] Response has `accounts` array
- [ ] Each account has required fields (id, name, iban, balance, currency)
- [ ] IBAN format is valid (ITA code: IT)
- [ ] No error messages

**Important**:
- Save account details for Scenario 4
- In sandbox, this returns mock account data from SaltEdge

**Troubleshooting**:
- If 400 "Connection not found": `connectionId` may have expired
- If 400 "Unauthorized": The connection wasn't authorized
- If empty accounts array: SaltEdge connection has no accounts (valid state)

---

### Scenario 4: Get Linked Accounts

**Endpoint**: `GET /api/banking/accounts`

**Purpose**: Retrieve all accounts linked by the current user

**Test Steps**:
1. In Swagger, find "Get linked banking accounts" endpoint
2. Click "Try it out"
3. No request body needed
4. Click "Execute"

**Expected Response** (Status 200):
```json
{
  "accounts": [
    {
      "id": "acc-123",
      "name": "Conto Corrente",
      "bankName": "Intesa Sanpaolo",
      "balance": 5000.50,
      "currency": "EUR",
      "syncStatus": "SYNCED",
      "lastSynced": "2025-10-25T12:30:00Z",
      "linkedAt": "2025-10-25T10:15:00Z",
      "accountNumber": "IT60X0542811101000000123456",
      "accountType": "CHECKING",
      "bankCountry": "IT"
    }
  ]
}
```

**Validation**:
- [ ] Status code is 200
- [ ] Response has `accounts` array
- [ ] For each account:
  - [ ] Has required fields (id, name, balance, currency)
  - [ ] `syncStatus` is one of: SYNCED, PENDING, ERROR
  - [ ] `lastSynced` is valid ISO date (or null)
  - [ ] `linkedAt` is valid ISO date

**Expected Behavior**:
- If no accounts linked: Empty array `[]`
- If accounts linked: Array with 1+ accounts from Scenario 3

**Troubleshooting**:
- If 401 Unauthorized: Token invalid
- If empty array: This is expected if no accounts have been linked yet

---

### Scenario 5: Sync Account

**Endpoint**: `POST /api/banking/sync/:accountId`

**Purpose**: Trigger synchronization of transactions and balance for an account

**Prerequisites**:
- Must have linked at least one account (Scenario 3/4)
- Have the account `id` from Scenario 4

**Test Steps**:
1. In Swagger, find "Sync banking account" endpoint
2. Click "Try it out"
3. Enter the account ID in the `accountId` parameter (from Scenario 4)
   - Example: `acc-123`
4. Click "Execute"

**Expected Response** (Status 200):
```json
{
  "syncLogId": "sync-456",
  "status": "SYNCED",
  "transactionsSynced": 42,
  "balanceUpdated": true,
  "error": null
}
```

**Validation**:
- [ ] Status code is 200
- [ ] Response has `syncLogId` (valid UUID or ID)
- [ ] Response has `status` (SYNCED, PENDING, or ERROR)
- [ ] Response has `transactionsSynced` (integer >= 0)
- [ ] Response has `balanceUpdated` (boolean)
- [ ] If status is ERROR: `error` field contains error message
- [ ] If status is SYNCED: `error` is null

**Expected Behavior**:
- **Success**: Status = SYNCED, transactions fetched
- **Pending**: Status = PENDING, async operation in progress
- **Error**: Status = ERROR, `error` contains reason (e.g., "Connection expired")

**Troubleshooting**:
- If 400 "Account not found": Account ID may be invalid
- If 400 "Account not linked": Account isn't connected to SaltEdge
- If status = ERROR: Check error message (e.g., credentials expired)

---

### Scenario 6: Revoke Banking Connection

**Endpoint**: `DELETE /api/banking/revoke/:connectionId`

**Purpose**: Disconnect a banking provider and remove linked accounts

**Prerequisites**:
- Have a `connectionId` from Scenario 2

**Test Steps**:
1. In Swagger, find "Revoke banking connection" endpoint
2. Click "Try it out"
3. Enter the connection ID in the `connectionId` parameter
   - Example: `550e8400-e29b-41d4-a716-446655440000`
4. Click "Execute"

**Expected Response** (Status 204):
```
No Content (empty response body)
```

**Validation**:
- [ ] Status code is 204 (No Content)
- [ ] Response body is empty (expected for DELETE operations)
- [ ] No error message

**Expected Behavior**:
- After revocation: All accounts from this connection become disconnected
- Next call to Scenario 4 should NOT include accounts from revoked connection

**Troubleshooting**:
- If 400 "Connection not found": ID may be invalid
- If 400 "Unauthorized": Connection may belong to different user
- If 500 error: Check backend logs

---

## Authentication Setup

### Getting JWT Token (Required for Scenarios 2-6)

**Option 1: Register a Test User**

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-banking@example.com",
    "password": "TestPassword123!",
    "familyId": "family-1"
  }'
```

**Response**:
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "user-123",
    "email": "test-banking@example.com"
  }
}
```

Copy the `accessToken` value.

**Option 2: Login with Existing User**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-banking@example.com",
    "password": "TestPassword123!"
  }'
```

### Using Token in Swagger

1. Click "Authorize" button (top right of Swagger UI)
2. Select scheme: "Bearer"
3. Paste token (without "Bearer " prefix)
4. Click "Authorize"
5. All subsequent requests will include the token

---

## Test Execution Checklist

### Before Testing
- [ ] Backend is running: `pnpm --filter @money-wise/backend dev`
- [ ] Database is initialized (migrations applied)
- [ ] `.env.local` has SaltEdge credentials
- [ ] Redis is running (if required by backend)
- [ ] Swagger UI accessible at `http://localhost:3001/api`

### During Testing

**Scenario 1** (Get Providers):
- [ ] Execute test
- [ ] Response: 200 OK
- [ ] Has providers and enabled fields
- [ ] Document response

**Scenario 2** (Initiate Link):
- [ ] Have valid JWT token
- [ ] Execute test
- [ ] Response: 201 Created
- [ ] Save `connectionId`
- [ ] Save `redirectUrl`
- [ ] Document response

**Scenario 3** (Complete Link):
- [ ] Use `connectionId` from Scenario 2
- [ ] Execute test
- [ ] Response: 200 OK
- [ ] Save account IDs
- [ ] Document response

**Scenario 4** (Get Accounts):
- [ ] Execute test
- [ ] Response: 200 OK
- [ ] Should include account from Scenario 3
- [ ] Document response

**Scenario 5** (Sync Account):
- [ ] Use account ID from Scenario 4
- [ ] Execute test
- [ ] Response: 200 OK
- [ ] Check sync status (SYNCED or ERROR)
- [ ] Document response

**Scenario 6** (Revoke Connection):
- [ ] Use `connectionId` from Scenario 2
- [ ] Execute test
- [ ] Response: 204 No Content
- [ ] Document response

### After Testing
- [ ] All 6 scenarios tested
- [ ] Screenshot responses
- [ ] Save test results
- [ ] Document any errors encountered
- [ ] Note any unexpected behaviors

---

## Expected Error Scenarios

### Authentication Errors (401)
- Occurs when: JWT token missing or invalid
- Expected response: `{"statusCode": 401, "message": "Unauthorized"}`
- Fix: Register/login user, get valid token

### Validation Errors (400)
- Occurs when: Invalid input (e.g., missing connectionId)
- Expected response: `{"statusCode": 400, "message": "..."}`
- Fix: Check request format matches DTO

### Not Found Errors (404)
- Occurs when: Resource doesn't exist (e.g., invalid account ID)
- Expected response: `{"statusCode": 404, "message": "..."}`
- Fix: Use valid IDs from previous responses

### Service Errors (500)
- Occurs when: Backend service exception
- Expected response: `{"statusCode": 500, "message": "Internal server error"}`
- Fix: Check backend logs, restart if needed

---

## Success Criteria

✅ **Phase 3.2 is complete when**:
1. All 6 scenarios executed successfully
2. All endpoints return expected status codes
3. Response formats match DTO definitions
4. No 500 errors encountered
5. Authentication works correctly
6. Error handling behaves as documented

---

## Next Steps After Testing

### If All Tests Pass ✅
→ Proceed to **Phase 3.3: Integration Tests**
- Create automated integration test suite
- Test complete OAuth flow
- Test error scenarios
- Achieve 80%+ coverage

### If Tests Fail ❌
→ Debug and fix issues:
1. Check backend logs: `docker logs [backend-container]`
2. Verify SaltEdge credentials in `.env.local`
3. Check database state: `SELECT * FROM banking_connections;`
4. Review error messages
5. Consult SaltEdge API documentation
6. Retry tests

---

## Documentation

### Test Results Template

```markdown
## Test Results - PHASE 3.2

**Date**: [Date]
**Tester**: [Your Name]
**Backend Version**: [Commit Hash]

### Scenario Results

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Get Providers | ✅ | Response: SALTEDGE enabled |
| 2. Initiate Link | ✅ | ConnectionId: ... |
| 3. Complete Link | ✅ | 1 account fetched |
| 4. Get Accounts | ✅ | Account synced |
| 5. Sync Account | ✅ | 42 transactions |
| 6. Revoke Connection | ✅ | Connection revoked |

### Issues Encountered
- None

### Next Steps
→ Proceed to Phase 3.3 (Integration Tests)
```

---

## Timeline

| Step | Estimated Time |
|------|-----------------|
| Scenario 1 (Providers) | 2 minutes |
| Scenario 2 (Initiate) | 3 minutes |
| Scenario 3 (Complete) | 3 minutes |
| Scenario 4 (Get Accounts) | 2 minutes |
| Scenario 5 (Sync) | 5 minutes |
| Scenario 6 (Revoke) | 2 minutes |
| **Total Testing Time** | **~17 minutes** |
| Debugging (if needed) | 30-45 minutes |

**Total Phase 3.2: 1-2 hours** (including documentation)

---

**Document Created**: October 25, 2025
**Status**: READY TO EXECUTE
**Next Phase**: 3.3 (Integration Tests)
