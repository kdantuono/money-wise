# Blocked Tests Fix Plan - 96 Tests

**Status**: 315/411 passing (76.6%)
**Remaining**: 96 tests blocked
**Estimated Total Effort**: 6-10 hours

---

## Quick Wins (18 tests, 1-3 hours)

### 1. E2E Test Logic Bugs (12 tests) - 1-2 hours
**File**: `__tests__/e2e/auth.e2e.spec.ts`
**Issue**: Tests expect different response format than API returns
**Error**: `expect(received).toMatchObject(expected)` - field mismatches

**Failed Tests**:
1. ✗ should register a new user and return tokens
2. ✗ should login with valid credentials
3. ✗ should refresh tokens with valid refresh token
4. ✗ should reject invalid refresh token
5. ✗ should reject refresh token for inactive user
6. ✗ should access profile with valid token
7. ✗ should reject access without token
8. ✗ should reject access with invalid token
9. ✗ should reject access with malformed authorization header
10. ✗ should logout successfully
11. ✗ should handle complete user journey
12. ✗ should handle concurrent registrations with same email

**Root Cause**:
- Registration returns different fields than test expects
- Login succeeds but test expectations wrong
- All downstream tests fail because login fails

**Fix Steps**:
```bash
# 1. Run single test with full output
npx jest __tests__/e2e/auth.e2e.spec.ts -t "should register" --no-coverage

# 2. Compare actual vs expected response
# Actual response body structure != test expectations

# 3. Fix test expectations OR API response format
# Check: apps/backend/src/auth/auth.controller.ts
# Match response DTOs with test expectations

# 4. Common issues:
#    - Field names (accessToken vs access_token)
#    - Nested vs flat structure
#    - Missing fields in response
```

**Files to Check**:
- `src/auth/auth.controller.ts` - Response format
- `src/auth/dto/auth-response.dto.ts` - Response DTO
- `__tests__/e2e/auth.e2e.spec.ts:47` - Test expectations

---

### 2. Integration Redis NOAUTH (1 test) - 15 minutes
**File**: `__tests__/integration/auth.integration.spec.ts`
**Test**: POST /auth/logout → should return 401 without authorization header
**Error**: `ReplyError: NOAUTH Authentication required`

**Root Cause**: Guards trying to connect to real Redis instead of mock

**Fix Steps**:
```typescript
// Check if RateLimitGuard is bypassing DI
// File: src/auth/guards/rate-limit.guard.ts

// WRONG (if found):
private redis = new Redis({ host: 'localhost', port: 6379 });

// RIGHT:
constructor(@Inject('default') private readonly redis: Redis) {}
```

**Files to Check**:
- `src/auth/guards/rate-limit.guard.ts`
- `src/auth/guards/jwt-auth.guard.ts`
- Any service with direct `new Redis()` instantiation

---

### 3. OpenAPI Paths (2 tests) - 15 minutes
**File**: `__tests__/contracts/api-contracts.test.ts`
**Tests**:
- ✗ should validate transaction response pagination
- ✗ should have all required paths defined

**Fix Steps**:
```typescript
// File: src/docs/openapi.spec.ts
// Add paths object:

export const spec: any = {
  // ... existing
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        requestBody: { $ref: '#/components/schemas/LoginRequest' },
        responses: {
          200: { $ref: '#/components/schemas/AuthResponse' }
        }
      }
    },
    '/api/auth/register': { /* ... */ },
    '/api/user/profile': { /* ... */ },
    '/api/accounts': { /* ... */ },
    '/api/transactions': { /* ... */ }
  }
};
```

---

### 4. Migration Timeouts (3 tests) - 30 minutes
**File**: `__tests__/unit/core/database/migrations/migration.test.ts`
**Tests**: First 3 migration schema validation tests
**Issue**: Timeout at 30s, need 60-90s

**Fix Steps**:
```typescript
// In test file, increase timeout:
describe('Database Migrations', () => {
  jest.setTimeout(90000); // 90 seconds

  // OR per-test:
  it('should create all tables', async () => {
    // test
  }, 90000);
});
```

---

## Medium Priority (33 tests, 2-4 hours)

### 5. Repository Operations PostgreSQL Driver (31 tests) - 2-3 hours
**File**: `__tests__/integration/database/repository-operations.test.ts`
**Error**: `TypeError: this.postgres.Pool is not a constructor`

**Root Cause**: Version mismatch between `pg` and `typeorm`, or mock issue

**Fix Steps**:
```bash
# 1. Check pg version compatibility
npm ls pg typeorm

# 2. Likely need to upgrade or downgrade pg
npm install pg@8.11.3 --save-exact

# 3. If mock issue, check:
# apps/backend/__tests__/integration/database/repository-operations.test.ts:24
# The setupTestDatabase() might need PostgreSQL container config

# 4. Check TypeORM config
# src/core/database/tests/database-test.config.ts:113
# Ensure proper driver initialization
```

**Files to Investigate**:
- `package.json` - pg version
- `src/core/database/tests/database-test.config.ts:113` - DataSource init
- `node_modules/typeorm/driver/postgres/PostgresDriver.ts:1544` - Where it fails

