/**
 * Repository Operations Tests
 * Tests CRUD operations, query builders, and repository patterns
 */

import { DataSource, Repository } from 'typeorm';
import { setupTestDatabase, cleanTestDatabase, teardownTestDatabase } from '../../../src/core/database/tests/database-test.config';
import { TestDataFactory } from '../../../src/core/database/tests/factories/test-data.factory';
import { User, UserRole, UserStatus } from '../../../src/core/database/entities/user.entity';
import { Account, AccountType, AccountStatus } from '../../../src/core/database/entities/account.entity';
import { Category, CategoryType, CategoryStatus } from '../../../src/core/database/entities/category.entity';
import { Transaction, TransactionType, TransactionStatus } from '../../../src/core/database/entities/transaction.entity';

describe('Repository Operations', () => {
  let dataSource: DataSource;
  let factory: TestDataFactory;
  let userRepository: Repository<User>;
  let accountRepository: Repository<Account>;
  let categoryRepository: Repository<Category>;
  let transactionRepository: Repository<Transaction>;

  beforeAll(async () => {
    dataSource = await setupTestDatabase();
    factory = new TestDataFactory(dataSource);
    userRepository = dataSource.getRepository(User);
    accountRepository = dataSource.getRepository(Account);
    categoryRepository = dataSource.getRepository(Category);
    transactionRepository = dataSource.getRepository(Transaction);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
    // Reset category root after database cleanup (NestedSet requires single root)
    factory.categories.resetRoot();
  });

  describe('User Repository Operations', () => {
    describe('Create Operations', () => {
      it('should create a new user', async () => {
        // Arrange
        const userData = factory.users.create({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        });

        // Act
        const savedUser = await userRepository.save(userData);

        // Assert
        expect(savedUser.id).toBeDefined();
        expect(savedUser.email).toBe('test@example.com');
        expect(savedUser.fullName).toBe('John Doe');
        expect(savedUser.createdAt).toBeInstanceOf(Date);
        expect(savedUser.updatedAt).toBeInstanceOf(Date);
      });

      it('should create user with preferences', async () => {
        // Arrange
        const preferences = {
          theme: 'dark' as const,
          language: 'es',
          notifications: {
            email: false,
            push: true,
            categories: true,
            budgets: false,
          },
        };

        const userData = factory.users.create({ preferences });

        // Act
        const savedUser = await userRepository.save(userData);

        // Assert
        expect(savedUser.preferences).toEqual(preferences);
        expect(savedUser.preferences?.theme).toBe('dark');
        expect(savedUser.preferences?.notifications?.email).toBe(false);
      });

      it('should validate required fields', async () => {
        // Arrange
        const invalidUser = userRepository.create({
          // Missing required fields
          firstName: 'John',
        });

        // Act & Assert
        await expect(userRepository.save(invalidUser)).rejects.toThrow();
      });
    });

    describe('Read Operations', () => {
      it('should find user by id', async () => {
        // Arrange
        const user = await factory.users.build();

        // Act
        const foundUser = await userRepository.findOne({
          where: { id: user.id }
        });

        // Assert
        expect(foundUser).toBeDefined();
        expect(foundUser!.id).toBe(user.id);
        expect(foundUser!.email).toBe(user.email);
      });

      it('should find user by email', async () => {
        // Arrange
        const email = 'unique@example.com';
        const user = await factory.users.build({ email });

        // Act
        const foundUser = await userRepository.findOne({
          where: { email }
        });

        // Assert
        expect(foundUser).toBeDefined();
        expect(foundUser!.email).toBe(email);
      });

      it('should find users with relations', async () => {
        // Arrange
        const user = await factory.users.build();
        await factory.accounts.buildMany(2, { userId: user.id });

        // Act
        const userWithAccounts = await userRepository.findOne({
          where: { id: user.id },
          relations: ['accounts']
        });

        // Assert
        expect(userWithAccounts).toBeDefined();
        expect(userWithAccounts!.accounts).toHaveLength(2);
      });

      it('should find users with complex queries', async () => {
        // Arrange
        await factory.users.build({ status: UserStatus.ACTIVE, role: UserRole.USER });
        await factory.users.build({ status: UserStatus.INACTIVE, role: UserRole.USER });
        await factory.users.build({ status: UserStatus.ACTIVE, role: UserRole.ADMIN });

        // Act
        const activeUsers = await userRepository.find({
          where: { status: UserStatus.ACTIVE }
        });

        const adminUsers = await userRepository.find({
          where: { role: UserRole.ADMIN }
        });

        // Assert
        expect(activeUsers).toHaveLength(2);
        expect(adminUsers).toHaveLength(1);
      });
    });

    describe('Update Operations', () => {
      it('should update user fields', async () => {
        // Arrange
        const user = await factory.users.build({
          firstName: 'John',
          lastName: 'Doe'
        });

        // Act
        await userRepository.update(user.id, {
          firstName: 'Jane',
          lastName: 'Smith'
        });

        const updatedUser = await userRepository.findOne({
          where: { id: user.id }
        });

        // Assert
        expect(updatedUser!.firstName).toBe('Jane');
        expect(updatedUser!.lastName).toBe('Smith');
        expect(updatedUser!.fullName).toBe('Jane Smith');
      });

      it('should update user preferences', async () => {
        // Arrange
        const user = await factory.users.build({
          preferences: { theme: 'light' }
        });

        // Act
        await userRepository.update(user.id, {
          preferences: { theme: 'dark', language: 'es' }
        });

        const updatedUser = await userRepository.findOne({
          where: { id: user.id }
        });

        // Assert
        expect(updatedUser!.preferences?.theme).toBe('dark');
        expect(updatedUser!.preferences?.language).toBe('es');
      });

      it('should update lastLoginAt timestamp', async () => {
        // Arrange
        const user = await factory.users.build({ lastLoginAt: null });
        const loginTime = new Date();

        // Act
        await userRepository.update(user.id, { lastLoginAt: loginTime });

        const updatedUser = await userRepository.findOne({
          where: { id: user.id }
        });

        // Assert
        expect(updatedUser!.lastLoginAt).toEqual(loginTime);
      });
    });

    describe('Delete Operations', () => {
      it('should soft delete user', async () => {
        // Arrange
        const user = await factory.users.build();

        // Act
        await userRepository.update(user.id, { status: UserStatus.SUSPENDED });

        const suspendedUser = await userRepository.findOne({
          where: { id: user.id }
        });

        // Assert
        expect(suspendedUser!.status).toBe(UserStatus.SUSPENDED);
        expect(suspendedUser!.isActive).toBe(false);
      });

      it('should hard delete user and cascade to accounts', async () => {
        // Arrange
        const user = await factory.users.build();
        const account = await factory.accounts.build({ userId: user.id });

        // Act
        await userRepository.remove(user);

        // Assert
        const deletedUser = await userRepository.findOne({
          where: { id: user.id }
        });
        const orphanedAccount = await accountRepository.findOne({
          where: { id: account.id }
        });

        expect(deletedUser).toBeNull();
        expect(orphanedAccount).toBeNull(); // Should be cascade deleted
      });
    });
  });

  describe('Account Repository Operations', () => {
    describe('Create Operations', () => {
      it('should create account with all fields', async () => {
        // Arrange
        const user = await factory.users.build();
        const accountData = factory.accounts.create({
          userId: user.id,
          type: AccountType.CHECKING,
          currentBalance: 1500.50
        });

        // Act
        const savedAccount = await accountRepository.save(accountData);

        // Assert
        expect(savedAccount.id).toBeDefined();
        expect(savedAccount.userId).toBe(user.id);
        expect(savedAccount.currentBalance).toBe(1500.50);
        expect(savedAccount.displayName).toContain(savedAccount.name);
      });

      it('should create Plaid account with metadata', async () => {
        // Arrange
        const user = await factory.users.build();
        const plaidAccount = factory.accounts.createPlaidAccount({
          userId: user.id,
          plaidMetadata: {
            mask: '1234',
            officialName: 'Chase Checking',
            subtype: 'checking'
          }
        });

        // Act
        const savedAccount = await accountRepository.save(plaidAccount);

        // Assert
        expect(savedAccount.isPlaidAccount).toBe(true);
        expect(savedAccount.plaidMetadata?.mask).toBe('1234');
        expect(savedAccount.plaidMetadata?.officialName).toBe('Chase Checking');
      });
    });

    describe('Query Operations', () => {
      it('should find accounts by user', async () => {
        // Arrange
        const user = await factory.users.build();
        await factory.accounts.buildMany(3, { userId: user.id });

        // Act
        const userAccounts = await accountRepository.find({
          where: { userId: user.id }
        });

        // Assert
        expect(userAccounts).toHaveLength(3);
        userAccounts.forEach(account => {
          expect(account.userId).toBe(user.id);
        });
      });

      it('should find accounts by type', async () => {
        // Arrange
        const user = await factory.users.build();
        await factory.accounts.build({
          userId: user.id,
          type: AccountType.CHECKING
        });
        await factory.accounts.build({
          userId: user.id,
          type: AccountType.SAVINGS
        });
        await factory.accounts.build({
          userId: user.id,
          type: AccountType.CREDIT_CARD
        });

        // Act
        const checkingAccounts = await accountRepository.find({
          where: { type: AccountType.CHECKING }
        });

        // Assert
        expect(checkingAccounts).toHaveLength(1);
        expect(checkingAccounts[0].type).toBe(AccountType.CHECKING);
      });

      it('should find accounts needing sync', async () => {
        // Arrange
        const user = await factory.users.build();
        const oldSyncDate = new Date();
        oldSyncDate.setHours(oldSyncDate.getHours() - 2); // 2 hours ago

        await factory.accounts.createPlaidAccount({
          userId: user.id,
          syncEnabled: true,
          lastSyncAt: oldSyncDate
        });

        await factory.accounts.createPlaidAccount({
          userId: user.id,
          syncEnabled: false,
          lastSyncAt: oldSyncDate
        });

        // Act
        const accountsNeedingSync = await accountRepository
          .createQueryBuilder('account')
          .where('account.syncEnabled = :enabled', { enabled: true })
          .andWhere('account.source = :source', { source: 'plaid' })
          .andWhere('account.lastSyncAt < :cutoff', {
            cutoff: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
          })
          .getMany();

        // Assert
        expect(accountsNeedingSync).toHaveLength(1);
        expect(accountsNeedingSync[0].needsSync).toBe(true);
      });
    });
  });

  describe('Transaction Repository Operations', () => {
    describe('Create Operations', () => {
      it('should create transaction with all fields', async () => {
        // Arrange
        const user = await factory.users.build();
        const account = await factory.accounts.build({ userId: user.id });
        const category = await factory.categories.build();

        const transactionData = factory.transactions.create({
          accountId: account.id,
          categoryId: category.id,
          amount: 150.75,
          type: TransactionType.DEBIT,
          description: 'Grocery shopping'
        });

        // Act
        const savedTransaction = await transactionRepository.save(transactionData);

        // Assert
        expect(savedTransaction.id).toBeDefined();
        expect(savedTransaction.amount).toBe(150.75);
        expect(savedTransaction.displayAmount).toBe(-150.75);
        expect(savedTransaction.isExpense).toBe(true);
        expect(savedTransaction.formattedAmount).toBe('-$150.75');
      });

      it('should create transaction with location data', async () => {
        // Arrange
        const user = await factory.users.build();
        const account = await factory.accounts.build({ userId: user.id });

        const transactionData = factory.transactions.createPlaidTransaction({
          accountId: account.id,
          location: {
            address: '123 Main St',
            city: 'Boston',
            region: 'MA',
            postalCode: '02101',
            country: 'US',
            lat: 42.3601,
            lon: -71.0589
          }
        });

        // Act
        const savedTransaction = await transactionRepository.save(transactionData);

        // Assert
        expect(savedTransaction.location?.city).toBe('Boston');
        expect(savedTransaction.location?.lat).toBe(42.3601);
        expect(savedTransaction.isPlaidTransaction).toBe(true);
      });
    });

    describe('Query Operations', () => {
      it('should find transactions by account with pagination', async () => {
        // Arrange
        const user = await factory.users.build();
        const account = await factory.accounts.build({ userId: user.id });
        await factory.transactions.buildMany(25, { accountId: account.id });

        // Act
        const firstPage = await transactionRepository.find({
          where: { accountId: account.id },
          order: { date: 'DESC' },
          take: 10,
          skip: 0
        });

        const secondPage = await transactionRepository.find({
          where: { accountId: account.id },
          order: { date: 'DESC' },
          take: 10,
          skip: 10
        });

        // Assert
        expect(firstPage).toHaveLength(10);
        expect(secondPage).toHaveLength(10);
        expect(firstPage[0].id).not.toBe(secondPage[0].id);
      });

      it('should find transactions by date range', async () => {
        // Arrange
        const user = await factory.users.build();
        const account = await factory.accounts.build({ userId: user.id });

        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const outsideDate = new Date('2024-02-15');

        await factory.transactions.build({
          accountId: account.id,
          date: new Date('2024-01-15')
        });
        await factory.transactions.build({
          accountId: account.id,
          date: outsideDate
        });

        // Act
        const transactionsInRange = await transactionRepository
          .createQueryBuilder('transaction')
          .where('transaction.accountId = :accountId', { accountId: account.id })
          .andWhere('transaction.date BETWEEN :start AND :end', {
            start: startDate,
            end: endDate
          })
          .getMany();

        // Assert
        expect(transactionsInRange).toHaveLength(1);
        expect(transactionsInRange[0].date.getMonth()).toBe(0); // January
      });

      it('should find transactions by category with aggregations', async () => {
        // Arrange
        const user = await factory.users.build();
        const account = await factory.accounts.build({ userId: user.id });
        const category = await factory.categories.build();

        await factory.transactions.build({
          accountId: account.id,
          categoryId: category.id,
          amount: 100,
          type: TransactionType.DEBIT
        });
        await factory.transactions.build({
          accountId: account.id,
          categoryId: category.id,
          amount: 50,
          type: TransactionType.DEBIT
        });

        // Act
        const categoryTotal = await transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.amount)', 'total')
          .addSelect('COUNT(transaction.id)', 'count')
          .where('transaction.categoryId = :categoryId', { categoryId: category.id })
          .andWhere('transaction.type = :type', { type: TransactionType.DEBIT })
          .getRawOne();

        // Assert
        expect(parseFloat(categoryTotal.total)).toBe(150);
        expect(parseInt(categoryTotal.count)).toBe(2);
      });

      it('should find uncategorized transactions', async () => {
        // Arrange
        const user = await factory.users.build();
        const account = await factory.accounts.build({ userId: user.id });

        await factory.transactions.build({
          accountId: account.id,
          categoryId: null,
          amount: 100
        });

        const category = await factory.categories.build();
        await factory.transactions.build({
          accountId: account.id,
          categoryId: category.id,
          amount: 50
        });

        // Act
        const uncategorized = await transactionRepository
          .createQueryBuilder('transaction')
          .where('transaction.categoryId IS NULL')
          .andWhere('transaction.amount > 0')
          .getMany();

        // Assert
        expect(uncategorized).toHaveLength(1);
        expect(uncategorized[0].needsCategorization).toBe(true);
      });
    });

    describe('Update Operations', () => {
      it('should update transaction category', async () => {
        // Arrange
        const user = await factory.users.build();
        const account = await factory.accounts.build({ userId: user.id });
        const oldCategory = await factory.categories.build();
        const newCategory = await factory.categories.build();

        const transaction = await factory.transactions.build({
          accountId: account.id,
          categoryId: oldCategory.id
        });

        // Act
        await transactionRepository.update(transaction.id, {
          categoryId: newCategory.id
        });

        const updatedTransaction = await transactionRepository.findOne({
          where: { id: transaction.id },
          relations: ['category']
        });

        // Assert
        expect(updatedTransaction!.categoryId).toBe(newCategory.id);
        expect(updatedTransaction!.category!.id).toBe(newCategory.id);
      });

      it('should update transaction notes and tags', async () => {
        // Arrange
        const user = await factory.users.build();
        const account = await factory.accounts.build({ userId: user.id });
        const transaction = await factory.transactions.build({
          accountId: account.id,
          notes: 'Original note',
          tags: ['old-tag']
        });

        // Act
        await transactionRepository.update(transaction.id, {
          notes: 'Updated note',
          tags: ['new-tag', 'another-tag']
        });

        const updatedTransaction = await transactionRepository.findOne({
          where: { id: transaction.id }
        });

        // Assert
        expect(updatedTransaction!.notes).toBe('Updated note');
        expect(updatedTransaction!.tags).toEqual(['new-tag', 'another-tag']);
      });
    });
  });

  describe('Category Repository Operations', () => {
    describe('Tree Operations', () => {
      it('should create category hierarchy', async () => {
        // Arrange
        const parentCategory = await factory.categories.build({
          name: 'Expenses',
          type: CategoryType.EXPENSE
        });

        // Act
        const childCategory = await factory.categories.build({
          name: 'Food',
          type: CategoryType.EXPENSE,
          parentId: parentCategory.id
        });

        // Assert
        const parentWithChildren = await categoryRepository.findOne({
          where: { id: parentCategory.id },
          relations: ['children']
        });

        const childWithParent = await categoryRepository.findOne({
          where: { id: childCategory.id },
          relations: ['parent']
        });

        expect(parentWithChildren!.children).toHaveLength(1);
        expect(parentWithChildren!.hasChildren).toBe(true);
        expect(childWithParent!.parent.id).toBe(parentCategory.id);
        expect(childWithParent!.isTopLevel).toBe(false);
      });

      it('should find top-level categories', async () => {
        // Arrange
        const topLevel = await factory.categories.build({
          name: 'Top Level',
          parentId: null
        });

        const parent = await factory.categories.build({
          name: 'Parent'
        });

        await factory.categories.build({
          name: 'Child',
          parentId: parent.id
        });

        // Act
        const topLevelCategories = await categoryRepository.find({
          where: { parentId: null }
        });

        // Assert
        expect(topLevelCategories).toHaveLength(2);
        expect(topLevelCategories.map(c => c.name)).toContain('Top Level');
        expect(topLevelCategories.map(c => c.name)).toContain('Parent');
      });
    });

    describe('Search Operations', () => {
      it('should search categories by name', async () => {
        // Arrange
        await factory.categories.build({ name: 'Food & Dining' });
        await factory.categories.build({ name: 'Fast Food' });
        await factory.categories.build({ name: 'Transportation' });

        // Act
        const foodCategories = await categoryRepository
          .createQueryBuilder('category')
          .where('category.name ILIKE :search', { search: '%food%' })
          .getMany();

        // Assert
        expect(foodCategories).toHaveLength(2);
        expect(foodCategories.map(c => c.name)).toContain('Food & Dining');
        expect(foodCategories.map(c => c.name)).toContain('Fast Food');
      });

      it('should find active categories only', async () => {
        // Arrange
        await factory.categories.build({
          name: 'Active Category',
          status: CategoryStatus.ACTIVE
        });
        await factory.categories.build({
          name: 'Inactive Category',
          status: CategoryStatus.INACTIVE
        });

        // Act
        const activeCategories = await categoryRepository.find({
          where: { status: CategoryStatus.ACTIVE }
        });

        // Assert
        expect(activeCategories).toHaveLength(1);
        expect(activeCategories[0].name).toBe('Active Category');
        expect(activeCategories[0].isActive).toBe(true);
      });
    });
  });

  describe('Cross-Repository Operations', () => {
    it('should find user with all related data', async () => {
      // Arrange
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });
      const category = await factory.categories.build();
      await factory.transactions.buildMany(3, {
        accountId: account.id,
        categoryId: category.id
      });

      // Act
      const fullUser = await userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.accounts', 'account')
        .leftJoinAndSelect('account.transactions', 'transaction')
        .leftJoinAndSelect('transaction.category', 'category')
        .where('user.id = :id', { id: user.id })
        .getOne();

      // Assert
      expect(fullUser).toBeDefined();
      expect(fullUser!.accounts).toHaveLength(1);
      expect(fullUser!.accounts[0].transactions).toHaveLength(3);
      expect(fullUser!.accounts[0].transactions[0].category).toBeDefined();
    });

    it('should calculate user financial summary', async () => {
      // Arrange
      const user = await factory.users.build();
      const checkingAccount = await factory.accounts.build({
        userId: user.id,
        type: AccountType.CHECKING,
        currentBalance: 1000
      });
      const creditAccount = await factory.accounts.build({
        userId: user.id,
        type: AccountType.CREDIT_CARD,
        currentBalance: -500
      });

      await factory.transactions.build({
        accountId: checkingAccount.id,
        type: TransactionType.CREDIT,
        amount: 2000
      });
      await factory.transactions.build({
        accountId: checkingAccount.id,
        type: TransactionType.DEBIT,
        amount: 300
      });

      // Act
      const summary = await dataSource
        .createQueryBuilder()
        .select('SUM(account.currentBalance)', 'totalBalance')
        .addSelect('COUNT(DISTINCT account.id)', 'accountCount')
        .addSelect('COUNT(DISTINCT transaction.id)', 'transactionCount')
        .from(Account, 'account')
        .leftJoin('account.transactions', 'transaction')
        .where('account.userId = :userId', { userId: user.id })
        .getRawOne();

      // Assert
      expect(parseFloat(summary.totalBalance)).toBe(500); // 1000 + (-500)
      expect(parseInt(summary.accountCount)).toBe(2);
      expect(parseInt(summary.transactionCount)).toBe(2);
    });
  });
});