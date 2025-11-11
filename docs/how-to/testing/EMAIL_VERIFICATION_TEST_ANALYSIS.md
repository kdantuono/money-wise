# Email Verification Test Coverage Analysis & Improvement Plan

**Date:** 2025-10-22
**Service:** `EmailVerificationService`
**Test File:** `/home/nemesi/dev/money-wise/apps/backend/__tests__/unit/auth/services/email-verification.service.spec.ts`

---

## Executive Summary

**Current Status:**
- **Tests Passing:** 31/42 (73.8%)
- **Tests Failing:** 11 tests
- **Coverage:** 86.29% statements, 82.5% branches, 86.36% functions, 86.77% lines
- **Quality Assessment:** GOOD foundation, but critical gaps exist

**Key Findings:**
1. ✅ Core functionality well-tested (generation, verification, resend)
2. ✅ Security features partially covered (timing attacks, token reuse)
3. ❌ Rate limiting tests failing (missing mock implementation)
4. ❌ Database transaction tests failing (missing proper mocks)
5. ❌ Edge case tests failing (timeout scenarios, concurrent access)
6. ⚠️ No integration tests for complete workflows
7. ⚠️ No E2E tests for user journeys
8. ⚠️ Missing security-specific test scenarios

---

## Current Coverage Analysis

### Lines with NO Coverage (13.23% uncovered)

```typescript
// Uncovered Lines: 47-62, 85, 132-133, 192-198, 211-213, 252, 376-384, 401-402, 458-459, 475-476

Lines 47-62: Redis error handler in constructor
Lines 85: Rate limit exceeded path in checkResendRateLimit()
Lines 132-133: Token generation error logging
Lines 192-198: Database transaction for email verification
Lines 211-213: Database transaction failure handling
Lines 252: Rate limit error path in resendVerificationEmail()
Lines 376-384: Cleanup error handling in cleanupExpiredTokens()
Lines 401-402: Cleanup error logging
Lines 458-459: Stats calculation error handling
Lines 475-476: Stats error logging
```

### Methods Coverage Breakdown

| Method | Coverage | Status | Notes |
|--------|----------|--------|-------|
| `generateVerificationToken()` | ~95% | ✅ GOOD | Missing Redis error scenarios |
| `verifyEmail()` | ~85% | ⚠️ MEDIUM | Missing transaction rollback tests |
| `resendVerificationEmail()` | ~80% | ⚠️ MEDIUM | Rate limit tests failing |
| `isVerificationRequired()` | 100% | ✅ EXCELLENT | Complete coverage |
| `getTokenInfo()` | ~90% | ✅ GOOD | Missing malformed data handling |
| `cleanupExpiredTokens()` | ~85% | ⚠️ MEDIUM | Error paths untested |
| `getVerificationStats()` | ~80% | ⚠️ MEDIUM | Error paths untested |
| `constantTimeCompare()` | 0% | ❌ CRITICAL | Security method untested |
| `artificialDelay()` | 0% | ❌ CRITICAL | Security method untested |
| `checkResendRateLimit()` | ~60% | ⚠️ MEDIUM | Rate exceeded path missing |
| `incrementResendRateLimit()` | 0% | ❌ CRITICAL | Rate limiting untested |

---

## Test Failures Analysis

### Failing Tests (11 total)

#### 1. **Rate Limit Tests (3 failures)**

**Test:** `should prevent resending if token was sent recently (within 1 hour)`
**Error:** Expected exception not thrown
**Root Cause:** Rate limit checks not properly implemented in mock
**Fix:** Add proper rate limit counter mock implementation

**Test:** `should allow resending if existing token expires soon (less than 1 hour)`
**Error:** Token validation logic issue
**Root Cause:** Mock not properly simulating token expiry timing
**Fix:** Use time-based mocking with jest.useFakeTimers()

**Test:** Similar rate limit scenario failures
**Impact:** CRITICAL - Rate limiting is a security feature

#### 2. **Database Transaction Tests (3 failures)**

**Test:** `should successfully verify email with valid token`
**Error:** `InternalServerErrorException: Failed to verify email`
**Root Cause:** Missing `verifyEmail()` mock in PrismaUserService
**Fix:** Add proper mock for transaction-based verification

**Test:** `should handle database errors during verification`
**Error:** Transaction mock not rejecting properly
**Root Cause:** Missing $transaction mock implementation
**Fix:** Mock Prisma.$transaction to simulate rollback

#### 3. **Edge Case Tests (5 failures)**

**Test:** `should handle verification when Redis is slow (timeout scenario)`
**Error:** Timeout simulation not working properly
**Root Cause:** Mock Redis.get() not actually delaying
**Fix:** Use jest.useFakeTimers() for proper async delay testing

**Test:** `should handle verification when user status changes between checks`
**Error:** Transaction not handling concurrent status changes
**Root Cause:** Missing proper mock sequencing for concurrent updates
**Fix:** Add multi-step mock sequencing with different return values

**Test:** `should handle stats calculation with no tokens`
**Error:** countVerifiedSince not being called
**Root Cause:** Mock setup issue in stats calculation
**Fix:** Ensure mock is properly configured before stats call

---

## Missing Test Scenarios

### Critical Gaps (Priority 1 - Security & Correctness)

