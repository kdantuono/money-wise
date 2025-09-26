/**
 * Test fixtures and data for E2E tests
 * Provides consistent test data across all tests
 */

export const testUsers = {
  validUser: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'SecurePassword123!',
  },
  adminUser: {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@moneywise.com',
    password: 'AdminPassword123!',
  },
  newUser: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    password: 'NewPassword123!',
  },
};

export const testAccounts = {
  checking: {
    name: 'Primary Checking',
    type: 'checking' as const,
    balance: 5000.00,
  },
  savings: {
    name: 'Emergency Savings',
    type: 'savings' as const,
    balance: 15000.00,
  },
  credit: {
    name: 'Visa Credit Card',
    type: 'credit' as const,
    balance: -2500.00,
  },
  investment: {
    name: '401k Investment',
    type: 'investment' as const,
    balance: 45000.00,
  },
};

export const testTransactions = {
  income: {
    amount: 3000.00,
    description: 'Salary Payment',
    category: 'income',
    type: 'income' as const,
  },
  expense: {
    amount: -150.00,
    description: 'Grocery Shopping',
    category: 'food',
    type: 'expense' as const,
  },
  transfer: {
    amount: 500.00,
    description: 'Transfer to Savings',
    category: 'transfer',
    type: 'transfer' as const,
  },
};

export const testBudgets = {
  food: {
    name: 'Food & Dining',
    amount: 800.00,
    category: 'food',
    period: 'monthly' as const,
  },
  entertainment: {
    name: 'Entertainment',
    amount: 200.00,
    category: 'entertainment',
    period: 'monthly' as const,
  },
  transportation: {
    name: 'Transportation',
    amount: 400.00,
    category: 'transportation',
    period: 'monthly' as const,
  },
};

export const testCategories = [
  'food',
  'transportation',
  'entertainment',
  'utilities',
  'healthcare',
  'shopping',
  'income',
  'transfer',
  'other',
];

export const testDateRanges = {
  currentMonth: {
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
  },
  lastMonth: {
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0],
  },
  last30Days: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  },
};

/**
 * Generate random test data
 */
export const generateTestData = {
  user: (overrides: Partial<typeof testUsers.validUser> = {}) => ({
    ...testUsers.validUser,
    email: `test.${Date.now()}@example.com`,
    ...overrides,
  }),

  account: (overrides: Partial<typeof testAccounts.checking> = {}) => ({
    ...testAccounts.checking,
    name: `Test Account ${Date.now()}`,
    ...overrides,
  }),

  transaction: (overrides: Partial<typeof testTransactions.expense> = {}) => ({
    ...testTransactions.expense,
    description: `Test Transaction ${Date.now()}`,
    ...overrides,
  }),

  budget: (overrides: Partial<typeof testBudgets.food> = {}) => ({
    ...testBudgets.food,
    name: `Test Budget ${Date.now()}`,
    ...overrides,
  }),

  amount: (min: number = 1, max: number = 1000) => {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  },

  pastDate: (daysAgo: number = 30) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  },

  futureDate: (daysFromNow: number = 30) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  },
};

/**
 * Test scenarios for comprehensive testing
 */
export const testScenarios = {
  newUserOnboarding: {
    description: 'Complete new user onboarding flow',
    steps: [
      'User signs up with valid information',
      'User verifies email address',
      'User completes profile setup',
      'User adds first bank account',
      'User adds first transaction',
      'User creates first budget',
    ],
  },

  budgetManagement: {
    description: 'Complete budget management workflow',
    steps: [
      'User creates multiple budgets',
      'User adds transactions in budget categories',
      'User views budget progress',
      'User modifies budget limits',
      'User receives budget alerts',
    ],
  },

  financialReporting: {
    description: 'Generate and view financial reports',
    steps: [
      'User has sufficient transaction data',
      'User generates income/expense report',
      'User views category breakdown',
      'User exports report data',
      'User views trends over time',
    ],
  },
};

/**
 * API endpoints for testing
 */
export const apiEndpoints = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    profile: '/api/auth/profile',
  },
  accounts: {
    list: '/api/accounts',
    create: '/api/accounts',
    update: (id: string) => `/api/accounts/${id}`,
    delete: (id: string) => `/api/accounts/${id}`,
  },
  transactions: {
    list: '/api/transactions',
    create: '/api/transactions',
    update: (id: string) => `/api/transactions/${id}`,
    delete: (id: string) => `/api/transactions/${id}`,
  },
  budgets: {
    list: '/api/budgets',
    create: '/api/budgets',
    update: (id: string) => `/api/budgets/${id}`,
    delete: (id: string) => `/api/budgets/${id}`,
  },
};