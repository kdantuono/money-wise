/* eslint-disable no-console */
/**
 * Prisma Test Data Factory
 * Provides consistent test data generation for all entities using Prisma Client
 * Console statements are intentionally used for test data generation debugging
 *
 * @phase P.3.5.1
 * @description Prisma-native test factories for integration testing
 * @replaces test-data.factory.ts (TypeORM-based)
 */

import { faker } from '@faker-js/faker';
import {
  PrismaClient,
  User,
  Family,
  Account,
  Transaction,
  Category,
  Budget,
  UserRole,
  UserStatus,
  AccountType,
  AccountStatus,
  AccountSource,
  TransactionType,
  TransactionStatus,
  TransactionSource,
  CategoryType,
  CategoryStatus,
  BudgetPeriod,
  BudgetStatus,
  Prisma,
} from '../../../../../generated/prisma';
import * as bcrypt from 'bcryptjs';
import {
  toPrismaJson,
  UserPreferences,
  AccountSettings,
  CategoryRules,
  CategoryMetadata,
  BudgetSettings,
} from '../../../types/factory-metadata.types';

/**
 * Base factory interface
 */
export interface Factory<T> {
  create(overrides?: Partial<T>): T;
  build(overrides?: Partial<T>): Promise<T>;
  createMany(count: number, overrides?: Partial<T>): T[];
  buildMany(count: number, overrides?: Partial<T>): Promise<T[]>;
}

/**
 * Abstract base factory implementation for Prisma
 */
export abstract class BasePrismaFactory<T> implements Factory<T> {
  constructor(protected prisma: PrismaClient) {}

  abstract create(overrides?: Partial<T>): T;
  abstract build(overrides?: Partial<T>): Promise<T>;

  createMany(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  async buildMany(count: number, overrides?: Partial<T>): Promise<T[]> {
    const results: T[] = [];
    // Build sequentially to ensure unique constraints and relationships
    for (let i = 0; i < count; i++) {
      const entity = await this.build(overrides);
      results.push(entity);
    }
    return results;
  }
}

/**
 * Family Factory
 */
export class FamilyFactory extends BasePrismaFactory<Family> {
  private static familyCounter = 0;

  create(overrides: Partial<Family> = {}): Family {
    FamilyFactory.familyCounter++;

    const name = overrides.name || `${faker.person.lastName()} Family ${FamilyFactory.familyCounter}`;

    return {
      id: overrides.id || faker.string.uuid(),
      name,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    } as Family;
  }

  async build(overrides: Partial<Family> = {}): Promise<Family> {
    const data = this.create(overrides);

    return await this.prisma.family.create({
      data: {
        name: data.name,
      },
    });
  }
}

/**
 * User Factory
 */
export class UserFactory extends BasePrismaFactory<User> {
  private static emailCounter = 0;

  constructor(prisma: PrismaClient, private familyFactory: FamilyFactory) {
    super(prisma);
  }

  create(overrides: Partial<User> = {}): User {
    // Ensure unique email with timestamp + counter for test isolation
    const timestamp = Date.now();
    UserFactory.emailCounter++;

    return {
      id: overrides.id || faker.string.uuid(),
      email: overrides.email || `test-${timestamp}-${UserFactory.emailCounter}@moneywise-test.com`,
      firstName: overrides.firstName || faker.person.firstName(),
      lastName: overrides.lastName || faker.person.lastName(),
      passwordHash: overrides.passwordHash || '$2a$10$hashedpassword',
      familyId: overrides.familyId || '', // Must be provided when building
      role: overrides.role || ('MEMBER' as UserRole),
      status: overrides.status || ('ACTIVE' as UserStatus),
      avatar: overrides.avatar || faker.image.avatarGitHub(),
      timezone: overrides.timezone || faker.location.timeZone(),
      currency: overrides.currency || 'USD',
      preferences: (overrides.preferences || {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          categories: true,
          budgets: true,
        },
      }) as UserPreferences,
      lastLoginAt: overrides.lastLoginAt || faker.date.recent(),
      emailVerifiedAt: overrides.emailVerifiedAt || faker.date.past(),
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    } as User;
  }

