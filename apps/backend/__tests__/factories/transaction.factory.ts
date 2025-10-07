import { faker } from '@faker-js/faker';
import { Transaction, TransactionType, TransactionStatus } from '@/modules/transactions/entities/transaction.entity';
import { Account } from '@/modules/accounts/entities/account.entity';
import { Category } from '@/modules/categories/entities/category.entity';
import { User } from '@/core/database/entities/user.entity';
import { DeepPartial } from 'typeorm';

/**
 * Transaction Factory
 *
 * Factory pattern for generating test transactions with realistic financial data.
 */
export class TransactionFactory {
  /**
   * Build a basic transaction entity
   */
  static build(
    account: Account,
    overrides: DeepPartial<Transaction> = {}
  ): Transaction {
    const transaction = new Transaction();
    transaction.id = faker.string.uuid();
    transaction.account = account;
    transaction.accountId = account.id;
    transaction.user = account.user;
    transaction.userId = account.userId;

    // Determine transaction type based on amount
    const isExpense = faker.datatype.boolean(0.7); // 70% chance of expense
    transaction.type = isExpense ? TransactionType.EXPENSE : TransactionType.INCOME;

    // Generate amount based on type
    const amount = isExpense
      ? parseFloat(faker.finance.amount(5, 500, 2))
      : parseFloat(faker.finance.amount(100, 5000, 2));

    transaction.amount = amount;
    transaction.currency = account.currency || 'USD';
    transaction.status = TransactionStatus.CLEARED;

    // Generate merchant and description
    transaction.merchant = isExpense
      ? faker.company.name()
      : faker.helpers.arrayElement(['Salary', 'Freelance', 'Refund', 'Transfer']);

    transaction.description = transaction.description || faker.commerce.productDescription();
    transaction.notes = faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null;

    // Dates
    transaction.transactionDate = faker.date.recent(30);
    transaction.postedDate = faker.date.between({
      from: transaction.transactionDate,
      to: new Date(),
    });

    // Location data
    if (faker.datatype.boolean(0.4)) {
      transaction.location = {
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        latitude: parseFloat(faker.location.latitude()),
        longitude: parseFloat(faker.location.longitude()),
      };
    }

    // Tags
    if (faker.datatype.boolean(0.3)) {
      transaction.tags = faker.helpers.arrayElements([
        'business', 'personal', 'recurring', 'tax-deductible', 'reimbursable'
      ], { min: 1, max: 3 });
    }

    transaction.isPending = false;
    transaction.isRecurring = faker.datatype.boolean(0.1);
    transaction.isHidden = false;
    transaction.isFlagged = faker.datatype.boolean(0.05);

    transaction.createdAt = faker.date.recent();
    transaction.updatedAt = faker.date.recent();

    // Apply overrides
    Object.assign(transaction, overrides);

    return transaction;
  }

  /**
   * Build an expense transaction
   */
  static buildExpense(
    account: Account,
    overrides: DeepPartial<Transaction> = {}
  ): Transaction {
    const merchants = {
      groceries: ['Walmart', 'Target', 'Whole Foods', 'Kroger', 'Safeway'],
      restaurants: ['Starbucks', 'McDonalds', 'Chipotle', 'Subway', 'Pizza Hut'],
      gas: ['Shell', 'Chevron', 'Exxon', 'BP', 'Mobil'],
      utilities: ['Electric Company', 'Gas Company', 'Water Department', 'Internet Provider'],
      shopping: ['Amazon', 'Best Buy', 'Home Depot', 'Nike', 'Apple Store'],
    };

    const category = faker.helpers.arrayElement(Object.keys(merchants));
    const merchant = faker.helpers.arrayElement(merchants[category as keyof typeof merchants]);

    return TransactionFactory.build(account, {
      type: TransactionType.EXPENSE,
      merchant,
      category: { name: category } as any,
      amount: parseFloat(faker.finance.amount(10, 500, 2)),
      ...overrides,
    });
  }

