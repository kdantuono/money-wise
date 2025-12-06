/**
 * Budget-Transaction Integration Tests
 *
 * Tests the complete budget lifecycle with real database operations:
 * - Budget creation with 0% spent
 * - Transaction creation affecting budget
 * - Budget spent calculation with user-owned accounts (userId set, familyId NULL)
 * - Budget progression updates
 *
 * This test would have caught the bug where budget.findAll() didn't include
 * user-owned accounts in the spent calculation query.
 *
 * @phase STORY-1.5.8 - Budget Integration Testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
import { setupTestDatabase, teardownTestDatabase } from '../../../src/core/database/tests/database-test.config';
import {
  AccountType,
  AccountSource,
  TransactionType,
  TransactionSource,
  CategoryType,
  BudgetPeriod,
  PrismaClient,
} from '../../../generated/prisma';
import {
  getCookieHeader,
  extractCsrfToken,
  assertCookieAuthResponse,
} from '../../helpers/cookie-auth.helper';
import { CategoryFactory } from '../../utils/factories/category.factory';

describe('Budget-Transaction Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // Test fixtures
  let testUserId: string;
  let testFamilyId: string;
  let testAccountId: string;
  let testCategoryId: string;
  let testBudgetId: string;

  // Authentication
  let userCookies: string;
  let userCsrfToken: string | null;

  beforeAll(async () => {
    prisma = await setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();

    // Initialize cookie-parser middleware
    const sessionSecret = process.env.SESSION_SECRET || 'test-session-secret-min-32-characters-long';
    const cookieParserMiddleware = (await import('cookie-parser')).default;
    app.use(cookieParserMiddleware(sessionSecret));

    // Apply global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Create test family
    const family = await prisma.family.create({
      data: { name: 'Budget Test Family' },
    });
    testFamilyId = family.id;

    // Create and register test user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'budgettest@example.com',
        password: 'SecureFinance2024!@#',
        firstName: 'Budget',
        lastName: 'Tester',
      });

    assertCookieAuthResponse(registerResponse);
    testUserId = registerResponse.body.user.id;
    userCookies = getCookieHeader(registerResponse);
    userCsrfToken = extractCsrfToken(registerResponse);

    // Assign user to family
    await prisma.user.update({
      where: { id: testUserId },
      data: {
        status: 'ACTIVE',
        familyId: testFamilyId,
      },
    });

    // Create test category (linked to family) using factory
    const categoryData = CategoryFactory.buildRestaurantsCategory(testFamilyId, {
      name: 'Fast Food',
      slug: 'fast-food',
      icon: '🍔',
      color: '#FF6B6B',
    });
    // Remove auto-generated id to let Prisma create one
    delete categoryData.id;
    delete categoryData.createdAt;
    delete categoryData.updatedAt;

    const category = await prisma.category.create({
      data: categoryData,
    });
    testCategoryId = category.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean transactions and budgets between tests
    await prisma.transaction.deleteMany({});
    await prisma.budget.deleteMany({});
  });

  describe('Budget Spent Calculation with User-Owned Accounts', () => {
    /**
     * This is the exact scenario that caused the bug:
     * - User has an account with userId set but familyId NULL
     * - Budget is created for the family
     * - Transaction is added to the user's account
     * - Budget spent should include this transaction
     */
    it('should calculate budget spent correctly when account has userId (not familyId)', async () => {
      // Step 1: Create a manual account owned by user (NOT family)
      // This is the key - the account has userId set but familyId is NULL
      const account = await prisma.account.create({
        data: {
          name: 'User Personal Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
          currency: 'USD',
          userId: testUserId,
          // Note: familyId is NOT set - this is the bug scenario
        },
      });
      testAccountId = account.id;

      // Step 2: Create a budget on the category
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const createBudgetResponse = await request(app.getHttpServer())
        .post('/budgets')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          name: 'Fast Food Budget',
          categoryId: testCategoryId,
          amount: 100.00,
          period: BudgetPeriod.MONTHLY,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .expect(201);

      testBudgetId = createBudgetResponse.body.id;

      // Verify budget starts at 0% spent
      expect(createBudgetResponse.body.spent).toBe(0);
      expect(createBudgetResponse.body.percentage).toBe(0);
      expect(createBudgetResponse.body.isOverBudget).toBe(false);

      // Step 3: Add a transaction to the user-owned account with the budget's category
      const transactionDate = new Date();
      transactionDate.setDate(transactionDate.getDate() - 1); // Yesterday

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccountId,
          amount: 25.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'McDonalds lunch',
          merchantName: 'McDonalds',
          date: transactionDate.toISOString().split('T')[0],
          categoryId: testCategoryId,
          includeInBudget: true,
        })
        .expect(201);

      // Step 4: Verify budget now shows 25% spent (25 of 100)
      const getBudgetResponse = await request(app.getHttpServer())
        .get(`/budgets/${testBudgetId}`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(getBudgetResponse.body.spent).toBe(25);
      expect(getBudgetResponse.body.percentage).toBe(25);
      expect(getBudgetResponse.body.remaining).toBe(75);
      expect(getBudgetResponse.body.isOverBudget).toBe(false);
    });

    it('should include transactions from user-owned accounts in budget list (findAll)', async () => {
      // Create account owned by user (not family)
      const account = await prisma.account.create({
        data: {
          name: 'User Account for List Test',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
          currency: 'USD',
          userId: testUserId,
          // familyId is NULL
        },
      });

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Create budget
      await request(app.getHttpServer())
        .post('/budgets')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          name: 'List Test Budget',
          categoryId: testCategoryId,
          amount: 200.00,
          period: BudgetPeriod.MONTHLY,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .expect(201);

      // Add transaction
      const transactionDate = new Date();
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: account.id,
          amount: 50.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Burger King',
          date: transactionDate.toISOString().split('T')[0],
          categoryId: testCategoryId,
          includeInBudget: true,
        })
        .expect(201);

      // Get all budgets (this is where the bug was - findAll wasn't including user-owned accounts)
      const listResponse = await request(app.getHttpServer())
        .get('/budgets')
        .set('Cookie', userCookies)
        .expect(200);

      expect(listResponse.body.budgets).toHaveLength(1);
      expect(listResponse.body.budgets[0].spent).toBe(50);
      expect(listResponse.body.budgets[0].percentage).toBe(25); // 50 of 200
    });

    it('should handle multiple transactions affecting the same budget', async () => {
      const account = await prisma.account.create({
        data: {
          name: 'Multi Transaction Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
          currency: 'USD',
          userId: testUserId,
        },
      });

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const createBudgetResponse = await request(app.getHttpServer())
        .post('/budgets')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          name: 'Multi Transaction Budget',
          categoryId: testCategoryId,
          amount: 100.00,
          period: BudgetPeriod.MONTHLY,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .expect(201);

      // Add first transaction: $10
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: account.id,
          amount: 10.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'First purchase',
          date: today.toISOString().split('T')[0],
          categoryId: testCategoryId,
          includeInBudget: true,
        })
        .expect(201);

      // Add second transaction: $20
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: account.id,
          amount: 20.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Second purchase',
          date: today.toISOString().split('T')[0],
          categoryId: testCategoryId,
          includeInBudget: true,
        })
        .expect(201);

      // Add third transaction: $3 (simulates the McDonalds scenario)
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: account.id,
          amount: 3.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Third purchase',
          date: today.toISOString().split('T')[0],
          categoryId: testCategoryId,
          includeInBudget: true,
        })
        .expect(201);

      // Verify total spent: $10 + $20 + $3 = $33, which is 33% of $100
      const getBudgetResponse = await request(app.getHttpServer())
        .get(`/budgets/${createBudgetResponse.body.id}`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(getBudgetResponse.body.spent).toBe(33);
      expect(getBudgetResponse.body.percentage).toBe(33);
      expect(getBudgetResponse.body.remaining).toBe(67);
    });

    it('should not include CREDIT transactions in budget spent', async () => {
      const account = await prisma.account.create({
        data: {
          name: 'Credit Test Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
          currency: 'USD',
          userId: testUserId,
        },
      });

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const createBudgetResponse = await request(app.getHttpServer())
        .post('/budgets')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          name: 'Credit Test Budget',
          categoryId: testCategoryId,
          amount: 100.00,
          period: BudgetPeriod.MONTHLY,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .expect(201);

      // Add DEBIT transaction: $25
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: account.id,
          amount: 25.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Debit purchase',
          date: today.toISOString().split('T')[0],
          categoryId: testCategoryId,
          includeInBudget: true,
        })
        .expect(201);

      // Add CREDIT transaction: $50 (should NOT affect budget)
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: account.id,
          amount: 50.00,
          type: TransactionType.CREDIT,
          source: TransactionSource.MANUAL,
          description: 'Refund',
          date: today.toISOString().split('T')[0],
          categoryId: testCategoryId,
          includeInBudget: true,
        })
        .expect(201);

      // Verify only DEBIT is counted
      const getBudgetResponse = await request(app.getHttpServer())
        .get(`/budgets/${createBudgetResponse.body.id}`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(getBudgetResponse.body.spent).toBe(25);
      expect(getBudgetResponse.body.percentage).toBe(25);
    });

    it('should not include transactions with includeInBudget=false', async () => {
      const account = await prisma.account.create({
        data: {
          name: 'Exclude Budget Test Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
          currency: 'USD',
          userId: testUserId,
        },
      });

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const createBudgetResponse = await request(app.getHttpServer())
        .post('/budgets')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          name: 'Exclude Budget Test',
          categoryId: testCategoryId,
          amount: 100.00,
          period: BudgetPeriod.MONTHLY,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .expect(201);

      // Add transaction with includeInBudget=true
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: account.id,
          amount: 30.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Included transaction',
          date: today.toISOString().split('T')[0],
          categoryId: testCategoryId,
          includeInBudget: true,
        })
        .expect(201);

      // Add transaction with includeInBudget=false
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: account.id,
          amount: 70.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Excluded transaction',
          date: today.toISOString().split('T')[0],
          categoryId: testCategoryId,
          includeInBudget: false,
        })
        .expect(201);

      // Verify only the included transaction is counted
      const getBudgetResponse = await request(app.getHttpServer())
        .get(`/budgets/${createBudgetResponse.body.id}`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(getBudgetResponse.body.spent).toBe(30);
      expect(getBudgetResponse.body.percentage).toBe(30);
    });

    it('should detect over-budget status correctly', async () => {
      const account = await prisma.account.create({
        data: {
          name: 'Over Budget Test Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
          currency: 'USD',
          userId: testUserId,
        },
      });

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const createBudgetResponse = await request(app.getHttpServer())
        .post('/budgets')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          name: 'Over Budget Test',
          categoryId: testCategoryId,
          amount: 50.00,
          period: BudgetPeriod.MONTHLY,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .expect(201);

      // Add transaction that exceeds budget
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: account.id,
          amount: 75.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Over budget purchase',
          date: today.toISOString().split('T')[0],
          categoryId: testCategoryId,
          includeInBudget: true,
        })
        .expect(201);

      // Verify over-budget status
      const getBudgetResponse = await request(app.getHttpServer())
        .get(`/budgets/${createBudgetResponse.body.id}`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(getBudgetResponse.body.spent).toBe(75);
      expect(getBudgetResponse.body.percentage).toBe(150); // 75 of 50 = 150%
      expect(getBudgetResponse.body.remaining).toBe(-25);
      expect(getBudgetResponse.body.isOverBudget).toBe(true);
      expect(getBudgetResponse.body.progressStatus).toBe('over');
    });
  });

  describe('Budget with Family-Owned Accounts', () => {
    it('should also include transactions from family-owned accounts', async () => {
      // Create account owned by FAMILY (not user directly)
      const familyAccount = await prisma.account.create({
        data: {
          name: 'Family Shared Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 5000,
          currency: 'USD',
          familyId: testFamilyId,
          // userId is NULL
        },
      });

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const createBudgetResponse = await request(app.getHttpServer())
        .post('/budgets')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          name: 'Family Account Budget',
          categoryId: testCategoryId,
          amount: 100.00,
          period: BudgetPeriod.MONTHLY,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .expect(201);

      // Add transaction to family account directly via Prisma
      // Note: Transaction API doesn't support family accounts yet (TODO in verifyAccountOwnership)
      // This tests budget calculation correctly includes family account transactions
      await prisma.transaction.create({
        data: {
          accountId: familyAccount.id,
          amount: 40.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Family account purchase',
          date: today,
          categoryId: testCategoryId,
          includeInBudget: true,
        },
      });

      // Verify transaction is counted
      const getBudgetResponse = await request(app.getHttpServer())
        .get(`/budgets/${createBudgetResponse.body.id}`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(getBudgetResponse.body.spent).toBe(40);
      expect(getBudgetResponse.body.percentage).toBe(40);
    });

    it('should aggregate transactions from both user-owned and family-owned accounts', async () => {
      // Create user-owned account
      const userAccount = await prisma.account.create({
        data: {
          name: 'User Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
          currency: 'USD',
          userId: testUserId,
        },
      });

      // Create family-owned account
      const familyAccount = await prisma.account.create({
        data: {
          name: 'Family Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 5000,
          currency: 'USD',
          familyId: testFamilyId,
        },
      });

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const createBudgetResponse = await request(app.getHttpServer())
        .post('/budgets')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          name: 'Combined Account Budget',
          categoryId: testCategoryId,
          amount: 100.00,
          period: BudgetPeriod.MONTHLY,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .expect(201);

      // Add transaction to user-owned account: $15
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: userAccount.id,
          amount: 15.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'User account purchase',
          date: today.toISOString().split('T')[0],
          categoryId: testCategoryId,
          includeInBudget: true,
        })
        .expect(201);

      // Add transaction to family-owned account: $25
      // Note: Transaction API doesn't support family accounts yet (TODO in verifyAccountOwnership)
      // Create directly via Prisma to test budget calculation
      await prisma.transaction.create({
        data: {
          accountId: familyAccount.id,
          amount: 25.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Family account purchase',
          date: today,
          categoryId: testCategoryId,
          includeInBudget: true,
        },
      });

      // Verify total is aggregated: $15 + $25 = $40
      const getBudgetResponse = await request(app.getHttpServer())
        .get(`/budgets/${createBudgetResponse.body.id}`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(getBudgetResponse.body.spent).toBe(40);
      expect(getBudgetResponse.body.percentage).toBe(40);
    });
  });
});