  async build(overrides: Partial<User> = {}): Promise<User> {
    // Create family if familyId not provided
    let familyId = overrides.familyId;
    if (!familyId) {
      const family = await this.familyFactory.build();
      familyId = family.id;
    }

    const data = this.create({ ...overrides, familyId });

    return await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash: data.passwordHash,
        familyId: data.familyId,
        role: data.role,
        status: data.status,
        avatar: data.avatar,
        timezone: data.timezone,
        currency: data.currency,
        preferences: toPrismaJson(data.preferences),
        lastLoginAt: data.lastLoginAt,
        emailVerifiedAt: data.emailVerifiedAt,
      },
    });
  }

  /**
   * Create admin user
   */
  async buildAdmin(overrides: Partial<User> = {}): Promise<User> {
    return this.build({
      role: 'ADMIN' as UserRole,
      firstName: 'Admin',
      lastName: 'User',
      ...overrides,
    });
  }

  /**
   * Create unverified user
   */
  async buildUnverified(overrides: Partial<User> = {}): Promise<User> {
    return this.build({
      emailVerifiedAt: null,
      status: 'INACTIVE' as UserStatus,
      ...overrides,
    });
  }

  /**
   * Create user with hashed password
   */
  async buildWithPassword(password: string, overrides: Partial<User> = {}): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    return this.build({
      passwordHash,
      ...overrides,
    });
  }
}

/**
 * Account Factory
 */
export class AccountFactory extends BasePrismaFactory<Account> {
  constructor(prisma: PrismaClient, private userFactory: UserFactory) {
    super(prisma);
  }

  create(overrides: Partial<Account> = {}): Account {
    return {
      id: overrides.id || faker.string.uuid(),
      userId: overrides.userId || null,
      familyId: overrides.familyId || null,
      name: overrides.name || `${faker.person.firstName()}'s ${faker.helpers.arrayElement(['Checking', 'Savings', 'Investment', 'Credit'])} Account`,
      type: overrides.type || ('CHECKING' as AccountType),
      status: overrides.status || ('ACTIVE' as AccountStatus),
      source: overrides.source || ('MANUAL' as AccountSource),
      // Use Prisma.Decimal for money fields
      currentBalance: overrides.currentBalance ?? new Prisma.Decimal(faker.finance.amount()),
      availableBalance: overrides.availableBalance ?? null,
      creditLimit: overrides.creditLimit ?? null,
      currency: overrides.currency || 'USD',
      institutionName: overrides.institutionName || faker.company.name(),
      accountNumber: overrides.accountNumber || faker.finance.accountNumber(),
      routingNumber: overrides.routingNumber || faker.number.int({ min: 100000000, max: 999999999 }).toString(),
      isActive: overrides.isActive ?? true,
      syncEnabled: overrides.syncEnabled ?? true,
      lastSyncAt: overrides.lastSyncAt || faker.date.recent(),
      syncError: overrides.syncError || null,
      settings: (overrides.settings || {
        autoSync: true,
        syncFrequency: 'daily',
        notifications: true,
        budgetIncluded: true,
      }) as AccountSettings,
      plaidAccountId: overrides.plaidAccountId || null,
      plaidItemId: overrides.plaidItemId || null,
      plaidAccessToken: overrides.plaidAccessToken || null,
      plaidMetadata: overrides.plaidMetadata || null,
      // Banking provider integration fields
      bankingProvider: overrides.bankingProvider || null,
      saltEdgeAccountId: overrides.saltEdgeAccountId || null,
      saltEdgeConnectionId: overrides.saltEdgeConnectionId || null,
      tinkAccountId: overrides.tinkAccountId || null,
      yalilyAccountId: overrides.yalilyAccountId || null,
      // Sync tracking
      syncStatus: overrides.syncStatus || ('PENDING' as any),
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    } as Account;
  }

