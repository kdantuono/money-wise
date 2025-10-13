import { faker } from '@faker-js/faker';
import { Account, AccountType } from '@/modules/accounts/entities/account.entity';
import { User } from '../../generated/prisma';
import { DeepPartial } from 'typeorm';

/**
 * Account Factory
 *
 * Factory pattern for generating test accounts with realistic financial data.
 */
export class AccountFactory {
  /**
   * Build a basic account entity
   */
  static build(user?: User, overrides: DeepPartial<Account> = {}): Account {
    const account = new Account();
    account.id = faker.string.uuid();
    account.name = faker.finance.accountName();
    account.type = faker.helpers.arrayElement(Object.values(AccountType));
    account.currency = faker.finance.currencyCode();
    account.currentBalance = parseFloat(faker.finance.amount(0, 10000, 2));
    account.availableBalance = account.currentBalance * 0.95; // 95% available
    account.institutionName = faker.company.name();
    account.accountNumber = faker.finance.accountNumber();
    account.isActive = true;
    account.isPrimary = false;
    account.color = faker.color.hexRGB();
    account.icon = faker.helpers.arrayElement(['bank', 'credit-card', 'wallet', 'piggy-bank']);

    if (user) {
      account.user = user;
      account.userId = user.id;
    }

    account.createdAt = faker.date.past();
    account.updatedAt = faker.date.recent();
    account.lastSyncedAt = faker.date.recent();

    // Apply overrides
    Object.assign(account, overrides);

    return account;
  }

  /**
   * Build a checking account
   */
  static buildChecking(user?: User, overrides: DeepPartial<Account> = {}): Account {
    return AccountFactory.build(user, {
      type: AccountType.CHECKING,
      name: `${faker.company.name()} Checking`,
      minimumBalance: 0,
      overdraftLimit: 500,
      ...overrides,
    });
  }

  /**
   * Build a savings account
   */
  static buildSavings(user?: User, overrides: DeepPartial<Account> = {}): Account {
    return AccountFactory.build(user, {
      type: AccountType.SAVINGS,
      name: `${faker.company.name()} Savings`,
      interestRate: parseFloat(faker.finance.amount(0.01, 3.5, 2)),
      minimumBalance: 25,
      ...overrides,
    });
  }

  /**
   * Build a credit card account
   */
  static buildCreditCard(user?: User, overrides: DeepPartial<Account> = {}): Account {
    const creditLimit = parseFloat(faker.finance.amount(1000, 25000, 0));
    const currentBalance = parseFloat(faker.finance.amount(0, creditLimit, 2));

    return AccountFactory.build(user, {
      type: AccountType.CREDIT_CARD,
      name: `${faker.company.name()} Credit Card`,
      currentBalance: -currentBalance, // Negative for credit cards
      availableBalance: creditLimit - currentBalance,
      creditLimit,
      apr: parseFloat(faker.finance.amount(12, 24, 2)),
      minimumPayment: currentBalance * 0.02,
      paymentDueDate: faker.date.future(),
      ...overrides,
    });
  }

  /**
   * Build an investment account
   */
  static buildInvestment(user?: User, overrides: DeepPartial<Account> = {}): Account {
    const principal = parseFloat(faker.finance.amount(1000, 100000, 2));
    const returns = faker.datatype.float({ min: -0.2, max: 0.3, precision: 0.001 });

    return AccountFactory.build(user, {
      type: AccountType.INVESTMENT,
      name: `${faker.company.name()} Investment`,
      currentBalance: principal * (1 + returns),
      unrealizedGains: principal * returns,
      realizedGains: parseFloat(faker.finance.amount(0, 5000, 2)),
      ...overrides,
    });
  }

  /**
   * Build a loan account
   */
  static buildLoan(user?: User, overrides: DeepPartial<Account> = {}): Account {
    const loanAmount = parseFloat(faker.finance.amount(5000, 500000, 2));
    const paidAmount = parseFloat(faker.finance.amount(0, loanAmount * 0.5, 2));

    return AccountFactory.build(user, {
      type: AccountType.LOAN,
      name: faker.helpers.arrayElement(['Mortgage', 'Auto Loan', 'Personal Loan', 'Student Loan']),
      currentBalance: -(loanAmount - paidAmount), // Negative for loans
      originalAmount: loanAmount,
      apr: parseFloat(faker.finance.amount(3, 12, 2)),
      term: faker.helpers.arrayElement([12, 24, 36, 60, 180, 360]), // months
      monthlyPayment: loanAmount / 60, // Simplified
      nextPaymentDate: faker.date.future(),
      ...overrides,
    });
  }