#### Security Tests
```typescript
// MISSING: Timing attack resistance
describe('Security: Timing Attack Resistance', () => {
  it('should take consistent time for valid vs invalid tokens', async () => {
    // Measure response time for valid token
    // Measure response time for invalid token
    // Assert time difference < 50ms
  });

  it('should use constant-time comparison for token validation', async () => {
    // Test constantTimeCompare() directly
    // Verify no early exit on mismatch
  });

  it('should apply artificial delay on all error paths', async () => {
    // Test all error scenarios have delay
    // Measure timing consistency
  });
});

// MISSING: Token reuse prevention
describe('Security: Token Reuse Prevention', () => {
  it('should prevent concurrent verification with same token', async () => {
    // Simulate 2 concurrent requests with same token
    // One should succeed, other should fail
    // Verify GETDEL atomic operation
  });

  it('should not allow token reuse after successful verification', async () => {
    // Verify token once successfully
    // Attempt to verify again
    // Should fail with "invalid token"
  });
});

// MISSING: User enumeration prevention
describe('Security: User Enumeration Prevention', () => {
  it('should return same error for non-existent user and invalid token', async () => {
    // Test with non-existent user
    // Test with invalid token
    // Assert identical error messages
  });

  it('should return same error for email mismatch and invalid token', async () => {
    // Test with mismatched email
    // Test with invalid token
    // Assert identical error messages
  });

  it('should not reveal user existence in resend endpoint', async () => {
    // Test resend for non-existent user
    // Assert generic error message (no "user not found")
  });
});
```

#### Rate Limiting Edge Cases
```typescript
describe('Rate Limiting: Edge Cases', () => {
  it('should enforce rate limit exactly at threshold (3 attempts)', async () => {
    // Make exactly 3 resend requests
    // 4th should fail with rate limit error
  });

  it('should reset rate limit after time window expires', async () => {
    // Hit rate limit (3 attempts)
    // Fast-forward time by 1 hour + 1 second
    // 4th attempt should succeed
  });

  it('should track rate limit per user independently', async () => {
    // User A makes 3 requests (rate limited)
    // User B makes request (should succeed)
  });

  it('should handle rate limit counter expiration correctly', async () => {
    // Make 2 requests
    // Wait for counter to expire
    // Make 3 more requests (should succeed, not count previous 2)
  });
});
```

#### Database Transaction Scenarios
```typescript
describe('Database Transactions: Atomicity', () => {
  it('should rollback verification if status update fails', async () => {
    // Mock emailVerifiedAt update success
    // Mock status update failure
    // Assert transaction rolled back
    // Verify user still unverified
  });

  it('should rollback status update if emailVerifiedAt fails', async () => {
    // Mock emailVerifiedAt update failure
    // Assert status not updated
    // Verify transaction atomicity
  });

  it('should handle database connection loss during transaction', async () => {
    // Simulate connection drop mid-transaction
    // Assert proper error handling
    // Verify no partial updates
  });
});
```

### High Priority Gaps (Priority 2 - Reliability)

#### Redis Failure Scenarios
```typescript
describe('Redis Failure Handling', () => {
  it('should handle Redis connection loss during token storage', async () => {
    // Mock Redis connection error
    // Assert proper error propagation
    // Verify user-friendly error message
  });

  it('should handle Redis timeout during GETDEL operation', async () => {
    // Mock Redis timeout
    // Assert graceful degradation
    // Verify no token left in inconsistent state
  });

  it('should handle Redis cluster failover during verification', async () => {
    // Simulate cluster failover
    // Verify retry logic or proper error
  });
});

describe('Redis Memory Limits', () => {
  it('should handle Redis OOM during token generation', async () => {
    // Mock Redis OOM error
    // Assert proper error handling
  });

  it('should cleanup expired tokens before generating new ones', async () => {
    // Fill Redis with expired tokens
    // Generate new token
    // Verify cleanup executed
  });
});
```

#### Concurrent Access Scenarios
```typescript
describe('Concurrency: Race Conditions', () => {
  it('should handle simultaneous token generation for same user', async () => {
    // Generate 2 tokens concurrently for same user
    // Verify both tokens valid
    // Verify reverse lookup points to latest token
  });

  it('should handle concurrent verification attempts with different tokens', async () => {
    // Generate token1
    // Generate token2 (overwrites reverse lookup)
    // Verify with token1 (should fail - old token)
    // Verify with token2 (should succeed)
  });

  it('should handle concurrent resend requests', async () => {
    // Make 5 concurrent resend requests
    // Verify rate limit properly enforced
    // Verify only 3 tokens generated
  });
});
```

### Medium Priority Gaps (Priority 3 - Edge Cases)

#### Boundary Conditions
```typescript
describe('Boundary Conditions', () => {
  it('should handle token exactly at expiry time', async () => {
    // Generate token
    // Fast-forward to exact expiry time
    // Attempt verification
    // Should fail (expired)
  });

  it('should handle token 1ms before expiry', async () => {
    // Generate token
    // Fast-forward to expiry - 1ms
    // Attempt verification
    // Should succeed
  });

  it('should handle maximum length email addresses', async () => {
    // Generate token with 320-char email (RFC max)
    // Verify storage and retrieval
  });

  it('should handle email with all valid special characters', async () => {
    // Test: user+tag@sub.domain.co.uk
    // Verify no encoding issues
  });
});
```

#### Data Integrity
```typescript
describe('Data Integrity', () => {
  it('should handle corrupted token data in Redis', async () => {
    // Store malformed JSON
    // Attempt verification
    // Should handle gracefully
  });

  it('should handle missing fields in token data', async () => {
    // Store token with missing userId
    // Attempt verification
    // Should fail safely
  });

  it('should handle token data with wrong types', async () => {
    // Store token with expiresAt as string not Date
    // Verify proper type handling
  });
});
```

---

## Integration Test Gaps

### Missing Integration Tests (Priority 1)

