/**
 * Transaction Factory
 * Generates realistic transaction test data using faker
 */

import { faker } from '@faker-js/faker';

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionCategory =
  | 'food'
  | 'transportation'
  | 'entertainment'
  | 'utilities'
  | 'healthcare'
  | 'shopping'
  | 'income'
  | 'transfer'
  | 'housing'
  | 'education'
  | 'other';

export interface TransactionData {
  amount: number;
  description: string;
  category: TransactionCategory;
  type: TransactionType;
  date: string;
  accountId?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Creates a transaction with realistic data
 * @param overrides - Partial transaction data to override defaults
 * @returns TransactionData object with sensible defaults
 */
export function createTransaction(overrides: Partial<TransactionData> = {}): TransactionData {
  const type = overrides.type || faker.helpers.arrayElement<TransactionType>(['income', 'expense', 'transfer']);
  const category = overrides.category || getRandomCategoryForType(type);

  return {
    amount: generateRealisticAmount(type),
    description: generateDescriptionForCategory(category),
    category,
    type,
    date: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
    tags: faker.helpers.maybe(() => faker.helpers.arrayElements(['personal', 'work', 'recurring', 'one-time'], 2), { probability: 0.3 }),
    ...overrides,
  };
}

/**
 * Creates multiple transactions
 * @param count - Number of transactions to create
 * @param overrides - Partial transaction data to override defaults for all transactions
 * @returns Array of TransactionData objects
 */
export function createTransactions(count: number, overrides: Partial<TransactionData> = {}): TransactionData[] {
  return Array.from({ length: count }, () => createTransaction(overrides));
}

/**
 * Transaction Factory with preset scenarios
 */
export const TransactionFactory = {
  /**
   * Standard expense transaction
   */
  expense: (overrides: Partial<TransactionData> = {}): TransactionData => {
    return createTransaction({
      type: 'expense',
      amount: -faker.number.float({ min: 10, max: 500, multipleOf: 0.01 }),
      ...overrides,
    });
  },

  /**
   * Standard income transaction
   */
  income: (overrides: Partial<TransactionData> = {}): TransactionData => {
    return createTransaction({
      type: 'income',
      category: 'income',
      amount: faker.number.float({ min: 1000, max: 5000, multipleOf: 0.01 }),
      description: faker.helpers.arrayElement([
        'Salary Payment',
        'Freelance Income',
        'Bonus',
        'Investment Return',
        'Tax Refund',
      ]),
      ...overrides,
    });
  },

  /**
   * Transfer between accounts
   */
  transfer: (overrides: Partial<TransactionData> = {}): TransactionData => {
    return createTransaction({
      type: 'transfer',
      category: 'transfer',
      amount: faker.number.float({ min: 100, max: 2000, multipleOf: 0.01 }),
      description: faker.helpers.arrayElement([
        'Transfer to Savings',
        'Transfer from Checking',
        'Account Transfer',
        'Balance Transfer',
      ]),
      ...overrides,
    });
  },

  /**
   * Recurring monthly expense
   */
  recurringExpense: (overrides: Partial<TransactionData> = {}): TransactionData => {
    return createTransaction({
      type: 'expense',
      category: 'utilities',
      amount: -faker.number.float({ min: 50, max: 300, multipleOf: 0.01 }),
      description: faker.helpers.arrayElement([
        'Netflix Subscription',
        'Spotify Premium',
        'Internet Bill',
        'Phone Bill',
        'Gym Membership',
      ]),
      tags: ['recurring'],
      ...overrides,
    });
  },

  /**
   * Large purchase
   */
  largePurchase: (overrides: Partial<TransactionData> = {}): TransactionData => {
    return createTransaction({
      type: 'expense',
      amount: -faker.number.float({ min: 1000, max: 5000, multipleOf: 0.01 }),
      description: faker.helpers.arrayElement([
        'Laptop Purchase',
        'Furniture',
        'Home Appliance',
        'Car Repair',
        'Medical Expense',
      ]),
      ...overrides,
    });
  },

  /**
   * Small daily expense
   */
  dailyExpense: (overrides: Partial<TransactionData> = {}): TransactionData => {
    return createTransaction({
      type: 'expense',
      category: 'food',
      amount: -faker.number.float({ min: 5, max: 50, multipleOf: 0.01 }),
      description: faker.helpers.arrayElement([
        'Coffee',
        'Lunch',
        'Snack',
        'Breakfast',
        'Dinner',
      ]),
      ...overrides,
    });
  },

  /**
   * Transaction with validation errors (for error testing)
   */
  invalid: {
    negativeIncome: (): TransactionData => {
      return createTransaction({
        type: 'income',
        amount: -1000, // Income should be positive
        category: 'income',
      });
    },

    positiveExpense: (): TransactionData => {
      return createTransaction({
        type: 'expense',
        amount: 500, // Expense should be negative
        category: 'food',
      });
    },

    futureDate: (): TransactionData => {
      return createTransaction({
        date: faker.date.future().toISOString().split('T')[0],
      });
    },

    emptyDescription: (): TransactionData => {
      return createTransaction({
        description: '',
      });
    },
  },

  /**
   * Generate a full month of realistic transactions
   */
  monthlyTransactions: (count: number = 50): TransactionData[] => {
    const transactions: TransactionData[] = [];
    const today = new Date();

    // Add salary (income) at start of month
    transactions.push(
      createTransaction({
        type: 'income',
        category: 'income',
        amount: faker.number.float({ min: 3000, max: 6000, multipleOf: 0.01 }),
        description: 'Monthly Salary',
        date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
      })
    );

    // Add recurring expenses
    ['Netflix', 'Spotify', 'Internet', 'Phone'].forEach((service, index) => {
      transactions.push(
        createTransaction({
          type: 'expense',
          category: 'utilities',
          amount: -faker.number.float({ min: 10, max: 100, multipleOf: 0.01 }),
          description: `${service} Subscription`,
          date: new Date(today.getFullYear(), today.getMonth(), 5 + index).toISOString().split('T')[0],
          tags: ['recurring'],
        })
      );
    });

    // Add random daily transactions
    const remaining = count - transactions.length;
    for (let i = 0; i < remaining; i++) {
      transactions.push(createTransaction({
        date: faker.date.between({
          from: new Date(today.getFullYear(), today.getMonth(), 1),
          to: today,
        }).toISOString().split('T')[0],
      }));
    }

    return transactions;
  },
};

/**
 * Helper: Get random category for transaction type
 */
function getRandomCategoryForType(type: TransactionType): TransactionCategory {
  const categoryMap: Record<TransactionType, TransactionCategory[]> = {
    income: ['income'],
    expense: ['food', 'transportation', 'entertainment', 'utilities', 'healthcare', 'shopping', 'housing', 'education', 'other'],
    transfer: ['transfer'],
  };

  return faker.helpers.arrayElement(categoryMap[type]);
}

/**
 * Helper: Generate realistic description for category
 */
function generateDescriptionForCategory(category: TransactionCategory): string {
  const descriptions: Record<TransactionCategory, string[]> = {
    food: ['Grocery Store', 'Restaurant', 'Coffee Shop', 'Fast Food', 'Takeout'],
    transportation: ['Gas Station', 'Uber', 'Public Transit', 'Parking', 'Car Maintenance'],
    entertainment: ['Movie Theater', 'Concert', 'Streaming Service', 'Video Games', 'Books'],
    utilities: ['Electric Bill', 'Water Bill', 'Internet', 'Phone Bill', 'Streaming'],
    healthcare: ['Pharmacy', 'Doctor Visit', 'Dental', 'Health Insurance', 'Medical Supplies'],
    shopping: ['Online Shopping', 'Clothing Store', 'Electronics', 'Home Goods', 'Personal Care'],
    income: ['Salary', 'Freelance', 'Bonus', 'Investment', 'Other Income'],
    transfer: ['Account Transfer', 'Savings Transfer', 'Balance Transfer'],
    housing: ['Rent', 'Mortgage', 'Home Insurance', 'Property Tax', 'HOA Fee'],
    education: ['Tuition', 'Books', 'Course Fee', 'School Supplies'],
    other: ['Miscellaneous', 'Other Expense', 'Uncategorized'],
  };

  return faker.helpers.arrayElement(descriptions[category]);
}

/**
 * Helper: Generate realistic amount based on type
 */
function generateRealisticAmount(type: TransactionType): number {
  switch (type) {
    case 'income':
      return faker.number.float({ min: 500, max: 5000, multipleOf: 0.01 });
    case 'expense':
      return -faker.number.float({ min: 10, max: 500, multipleOf: 0.01 });
    case 'transfer':
      return faker.number.float({ min: 100, max: 2000, multipleOf: 0.01 });
  }
}
