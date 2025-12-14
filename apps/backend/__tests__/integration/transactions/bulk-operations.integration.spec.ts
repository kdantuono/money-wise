/**
 * Bulk Operations API Integration Tests
 *
 * Tests the bulk operations endpoint with real authentication
 * and database operations.
 *
 * Coverage:
 * - POST /transactions/bulk - Bulk categorize, delete, mark transfer
 * - Authorization checks
 * - Validation errors
 * - Partial success scenarios
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
  PrismaClient,
  CategoryType,
} from '../../../generated/prisma';
import {
  getCookieHeader,
  extractCsrfToken,
  assertCookieAuthResponse,
} from '../../helpers/cookie-auth.helper';
import { BulkOperation } from '../../../src/transactions/dto/bulk-operation.dto';
import { CategoryFactory } from '../../utils/factories/category.factory';

describe('Bulk Operations API Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // Test fixtures
  let testUserId: string;
  let testUserId2: string;
  let testFamilyId: string;
  let testFamilyId2: string;
  let testAccountId: string;
  let otherUserAccountId: string;
  let testCategoryId: string;

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
      data: { name: 'Bulk Test Family 1' },
    });
    testFamilyId = family1.id;

    const family2 = await prisma.family.create({
      data: { name: 'Bulk Test Family 2' },
    });
    testFamilyId2 = family2.id;

    // Create test category using factory
    const categoryData = CategoryFactory.buildExpenseCategory({
      familyId: testFamilyId,
      name: 'Test Category',
      slug: 'test-category',
    });
    // Remove auto-generated fields to let Prisma create them
    delete categoryData.id;
    delete categoryData.createdAt;
    delete categoryData.updatedAt;

    const category = await prisma.category.create({
      data: categoryData,
    });
    testCategoryId = category.id;

    // Create test user 1
    const registerResponse1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'bulkuser1@example.com',
        password: 'SecureBulk2024!@#',
        firstName: 'Bulk',
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
        email: 'bulkuser2@example.com',
        password: 'Banking#Secure$2024',
        firstName: 'Bulk',
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
    testAccountId = (await prisma.account.create({
      data: {
        name: 'Bulk Test Account',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 5000,
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
  });

  describe('POST /transactions/bulk - Bulk Operations', () => {
    describe('Authentication & Authorization', () => {
      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .post('/transactions/bulk')
          .send({
            transactionIds: ['id1'],
            operation: BulkOperation.CATEGORIZE,
            data: { categoryId: testCategoryId },
          })
          .expect(401);
      });

      it('should return 403 for transactions from other user', async () => {
        const otherUserTx = await prisma.transaction.create({
          data: {
            accountId: otherUserAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Other user transaction',
            date: new Date('2024-01-15'),
            currency: 'USD',
          },
        });

        await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: [otherUserTx.id],
            operation: BulkOperation.DELETE,
          })
          .expect(403);
      });

      it('should return 404 when some transactions do not exist', async () => {
        const validTx = await prisma.transaction.create({
          data: {
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Valid transaction',
            date: new Date('2024-01-15'),
            currency: 'USD',
          },
        });

        await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: [validTx.id, '00000000-0000-0000-0000-000000000000'],
            operation: BulkOperation.DELETE,
          })
          .expect(404);
      });
    });

    describe('Validation', () => {
      it('should reject empty transaction IDs array', async () => {
        await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: [],
            operation: BulkOperation.CATEGORIZE,
          })
          .expect(400);
      });

      it('should reject invalid operation', async () => {
        const tx = await prisma.transaction.create({
          data: {
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Test',
            date: new Date('2024-01-15'),
            currency: 'USD',
          },
        });

        await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: [tx.id],
            operation: 'invalid_operation',
          })
          .expect(400);
      });

      it('should reject invalid UUID in transaction IDs', async () => {
        await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: ['not-a-uuid'],
            operation: BulkOperation.DELETE,
          })
          .expect(400);
      });
    });

    describe('CATEGORIZE Operation', () => {
      it('should categorize multiple transactions', async () => {
        const tx1 = await prisma.transaction.create({
          data: {
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Transaction 1',
            date: new Date('2024-01-15'),
            currency: 'USD',
          },
        });

        const tx2 = await prisma.transaction.create({
          data: {
            accountId: testAccountId,
            amount: 200,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Transaction 2',
            date: new Date('2024-01-16'),
            currency: 'USD',
          },
        });

        const response = await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: [tx1.id, tx2.id],
            operation: BulkOperation.CATEGORIZE,
            data: { categoryId: testCategoryId },
          })
          .expect(201);

        expect(response.body).toMatchObject({
          affectedCount: 2,
          operation: BulkOperation.CATEGORIZE,
          success: true,
        });

        // Verify transactions were categorized
        const updatedTx1 = await prisma.transaction.findUnique({
          where: { id: tx1.id },
        });
        const updatedTx2 = await prisma.transaction.findUnique({
          where: { id: tx2.id },
        });

        expect(updatedTx1?.categoryId).toBe(testCategoryId);
        expect(updatedTx2?.categoryId).toBe(testCategoryId);
      });

      it('should require categoryId for categorize operation', async () => {
        const tx = await prisma.transaction.create({
          data: {
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Test',
            date: new Date('2024-01-15'),
            currency: 'USD',
          },
        });

        await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: [tx.id],
            operation: BulkOperation.CATEGORIZE,
            // Missing data.categoryId
          })
          .expect(400);
      });

      it('should categorize single transaction', async () => {
        const tx = await prisma.transaction.create({
          data: {
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Single transaction',
            date: new Date('2024-01-15'),
            currency: 'USD',
          },
        });

        const response = await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: [tx.id],
            operation: BulkOperation.CATEGORIZE,
            data: { categoryId: testCategoryId },
          })
          .expect(201);

        expect(response.body.affectedCount).toBe(1);
      });
    });

    describe('DELETE Operation', () => {
      it('should delete multiple transactions', async () => {
        const tx1 = await prisma.transaction.create({
          data: {
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'To delete 1',
            date: new Date('2024-01-15'),
            currency: 'USD',
          },
        });

        const tx2 = await prisma.transaction.create({
          data: {
            accountId: testAccountId,
            amount: 200,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'To delete 2',
            date: new Date('2024-01-16'),
            currency: 'USD',
          },
        });

        const response = await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: [tx1.id, tx2.id],
            operation: BulkOperation.DELETE,
          })
          .expect(201);

        expect(response.body).toMatchObject({
          affectedCount: 2,
          operation: BulkOperation.DELETE,
          success: true,
        });

        // Verify transactions were deleted
        const deletedTx1 = await prisma.transaction.findUnique({
          where: { id: tx1.id },
        });
        const deletedTx2 = await prisma.transaction.findUnique({
          where: { id: tx2.id },
        });

        expect(deletedTx1).toBeNull();
        expect(deletedTx2).toBeNull();
      });

      it('should not require data for delete operation', async () => {
        const tx = await prisma.transaction.create({
          data: {
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'To delete',
            date: new Date('2024-01-15'),
            currency: 'USD',
          },
        });

        await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: [tx.id],
            operation: BulkOperation.DELETE,
          })
          .expect(201);
      });
    });

    describe('MARK_TRANSFER Operation', () => {
      it('should mark transactions as transfer with auto-generated group ID', async () => {
        const tx1 = await prisma.transaction.create({
          data: {
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Transfer 1',
            date: new Date('2024-01-15'),
            currency: 'USD',
          },
        });

        const tx2 = await prisma.transaction.create({
          data: {
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.CREDIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Transfer 2',
            date: new Date('2024-01-15'),
            currency: 'USD',
          },
        });

        const response = await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: [tx1.id, tx2.id],
            operation: BulkOperation.MARK_TRANSFER,
          })
          .expect(201);

        expect(response.body).toMatchObject({
          affectedCount: 2,
          operation: BulkOperation.MARK_TRANSFER,
          success: true,
        });

        // Verify transactions were marked as transfer
        const updatedTx1 = await prisma.transaction.findUnique({
          where: { id: tx1.id },
        });
        const updatedTx2 = await prisma.transaction.findUnique({
          where: { id: tx2.id },
        });

        expect(updatedTx1?.flowType).toBe(FlowType.TRANSFER);
        expect(updatedTx2?.flowType).toBe(FlowType.TRANSFER);
        expect(updatedTx1?.transferGroupId).toBeDefined();
        expect(updatedTx1?.transferGroupId).toBe(updatedTx2?.transferGroupId);
      });

      it('should mark transactions with custom transfer group ID', async () => {
        const customGroupId = '55555555-5555-5555-5555-555555555555';

        const tx1 = await prisma.transaction.create({
          data: {
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            source: TransactionSource.MANUAL,
            status: TransactionStatus.POSTED,
            description: 'Transfer with custom ID',
            date: new Date('2024-01-15'),
            currency: 'USD',
          },
        });

        await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: [tx1.id],
            operation: BulkOperation.MARK_TRANSFER,
            data: { transferGroupId: customGroupId },
          })
          .expect(201);

        const updatedTx1 = await prisma.transaction.findUnique({
          where: { id: tx1.id },
        });

        expect(updatedTx1?.transferGroupId).toBe(customGroupId);
      });
    });

    describe('Large Batch Operations', () => {
      it('should handle batch of 10 transactions', async () => {
        const txIds: string[] = [];

        for (let i = 0; i < 10; i++) {
          const tx = await prisma.transaction.create({
            data: {
              accountId: testAccountId,
              amount: 100 + i,
              type: TransactionType.DEBIT,
              source: TransactionSource.MANUAL,
              status: TransactionStatus.POSTED,
              description: `Batch transaction ${i}`,
              date: new Date('2024-01-15'),
              currency: 'USD',
            },
          });
          txIds.push(tx.id);
        }

        const response = await request(app.getHttpServer())
          .post('/transactions/bulk')
          .set('Cookie', userCookies)
          .set('X-CSRF-Token', userCsrfToken!)
          .send({
            transactionIds: txIds,
            operation: BulkOperation.CATEGORIZE,
            data: { categoryId: testCategoryId },
          })
          .expect(201);

        expect(response.body.affectedCount).toBe(10);

        // Verify all transactions were categorized
        const updatedTxs = await prisma.transaction.findMany({
          where: { id: { in: txIds } },
        });

        expect(updatedTxs.every((tx) => tx.categoryId === testCategoryId)).toBe(true);
      });
    });
  });
});
