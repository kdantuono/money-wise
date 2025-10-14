/**
 * Accounts API Integration Tests
 *
 * Tests the complete accounts API endpoints with real database and authentication
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { AccountsService } from '../../src/accounts/accounts.service';
import { DataSource } from 'typeorm';
import { Account } from '../../src/accounts/entities/account.entity';
import { User } from '../../src/users/entities/user.entity';

describe('Accounts API (Integration)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let usersService: UsersService;
  let accountsService: AccountsService;
  let dataSource: DataSource;
  let testUser: User;
  let testUser2: User;
  let accessToken: string;
  let accessToken2: string;
  let testAccount: Account;

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
    dataSource = moduleRef.get<DataSource>(DataSource);

    // Clear database
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
  });

  afterAll(async () => {
    await dataSource.getRepository(Account).delete({});
    await dataSource.getRepository(User).delete({});
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clear accounts before each test
    await dataSource.getRepository(Account).delete({});
  });

  describe('POST /api/accounts', () => {
    it('should create a new account', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Checking Account',
          type: 'checking',
          currency: 'USD',
          currentBalance: 1000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Checking Account');
      expect(response.body.type).toBe('checking');
      expect(response.body.currency).toBe('USD');
      expect(response.body.currentBalance).toBe(1000);
      expect(response.body.userId).toBe(testUser.id);
    });

    it('should use default currency USD when not provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Savings Account',
          type: 'savings',
          currentBalance: 5000,
        })
        .expect(201);

      expect(response.body.currency).toBe('USD');
    });

    it('should reject invalid account type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Invalid Account',
          type: 'invalid_type',
          currentBalance: 1000,
        })
        .expect(400);

      expect(response.body.message).toContain('type must be one of');
    });

    it('should reject negative balance', async () => {
      await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Negative Account',
          type: 'checking',
          currentBalance: -100,
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/accounts')
        .send({
          name: 'Unauthorized Account',
          type: 'checking',
          currentBalance: 1000,
        })
        .expect(401);
    });

    it('should handle Plaid account creation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Plaid Connected Account',
          type: 'checking',
          institutionName: 'Chase Bank',
          plaidAccountId: 'plaid_account_123',
          plaidItemId: 'plaid_item_456',
          currentBalance: 2500,
        })
        .expect(201);

      expect(response.body.institutionName).toBe('Chase Bank');
      expect(response.body.plaidAccountId).toBe('plaid_account_123');
      expect(response.body.plaidItemId).toBe('plaid_item_456');
    });
  });

  describe('GET /api/accounts', () => {
    beforeEach(async () => {
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

      await accountsService.create(
        {
          name: 'Test Savings',
          type: 'savings',
          currency: 'USD',
          currentBalance: 5000,
        },
        testUser,
      );

      await accountsService.create(
        {
          name: 'Other User Account',
          type: 'checking',
          currency: 'USD',
          currentBalance: 3000,
        },
        testUser2,
      );
    });

    it('should return all accounts for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((acc: any) => acc.userId === testUser.id)).toBe(true);
    });

    it('should not return other users accounts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.some((acc: any) => acc.userId === testUser2.id)).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/accounts')
        .expect(401);
    });

    it('should return empty array for user with no accounts', async () => {
      await dataSource.getRepository(Account).delete({ userId: testUser.id });

      const response = await request(app.getHttpServer())
        .get('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/accounts/:id', () => {
    beforeEach(async () => {
      testAccount = await accountsService.create(
        {
          name: 'Test Account',
          type: 'checking',
          currency: 'USD',
          currentBalance: 1500,
        },
        testUser,
      );
    });

    it('should return account details for owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/accounts/${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testAccount.id);
      expect(response.body.name).toBe('Test Account');
      expect(response.body.currentBalance).toBe(1500);
    });

    it('should return 403 when accessing other users account', async () => {
      await request(app.getHttpServer())
        .get(`/api/accounts/${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(403);
    });

    it('should return 404 for non-existent account', async () => {
      await request(app.getHttpServer())
        .get('/api/accounts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/accounts/${testAccount.id}`)
        .expect(401);
    });
  });

  describe('PATCH /api/accounts/:id', () => {
    beforeEach(async () => {
      testAccount = await accountsService.create(
        {
          name: 'Original Name',
          type: 'checking',
          currency: 'USD',
          currentBalance: 2000,
        },
        testUser,
      );
    });

    it('should update account name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/accounts/${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.currentBalance).toBe(2000); // Unchanged
    });

    it('should update account status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/accounts/${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'inactive',
        })
        .expect(200);

      expect(response.body.status).toBe('inactive');
    });

    it('should prevent updating other users account', async () => {
      await request(app.getHttpServer())
        .patch(`/api/accounts/${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .send({
          name: 'Hacked Name',
        })
        .expect(403);
    });

    it('should validate update data', async () => {
      await request(app.getHttpServer())
        .patch(`/api/accounts/${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'invalid_type',
        })
        .expect(400);
    });

    it('should return 404 for non-existent account', async () => {
      await request(app.getHttpServer())
        .patch('/api/accounts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated',
        })
        .expect(404);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    beforeEach(async () => {
      testAccount = await accountsService.create(
        {
          name: 'Account to Delete',
          type: 'savings',
          currency: 'USD',
          currentBalance: 1000,
        },
        testUser,
      );
    });

    it('should delete account for owner', async () => {
      await request(app.getHttpServer())
        .delete(`/api/accounts/${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Verify account is deleted
      const account = await dataSource.getRepository(Account).findOne({
        where: { id: testAccount.id },
      });
      expect(account).toBeNull();
    });

    it('should prevent deleting other users account', async () => {
      await request(app.getHttpServer())
        .delete(`/api/accounts/${testAccount.id}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(403);

      // Verify account still exists
      const account = await dataSource.getRepository(Account).findOne({
        where: { id: testAccount.id },
      });
      expect(account).not.toBeNull();
    });

    it('should return 404 for non-existent account', async () => {
      await request(app.getHttpServer())
        .delete('/api/accounts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/accounts/${testAccount.id}`)
        .expect(401);
    });
  });

  describe('GET /api/accounts/:id/balance', () => {
    beforeEach(async () => {
      testAccount = await accountsService.create(
        {
          name: 'Balance Test Account',
          type: 'checking',
          currency: 'USD',
          currentBalance: 3500.50,
          availableBalance: 3000.50,
        },
        testUser,
      );
    });

    it('should return account balance', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/accounts/${testAccount.id}/balance`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.currentBalance).toBe(3500.50);
      expect(response.body.availableBalance).toBe(3000.50);
    });

    it('should handle null available balance', async () => {
      testAccount.availableBalance = null;
      await dataSource.getRepository(Account).save(testAccount);

      const response = await request(app.getHttpServer())
        .get(`/api/accounts/${testAccount.id}/balance`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.currentBalance).toBe(3500.50);
      expect(response.body.availableBalance).toBeNull();
    });

    it('should prevent accessing other users balance', async () => {
      await request(app.getHttpServer())
        .get(`/api/accounts/${testAccount.id}/balance`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(403);
    });
  });

  describe('GET /api/accounts/summary', () => {
    beforeEach(async () => {
      // Create multiple accounts with different types and statuses
      await accountsService.create(
        {
          name: 'Checking 1',
          type: 'checking',
          currency: 'USD',
          currentBalance: 1000,
          status: 'active',
        },
        testUser,
      );

      await accountsService.create(
        {
          name: 'Savings 1',
          type: 'savings',
          currency: 'USD',
          currentBalance: 5000,
          status: 'active',
        },
        testUser,
      );

      await accountsService.create(
        {
          name: 'Credit Card',
          type: 'credit_card',
          currency: 'USD',
          currentBalance: -500,
          status: 'active',
        },
        testUser,
      );

      await accountsService.create(
        {
          name: 'Inactive Account',
          type: 'checking',
          currency: 'USD',
          currentBalance: 100,
          status: 'inactive',
          isActive: false,
        },
        testUser,
      );
    });

    it('should return account summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/accounts/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.totalBalance).toBe(5500); // 1000 + 5000 - 500
      expect(response.body.activeAccounts).toBe(3);
      expect(response.body.accountsByType).toBeDefined();
      expect(response.body.accountsByType.checking).toBeDefined();
      expect(response.body.accountsByType.savings).toBeDefined();
      expect(response.body.accountsByType.credit_card).toBeDefined();
    });

    it('should only include active accounts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/accounts/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Should not include the inactive account
      expect(response.body.accountsByType.checking.count).toBe(1); // Only 1 active checking
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/accounts/summary')
        .expect(401);
    });
  });

  describe('POST /api/accounts/:id/sync', () => {
    let plaidAccount: Account;

    beforeEach(async () => {
      plaidAccount = await accountsService.create(
        {
          name: 'Plaid Account',
          type: 'checking',
          currency: 'USD',
          currentBalance: 2000,
          plaidAccountId: 'plaid_123',
          plaidItemId: 'item_456',
        },
        testUser,
      );
    });

    it('should sync Plaid account', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/accounts/${plaidAccount.id}/sync`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.lastSyncAt).toBeDefined();
      expect(new Date(response.body.lastSyncAt).getTime()).toBeGreaterThan(
        Date.now() - 5000,
      );
    });

    it('should prevent syncing manual account', async () => {
      const manualAccount = await accountsService.create(
        {
          name: 'Manual Account',
          type: 'checking',
          currency: 'USD',
          currentBalance: 1000,
        },
        testUser,
      );

      await request(app.getHttpServer())
        .post(`/api/accounts/${manualAccount.id}/sync`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('should prevent syncing other users account', async () => {
      await request(app.getHttpServer())
        .post(`/api/accounts/${plaidAccount.id}/sync`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rapid account creation', async () => {
      const promises = Array(5)
        .fill(null)
        .map((_, index) =>
          request(app.getHttpServer())
            .post('/api/accounts')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              name: `Rapid Account ${index}`,
              type: 'checking',
              currentBalance: 100 * index,
            }),
        );

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.status === 201).length;
      expect(successCount).toBeGreaterThanOrEqual(5); // All should succeed in test env
    });
  });

  describe('Data Validation', () => {
    it('should validate currency format', async () => {
      await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Invalid Currency',
          type: 'checking',
          currency: 'INVALID',
          currentBalance: 1000,
        })
        .expect(400);
    });

    it('should validate account name length', async () => {
      await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'A'.repeat(256), // Too long
          type: 'checking',
          currentBalance: 1000,
        })
        .expect(400);
    });

    it('should handle special characters in account name', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Account @#$%^&*() Special',
          type: 'checking',
          currentBalance: 1000,
        })
        .expect(201);

      expect(response.body.name).toBe('Account @#$%^&*() Special');
    });
  });
});