#### Full Workflow Tests
```typescript
describe('Email Verification Integration Tests', () => {
  describe('Happy Path: Complete Flow', () => {
    it('should complete register → generate token → verify → activate flow', async () => {
      // 1. Register new user (INACTIVE status)
      // 2. Generate verification token
      // 3. Verify token
      // 4. Assert user status = ACTIVE
      // 5. Assert emailVerifiedAt set
      // 6. Assert token cleaned up
    });

    it('should handle resend → verify flow', async () => {
      // 1. Register user
      // 2. Generate token1
      // 3. Resend (generates token2)
      // 4. Verify with token2
      // 5. Assert token1 invalidated
      // 6. Assert success
    });
  });

  describe('Error Recovery', () => {
    it('should recover from expired token by resending', async () => {
      // 1. Generate token
      // 2. Wait for expiry
      // 3. Attempt verification (fail)
      // 4. Resend new token
      // 5. Verify successfully
    });

    it('should handle database rollback and retry', async () => {
      // 1. Simulate transaction failure
      // 2. Verify error handling
      // 3. Retry verification
      // 4. Assert success on retry
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('should enforce rate limit across multiple resend attempts', async () => {
      // 1. Register user
      // 2. Resend 3 times (should succeed)
      // 3. 4th resend should fail with rate limit error
      // 4. Wait 1 hour
      // 5. 5th resend should succeed
    });
  });

  describe('Database + Redis Interaction', () => {
    it('should handle Redis cleanup when database update fails', async () => {
      // 1. Token exists in Redis
      // 2. Database update fails
      // 3. Verify token NOT consumed (still in Redis for retry)
    });

    it('should handle database cleanup when Redis fails', async () => {
      // 1. Verification succeeds in DB
      // 2. Redis cleanup fails
      // 3. Verify user still verified (eventual consistency)
    });
  });
});
```

---

## E2E Test Gaps

### Missing E2E Tests (Priority 2)

#### User Journey Tests
```typescript
describe('Email Verification E2E Tests', () => {
  describe('New User Registration Journey', () => {
    it('should verify email and enable full account access', async () => {
      // 1. POST /auth/register (get back tokens + user)
      // 2. Receive email (mock email service)
      // 3. Extract token from email link
      // 4. GET /auth/verify-email?token=XXX
      // 5. Assert user can now access protected routes
      // 6. POST /auth/login (should succeed)
    });

    it('should prevent access to protected resources until verified', async () => {
      // 1. Register user
      // 2. Attempt to access /api/accounts (should fail - INACTIVE)
      // 3. Verify email
      // 4. Attempt /api/accounts again (should succeed - ACTIVE)
    });
  });

  describe('Token Expiration Journey', () => {
    it('should guide user through expired token resend flow', async () => {
      // 1. Register user
      // 2. Wait for token expiry (or mock time)
      // 3. GET /auth/verify-email?token=expired (fail)
      // 4. POST /auth/resend-verification
      // 5. Verify with new token
      // 6. Assert success
    });
  });

  describe('Rate Limit Journey', () => {
    it('should prevent email flooding with clear error messages', async () => {
      // 1. Register user
      // 2. POST /auth/resend-verification (3 times, succeed)
      // 3. 4th attempt (fail with clear message)
      // 4. Assert error message includes wait time
    });
  });

  describe('Multi-User Concurrent Access', () => {
    it('should handle 100 concurrent users registering and verifying', async () => {
      // 1. Register 100 users concurrently
      // 2. Generate 100 verification tokens
      // 3. Verify all 100 users concurrently
      // 4. Assert all succeeded
      // 5. Assert no token reuse
      // 6. Assert no race conditions
    });
  });
});
```

---

## Test Quality Improvements

### Current Issues

#### Mock Implementation Problems

1. **Rate Limit Mock Incomplete:**
```typescript
// CURRENT: Mock doesn't properly track counter
async incr(key: string): Promise<number> {
  const entry = this.store.get(key);
  const currentValue = entry ? parseInt(entry.value) : 0;
  const newValue = currentValue + 1;
  this.store.set(key, { value: newValue.toString() });
  return newValue;
}

// ISSUE: Missing expiry tracking for rate limit counters
// FIX: Add expiresAt field when incr() is called
```

2. **Transaction Mock Missing:**
```typescript
// CURRENT: mockPrismaService doesn't implement $transaction properly
mockPrismaService = {
  $transaction: jest.fn(),
} as any;

// ISSUE: No mock implementation for actual transaction logic
// FIX: Add proper callback execution mock
mockPrismaService.$transaction.mockImplementation(async (callback) => {
  return callback(mockPrismaService);
});
```

3. **Timing Mock Inaccurate:**
```typescript
// CURRENT: artificialDelay() not actually delaying in tests
private async artificialDelay(): Promise<void> {
  const delay = Math.floor(Math.random() * 200) + 100;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

// ISSUE: Jest doesn't wait for real setTimeout in tests
// FIX: Use jest.useFakeTimers() and jest.advanceTimersByTime()
```

#### Test Organization Problems

1. **Setup/Teardown Inefficiency:**
```typescript
// CURRENT: Full service re-initialization for each test
beforeEach(async () => {
  // Rebuilds entire testing module (slow)
  const module = await Test.createTestingModule({...}).compile();
});

// ISSUE: 42 tests × rebuild time = slow test suite
// FIX: Use beforeAll() for module creation, beforeEach() for state reset only
```

2. **Duplicate Test Logic:**
```typescript
// CURRENT: Many tests repeat same setup code
const user = createMockUser({ emailVerifiedAt: null });
const token = crypto.randomBytes(32).toString('hex');
const tokenData: EmailVerificationToken = { ... };
await mockRedis.setex(...);

// ISSUE: 50+ lines of duplication across tests
// FIX: Create test factories and helper functions
```

#### Assertion Quality Issues

1. **Weak Assertions:**
```typescript
// CURRENT: Only checks if token exists
expect(token).toBeDefined();
expect(typeof token).toBe('string');

// BETTER: Check token properties
expect(token).toMatch(/^[a-f0-9]{64}$/); // Hex format
expect(await mockRedis.get(`email_verification:${token}`)).toBeTruthy();
```