  async build(overrides: Partial<Account> = {}): Promise<Account> {
    // Create user if neither userId nor familyId provided
    let userId = overrides.userId;
    if (!userId && !overrides.familyId) {
      const user = await this.userFactory.build();
      userId = user.id;
    }

    const data = this.create({ ...overrides, userId });

    return await this.prisma.account.create({
      data: {
        userId: data.userId,
        familyId: data.familyId,
        name: data.name,
        type: data.type,
        status: data.status,
        source: data.source,
        currentBalance: data.currentBalance,
        availableBalance: data.availableBalance,
        creditLimit: data.creditLimit,
        currency: data.currency,
        institutionName: data.institutionName,
        accountNumber: data.accountNumber,
        routingNumber: data.routingNumber,
        isActive: data.isActive,
        syncEnabled: data.syncEnabled,
        lastSyncAt: data.lastSyncAt,
        syncError: data.syncError,
        settings: toPrismaJson(data.settings),
        plaidAccountId: data.plaidAccountId,
        plaidItemId: data.plaidItemId,
        plaidAccessToken: data.plaidAccessToken,
        plaidMetadata: data.plaidMetadata ? toPrismaJson(data.plaidMetadata) : null,
      },
    });
  }

  /**
   * Create Plaid account
   */
  async buildPlaidAccount(overrides: Partial<Account> = {}): Promise<Account> {
    return this.build({
      source: 'PLAID' as AccountSource,
      plaidAccountId: faker.string.alphanumeric(26),
      plaidItemId: faker.string.alphanumeric(26),
      plaidAccessToken: `access-sandbox-${faker.string.alphanumeric(26)}`,
      plaidMetadata: {
        mask: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        subtype: 'checking',
        officialName: `${faker.company.name()} ${faker.helpers.arrayElement(['Checking', 'Savings'])}`,
        persistentAccountId: faker.string.alphanumeric(26),
      },
      ...overrides,
    });
  }

  /**
   * Create credit card account
   */
  async buildCreditCard(overrides: Partial<Account> = {}): Promise<Account> {
    return this.build({
      type: 'CREDIT_CARD' as AccountType,
      currentBalance: new Prisma.Decimal(faker.finance.amount({ min: -5000, max: 0 })),
      creditLimit: new Prisma.Decimal(faker.finance.amount({ min: 1000, max: 50000 })),
      ...overrides,
    });
  }
}

/**
 * Category Factory
 */
export class CategoryFactory extends BasePrismaFactory<Category> {
  private static slugCounter = 0;

  constructor(prisma: PrismaClient, private familyFactory: FamilyFactory) {
    super(prisma);
  }

  create(overrides: Partial<Category> = {}): Category {
    const name = overrides.name || faker.commerce.department();
    const timestamp = Date.now();
    CategoryFactory.slugCounter++;

    return {
      id: overrides.id || faker.string.uuid(),
      name,
      slug: overrides.slug || `${name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${CategoryFactory.slugCounter}`,
      familyId: overrides.familyId || '', // Must be provided when building
      description: overrides.description || faker.lorem.sentence(),
      type: overrides.type || ('EXPENSE' as CategoryType),
      status: overrides.status || ('ACTIVE' as CategoryStatus),
      color: overrides.color || faker.color.rgb({ format: 'hex', casing: 'lower' }),
      icon: overrides.icon || faker.helpers.arrayElement(['shopping-bag', 'car', 'home', 'food', 'entertainment']),
      isDefault: overrides.isDefault ?? false,
      isSystem: overrides.isSystem ?? false,
      sortOrder: overrides.sortOrder || faker.number.int({ min: 0, max: 100 }),
      parentId: overrides.parentId || null,
      rules: (overrides.rules || {
        keywords: [faker.commerce.productName()],
        merchantPatterns: [faker.company.name()],
        autoAssign: true,
        confidence: faker.number.float({ min: 0.5, max: 1.0 }),
      }) as CategoryRules,
      metadata: (overrides.metadata || {
        budgetEnabled: true,
        monthlyLimit: parseFloat(faker.finance.amount({ min: 100, max: 2000 })),
        taxDeductible: faker.datatype.boolean(),
        businessExpense: faker.datatype.boolean(),
      }) as CategoryMetadata,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    } as Category;
  }