**Detailed Debug**:
```typescript
// In database-test.config.ts, line 113:
const dataSource = new DataSource({
  type: 'postgres',
  // Add explicit pool config:
  extra: {
    max: 10,
    min: 2,
  }
});

// Or check if pg is being imported correctly:
import { Pool } from 'pg';
console.log(typeof Pool); // Should be 'function'
```

---

### 6. Migration Container Reuse (12 tests) - 1-2 hours
**File**: `__tests__/unit/core/database/migrations/migration.test.ts`
**Issue**: Each test starts new container → 15-30s per test

**Fix Steps**:
```typescript
// Use singleton container pattern
let globalDataSource: DataSource;
let globalManager: DatabaseTestManager;

beforeAll(async () => {
  // Start container ONCE
  globalManager = DatabaseTestManager.getInstance();
  await globalManager.start();
  globalDataSource = globalManager.getDataSource();
}, 120000);

beforeEach(async () => {
  // Just clean data, reuse container
  await globalManager.cleanup();
});

afterAll(async () => {
  // Cleanup ONCE
  await teardownTestDatabase();
});
```

---

### 7. Health Integration Timeout (2 tests) - 30 minutes
**File**: `__tests__/integration/health.test.ts`
**Issue**: Times out waiting for app initialization

**Fix Steps**:
```typescript
// Check if it's using TestClient (which we fixed):
import { TestClient } from './client';

// If yes, increase timeout:
beforeAll(async () => {
  client = new TestClient();
  await client.initialize();
}, 60000); // 60 seconds

// If still failing, check what health endpoint needs:
// - Database connection
// - Redis connection
// Both should use mocks from TestClient
```

---

## Low Priority (43 tests, 3-5 hours)

### 8. Performance Tests (26 tests) - 3-4 hours
**File**: `__tests__/performance/large-dataset.test.ts`, `timescale-performance.test.ts`
**Issue**: Container startup + large data insertion > 120s timeout

**Why Low Priority**: Performance tests are optional for MVP

**Fix Steps**:
```typescript
// Option 1: Skip in CI, run manually
describe.skip('Performance Tests', () => {

// Option 2: Optimize container caching
// Use testcontainers ryuk setting to reuse containers

// Option 3: Increase timeouts dramatically
jest.setTimeout(300000); // 5 minutes per test

// Option 4: Pre-seed database with fixtures
// Instead of inserting 10k records per test, load from dump
```

**Optimization Strategy**:
```bash
# 1. Cache PostgreSQL container image
docker pull postgres:15-alpine

# 2. Use volume mounts for test data
# 3. Parallel test execution with separate DBs
# 4. Consider using SQLite for performance tests (if applicable)
```

---

### 9. Remaining E2E TestApp Issues (3 tests) - 1 hour
**Issue**: 3 additional E2E tests timing out even after MockRedis fix

**Debug Steps**:
```bash
# Run with verbose output:
DEBUG=* npx jest __tests__/e2e/auth.e2e.spec.ts --verbose

# Check TestDatabaseModule initialization:
# It might be trying to start multiple containers

# Solution: Use same singleton pattern as migrations
```

---

## Execution Order

**Day 1 (Quick Wins - 3 hours)**:
1. ✅ Fix E2E test expectations (12 tests) - 1-2h
2. ✅ Fix Redis NOAUTH in guards (1 test) - 15m
3. ✅ Add OpenAPI paths (2 tests) - 15m
4. ✅ Increase migration timeouts (3 tests) - 30m

**Day 2 (Medium Priority - 4 hours)**:
5. ✅ Fix PostgreSQL driver issue (31 tests) - 2-3h
6. ✅ Optimize migration containers (12 tests) - 1-2h
7. ✅ Fix health integration (2 tests) - 30m

**Day 3 (Low Priority - 4 hours)**:
8. ✅ Optimize performance tests (26 tests) - 3-4h
9. ✅ Fix remaining E2E (3 tests) - 1h

---

## Running Individual Test Categories

```bash
# E2E tests
npx jest __tests__/e2e --runInBand --testTimeout=120000 --forceExit

# Integration tests
npx jest __tests__/integration --runInBand --testTimeout=60000

# Contracts
npx jest __tests__/contracts --runInBand

# Performance (manual)
npx jest __tests__/performance --runInBand --testTimeout=300000

# Migrations
npx jest __tests__/unit/core/database/migrations --runInBand --testTimeout=90000

# Entities (WORKING)
npx jest __tests__/unit/core/database/entities --runInBand
```

---

## Success Criteria

- [ ] E2E: 20/20 passing (currently 8/20)
- [ ] Integration: 62/62 passing (currently 24/62)
- [ ] Contracts: 18/18 passing (currently 16/18)
- [ ] Unit DB: 265/265 passing (currently 250/265)
- [ ] Performance: 26/26 passing (currently 0/26)
- [ ] **Total: 411/411 passing (100%)**

---

## Notes for Future Sessions

1. **Container Optimization**: Consider using `testcontainers` with `reuse: true` flag
2. **Mock Strategy**: All integration tests should use MockRedis, not real Redis
3. **Test Data**: Create fixtures/factories for consistent test data
4. **CI/CD**: Performance tests should be separate job (allowed to fail)
5. **Timeouts**: Be generous with timeouts for container-based tests (90-120s)

---

**Last Updated**: 2025-10-02
**By**: Claude Code Session
**Commits**: bf236ed, 90bff2e, b17a73d, 485b1ba