  /**
   * Build a cash/wallet account
   */
  static buildCash(user?: User, overrides: DeepPartial<Account> = {}): Account {
    return AccountFactory.build(user, {
      type: AccountType.CASH,
      name: 'Cash Wallet',
      institutionName: null,
      accountNumber: null,
      currentBalance: parseFloat(faker.finance.amount(0, 1000, 2)),
      ...overrides,
    });
  }

  /**
   * Build multiple accounts for a user
   */
  static buildSet(user: User): Account[] {
    return [
      AccountFactory.buildChecking(user, { isPrimary: true }),
      AccountFactory.buildSavings(user),
      AccountFactory.buildCreditCard(user),
    ];
  }

  /**
   * Build a complete financial portfolio
   */
  static buildPortfolio(user: User): Account[] {
    return [
      AccountFactory.buildChecking(user, {
        isPrimary: true,
        currentBalance: 5000,
        name: 'Primary Checking'
      }),
      AccountFactory.buildSavings(user, {
        currentBalance: 15000,
        name: 'Emergency Fund'
      }),
      AccountFactory.buildCreditCard(user, {
        name: 'Rewards Card',
        creditLimit: 10000,
        currentBalance: -1500,
      }),
      AccountFactory.buildInvestment(user, {
        name: '401(k)',
        currentBalance: 50000,
      }),
      AccountFactory.buildLoan(user, {
        name: 'Mortgage',
        originalAmount: 250000,
        currentBalance: -200000,
      }),
    ];
  }

  /**
   * Build raw account data (for API requests)
   */
  static buildRaw(overrides: Partial<any> = {}) {
    return {
      name: faker.finance.accountName(),
      type: faker.helpers.arrayElement(Object.values(AccountType)),
      currency: faker.finance.currencyCode(),
      currentBalance: parseFloat(faker.finance.amount(0, 10000, 2)),
      institutionName: faker.company.name(),
      ...overrides,
    };
  }

  /**
   * Build account with transactions history
   */
  static buildWithHistory(user: User, overrides: DeepPartial<Account> = {}): Account {
    const account = AccountFactory.build(user, overrides);

    // Add metadata for transaction generation
    account.metadata = {
      transactionCount: faker.number.int({ min: 10, max: 100 }),
      oldestTransaction: faker.date.past(2),
      newestTransaction: faker.date.recent(),
      averageTransaction: faker.finance.amount(10, 200, 2),
    };

    return account;
  }

  /**
   * Build an inactive account
   */
  static buildInactive(user?: User, overrides: DeepPartial<Account> = {}): Account {
    return AccountFactory.build(user, {
      isActive: false,
      closedAt: faker.date.recent(),
      closureReason: faker.lorem.sentence(),
      ...overrides,
    });
  }

  /**
   * Build account for specific testing scenario
   */
  static buildForScenario(
    scenario: 'empty' | 'overdrawn' | 'wealthy' | 'debt',
    user?: User
  ): Account {
    switch (scenario) {
      case 'empty':
        return AccountFactory.buildChecking(user, {
          currentBalance: 0,
          availableBalance: 0,
        });

      case 'overdrawn':
        return AccountFactory.buildChecking(user, {
          currentBalance: -150,
          availableBalance: 0,
          overdraftLimit: 500,
        });

      case 'wealthy':
        return AccountFactory.buildInvestment(user, {
          currentBalance: 1000000,
          unrealizedGains: 250000,
        });

      case 'debt':
        return AccountFactory.buildCreditCard(user, {
          creditLimit: 5000,
          currentBalance: -4900,
          availableBalance: 100,
        });

      default:
        return AccountFactory.build(user);
    }
  }

  /**
   * Build account with alerts
   */
  static buildWithAlerts(user: User, overrides: DeepPartial<Account> = {}): Account {
    return AccountFactory.build(user, {
      alerts: {
        lowBalance: {
          enabled: true,
          threshold: 100,
        },
        largeTransaction: {
          enabled: true,
          threshold: 500,
        },
        unusualActivity: {
          enabled: true,
        },
      },
      ...overrides,
    });
  }

  /**
   * Build test account (predictable data for tests)
   */
  static buildTest(index: number = 1, user?: User): Account {
    return AccountFactory.build(user, {
      name: `Test Account ${index}`,
      type: AccountType.CHECKING,
      currency: 'USD',
      currentBalance: 1000 * index,
      accountNumber: `TEST${index.toString().padStart(6, '0')}`,
    });
  }
}