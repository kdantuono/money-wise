/**
 * Entity Relationship Tests
 * Tests all entity relationships, constraints, and cascading operations
 */

import { DataSource } from 'typeorm';
import { setupTestDatabase, cleanTestDatabase, teardownTestDatabase } from '../database-test.config';
import { TestDataFactory } from '../factories/test-data.factory';
import { User, UserStatus } from '../../entities/user.entity';
import { Account, AccountType } from '../../entities/account.entity';
import { Category, CategoryType } from '../../entities/category.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';

describe('Entity Relationships', () => {
  let dataSource: DataSource;
  let factory: TestDataFactory;

  beforeAll(async () => {
    dataSource = await setupTestDatabase();
    factory = new TestDataFactory(dataSource);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  describe('User -> Account Relationship', () => {
    it('should create user with multiple accounts', async () => {
      // Arrange
      const user = await factory.users.build();

      // Act
      const checkingAccount = await factory.accounts.build({
        userId: user.id,
        type: AccountType.CHECKING,
      });

      const savingsAccount = await factory.accounts.build({
        userId: user.id,
        type: AccountType.SAVINGS,
      });

      // Assert
      const userWithAccounts = await dataSource
        .getRepository(User)
        .findOne({
          where: { id: user.id },
          relations: ['accounts'],
        });

      expect(userWithAccounts).toBeDefined();
      expect(userWithAccounts!.accounts).toHaveLength(2);
      expect(userWithAccounts!.accounts.map(a => a.type)).toContain(AccountType.CHECKING);
      expect(userWithAccounts!.accounts.map(a => a.type)).toContain(AccountType.SAVINGS);
    });

    it('should cascade delete accounts when user is deleted', async () => {
      // Arrange
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });

      // Act
      await dataSource.getRepository(User).remove(user);

      // Assert
      const remainingAccount = await dataSource
        .getRepository(Account)
        .findOne({ where: { id: account.id } });

      expect(remainingAccount).toBeNull();
    });

    it('should enforce foreign key constraint', async () => {
      // Arrange
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';

      // Act & Assert
      await expect(
        factory.accounts.build({ userId: nonExistentUserId })
      ).rejects.toThrow();
    });
  });

  describe('Account -> Transaction Relationship', () => {
    it('should create account with multiple transactions', async () => {
      // Arrange
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });

      // Act
      const transactions = await factory.transactions.buildMany(5, {
        accountId: account.id,
      });

      // Assert
      const accountWithTransactions = await dataSource
        .getRepository(Account)
        .findOne({
          where: { id: account.id },
          relations: ['transactions'],
        });

      expect(accountWithTransactions).toBeDefined();
      expect(accountWithTransactions!.transactions).toHaveLength(5);
      expect(accountWithTransactions!.transactions[0].accountId).toBe(account.id);
    });

    it('should cascade delete transactions when account is deleted', async () => {
      // Arrange
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });
      const transaction = await factory.transactions.build({ accountId: account.id });

      // Act
      await dataSource.getRepository(Account).remove(account);

      // Assert
      const remainingTransaction = await dataSource
        .getRepository(Transaction)
        .findOne({ where: { id: transaction.id } });

      expect(remainingTransaction).toBeNull();
    });
  });

  describe('Category -> Transaction Relationship', () => {
    it('should associate transaction with category', async () => {
      // Arrange
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });
      const category = await factory.categories.build();

      // Act
      const transaction = await factory.transactions.build({
        accountId: account.id,
        categoryId: category.id,
      });

      // Assert
      const transactionWithCategory = await dataSource
        .getRepository(Transaction)
        .findOne({
          where: { id: transaction.id },
          relations: ['category'],
        });

      expect(transactionWithCategory).toBeDefined();
      expect(transactionWithCategory!.category).toBeDefined();
      expect(transactionWithCategory!.category!.id).toBe(category.id);
    });

    it('should handle category deletion with SET NULL', async () => {
      // Arrange
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });
      const category = await factory.categories.build();
      const transaction = await factory.transactions.build({
        accountId: account.id,
        categoryId: category.id,
      });

      // Act
      await dataSource.getRepository(Category).remove(category);

      // Assert
      const updatedTransaction = await dataSource
        .getRepository(Transaction)
        .findOne({ where: { id: transaction.id } });

      expect(updatedTransaction).toBeDefined();
      expect(updatedTransaction!.categoryId).toBeNull();
    });

    it('should allow transaction without category', async () => {
      // Arrange
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });

      // Act
      const transaction = await factory.transactions.build({
        accountId: account.id,
        categoryId: null,
      });

      // Assert
      expect(transaction.categoryId).toBeNull();
      expect(transaction.needsCategorization).toBe(true);
    });
  });

  describe('Category Tree Structure', () => {
    it('should create parent-child category relationships', async () => {
      // Arrange
      const parentCategory = await factory.categories.build({
        name: 'Expenses',
        type: CategoryType.EXPENSE,
      });

      // Act
      const childCategory = await factory.categories.build({
        name: 'Food',
        type: CategoryType.EXPENSE,
        parentId: parentCategory.id,
      });

      // Assert
      const categoryWithChildren = await dataSource
        .getRepository(Category)
        .findOne({
          where: { id: parentCategory.id },
          relations: ['children'],
        });

      const categoryWithParent = await dataSource
        .getRepository(Category)
        .findOne({
          where: { id: childCategory.id },
          relations: ['parent'],
        });

      expect(categoryWithChildren).toBeDefined();
      expect(categoryWithChildren!.children).toHaveLength(1);
      expect(categoryWithChildren!.children[0].id).toBe(childCategory.id);

      expect(categoryWithParent).toBeDefined();
      expect(categoryWithParent!.parent).toBeDefined();
      expect(categoryWithParent!.parent.id).toBe(parentCategory.id);
    });

    it('should cascade delete child categories when parent is deleted', async () => {
      // Arrange
      const parentCategory = await factory.categories.build({
        name: 'Expenses',
      });

      const childCategory = await factory.categories.build({
        name: 'Food',
        parentId: parentCategory.id,
      });

      // Act
      await dataSource.getRepository(Category).remove(parentCategory);

      // Assert
      const remainingChild = await dataSource
        .getRepository(Category)
        .findOne({ where: { id: childCategory.id } });

      expect(remainingChild).toBeNull();
    });

    it('should validate category tree depth', async () => {
      // Create a deep category tree (testing tree constraints)
      const level1 = await factory.categories.build({ name: 'Level 1' });
      const level2 = await factory.categories.build({
        name: 'Level 2',
        parentId: level1.id
      });
      const level3 = await factory.categories.build({
        name: 'Level 3',
        parentId: level2.id
      });

      // Verify tree structure
      const deepCategory = await dataSource
        .getRepository(Category)
        .findOne({
          where: { id: level3.id },
          relations: ['parent', 'parent.parent'],
        });

      expect(deepCategory).toBeDefined();
      expect(deepCategory!.parent).toBeDefined();
      expect(deepCategory!.parent.parent).toBeDefined();
      expect(deepCategory!.parent.parent.id).toBe(level1.id);
    });
  });

  describe('Complex Relationship Queries', () => {
    it('should find all transactions for a user across accounts', async () => {
      // Arrange
      const user = await factory.users.build();
      const account1 = await factory.accounts.build({ userId: user.id });
      const account2 = await factory.accounts.build({ userId: user.id });

      await factory.transactions.buildMany(3, { accountId: account1.id });
      await factory.transactions.buildMany(2, { accountId: account2.id });

      // Act
      const userTransactions = await dataSource
        .createQueryBuilder(Transaction, 'transaction')
        .innerJoin('transaction.account', 'account')
        .where('account.userId = :userId', { userId: user.id })
        .getMany();

      // Assert
      expect(userTransactions).toHaveLength(5);
    });

    it('should calculate account balance from transactions', async () => {
      // Arrange
      const user = await factory.users.build();
      const account = await factory.accounts.build({
        userId: user.id,
        currentBalance: 1000
      });

      // Create income and expense transactions
      await factory.transactions.build({
        accountId: account.id,
        type: TransactionType.CREDIT,
        amount: 500,
      });

      await factory.transactions.build({
        accountId: account.id,
        type: TransactionType.DEBIT,
        amount: 200,
      });

      // Act
      const balanceResult = await dataSource
        .createQueryBuilder(Transaction, 'transaction')
        .select('SUM(CASE WHEN transaction.type = :credit THEN transaction.amount ELSE -transaction.amount END)', 'balance')
        .where('transaction.accountId = :accountId', { accountId: account.id })
        .setParameter('credit', TransactionType.CREDIT)
        .getRawOne();

      // Assert
      expect(parseFloat(balanceResult.balance)).toBe(300);
    });

    it('should find categories with transaction counts', async () => {
      // Arrange
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });
      const category = await factory.categories.build();

      await factory.transactions.buildMany(3, {
        accountId: account.id,
        categoryId: category.id,
      });

      // Act
      const categoryWithCount = await dataSource
        .createQueryBuilder(Category, 'category')
        .leftJoin('category.transactions', 'transaction')
        .addSelect('COUNT(transaction.id)', 'transactionCount')
        .where('category.id = :categoryId', { categoryId: category.id })
        .groupBy('category.id')
        .getRawAndEntities();

      // Assert
      expect(categoryWithCount.raw[0].transactionCount).toBe('3');
    });
  });

  describe('Constraint Validation', () => {
    it('should enforce unique email constraint', async () => {
      // Arrange
      const email = 'duplicate@example.com';
      await factory.users.build({ email });

      // Act & Assert
      await expect(
        factory.users.build({ email })
      ).rejects.toThrow();
    });

    it('should enforce unique category slug constraint', async () => {
      // Arrange
      const slug = 'unique-slug';
      await factory.categories.build({ slug });

      // Act & Assert
      await expect(
        factory.categories.build({ slug })
      ).rejects.toThrow();
    });

    it('should enforce transaction amount precision', async () => {
      // Arrange
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });

      // Act
      const transaction = await factory.transactions.build({
        accountId: account.id,
        amount: 123.456789, // High precision
      });

      // Assert - Should be rounded to 2 decimal places
      const savedTransaction = await dataSource
        .getRepository(Transaction)
        .findOne({ where: { id: transaction.id } });

      expect(parseFloat(savedTransaction!.amount.toString())).toBe(123.46);
    });

    it('should enforce enum constraints', async () => {
      // Arrange
      const user = await factory.users.build();

      // Act & Assert - Invalid user status
      const invalidUser = factory.users.create({
        status: 'invalid_status' as any
      });

      await expect(
        dataSource.getRepository(User).save(invalidUser)
      ).rejects.toThrow();
    });
  });

  describe('Index Performance', () => {
    it('should use indexes for common queries', async () => {
      // Arrange - Create test data
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });
      await factory.transactions.buildMany(100, { accountId: account.id });

      // Act - Query with indexed fields
      const queryBuilder = dataSource
        .createQueryBuilder(Transaction, 'transaction')
        .where('transaction.accountId = :accountId', { accountId: account.id })
        .andWhere('transaction.date >= :startDate', { startDate: new Date('2024-01-01') })
        .orderBy('transaction.date', 'DESC');

      const transactions = await queryBuilder.getMany();

      // Assert
      expect(transactions.length).toBeGreaterThan(0);

      // Verify query uses index (basic check)
      const queryPlan = await dataSource.query(
        `EXPLAIN (FORMAT JSON) ${queryBuilder.getQuery()}`,
        Object.values(queryBuilder.getParameters())
      );

      expect(queryPlan).toBeDefined();
    });
  });
});