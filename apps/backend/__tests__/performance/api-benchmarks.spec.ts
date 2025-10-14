import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { TestDataBuilder } from '../utils/test-data-builder';

/**
 * API Performance Benchmarks
 *
 * Tests to measure and track API response times.
 * These benchmarks help identify performance regressions.
 * 
 * TEMPORARILY SKIPPED: Requires full environment setup with all config vars
 * TODO: Add proper test environment configuration
 */
describe.skip('API Performance Benchmarks', () => {
  let app: INestApplication;
  let accessToken: string;
  let testUser: any;

  // Performance thresholds (in milliseconds)
  const THRESHOLDS = {
    auth: {
      login: 200,
      register: 300,
      refresh: 100,
      profile: 50,
    },
    accounts: {
      list: 100,
      create: 150,
      update: 100,
      delete: 100,
      single: 50,
    },
    transactions: {
      list: 150,
      create: 100,
      update: 80,
      delete: 80,
      search: 200,
      aggregate: 300,
    },
    categories: {
      list: 50,
      create: 80,
      update: 60,
      delete: 60,
    },
    budgets: {
      list: 100,
      create: 120,
      update: 100,
      calculate: 200,
    },
  };

  beforeAll(async () => {
    // Set required environment variables for AppModule config validation
    process.env.PORT = '3001';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test user and authenticate
    const userData = TestDataBuilder.user();
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userData)
      .expect(201);

    accessToken = response.body.accessToken;
    testUser = response.body.user;
  }, 30000);

  afterAll(async () => {
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
      const credentials = {
        email: testUser.email,
        password: 'Password123!',
      };

      await benchmarkEndpoint(
        'POST /auth/login',
        () =>
          request(app.getHttpServer())
            .post('/auth/login')
            .send(credentials)
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

    it('should meet performance threshold for token refresh', async () => {
      // Get refresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'Password123!',
        })
        .expect(200);

      const refreshToken = loginResponse.body.refreshToken;

      await benchmarkEndpoint(
        'POST /auth/refresh',
        () =>
          request(app.getHttpServer())
            .post('/auth/refresh')
            .send({ refreshToken })
            .expect(200),
        THRESHOLDS.auth.refresh
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
          type: 'checking',
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
              type: 'savings',
              currency: 'USD',
              currentBalance: 5000,
            })
            .expect(201),
        THRESHOLDS.accounts.create
      );
    });

    it('should meet performance threshold for updating account', async () => {
      await benchmarkEndpoint(
        `PATCH /accounts/${accountId}`,
        () =>
          request(app.getHttpServer())
            .patch(`/accounts/${accountId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              name: `Updated ${Date.now()}`,
            })
            .expect(200),
        THRESHOLDS.accounts.update
      );
    });
  });

  describe('Transactions Endpoints', () => {
    let accountId: string;
    let transactionId: string;

    beforeAll(async () => {
      // Create account with transactions
      const accountResponse = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Transaction Test Account',
          type: 'checking',
          currency: 'USD',
          currentBalance: 10000,
        })
        .expect(201);

      accountId = accountResponse.body.id;

      // Create sample transactions
      for (let i = 0; i < 50; i++) {
        const response = await request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            accountId,
            type: i % 3 === 0 ? 'income' : 'expense',
            amount: Math.random() * 1000,
            merchant: `Merchant ${i}`,
            description: `Transaction ${i}`,
            transactionDate: new Date().toISOString(),
          });

        if (i === 0) {
          transactionId = response.body.id;
        }
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

    it('should meet performance threshold for searching transactions', async () => {
      await benchmarkEndpoint(
        'GET /transactions/search',
        () =>
          request(app.getHttpServer())
            .get('/transactions/search')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ q: 'Merchant', limit: 20 })
            .expect(200),
        THRESHOLDS.transactions.search
      );
    });

    it('should meet performance threshold for aggregating transactions', async () => {
      await benchmarkEndpoint(
        'GET /transactions/aggregate',
        () =>
          request(app.getHttpServer())
            .get('/transactions/aggregate')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({
              groupBy: 'category',
              startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date().toISOString(),
            })
            .expect(200),
        THRESHOLDS.transactions.aggregate
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
              type: 'expense',
              amount: 50,
              merchant: `Perf Test ${Date.now()}`,
              description: 'Performance test transaction',
              transactionDate: new Date().toISOString(),
            })
            .expect(201),
        THRESHOLDS.transactions.create
      );
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const start = process.hrtime.bigint();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
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

      // Total time should be less than sequential time
      const expectedSequentialTime = THRESHOLDS.auth.profile * concurrentRequests;
      const speedup = expectedSequentialTime / totalTime;

      console.log(`Concurrent Requests Performance:
        Requests: ${concurrentRequests}
        Total Time: ${totalTime.toFixed(2)}ms
        Avg Time per Request: ${(totalTime / concurrentRequests).toFixed(2)}ms
        Expected Sequential Time: ${expectedSequentialTime}ms
        Speedup: ${speedup.toFixed(2)}x
        Status: ${speedup > 2 ? '✅ Good concurrency' : '⚠️ Limited concurrency'}`);

      expect(speedup).toBeGreaterThan(1.5); // Should be at least 1.5x faster than sequential
    });
  });

  describe('Database Query Performance', () => {
    it('should optimize N+1 queries', async () => {
      // Create accounts with transactions
      for (let i = 0; i < 5; i++) {
        const accountResponse = await request(app.getHttpServer())
          .post('/accounts')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `N+1 Test Account ${i}`,
            type: 'checking',
            currency: 'USD',
            currentBalance: 1000,
          });

        const accountId = accountResponse.body.id;

        // Add transactions
        for (let j = 0; j < 10; j++) {
          await request(app.getHttpServer())
            .post('/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              accountId,
              type: 'expense',
              amount: 100,
              merchant: `Test Merchant ${j}`,
              transactionDate: new Date().toISOString(),
            });
        }
      }

      // Measure performance of fetching accounts with transaction counts
      await benchmarkEndpoint(
        'GET /accounts?include=transactionCount',
        () =>
          request(app.getHttpServer())
            .get('/accounts')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ include: 'transactionCount' })
            .expect(200),
        200 // Should be fast even with joins
      );
    });
  });

  describe('Cache Performance', () => {
    it('should improve performance with caching', async () => {
      // First call (cache miss)
      const firstCallTime = await measureResponseTime(() =>
        request(app.getHttpServer())
          .get('/categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
      );

      // Second call (cache hit)
      const secondCallTime = await measureResponseTime(() =>
        request(app.getHttpServer())
          .get('/categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
      );

      const improvement = ((firstCallTime - secondCallTime) / firstCallTime) * 100;

      console.log(`Cache Performance:
        First Call: ${firstCallTime.toFixed(2)}ms (cache miss)
        Second Call: ${secondCallTime.toFixed(2)}ms (cache hit)
        Improvement: ${improvement.toFixed(2)}%
        Status: ${improvement > 30 ? '✅ Good caching' : '⚠️ Cache not effective'}`);

      expect(secondCallTime).toBeLessThan(firstCallTime * 0.8); // At least 20% faster
    });
  });

  describe('Pagination Performance', () => {
    it('should maintain consistent performance across pages', async () => {
      const pageSizes = [10, 20, 50, 100];
      const times: Record<number, number> = {};

      for (const pageSize of pageSizes) {
        times[pageSize] = await measureResponseTime(() =>
          request(app.getHttpServer())
            .get('/transactions')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ limit: pageSize })
            .expect(200)
        );
      }

      console.log('Pagination Performance:');
      pageSizes.forEach(size => {
        const timePerItem = times[size] / size;
        console.log(`  ${size} items: ${times[size].toFixed(2)}ms (${timePerItem.toFixed(2)}ms per item)`);
      });

      // Performance should scale sub-linearly
      const scalingFactor = times[100] / times[10];
      expect(scalingFactor).toBeLessThan(5); // Should be less than 5x slower for 10x more items
    });
  });
});