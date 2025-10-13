import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from '../../generated/prisma';
import { Account, AccountType, AccountSource } from '../../generated/prisma';
import { Transaction, TransactionType } from '../../generated/prisma';
import { Category } from '../../generated/prisma';
import { AuditLog, AuditEventType } from '../../generated/prisma';
import { PasswordHistory } from '../../generated/prisma';

/**
 * TestDataBuilder - Utility for creating consistent test data
 *
 * Provides builder methods for all entity types with:
 * - Automatic unique ID generation
 * - Unique email addresses (critical for tests)
 * - Sensible defaults
 * - Easy customization via overrides
 * - Optional persistence to database
 *
 * Usage:
 *   const user = TestDataBuilder.user({ email: 'custom@example.com' });
 *   const persistedUser = await TestDataBuilder.persistUser(dataSource, { role: UserRole.ADMIN });
 */
export class TestDataBuilder {
  private static emailSequence = 0;
  private static resetSequence() {
    this.emailSequence = 0;
  }

  // Reset sequence between tests to ensure consistency
  static reset() {
    this.resetSequence();
  }

  /**
   * Create User entity (not persisted)
   */
  static user(overrides: Partial<User> = {}): User {
    const user = new User();
    user.id = overrides.id || faker.string.uuid();
    user.email = overrides.email || `test${++this.emailSequence}@example.com`;
    user.firstName = overrides.firstName || faker.person.firstName();
    user.lastName = overrides.lastName || faker.person.lastName();
    user.passwordHash = overrides.passwordHash || '$2a$10$mockHashedPassword';
    user.role = overrides.role || UserRole.USER;
    user.status = overrides.status || UserStatus.ACTIVE;
    user.currency = overrides.currency || 'USD';
    user.timezone = overrides.timezone || 'UTC';
    user.language = overrides.language || 'en';
    user.emailVerifiedAt = overrides.emailVerifiedAt || null;
    user.lastLoginAt = overrides.lastLoginAt || null;
    user.createdAt = overrides.createdAt || new Date();
    user.updatedAt = overrides.updatedAt || new Date();

    return Object.assign(user, overrides);
  }

  /**
   * Persist User to database
   */
  static async persistUser(dataSource: DataSource, overrides: Partial<User> = {}): Promise<User> {
    const user = this.user(overrides);
    return await dataSource.getRepository(User).save(user);
  }