  async build(overrides: Partial<Category> = {}): Promise<Category> {
    // Create family if familyId not provided
    let familyId = overrides.familyId;
    if (!familyId) {
      const family = await this.familyFactory.build();
      familyId = family.id;
    }

    const data = this.create({ ...overrides, familyId });

    // Build create data object conditionally based on parentId
    const createData: Prisma.CategoryCreateInput = {
      name: data.name,
      slug: data.slug,
      family: { connect: { id: data.familyId } },
      description: data.description,
      type: data.type,
      status: data.status,
      color: data.color,
      icon: data.icon,
      isDefault: data.isDefault,
      isSystem: data.isSystem,
      sortOrder: data.sortOrder,
      rules: toPrismaJson(data.rules),
      metadata: toPrismaJson(data.metadata),
    };

    // Add parent relation only if parentId exists
    if (data.parentId) {
      createData.parent = { connect: { id: data.parentId } };
    }

    return await this.prisma.category.create({ data: createData });
  }

  /**
   * Build expense category
   */
  async buildExpenseCategory(overrides: Partial<Category> = {}): Promise<Category> {
    return this.build({
      type: 'EXPENSE' as CategoryType,
      name: overrides.name || 'Food & Dining',
      color: '#ef4444',
      icon: 'utensils',
      ...overrides,
    });
  }

  /**
   * Build income category
   */
  async buildIncomeCategory(overrides: Partial<Category> = {}): Promise<Category> {
    return this.build({
      type: 'INCOME' as CategoryType,
      name: overrides.name || 'Salary',
      color: '#22c55e',
      icon: 'briefcase',
      ...overrides,
    });
  }

  /**
   * Build system category
   */
  async buildSystemCategory(overrides: Partial<Category> = {}): Promise<Category> {
    return this.build({
      isSystem: true,
      isDefault: true,
      ...overrides,
    });
  }
}

/**
 * Transaction Factory
 */
export class TransactionFactory extends BasePrismaFactory<Transaction> {
  constructor(prisma: PrismaClient, private accountFactory: AccountFactory) {
    super(prisma);
  }

  create(overrides: Partial<Transaction> = {}): Transaction {
    return {
      id: overrides.id || faker.string.uuid(),
      accountId: overrides.accountId || '', // Must be provided when building
      categoryId: overrides.categoryId || null,
      amount: overrides.amount || new Prisma.Decimal(faker.finance.amount()),
      type: overrides.type || ('DEBIT' as TransactionType),
      status: overrides.status || ('POSTED' as TransactionStatus),
      source: overrides.source || ('MANUAL' as TransactionSource),
      date: overrides.date || faker.date.recent(),
      authorizedDate: overrides.authorizedDate || null,
      description: overrides.description || faker.commerce.productDescription(),
      merchantName: overrides.merchantName || faker.company.name(),
      originalDescription: overrides.originalDescription || null,
      currency: overrides.currency || 'USD',
      reference: overrides.reference || null,
      checkNumber: overrides.checkNumber || null,
      isPending: overrides.isPending ?? false,
      isRecurring: overrides.isRecurring ?? false,
      isHidden: overrides.isHidden ?? false,
      includeInBudget: overrides.includeInBudget ?? true,
      notes: overrides.notes || null,
      tags: overrides.tags || [],
      location: overrides.location || null,
      plaidTransactionId: overrides.plaidTransactionId || null,
      plaidAccountId: overrides.plaidAccountId || null,
      plaidMetadata: overrides.plaidMetadata || null,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    } as Transaction;
  }

