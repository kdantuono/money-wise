# Email Verification Test - Quick Reference Card

**Quick Status Check:**
```bash
cd /home/nemesi/dev/money-wise/apps/backend
npx jest __tests__/unit/auth/services/email-verification.service.spec.ts --coverage
```

---

## Current Status (2025-10-22)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Pass Rate** | 73.8% (31/42) | 100% | ⚠️ NEEDS WORK |
| **Coverage** | 86.3% | 95% | ✅ GOOD |
| **Security Tests** | 0% | 100% | ❌ CRITICAL |
| **Integration Tests** | 0 tests | Full coverage | ❌ MISSING |
| **E2E Tests** | 0 tests | Critical journeys | ⚠️ DEFERRED |

---

## 3 Critical Issues (Fix First)

### 1. Rate Limiting Tests Failing
**Problem:** Mock doesn't track expiry properly
**Impact:** Security feature untested
**Fix:** Update `MockRedis.incr()` to preserve expiry
**Time:** 1.5 hours

### 2. Security Methods Untested
**Problem:** 0% coverage on timing attack prevention
**Impact:** Security vulnerability risk
**Fix:** Add security test suite
**Time:** 3 hours

### 3. Transaction Tests Failing
**Problem:** Missing `$transaction` mock
**Impact:** Data integrity untested
**Fix:** Add transaction mock implementation
**Time:** 1.5 hours

**Total to Production-Ready:** 6 hours

---

## Quick Fixes (Copy-Paste Ready)

### Fix 1: Rate Limit Mock (1.5h)

**File:** `apps/backend/__tests__/unit/auth/services/email-verification.service.spec.ts`

**Find this:**
```typescript
async incr(key: string): Promise<number> {
  const entry = this.store.get(key);
  const currentValue = entry ? parseInt(entry.value) : 0;
  const newValue = currentValue + 1;
  this.store.set(key, { value: newValue.toString() });
  return newValue;
}
```

**Replace with:**
```typescript
async incr(key: string): Promise<number> {
  const entry = this.store.get(key);
  const currentValue = entry ? parseInt(entry.value) : 0;
  const newValue = currentValue + 1;

  // CRITICAL FIX: Preserve expiry from previous set/expire call
  const expiresAt = entry?.expiresAt ?? Date.now() + 3600 * 1000;

  this.store.set(key, {
    value: newValue.toString(),
    expiresAt
  });
  return newValue;
}
```

### Fix 2: Transaction Mock (1.5h)

**File:** Same file, in `beforeEach()`

**Add after mockPrismaService setup:**
```typescript
mockPrismaService.$transaction.mockImplementation(async (callback) => {
  // Execute callback with mocked prisma client
  return callback({
    user: {
      update: mockPrismaUserService.update
    }
  });
});
```

**Update verifyEmail test mock:**
```typescript
mockPrismaUserService.update
  .mockResolvedValueOnce({ ...user, emailVerifiedAt: new Date() }) // First update
  .mockResolvedValueOnce(updatedUser); // Second update
```

### Fix 3: Add Security Tests (3h)

**Create new file:** `__tests__/unit/auth/services/email-verification-security.spec.ts`

**Copy this template:**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { performance } from 'perf_hooks';
import * as crypto from 'crypto';
import { EmailVerificationService } from '../../../../src/auth/services/email-verification.service';
import { createMockUser } from '../../../helpers/user.helper';

