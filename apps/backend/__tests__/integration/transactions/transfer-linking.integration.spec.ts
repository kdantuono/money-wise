/**
 * Transfer Linking API Integration Tests
 *
 * Tests the transfer linking endpoints with real authentication
 * and database operations.
 *
 * Coverage:
 * - POST /transactions/link-transfer - Link two transactions as transfer
 * - POST /transactions/unlink-transfer/:id - Unlink a transfer
 * - GET /transactions/transfer-suggestions - Get suggested transfers
 * - GET /transactions/:id/transfer-matches - Get matches for transaction
 * - Authorization checks for all endpoints
 *
 * @phase STORY-1.5.7 - Phase 2 Transaction Enhancement
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
  FlowType,
  UserRole,
  PrismaClient
} from '../../../generated/prisma';
import {
  getCookieHeader,
  extractCsrfToken,
  assertCookieAuthResponse,
} from '../../helpers/cookie-auth.helper';
import { createMockRedis } from '../../mocks/redis.mock';

describe('Transfer Linking API Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // Mock Redis for session/token storage
  const mockRedisClient = createMockRedis();

  // Test fixtures
  let testUserId: string;
  let testUserId2: string;
  let testFamilyId: string;
  let testFamilyId2: string;
  let testAccount1Id: string;
  let testAccount2Id: string;
  let otherUserAccountId: string;

  // Authentication
  let userCookies: string;
  let user2Cookies: string;
  let userCsrfToken: string | null;
  let user2CsrfToken: string | null;

  beforeAll(async () => {
    prisma = await setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider('default') // Override Redis provider
      .useValue(mockRedisClient)
      .compile();

    app = moduleFixture.createNestApplication();

    // Initialize middleware
    const sessionSecret = process.env.SESSION_SECRET || 'test-session-secret-min-32-characters-long';
    const cookieParserMiddleware = (await import('cookie-parser')).default;
    app.use(cookieParserMiddleware(sessionSecret));

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
      data: { name: 'Transfer Test Family 1' },
    });
    testFamilyId = family1.id;

    const family2 = await prisma.family.create({
      data: { name: 'Transfer Test Family 2' },
    });
    testFamilyId2 = family2.id;

    // Create test user 1 with unique email prefix to avoid conflicts
    const uniquePrefix = `tl${Date.now()}`;
    const registerResponse1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `${uniquePrefix}-user1@example.com`,
        password: 'SecureTransfer2024!@#',
        firstName: 'Transfer',
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
        familyId: testFamilyId,
      },
    });

    // Create test user 2 (different family)
    const registerResponse2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `${uniquePrefix}-user2@example.com`,
        password: 'Banking#Secure$2024',
        firstName: 'Transfer',
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
        familyId: testFamilyId2,
      },
    });

    // Create test accounts
    testAccount1Id = (await prisma.account.create({
      data: {
        name: 'Checking Account',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 5000,
        currency: 'USD',
        userId: testUserId,
        familyId: testFamilyId,
      },
    })).id;

    testAccount2Id = (await prisma.account.create({
      data: {
        name: 'Savings Account',
        type: AccountType.SAVINGS,
        source: AccountSource.MANUAL,
        currentBalance: 10000,
        currency: 'USD',
        userId: testUserId,
        familyId: testFamilyId,
      },
    })).id;

    otherUserAccountId = (await prisma.account.create({
      data: {
        name: 'Other User Account',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 3000,
        currency: 'USD',
        userId: testUserId2,
        familyId: testFamilyId2,
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
    // Note: We don't reset Redis mock between tests to preserve auth session cookies
  });

  describe('POST /transactions/link-transfer - Link Transactions', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/transactions/link-transfer')
        .send({ transactionIds: ['id1', 'id2'] })
        .expect(401);
    });

    it('should link two transactions as transfer successfully', async () => {
      // Create a DEBIT (outgoing transfer from checking)
      const debitTx = await prisma.transaction.create({
        data: {
          accountId: testAccount1Id,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Transfer to Savings',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      // Create a CREDIT (incoming transfer to savings)
      const creditTx = await prisma.transaction.create({
        data: {
          accountId: testAccount2Id,
          amount: 500,
          type: TransactionType.CREDIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Transfer from Checking',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/transactions/link-transfer')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({ transactionIds: [debitTx.id, creditTx.id] })
        .expect(201);

      expect(response.body).toMatchObject({
        transferGroupId: expect.any(String),
        linkedCount: 2,
      });

      // Verify transactions were updated
      const updatedDebit = await prisma.transaction.findUnique({
        where: { id: debitTx.id },
      });
      const updatedCredit = await prisma.transaction.findUnique({
        where: { id: creditTx.id },
      });

      expect(updatedDebit?.transferGroupId).toBe(response.body.transferGroupId);
      expect(updatedCredit?.transferGroupId).toBe(response.body.transferGroupId);
      expect(updatedDebit?.flowType).toBe(FlowType.TRANSFER);
      expect(updatedCredit?.flowType).toBe(FlowType.TRANSFER);
      expect(updatedDebit?.transferRole).toBe('SOURCE');
      expect(updatedCredit?.transferRole).toBe('DESTINATION');
    });

    it('should reject linking transactions with same type', async () => {
      const debit1 = await prisma.transaction.create({
        data: {
          accountId: testAccount1Id,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Debit 1',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      const debit2 = await prisma.transaction.create({
        data: {
          accountId: testAccount2Id,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Debit 2',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      await request(app.getHttpServer())
        .post('/transactions/link-transfer')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({ transactionIds: [debit1.id, debit2.id] })
        .expect(400);
    });

    it('should reject linking more than 2 transactions', async () => {
      await request(app.getHttpServer())
        .post('/transactions/link-transfer')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({ transactionIds: ['id1', 'id2', 'id3'] })
        .expect(400);
    });

    it('should reject linking less than 2 transactions', async () => {
      await request(app.getHttpServer())
        .post('/transactions/link-transfer')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({ transactionIds: ['id1'] })
        .expect(400);
    });

    it('should return 404 for non-existent transaction', async () => {
      const validTx = await prisma.transaction.create({
        data: {
          accountId: testAccount1Id,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Valid transaction',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      await request(app.getHttpServer())
        .post('/transactions/link-transfer')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          transactionIds: [validTx.id, '00000000-0000-0000-0000-000000000000'],
        })
        .expect(404);
    });

    it('should return 403 for transactions from other user', async () => {
      // Create transaction for user 1
      const userTx = await prisma.transaction.create({
        data: {
          accountId: testAccount1Id,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'User 1 transaction',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      // Create transaction for user 2
      const otherUserTx = await prisma.transaction.create({
        data: {
          accountId: otherUserAccountId,
          amount: 500,
          type: TransactionType.CREDIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'User 2 transaction',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      // User 1 tries to link their transaction with user 2's transaction
      await request(app.getHttpServer())
        .post('/transactions/link-transfer')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({ transactionIds: [userTx.id, otherUserTx.id] })
        .expect(403);
    });

    it('should accept custom transferGroupId', async () => {
      const debitTx = await prisma.transaction.create({
        data: {
          accountId: testAccount1Id,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Debit',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      const creditTx = await prisma.transaction.create({
        data: {
          accountId: testAccount2Id,
          amount: 500,
          type: TransactionType.CREDIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Credit',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      const customGroupId = '11111111-1111-1111-1111-111111111111';

      const response = await request(app.getHttpServer())
        .post('/transactions/link-transfer')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          transactionIds: [debitTx.id, creditTx.id],
          transferGroupId: customGroupId,
        })
        .expect(201);

      expect(response.body.transferGroupId).toBe(customGroupId);
    });
  });

  describe('POST /transactions/unlink-transfer/:id - Unlink Transfer', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/transactions/unlink-transfer/some-id')
        .expect(401);
    });

    it('should unlink a transaction from transfer group', async () => {
      // Create linked transfer pair
      const transferGroupId = '22222222-2222-2222-2222-222222222222';

      const debitTx = await prisma.transaction.create({
        data: {
          accountId: testAccount1Id,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Linked Debit',
          date: new Date('2024-01-15'),
          currency: 'USD',
          transferGroupId,
          transferRole: 'SOURCE',
          flowType: FlowType.TRANSFER,
        },
      });

      const creditTx = await prisma.transaction.create({
        data: {
          accountId: testAccount2Id,
          amount: 500,
          type: TransactionType.CREDIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Linked Credit',
          date: new Date('2024-01-15'),
          currency: 'USD',
          transferGroupId,
          transferRole: 'DESTINATION',
          flowType: FlowType.TRANSFER,
        },
      });

      await request(app.getHttpServer())
        .post(`/transactions/unlink-transfer/${debitTx.id}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(204);

      // Both transactions should be unlinked (only 2 in group)
      const updatedDebit = await prisma.transaction.findUnique({
        where: { id: debitTx.id },
      });
      const updatedCredit = await prisma.transaction.findUnique({
        where: { id: creditTx.id },
      });

      expect(updatedDebit?.transferGroupId).toBeNull();
      expect(updatedCredit?.transferGroupId).toBeNull();
      expect(updatedDebit?.flowType).toBeNull();
      expect(updatedCredit?.flowType).toBeNull();
    });

    it('should return 404 for non-existent transaction', async () => {
      await request(app.getHttpServer())
        .post('/transactions/unlink-transfer/00000000-0000-0000-0000-000000000000')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(404);
    });

    it('should return 400 for transaction not in transfer group', async () => {
      const tx = await prisma.transaction.create({
        data: {
          accountId: testAccount1Id,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Not in transfer',
          date: new Date('2024-01-15'),
          currency: 'USD',
          transferGroupId: null,
        },
      });

      await request(app.getHttpServer())
        .post(`/transactions/unlink-transfer/${tx.id}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(400);
    });

    it('should return 403 for transaction from other user', async () => {
      const transferGroupId = '33333333-3333-3333-3333-333333333333';

      const otherUserTx = await prisma.transaction.create({
        data: {
          accountId: otherUserAccountId,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Other user linked',
          date: new Date('2024-01-15'),
          currency: 'USD',
          transferGroupId,
          transferRole: 'SOURCE',
          flowType: FlowType.TRANSFER,
        },
      });

      // User 1 tries to unlink user 2's transaction
      await request(app.getHttpServer())
        .post(`/transactions/unlink-transfer/${otherUserTx.id}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(403);
    });
  });

  describe('GET /transactions/transfer-suggestions - Get Suggestions', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/transactions/transfer-suggestions')
        .expect(401);
    });

    it('should return transfer suggestions for user', async () => {
      // Create matching transactions
      await prisma.transaction.create({
        data: {
          accountId: testAccount1Id,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Transfer out',
          date: new Date('2024-01-15'),
          currency: 'USD',
          flowType: FlowType.EXPENSE,
        },
      });

      await prisma.transaction.create({
        data: {
          accountId: testAccount2Id,
          amount: 500,
          type: TransactionType.CREDIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Transfer in',
          date: new Date('2024-01-15'),
          currency: 'USD',
          flowType: FlowType.INCOME,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/transactions/transfer-suggestions')
        .set('Cookie', userCookies)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should not return already linked transactions', async () => {
      const transferGroupId = '44444444-4444-4444-4444-444444444444';

      // Create already linked transactions
      await prisma.transaction.create({
        data: {
          accountId: testAccount1Id,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Already linked',
          date: new Date('2024-01-15'),
          currency: 'USD',
          flowType: FlowType.TRANSFER,
          transferGroupId,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/transactions/transfer-suggestions')
        .set('Cookie', userCookies)
        .expect(200);

      // Should not include the already linked transaction
      const linkedSuggestions = response.body.filter(
        (s: any) => s.transactionId === transferGroupId,
      );
      expect(linkedSuggestions).toHaveLength(0);
    });
  });

  describe('GET /transactions/:id/transfer-matches - Get Matches for Transaction', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/transactions/some-id/transfer-matches')
        .expect(401);
    });

    it('should return potential matches for a transaction', async () => {
      // Create source transaction
      const sourceTx = await prisma.transaction.create({
        data: {
          accountId: testAccount1Id,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Source transaction',
          date: new Date('2024-01-15'),
          currency: 'USD',
          flowType: FlowType.EXPENSE,
        },
      });

      // Create potential match
      await prisma.transaction.create({
        data: {
          accountId: testAccount2Id,
          amount: 500,
          type: TransactionType.CREDIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Potential match',
          date: new Date('2024-01-15'),
          currency: 'USD',
          flowType: FlowType.INCOME,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/transactions/${sourceTx.id}/transfer-matches`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 404 for non-existent transaction', async () => {
      await request(app.getHttpServer())
        .get('/transactions/00000000-0000-0000-0000-000000000000/transfer-matches')
        .set('Cookie', userCookies)
        .expect(404);
    });

    it('should return 403 for transaction from other user', async () => {
      const otherUserTx = await prisma.transaction.create({
        data: {
          accountId: otherUserAccountId,
          amount: 500,
          type: TransactionType.DEBIT,
          source: TransactionSource.MANUAL,
          status: TransactionStatus.POSTED,
          description: 'Other user transaction',
          date: new Date('2024-01-15'),
          currency: 'USD',
        },
      });

      await request(app.getHttpServer())
        .get(`/transactions/${otherUserTx.id}/transfer-matches`)
        .set('Cookie', userCookies)
        .expect(403);
    });
  });
});
