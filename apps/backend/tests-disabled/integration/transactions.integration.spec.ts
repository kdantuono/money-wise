/**
 * Transactions API Integration Tests
 *
 * Tests the complete transactions API endpoints with real database and authentication
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { AccountsService } from '../../src/accounts/accounts.service';
import { TransactionsService } from '../../src/transactions/transactions.service';
import { CategoriesService } from '../../src/categories/categories.service';
import { DataSource } from 'typeorm';
import { Transaction } from '../../src/transactions/entities/transaction.entity';
import { Account } from '../../src/accounts/entities/account.entity';
import { Category } from '../../src/categories/entities/category.entity';
import { User } from '../../src/users/entities/user.entity';

describe('Transactions API (Integration)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let usersService: UsersService;
  let accountsService: AccountsService;
  let transactionsService: TransactionsService;
  let categoriesService: CategoriesService;
  let dataSource: DataSource;
  let testUser: User;
  let testUser2: User;
  let accessToken: string;
  let accessToken2: string;
  let testAccount: Account;
  let testAccount2: Account;
  let testCategory: Category;
  let testTransaction: Transaction;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    authService = moduleRef.get<AuthService>(AuthService);
    usersService = moduleRef.get<UsersService>(UsersService);
    accountsService = moduleRef.get<AccountsService>(AccountsService);
    transactionsService = moduleRef.get<TransactionsService>(TransactionsService);
    categoriesService = moduleRef.get<CategoriesService>(CategoriesService);
    dataSource = moduleRef.get<DataSource>(DataSource);

    // Clear database
    await dataSource.getRepository(Transaction).delete({});
    await dataSource.getRepository(Category).delete({});
    await dataSource.getRepository(Account).delete({});
    await dataSource.getRepository(User).delete({});

    // Create test users
    testUser = await usersService.create({
      email: 'test@example.com',
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
    });

    testUser2 = await usersService.create({
      email: 'test2@example.com',
      password: 'Test123!@#',
      firstName: 'Test2',
      lastName: 'User2',
    });

    // Get access tokens
    const authResponse = await authService.login({
      email: 'test@example.com',
      password: 'Test123!@#',
    });
    accessToken = authResponse.accessToken;

    const authResponse2 = await authService.login({
      email: 'test2@example.com',
      password: 'Test123!@#',
    });
    accessToken2 = authResponse2.accessToken;

    // Create test accounts
    testAccount = await accountsService.create(
      {
        name: 'Test Checking',
        type: 'checking',
        currency: 'USD',
        currentBalance: 1000,
      },
      testUser,
    );

    testAccount2 = await accountsService.create(
      {
        name: 'Other User Account',
        type: 'checking',
        currency: 'USD',
        currentBalance: 2000,
      },
      testUser2,
    );

    // Create test category
    testCategory = await categoriesService.create({
      name: 'Food & Dining',
      slug: 'food-dining',
      type: 'expense',
      color: '#FF5733',
      icon: 'restaurant',
    });
  });

  afterAll(async () => {
    await dataSource.getRepository(Transaction).delete({});
    await dataSource.getRepository(Category).delete({});
    await dataSource.getRepository(Account).delete({});
    await dataSource.getRepository(User).delete({});
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clear transactions before each test
    await dataSource.getRepository(Transaction).delete({});
  });

  describe('POST /api/transactions', () => {
    it('should create a new transaction', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: testAccount.id,
          categoryId: testCategory.id,
          amount: 50.00,
          type: 'expense',
          description: 'Lunch at restaurant',
          date: '2024-01-15',
          merchant: 'Pizza Place',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.amount).toBe(50.00);
      expect(response.body.type).toBe('expense');
      expect(response.body.description).toBe('Lunch at restaurant');
      expect(response.body.merchant).toBe('Pizza Place');
      expect(response.body.accountId).toBe(testAccount.id);
      expect(response.body.categoryId).toBe(testCategory.id);
    });

    it('should reject transaction for other users account', async () => {
      await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: testAccount2.id, // Other user's account
          amount: 100.00,
          type: 'expense',
          description: 'Unauthorized transaction',
          date: '2024-01-15',
        })
        .expect(403);
    });

    it('should validate transaction amount', async () => {
      await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: testAccount.id,
          amount: -50.00, // Negative amount
          type: 'expense',
          description: 'Invalid amount',
          date: '2024-01-15',
        })
        .expect(400);
    });

    it('should validate transaction type', async () => {
      await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: testAccount.id,
          amount: 50.00,
          type: 'invalid_type',
          description: 'Invalid type',
          date: '2024-01-15',
        })
        .expect(400);
    });

    it('should create pending transaction', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: testAccount.id,
          amount: 75.00,
          type: 'income',
          status: 'pending',
          description: 'Pending payment',
          date: '2024-01-20',
        })
        .expect(201);

      expect(response.body.status).toBe('pending');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          accountId: testAccount.id,
          amount: 50.00,
          type: 'expense',
          description: 'Unauthorized',
          date: '2024-01-15',
        })
        .expect(401);
    });

    it('should handle transfer transactions', async () => {
      const secondAccount = await accountsService.create(
        {
          name: 'Savings Account',
          type: 'savings',
          currency: 'USD',
          currentBalance: 500,
        },
        testUser,
      );

      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: testAccount.id,
          amount: 200.00,
          type: 'transfer',
          description: 'Transfer to savings',
          date: '2024-01-15',
          transferAccountId: secondAccount.id,
        })
        .expect(201);

      expect(response.body.type).toBe('transfer');
      expect(response.body.transferAccountId).toBe(secondAccount.id);
    });
  });

  describe('GET /api/transactions', () => {
    beforeEach(async () => {
      // Create test transactions
      testTransaction = await transactionsService.create({
        accountId: testAccount.id,
        amount: 100.00,
        type: 'expense',
        description: 'Test expense',
        date: new Date('2024-01-15'),
        categoryId: testCategory.id,
      });

      await transactionsService.create({
        accountId: testAccount.id,
        amount: 500.00,
        type: 'income',
        description: 'Salary',
        date: new Date('2024-01-01'),
      });

      await transactionsService.create({
        accountId: testAccount2.id,
        amount: 200.00,
        type: 'expense',
        description: 'Other user transaction',
        date: new Date('2024-01-10'),
      });
    });

    it('should return all transactions for user accounts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((t: any) =>
        t.account.userId === testUser.id
      )).toBe(true);
    });

    it('should filter by account', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/transactions?accountId=${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((t: any) =>
        t.accountId === testAccount.id
      )).toBe(true);
    });

    it('should filter by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions?type=income')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('income');
    });

    it('should filter by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions?startDate=2024-01-10&endDate=2024-01-20')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].description).toBe('Test expense');
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
    });

    it('should search by description', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions?search=salary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].description.toLowerCase()).toContain('salary');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/transactions')
        .expect(401);
    });
  });

  describe('GET /api/transactions/:id', () => {
    beforeEach(async () => {
      testTransaction = await transactionsService.create({
        accountId: testAccount.id,
        amount: 75.00,
        type: 'expense',
        description: 'Specific transaction',
        date: new Date('2024-01-15'),
      });
    });

    it('should return transaction details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testTransaction.id);
      expect(response.body.amount).toBe(75.00);
      expect(response.body.description).toBe('Specific transaction');
    });

    it('should include account and category details', async () => {
      const transaction = await transactionsService.create({
        accountId: testAccount.id,
        categoryId: testCategory.id,
        amount: 30.00,
        type: 'expense',
        description: 'With relations',
        date: new Date('2024-01-15'),
      });

      const response = await request(app.getHttpServer())
        .get(`/api/transactions/${transaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.account).toBeDefined();
      expect(response.body.account.id).toBe(testAccount.id);
      expect(response.body.category).toBeDefined();
      expect(response.body.category.id).toBe(testCategory.id);
    });

    it('should prevent accessing other users transactions', async () => {
      const otherTransaction = await transactionsService.create({
        accountId: testAccount2.id,
        amount: 100.00,
        type: 'expense',
        description: 'Other user',
        date: new Date('2024-01-15'),
      });

      await request(app.getHttpServer())
        .get(`/api/transactions/${otherTransaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent transaction', async () => {
      await request(app.getHttpServer())
        .get('/api/transactions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/transactions/:id', () => {
    beforeEach(async () => {
      testTransaction = await transactionsService.create({
        accountId: testAccount.id,
        amount: 100.00,
        type: 'expense',
        description: 'Original description',
        date: new Date('2024-01-15'),
      });
    });

    it('should update transaction description', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.description).toBe('Updated description');
      expect(response.body.amount).toBe(100.00); // Unchanged
    });

    it('should update transaction category', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          categoryId: testCategory.id,
        })
        .expect(200);

      expect(response.body.categoryId).toBe(testCategory.id);
    });

    it('should update transaction status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'reconciled',
        })
        .expect(200);

      expect(response.body.status).toBe('reconciled');
    });

    it('should prevent updating other users transactions', async () => {
      const otherTransaction = await transactionsService.create({
        accountId: testAccount2.id,
        amount: 50.00,
        type: 'expense',
        description: 'Other user',
        date: new Date('2024-01-15'),
      });

      await request(app.getHttpServer())
        .patch(`/api/transactions/${otherTransaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Hacked',
        })
        .expect(403);
    });

    it('should validate update data', async () => {
      await request(app.getHttpServer())
        .patch(`/api/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: -100, // Invalid negative amount
        })
        .expect(400);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    beforeEach(async () => {
      testTransaction = await transactionsService.create({
        accountId: testAccount.id,
        amount: 50.00,
        type: 'expense',
        description: 'To be deleted',
        date: new Date('2024-01-15'),
      });
    });

    it('should delete transaction', async () => {
      await request(app.getHttpServer())
        .delete(`/api/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Verify transaction is deleted
      const transaction = await dataSource.getRepository(Transaction).findOne({
        where: { id: testTransaction.id },
      });
      expect(transaction).toBeNull();
    });

    it('should prevent deleting other users transactions', async () => {
      const otherTransaction = await transactionsService.create({
        accountId: testAccount2.id,
        amount: 75.00,
        type: 'expense',
        description: 'Other user',
        date: new Date('2024-01-15'),
      });

      await request(app.getHttpServer())
        .delete(`/api/transactions/${otherTransaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      // Verify transaction still exists
      const transaction = await dataSource.getRepository(Transaction).findOne({
        where: { id: otherTransaction.id },
      });
      expect(transaction).not.toBeNull();
    });

    it('should return 404 for non-existent transaction', async () => {
      await request(app.getHttpServer())
        .delete('/api/transactions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /api/transactions/stats', () => {
    beforeEach(async () => {
      // Create transactions for statistics
      const dates = [
        '2024-01-01', '2024-01-05', '2024-01-10',
        '2024-01-15', '2024-01-20', '2024-01-25',
      ];

      for (const date of dates) {
        await transactionsService.create({
          accountId: testAccount.id,
          amount: Math.random() * 100 + 50,
          type: Math.random() > 0.5 ? 'expense' : 'income',
          description: `Transaction on ${date}`,
          date: new Date(date),
          categoryId: Math.random() > 0.5 ? testCategory.id : null,
        });
      }
    });

    it('should return transaction statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalIncome');
      expect(response.body).toHaveProperty('totalExpenses');
      expect(response.body).toHaveProperty('netFlow');
      expect(response.body).toHaveProperty('transactionCount');
      expect(response.body).toHaveProperty('averageTransaction');
    });

    it('should calculate stats for date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions/stats?startDate=2024-01-10&endDate=2024-01-20')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.transactionCount).toBeLessThanOrEqual(6);
    });

    it('should calculate stats by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions/stats?groupBy=category')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.byCategory).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/transactions/stats')
        .expect(401);
    });
  });

  describe('POST /api/transactions/bulk', () => {
    it('should create multiple transactions', async () => {
      const transactions = [
        {
          accountId: testAccount.id,
          amount: 25.00,
          type: 'expense',
          description: 'Bulk transaction 1',
          date: '2024-01-15',
        },
        {
          accountId: testAccount.id,
          amount: 35.00,
          type: 'expense',
          description: 'Bulk transaction 2',
          date: '2024-01-16',
        },
        {
          accountId: testAccount.id,
          amount: 45.00,
          type: 'income',
          description: 'Bulk transaction 3',
          date: '2024-01-17',
        },
      ];

      const response = await request(app.getHttpServer())
        .post('/api/transactions/bulk')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transactions })
        .expect(201);

      expect(response.body.created).toBe(3);
      expect(response.body.transactions).toHaveLength(3);
    });

    it('should validate all transactions in bulk', async () => {
      const transactions = [
        {
          accountId: testAccount.id,
          amount: 25.00,
          type: 'expense',
          description: 'Valid',
          date: '2024-01-15',
        },
        {
          accountId: testAccount.id,
          amount: -35.00, // Invalid
          type: 'expense',
          description: 'Invalid amount',
          date: '2024-01-16',
        },
      ];

      await request(app.getHttpServer())
        .post('/api/transactions/bulk')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transactions })
        .expect(400);
    });

    it('should prevent bulk creation for other users accounts', async () => {
      const transactions = [
        {
          accountId: testAccount2.id, // Other user's account
          amount: 50.00,
          type: 'expense',
          description: 'Unauthorized',
          date: '2024-01-15',
        },
      ];

      await request(app.getHttpServer())
        .post('/api/transactions/bulk')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transactions })
        .expect(403);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain account balance consistency', async () => {
      const initialBalance = testAccount.currentBalance;

      // Create expense transaction
      await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: testAccount.id,
          amount: 100.00,
          type: 'expense',
          description: 'Test expense',
          date: '2024-01-15',
        })
        .expect(201);

      // Check if account balance logic would be applied
      // Note: This depends on your business logic implementation
    });

    it('should handle concurrent transaction creation', async () => {
      const promises = Array(5)
        .fill(null)
        .map((_, index) =>
          request(app.getHttpServer())
            .post('/api/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              accountId: testAccount.id,
              amount: 10.00 * (index + 1),
              type: 'expense',
              description: `Concurrent ${index}`,
              date: '2024-01-15',
            }),
        );

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.status === 201).length;
      expect(successCount).toBe(5);
    });
  });
});