  async build(overrides: Partial<Transaction> = {}): Promise<Transaction> {
    // Create account if accountId not provided
    let accountId = overrides.accountId;
    if (!accountId) {
      const account = await this.accountFactory.build();
      accountId = account.id;
    }

    const data = this.create({ ...overrides, accountId });

    return await this.prisma.transaction.create({
      data: {
        accountId: data.accountId,
        categoryId: data.categoryId,
        amount: data.amount,
        type: data.type,
        status: data.status,
        source: data.source,
        date: data.date,
        authorizedDate: data.authorizedDate,
        description: data.description,
        merchantName: data.merchantName,
        originalDescription: data.originalDescription,
        currency: data.currency,
        reference: data.reference,
        checkNumber: data.checkNumber,
        isPending: data.isPending,
        isRecurring: data.isRecurring,
        isHidden: data.isHidden,
        includeInBudget: data.includeInBudget,
        notes: data.notes,
        tags: data.tags,
        location: data.location ? toPrismaJson(data.location) : null,
        plaidTransactionId: data.plaidTransactionId,
        plaidAccountId: data.plaidAccountId,
        plaidMetadata: data.plaidMetadata ? toPrismaJson(data.plaidMetadata) : null,
      },
    });
  }

  /**
   * Create expense transaction
   */
  async buildExpense(overrides: Partial<Transaction> = {}): Promise<Transaction> {
    return this.build({
      type: 'DEBIT' as TransactionType,
      amount: new Prisma.Decimal(faker.finance.amount({ min: 10, max: 500 })),
      description: `Purchase at ${faker.company.name()}`,
      ...overrides,
    });
  }

  /**
   * Create income transaction
   */
  async buildIncome(overrides: Partial<Transaction> = {}): Promise<Transaction> {
    return this.build({
      type: 'CREDIT' as TransactionType,
      amount: new Prisma.Decimal(faker.finance.amount({ min: 500, max: 5000 })),
      description: 'Salary payment',
      merchantName: 'Employer',
      ...overrides,
    });
  }

  /**
   * Create Plaid transaction
   */
  async buildPlaidTransaction(overrides: Partial<Transaction> = {}): Promise<Transaction> {
    return this.build({
      source: 'PLAID' as TransactionSource,
      plaidTransactionId: faker.string.alphanumeric(26),
      plaidAccountId: faker.string.alphanumeric(26),
      plaidMetadata: {
        categoryId: [faker.string.alphanumeric(10)],
        categoryConfidenceLevel: 'high',
        transactionCode: faker.string.alphanumeric(6),
        transactionType: 'purchase',
        personalFinanceCategory: {
          primary: 'FOOD_AND_DRINK',
          detailed: 'FOOD_AND_DRINK_RESTAURANTS',
          confidence_level: 'high',
        },
      },
      location: {
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        region: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: 'US',
        lat: faker.location.latitude(),
        lon: faker.location.longitude(),
      },
      ...overrides,
    });
  }
}

/**
 * Budget Factory
 */
export class BudgetFactory extends BasePrismaFactory<Budget> {
  constructor(prisma: PrismaClient, private familyFactory: FamilyFactory) {
    super(prisma);
  }

  create(overrides: Partial<Budget> = {}): Budget {
    const startDate = overrides.startDate || new Date();
    const endDate = overrides.endDate || new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    return {
      id: overrides.id || faker.string.uuid(),
      familyId: overrides.familyId || '', // Must be provided when building
      categoryId: overrides.categoryId || null,
      name: overrides.name || `${faker.commerce.department()} Budget`,
      amount: overrides.amount || new Prisma.Decimal(faker.finance.amount({ min: 100, max: 5000 })),
      period: overrides.period || ('MONTHLY' as BudgetPeriod),
      startDate,
      endDate,
      status: overrides.status || ('ACTIVE' as BudgetStatus),
      alertThresholds: overrides.alertThresholds || [50, 75, 90],
      notes: overrides.notes || null,
      settings: (overrides.settings || {
        rollover: false,
        includeSubcategories: true,
      }) as BudgetSettings,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    } as Budget;
  }

