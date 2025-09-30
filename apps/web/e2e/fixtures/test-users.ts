/**
 * Test user fixtures for E2E tests
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export const testUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'Test123!@#',
    name: 'Test User',
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'Admin123!@#',
    name: 'Admin User',
  },
  invalidUser: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
    name: 'Invalid User',
  },
} as const;

export const testAccounts = {
  checkingAccount: {
    name: 'Test Checking',
    type: 'checking',
    balance: 1000.0,
    currency: 'USD',
  },
  savingsAccount: {
    name: 'Test Savings',
    type: 'savings',
    balance: 5000.0,
    currency: 'USD',
  },
} as const;

export const testTransactions = {
  groceries: {
    amount: 50.25,
    description: 'Grocery shopping',
    category: 'Food & Dining',
    date: '2025-01-15',
  },
  salary: {
    amount: 3000.0,
    description: 'Monthly salary',
    category: 'Income',
    date: '2025-01-01',
  },
} as const;