  /**
   * Build an income transaction
   */
  static buildIncome(
    account: Account,
    overrides: DeepPartial<Transaction> = {}
  ): Transaction {
    const sources = {
      'Salary': { min: 2000, max: 10000 },
      'Freelance Payment': { min: 500, max: 3000 },
      'Investment Return': { min: 100, max: 5000 },
      'Tax Refund': { min: 200, max: 2000 },
      'Gift': { min: 50, max: 500 },
      'Side Business': { min: 100, max: 2000 },
    };

    const merchant = faker.helpers.arrayElement(Object.keys(sources));
    const range = sources[merchant as keyof typeof sources];

    return TransactionFactory.build(account, {
      type: TransactionType.INCOME,
      merchant,
      amount: parseFloat(faker.finance.amount(range.min, range.max, 2)),
      category: { name: 'Income' } as any,
      ...overrides,
    });
  }

  /**
   * Build a transfer transaction
   */
  static buildTransfer(
    fromAccount: Account,
    toAccount: Account,
    overrides: DeepPartial<Transaction> = {}
  ): Transaction {
    const amount = parseFloat(faker.finance.amount(50, 1000, 2));

    return TransactionFactory.build(fromAccount, {
      type: TransactionType.TRANSFER,
      merchant: `Transfer to ${toAccount.name}`,
      description: 'Account Transfer',
      amount,
      transferAccountId: toAccount.id,
      category: { name: 'Transfer' } as any,
      ...overrides,
    });
  }

  /**
   * Build a pending transaction
   */
  static buildPending(
    account: Account,
    overrides: DeepPartial<Transaction> = {}
  ): Transaction {
    return TransactionFactory.build(account, {
      status: TransactionStatus.PENDING,
      isPending: true,
      postedDate: null,
      ...overrides,
    });
  }

  /**
   * Build a recurring transaction
   */
  static buildRecurring(
    account: Account,
    overrides: DeepPartial<Transaction> = {}
  ): Transaction {
    const recurringMerchants = [
      'Netflix', 'Spotify', 'Gym Membership', 'Insurance',
      'Phone Bill', 'Internet', 'Rent', 'Mortgage'
    ];

    return TransactionFactory.build(account, {
      merchant: faker.helpers.arrayElement(recurringMerchants),
      isRecurring: true,
      recurringDetails: {
        frequency: faker.helpers.arrayElement(['monthly', 'weekly', 'yearly']),
        nextDate: faker.date.future(),
        endDate: faker.datatype.boolean() ? faker.date.future() : null,
      },
      ...overrides,
    });
  }

  /**
   * Build multiple transactions for an account
   */
  static buildMany(
    account: Account,
    count: number,
    overrides: DeepPartial<Transaction> = {}
  ): Transaction[] {
    return Array.from({ length: count }, () => {
      const type = faker.helpers.arrayElement([
        'expense', 'expense', 'expense', 'income' // 75% expenses, 25% income
      ]);

      if (type === 'expense') {
        return TransactionFactory.buildExpense(account, overrides);
      } else {
        return TransactionFactory.buildIncome(account, overrides);
      }
    });
  }

  /**
   * Build a month's worth of transactions
   */
  static buildMonth(
    account: Account,
    year: number,
    month: number
  ): Transaction[] {
    const transactions: Transaction[] = [];
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Salary (if checking account)
    if (account.type === 'checking') {
      transactions.push(
        TransactionFactory.buildIncome(account, {
          merchant: 'Employer Salary',
          amount: 5000,
          transactionDate: new Date(year, month - 1, 1),
          description: 'Monthly Salary',
        })
      );
    }

    // Regular expenses
    const regularExpenses = [
      { merchant: 'Rent/Mortgage', amount: 1500, day: 1 },
      { merchant: 'Utilities', amount: 150, day: 5 },
      { merchant: 'Phone Bill', amount: 80, day: 10 },
      { merchant: 'Internet', amount: 60, day: 10 },
      { merchant: 'Insurance', amount: 200, day: 15 },
    ];

    regularExpenses.forEach(expense => {
      transactions.push(
        TransactionFactory.buildExpense(account, {
          merchant: expense.merchant,
          amount: expense.amount,
          transactionDate: new Date(year, month - 1, expense.day),
          isRecurring: true,
        })
      );
    });

    // Random daily expenses
    const daysInMonth = endDate.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const numTransactions = faker.number.int({ min: 0, max: 3 });

      for (let i = 0; i < numTransactions; i++) {
        transactions.push(
          TransactionFactory.buildExpense(account, {
            transactionDate: new Date(year, month - 1, day),
          })
        );
      }
    }