describe('EmailVerificationService - Security Tests', () => {
  let service: EmailVerificationService;
  let mockRedis: any;
  let mockPrismaUserService: any;

  beforeEach(async () => {
    // Same setup as main test file
    // ... (copy from email-verification.service.spec.ts)
  });

  describe('Timing Attack Resistance', () => {
    it('should take consistent time for valid vs invalid tokens', async () => {
      const validToken = await service.generateVerificationToken('user-123', 'test@example.com');
      const invalidToken = crypto.randomBytes(32).toString('hex');

      const measurements: number[] = [];

      // Measure 10 times for statistical significance
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        try { await service.verifyEmail(validToken); } catch {}
        measurements.push(performance.now() - start);
      }

      const avgValid = measurements.reduce((a, b) => a + b) / measurements.length;

      measurements.length = 0;

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        try { await service.verifyEmail(invalidToken); } catch {}
        measurements.push(performance.now() - start);
      }

      const avgInvalid = measurements.reduce((a, b) => a + b) / measurements.length;

      // Timing should be within 100ms (includes artificial delay)
      expect(Math.abs(avgValid - avgInvalid)).toBeLessThan(100);
    });
  });

  describe('Token Reuse Prevention', () => {
    it('should prevent concurrent verification with same token', async () => {
      const user = createMockUser();
      const token = await service.generateVerificationToken(user.id, user.email);

      mockPrismaUserService.findOne.mockResolvedValue(user);
      mockPrismaUserService.update.mockResolvedValue({
        ...user,
        emailVerifiedAt: new Date(),
        status: 'ACTIVE'
      });

      const [result1, result2] = await Promise.allSettled([
        service.verifyEmail(token),
        service.verifyEmail(token)
      ]);

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

      let error1Message = '';
      let error2Message = '';

      try { await service.verifyEmail(token1); } catch (e: any) { error1Message = e.message; }
      try { await service.verifyEmail(token2); } catch (e: any) { error2Message = e.message; }

      expect(error1Message).toBe(error2Message);
      expect(error1Message).toBe('Invalid or expired verification token');
    });
  });
});
```

---

## Test Commands

### Run All Email Verification Tests
```bash
cd apps/backend
npx jest __tests__/unit/auth/services/email-verification.service.spec.ts
```

### Run with Coverage
```bash
npx jest __tests__/unit/auth/services/email-verification.service.spec.ts --coverage
```

### Run Specific Test
```bash
npx jest __tests__/unit/auth/services/email-verification.service.spec.ts -t "should prevent resending if token was sent recently"
```

### Watch Mode (Development)
```bash
npx jest __tests__/unit/auth/services/email-verification.service.spec.ts --watch
```

### Run All Security Tests (After Fix 3)
```bash
npx jest __tests__/unit/auth/services/email-verification-security.spec.ts
```

---

## Expected Coverage After Fixes

| Category | Before | After | Improvement |
|----------|--------|-------|-------------|
| **Statements** | 86.3% | 95%+ | +8.7% |
| **Branches** | 82.5% | 92%+ | +9.5% |
| **Functions** | 86.4% | 95%+ | +8.6% |
| **Pass Rate** | 73.8% | 100% | +26.2% |

**Key Coverage Gains:**
- ✅ Lines 47-62 (Redis error handler)
- ✅ Line 85 (Rate limit exceeded path)
- ✅ Lines 192-198 (Database transaction)
- ✅ Security methods (constantTimeCompare, artificialDelay)

---

## Checklist: Production-Ready Tests

### Week 1: Critical Fixes (6 hours)
- [ ] Fix rate limit mock (1.5h)
- [ ] Fix transaction mock (1.5h)
- [ ] Add security tests (3h)
- [ ] Verify 100% pass rate
- [ ] Verify 90%+ coverage

### Week 2: Integration Tests (8 hours)
- [ ] Setup test database
- [ ] Write full workflow tests
- [ ] Write rate limit integration tests
- [ ] Write consistency tests

### Week 3: E2E Tests (Optional)
- [ ] Setup Mailhog for email testing
- [ ] Write user journey tests
- [ ] Write concurrent access tests

---

## Common Test Failures & Solutions

### Failure: "Expected exception not thrown" (Rate Limit)
**Cause:** Mock doesn't track counter properly
**Solution:** Apply Fix 1 (rate limit mock)

### Failure: "InternalServerErrorException: Failed to verify email"
**Cause:** Missing transaction mock
**Solution:** Apply Fix 2 (transaction mock)

### Failure: "Expected stats.recentVerifications to be 0"
**Cause:** Mock not reset between tests
**Solution:** Add `mockRedis.clear()` in `afterEach()`

### Failure: "Timeout waiting for verification"
**Cause:** Real setTimeout not working in tests
**Solution:** Use `jest.useFakeTimers()` and `jest.advanceTimersByTime()`

---

## Key Test Patterns

### Pattern 1: Setup Valid Token
```typescript
const user = createMockUser({ emailVerifiedAt: null });
const token = await service.generateVerificationToken(user.id, user.email);

mockPrismaUserService.findOne.mockResolvedValue(user);
mockPrismaUserService.update.mockResolvedValue({
  ...user,
  emailVerifiedAt: new Date(),
  status: UserStatus.ACTIVE
});

const result = await service.verifyEmail(token);
expect(result.success).toBe(true);
```

### Pattern 2: Simulate Rate Limit
```typescript
const userId = 'user-123';
await mockRedis.setex(`email_verification_ratelimit:${userId}`, 3600, '3');

await expect(service.resendVerificationEmail(userId))
  .rejects.toThrow(/Too many verification email requests/);
```

### Pattern 3: Test Concurrent Access
```typescript
const [result1, result2] = await Promise.allSettled([
  service.verifyEmail(token),
  service.verifyEmail(token)
]);

const succeeded = [result1, result2].filter(r => r.status === 'fulfilled');
expect(succeeded).toHaveLength(1); // Only one should succeed
```

---

## Performance Targets

| Operation | Target | Current | Status |
|-----------|--------|---------|--------|
| Token Generation | <5ms | ~2ms | ✅ GOOD |
| Verification | <100ms | ~50ms | ✅ GOOD |
| Cleanup (1000 tokens) | <2s | ~1.5s | ✅ GOOD |
| Test Suite Execution | <15s | ~11s | ✅ GOOD |

---

## Documentation Links

**Full Analysis:** [EMAIL_VERIFICATION_TEST_ANALYSIS.md](./EMAIL_VERIFICATION_TEST_ANALYSIS.md)
**Summary:** [EMAIL_VERIFICATION_TEST_SUMMARY.md](./EMAIL_VERIFICATION_TEST_SUMMARY.md)
**Test File:** `apps/backend/__tests__/unit/auth/services/email-verification.service.spec.ts`
**Implementation:** `apps/backend/src/auth/services/email-verification.service.ts`

---

## Questions?

**Coverage Issues:** See EMAIL_VERIFICATION_TEST_ANALYSIS.md § Coverage Gap Analysis
**Security Tests:** See EMAIL_VERIFICATION_TEST_ANALYSIS.md § Missing Test Scenarios
**Integration Tests:** See EMAIL_VERIFICATION_TEST_ANALYSIS.md § Integration Test Gaps
**E2E Tests:** See EMAIL_VERIFICATION_TEST_ANALYSIS.md § E2E Test Gaps

---

**Last Updated:** 2025-10-22
**Next Review:** After Week 1 fixes completed