2. **Missing Negative Tests:**
```typescript
// CURRENT: Only tests success path
expect(result.success).toBe(true);

// MISSING: Test what DIDN'T happen
expect(mockPrismaService.update).not.toHaveBeenCalledWith(
  expect.anything(),
  { status: UserStatus.SUSPENDED } // Should not suspend
);
```

---

## Test Improvement Recommendations

### Immediate Fixes (Priority 1 - This Week)

#### 1. Fix Failing Tests (ETA: 4 hours)

**Rate Limit Tests (1.5 hours):**
```typescript
// Fix MockRedis.incr() to track expiry
async incr(key: string): Promise<number> {
  const entry = this.store.get(key);
  const currentValue = entry ? parseInt(entry.value) : 0;
  const newValue = currentValue + 1;

  // Preserve existing expiry or set default
  const expiresAt = entry?.expiresAt ?? Date.now() + 3600 * 1000;

  this.store.set(key, {
    value: newValue.toString(),
    expiresAt
  });
  return newValue;
}

// Fix checkResendRateLimit test
it('should prevent resending when rate limit exceeded', async () => {
  const userId = 'user-123';
  const user = createMockUser({ id: userId, emailVerifiedAt: null });

  mockPrismaUserService.findOne.mockResolvedValue(user);

  // Simulate 3 previous resend attempts
  await mockRedis.setex(`email_verification_ratelimit:${userId}`, 3600, '3');

  await expect(service.resendVerificationEmail(userId))
    .rejects.toThrow(/Too many verification email requests/);
});
```

**Transaction Tests (1.5 hours):**
```typescript
// Fix $transaction mock
beforeEach(() => {
  mockPrismaService.$transaction.mockImplementation(async (callback) => {
    // Execute callback with transaction-wrapped prisma
    return callback({
      user: {
        update: mockPrismaUserService.update
      }
    });
  });
});

// Fix verifyEmail test
it('should verify email and update status atomically', async () => {
  const user = createMockUser({ emailVerifiedAt: null });
  const token = await service.generateVerificationToken(user.id, user.email);

  const updatedUser = { ...user, emailVerifiedAt: new Date(), status: UserStatus.ACTIVE };

  mockPrismaUserService.findOne.mockResolvedValue(user);
  mockPrismaUserService.update
    .mockResolvedValueOnce({ ...user, emailVerifiedAt: new Date() }) // First update
    .mockResolvedValueOnce(updatedUser); // Second update

  const result = await service.verifyEmail(token);

  expect(result.success).toBe(true);
  expect(mockPrismaUserService.update).toHaveBeenCalledTimes(2);
});
```

**Edge Case Tests (1 hour):**
```typescript
// Fix Redis slow test
it('should handle Redis latency gracefully', async () => {
  jest.useFakeTimers();

  const user = createMockUser();
  const token = await service.generateVerificationToken(user.id, user.email);

  // Mock slow Redis with fake timers
  jest.spyOn(mockRedis, 'getdel').mockImplementation(async (key) => {
    jest.advanceTimersByTime(150); // Simulate 150ms delay
    return mockRedis.store.get(key)?.value || null;
  });

  mockPrismaUserService.findOne.mockResolvedValue(user);
  mockPrismaUserService.update.mockResolvedValue({
    ...user,
    emailVerifiedAt: new Date(),
    status: UserStatus.ACTIVE
  });

  const resultPromise = service.verifyEmail(token);
  jest.runAllTimers();

  const result = await resultPromise;
  expect(result.success).toBe(true);

  jest.useRealTimers();
});
```

#### 2. Add Security Tests (ETA: 3 hours)

**File:** `__tests__/unit/auth/services/email-verification-security.spec.ts`

