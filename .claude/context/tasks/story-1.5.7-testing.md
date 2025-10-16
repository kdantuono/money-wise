# Task: Testing Infrastructure Hardening

**Issue**: #109
**Story**: STORY-1.5.7
**Domain**: testing/qa
**Assigned To**: qa-testing-engineer, senior-backend-dev
**Branch**: feature/story-1.5.7-testing-hardening
**Status**: assigned
**Dependencies**: STORY-1.5.4 (configs), STORY-1.5.6 (structure)

## Full Context (Self-Contained)

### Objective

Establish comprehensive testing infrastructure with 90% code coverage, automated quality gates, and complete test suites for all critical paths. This includes unit tests, integration tests, E2E tests, and performance benchmarks to ensure application reliability and maintainability.

### Current State Analysis

**Testing Infrastructure Status**:
- Jest configured for backend
- Vitest configured for frontend
- Playwright ready for E2E
- Coverage reporting not properly configured
- Coverage percentage unknown (command fails)
- Missing tests for critical auth flows
- No test data factories
- No performance benchmarks

**Critical Untested Areas**:
```typescript
// Backend gaps:
- Auth module (JWT strategy, password reset)
- Account service (CRUD operations)
- Transaction processing
- Category management
- Error handlers

// Frontend gaps:
- Authentication forms
- Dashboard components
- Transaction UI
- Error boundaries
- API integration layer
```

### Requirements

1. **Coverage Configuration** with objective acceptance criteria:
   - Coverage command works: `pnpm test:coverage`
   - HTML coverage reports generated
   - Coverage visible in CI/CD
   - Badge in README showing coverage %

2. **Coverage Thresholds** with objective acceptance criteria:
   - Global coverage >= 90%
   - Branches >= 85%
   - Functions >= 90%
   - Lines >= 90%
   - Statements >= 90%
   - CI fails if thresholds not met

3. **Comprehensive Test Suites** with objective acceptance criteria:
   - All API endpoints have tests
   - All React components have tests
   - Critical user flows have E2E tests
   - All edge cases covered
   - Error scenarios tested

4. **Test Infrastructure** with objective acceptance criteria:
   - Test data factories working
   - Database isolation per test
   - Mock data consistent
   - Tests run in parallel
   - CI completes in < 10 minutes

### Technical Specifications

#### 1. Coverage Configuration

```json
// package.json (root)
{
  "scripts": {
    "test:coverage": "turbo run test:coverage --parallel",
    "test:coverage:merge": "npx istanbul merge coverage/apps coverage/packages && npx istanbul report --dir coverage-merged html text-summary",
    "test:coverage:report": "open coverage-merged/index.html"
  }
}

// apps/backend/package.json
{
  "scripts": {
    "test:coverage": "jest --coverage --coverageDirectory=../../coverage/apps/backend",
    "test:watch": "jest --watch",
    "test:debug": "node --inspect-brk ./node_modules/.bin/jest --runInBand"
  }
}

// apps/backend/jest.config.js
module.exports = {
  coverageDirectory: '../../coverage/apps/backend',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: ['html', 'text', 'lcov', 'json-summary'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '@app/(.*)': '<rootDir>/src/$1',
    '@money-wise/types': '<rootDir>/../../packages/types/src',
    '@money-wise/utils': '<rootDir>/../../packages/utils/src'
  }
};
```

```typescript
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['html', 'text', 'lcov', 'json-summary'],
      reportsDirectory: '../../coverage/apps/web',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/app/layout.tsx',
        'src/app/page.tsx'
      ],
      thresholds: {
        branches: 85,
        functions: 90,
        lines: 90,
        statements: 90
      }
    }
  }
});
```

#### 2. Test Data Factories

```typescript
// packages/test-utils/src/factories/user.factory.ts
import { faker } from '@faker-js/faker';
import { User, CreateUserDto } from '@money-wise/types';

export class UserFactory {
  static create(overrides?: Partial<User>): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides
    };
  }

  static createMany(count: number, overrides?: Partial<User>): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createDto(overrides?: Partial<CreateUserDto>): CreateUserDto {
    return {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      password: faker.internet.password({ length: 12 }),
      ...overrides
    };
  }
}

// packages/test-utils/src/factories/transaction.factory.ts
import { Transaction, TransactionType } from '@money-wise/types';

export class TransactionFactory {
  static create(overrides?: Partial<Transaction>): Transaction {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      accountId: faker.string.uuid(),
      categoryId: faker.string.uuid(),
      amount: faker.number.float({ min: 1, max: 10000, precision: 0.01 }),
      type: faker.helpers.arrayElement(['income', 'expense'] as TransactionType[]),
      description: faker.commerce.productDescription(),
      date: faker.date.recent(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides
    };
  }

  static createIncome(amount?: number): Transaction {
    return this.create({
      type: 'income',
      amount: amount || faker.number.float({ min: 1000, max: 10000 })
    });
  }

  static createExpense(amount?: number): Transaction {
    return this.create({
      type: 'expense',
      amount: amount || faker.number.float({ min: 10, max: 1000 })
    });
  }
}
```

#### 3. Auth Module Tests

