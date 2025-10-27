# MoneyWise E2E Testing - Playwright

This directory contains end-to-end tests for the MoneyWise application using Playwright.

## Overview

The E2E tests focus on critical user journeys required for MVP launch:

1. **Authentication** (`auth.spec.ts`) - User registration, login, session management
2. **Banking Integration** (`banking.spec.ts`) - Bank account linking, OAuth callback, account management
3. **Dashboard** (`dashboard.spec.ts`) - Dashboard display, interactions, responsiveness
4. **Critical Path** (`critical-path.spec.ts`) - Complete user journey from registration to dashboard

## Running Tests

### Install Dependencies

```bash
pnpm install
```

### Run All Tests

```bash
# From root directory
pnpm test:e2e:playwright

# Or with npm
npm run test:e2e:playwright
```

### Run Specific Test File

```bash
npx playwright test critical-path.spec.ts
npx playwright test auth.spec.ts
npx playwright test banking.spec.ts
npx playwright test dashboard.spec.ts
```

### Run in Debug Mode

```bash
pnpm test:e2e:playwright:debug
```

### Run with UI Mode

```bash
pnpm test:e2e:playwright:ui
```

### Run in Headed Mode (with browser visible)

```bash
pnpm test:e2e:playwright:headed
```

### Run Against Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Structure

### Test Files

- **`critical-path.spec.ts`** ⭐ CRITICAL - Complete user journey test (must pass for MVP)
  - Registration → Login → Banking → Dashboard
  - Error handling
  - Session persistence

- **`auth.spec.ts`** - Authentication scenarios
  - User registration with validation
  - Login with valid/invalid credentials
  - Session management
  - Protected routes

- **`banking.spec.ts`** - Banking integration
  - Banking page display
  - Bank account linking
  - OAuth callback handling
  - Account management
  - Error handling

- **`dashboard.spec.ts`** - Dashboard functionality
  - Layout and structure
  - Data display
  - Navigation
  - Interactions (filters, search, refresh)
  - Responsiveness (mobile, tablet, desktop)

### Test Fixtures

- **`fixtures/test-data.ts`** - Reusable test data
  - Test user accounts
  - Mock accounts and transactions
  - Page URLs and selectors
  - API endpoints
  - Timeouts

## Configuration

See `playwright.config.ts` in the root directory for:

- Browser configurations (Chromium, Firefox, WebKit)
- Mobile viewport testing (Chrome mobile, Safari mobile)
- Base URL and timeout settings
- Reporter configuration (HTML reports)
- Screenshot and video on failure
- Web server configuration

## Best Practices

### 1. Wait for Elements

```typescript
// Good - waits for element visibility
await expect(page.locator('[data-testid="login-button"]')).toBeVisible();

// Avoid - immediate clicks might fail
await page.click('[data-testid="login-button"]');
```

### 2. Use Data Attributes for Selectors

```typescript
// Good - stable selectors
await page.fill('[data-testid="email-input"]', 'test@example.com');

// Avoid - brittle selectors
await page.fill('input[placeholder="Email Address"]', 'test@example.com');
```

### 3. Test Business Logic, Not Implementation

```typescript
// Good - tests behavior
test('should show error when password is too weak', async ({ page }) => {
  await page.fill('input[name="password"]', 'weak');
  await page.click('button:has-text("Sign Up")');
  await expect(page.locator('[role="alert"]')).toBeVisible();
});

// Avoid - tests implementation details
test('should validate password length', async ({ page }) => {
  const input = page.locator('input[name="password"]');
  expect(await input.evaluate(el => el.minLength)).toBe(8);
});
```

### 4. Handle Dynamic Elements

```typescript
// Good - handles optional elements
if (await page.locator('[data-testid="sync-button"]').isVisible()) {
  await page.click('[data-testid="sync-button"]');
}

// Use timeouts appropriately
await page.locator('[aria-busy="true"]').isVisible({ timeout: 5000 }).catch(() => false);
```

## Debugging

### View Test Report

```bash
npx playwright show-report
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots: `test-results/`
- Videos: `test-results/` (on-failure only)

### Debug Specific Test

```bash
npx playwright test critical-path.spec.ts --debug
```

### Use Trace Viewer

```bash
npx playwright show-trace path/to/trace.zip
```

## CI/CD Integration

Tests are configured to run in GitHub Actions:

1. Tests run on push to feature branches
2. Tests must pass before PR merge
3. Tests run against staging environment
4. Reports are archived

## Test Data Management

### Dynamic User Generation

```typescript
const testUser = generateTestData.user();
// Generates unique email: test-{timestamp}@example.com
```

### Reset Test Data

Tests are designed to be independent:
- Each test registers new users
- No test depends on data from another test
- Use fixtures for setup/teardown

## Troubleshooting

### Tests Timeout

- Increase timeout in specific test:
  ```typescript
  test('my slow test', async ({ page }) => {
    // ...
  }, { timeout: 30000 }); // 30 seconds
  ```

- Check if development server is running:
  ```bash
  pnpm dev:web
  ```

### Element Not Found

- Verify selector is correct:
  ```typescript
  await page.locator('[data-testid="my-element"]').isVisible();
  ```

- Check if element appears dynamically:
  ```typescript
  await page.waitForSelector('[data-testid="my-element"]', { timeout: 5000 });
  ```

### Authentication Issues

- Clear browser data:
  ```typescript
  await context.clearCookies();
  await page.evaluate(() => localStorage.clear());
  ```

## Performance

### Test Execution Time

- All tests: ~5-10 minutes
- Parallel execution: ~2-3 minutes
- Critical path only: ~1-2 minutes

### Optimization Tips

- Use `parallelIndex` for test isolation
- Share login state with cookies for faster tests
- Mock slow operations (if needed)

## Contributing

When adding new E2E tests:

1. Follow existing patterns in test files
2. Use `test.step()` for step documentation
3. Add comments explaining complex assertions
4. Update test data in `fixtures/test-data.ts`
5. Ensure tests are independent (no test interdependencies)

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Debugging](https://playwright.dev/docs/debug)
- [Playwright GitHub](https://github.com/microsoft/playwright)

## Status

✅ Playwright configured and ready
✅ Critical path test implemented
✅ Auth tests implemented
✅ Banking tests implemented
✅ Dashboard tests implemented

---

**Note**: These tests are designed to validate MVP-critical features. All tests in `critical-path.spec.ts` MUST PASS before production deployment.
