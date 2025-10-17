# ADR-004: Testing Strategy and Coverage Standards

**Status**: Accepted
**Date**: 2025-10-06
**Deciders**: Development Team, QA Lead
**Technical Story**: M1.5 Infrastructure & Quality

## Context

MoneyWise is a financial application handling sensitive user data and transactions. Poor test coverage or inadequate testing strategies can lead to:
- **Security Vulnerabilities**: Unvalidated inputs, authentication bypasses
- **Data Integrity Issues**: Incorrect balance calculations, duplicate transactions
- **User Trust Erosion**: Bugs in production undermine confidence in financial data
- **Regulatory Risk**: Financial services require auditability and reliability

We need a comprehensive testing strategy that balances:
- **Coverage**: Critical paths (auth, transactions, balances) must be thoroughly tested
- **Speed**: Fast feedback loops for developer productivity
- **Confidence**: Tests catch real bugs, not just pass trivially
- **Maintainability**: Tests remain useful as codebase evolves

## Decision

We will implement a **multi-layer testing pyramid** with specific coverage targets and mandatory gates:

```
           ▲
          / \         E2E Tests (Critical User Flows)
         /   \        Coverage: ~10-15% of codebase
        /     \       Tool: Playwright
       /───────\
      /         \     Integration Tests (API + DB)
     /           \    Coverage: ~20-25% of codebase
    /             \   Tool: Jest + Supertest
   /───────────────\
  /                 \ Unit Tests (Business Logic)
 /                   \Coverage: ~60-70% of codebase
/─────────────────────\Tool: Jest + Testing Library
```

### Testing Layers

#### 1. Unit Tests (Foundation Layer)
- **Scope**: Individual functions, classes, components in isolation
- **Target Coverage**: 70% overall, 80%+ for critical modules
- **Tools**: Jest, React Testing Library, NestJS Testing utilities
- **Speed**: <5 seconds for entire suite
- **Run Frequency**: Every commit (pre-commit hook)

#### 2. Integration Tests (API + Database Layer)
- **Scope**: API endpoints with real database, service interactions
- **Target Coverage**: All critical API routes (auth, accounts, transactions)
- **Tools**: Jest, Supertest, Test Database (PostgreSQL)
- **Speed**: <30 seconds for entire suite
- **Run Frequency**: Every PR, before merge

#### 3. E2E Tests (User Flow Layer)
- **Scope**: Critical user journeys (signup → link account → view transactions)
- **Target Coverage**: 5-7 happy paths, 3-5 error scenarios
- **Tools**: Playwright (cross-browser)
- **Speed**: ~2-5 minutes for suite
- **Run Frequency**: Pre-deployment, nightly builds

### Coverage Targets

| Module | Unit Coverage | Integration Coverage | E2E Coverage |
|--------|---------------|----------------------|--------------|
| **Authentication** | 90% | 100% of endpoints | Full signup/login flow |
| **Financial Accounts** | 80% | 100% of CRUD endpoints | Link account + view balance |
| **Transactions** | 80% | 100% of sync endpoints | Sync + categorize + filter |
| **Budgets** | 75% | 90% of endpoints | Create + track + alert |
| **UI Components** | 70% | N/A | Critical interactions |
| **Utilities** | 85% | N/A | N/A |

**Overall Minimum**: 70% line coverage, 60% branch coverage

## Rationale

### Why This Pyramid Structure?

**✅ Advantages**:
1. **Fast Feedback**: 90% of tests run in <5s (unit tests)
2. **Cost-Effective**: Unit tests are cheap to write and maintain
3. **Comprehensive**: All layers together provide confidence
4. **Realistic**: E2E tests validate real user scenarios

**❌ Alternatives Considered**:
- **Heavy E2E Focus** (rejected): Slow, flaky, expensive to maintain
- **Unit Tests Only** (rejected): Misses integration bugs
- **Manual Testing Only** (rejected): Not scalable, error-prone

### Why These Coverage Targets?

**80-90% for Critical Modules**:
- Authentication bugs = complete system compromise
- Transaction errors = loss of user trust (fatal in fintech)
- Balance calculation bugs = regulatory/legal issues

**70% Overall**:
- Balances thoroughness with development velocity
- Allows skipping boilerplate (DTOs, simple getters)
- Industry standard for production applications

**Not 100%**:
- Diminishing returns: Last 20% takes 80% of effort
- Some code is inherently untestable (random UUIDs, timestamps)
- Allows focus on high-value test coverage

## Implementation Details

### 1. Unit Test Standards

#### Backend Services (NestJS)

```typescript
// apps/backend/__tests__/unit/auth/auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: MockType<Repository<User>>;
  let mockConfigService: MockType<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useFactory: repositoryMockFactory,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                auth: {
                  JWT_ACCESS_SECRET: 'test-secret',
                  JWT_ACCESS_EXPIRES_IN: '15m',
                },
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    mockUserRepository = module.get(getRepositoryToken(User));
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const user = { id: '1', email: 'test@example.com', password: await bcrypt.hash('password', 10) };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual({ id: '1', email: 'test@example.com' });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when password is incorrect', async () => {
      const user = { id: '1', email: 'test@example.com', password: await bcrypt.hash('password', 10) };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.validateUser('test@example.com', 'wrong-password');

      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });
  });
});
```

