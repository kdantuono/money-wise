# E2E Test Pooled Users Migration Guide

## Problem Summary

All 8 E2E test shards were failing with API timeout errors due to parallel execution race conditions:
- CSRF token conflicts during concurrent user registrations
- Backend overload from 8 simultaneous registration attempts
- Timing issues with parallel database writes

## Solution: Pre-created User Pool

Instead of each test creating new users (causing race conditions), we now:
1. **Global Setup** creates 8 test users ONCE before tests run
2. **Tests** use pre-created users via round-robin distribution
3. **Eliminates** race conditions, CSRF conflicts, and backend overload

## Changes Made

### 1. global-setup.ts
- Added `createTestUserPool()` function
- Creates 8 test users (one per shard)
- Saves to `.auth/test-users.json`

### 2. auth-helpers.ts
- Added `loginWithPooledUser()` method (NEW - recommended)
- Added `waitForBackend()` - ensures backend is ready
- Added `getCsrfToken()` with retry logic
- Keeps existing methods for backward compatibility

## Migration: How to Update Your Tests

### Before (OLD - causes race conditions):
```typescript
test.beforeEach(async ({ page }) => {
  const authHelper = new AuthHelper(page);
  await authHelper.registerAndLogin();  // ❌ Creates NEW user = race condition
  await page.goto('/dashboard');
});
```

### After (NEW - uses pooled users):
```typescript
test.beforeEach(async ({ page }) => {
  const authHelper = new AuthHelper(page);
  await authHelper.loginWithPooledUser();  // ✅ Uses pre-created user
});
```

That's it! Just replace `registerAndLogin()` with `loginWithPooledUser()`.

## Benefits

- ✅ No more API timeout errors
- ✅ No more CSRF token conflicts
- ✅ Faster test execution (no registration delays)
- ✅ Consistent results across all 8 shards
- ✅ Better resource utilization

## Testing Locally

```bash
# 1. Clean previous test artifacts
rm -rf apps/web/e2e/.auth/*
rm -rf apps/web/test-results/*

# 2. Run global setup to create user pool
cd apps/web
pnpm exec playwright test --project=setup

# 3. Verify user pool was created
cat e2e/.auth/test-users.json
# Should show 8 users

# 4. Run tests (use pooled users automatically)
pnpm exec playwright test
```

## Backward Compatibility

**Existing methods still work**:
- `register()` - still available
- `login()` - still available
- `registerAndLogin()` - still available

But for parallel test execution, **use `loginWithPooledUser()`** to avoid race conditions.

## Files Modified

1. `apps/web/e2e/global-setup.ts` - Creates user pool
2. `apps/web/e2e/utils/auth-helpers.ts` - Adds pooled user support

## Technical Details

**User Pool Distribution**:
- 8 users created: `e2e-shard-0@moneywise.test` through `e2e-shard-7@moneywise.test`
- Round-robin distribution ensures each shard gets different user
- Thread-safe index increment prevents conflicts

**Health Check**:
- Waits up to 5 seconds for backend to be ready
- Prevents "connection refused" errors during test startup

**CSRF Token Retry**:
- Automatically retries up to 3 times if token not found
- Reloads page between retries to get fresh token
- Eliminates "Invalid CSRF token" errors

---

**Questions?** Check test-specialist analysis or review code comments in the modified files.