```typescript
import { performance } from 'perf_hooks';

describe('EmailVerificationService - Security Tests', () => {
  describe('Timing Attack Resistance', () => {
    it('should take consistent time for valid vs invalid tokens', async () => {
      const validToken = await service.generateVerificationToken('user-123', 'test@example.com');
      const invalidToken = crypto.randomBytes(32).toString('hex');

      // Measure valid token time
      const start1 = performance.now();
      try {
        await service.verifyEmail(validToken);
      } catch {}
      const time1 = performance.now() - start1;

      // Measure invalid token time
      const start2 = performance.now();
      try {
        await service.verifyEmail(invalidToken);
      } catch {}
      const time2 = performance.now() - start2;

      // Times should be within 100ms of each other
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });

    it('should use constant-time comparison for tokens', async () => {
      const service = moduleRef.get(EmailVerificationService);

      // Access private method via reflection (for testing only)
      const constantTimeCompare = (service as any).constantTimeCompare.bind(service);

      // Test: Same strings should return true
      expect(constantTimeCompare('abc123', 'abc123')).toBe(true);

      // Test: Different strings should return false
      expect(constantTimeCompare('abc123', 'abc124')).toBe(false);

      // Test: Different length strings should return false instantly
      expect(constantTimeCompare('abc', 'abcd')).toBe(false);

      // Security: Timing should be consistent regardless of where strings differ
      const str1 = 'a'.repeat(64);
      const str2Early = 'b' + 'a'.repeat(63); // Differs at position 0
      const str2Late = 'a'.repeat(63) + 'b';  // Differs at position 63

      const start1 = performance.now();
      constantTimeCompare(str1, str2Early);
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      constantTimeCompare(str1, str2Late);
      const time2 = performance.now() - start2;

      // Timing difference should be negligible (<1ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(1);
    });
  });

  describe('Token Reuse Prevention', () => {
    it('should atomically consume token on first verification', async () => {
      const user = createMockUser();
      const token = await service.generateVerificationToken(user.id, user.email);

      mockPrismaUserService.findOne.mockResolvedValue(user);
      mockPrismaUserService.update.mockResolvedValue({
        ...user,
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE
      });

      // First verification should succeed
      const result1 = await service.verifyEmail(token);
      expect(result1.success).toBe(true);

      // Second verification should fail (token consumed)
      await expect(service.verifyEmail(token))
        .rejects.toThrow('Invalid or expired verification token');

      // Verify token no longer in Redis
      expect(await mockRedis.get(`email_verification:${token}`)).toBeNull();
    });

    it('should prevent concurrent token reuse', async () => {
      const user = createMockUser();
      const token = await service.generateVerificationToken(user.id, user.email);

      mockPrismaUserService.findOne.mockResolvedValue(user);
      mockPrismaUserService.update.mockResolvedValue({
        ...user,
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE
      });

      // Simulate 2 concurrent requests with same token
      const [result1, result2] = await Promise.allSettled([
        service.verifyEmail(token),
        service.verifyEmail(token)
      ]);

      // One should succeed, one should fail
      const succeeded = [result1, result2].filter(r => r.status === 'fulfilled');
      const failed = [result1, result2].filter(r => r.status === 'rejected');

      expect(succeeded).toHaveLength(1);
      expect(failed).toHaveLength(1);
    });
  });

  describe('User Enumeration Prevention', () => {
    it('should return identical errors for different failure reasons', async () => {
      const token1 = crypto.randomBytes(32).toString('hex');
      const token2 = crypto.randomBytes(32).toString('hex');

      // Store token2 with non-existent user
      await mockRedis.setex(
        `email_verification:${token2}`,
        3600,
        JSON.stringify({
          token: token2,
          userId: 'non-existent-user',
          email: 'test@example.com',
          expiresAt: new Date(Date.now() + 3600000),
          createdAt: new Date()
        })
      );

      mockPrismaUserService.findOne.mockResolvedValue(null);

      // Get error messages
      let error1Message: string = '';
      let error2Message: string = '';

      try {
        await service.verifyEmail(token1); // Invalid token
      } catch (e: any) {
        error1Message = e.message;
      }

      try {
        await service.verifyEmail(token2); // User not found
      } catch (e: any) {
        error2Message = e.message;
      }

      // Error messages should be identical
      expect(error1Message).toBe(error2Message);
      expect(error1Message).toBe('Invalid or expired verification token');
    });

    it('should not reveal user existence in resend endpoint', async () => {
      mockPrismaUserService.findOne.mockResolvedValue(null);

      try {
        await service.resendVerificationEmail('non-existent-user');
      } catch (e: any) {
        // Should not say "user not found"
        expect(e.message).not.toMatch(/user not found/i);
        expect(e.message).not.toMatch(/does not exist/i);

        // Should use generic message
        expect(e.message).toMatch(/unable to process/i);
      }
    });
  });
});
```

#### 3. Add Test Helpers (ETA: 2 hours)

**File:** `__tests__/helpers/email-verification.helpers.ts`

```typescript
import * as crypto from 'crypto';
import { EmailVerificationToken } from '../../src/auth/services/email-verification.service';
import { User, UserStatus } from '../../generated/prisma';

export class EmailVerificationTestHelper {
  constructor(
    private mockRedis: any,
    private mockPrismaUserService: any,
    private service: any
  ) {}

  async createValidToken(userId: string, email: string): Promise<string> {
    const token = await this.service.generateVerificationToken(userId, email);
    return token;
  }

  async createExpiredToken(userId: string, email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenData: EmailVerificationToken = {
      token,
      userId,
      email,
      expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000)
    };

    await this.mockRedis.setex(
      `email_verification:${token}`,
      1,
      JSON.stringify(tokenData)
    );

    return token;
  }

  async setupMockUserForVerification(overrides?: Partial<User>): Promise<User> {
    const user = createMockUser({
      emailVerifiedAt: null,
      status: UserStatus.INACTIVE,
      ...overrides
    });

    this.mockPrismaUserService.findOne.mockResolvedValue(user);

    const verifiedUser = {
      ...user,
      emailVerifiedAt: new Date(),
      status: UserStatus.ACTIVE
    };

    this.mockPrismaUserService.update
      .mockResolvedValueOnce({ ...user, emailVerifiedAt: new Date() })
      .mockResolvedValueOnce(verifiedUser);

    return user;
  }

  async simulateRateLimitExceeded(userId: string): Promise<void> {
    await this.mockRedis.setex(
      `email_verification_ratelimit:${userId}`,
      3600,
      '3'
    );
  }

  async verifyTokenCleanup(token: string, userId: string): Promise<void> {
    expect(await this.mockRedis.get(`email_verification:${token}`)).toBeNull();
    expect(await this.mockRedis.get(`email_verification_user:${userId}`)).toBeNull();
  }
}

// Export factory
export function createEmailVerificationHelper(
  mockRedis: any,
  mockPrismaUserService: any,
  service: any
): EmailVerificationTestHelper {
  return new EmailVerificationTestHelper(mockRedis, mockPrismaUserService, service);
}
```

### Short-Term Improvements (Priority 2 - Next 2 Weeks)

#### 4. Integration Tests (ETA: 8 hours)

**File:** `__tests__/integration/email-verification.integration.spec.ts`

