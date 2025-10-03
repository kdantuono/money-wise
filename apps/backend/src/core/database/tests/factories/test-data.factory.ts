/* eslint-disable no-console */
/**
 * Test Data Factory
 * Provides consistent test data generation for all entities
 * Console statements are intentionally used for test data generation debugging
 */

import { faker } from '@faker-js/faker';
import { DataSource, Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Account, AccountType, AccountStatus, AccountSource } from '../../entities/account.entity';
import { Category, CategoryType, CategoryStatus } from '../../entities/category.entity';
import { Transaction, TransactionType, TransactionStatus, TransactionSource } from '../../entities/transaction.entity';

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
 * Abstract base factory implementation
 */
export abstract class BaseFactory<T> implements Factory<T> {
  constructor(
    protected dataSource: DataSource,
    protected repository: Repository<T>
  ) {}

  abstract create(overrides?: Partial<T>): T;

  async build(overrides?: Partial<T>): Promise<T> {
    const entity = this.create(overrides);
    return await this.repository.save(entity);
  }

  createMany(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  async buildMany(count: number, overrides?: Partial<T>): Promise<T[]> {
    const results: T[] = [];
    // Build sequentially to ensure unique constraints and relationships (e.g., NestedSet)
    for (let i = 0; i < count; i++) {
      const entity = await this.build(overrides);
      results.push(entity);
    }
    return results;
  }
}

/**
 * User Factory
 */
export class UserFactory extends BaseFactory<User> {
  private static emailCounter = 0;

  constructor(dataSource: DataSource) {
    super(dataSource, dataSource.getRepository(User));
  }

  create(overrides: Partial<User> = {}): User {
    const user = new User();

    // Ensure unique email with timestamp + counter for test isolation
    const timestamp = Date.now();
    UserFactory.emailCounter++;
    user.email = overrides.email || `test-${timestamp}-${UserFactory.emailCounter}@moneywise-test.com`;
    user.firstName = overrides.firstName || faker.person.firstName();
    user.lastName = overrides.lastName || faker.person.lastName();
    user.passwordHash = overrides.passwordHash || '$2a$10$hashedpassword';
    user.role = overrides.role || UserRole.USER;
    user.status = overrides.status || UserStatus.ACTIVE;
    user.avatar = overrides.avatar || faker.image.avatarGitHub();
    user.timezone = overrides.timezone || faker.location.timeZone();
    user.currency = overrides.currency || 'USD';
    user.preferences = overrides.preferences || {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        categories: true,
        budgets: true,
      },
    };
    user.lastLoginAt = overrides.lastLoginAt || faker.date.recent();
    user.emailVerifiedAt = overrides.emailVerifiedAt || faker.date.past();

    return user;
  }

  /**
   * Create admin user
   */
  createAdmin(overrides: Partial<User> = {}): User {
    return this.create({
      role: UserRole.ADMIN,
      email: 'admin@moneywise.com',
      firstName: 'Admin',
      lastName: 'User',
      ...overrides,
    });
  }

  /**
   * Create unverified user
   */
  createUnverified(overrides: Partial<User> = {}): User {
    return this.create({
      emailVerifiedAt: null,
      status: UserStatus.INACTIVE,
      ...overrides,
    });
  }
}

/**
 * Account Factory
 */
export class AccountFactory extends BaseFactory<Account> {
  constructor(dataSource: DataSource) {
    super(dataSource, dataSource.getRepository(Account));
  }

  create(overrides: Partial<Account> = {}): Account {
    const account = new Account();

    account.userId = overrides.userId || faker.string.uuid();
    account.name = overrides.name || `${faker.person.firstName()}'s ${faker.helpers.arrayElement(['Checking', 'Savings', 'Investment', 'Credit'])} Account`;
    account.type = overrides.type || faker.helpers.arrayElement(Object.values(AccountType));
    account.status = overrides.status || AccountStatus.ACTIVE;
    account.source = overrides.source || AccountSource.MANUAL;
    // Use ?? to properly handle 0 and negative balances
    account.currentBalance = overrides.currentBalance ?? parseFloat(faker.finance.amount());
    account.availableBalance = overrides.availableBalance ?? account.currentBalance;
    account.creditLimit = overrides.creditLimit ?? (account.type === AccountType.CREDIT_CARD ? parseFloat(faker.finance.amount({ min: 1000, max: 50000 })) : null);
    account.currency = overrides.currency || 'USD';
    account.institutionName = overrides.institutionName || faker.company.name();
    account.accountNumber = overrides.accountNumber || faker.finance.accountNumber();
    account.routingNumber = overrides.routingNumber || faker.number.int({ min: 100000000, max: 999999999 }).toString();
    account.isActive = overrides.isActive ?? true;
    account.syncEnabled = overrides.syncEnabled ?? true;
    account.lastSyncAt = overrides.lastSyncAt || faker.date.recent();
    account.settings = overrides.settings || {
      autoSync: true,
      syncFrequency: 'daily',
      notifications: true,
      budgetIncluded: true,
    };

    // Plaid-specific fields
    if (overrides.plaidAccountId) account.plaidAccountId = overrides.plaidAccountId;
    if (overrides.plaidItemId) account.plaidItemId = overrides.plaidItemId;
    if (overrides.plaidAccessToken) account.plaidAccessToken = overrides.plaidAccessToken;
    if (overrides.plaidMetadata) account.plaidMetadata = overrides.plaidMetadata;

    return account;
  }

