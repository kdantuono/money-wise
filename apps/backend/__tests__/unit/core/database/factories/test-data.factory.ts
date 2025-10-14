/**
 * Test Data Factory
 * Provides factory methods for creating test entities
 */

import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus, UserRole } from '../../../../../generated/prisma';
import { Account, AccountType, AccountSource } from '../../../../../generated/prisma';
import { Category, CategoryType, CategoryStatus } from '../../../../../generated/prisma';
import { Transaction, TransactionType, TransactionSource } from '../../../../../generated/prisma';

/**
 * Base factory interface
 */
interface FactoryBuilder<T> {
  create(overrides?: Partial<T>): T;
  build(overrides?: Partial<T>): Promise<T>;
  buildMany(count: number, overrides?: Partial<T>): Promise<T[]>;
}

/**
 * User Factory
 */
class UserFactoryBuilder implements FactoryBuilder<User> {
  constructor(private dataSource: DataSource) {}

  create(overrides: Partial<User> = {}): User {
    const user = new User();
    user.id = uuidv4();
    user.email = `test-${Date.now()}-${Math.random()}@example.com`;
    user.firstName = 'Test';
    user.lastName = 'User';
    user.passwordHash = '$2a$10$hashedpassword';
    user.role = UserRole.USER;
    user.status = UserStatus.ACTIVE;
    user.currency = 'USD';
    user.emailVerifiedAt = new Date(); // isEmailVerified is a getter
    user.createdAt = new Date();
    user.updatedAt = new Date();

    Object.assign(user, overrides);
    return user;
  }

  async build(overrides: Partial<User> = {}): Promise<User> {
    const user = this.create(overrides);
    return await this.dataSource.getRepository(User).save(user);
  }

  async buildMany(count: number, overrides: Partial<User> = {}): Promise<User[]> {
    const users = Array.from({ length: count }, () => this.create(overrides));
    return await this.dataSource.getRepository(User).save(users);
  }
}

/**
 * Account Factory
 */
class AccountFactoryBuilder implements FactoryBuilder<Account> {
  constructor(private dataSource: DataSource) {}

  create(overrides: Partial<Account> = {}): Account {
    const account = new Account();
    account.id = uuidv4();
    account.name = `Test Account ${Date.now()}`;
    account.type = AccountType.CHECKING;
    account.source = AccountSource.MANUAL;
    account.currentBalance = 1000;
    account.currency = 'USD';
    account.isActive = true;
    account.createdAt = new Date();
    account.updatedAt = new Date();

    Object.assign(account, overrides);
    return account;
  }

  async build(overrides: Partial<Account> = {}): Promise<Account> {
    const account = this.create(overrides);
    return await this.dataSource.getRepository(Account).save(account);
  }

  async buildMany(count: number, overrides: Partial<Account> = {}): Promise<Account[]> {
    const accounts = Array.from({ length: count }, () => this.create(overrides));
    return await this.dataSource.getRepository(Account).save(accounts);
  }
}

/**
 * Category Factory
 *
 * Note: Category uses TypeORM nested-set tree which requires a single root.
 * This factory manages the root category automatically.
 */
class CategoryFactoryBuilder implements FactoryBuilder<Category> {
  private rootCategory: Category | null = null;

  constructor(private dataSource: DataSource) {}

  create(overrides: Partial<Category> = {}): Category {
    const category = new Category();
    category.id = uuidv4();
    category.name = `Test Category ${Date.now()}`;
    category.slug = `test-category-${Date.now()}-${Math.random()}`;
    category.type = CategoryType.EXPENSE;
    category.status = CategoryStatus.ACTIVE; // isActive is a getter based on status
    category.icon = '📦';
    category.color = '#3B82F6';
    category.isSystem = false;
    category.createdAt = new Date();
    category.updatedAt = new Date();

    Object.assign(category, overrides);
    return category;
  }