```typescript
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { createTestRedis } from '../helpers/redis';

describe('Email Verification Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;
  let service: EmailVerificationService;

  beforeAll(async () => {
    // Setup real database + Redis
    const db = await setupTestDatabase();
    redis = await createTestRedis();

    const module = await Test.createTestingModule({
      imports: [
        PrismaModule,
        RedisModule.forRoot({ client: redis }),
        AuthModule
      ]
    }).compile();

    app = module.createNestApplication();
    await app.init();

    service = module.get(EmailVerificationService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await redis.quit();
    await app.close();
  });

  describe('Full Verification Workflow', () => {
    it('should complete register → verify → activate flow', async () => {
      // 1. Create user in database
      const user = await prisma.user.create({
        data: {
          email: 'integration@test.com',
          firstName: 'Integration',
          lastName: 'Test',
          passwordHash: 'hashed',
          status: UserStatus.INACTIVE,
          currency: 'USD',
          timezone: 'UTC',
          role: UserRole.MEMBER
        }
      });

      expect(user.emailVerifiedAt).toBeNull();
      expect(user.status).toBe(UserStatus.INACTIVE);

      // 2. Generate verification token
      const token = await service.generateVerificationToken(user.id, user.email);
      expect(token).toMatch(/^[a-f0-9]{64}$/);

      // 3. Verify token in Redis
      const tokenData = await redis.get(`email_verification:${token}`);
      expect(tokenData).toBeTruthy();

      // 4. Verify email
      const result = await service.verifyEmail(token);
      expect(result.success).toBe(true);

      // 5. Verify database updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      expect(updatedUser!.emailVerifiedAt).toBeInstanceOf(Date);
      expect(updatedUser!.status).toBe(UserStatus.ACTIVE);

      // 6. Verify Redis cleanup
      expect(await redis.get(`email_verification:${token}`)).toBeNull();
      expect(await redis.get(`email_verification_user:${user.id}`)).toBeNull();
    });

    it('should handle resend → verify flow', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'resend@test.com',
          firstName: 'Resend',
          lastName: 'Test',
          passwordHash: 'hashed',
          status: UserStatus.INACTIVE,
          currency: 'USD',
          timezone: 'UTC',
          role: UserRole.MEMBER
        }
      });

      // Generate initial token
      const token1 = await service.generateVerificationToken(user.id, user.email);

      // Resend (should invalidate token1 and generate token2)
      const token2 = await service.resendVerificationEmail(user.id);
      expect(token2).not.toBe(token1);

      // token1 should be invalid
      await expect(service.verifyEmail(token1))
        .rejects.toThrow('Invalid or expired verification token');

      // token2 should work
      const result = await service.verifyEmail(token2);
      expect(result.success).toBe(true);
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('should enforce rate limit across multiple requests', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'ratelimit@test.com',
          firstName: 'Rate',
          lastName: 'Limit',
          passwordHash: 'hashed',
          status: UserStatus.INACTIVE,
          currency: 'USD',
          timezone: 'UTC',
          role: UserRole.MEMBER
        }
      });

      // First 3 resends should succeed
      await service.resendVerificationEmail(user.id);
      await service.resendVerificationEmail(user.id);
      await service.resendVerificationEmail(user.id);

      // 4th should fail
      await expect(service.resendVerificationEmail(user.id))
        .rejects.toThrow(/Too many verification email requests/);

      // Verify rate limit counter in Redis
      const counter = await redis.get(`email_verification_ratelimit:${user.id}`);
      expect(counter).toBe('3');
    });
  });

  describe('Database + Redis Consistency', () => {
    it('should maintain consistency when Redis fails', async () => {
      // TODO: Implement Redis failure simulation
    });

    it('should maintain consistency when database fails', async () => {
      // TODO: Implement database failure simulation
    });
  });
});
```

#### 5. Performance Tests (ETA: 4 hours)

**File:** `__tests__/performance/email-verification.perf.spec.ts`

```typescript
describe('Email Verification Performance Tests', () => {
  describe('Token Generation Performance', () => {
    it('should generate 1000 tokens in under 2 seconds', async () => {
      const start = performance.now();

      const promises = Array.from({ length: 1000 }, (_, i) =>
        service.generateVerificationToken(`user-${i}`, `user${i}@test.com`)
      );

      await Promise.all(promises);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000); // <2s for 1000 tokens
    });
  });

  describe('Verification Performance', () => {
    it('should verify 100 tokens concurrently in under 5 seconds', async () => {
      // Setup: Generate 100 tokens
      const users = Array.from({ length: 100 }, (_, i) =>
        createMockUser({ id: `user-${i}`, email: `user${i}@test.com` })
      );

      const tokens = await Promise.all(
        users.map(u => service.generateVerificationToken(u.id, u.email))
      );

      // Measure verification time
      const start = performance.now();

      await Promise.all(
        tokens.map(token => service.verifyEmail(token))
      );

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5000); // <5s for 100 verifications
    });
  });

  describe('Cleanup Performance', () => {
    it('should cleanup 10000 expired tokens in under 30 seconds', async () => {
      // Setup: Create 10000 expired tokens
      for (let i = 0; i < 10000; i++) {
        const token = crypto.randomBytes(32).toString('hex');
        const tokenData: EmailVerificationToken = {
          token,
          userId: `user-${i}`,
          email: `user${i}@test.com`,
          expiresAt: new Date(Date.now() - 3600000),
          createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000)
        };

        await mockRedis.setex(
          `email_verification:${token}`,
          1,
          JSON.stringify(tokenData)
        );
      }

      // Measure cleanup time
      const start = performance.now();
      const deletedCount = await service.cleanupExpiredTokens();
      const duration = performance.now() - start;

      expect(deletedCount).toBe(10000);
      expect(duration).toBeLessThan(30000); // <30s for 10k tokens
    });
  });
});
```

### Long-Term Improvements (Priority 3 - Next Month)

#### 6. E2E Tests with Real Email Service (ETA: 12 hours)

