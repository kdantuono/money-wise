/**
 * Transactions API Integration Tests (HTTP Endpoints)
 *
 * TDD Approach: Tests written FIRST to drive implementation
 *
 * Tests the TransactionsController REST API endpoints with real authentication
 * and authorization flows.
 *
 * Coverage:
 * - JWT authentication requirements
 * - Authorization checks (account ownership, family member, admin)
 * - Complete CRUD flow via HTTP
 * - Transaction filtering and search
 * - Error responses and status codes
 *
 * @phase STORY-1.5.7 - TDD Transaction API Implementation
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
  TransactionStatus,
  TransactionSource,
  UserRole,
  PrismaClient
} from '../../../generated/prisma';
import {
  getCookieHeader,
  extractCsrfToken,
  assertCookieAuthResponse,
} from '../../helpers/cookie-auth.helper';

describe('Transactions API Integration Tests (HTTP)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // Test fixtures
  let testUserId: string;
  let testUserId2: string;
  let testFamilyId: string;
  let testFamilyId2: string;
  let testAccountId: string;
  let testAccount2Id: string;
  let testTransactionId: string;

  // Authentication cookies and CSRF tokens
  let userCookies: string;
  let user2Cookies: string;
  let adminCookies: string;
  let userCsrfToken: string | null;
  let user2CsrfToken: string | null;
  let adminCsrfToken: string | null;

  beforeAll(async () => {
    prisma = await setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();

    // CRITICAL: Initialize cookie-parser middleware (matches main.ts)
    const sessionSecret = process.env.SESSION_SECRET || 'test-session-secret-min-32-characters-long';
    const cookieParserMiddleware = (await import('cookie-parser')).default;
    app.use(cookieParserMiddleware(sessionSecret));

    // Apply global pipes (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Create test families
    const family1 = await prisma.family.create({
      data: { name: 'Test Family 1' },
    });
    testFamilyId = family1.id;

    const family2 = await prisma.family.create({
      data: { name: 'Test Family 2' },
    });
    testFamilyId2 = family2.id;

    // Create test users and get cookies/CSRF tokens
    const registerResponse1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'transuser1@example.com',
        password: 'SecureFinance2024!@#',
        firstName: 'Trans',
        lastName: 'User1',
      });

    assertCookieAuthResponse(registerResponse1);
    testUserId = registerResponse1.body.user.id;
    userCookies = getCookieHeader(registerResponse1);
    userCsrfToken = extractCsrfToken(registerResponse1);

    await prisma.user.update({
      where: { id: testUserId },
      data: {
        status: 'ACTIVE',
        familyId: testFamilyId
      },
    });

    const registerResponse2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'transuser2@example.com',
        password: 'Banking#Secure$2024',
        firstName: 'Trans',
        lastName: 'User2',
      });

    assertCookieAuthResponse(registerResponse2);
    testUserId2 = registerResponse2.body.user.id;
    user2Cookies = getCookieHeader(registerResponse2);
    user2CsrfToken = extractCsrfToken(registerResponse2);

    await prisma.user.update({
      where: { id: testUserId2 },
      data: {
        status: 'ACTIVE',
        familyId: testFamilyId2
      },
    });

    // Create admin user
    const adminRegisterResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'transadmin@example.com',
        password: 'SuperSecure!Finance2024#',
        firstName: 'Trans',
        lastName: 'Admin',
      });

    assertCookieAuthResponse(adminRegisterResponse);
    const adminUserId = adminRegisterResponse.body.user.id;
    adminCookies = getCookieHeader(adminRegisterResponse);
    adminCsrfToken = extractCsrfToken(adminRegisterResponse);

    await prisma.user.update({
      where: { id: adminUserId },
      data: {
        role: UserRole.ADMIN,
        status: 'ACTIVE',
        familyId: testFamilyId,
      },
    });

    // Create test accounts
    testAccountId = (await prisma.account.create({
      data: {
        name: 'Test Checking',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 1000,
        currency: 'USD',
        userId: testUserId,
      },
    })).id;

    testAccount2Id = (await prisma.account.create({
      data: {
        name: 'Other User Account',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 2000,
        currency: 'USD',
        userId: testUserId2,
      },
    })).id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean transactions before each test
    await prisma.transaction.deleteMany({});
  });

  describe('POST /transactions - Create Transaction', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          accountId: testAccountId,
          amount: 50.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Test',
          date: '2024-01-15',
        })
        .expect(401);
    });

    it('should create transaction for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccountId,
          amount: 75.50,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Groceries at Whole Foods',
          merchantName: 'Whole Foods',
          date: '2024-01-15',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        accountId: testAccountId,
        amount: 75.50,
        type: TransactionType.DEBIT,
        description: 'Groceries at Whole Foods',
        merchantName: 'Whole Foods',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.displayAmount).toBe(-75.50); // Negative for debits
      expect(response.body.isDebit).toBe(true);
      expect(response.body.isManualTransaction).toBe(true);

      testTransactionId = response.body.id;
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          // Missing required fields
          amount: 100,
        })
        .expect(400);

      const messages = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(messages).toContain('accountId');
      expect(messages).toContain('type');
      expect(messages).toContain('description');
      expect(messages).toContain('date');
    });

    it('should reject negative amount', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccountId,
          amount: -50.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Invalid',
          date: '2024-01-15',
        })
        .expect(400);
    });

    it('should reject transaction for other user account', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccount2Id, // Other user's account
          amount: 100.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Unauthorized',
          date: '2024-01-15',
        })
        .expect(403);
    });

    it('should create income transaction (CREDIT)', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccountId,
          amount: 2500.00,
          type: TransactionType.CREDIT,
          source: TransactionSource.MANUAL,
          description: 'Salary deposit',
          date: '2024-01-01',
        })
        .expect(201);

      expect(response.body.type).toBe(TransactionType.CREDIT);
      expect(response.body.displayAmount).toBe(2500.00); // Positive for credits
      expect(response.body.isCredit).toBe(true);
    });

    it('should set default values', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccountId,
          amount: 25.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Minimal transaction',
          date: '2024-01-15',
        })
        .expect(201);

      expect(response.body.status).toBe(TransactionStatus.POSTED);
      expect(response.body.currency).toBe('USD');
      expect(response.body.isPending).toBe(false);
      expect(response.body.isRecurring).toBe(false);
      expect(response.body.isHidden).toBe(false);
      expect(response.body.includeInBudget).toBe(true);
    });
  });

  describe('GET /transactions - List Transactions', () => {
    beforeEach(async () => {
      // Create test transactions
      await prisma.transaction.createMany({
        data: [
          {
            accountId: testAccountId,
            amount: 50.00,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Groceries',
            merchantName: 'Supermarket',
            date: new Date('2024-01-15'),
            currency: 'USD',
          },
          {
            accountId: testAccountId,
            amount: 2000.00,
            type: TransactionType.CREDIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Salary',
            date: new Date('2024-01-01'),
            currency: 'USD',
          },
          {
            accountId: testAccount2Id,
            amount: 100.00,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Other user transaction',
            date: new Date('2024-01-10'),
            currency: 'USD',
          },
        ],
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/transactions')
        .expect(401);
    });

    it('should return only user transactions', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((t: any) => t.accountId === testAccountId)).toBe(true);
    });

    it('should filter by account', async () => {
      const response = await request(app.getHttpServer())
        .get(`/transactions?accountId=${testAccountId}`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/transactions?type=${TransactionType.CREDIT}`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe(TransactionType.CREDIT);
    });

    it('should filter by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions?startDate=2024-01-10&endDate=2024-01-20')
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].description).toBe('Groceries');
    });

    it('should search by description', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions?search=salary')
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].description.toLowerCase()).toContain('salary');
    });

    it('should allow admin to see all transactions', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Cookie', adminCookies)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('GET /transactions/:id - Get Transaction', () => {
    beforeEach(async () => {
      const transaction = await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          amount: 125.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Test transaction',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });
      testTransactionId = transaction.id;
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/transactions/${testTransactionId}`)
        .expect(401);
    });

    it('should return transaction details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/transactions/${testTransactionId}`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testTransactionId,
        amount: 125.00,
        description: 'Test transaction',
      });
    });

    it('should return 404 for non-existent transaction', async () => {
      await request(app.getHttpServer())
        .get('/transactions/00000000-0000-0000-0000-000000000000')
        .set('Cookie', userCookies)
        .expect(404);
    });

    it('should return 403 for other user transaction', async () => {
      const otherTransaction = await prisma.transaction.create({
        data: {
          accountId: testAccount2Id,
          amount: 50.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Other user',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      await request(app.getHttpServer())
        .get(`/transactions/${otherTransaction.id}`)
        .set('Cookie', userCookies)
        .expect(403);
    });

    it('should allow admin to access any transaction', async () => {
      const response = await request(app.getHttpServer())
        .get(`/transactions/${testTransactionId}`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(response.body.id).toBe(testTransactionId);
    });
  });

  describe('PATCH /transactions/:id - Update Transaction', () => {
    beforeEach(async () => {
      const transaction = await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          amount: 100.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Original description',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });
      testTransactionId = transaction.id;
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/transactions/${testTransactionId}`)
        .send({ description: 'Updated' })
        .expect(401);
    });

    it('should update transaction description', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/transactions/${testTransactionId}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({ description: 'Updated description' })
        .expect(200);

      expect(response.body.description).toBe('Updated description');
      expect(response.body.amount).toBe(100.00); // Unchanged
    });

    it('should update partial fields', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/transactions/${testTransactionId}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          merchantName: 'Updated Merchant',
          notes: 'Added notes'
        })
        .expect(200);

      expect(response.body.merchantName).toBe('Updated Merchant');
      expect(response.body.notes).toBe('Added notes');
      expect(response.body.description).toBe('Original description'); // Unchanged
    });

    it('should return 403 for other user transaction', async () => {
      const otherTransaction = await prisma.transaction.create({
        data: {
          accountId: testAccount2Id,
          amount: 50.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Other user',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      await request(app.getHttpServer())
        .patch(`/transactions/${otherTransaction.id}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({ description: 'Hacked' })
        .expect(403);
    });

    it('should allow admin to update any transaction', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/transactions/${testTransactionId}`)
        .set('Cookie', adminCookies)
        .set('X-CSRF-Token', adminCsrfToken!)
        .send({ description: 'Admin updated' })
        .expect(200);

      expect(response.body.description).toBe('Admin updated');
    });
  });

  describe('DELETE /transactions/:id - Delete Transaction', () => {
    beforeEach(async () => {
      const transaction = await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          amount: 50.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'To be deleted',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });
      testTransactionId = transaction.id;
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/transactions/${testTransactionId}`)
        .expect(401);
    });

    it('should delete transaction', async () => {
      await request(app.getHttpServer())
        .delete(`/transactions/${testTransactionId}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(204);

      // Verify deletion
      const transaction = await prisma.transaction.findUnique({
        where: { id: testTransactionId },
      });
      expect(transaction).toBeNull();
    });

    it('should return 403 for other user transaction', async () => {
      const otherTransaction = await prisma.transaction.create({
        data: {
          accountId: testAccount2Id,
          amount: 75.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Other user',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      await request(app.getHttpServer())
        .delete(`/transactions/${otherTransaction.id}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(403);

      // Verify still exists
      const transaction = await prisma.transaction.findUnique({
        where: { id: otherTransaction.id },
      });
      expect(transaction).not.toBeNull();
    });

    it('should return 404 for non-existent transaction', async () => {
      await request(app.getHttpServer())
        .delete('/transactions/00000000-0000-0000-0000-000000000000')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(404);
    });

    it('should allow admin to delete any transaction', async () => {
      await request(app.getHttpServer())
        .delete(`/transactions/${testTransactionId}`)
        .set('Cookie', adminCookies)
        .set('X-CSRF-Token', adminCsrfToken!)
        .expect(204);

      const transaction = await prisma.transaction.findUnique({
        where: { id: testTransactionId },
      });
      expect(transaction).toBeNull();
    });
  });

  describe('Complete Transaction Lifecycle', () => {
    it('should handle complete CRUD flow with authorization', async () => {
      // 1. Create transaction
      const createResponse = await request(app.getHttpServer())
        .post('/transactions')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccountId,
          amount: 150.00,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          description: 'Lifecycle test',
          merchantName: 'Test Merchant',
          date: '2024-01-15',
        })
        .expect(201);

      const transactionId = createResponse.body.id;

      // 2. Read transaction (GET - no CSRF token)
      const readResponse = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(readResponse.body.id).toBe(transactionId);

      // 3. Update transaction (PATCH - requires CSRF token)
      const updateResponse = await request(app.getHttpServer())
        .patch(`/transactions/${transactionId}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          description: 'Updated lifecycle',
          notes: 'Added notes during lifecycle test'
        })
        .expect(200);

      expect(updateResponse.body.description).toBe('Updated lifecycle');
      expect(updateResponse.body.notes).toBe('Added notes during lifecycle test');

      // 4. Delete transaction (DELETE - requires CSRF token)
      await request(app.getHttpServer())
        .delete(`/transactions/${transactionId}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(204);

      // 5. Verify deletion (GET - no CSRF token)
      await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .set('Cookie', userCookies)
        .expect(404);
    });
  });
});