  /**
   * Get or create the root category for nested-set tree
   * TypeORM nested-set requires a single root category
   */
  async ensureRootCategory(): Promise<Category> {
    if (this.rootCategory) {
      return this.rootCategory;
    }

    const treeRepo = this.dataSource.getTreeRepository(Category);

    // Check if root already exists in database
    const existingRoot = await this.dataSource
      .getRepository(Category)
      .findOne({ where: { slug: 'test-root' } });

    if (existingRoot) {
      this.rootCategory = existingRoot;
      return existingRoot;
    }

    // Create new root category
    const root = new Category();
    root.id = uuidv4();
    root.name = 'Test Root';
    root.slug = 'test-root';
    root.type = CategoryType.EXPENSE;
    root.status = CategoryStatus.ACTIVE;
    root.icon = '🌳';
    root.color = '#000000';
    root.isSystem = true;
    root.createdAt = new Date();
    root.updatedAt = new Date();

    this.rootCategory = await treeRepo.save(root);
    return this.rootCategory;
  }

  async build(overrides: Partial<Category> = {}): Promise<Category> {
    const category = this.create(overrides);
    const treeRepo = this.dataSource.getTreeRepository(Category);

    // If parent entity is explicitly provided, use tree repository
    if (overrides.parent) {
      category.parent = overrides.parent;
      return await treeRepo.save(category);
    }

    // For standalone categories (no parent), just save normally
    // Nested-set tree will handle them as orphaned nodes
    return await this.dataSource.getRepository(Category).save(category);
  }

  async buildMany(count: number, overrides: Partial<Category> = {}): Promise<Category[]> {
    const categories = Array.from({ length: count }, () => this.create(overrides));

    // If parent is specified, use tree repository
    if (overrides.parent) {
      const treeRepo = this.dataSource.getTreeRepository(Category);
      categories.forEach(cat => {
        cat.parent = overrides.parent!;
      });
      return await treeRepo.save(categories);
    }

    // Otherwise, save as standalone categories
    return await this.dataSource.getRepository(Category).save(categories);
  }

  /**
   * Reset the cached root category (useful for test cleanup)
   */
  resetRoot(): void {
    this.rootCategory = null;
  }
}

/**
 * Transaction Factory
 */
class TransactionFactoryBuilder implements FactoryBuilder<Transaction> {
  constructor(private dataSource: DataSource) {}

  create(overrides: Partial<Transaction> = {}): Transaction {
    const transaction = new Transaction();
    transaction.id = uuidv4();
    transaction.type = TransactionType.DEBIT;
    transaction.source = TransactionSource.MANUAL;
    transaction.amount = 100.00;
    transaction.description = 'Test Transaction';
    transaction.date = new Date();
    transaction.isPending = false;
    // needsCategorization is a computed getter - don't set it
    transaction.createdAt = new Date();
    transaction.updatedAt = new Date();

    Object.assign(transaction, overrides);
    return transaction;
  }

  async build(overrides: Partial<Transaction> = {}): Promise<Transaction> {
    const transaction = this.create(overrides);
    return await this.dataSource.getRepository(Transaction).save(transaction);
  }

  async buildMany(count: number, overrides: Partial<Transaction> = {}): Promise<Transaction[]> {
    const transactions = Array.from({ length: count }, () => this.create(overrides));
    return await this.dataSource.getRepository(Transaction).save(transactions);
  }
}

/**
 * Main Test Data Factory
 */
export class TestDataFactory {
  public users: UserFactoryBuilder;
  public accounts: AccountFactoryBuilder;
  public categories: CategoryFactoryBuilder;
  public transactions: TransactionFactoryBuilder;

  constructor(private dataSource: DataSource) {
    this.users = new UserFactoryBuilder(dataSource);
    this.accounts = new AccountFactoryBuilder(dataSource);
    this.categories = new CategoryFactoryBuilder(dataSource);
    this.transactions = new TransactionFactoryBuilder(dataSource);
  }

  /**
   * Create a complete test scenario with related entities
   */
  async createScenario() {
    const user = await this.users.build();
    const account = await this.accounts.build({ userId: user.id });
    const category = await this.categories.build();
    const transaction = await this.transactions.build({
      accountId: account.id,
      categoryId: category.id,
    });

    return {
      user,
      account,
      category,
      transaction,
    };
  }
}