**Unit Test Checklist**:
- [ ] Test happy path (success scenario)
- [ ] Test error cases (null inputs, not found, validation failures)
- [ ] Test edge cases (empty strings, max length, special characters)
- [ ] Mock all external dependencies (database, HTTP, file system)
- [ ] Use descriptive test names (`should return X when Y`)

#### Frontend Components (React)

```typescript
// apps/web/__tests__/components/auth/login-form.test.tsx
describe('LoginForm', () => {
  it('submits form with email and password', async () => {
    const mockOnSubmit = jest.fn();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('displays validation errors for invalid email', async () => {
    render(<LoginForm onSubmit={jest.fn()} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'invalid-email');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/invalid email address/i)).toBeInTheDocument();
  });

  it('disables submit button while loading', () => {
    render(<LoginForm onSubmit={jest.fn()} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /log in/i });
    expect(submitButton).toBeDisabled();
  });
});
```

### 2. Integration Test Standards

#### API Endpoint Testing

```typescript
// apps/backend/__tests__/integration/auth/auth.e2e-spec.ts
describe('AuthController (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(testDataSource)  // Use test database
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // Clean database before each test
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('creates new user and returns tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      // Verify user persisted to database
      const user = await dataSource.getRepository(User).findOne({
        where: { email: 'test@example.com' },
      });
      expect(user).toBeDefined();
      expect(user.password).not.toBe('SecurePassword123!');  // Hashed
    });

    it('returns 400 when email already exists', async () => {
      // Create existing user
      await dataSource.getRepository(User).save({
        email: 'existing@example.com',
        password: await bcrypt.hash('password', 10),
        firstName: 'Existing',
        lastName: 'User',
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });
  });
});
```

**Integration Test Checklist**:
- [ ] Use real database (test instance, cleaned between tests)
- [ ] Test complete request → response flow
- [ ] Verify database state changes
- [ ] Test authentication/authorization rules
- [ ] Test error responses (400, 401, 403, 404, 500)

### 3. E2E Test Standards

#### Critical User Flows (Playwright)

```typescript
// apps/web/e2e/auth-flow.spec.ts
test.describe('User Authentication Flow', () => {
  test('new user can sign up and access dashboard', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/register');

    // Fill registration form
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePassword123!');
    await page.fill('[name="firstName"]', 'New');
    await page.fill('[name="lastName"]', 'User');
    await page.click('button:has-text("Sign Up")');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify user info displayed
    await expect(page.locator('text=Welcome, New')).toBeVisible();
  });

  test('existing user can log in', async ({ page }) => {
    // Prerequisite: User exists in test database
    await page.goto('/auth/login');

    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Log In")');

    await expect(page).toHaveURL('/dashboard');
  });

  test('user cannot access protected routes while logged out', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/auth/login');
  });
});
```

**E2E Test Checklist**:
- [ ] Test complete user journeys (multi-page flows)
- [ ] Use realistic test data
- [ ] Verify UI state changes (loading, errors, success)
- [ ] Test across critical browsers (Chrome, Firefox, Safari)
- [ ] Run against staging environment (not just localhost)

### 4. CI/CD Integration

#### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run unit tests
        run: pnpm turbo test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      # ... similar setup

      - name: Run integration tests
        run: pnpm turbo test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # ... similar setup

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm turbo test:e2e

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

**CI/CD Gates** (MANDATORY):
- ❌ **Block PR merge if unit tests fail**
- ❌ **Block PR merge if coverage drops below 70%**
- ❌ **Block deployment if integration tests fail**
- ❌ **Block deployment if E2E tests fail**

## Consequences

### Positive

- **Bug Prevention**: 70% coverage catches ~85% of bugs before production
- **Confidence**: Developers can refactor without fear of breaking things
- **Documentation**: Tests serve as living examples of API usage
- **Faster Debugging**: Failing tests pinpoint exact issue location
- **Regulatory Compliance**: Test logs provide audit trail

### Negative

- **Slower Development**: Writing tests adds ~30% to development time
- **Maintenance Burden**: Tests must be updated when requirements change
- **Flaky E2E Tests**: Browser tests can be unreliable (network, timing)
- **False Confidence**: High coverage doesn't guarantee zero bugs

### Mitigations

- **Slower Development**: Tests prevent expensive production bugs (net positive ROI)
- **Maintenance**: Treat tests as first-class code (refactor, DRY principles)
- **Flaky E2E**: Retry failed tests 2x, quarantine persistently flaky tests
- **False Confidence**: Supplement with manual QA for critical releases

## Monitoring

- **Coverage Trends**: Track over time (should increase, not decrease)
- **Test Run Time**: Keep unit tests <5s, integration <30s
- **Flakiness Rate**: E2E tests should pass >95% on first run
- **Bug Escape Rate**: Track production bugs that existing tests didn't catch

## References

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Google Testing Blog - Test Pyramid](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html)

---

**Superseded By**: N/A
**Related ADRs**: ADR-001 (Monorepo), ADR-005 (Error Handling)