```typescript
describe('Email Verification E2E Tests', () => {
  // Use Mailhog or similar for email testing
  let mailhog: MailhogClient;

  beforeAll(async () => {
    mailhog = await connectToMailhog();
  });

  it('should send email and verify link works end-to-end', async () => {
    // Register user
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e@test.com',
        firstName: 'E2E',
        lastName: 'Test',
        password: 'Password123!'
      })
      .expect(201);

    // Wait for email
    await waitFor(() => mailhog.hasEmail('e2e@test.com'), 5000);

    // Get email and extract link
    const email = await mailhog.getLatestEmail('e2e@test.com');
    const verificationLink = extractLinkFromEmail(email);

    // Click link
    await request(app.getHttpServer())
      .get(verificationLink)
      .expect(302); // Redirect to success page

    // Verify user is active
    const user = await prisma.user.findUnique({
      where: { email: 'e2e@test.com' }
    });

    expect(user!.status).toBe(UserStatus.ACTIVE);
    expect(user!.emailVerifiedAt).toBeInstanceOf(Date);
  });
});
```

---

## Implementation Roadmap

### Week 1: Critical Fixes
- [ ] Fix 11 failing tests (4 hours)
- [ ] Add security tests (3 hours)
- [ ] Add test helpers (2 hours)
- [ ] Improve mock implementations (2 hours)
- [ ] **Goal:** 100% passing tests, 90%+ coverage

### Week 2: Integration Tests
- [ ] Setup integration test infrastructure (2 hours)
- [ ] Write full workflow integration tests (4 hours)
- [ ] Write rate limit integration tests (2 hours)
- [ ] Write consistency tests (2 hours)
- [ ] **Goal:** Complete integration test coverage

### Week 3: Performance & E2E
- [ ] Write performance benchmarks (4 hours)
- [ ] Setup E2E test infrastructure (4 hours)
- [ ] Write critical user journey E2E tests (4 hours)
- [ ] **Goal:** Performance baseline + E2E coverage

### Week 4: Polish & Documentation
- [ ] Refactor test organization (4 hours)
- [ ] Add edge case tests (4 hours)
- [ ] Update documentation (2 hours)
- [ ] Create test maintenance guide (2 hours)
- [ ] **Goal:** Maintainable, documented test suite

---

## Success Metrics

### Coverage Targets
- **Unit Tests:** 95%+ statement/branch coverage
- **Integration Tests:** 85%+ end-to-end workflow coverage
- **E2E Tests:** 80%+ critical user journey coverage

### Quality Targets
- **Test Pass Rate:** 100% (zero flaky tests)
- **Test Execution Time:** <15s unit, <60s integration, <3min E2E
- **Maintainability:** Test code follows same standards as production code

### Security Targets
- **Timing Attack Tests:** All security-sensitive operations tested
- **Race Condition Tests:** All concurrent scenarios covered
- **Enumeration Tests:** All error paths verified for information leakage

---

## Additional Testing Tools Needed

### Current Stack (Adequate)
- ✅ Jest - Unit testing framework
- ✅ @nestjs/testing - NestJS testing utilities
- ✅ Supertest - HTTP integration testing

### Recommended Additions

1. **faker-js/faker** (Test Data Generation)
```bash
pnpm add -D @faker-js/faker
```
Benefits: Realistic test data, reduce boilerplate

2. **jest-extended** (Better Assertions)
```bash
pnpm add -D jest-extended
```
Benefits: `toBeWithin()`, `toHaveBeenCalledBefore()`, etc.

3. **msw** (Mock Service Worker - for E2E)
```bash
pnpm add -D msw
```
Benefits: Intercept actual HTTP requests in E2E tests

4. **mailhog-smtp** (Email Testing)
```bash
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
pnpm add -D mailhog
```
Benefits: Test actual email sending in E2E tests

---

## Code Snippets: Key Test Scenarios

### 1. Atomic Token Consumption Test
```typescript
it('should consume token atomically using GETDEL', async () => {
  const user = createMockUser();
  const token = await service.generateVerificationToken(user.id, user.email);

  // Spy on Redis GETDEL command
  const getdelSpy = jest.spyOn(mockRedis, 'getdel');

  mockPrismaUserService.findOne.mockResolvedValue(user);
  mockPrismaUserService.update.mockResolvedValue({
    ...user,
    emailVerifiedAt: new Date(),
    status: UserStatus.ACTIVE
  });

  await service.verifyEmail(token);

  // Verify GETDEL was used (atomic operation)
  expect(getdelSpy).toHaveBeenCalledWith(`email_verification:${token}`);
  expect(getdelSpy).toHaveBeenCalledTimes(1);

  // Verify token no longer exists
  expect(await mockRedis.get(`email_verification:${token}`)).toBeNull();
});
```

### 2. Transaction Rollback Test
```typescript
it('should rollback verification if status update fails', async () => {
  const user = createMockUser({ emailVerifiedAt: null });
  const token = await service.generateVerificationToken(user.id, user.email);

  mockPrismaUserService.findOne.mockResolvedValue(user);

  // Mock transaction to fail on second update
  mockPrismaService.$transaction.mockImplementation(async (callback) => {
    const txClient = {
      user: {
        update: jest.fn()
          .mockResolvedValueOnce({ ...user, emailVerifiedAt: new Date() })
          .mockRejectedValueOnce(new Error('Status update failed'))
      }
    };

    try {
      return await callback(txClient);
    } catch (error) {
      // Rollback: throw error to caller
      throw error;
    }
  });

  // Verification should fail with InternalServerErrorException
  await expect(service.verifyEmail(token))
    .rejects.toThrow(InternalServerErrorException);

  // Verify user still unverified in database
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  expect(dbUser!.emailVerifiedAt).toBeNull();
  expect(dbUser!.status).toBe(UserStatus.INACTIVE);
});
```

