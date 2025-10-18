# Test Coverage Failure Fix - Run #18607292092

## Issue Summary

**Run**: [#18607292092](https://github.com/kdantuono/money-wise/actions/runs/18607292092/job/53059245993)
**Job**: Testing Pipeline
**Failed Step**: Test Coverage
**Date**: 2025-10-17

## Root Cause Analysis

### Error
```
PrismaClientValidationError:
Invalid `this.prisma.account.create()` invocation

Argument `source` is missing.
```

### Location
`apps/backend/__tests__/performance/prisma-performance.spec.ts`

### Technical Details

1. **Schema Requirement**: The `Account` model in Prisma schema has a **required** `source` field:
   ```prisma
   model Account {
     source AccountSource  // No ? = REQUIRED field
   }
   ```

2. **Enum Values**: `AccountSource` can be:
   - `PLAID`: Account synced via Plaid API
   - `MANUAL`: User-entered data

3. **Missing in Tests**: Three test cases in the performance test file were creating accounts without providing the `source` field:
   - Line 218: `beforeEach` in "Accounts Endpoints" (creates test account)
   - Line 259: "should meet performance threshold for creating account"
   - Line 282: `beforeAll` in "Transactions Endpoints" (creates account with transactions)

## Solution

Added `source: 'MANUAL'` to all three account creation calls in the performance test file.

### Changes Made

```diff
diff --git a/apps/backend/__tests__/performance/prisma-performance.spec.ts b/apps/backend/__tests__/performance/prisma-performance.spec.ts
+++ b/apps/backend/__tests__/performance/prisma-performance.spec.ts
@@ -225,6 +225,7 @@ describe('Prisma Performance Benchmarks', () => {
           type: 'CHECKING',
           currency: 'USD',
           currentBalance: 1000,
+          source: 'MANUAL',
         })
         .expect(201);

@@ -267,6 +268,7 @@ describe('Prisma Performance Benchmarks', () => {
               type: 'SAVINGS',
               currency: 'USD',
               currentBalance: 5000,
+              source: 'MANUAL',
             })
             .expect(201),
         THRESHOLDS.accounts.create
@@ -287,6 +289,7 @@ describe('Prisma Performance Benchmarks', () => {
           type: 'CHECKING',
           currency: 'USD',
           currentBalance: 10000,
+          source: 'MANUAL',
         })
         .expect(201);
```

## Verification

### Why Integration Tests Didn't Fail

The integration test file (`apps/backend/__tests__/integration/accounts/accounts-api.integration.spec.ts`) **already had** the `source` field properly set in all account creation calls, which is why those tests passed.

### Affected Test Suite

Only the **performance test suite** was affected, specifically:
- Accounts Endpoints tests
- Transactions Endpoints tests (which depend on account creation)

## Impact

- **Before Fix**: Test coverage step failed due to Prisma validation error
- **After Fix**: All three account creation calls now include the required `source: 'MANUAL'` field
- **Expected Outcome**: Test coverage should pass in next CI/CD run

## Prevention

### For Developers

1. **Always check the Prisma schema** when creating test data
2. **Required fields** in Prisma don't have a `?` after the type
3. **Use TypeScript/DTO types** to catch missing fields at compile time
4. **Run tests locally** before pushing to catch validation errors early

### For Reviewers

1. Verify that all Prisma model fields are provided in test data
2. Check for consistency between integration tests and performance tests
3. Ensure CreateAccountDto is used consistently across test files

## Related Files

- Schema: `apps/backend/prisma/schema.prisma` (Account model, AccountSource enum)
- DTO: `apps/backend/src/accounts/dto/create-account.dto.ts` (CreateAccountDto with required source field)
- Performance Tests: `apps/backend/__tests__/performance/prisma-performance.spec.ts` (FIXED)
- Integration Tests: `apps/backend/__tests__/integration/accounts/accounts-api.integration.spec.ts` (Already correct)

## Next Steps

1. Push this fix to the branch
2. Wait for CI/CD to run
3. Verify that the test coverage step passes
4. Merge once all quality gates are green
