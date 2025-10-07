# MoneyWise Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the MoneyWise application, detailing our approach to achieving and maintaining 90%+ test coverage across all components.

## Test Coverage Goals

| Component | Target Coverage | Current Coverage | Status |
|-----------|----------------|------------------|--------|
| Backend API | 90% | 87.46% | 🟡 In Progress |
| Frontend UI | 85% | 68.43% | 🟡 In Progress |
| Integration | 90% | 85% | 🟡 In Progress |
| E2E Critical Paths | 100% | 100% | ✅ Complete |

## Testing Pyramid

```
        /\
       /E2E\       <- 5% (Critical User Journeys)
      /______\
     /        \
    /Integration\  <- 20% (API & Service Integration)
   /______________\
  /                \
 /   Unit Tests     \ <- 75% (Component & Function Level)
/____________________\
```

## Test Types

### 1. Unit Tests

**Purpose**: Test individual functions, components, and modules in isolation.

**Tools**:
- Backend: Jest, NestJS Testing Module
- Frontend: Vitest, React Testing Library

**Location**:
- Backend: `apps/backend/src/**/*.spec.ts`
- Frontend: `apps/web/__tests__/**/*.test.ts`

**Key Areas**:
- Business logic functions
- Data validators and transformers
- React components
- Utility functions
- Service methods
- Database entities

**Example**:
```typescript
describe('TransactionService', () => {
  it('should calculate transaction totals correctly', () => {
    const result = service.calculateTotal(transactions);
    expect(result).toBe(1500.00);
  });
});
```

### 2. Integration Tests

**Purpose**: Test interaction between multiple components and external systems.

**Tools**:
- Supertest for API testing
- Test containers for database
- Mock services for third-party APIs

**Location**: `apps/backend/__tests__/integration/`

**Key Areas**:
- API endpoints
- Database operations
- Authentication flows
- Service interactions
- Cache operations

**Example**:
```typescript
describe('Accounts API', () => {
  it('should create account with transactions', async () => {
    const response = await request(app)
      .post('/api/accounts')
      .send(accountData)
      .expect(201);

    expect(response.body.id).toBeDefined();
  });
});
```

### 3. End-to-End Tests

**Purpose**: Test complete user workflows from UI to database.

**Tools**:
- Playwright for browser automation
- PostgreSQL test containers
- Mock authentication

**Location**:
- Backend: `apps/backend/__tests__/e2e/`
- Frontend: `apps/web/e2e/`

**Key Areas**:
- User registration and login
- Account management
- Transaction workflows
- Budget creation
- Report generation

**Example**:
```typescript
test('complete transaction workflow', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('[data-testid="add-transaction"]');
  await page.fill('[name="amount"]', '150.00');
  await page.click('[type="submit"]');
  await expect(page.locator('.success-message')).toBeVisible();
});
```

### 4. Performance Tests

**Purpose**: Ensure application meets performance benchmarks.

**Tools**:
- Custom benchmark suite
- Artillery for load testing
- Lighthouse for frontend metrics

**Location**: `apps/backend/__tests__/performance/`

**Metrics**:
- API response times (P95 < 200ms)
- Database query performance
- Bundle size limits
- Core Web Vitals

### 5. Visual Regression Tests

**Purpose**: Detect unintended UI changes.

**Tools**:
- Playwright screenshots
- Percy for visual diffs

**Location**: `apps/web/e2e/visual/`

**Coverage**:
- Component states
- Responsive layouts
- Dark mode
- Error states
- Loading states

## Test Data Management

### Factories

We use factory patterns for generating consistent test data:

```typescript
const user = UserFactory.build({
  email: 'test@example.com',
  role: UserRole.ADMIN
});

const account = AccountFactory.buildChecking(user);
const transactions = TransactionFactory.buildMany(account, 10);
```

### Fixtures

Predefined data sets for common scenarios:
- `fixtures/users.json` - Sample user accounts
- `fixtures/transactions.json` - Transaction history
- `fixtures/budgets.json` - Budget configurations

### Database Seeding

For integration and E2E tests:
```typescript
await TestDatabase.seed(User, testUsers);
await TestDatabase.seed(Account, testAccounts);
```

## Mocking Strategy

### Backend Mocks

1. **External Services**:
   - Email service → In-memory mock
   - Payment processor → Stub responses
   - File storage → Local filesystem

2. **Database**:
   - Unit tests → In-memory repository
   - Integration tests → Test containers
   - E2E tests → Dedicated test database

### Frontend Mocks

1. **API Calls**:
   - MSW for intercepting requests
   - Fixture-based responses
   - Error simulation

