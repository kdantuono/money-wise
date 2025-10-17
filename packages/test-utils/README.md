# @money-wise/test-utils

Shared testing utilities and fixtures for the MoneyWise application.

## Purpose

This package provides common test utilities, mock data, and testing helpers used across all MoneyWise packages and apps. It promotes consistent testing practices and reduces test code duplication.

## Installation

This package is internal to the MoneyWise monorepo and is not published to npm.

```json
{
  "devDependencies": {
    "@money-wise/test-utils": "workspace:*"
  }
}
```

## Usage

### Importing Test Utilities

```typescript
// Import test helpers
import { renderWithProviders, createMockUser } from '@money-wise/test-utils';

// Import fixtures
import { mockUsers, mockTransactions } from '@money-wise/test-utils/fixtures';

// Import custom matchers
import '@money-wise/test-utils/matchers';
```

## Available Utilities

### React Testing Utilities

```typescript
// Render with all providers (React Query, Router, etc.)
import { renderWithProviders } from '@money-wise/test-utils';

const { getByText, container } = renderWithProviders(
  <MyComponent />,
  {
    initialState: { user: mockUser },
    router: { route: '/dashboard' },
  }
);
```

### Mock Data Factories

```typescript
// Create mock user
import { createMockUser } from '@money-wise/test-utils/factories';

const user = createMockUser({
  email: 'test@example.com',
  role: 'admin',
});

// Create mock transaction
const transaction = createMockTransaction({
  amount: 1000,
  type: 'income',
  category: 'salary',
});

// Create mock account
const account = createMockAccount({
  balance: 5000,
  currency: 'USD',
});
```

### API Mocking

```typescript
// Mock API handlers (MSW)
import { mockUserHandlers, mockTransactionHandlers } from '@money-wise/test-utils/mocks';
import { setupServer } from 'msw/node';

const server = setupServer(
  ...mockUserHandlers,
  ...mockTransactionHandlers
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Custom Matchers

```typescript
// Custom Jest matchers
expect(transaction).toHaveValidAmount();
expect(user).toHaveValidEmail();
expect(date).toBeWithinRange(startDate, endDate);
```

## Structure

```
packages/test-utils/
├── src/
│   ├── index.ts              # Main entry point
│   ├── factories/            # Mock data factories
│   │   ├── user.ts
│   │   ├── transaction.ts
│   │   ├── account.ts
│   │   └── index.ts
│   ├── fixtures/             # Static test data
│   │   ├── users.ts
│   │   ├── transactions.ts
│   │   └── index.ts
│   ├── mocks/                # API mock handlers (MSW)
│   │   ├── user.ts
│   │   ├── transaction.ts
│   │   └── index.ts
│   ├── matchers/             # Custom Jest matchers
│   │   └── index.ts
│   ├── helpers/              # Testing helper functions
│   │   ├── wait.ts
│   │   ├── event.ts
│   │   └── index.ts
│   └── react/                # React testing utilities
│       ├── render.ts
│       ├── providers.ts
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Build

```bash
# From root
pnpm build --filter @money-wise/test-utils

# From package directory
cd packages/test-utils
pnpm build
```

## Detailed Examples

### Mock Data Factories

```typescript
// factories/user.ts
import { User } from '@money-wise/types';

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// Usage in tests
const adminUser = createMockUser({ role: 'admin' });
const customUser = createMockUser({
  email: 'custom@example.com',
  name: 'Custom User',
});
```

### React Testing Utilities

```typescript
// react/render.ts
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

export function renderWithProviders(
  ui: React.ReactElement,
  options = {}
) {
  const { initialState, router, ...renderOptions } = options;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const Wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={router?.initialEntries}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Usage
import { renderWithProviders } from '@money-wise/test-utils';

test('renders dashboard', () => {
  const { getByText } = renderWithProviders(<Dashboard />);
  expect(getByText('Welcome')).toBeInTheDocument();
});
```

### API Mocking with MSW