```typescript
// apps/backend/src/auth/__tests__/auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserFactory } from '@money-wise/test-utils';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          }
        }
      ]
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const dto = UserFactory.createDto();
      const user = await authService.register(dto);

      expect(user.email).toBe(dto.email);
      expect(user.password).not.toBe(dto.password); // Should be hashed
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    it('should throw ConflictException for duplicate email', async () => {
      const dto = UserFactory.createDto();
      await authService.register(dto);

      await expect(authService.register(dto))
        .rejects.toThrow('Email already exists');
    });

    it('should validate password strength', async () => {
      const dto = UserFactory.createDto({ password: 'weak' });

      await expect(authService.register(dto))
        .rejects.toThrow('Password too weak');
    });
  });

  describe('login', () => {
    it('should return JWT token for valid credentials', async () => {
      const user = UserFactory.create();
      jest.spyOn(jwtService, 'sign').mockReturnValue('jwt.token.here');

      const result = await authService.login(user.email, 'password');

      expect(result.accessToken).toBe('jwt.token.here');
      expect(result.user).toEqual(user);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const user = UserFactory.create();

      await expect(authService.login(user.email, 'wrong'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('validateToken', () => {
    it('should return user for valid token', async () => {
      const user = UserFactory.create();
      jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: user.id });

      const result = await authService.validateToken('valid.token');

      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(authService.validateToken('expired.token'))
        .rejects.toThrow('Token expired');
    });
  });
});
```

#### 4. E2E Test Suite

```typescript
// apps/backend/__tests__/e2e/auth.e2e.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { UserFactory } from '@money-wise/test-utils';

describe('Auth E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const dto = UserFactory.createDto();

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(dto.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'invalid', password: 'Password123!' })
        .expect(400);

      expect(response.body.message).toContain('email');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const dto = UserFactory.createDto();

      // Register first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto);

      // Then login
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: dto.email, password: dto.password })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(dto.email);
    });

    it('should return 401 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrong' })
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;

    beforeAll(async () => {
      const dto = UserFactory.createDto();

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: dto.email, password: dto.password });

      accessToken = loginResponse.body.accessToken;
    });

    it('should access protected route with valid token', async () => {
      await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/user/profile')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });
});
```

#### 5. Frontend Component Tests

```typescript
// apps/web/src/components/auth/__tests__/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';
import { vi, expect, describe, it } from 'vitest';

const mockLogin = vi.fn();

describe('LoginForm', () => {
  it('should render email and password fields', () => {
    render(<LoginForm onSubmit={mockLogin} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockLogin} />);

    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockLogin} />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockLogin} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!'
      });
    });
  });

  it('should disable form during submission', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<LoginForm onSubmit={mockLogin} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');

    const submitButton = screen.getByRole('button', { name: /login/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();
  });
});
```

### Files to Create/Modify

**Create**:
- `/packages/test-utils/src/factories/*.factory.ts` - Test data factories
- `/apps/backend/src/**/__tests__/*.spec.ts` - Unit tests for all modules
- `/apps/backend/__tests__/e2e/*.e2e.spec.ts` - E2E test suites
- `/apps/web/src/**/__tests__/*.test.tsx` - Component tests
- `/e2e/playwright/*.spec.ts` - Playwright E2E tests
- `/scripts/coverage-report.js` - Coverage merge script

**Modify**:
- All `jest.config.js` files - Add coverage configuration
- All `vitest.config.ts` files - Add coverage configuration
- `/package.json` - Add coverage scripts
- `/.github/workflows/ci.yml` - Add coverage upload

### Definition of Done

- [ ] Coverage command works: `pnpm test:coverage`
- [ ] Coverage >= 90% globally
- [ ] All auth endpoints have unit tests
- [ ] All auth flows have E2E tests
- [ ] Test data factories implemented
- [ ] Tests run in parallel
- [ ] CI enforces coverage thresholds
- [ ] Coverage badge in README
- [ ] Performance benchmarks documented
- [ ] All tests passing

### Integration Notes

This testing infrastructure will:
- Ensure code quality across the monorepo
- Catch regressions early in CI/CD
- Provide confidence for refactoring
- Document expected behavior through tests
- Enable TDD for new features

### Commands for Agent

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/story-1.5.7-testing-hardening

# Install testing dependencies
pnpm add -D @faker-js/faker @testing-library/react @testing-library/user-event
pnpm add -D @vitest/coverage-v8 supertest @types/supertest

# Create test factories
mkdir -p packages/test-utils/src/factories
touch packages/test-utils/src/factories/{user,account,transaction,category}.factory.ts

# Run coverage to establish baseline
pnpm test:coverage

# Write tests for uncovered code
# Focus on auth module first
pnpm test:watch -- auth

# Check coverage improved
pnpm test:coverage

# Generate coverage report
pnpm test:coverage:report

# Commit when threshold met
git add .
git commit -m "test: add comprehensive test coverage for auth module"
git push -u origin feature/story-1.5.7-testing-hardening

# Create PR
gh pr create \
  --title "test: STORY-1.5.7 - Testing Infrastructure Hardening" \
  --body "Closes #109 - Implements 90% test coverage with comprehensive test suites" \
  --base develop
```

### Testing Priority Order

1. **Critical Path Tests** (Week 1):
   - Authentication (register, login, logout)
   - Account CRUD operations
   - Transaction processing
   - Authorization guards

2. **Integration Tests** (Week 2):
   - API endpoint tests
   - Database operations
   - External service mocks
   - Error handling

3. **UI Tests** (Week 2):
   - Form validation
   - Error boundaries
   - Loading states
   - Navigation

4. **E2E Tests** (Week 3):
   - Complete user journeys
   - Cross-browser testing
   - Mobile responsiveness
   - Performance metrics

### Risk Mitigation

1. **Flaky Tests**: Use proper waitFor, avoid hardcoded delays
2. **Slow Tests**: Run in parallel, use test database transactions
3. **Coverage Gaps**: Focus on critical paths first
4. **False Positives**: Test behavior, not implementation
5. **Maintenance Burden**: Use factories, avoid duplication

---

**Agent Instructions**: Start by fixing the coverage configuration so we can measure our baseline. Then systematically add tests focusing on the most critical and least covered areas first. Use test factories to reduce boilerplate and make tests maintainable. Ensure all tests are deterministic and fast.