### 3. Rate Limit Boundary Test
```typescript
it('should enforce rate limit exactly at threshold (3 attempts)', async () => {
  const user = createMockUser({ emailVerifiedAt: null });

  mockPrismaUserService.findOne.mockResolvedValue(user);

  // Attempt 1, 2, 3 should succeed
  await service.resendVerificationEmail(user.id);
  await service.resendVerificationEmail(user.id);
  await service.resendVerificationEmail(user.id);

  // Verify rate limit counter = 3
  const counter = await mockRedis.get(`email_verification_ratelimit:${user.id}`);
  expect(counter).toBe('3');

  // Attempt 4 should fail with rate limit error
  await expect(service.resendVerificationEmail(user.id))
    .rejects.toThrow(/Too many verification email requests/);

  // Counter should still be 3 (not incremented on failure)
  const counterAfter = await mockRedis.get(`email_verification_ratelimit:${user.id}`);
  expect(counterAfter).toBe('3');
});
```

### 4. Concurrent Verification Prevention Test
```typescript
it('should prevent concurrent verification with same token', async () => {
  const user = createMockUser();
  const token = await service.generateVerificationToken(user.id, user.email);

  mockPrismaUserService.findOne.mockResolvedValue(user);
  mockPrismaUserService.update.mockResolvedValue({
    ...user,
    emailVerifiedAt: new Date(),
    status: UserStatus.ACTIVE
  });

  // Simulate race condition: 2 requests arrive simultaneously
  const [result1, result2] = await Promise.allSettled([
    service.verifyEmail(token),
    service.verifyEmail(token)
  ]);

  // One should succeed (fulfilled)
  const succeeded = [result1, result2].filter(r => r.status === 'fulfilled');
  expect(succeeded).toHaveLength(1);

  // One should fail (rejected) - token already consumed
  const failed = [result1, result2].filter(r => r.status === 'rejected');
  expect(failed).toHaveLength(1);

  // Verify error message
  const failedResult = failed[0] as PromiseRejectedResult;
  expect(failedResult.reason.message).toMatch(/Invalid or expired verification token/);
});
```

### 5. Timing Consistency Test
```typescript
describe('Timing Attack Resistance', () => {
  it('should return errors in consistent time regardless of failure reason', async () => {
    const measurements: number[] = [];

    // Test 1: Invalid token (not in Redis)
    const invalidToken = crypto.randomBytes(32).toString('hex');

    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      try {
        await service.verifyEmail(invalidToken);
      } catch {}
      measurements.push(performance.now() - start);
    }

    const avgInvalid = measurements.reduce((a, b) => a + b) / measurements.length;

    // Test 2: Valid token but user not found
    const user = createMockUser();
    const validToken = await service.generateVerificationToken(user.id, user.email);
    mockPrismaUserService.findOne.mockResolvedValue(null);

    measurements.length = 0;

    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      try {
        await service.verifyEmail(validToken);
      } catch {}
      measurements.push(performance.now() - start);
    }

    const avgNotFound = measurements.reduce((a, b) => a + b) / measurements.length;

    // Average times should be within 50ms of each other
    expect(Math.abs(avgInvalid - avgNotFound)).toBeLessThan(50);
  });
});
```

---

## Estimated Time Investment

| Category | Task | Hours | Priority |
|----------|------|-------|----------|
| **Critical Fixes** | Fix 11 failing tests | 4 | P1 |
| | Improve mock implementations | 2 | P1 |
| | Add security tests | 3 | P1 |
| | Add test helpers | 2 | P1 |
| **Subtotal** | | **11** | |
| **Integration Tests** | Setup infrastructure | 2 | P2 |
| | Write workflow tests | 4 | P2 |
| | Write consistency tests | 2 | P2 |
| **Subtotal** | | **8** | |
| **Performance & E2E** | Performance benchmarks | 4 | P2 |
| | E2E infrastructure | 4 | P3 |
| | E2E user journeys | 4 | P3 |
| **Subtotal** | | **12** | |
| **Polish** | Refactor organization | 4 | P3 |
| | Edge case tests | 4 | P3 |
| | Documentation | 4 | P3 |
| **Subtotal** | | **12** | |
| **TOTAL** | | **43 hours** | |

**Recommended Sprint Plan:**
- **Sprint 1 (Week 1):** P1 tasks (11 hours) - Get to 100% passing, 90%+ coverage
- **Sprint 2 (Week 2):** P2 integration tests (8 hours) - Complete workflow coverage
- **Sprint 3 (Week 3):** P2 performance + P3 E2E (8 hours) - Performance baseline
- **Sprint 4 (Week 4):** P3 polish (4 hours) - Maintainable test suite

---

## Conclusion

The email verification service has a **solid foundation** with 86% coverage and good test structure. However, **critical gaps exist** in:

1. **Security testing** (timing attacks, token reuse, enumeration prevention)
2. **Rate limiting enforcement** (tests are failing, not properly implemented in mocks)
3. **Database transactions** (rollback scenarios untested)
4. **Integration testing** (no real database + Redis interaction tests)
5. **E2E testing** (no complete user journey tests)

**Immediate Action Items:**
1. Fix 11 failing tests (4 hours) - **START HERE**
2. Add security tests (3 hours) - **CRITICAL FOR PRODUCTION**
3. Improve mock implementations (2 hours) - **ENABLES FUTURE TESTS**

**Success Criteria:**
- ✅ 100% test pass rate (zero flaky tests)
- ✅ 95%+ code coverage
- ✅ All security scenarios tested
- ✅ Integration tests verify database + Redis consistency
- ✅ E2E tests verify complete user journeys

**Estimated Effort:** 43 hours over 4 weeks

This plan provides a clear roadmap from current state (73% passing) to production-ready test suite (100% passing, comprehensive coverage).
