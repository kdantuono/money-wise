/**
 * Account Factory
 * Generates realistic account test data using faker
 */

import { faker } from '@faker-js/faker';

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment';
export type AccountStatus = 'active' | 'inactive' | 'pending';

export interface AccountData {
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  status?: AccountStatus;
  accountNumber?: string;
  institution?: string;
  openedDate?: string;
  notes?: string;
}

/**
 * Creates an account with realistic data
 * @param overrides - Partial account data to override defaults
 * @returns AccountData object with sensible defaults
 */
export function createAccount(overrides: Partial<AccountData> = {}): AccountData {
  const type = overrides.type || faker.helpers.arrayElement<AccountType>(['checking', 'savings', 'credit', 'investment']);

  return {
    name: generateAccountName(type),
    type,
    balance: generateRealisticBalance(type),
    currency: 'USD',
    status: 'active',
    accountNumber: generateAccountNumber(),
    institution: faker.company.name(),
    openedDate: faker.date.past({ years: 5 }).toISOString().split('T')[0],
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
    ...overrides,
  };
}

/**
 * Creates multiple accounts
 * @param count - Number of accounts to create
 * @param overrides - Partial account data to override defaults for all accounts
 * @returns Array of AccountData objects
 */
export function createAccounts(count: number, overrides: Partial<AccountData> = {}): AccountData[] {
  return Array.from({ length: count }, () => createAccount(overrides));
}

/**
 * Account Factory with preset scenarios
 */
export const AccountFactory = {
  /**
   * Standard checking account
   */
  checking: (overrides: Partial<AccountData> = {}): AccountData => {
    return createAccount({
      type: 'checking',
      name: 'Primary Checking',
      balance: faker.number.float({ min: 1000, max: 10000, multipleOf: 0.01 }),
      ...overrides,
    });
  },

  /**
   * Savings account
   */
  savings: (overrides: Partial<AccountData> = {}): AccountData => {
    return createAccount({
      type: 'savings',
      name: 'Emergency Savings',
      balance: faker.number.float({ min: 5000, max: 50000, multipleOf: 0.01 }),
      ...overrides,
    });
  },

  /**
   * Credit card account
   */
  credit: (overrides: Partial<AccountData> = {}): AccountData => {
    return createAccount({
      type: 'credit',
      name: faker.helpers.arrayElement([
        'Visa Credit Card',
        'Mastercard',
        'American Express',
        'Discover Card',
      ]),
      balance: -faker.number.float({ min: 0, max: 5000, multipleOf: 0.01 }), // Negative for debt
      ...overrides,
    });
  },

  /**
   * Investment account
   */
  investment: (overrides: Partial<AccountData> = {}): AccountData => {
    return createAccount({
      type: 'investment',
      name: faker.helpers.arrayElement([
        '401k Retirement',
        'IRA Account',
        'Brokerage Account',
        'Mutual Fund',
      ]),
      balance: faker.number.float({ min: 10000, max: 200000, multipleOf: 0.01 }),
      ...overrides,
    });
  },

  /**
   * Empty/new account
   */
  empty: (overrides: Partial<AccountData> = {}): AccountData => {
    return createAccount({
      balance: 0,
      openedDate: new Date().toISOString().split('T')[0],
      ...overrides,
    });
  },

  /**
   * Negative balance account (overdraft)
   */
  overdraft: (overrides: Partial<AccountData> = {}): AccountData => {
    return createAccount({
      type: 'checking',
      balance: -faker.number.float({ min: 10, max: 500, multipleOf: 0.01 }),
      ...overrides,
    });
  },

  /**
   * High balance account
   */
  highBalance: (overrides: Partial<AccountData> = {}): AccountData => {
    return createAccount({
      balance: faker.number.float({ min: 100000, max: 500000, multipleOf: 0.01 }),
      ...overrides,
    });
  },

  /**
   * Inactive/closed account
   */
  inactive: (overrides: Partial<AccountData> = {}): AccountData => {
    return createAccount({
      status: 'inactive',
      balance: 0,
      ...overrides,
    });
  },

  /**
   * Pending account (being set up)
   */
  pending: (overrides: Partial<AccountData> = {}): AccountData => {
    return createAccount({
      status: 'pending',
      openedDate: new Date().toISOString().split('T')[0],
      ...overrides,
    });
  },

  /**
   * Invalid account data (for validation testing)
   */
  invalid: {
    negativeInvestment: (): AccountData => {
      return createAccount({
        type: 'investment',
        balance: -1000, // Investment shouldn't be negative
      });
    },

    emptyName: (): AccountData => {
      return createAccount({
        name: '',
      });
    },

    invalidCurrency: (): AccountData => {
      return createAccount({
        currency: 'INVALID',
      });
    },
  },

  /**
   * Complete portfolio of accounts
   */
  completePortfolio: (): AccountData[] => {
    return [
      AccountFactory.checking({ name: 'Primary Checking', balance: 5000 }),
      AccountFactory.savings({ name: 'Emergency Fund', balance: 15000 }),
      AccountFactory.credit({ name: 'Rewards Credit Card', balance: -1200 }),
      AccountFactory.investment({ name: '401k', balance: 50000 }),
    ];
  },

  /**
   * Multiple accounts of same type
   */
  multipleChecking: (count: number = 3): AccountData[] => {
    const names = ['Primary Checking', 'Secondary Checking', 'Joint Checking', 'Business Checking'];
    return Array.from({ length: count }, (_, i) =>
      AccountFactory.checking({ name: names[i] || `Checking ${i + 1}` })
    );
  },
};

/**
 * Helper: Generate account name based on type
 */
function generateAccountName(type: AccountType): string {
  const names: Record<AccountType, string[]> = {
    checking: [
      'Primary Checking',
      'Personal Checking',
      'Joint Checking',
      'Business Checking',
      'Student Checking',
    ],
    savings: [
      'Emergency Savings',
      'Vacation Fund',
      'Home Savings',
      'Retirement Savings',
      'Goal Savings',
    ],
    credit: [
      'Visa Credit Card',
      'Mastercard',
      'Rewards Card',
      'Cash Back Card',
      'Travel Card',
    ],
    investment: [
      '401k Retirement',
      'IRA Account',
      'Roth IRA',
      'Brokerage Account',
      'Investment Portfolio',
    ],
  };

  return faker.helpers.arrayElement(names[type]);
}

/**
 * Helper: Generate realistic balance based on account type
 */
function generateRealisticBalance(type: AccountType): number {
  const ranges: Record<AccountType, { min: number; max: number }> = {
    checking: { min: 500, max: 15000 },
    savings: { min: 2000, max: 100000 },
    credit: { min: -10000, max: 0 }, // Credit is typically debt
    investment: { min: 5000, max: 500000 },
  };

  const range = ranges[type];
  return faker.number.float({ min: range.min, max: range.max, multipleOf: 0.01 });
}

/**
 * Helper: Generate realistic account number
 */
function generateAccountNumber(): string {
  // Format: XXXX-XXXX-XXXX (last 4 digits visible for security)
  return `****-****-${faker.string.numeric(4)}`;
}