```typescript
// mocks/user.ts
import { rest } from 'msw';
import { createMockUser } from '../factories';

export const mockUserHandlers = [
  rest.get('/api/users/:id', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(createMockUser({ id: req.params.id }))
    );
  }),

  rest.post('/api/users', async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.status(201),
      ctx.json(createMockUser(body))
    );
  }),
];

// Usage in tests
import { setupServer } from 'msw/node';
import { mockUserHandlers } from '@money-wise/test-utils/mocks';

const server = setupServer(...mockUserHandlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('fetches user', async () => {
  const user = await fetchUser('123');
  expect(user.id).toBe('123');
});
```

### Custom Jest Matchers

```typescript
// matchers/index.ts
expect.extend({
  toHaveValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
    };
  },

  toHaveValidAmount(received: { amount: number }) {
    const pass = received.amount > 0 && !isNaN(received.amount);

    return {
      pass,
      message: () =>
        pass
          ? `expected amount ${received.amount} to be invalid`
          : `expected amount ${received.amount} to be valid`,
    };
  },
});

// Usage
import '@money-wise/test-utils/matchers';

test('validates transaction amount', () => {
  const transaction = { amount: 100 };
  expect(transaction).toHaveValidAmount();
});
```

## Best Practices

### 1. Realistic Mock Data

```typescript
// Good: Realistic test data
const mockUser = createMockUser({
  email: 'realistic.user@example.com',
  name: 'Realistic User',
  createdAt: new Date('2024-01-01'),
});

// Avoid: Unrealistic test data
const mockUser = {
  email: 'test',
  name: 'x',
  createdAt: null,
};
```

### 2. Factory Pattern

```typescript
// Good: Flexible factory with defaults
export function createMockTransaction(overrides = {}) {
  return {
    id: generateId(),
    amount: 100,
    type: 'expense',
    date: new Date(),
    ...overrides,
  };
}

// Avoid: Hardcoded test data
export const mockTransaction = {
  id: '123',
  amount: 100,
  type: 'expense',
};
```

### 3. Setup and Teardown

```typescript
// Good: Proper cleanup
let server;

beforeAll(() => {
  server = setupServer(...handlers);
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});

// Avoid: No cleanup (leads to test pollution)
```

## Guidelines

1. **DRY Testing**: Reduce test code duplication
2. **Realistic Data**: Mock data should resemble production data
3. **Isolation**: Tests should not depend on each other
4. **Descriptive Names**: Clear naming for mocks and utilities
5. **Type Safety**: Fully typed test utilities
6. **Documentation**: Document complex test helpers

## Performance Considerations

- Use factories instead of fixtures for large datasets
- Mock at the network level (MSW) rather than mocking modules
- Avoid global state in test utilities
- Clean up after each test

## Current Status

**Status**: Active (basic implementation)

The package is currently in use with basic React testing utilities. Additional test helpers and mock data factories will be added as needed.

## Roadmap

- [x] Set up basic package structure
- [ ] Implement comprehensive mock data factories
- [ ] Add MSW API handlers for all endpoints
- [ ] Create custom Jest matchers
- [ ] Add React Native testing utilities
- [ ] Implement test database utilities
- [ ] Document all testing patterns

## Testing Philosophy

### Test Pyramid

```
      /\
     /e2e\        <- Few, slow, high value
    /------\
   /integration\ <- Some, moderate speed
  /-------------\
 /   unit tests  \ <- Many, fast, focused
/-----------------\
```

### Testing Best Practices

1. **Arrange-Act-Assert Pattern**
```typescript
test('creates transaction', () => {
  // Arrange
  const transaction = createMockTransaction();

  // Act
  const result = processTransaction(transaction);

  // Assert
  expect(result.status).toBe('success');
});
```

2. **Test Behavior, Not Implementation**
```typescript
// Good: Test behavior
test('shows error when email is invalid', () => {
  render(<LoginForm />);
  fireEvent.change(emailInput, { target: { value: 'invalid' } });
  expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
});

// Avoid: Test implementation details
test('sets error state', () => {
  const { result } = renderHook(() => useForm());
  result.current.setError('email', 'Invalid');
  expect(result.current.errors.email).toBe('Invalid');
});
```

## Contributing

When adding new test utilities:

1. Create utility in appropriate category folder
2. Export from category index and main index
3. Add TypeScript types for all utilities
4. Document usage with JSDoc and examples
5. Ensure utilities are reusable across packages
6. Run `pnpm build` and `pnpm typecheck`

## Version

Current Version: 0.1.0

## License

MIT