    return transactions;
  }

  /**
   * Build raw transaction data (for API requests)
   */
  static buildRaw(overrides: Partial<any> = {}) {
    const isExpense = faker.datatype.boolean(0.7);

    return {
      type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
      amount: parseFloat(faker.finance.amount(10, 500, 2)),
      merchant: faker.company.name(),
      description: faker.commerce.productDescription(),
      transactionDate: faker.date.recent(30).toISOString(),
      categoryId: faker.string.uuid(),
      ...overrides,
    };
  }

  /**
   * Build a flagged/suspicious transaction
   */
  static buildFlagged(
    account: Account,
    overrides: DeepPartial<Transaction> = {}
  ): Transaction {
    return TransactionFactory.build(account, {
      isFlagged: true,
      flagReason: faker.helpers.arrayElement([
        'Unusual amount',
        'Suspicious merchant',
        'Geographic anomaly',
        'Duplicate transaction',
        'Potential fraud',
      ]),
      amount: parseFloat(faker.finance.amount(1000, 5000, 2)),
      ...overrides,
    });
  }

  /**
   * Build transaction with attachments
   */
  static buildWithAttachments(
    account: Account,
    overrides: DeepPartial<Transaction> = {}
  ): Transaction {
    return TransactionFactory.build(account, {
      attachments: [
        {
          id: faker.string.uuid(),
          filename: 'receipt.pdf',
          mimeType: 'application/pdf',
          size: faker.number.int({ min: 10000, max: 500000 }),
          url: faker.internet.url(),
          uploadedAt: faker.date.recent(),
        },
      ],
      ...overrides,
    });
  }

  /**
   * Build test transaction (predictable data)
   */
  static buildTest(
    account: Account,
    index: number = 1
  ): Transaction {
    return TransactionFactory.build(account, {
      merchant: `Test Merchant ${index}`,
      amount: 100 * index,
      description: `Test Transaction ${index}`,
      transactionDate: new Date(),
    });
  }

  /**
   * Build transactions for testing scenarios
   */
  static buildForScenario(
    scenario: 'budget-exceeded' | 'savings-goal' | 'debt-payment' | 'investment',
    account: Account
  ): Transaction[] {
    switch (scenario) {
      case 'budget-exceeded':
        return [
          ...TransactionFactory.buildMany(account, 10, {
            type: TransactionType.EXPENSE,
            category: { name: 'Entertainment' } as any,
          }),
          TransactionFactory.buildExpense(account, {
            amount: 500,
            merchant: 'Expensive Restaurant',
            notes: 'Over budget!',
          }),
        ];

      case 'savings-goal':
        return [
          TransactionFactory.buildTransfer(account, account, {
            merchant: 'Transfer to Savings',
            amount: 500,
            description: 'Monthly savings goal',
          }),
        ];

      case 'debt-payment':
        return [
          TransactionFactory.buildExpense(account, {
            merchant: 'Credit Card Payment',
            amount: 1000,
            category: { name: 'Debt Payment' } as any,
            isRecurring: true,
          }),
        ];

      case 'investment':
        return [
          TransactionFactory.buildTransfer(account, account, {
            merchant: 'Investment Account',
            amount: 1000,
            description: 'Monthly investment',
            category: { name: 'Investment' } as any,
          }),
        ];

      default:
        return TransactionFactory.buildMany(account, 5);
    }
  }
}