  async build(overrides: Partial<Budget> = {}): Promise<Budget> {
    // Create family if familyId not provided
    let familyId = overrides.familyId;
    if (!familyId) {
      const family = await this.familyFactory.build();
      familyId = family.id;
    }

    const data = this.create({ ...overrides, familyId });

    return await this.prisma.budget.create({
      data: {
        familyId: data.familyId,
        categoryId: data.categoryId,
        name: data.name,
        amount: data.amount,
        period: data.period,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        alertThresholds: data.alertThresholds,
        notes: data.notes,
        settings: toPrismaJson(data.settings),
      },
    });
  }
}

/**
 * Factory Builder - Main entry point
 */
export class PrismaTestDataFactory {
  public families: FamilyFactory;
  public users: UserFactory;
  public accounts: AccountFactory;
  public categories: CategoryFactory;
  public transactions: TransactionFactory;
  public budgets: BudgetFactory;

  constructor(private prisma: PrismaClient) {
    this.families = new FamilyFactory(prisma);
    this.users = new UserFactory(prisma, this.families);
    this.accounts = new AccountFactory(prisma, this.users);
    this.categories = new CategoryFactory(prisma, this.families);
    this.transactions = new TransactionFactory(prisma, this.accounts);
    this.budgets = new BudgetFactory(prisma, this.families);
  }

  /**
   * Create complete test scenario with related entities
   */
  async createTestScenario(): Promise<{
    family: Family;
    user: User;
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    budget: Budget;
  }> {
    // Create family
    const family = await this.families.build();

    // Create user
    const user = await this.users.build({ familyId: family.id });

    // Create accounts
    const checkingAccount = await this.accounts.build({
      userId: user.id,
      type: 'CHECKING' as AccountType,
      currentBalance: new Prisma.Decimal(5000),
    });

    const creditAccount = await this.accounts.build({
      userId: user.id,
      type: 'CREDIT_CARD' as AccountType,
      currentBalance: new Prisma.Decimal(-1500),
      creditLimit: new Prisma.Decimal(10000),
    });

    // Create categories
    const foodCategory = await this.categories.buildExpenseCategory({
      name: 'Food & Dining',
    });

    const salaryCategory = await this.categories.buildIncomeCategory({
      name: 'Salary',
    });

    // Create transactions
    const transactions = await this.transactions.buildMany(10, {
      accountId: checkingAccount.id,
      categoryId: foodCategory.id,
    });

    // Create budget
    const budget = await this.budgets.build({
      familyId: family.id,
      categoryId: foodCategory.id,
      amount: new Prisma.Decimal(1000),
    });

    return {
      family,
      user,
      accounts: [checkingAccount, creditAccount],
      categories: [foodCategory, salaryCategory],
      transactions,
      budget,
    };
  }

  /**
   * Create performance test dataset
   */
  async createPerformanceTestData(
    userCount: number = 100,
    transactionsPerUser: number = 1000
  ): Promise<void> {
    console.log(`🔄 Creating performance test data: ${userCount} users, ${transactionsPerUser} transactions each...`);

    const startTime = Date.now();

    // Create users in batches
    const batchSize = 50;
    for (let i = 0; i < userCount; i += batchSize) {
      const usersToCreate = Math.min(batchSize, userCount - i);
      const users = await this.users.buildMany(usersToCreate);

      // Create accounts for each user
      for (const user of users) {
        const account = await this.accounts.build({
          userId: user.id,
          type: 'CHECKING' as AccountType,
        });

        // Create transactions for this account
        await this.transactions.buildMany(transactionsPerUser, {
          accountId: account.id,
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Performance test data created in ${duration}ms`);
  }

  /**
   * Clean all test data
   */
  async cleanAll(): Promise<void> {
    await this.prisma.transaction.deleteMany({});
    await this.prisma.budget.deleteMany({});
    await this.prisma.account.deleteMany({});
    await this.prisma.category.deleteMany({});
    await this.prisma.user.deleteMany({});
    await this.prisma.family.deleteMany({});
  }
}