  /**
   * Create multiple users
   */
  static users(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.user(overrides));
  }

  /**
   * Create Account entity (not persisted)
   */
  static account(overrides: Partial<Account> = {}): Account {
    const account = new Account();
    account.id = overrides.id || faker.string.uuid();
    account.userId = overrides.userId || faker.string.uuid();
    account.name = overrides.name || `${faker.finance.accountName()} ${faker.number.int({ min: 1000, max: 9999 })}`;
    account.type = overrides.type || AccountType.CHECKING;
    account.source = overrides.source || AccountSource.MANUAL;
    account.balance = overrides.balance || faker.number.float({ min: 0, max: 10000, fractionDigits: 2 });
    account.currency = overrides.currency || 'USD';
    account.isActive = overrides.isActive !== undefined ? overrides.isActive : true;
    account.createdAt = overrides.createdAt || new Date();
    account.updatedAt = overrides.updatedAt || new Date();

    return Object.assign(account, overrides);
  }

  /**
   * Persist Account to database
   */
  static async persistAccount(dataSource: DataSource, overrides: Partial<Account> = {}): Promise<Account> {
    const account = this.account(overrides);
    return await dataSource.getRepository(Account).save(account);
  }

  /**
   * Create Transaction entity (not persisted)
   */
  static transaction(overrides: Partial<Transaction> = {}): Transaction {
    const transaction = new Transaction();
    transaction.id = overrides.id || faker.string.uuid();
    transaction.accountId = overrides.accountId || faker.string.uuid();
    transaction.categoryId = overrides.categoryId || null;
    transaction.amount = overrides.amount || faker.number.float({ min: -1000, max: 1000, fractionDigits: 2 });
    transaction.type = overrides.type || (transaction.amount > 0 ? TransactionType.INCOME : TransactionType.EXPENSE);
    transaction.description = overrides.description || faker.finance.transactionDescription();
    transaction.source = overrides.source || AccountSource.MANUAL;
    transaction.date = overrides.date || faker.date.recent();
    transaction.pending = overrides.pending !== undefined ? overrides.pending : false;
    transaction.createdAt = overrides.createdAt || new Date();
    transaction.updatedAt = overrides.updatedAt || new Date();

    return Object.assign(transaction, overrides);
  }

  /**
   * Persist Transaction to database
   */
  static async persistTransaction(dataSource: DataSource, overrides: Partial<Transaction> = {}): Promise<Transaction> {
    const transaction = this.transaction(overrides);
    return await dataSource.getRepository(Transaction).save(transaction);
  }

  /**
   * Create multiple transactions
   */
  static transactions(count: number, overrides: Partial<Transaction> = {}): Transaction[] {
    return Array.from({ length: count }, () => this.transaction(overrides));
  }

  /**
   * Create Category entity (not persisted)
   */
  static category(overrides: Partial<Category> = {}): Category {
    const category = new Category();
    category.id = overrides.id || faker.string.uuid();
    category.userId = overrides.userId || null; // null = system category
    category.name = overrides.name || faker.commerce.department();
    category.icon = overrides.icon || faker.helpers.arrayElement(['💰', '🏠', '🚗', '🍔', '🎬', '💊']);
    category.color = overrides.color || faker.internet.color();
    category.type = overrides.type || TransactionType.EXPENSE;
    category.isActive = overrides.isActive !== undefined ? overrides.isActive : true;
    category.createdAt = overrides.createdAt || new Date();
    category.updatedAt = overrides.updatedAt || new Date();

    return Object.assign(category, overrides);
  }

  /**
   * Persist Category to database
   */
  static async persistCategory(dataSource: DataSource, overrides: Partial<Category> = {}): Promise<Category> {
    const category = this.category(overrides);
    return await dataSource.getRepository(Category).save(category);
  }

  /**
   * Create AuditLog entity (not persisted)
   */
  static auditLog(overrides: Partial<AuditLog> = {}): AuditLog {
    const auditLog = new AuditLog();
    auditLog.id = overrides.id || faker.string.uuid();
    auditLog.userId = overrides.userId || faker.string.uuid();
    auditLog.eventType = overrides.eventType || AuditEventType.LOGIN_SUCCESS;
    auditLog.ipAddress = overrides.ipAddress || faker.internet.ip();
    auditLog.userAgent = overrides.userAgent || faker.internet.userAgent();
    auditLog.metadata = overrides.metadata || {};
    auditLog.createdAt = overrides.createdAt || new Date();

    return Object.assign(auditLog, overrides);
  }

  /**
   * Persist AuditLog to database
   */
  static async persistAuditLog(dataSource: DataSource, overrides: Partial<AuditLog> = {}): Promise<AuditLog> {
    const auditLog = this.auditLog(overrides);
    return await dataSource.getRepository(AuditLog).save(auditLog);
  }

  /**
   * Create PasswordHistory entity (not persisted)
   */
  static passwordHistory(overrides: Partial<PasswordHistory> = {}): PasswordHistory {
    const passwordHistory = new PasswordHistory();
    passwordHistory.id = overrides.id || faker.string.uuid();
    passwordHistory.userId = overrides.userId || faker.string.uuid();
    passwordHistory.passwordHash = overrides.passwordHash || '$2a$10$mockHashedPassword';
    passwordHistory.ipAddress = overrides.ipAddress || faker.internet.ip();
    passwordHistory.userAgent = overrides.userAgent || faker.internet.userAgent();
    passwordHistory.createdAt = overrides.createdAt || new Date();

    return Object.assign(passwordHistory, overrides);
  }

  /**
   * Persist PasswordHistory to database
   */
  static async persistPasswordHistory(
    dataSource: DataSource,
    overrides: Partial<PasswordHistory> = {}
  ): Promise<PasswordHistory> {
    const passwordHistory = this.passwordHistory(overrides);
    return await dataSource.getRepository(PasswordHistory).save(passwordHistory);
  }

  /**
   * Create a complete user with related entities
   */
  static async createUserWithData(dataSource: DataSource, options: {
    userOverrides?: Partial<User>;
    accountsCount?: number;
    transactionsPerAccount?: number;
    categoriesCount?: number;
  } = {}): Promise<{
    user: User;
    accounts: Account[];
    transactions: Transaction[];
    categories: Category[];
  }> {
    const {
      userOverrides = {},
      accountsCount = 2,
      transactionsPerAccount = 5,
      categoriesCount = 3,
    } = options;

    // Create user
    const user = await this.persistUser(dataSource, userOverrides);

    // Create categories
    const categories = await Promise.all(
      Array.from({ length: categoriesCount }, () =>
        this.persistCategory(dataSource, { userId: user.id })
      )
    );

    // Create accounts
    const accounts = await Promise.all(
      Array.from({ length: accountsCount }, () =>
        this.persistAccount(dataSource, { userId: user.id })
      )
    );

    // Create transactions for each account
    const transactions: Transaction[] = [];
    for (const account of accounts) {
      const accountTransactions = await Promise.all(
        Array.from({ length: transactionsPerAccount }, () =>
          this.persistTransaction(dataSource, {
            accountId: account.id,
            categoryId: faker.helpers.arrayElement(categories).id,
          })
        )
      );
      transactions.push(...accountTransactions);
    }

    return { user, accounts, transactions, categories };
  }
}
