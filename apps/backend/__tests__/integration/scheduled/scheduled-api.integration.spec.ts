/**
 * Scheduled Transactions API Integration Tests
 *
 * Tests the complete scheduled transaction lifecycle with real database operations:
 * - CRUD operations with database persistence
 * - Recurrence rule calculations
 * - Upcoming transactions retrieval
 * - Calendar events generation
 * - Skip and complete functionality
 * - Generate from liabilities
 *
 * @phase Phase 5 - Scheduled Transactions Module
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
import {
  setupTestDatabase,
  teardownTestDatabase,
} from '../../../src/core/database/tests/database-test.config';
import {
  AccountType,
  AccountSource,
  TransactionType,
  RecurrenceFrequency,
  ScheduledTransactionStatus,
  LiabilityType,
  LiabilityStatus,
  PrismaClient,
} from '../../../generated/prisma';
import {
  getCookieHeader,
  extractCsrfToken,
  assertCookieAuthResponse,
} from '../../helpers/cookie-auth.helper';

describe('Scheduled Transactions API Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // Test fixtures
  let testUserId: string;
  let testFamilyId: string;
  let testAccountId: string;
  let testCategoryId: string;

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
    const sessionSecret =
      process.env.SESSION_SECRET || 'test-session-secret-min-32-characters-long';
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
      data: { name: 'Scheduled Test Family' },
    });
    testFamilyId = family.id;

    // Create and register test user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'scheduledtest@example.com',
        password: 'SecureFinance2024!@#',
        firstName: 'Scheduled',
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

    // Create test account
    const account = await prisma.account.create({
      data: {
        name: 'Test Checking Account',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 5000,
        currency: 'USD',
        userId: testUserId,
      },
    });
    testAccountId = account.id;

    // Create test category
    const category = await prisma.category.create({
      data: {
        name: 'Bills & Utilities',
        slug: 'bills-utilities',
        type: 'EXPENSE',
        icon: '💡',
        color: '#FFA500',
        familyId: testFamilyId,
      },
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
    // Clean scheduled transactions and recurrence rules between tests
    await prisma.scheduledTransaction.deleteMany({});
    await prisma.recurrenceRule.deleteMany({});
  });

  describe('CRUD Operations', () => {
    it('should create a one-time scheduled transaction', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app.getHttpServer())
        .post('/scheduled')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccountId,
          amount: 150.0,
          type: TransactionType.DEBIT,
          description: 'Electric Bill',
          nextDueDate: tomorrow.toISOString().split('T')[0],
          categoryId: testCategoryId,
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.amount).toBe(150);
      expect(response.body.description).toBe('Electric Bill');
      expect(response.body.status).toBe(ScheduledTransactionStatus.ACTIVE);
      expect(response.body.recurrenceRule).toBeFalsy(); // undefined for one-time transactions

      // Verify in database
      const dbRecord = await prisma.scheduledTransaction.findUnique({
        where: { id: response.body.id },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.amount.toNumber()).toBe(150);
    });

    it('should create a recurring scheduled transaction', async () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);

      const response = await request(app.getHttpServer())
        .post('/scheduled')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccountId,
          amount: 99.99,
          type: TransactionType.DEBIT,
          description: 'Netflix Subscription',
          merchantName: 'Netflix',
          nextDueDate: nextMonth.toISOString().split('T')[0],
          recurrenceRule: {
            frequency: RecurrenceFrequency.MONTHLY,
            interval: 1,
            dayOfMonth: 1,
          },
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.recurrenceRule).not.toBeNull();
      expect(response.body.recurrenceRule.frequency).toBe(RecurrenceFrequency.MONTHLY);
      expect(response.body.recurrenceRule.interval).toBe(1);
      expect(response.body.recurrenceRule.dayOfMonth).toBe(1);
      expect(response.body.recurrenceDescription).toBeDefined();

      // Verify recurrence rule in database
      const dbRule = await prisma.recurrenceRule.findUnique({
        where: { id: response.body.recurrenceRule.id },
      });
      expect(dbRule).not.toBeNull();
      expect(dbRule?.frequency).toBe(RecurrenceFrequency.MONTHLY);
    });

    it('should get a scheduled transaction by id', async () => {
      // Create first
      const scheduled = await prisma.scheduledTransaction.create({
        data: {
          familyId: testFamilyId,
          accountId: testAccountId,
          amount: 200,
          type: TransactionType.DEBIT,
          description: 'Test Transaction',
          nextDueDate: new Date(),
          status: ScheduledTransactionStatus.ACTIVE,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/scheduled/${scheduled.id}`)
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body.id).toBe(scheduled.id);
      expect(response.body.amount).toBe(200);
      expect(response.body.description).toBe('Test Transaction');
      expect(response.body.isOverdue).toBeDefined();
      expect(response.body.daysUntilDue).toBeDefined();
    });

    it('should list all scheduled transactions', async () => {
      // Create multiple scheduled transactions
      await prisma.scheduledTransaction.createMany({
        data: [
          {
            familyId: testFamilyId,
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            description: 'Transaction 1',
            nextDueDate: new Date(),
            status: ScheduledTransactionStatus.ACTIVE,
          },
          {
            familyId: testFamilyId,
            accountId: testAccountId,
            amount: 200,
            type: TransactionType.CREDIT,
            description: 'Transaction 2',
            nextDueDate: new Date(),
            status: ScheduledTransactionStatus.ACTIVE,
          },
          {
            familyId: testFamilyId,
            accountId: testAccountId,
            amount: 300,
            type: TransactionType.DEBIT,
            description: 'Transaction 3',
            nextDueDate: new Date(),
            status: ScheduledTransactionStatus.PAUSED,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/scheduled')
        .set('Cookie', userCookies)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
    });

    it('should filter scheduled transactions by status', async () => {
      await prisma.scheduledTransaction.createMany({
        data: [
          {
            familyId: testFamilyId,
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            description: 'Active 1',
            nextDueDate: new Date(),
            status: ScheduledTransactionStatus.ACTIVE,
          },
          {
            familyId: testFamilyId,
            accountId: testAccountId,
            amount: 200,
            type: TransactionType.DEBIT,
            description: 'Paused 1',
            nextDueDate: new Date(),
            status: ScheduledTransactionStatus.PAUSED,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/scheduled?status=ACTIVE')
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe(ScheduledTransactionStatus.ACTIVE);
    });

    it('should update a scheduled transaction', async () => {
      const scheduled = await prisma.scheduledTransaction.create({
        data: {
          familyId: testFamilyId,
          accountId: testAccountId,
          amount: 100,
          type: TransactionType.DEBIT,
          description: 'Original Description',
          nextDueDate: new Date(),
          status: ScheduledTransactionStatus.ACTIVE,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/scheduled/${scheduled.id}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          amount: 150,
          description: 'Updated Description',
        })
        .expect(200);

      expect(response.body.amount).toBe(150);
      expect(response.body.description).toBe('Updated Description');

      // Verify in database
      const dbRecord = await prisma.scheduledTransaction.findUnique({
        where: { id: scheduled.id },
      });
      expect(dbRecord?.amount.toNumber()).toBe(150);
    });

    it('should delete a scheduled transaction', async () => {
      const scheduled = await prisma.scheduledTransaction.create({
        data: {
          familyId: testFamilyId,
          accountId: testAccountId,
          amount: 100,
          type: TransactionType.DEBIT,
          description: 'To Delete',
          nextDueDate: new Date(),
          status: ScheduledTransactionStatus.ACTIVE,
        },
      });

      await request(app.getHttpServer())
        .delete(`/scheduled/${scheduled.id}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(204); // No Content on successful delete

      // Verify deleted from database
      const dbRecord = await prisma.scheduledTransaction.findUnique({
        where: { id: scheduled.id },
      });
      expect(dbRecord).toBeNull();
    });
  });

  describe('Recurrence Rules', () => {
    it('should add recurrence rule to existing transaction', async () => {
      const scheduled = await prisma.scheduledTransaction.create({
        data: {
          familyId: testFamilyId,
          accountId: testAccountId,
          amount: 50,
          type: TransactionType.DEBIT,
          description: 'One-time to Recurring',
          nextDueDate: new Date(),
          status: ScheduledTransactionStatus.ACTIVE,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/scheduled/${scheduled.id}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          recurrenceRule: {
            frequency: RecurrenceFrequency.WEEKLY,
            interval: 2,
            dayOfWeek: 1, // Monday
          },
        })
        .expect(200);

      expect(response.body.recurrenceRule).not.toBeNull();
      expect(response.body.recurrenceRule.frequency).toBe(RecurrenceFrequency.WEEKLY);
      expect(response.body.recurrenceRule.interval).toBe(2);
      expect(response.body.recurrenceRule.dayOfWeek).toBe(1);
    });

    it('should remove recurrence rule from transaction', async () => {
      // Create with recurrence using relationship syntax
      const scheduled = await prisma.scheduledTransaction.create({
        data: {
          familyId: testFamilyId,
          accountId: testAccountId,
          amount: 100,
          type: TransactionType.DEBIT,
          description: 'Recurring to One-time',
          nextDueDate: new Date(),
          status: ScheduledTransactionStatus.ACTIVE,
          recurrenceRule: {
            create: {
              frequency: RecurrenceFrequency.MONTHLY,
              interval: 1,
            },
          },
        },
        include: { recurrenceRule: true },
      });

      const response = await request(app.getHttpServer())
        .patch(`/scheduled/${scheduled.id}`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          recurrenceRule: null,
        })
        .expect(200);

      // recurrenceRule should be null or undefined when removed
      expect(response.body.recurrenceRule).toBeFalsy();
    });

    it('should create biweekly recurrence correctly', async () => {
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + 14);

      const response = await request(app.getHttpServer())
        .post('/scheduled')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccountId,
          amount: 2500,
          type: TransactionType.CREDIT,
          description: 'Biweekly Salary',
          nextDueDate: nextDue.toISOString().split('T')[0],
          recurrenceRule: {
            frequency: RecurrenceFrequency.BIWEEKLY,
          },
        })
        .expect(201);

      expect(response.body.recurrenceRule.frequency).toBe(RecurrenceFrequency.BIWEEKLY);
      expect(response.body.recurrenceRule.interval).toBe(1);
    });
  });

  describe('Upcoming Transactions', () => {
    it('should return upcoming scheduled transactions within date range', async () => {
      const today = new Date();
      const in5Days = new Date(today);
      in5Days.setDate(today.getDate() + 5);
      const in15Days = new Date(today);
      in15Days.setDate(today.getDate() + 15);
      const in45Days = new Date(today);
      in45Days.setDate(today.getDate() + 45);

      await prisma.scheduledTransaction.createMany({
        data: [
          {
            familyId: testFamilyId,
            accountId: testAccountId,
            amount: 100,
            type: TransactionType.DEBIT,
            description: 'Due in 5 days',
            nextDueDate: in5Days,
            status: ScheduledTransactionStatus.ACTIVE,
          },
          {
            familyId: testFamilyId,
            accountId: testAccountId,
            amount: 200,
            type: TransactionType.DEBIT,
            description: 'Due in 15 days',
            nextDueDate: in15Days,
            status: ScheduledTransactionStatus.ACTIVE,
          },
          {
            familyId: testFamilyId,
            accountId: testAccountId,
            amount: 300,
            type: TransactionType.DEBIT,
            description: 'Due in 45 days',
            nextDueDate: in45Days,
            status: ScheduledTransactionStatus.ACTIVE,
          },
        ],
      });

      // Default 30 days
      const response = await request(app.getHttpServer())
        .get('/scheduled/upcoming')
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body.length).toBe(2); // Only first two within 30 days
      expect(response.body[0].description).toBe('Due in 5 days');
      expect(response.body[1].description).toBe('Due in 15 days');
    });

    it('should return overdue transactions in upcoming', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.scheduledTransaction.create({
        data: {
          familyId: testFamilyId,
          accountId: testAccountId,
          amount: 500,
          type: TransactionType.DEBIT,
          description: 'Overdue Bill',
          nextDueDate: yesterday,
          status: ScheduledTransactionStatus.ACTIVE,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/scheduled/upcoming')
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].isOverdue).toBe(true);
      expect(response.body[0].daysUntilDue).toBeLessThan(0);
    });
  });

  describe('Calendar Events', () => {
    it('should return calendar events for date range', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const midMonth = new Date(startDate);
      midMonth.setDate(15);

      await prisma.scheduledTransaction.create({
        data: {
          familyId: testFamilyId,
          accountId: testAccountId,
          amount: 150,
          type: TransactionType.DEBIT,
          description: 'Monthly Bill',
          categoryId: testCategoryId,
          nextDueDate: midMonth,
          status: ScheduledTransactionStatus.ACTIVE,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/scheduled/calendar')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .set('Cookie', userCookies)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].description).toBe('Monthly Bill');
      expect(response.body[0].category).toBeDefined();
    });
  });

  describe('Skip and Complete', () => {
    it('should skip next occurrence and advance date', async () => {
      const today = new Date();
      const nextDue = new Date(today);
      nextDue.setDate(1);
      nextDue.setMonth(nextDue.getMonth() + 1);

      const scheduled = await prisma.scheduledTransaction.create({
        data: {
          familyId: testFamilyId,
          accountId: testAccountId,
          amount: 100,
          type: TransactionType.DEBIT,
          description: 'Monthly Subscription',
          nextDueDate: nextDue,
          status: ScheduledTransactionStatus.ACTIVE,
          recurrenceRule: {
            create: {
              frequency: RecurrenceFrequency.MONTHLY,
              interval: 1,
              dayOfMonth: 1,
            },
          },
        },
      });

      const originalNextDue = new Date(scheduled.nextDueDate);

      const response = await request(app.getHttpServer())
        .post(`/scheduled/${scheduled.id}/skip`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(201);

      // Next due date should be advanced by one month
      const newNextDue = new Date(response.body.nextDueDate);
      expect(newNextDue.getMonth()).toBe((originalNextDue.getMonth() + 1) % 12);
    });

    it('should mark as completed and advance date for recurring', async () => {
      const today = new Date();
      const nextDue = new Date(today);
      nextDue.setDate(today.getDate() + 7);

      const scheduled = await prisma.scheduledTransaction.create({
        data: {
          familyId: testFamilyId,
          accountId: testAccountId,
          amount: 50,
          type: TransactionType.DEBIT,
          description: 'Weekly Payment',
          nextDueDate: nextDue,
          status: ScheduledTransactionStatus.ACTIVE,
          recurrenceRule: {
            create: {
              frequency: RecurrenceFrequency.WEEKLY,
              interval: 1,
            },
          },
        },
      });

      const originalNextDue = new Date(scheduled.nextDueDate);

      const response = await request(app.getHttpServer())
        .post(`/scheduled/${scheduled.id}/complete`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(201);

      // Should have lastExecutedAt set
      expect(response.body.lastExecutedAt).not.toBeNull();

      // Next due date should be advanced by one week
      const newNextDue = new Date(response.body.nextDueDate);
      const expectedNextDue = new Date(originalNextDue);
      expectedNextDue.setDate(expectedNextDue.getDate() + 7);
      expect(newNextDue.toDateString()).toBe(expectedNextDue.toDateString());
    });

    it('should mark one-time transaction as completed', async () => {
      const scheduled = await prisma.scheduledTransaction.create({
        data: {
          familyId: testFamilyId,
          accountId: testAccountId,
          amount: 500,
          type: TransactionType.DEBIT,
          description: 'One-time Payment',
          nextDueDate: new Date(),
          status: ScheduledTransactionStatus.ACTIVE,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/scheduled/${scheduled.id}/complete`)
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(201);

      expect(response.body.status).toBe(ScheduledTransactionStatus.COMPLETED);
    });
  });

  describe('Generate from Liabilities', () => {
    it('should generate scheduled transactions from active liabilities', async () => {
      // Create a liability with monthly payment due on the 15th
      await prisma.liability.create({
        data: {
          familyId: testFamilyId,
          accountId: testAccountId,
          name: 'Credit Card Payment',
          type: LiabilityType.CREDIT_CARD,
          status: LiabilityStatus.ACTIVE,
          currentBalance: 1500,
          minimumPayment: 50,
          interestRate: 19.99,
          currency: 'USD',
          paymentDueDay: 15, // Day of month for payment
          billingCycleDay: 1, // Day of month for billing cycle start
        },
      });

      const response = await request(app.getHttpServer())
        .post('/scheduled/generate-from-liabilities')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].description).toContain('Credit Card Payment');
      expect(response.body[0].recurrenceRule).not.toBeNull();
      expect(response.body[0].recurrenceRule.frequency).toBe(RecurrenceFrequency.MONTHLY);
    });
  });

  describe('Validation', () => {
    it('should reject invalid amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/scheduled')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccountId,
          amount: -100,
          type: TransactionType.DEBIT,
          description: 'Invalid Amount',
          nextDueDate: new Date().toISOString().split('T')[0],
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject missing description', async () => {
      const response = await request(app.getHttpServer())
        .post('/scheduled')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccountId,
          amount: 100,
          type: TransactionType.DEBIT,
          // description is missing
          nextDueDate: new Date().toISOString().split('T')[0],
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject invalid recurrence frequency', async () => {
      const response = await request(app.getHttpServer())
        .post('/scheduled')
        .set('Cookie', userCookies)
        .set('X-CSRF-Token', userCsrfToken!)
        .send({
          accountId: testAccountId,
          amount: 100,
          type: TransactionType.DEBIT,
          description: 'Test',
          nextDueDate: new Date().toISOString().split('T')[0],
          recurrenceRule: {
            frequency: 'INVALID',
            interval: 1,
          },
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/scheduled').expect(401);
    });

    it('should not allow access to other family scheduled transactions', async () => {
      // Create another family and scheduled transaction
      const otherFamily = await prisma.family.create({
        data: { name: 'Other Family' },
      });

      const otherAccount = await prisma.account.create({
        data: {
          name: 'Other Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
          currency: 'USD',
          familyId: otherFamily.id,
        },
      });

      const otherScheduled = await prisma.scheduledTransaction.create({
        data: {
          familyId: otherFamily.id,
          accountId: otherAccount.id,
          amount: 100,
          type: TransactionType.DEBIT,
          description: 'Other Family Transaction',
          nextDueDate: new Date(),
          status: ScheduledTransactionStatus.ACTIVE,
        },
      });

      // Try to access it with our user
      await request(app.getHttpServer())
        .get(`/scheduled/${otherScheduled.id}`)
        .set('Cookie', userCookies)
        .expect(404);
    });
  });
});