  /**
   * Create Plaid account
   */
  createPlaidAccount(overrides: Partial<Account> = {}): Account {
    return this.create({
      source: AccountSource.PLAID,
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
  createCreditCard(overrides: Partial<Account> = {}): Account {
    return this.create({
      type: AccountType.CREDIT_CARD,
      currentBalance: parseFloat(faker.finance.amount({ min: -5000, max: 0 })),
      creditLimit: parseFloat(faker.finance.amount({ min: 1000, max: 50000 })),
      ...overrides,
    });
  }
}

/**
 * Category Factory
 */
export class CategoryFactory extends BaseFactory<Category> {
  private rootCategoryPromise: Promise<Category> | null = null;

  constructor(dataSource: DataSource) {
    // CRITICAL: Use TreeRepository for NestedSet entities
    super(dataSource, dataSource.getTreeRepository(Category));
  }

  /**
   * Reset root category (call after database cleanup)
   */
  resetRoot(): void {
    this.rootCategoryPromise = null;
  }

  /**
   * Ensure root category exists (TypeORM NestedSet requires single root)
   * ALWAYS re-queries to ensure we have the current database state
   */
  private async ensureRootCategory(): Promise<Category> {
    // ALWAYS check database for existing root (don't rely on cache across database cleanups)
    const existing = await this.repository
      .createQueryBuilder('category')
      .where('category.parentId IS NULL')
      .getOne();

    if (existing) {
      return existing;
    }

    // No root exists - create one (only if promise not in flight)
    if (!this.rootCategoryPromise) {
      this.rootCategoryPromise = (async () => {
        // Double-check after acquiring lock
        const doubleCheck = await this.repository
          .createQueryBuilder('category')
          .where('category.parentId IS NULL')
          .getOne();

        if (doubleCheck) {
          return doubleCheck;
        }

        // Create root with parent explicitly set to null (required for NestedSet root)
        const root = new Category();
        root.name = 'Root';
        root.slug = 'root';
        root.description = 'Root category for nested set';
        root.type = CategoryType.EXPENSE;
        root.status = CategoryStatus.ACTIVE;
        root.color = '#000000';
        root.icon = 'folder';
        root.isDefault = false;
        root.isSystem = true;
        root.sortOrder = 0;
        root.parent = null; // TypeORM NestedSet requires parent relation set to null
        root.parentId = null; // Explicitly set parentId to null for root
        root.rules = {};
        root.metadata = {};

        const saved = await this.repository.save(root);

        // CRITICAL: Re-query to get the full entity with all NestedSet fields populated
        const refreshed = await this.repository.findOne({ where: { id: saved.id } });

        // Clear promise after save so next call will re-query
        this.rootCategoryPromise = null;

        if (!refreshed) {
          throw new Error('Failed to refresh root category after creation');
        }

        return refreshed;
      })();
    }

    return this.rootCategoryPromise;
  }

  create(overrides: Partial<Category> = {}): Category {
    const category = new Category();

    const name = overrides.name || faker.commerce.department();
    category.name = name;
    // Add unique timestamp + random suffix to slug for guaranteed uniqueness
    const timestamp = Date.now();
    category.slug = overrides.slug || `${name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${faker.string.alphanumeric(4)}`;
    category.description = overrides.description || faker.lorem.sentence();
    category.type = overrides.type || faker.helpers.arrayElement(Object.values(CategoryType));
    category.status = overrides.status || CategoryStatus.ACTIVE;
    category.color = overrides.color || faker.color.rgb({ format: 'hex', casing: 'lower' });
    category.icon = overrides.icon || faker.helpers.arrayElement(['shopping-bag', 'car', 'home', 'food', 'entertainment']);
    category.isDefault = overrides.isDefault ?? false;
    category.isSystem = overrides.isSystem ?? false;
    category.sortOrder = overrides.sortOrder || faker.number.int({ min: 0, max: 100 });
    // NOTE: parentId/parent will be set in build() method to ensure NestedSet compliance
    category.rules = overrides.rules || {
      keywords: [faker.commerce.productName()],
      merchantPatterns: [faker.company.name()],
      autoAssign: true,
      confidence: faker.number.float({ min: 0.5, max: 1.0 }),
    };
    category.metadata = overrides.metadata || {
      budgetEnabled: true,
      monthlyLimit: parseFloat(faker.finance.amount({ min: 100, max: 2000 })),
      taxDeductible: faker.datatype.boolean(),
      businessExpense: faker.datatype.boolean(),
    };

    // Apply overrides last (except parent/parentId which are handled in build())
    Object.keys(overrides).forEach(key => {
      if (key !== 'parent' && key !== 'parentId') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (category as any)[key] = overrides[key as keyof Category];
      }
    });

    return category;
  }

  /**
   * Build and save category (ensures root exists for NestedSet)
   * TypeORM NestedSet REQUIRES that all non-root categories have a parent
   */
  async build(overrides?: Partial<Category>): Promise<Category> {
    // Ensure root exists first
    const root = await this.ensureRootCategory();

    // Create entity
    const entity = this.create(overrides);

    // CRITICAL: TypeORM NestedSet requires setting the parent RELATION, not just parentId
    // NEVER allow parent: null (would create multiple roots)
    if (overrides?.parent) {
      // If parent object provided, use it directly
      entity.parent = overrides.parent;
    } else if (overrides?.parentId && overrides.parentId !== null) {
      // If explicit parentId provided, load the parent entity
      const parentEntity = await this.repository.findOne({ where: { id: overrides.parentId } });
      if (!parentEntity) {
        throw new Error(`Parent category with ID ${overrides.parentId} not found`);
      }
      entity.parent = parentEntity;
    } else {
      // No parent specified OR parentId explicitly null - use root as default parent
      entity.parent = root;
    }

    return await this.repository.save(entity);
  }

  /**
   * Build and save expense category
   */
  async buildExpenseCategory(overrides: Partial<Category> = {}): Promise<Category> {
    return this.build({
      type: CategoryType.EXPENSE,
      name: 'Food & Dining',
      slug: 'food-dining',
      color: '#ef4444',
      icon: 'utensils',
      ...overrides,
    });
  }

  /**
   * Build and save income category
   */
  async buildIncomeCategory(overrides: Partial<Category> = {}): Promise<Category> {
    return this.build({
      type: CategoryType.INCOME,
      name: 'Salary',
      slug: 'salary',
      color: '#22c55e',
      icon: 'briefcase',
      ...overrides,
    });
  }

  /**
   * @deprecated Use buildExpenseCategory() instead
   */
  createExpenseCategory(overrides: Partial<Category> = {}): Category {
    return this.create({
      type: CategoryType.EXPENSE,
      name: 'Food & Dining',
      slug: 'food-dining',
      color: '#ef4444',
      icon: 'utensils',
      ...overrides,
    });
  }

  /**
   * @deprecated Use buildIncomeCategory() instead
   */
  createIncomeCategory(overrides: Partial<Category> = {}): Category {
    return this.create({
      type: CategoryType.INCOME,
      name: 'Salary',
      slug: 'salary',
      color: '#22c55e',
      icon: 'briefcase',
      ...overrides,
    });
  }

  /**
   * Create system category
   */
  createSystemCategory(overrides: Partial<Category> = {}): Category {
    return this.create({
      isSystem: true,
      isDefault: true,
      ...overrides,
    });
  }
}

/**
 * Transaction Factory
 */
export class TransactionFactory extends BaseFactory<Transaction> {
  constructor(dataSource: DataSource) {
    super(dataSource, dataSource.getRepository(Transaction));
  }

  create(overrides: Partial<Transaction> = {}): Transaction {
    const transaction = new Transaction();

    transaction.accountId = overrides.accountId || faker.string.uuid();
    transaction.categoryId = overrides.categoryId || null;
    transaction.amount = overrides.amount || parseFloat(faker.finance.amount());
    transaction.type = overrides.type || faker.helpers.arrayElement(Object.values(TransactionType));
    transaction.status = overrides.status || TransactionStatus.POSTED;
    transaction.source = overrides.source || TransactionSource.MANUAL;
    transaction.date = overrides.date || faker.date.recent();
    transaction.authorizedDate = overrides.authorizedDate || transaction.date;
    transaction.description = overrides.description || faker.commerce.productDescription();
    transaction.merchantName = overrides.merchantName || faker.company.name();
    transaction.originalDescription = overrides.originalDescription || transaction.description;
    transaction.currency = overrides.currency || 'USD';
    transaction.reference = overrides.reference || faker.finance.transactionDescription();
    transaction.isPending = overrides.isPending ?? false;
    transaction.isRecurring = overrides.isRecurring ?? false;
    transaction.isHidden = overrides.isHidden ?? false;
    transaction.includeInBudget = overrides.includeInBudget ?? true;
    transaction.notes = overrides.notes || faker.lorem.sentence();
    transaction.tags = overrides.tags || [faker.lorem.word(), faker.lorem.word()];

    // Optional fields that need explicit override handling
    if (overrides.location) transaction.location = overrides.location;
    if (overrides.plaidTransactionId) transaction.plaidTransactionId = overrides.plaidTransactionId;
    if (overrides.plaidAccountId) transaction.plaidAccountId = overrides.plaidAccountId;
    if (overrides.plaidMetadata) transaction.plaidMetadata = overrides.plaidMetadata;

    return transaction;
  }

  /**
   * Create expense transaction
   */
  createExpense(overrides: Partial<Transaction> = {}): Transaction {
    return this.create({
      type: TransactionType.DEBIT,
      amount: parseFloat(faker.finance.amount({ min: 10, max: 500 })),
      description: `Purchase at ${faker.company.name()}`,
      ...overrides,
    });
  }

  /**
   * Create income transaction
   */
  createIncome(overrides: Partial<Transaction> = {}): Transaction {
    return this.create({
      type: TransactionType.CREDIT,
      amount: parseFloat(faker.finance.amount({ min: 500, max: 5000 })),
      description: 'Salary payment',
      merchantName: 'Employer',
      ...overrides,
    });
  }

  /**
   * Create Plaid transaction
   */
  createPlaidTransaction(overrides: Partial<Transaction> = {}): Transaction {
    return this.create({
      source: TransactionSource.PLAID,
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

  /**
   * Create time series data for performance testing
   */
  createTimeSeries(accountId: string, days: number = 365): Transaction[] {
    const transactions: Transaction[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (let i = 0; i < days * 3; i++) { // ~3 transactions per day
      const date = new Date(startDate);
      date.setDate(date.getDate() + Math.floor(i / 3));

      transactions.push(this.create({
        accountId,
        date,
        amount: parseFloat(faker.finance.amount({ min: 1, max: 1000 })),
        type: faker.datatype.boolean() ? TransactionType.DEBIT : TransactionType.CREDIT,
      }));
    }

    return transactions;
  }
}

/**
 * Factory Builder - Main entry point
 */
export class TestDataFactory {
  private dataSource: DataSource;

  public users: UserFactory;
  public accounts: AccountFactory;
  public categories: CategoryFactory;
  public transactions: TransactionFactory;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.users = new UserFactory(dataSource);
    this.accounts = new AccountFactory(dataSource);
    this.categories = new CategoryFactory(dataSource);
    this.transactions = new TransactionFactory(dataSource);
  }

  /**
   * Create complete test scenario with related entities
   */
  async createTestScenario(): Promise<{
    user: User;
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
  }> {
    // Create user
    const user = await this.users.build();

    // Create accounts
    const checkingAccount = await this.accounts.build({
      userId: user.id,
      type: AccountType.CHECKING,
      currentBalance: 5000,
    });

    const creditAccount = await this.accounts.build({
      userId: user.id,
      type: AccountType.CREDIT_CARD,
      currentBalance: -1500,
      creditLimit: 10000,
    });

    // Create categories
    const foodCategory = await this.categories.buildExpenseCategory({
      name: 'Food & Dining',
      slug: 'food-dining',
    });

    const salaryCategory = await this.categories.buildIncomeCategory({
      name: 'Salary',
      slug: 'salary',
    });

    // Create transactions
    const transactions = await this.transactions.buildMany(10, {
      accountId: checkingAccount.id,
      categoryId: foodCategory.id,
    });

    return {
      user,
      accounts: [checkingAccount, creditAccount],
      categories: [foodCategory, salaryCategory],
      transactions,
    };
  }

  /**
   * Seed default categories
   */
  async seedDefaultCategories(): Promise<Category[]> {
    const defaultCategories = Category.getDefaultCategories();
    const categories = defaultCategories.map(data => this.categories.create(data));
    return await this.dataSource.getRepository(Category).save(categories);
  }

  /**
   * Create performance test dataset
   */
  async createPerformanceTestData(userCount: number = 100, transactionsPerUser: number = 1000): Promise<void> {
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
          type: AccountType.CHECKING,
        });

        // Create transactions for this account
        const transactions = this.transactions.createTimeSeries(account.id, Math.floor(transactionsPerUser / 365));
        await this.dataSource.getRepository(Transaction).save(transactions);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Performance test data created in ${duration}ms`);
  }
}