/**
 * Test Fixtures
 * Common test data for MoneyWise applications
 */

export interface TestUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface TestTransaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
  userId: string;
}

export interface TestAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment';
  balance: number;
  userId: string;
}

// User fixtures
export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

export const createTestUsers = (count: number): TestUser[] =>
  Array.from({ length: count }, (_, i) =>
    createTestUser({
      id: `user-${i + 1}`,
      email: `test${i + 1}@example.com`,
      name: `Test User ${i + 1}`,
    })
  );

// Transaction fixtures
export const createTestTransaction = (overrides: Partial<TestTransaction> = {}): TestTransaction => ({
  id: 'transaction-1',
  amount: -50.00,
  description: 'Test Transaction',
  category: 'Food',
  date: new Date('2024-01-01'),
  userId: 'user-1',
  ...overrides,
});

export const createTestTransactions = (count: number): TestTransaction[] =>
  Array.from({ length: count }, (_, i) =>
    createTestTransaction({
      id: `transaction-${i + 1}`,
      amount: (i % 2 === 0 ? -1 : 1) * (Math.random() * 100 + 10),
      description: `Test Transaction ${i + 1}`,
    })
  );

// Account fixtures
export const createTestAccount = (overrides: Partial<TestAccount> = {}): TestAccount => ({
  id: 'account-1',
  name: 'Test Checking Account',
  type: 'checking',
  balance: 1000.00,
  userId: 'user-1',
  ...overrides,
});

export const createTestAccounts = (count: number): TestAccount[] =>
  Array.from({ length: count }, (_, i) =>
    createTestAccount({
      id: `account-${i + 1}`,
      name: `Test Account ${i + 1}`,
      type: ['checking', 'savings', 'credit', 'investment'][i % 4] as any,
      balance: Math.random() * 10000,
    })
  );