2. **Browser APIs**:
   - LocalStorage → In-memory store
   - Geolocation → Fixed coordinates
   - Notifications → Mock implementation

## Continuous Integration

### Quality Gates

All PRs must pass:
1. ✅ Linting and type checking
2. ✅ Unit tests with coverage > 90%
3. ✅ Integration tests
4. ✅ E2E tests (parallelized)
5. ✅ Performance benchmarks
6. ✅ Security scanning
7. ✅ Bundle size checks

### Parallel Execution

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
```

E2E tests are sharded across 4 runners for faster execution.

## Testing Best Practices

### 1. Test Structure

Follow AAA pattern:
```typescript
it('should handle invalid input', () => {
  // Arrange
  const input = { amount: -100 };

  // Act
  const result = validator.validate(input);

  // Assert
  expect(result.errors).toContain('Amount must be positive');
});
```

### 2. Test Naming

Use descriptive names:
- ✅ `should return 401 when token is expired`
- ❌ `test auth`

### 3. Test Isolation

Each test should be independent:
```typescript
beforeEach(() => {
  // Reset state
  jest.clearAllMocks();
  await database.clean();
});
```

### 4. Async Testing

Always handle async operations:
```typescript
it('should fetch user data', async () => {
  const data = await service.getUser(id);
  expect(data).toBeDefined();
});
```

### 5. Error Testing

Test both success and failure paths:
```typescript
it('should handle network errors', async () => {
  mockApi.mockRejectedValue(new Error('Network error'));
  await expect(service.fetchData()).rejects.toThrow('Network error');
});
```

## Coverage Reporting

### Metrics

We track four coverage metrics:
1. **Statements**: % of code statements executed
2. **Branches**: % of conditional branches tested
3. **Functions**: % of functions called
4. **Lines**: % of lines executed

### Thresholds

```json
{
  "coverageThreshold": {
    "global": {
      "statements": 90,
      "branches": 85,
      "functions": 90,
      "lines": 90
    }
  }
}
```

### Reports

Coverage reports are generated in multiple formats:
- `text` - Console output
- `html` - Interactive browser report
- `lcov` - For CI integration
- `json` - For programmatic access

## Test Maintenance

### Regular Tasks

1. **Weekly**:
   - Review flaky tests
   - Update snapshots if needed
   - Check test execution time

2. **Monthly**:
   - Audit test coverage gaps
   - Update test data fixtures
   - Review and refactor complex tests

3. **Quarterly**:
   - Performance benchmark review
   - Testing strategy assessment
   - Tool and dependency updates

### Debugging Tests

1. **Run single test**:
   ```bash
   pnpm test -- --testNamePattern="should create account"
   ```

2. **Debug mode**:
   ```bash
   pnpm test:debug
   ```

3. **Watch mode**:
   ```bash
   pnpm test:watch
   ```

4. **Verbose output**:
   ```bash
   pnpm test -- --verbose
   ```

## Test Commands

### Backend

```bash
# Unit tests
pnpm test

# Unit tests with coverage
pnpm test:coverage

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Performance tests
pnpm test:performance

# All tests
pnpm test:all
```

### Frontend

```bash
# Unit tests
pnpm test

# Unit tests with coverage
pnpm test:coverage

# E2E tests
pnpm e2e

# Visual regression tests
pnpm test:visual

# Component tests
pnpm test:components
```

## Troubleshooting

### Common Issues

1. **Test Timeout**:
   - Increase timeout: `jest.setTimeout(30000)`
   - Check for missing `await` statements
   - Verify mock setup

2. **Flaky Tests**:
   - Add explicit waits: `await waitFor(() => ...)`
   - Use data-testid attributes
   - Avoid timing-dependent assertions

3. **Coverage Gaps**:
   - Check for untested error paths
   - Add edge case tests
   - Test conditional branches

4. **Database Conflicts**:
   - Use transactions for isolation
   - Clean database between tests
   - Use unique test data

## Future Improvements

1. **Contract Testing**: Add consumer-driven contract tests
2. **Mutation Testing**: Implement Stryker for mutation testing
3. **Load Testing**: Expand Artillery test scenarios
4. **Accessibility Testing**: Add automated a11y tests
5. **Cross-browser Testing**: Expand Playwright browser matrix

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Library](https://testing-library.com/docs/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Vitest Documentation](https://vitest.dev/guide/)

## Support

For testing questions or issues:
1. Check this documentation
2. Review existing test examples
3. Ask in #testing Slack channel
4. Create a GitHub issue

---

*Last Updated: October 2024*
*Version: 1.0.0*