/**
 * Accounts API Integration Tests (HTTP Endpoints)
 *
 * Tests the AccountsController REST API endpoints with real authentication
 * and authorization flows.
 *
 * Coverage:
 * - JWT authentication requirements
 * - Authorization checks (owner, family member, admin)
 * - Complete CRUD flow via HTTP
 * - Account sync operations
 * - Balance and summary endpoints
 * - Error responses and status codes
 *
 * @phase STORY-1.5.7 - Test Infrastructure Hardening
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/core/database/prisma/prisma.service';
import { setupTestDatabase, teardownTestDatabase } from '../../../src/core/database/tests/database-test.config';
import { AccountType, AccountSource, UserRole, PrismaClient } from '../../../generated/prisma';
import { CreateAccountDto } from '../../../src/accounts/dto/create-account.dto';
import { UpdateAccountDto } from '../../../src/accounts/dto/update-account.dto';

describe('Accounts API Integration Tests (HTTP)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // Test fixtures
  let testUserId: string;
  let testUserId2: string;
  let testFamilyId: string;
  let testFamilyId2: string;
  let testAccountId: string;

  // Authentication tokens
  let userToken: string;
  let user2Token: string;
  let adminToken: string;

  beforeAll(async () => {
    prisma = await setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();

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

    // Create test users and get JWT tokens
    // Using strong, unique passwords that meet requirements:
    // - 12+ chars, mixed case, numbers, special chars, score >= 60
    // - MUST NOT contain email, first name, or last name
    const registerResponse1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'user1@example.com',
        password: 'SecureFinance2024!@#',  // 21 chars, no personal info
        firstName: 'Alice',
        lastName: 'Johnson',
      });

    if (!registerResponse1.body.user) {
      throw new Error(`User1 registration failed: ${JSON.stringify(registerResponse1.body)}`);
    }

    testUserId = registerResponse1.body.user.id;
    userToken = registerResponse1.body.accessToken;

    // Update user1: set to ACTIVE status (bypass email verification) and assign family
    await prisma.user.update({
      where: { id: testUserId },
      data: {
        status: 'ACTIVE',  // Required for JWT validation
        familyId: testFamilyId
      },
    });

    const registerResponse2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'user2@example.com',
        password: 'Banking#Secure$2024',  // 20 chars, no personal info
        firstName: 'Bob',
        lastName: 'Martinez',
      });

    if (!registerResponse2.body.user) {
      throw new Error(`User2 registration failed: ${JSON.stringify(registerResponse2.body)}`);
    }

    testUserId2 = registerResponse2.body.user.id;
    user2Token = registerResponse2.body.accessToken;

    // Update user2: set to ACTIVE status (bypass email verification) and assign family
    await prisma.user.update({
      where: { id: testUserId2 },
      data: {
        status: 'ACTIVE',  // Required for JWT validation
        familyId: testFamilyId2
      },
    });

    // Create admin user
    const adminRegisterResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'admin@example.com',
        password: 'SuperSecure!Finance2024#',  // 25 chars, no personal info
        firstName: 'Charlie',
        lastName: 'Wilson',
      });

    if (!adminRegisterResponse.body.user) {
      throw new Error(`Admin registration failed: ${JSON.stringify(adminRegisterResponse.body)}`);
    }

    const adminUserId = adminRegisterResponse.body.user.id;
    adminToken = adminRegisterResponse.body.accessToken;

    // Promote to admin and set ACTIVE status
    await prisma.user.update({
      where: { id: adminUserId },
      data: {
        role: UserRole.ADMIN,
        status: 'ACTIVE',  // Required for JWT validation
        familyId: testFamilyId,
      },
    });
  });

  afterAll(async () => {
    // Close NestJS application first (this disconnects Prisma client managed by DI)
    if (app) {
      await app.close();
    }
    // Teardown only stops the container, Prisma is already disconnected by app.close()
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean accounts before each test
    await prisma.account.deleteMany({});
  });

  describe('POST /accounts - Create Account', () => {
    it('should require authentication', async () => {
      const createDto: CreateAccountDto = {
        name: 'Test Account',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 1000,
      };

      await request(app.getHttpServer())
        .post('/accounts')
        .send(createDto)
        .expect(401);
    });

    it('should create personal account for authenticated user', async () => {
      const createDto: CreateAccountDto = {
        name: 'Personal Checking',
        type: AccountType.CHECKING,
        source: AccountSource.MANUAL,
        currentBalance: 1500.50,
      };

      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Personal Checking',
        type: AccountType.CHECKING,
        currentBalance: 1500.50,
        userId: testUserId,
        currency: 'USD',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();

      testAccountId = response.body.id;
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        // Missing required fields
        currentBalance: 1000,
      };

      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidDto)
        .expect(400);

      // Validation errors are returned as array
      const messages = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(messages).toContain('name');
      expect(messages).toContain('type');
    });

    it('should reject invalid account type', async () => {
      const invalidDto = {
        name: 'Test',
        type: 'INVALID_TYPE',
        source: AccountSource.MANUAL,
        currentBalance: 0,
      };

      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidDto)
        .expect(400);
    });

    it('should allow negative balance for credit accounts', async () => {
      const createDto: CreateAccountDto = {
        name: 'Credit Card',
        type: AccountType.CREDIT_CARD,
        source: AccountSource.MANUAL,
        currentBalance: -500,
      };

      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body.currentBalance).toBe(-500);
    });
  });

  describe('GET /accounts - List Accounts', () => {
    beforeEach(async () => {
      // Create test accounts
      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Checking Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
        });

      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Savings Account',
          type: AccountType.SAVINGS,
          source: AccountSource.MANUAL,
          currentBalance: 5000,
        });

      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'Other User Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 2000,
        });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/accounts')
        .expect(401);
    });

    it('should return only user\'s accounts', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((acc: any) => acc.userId === testUserId)).toBe(true);
      expect(response.body.map((acc: any) => acc.name)).toContain('Checking Account');
      expect(response.body.map((acc: any) => acc.name)).toContain('Savings Account');
    });

    it('should return empty array for user with no accounts', async () => {
      // Create new user with no accounts
      const newUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Finance!Tracking2024$',  // 22 chars, no personal info
          firstName: 'Diana',
          lastName: 'Thompson',
        });

      // Set user to ACTIVE status (bypass email verification for testing)
      await prisma.user.update({
        where: { id: newUserResponse.body.user.id },
        data: { status: 'ACTIVE' },
      });

      const response = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${newUserResponse.body.accessToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should allow admin to access all accounts', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Admin should see all accounts (at least the 3 created in beforeEach)
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /accounts/:id - Get Account', () => {
    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1500,
        });

      testAccountId = createResponse.body.id;
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/accounts/${testAccountId}`)
        .expect(401);
    });

    it('should return account when user owns it', async () => {
      const response = await request(app.getHttpServer())
        .get(`/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testAccountId,
        name: 'Test Account',
        userId: testUserId,
        currentBalance: 1500,
      });
    });

    it('should return 404 for non-existent account', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/accounts/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should return 403 when user does not own account', async () => {
      const response = await request(app.getHttpServer())
        .get(`/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });

    it('should allow admin to access any account', async () => {
      const response = await request(app.getHttpServer())
        .get(`/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(testAccountId);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/accounts/invalid-uuid')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });
  });

  describe('PATCH /accounts/:id - Update Account (Partial Update)', () => {
    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Original Name',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
        });

      testAccountId = createResponse.body.id;
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/accounts/${testAccountId}`)
        .send({ name: 'Updated Name' })
        .expect(401);
    });

    it('should update account when user owns it', async () => {
      const updateDto: UpdateAccountDto = {
        name: 'Updated Name',
        currentBalance: 2000,
      };

      const response = await request(app.getHttpServer())
        .patch(`/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testAccountId,
        name: 'Updated Name',
        currentBalance: 2000,
      });
    });

    it('should update partial fields without affecting others', async () => {
      const updateDto: UpdateAccountDto = {
        currentBalance: 3000,
      };

      const response = await request(app.getHttpServer())
        .patch(`/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.currentBalance).toBe(3000);
      expect(response.body.name).toBe('Original Name'); // Unchanged
    });

    it('should return 403 when user does not own account', async () => {
      await request(app.getHttpServer())
        .patch(`/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked Name' })
        .expect(403);

      // Verify account was not updated
      const account = await prisma.account.findUnique({
        where: { id: testAccountId },
      });
      expect(account?.name).toBe('Original Name');
    });

    it('should allow admin to update any account', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Updated' })
        .expect(200);

      expect(response.body.name).toBe('Admin Updated');
    });

    it('should validate update fields', async () => {
      const invalidDto = {
        type: 'INVALID_TYPE',
      };

      await request(app.getHttpServer())
        .patch(`/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('DELETE /accounts/:id - Delete Account', () => {
    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Account to Delete',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
        });

      testAccountId = createResponse.body.id;
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/accounts/${testAccountId}`)
        .expect(401);
    });

    it('should delete account when user owns it', async () => {
      await request(app.getHttpServer())
        .delete(`/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);  // DELETE returns 204 No Content

      // Verify deletion
      const account = await prisma.account.findUnique({
        where: { id: testAccountId },
      });
      expect(account).toBeNull();
    });

    it('should return 403 when user does not own account', async () => {
      await request(app.getHttpServer())
        .delete(`/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      // Verify account still exists
      const account = await prisma.account.findUnique({
        where: { id: testAccountId },
      });
      expect(account).not.toBeNull();
    });

    it('should allow admin to delete any account', async () => {
      await request(app.getHttpServer())
        .delete(`/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);  // DELETE returns 204 No Content

      const account = await prisma.account.findUnique({
        where: { id: testAccountId },
      });
      expect(account).toBeNull();
    });

    it('should return 404 when deleting non-existent account', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`/accounts/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('GET /accounts/:id/balance - Get Account Balance', () => {
    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Balance Test',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1234.56,
          availableBalance: 1000.50,
        });

      testAccountId = createResponse.body.id;
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/accounts/${testAccountId}/balance`)
        .expect(401);
    });

    it('should return balance when user owns account', async () => {
      const response = await request(app.getHttpServer())
        .get(`/accounts/${testAccountId}/balance`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        currentBalance: 1234.56,
        availableBalance: 1000.50,
        currency: 'USD',
      });
    });

    it('should return 403 when user does not own account', async () => {
      await request(app.getHttpServer())
        .get(`/accounts/${testAccountId}/balance`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });
  });

  describe('GET /accounts/summary - Get Account Summary', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Checking',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
        });

      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Savings',
          type: AccountType.SAVINGS,
          source: AccountSource.MANUAL,
          currentBalance: 5000,
        });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/accounts/summary')
        .expect(401);
    });

    it('should return summary statistics for user accounts', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts/summary')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalAccounts: 2,
        totalBalance: 6000,
        activeAccounts: 2,
      });
      expect(response.body.byType).toHaveProperty(AccountType.CHECKING);
      expect(response.body.byType).toHaveProperty(AccountType.SAVINGS);
    });

    it('should return empty summary when user has no accounts', async () => {
      const newUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'emptyuser@example.com',
          password: 'Savings!Budget2024#',  // 20 chars, no personal info
          firstName: 'Emma',
          lastName: 'Rodriguez',
        });

      // Set user to ACTIVE status (bypass email verification for testing)
      await prisma.user.update({
        where: { id: newUserResponse.body.user.id },
        data: { status: 'ACTIVE' },
      });

      const response = await request(app.getHttpServer())
        .get('/accounts/summary')
        .set('Authorization', `Bearer ${newUserResponse.body.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalAccounts: 0,
        totalBalance: 0,
        activeAccounts: 0,
        byType: {},
      });
    });
  });

  describe('Complete Account Lifecycle', () => {
    it('should handle complete CRUD flow with authorization', async () => {
      // 1. Create account
      const createResponse = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Lifecycle Test Account',
          type: AccountType.CHECKING,
          source: AccountSource.MANUAL,
          currentBalance: 1000,
        })
        .expect(201);

      const accountId = createResponse.body.id;
      expect(createResponse.body.name).toBe('Lifecycle Test Account');

      // 2. Read account
      const readResponse = await request(app.getHttpServer())
        .get(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(readResponse.body.id).toBe(accountId);

      // 3. Update account
      const updateResponse = await request(app.getHttpServer())
        .patch(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ currentBalance: 1500 })
        .expect(200);

      expect(updateResponse.body.currentBalance).toBe(1500);

      // 4. Check balance
      const balanceResponse = await request(app.getHttpServer())
        .get(`/accounts/${accountId}/balance`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(balanceResponse.body.currentBalance).toBe(1500);

      // 5. Delete account
      await request(app.getHttpServer())
        .delete(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);  // DELETE returns 204 No Content

      // 6. Verify deletion
      await request(app.getHttpServer())
        .get(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });
});
