import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/core/database/prisma/prisma.service';

/**
 * Prisma Performance Benchmarks
 *
 * Tests to measure API response times after Prisma migration.
 * Ensures no performance regressions compared to TypeORM baseline.
 */
describe('Prisma Performance Benchmarks', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testUserId: string;

  // Performance thresholds (in milliseconds)
  const THRESHOLDS = {
    auth: {
      register: 500,  // Allow more time for family creation
      login: 200,
      profile: 100,
    },
    accounts: {
      list: 150,
      create: 200,
      single: 100,
    },
    transactions: {
      list: 200,
      create: 150,
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Register and activate user
    const registerData = {
      email: `perf-${Date.now()}@example.com`,
      firstName: 'Performance',
      lastName: 'Test',
      password: 'Password123!',
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerData)
      .expect(201);

    testUserId = registerResponse.body.user.id;

    // Activate user for login
    await prisma.user.update({
      where: { id: testUserId },
      data: {
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: registerData.email,
        password: registerData.password,
      })
      .expect(200);

    accessToken = loginResponse.body.accessToken;
  }, 30000);

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await prisma.transaction.deleteMany({
        where: {
          account: {
            familyId: (await prisma.user.findUnique({
              where: { id: testUserId },
              select: { familyId: true },
            }))?.familyId || '',
          },
        },
      });
      await prisma.account.deleteMany({
        where: {
          familyId: (await prisma.user.findUnique({
            where: { id: testUserId },
            select: { familyId: true },
          }))?.familyId || '',
        },
      });
      await prisma.user.delete({ where: { id: testUserId } });
    }

    await app.close();
  });

  /**
   * Helper to measure response time
   */
  async function measureResponseTime(
    fn: () => Promise<any>
  ): Promise<number> {
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    return Number((end - start) / BigInt(1000000)); // Convert to milliseconds
  }

  /**
   * Helper to run multiple iterations and get statistics
   */
  async function benchmarkEndpoint(
    name: string,
    fn: () => Promise<any>,
    threshold: number,
    iterations: number = 10
  ): Promise<void> {
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < 3; i++) {
      await fn();
    }

    // Actual measurements
    for (let i = 0; i < iterations; i++) {
      const time = await measureResponseTime(fn);
      times.push(time);
    }

    // Calculate statistics
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
    const p99 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)];

    console.log(`${name}:
    Avg: ${avg.toFixed(2)}ms
    Min: ${min.toFixed(2)}ms
    Max: ${max.toFixed(2)}ms
    P95: ${p95.toFixed(2)}ms
    P99: ${p99.toFixed(2)}ms
    Threshold: ${threshold}ms
    Status: ${p95 <= threshold ? '✅ PASS' : '❌ FAIL'}`);

    // Assert P95 is within threshold
    expect(p95).toBeLessThanOrEqual(threshold);
  }

  describe('Authentication Endpoints', () => {
    it('should meet performance threshold for login', async () => {
      const email = `login-perf-${Date.now()}@example.com`;
      const password = 'Password123!';

      // Create and activate user
      const registerResp = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          firstName: 'Login',
          lastName: 'Perf',
          password,
        })
        .expect(201);

      await prisma.user.update({
        where: { id: registerResp.body.user.id },
        data: {
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });

      await benchmarkEndpoint(
        'POST /auth/login',
        () =>
          request(app.getHttpServer())
            .post('/auth/login')
            .send({ email, password })
            .expect(200),
        THRESHOLDS.auth.login
      );
    });

    it('should meet performance threshold for profile', async () => {
      await benchmarkEndpoint(
        'GET /auth/profile',
        () =>
          request(app.getHttpServer())
            .get('/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200),
        THRESHOLDS.auth.profile
      );
    });
  });

  describe('Accounts Endpoints', () => {
    let accountId: string;

    beforeEach(async () => {
      // Create test account
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Performance Test Account',
          type: 'CHECKING',
          currency: 'USD',
          currentBalance: 1000,
        })
        .expect(201);

      accountId = response.body.id;
    });

    it('should meet performance threshold for listing accounts', async () => {
      await benchmarkEndpoint(
        'GET /accounts',
        () =>
          request(app.getHttpServer())
            .get('/accounts')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200),
        THRESHOLDS.accounts.list
      );
    });

    it('should meet performance threshold for getting single account', async () => {
      await benchmarkEndpoint(
        `GET /accounts/${accountId}`,
        () =>
          request(app.getHttpServer())
            .get(`/accounts/${accountId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200),
        THRESHOLDS.accounts.single
      );
    });

    it('should meet performance threshold for creating account', async () => {
      await benchmarkEndpoint(
        'POST /accounts',
        () =>
          request(app.getHttpServer())
            .post('/accounts')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              name: `Perf Account ${Date.now()}`,
              type: 'SAVINGS',
              currency: 'USD',
              currentBalance: 5000,
            })
            .expect(201),
        THRESHOLDS.accounts.create
      );
    });
  });

  describe('Transactions Endpoints', () => {
    let accountId: string;

    beforeAll(async () => {
      // Create account with transactions
      const accountResponse = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Transaction Test Account',
          type: 'CHECKING',
          currency: 'USD',
          currentBalance: 10000,
        })
        .expect(201);

      accountId = accountResponse.body.id;

      // Create sample transactions
      for (let i = 0; i < 20; i++) {
        await request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            accountId,
            type: i % 3 === 0 ? 'CREDIT' : 'DEBIT',
            amount: Math.random() * 1000,
            description: `Transaction ${i}`,
            date: new Date().toISOString(),
          });
      }
    });

    it('should meet performance threshold for listing transactions', async () => {
      await benchmarkEndpoint(
        'GET /transactions',
        () =>
          request(app.getHttpServer())
            .get('/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ limit: 20 })
            .expect(200),
        THRESHOLDS.transactions.list
      );
    });

    it('should meet performance threshold for creating transaction', async () => {
      await benchmarkEndpoint(
        'POST /transactions',
        () =>
          request(app.getHttpServer())
            .post('/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              accountId,
              type: 'DEBIT',
              amount: 50,
              description: 'Performance test transaction',
              date: new Date().toISOString(),
            })
            .expect(201),
        THRESHOLDS.transactions.create
      );
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const start = process.hrtime.bigint();

      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app.getHttpServer())
          .get('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
      );

      const results = await Promise.all(promises);
      const end = process.hrtime.bigint();
      const totalTime = Number((end - start) / BigInt(1000000));

      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Total time should be reasonable
      const avgTime = totalTime / concurrentRequests;

      console.log(`Concurrent Requests Performance:
  Requests: ${concurrentRequests}
  Total Time: ${totalTime.toFixed(2)}ms
  Avg Time per Request: ${avgTime.toFixed(2)}ms
  Status: ${avgTime < 200 ? '✅ Good concurrency' : '⚠️ Limited concurrency'}`);

      expect(avgTime).toBeLessThan(200); // Average should be reasonable
    });
  });
});
