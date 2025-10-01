import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import Redis from 'ioredis';
import { AppModule } from '@/app.module';
import { TestDatabaseModule } from '@/core/database/test-database.module';
import { RedisModule } from '@/core/redis/redis.module';

/**
 * TestApp - E2E Test Helper
 *
 * Provides full application bootstrap for E2E tests, solving the NestJS
 * module DI isolation issue that blocked integration tests.
 *
 * Benefits:
 * - Full app context (all providers properly resolved)
 * - Realistic test environment (matches production setup)
 * - Shared database container (fast, consistent)
 * - Automatic cleanup between tests
 * - Supertest integration for HTTP testing
 *
 * Usage:
 * ```typescript
 * let testApp: TestApp;
 *
 * beforeAll(async () => {
 *   testApp = await TestApp.create();
 * });
 *
 * afterEach(async () => {
 *   await testApp.cleanup();
 * });
 *
 * afterAll(async () => {
 *   await testApp.close();
 * });
 *
 * it('should login user', async () => {
 *   await testApp.request()
 *     .post('/auth/login')
 *     .send({ email: 'test@example.com', password: 'password' })
 *     .expect(200);
 * });
 * ```
 */
export class TestApp {
  private app: INestApplication;
  private moduleRef: TestingModule;
  private dataSource: DataSource;
  private mockRedis: Redis;

  /**
   * Create and initialize test application
   */
  static async create(): Promise<TestApp> {
    const testApp = new TestApp();
    await testApp.bootstrap();
    return testApp;
  }

  /**
   * Bootstrap full NestJS application with test database
   */
  private async bootstrap(): Promise<void> {
    // Setup environment for tests
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    // Create mock Redis client
    this.mockRedis = new Redis({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
      retryStrategy: () => null, // Disable reconnection
    });

    // Mock Redis methods for testing
    this.setupRedisMocks();

    // Create testing module - DO NOT import AppModule (it has production configs)
    // Instead, build the module structure manually with test overrides
    const { AuthModule } = await import('@/auth/auth.module');
    const { ConfigModule } = await import('@nestjs/config');
    const { HealthModule } = await import('@/core/health/health.module');

    this.moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        await TestDatabaseModule.forRoot(),
        RedisModule.forTest(this.mockRedis),
        HealthModule,
        AuthModule,
      ],
    }).compile();

    // Create NestJS application
    this.app = this.moduleRef.createNestApplication();

    // Apply global pipes (match production setup)
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    // Initialize application
    await this.app.init();

    // Get DataSource for cleanup operations
    this.dataSource = this.moduleRef.get(DataSource);
  }

  /**
   * Setup Redis mock methods
   */
  private setupRedisMocks(): void {
    // String operations
    this.mockRedis.get = jest.fn().mockResolvedValue(null);
    this.mockRedis.set = jest.fn().mockResolvedValue('OK');
    this.mockRedis.setex = jest.fn().mockResolvedValue('OK');
    this.mockRedis.del = jest.fn().mockResolvedValue(1);
    this.mockRedis.exists = jest.fn().mockResolvedValue(0);

    // Number operations
    this.mockRedis.incr = jest.fn().mockResolvedValue(1);
    this.mockRedis.decr = jest.fn().mockResolvedValue(0);
    this.mockRedis.incrby = jest.fn().mockResolvedValue(1);

    // Hash operations (critical for AccountLockoutService)
    this.mockRedis.hset = jest.fn().mockResolvedValue(1);
    this.mockRedis.hget = jest.fn().mockResolvedValue(null);
    this.mockRedis.hgetall = jest.fn().mockResolvedValue({});
    this.mockRedis.hmget = jest.fn().mockResolvedValue([]);
    this.mockRedis.hmset = jest.fn().mockResolvedValue('OK');
    this.mockRedis.hdel = jest.fn().mockResolvedValue(1);

    // Expiration
    this.mockRedis.expire = jest.fn().mockResolvedValue(1);
    this.mockRedis.ttl = jest.fn().mockResolvedValue(-1);

    // Keys
    this.mockRedis.keys = jest.fn().mockResolvedValue([]);
    this.mockRedis.flushdb = jest.fn().mockResolvedValue('OK');

    // Pipeline
    this.mockRedis.pipeline = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });

    // Connection lifecycle
    this.mockRedis.quit = jest.fn().mockResolvedValue('OK');
    this.mockRedis.disconnect = jest.fn();
  }

  /**
   * Get supertest request instance for HTTP testing
   */
  request(): request.SuperTest<request.Test> {
    return request(this.app.getHttpServer());
  }

  /**
   * Get application instance
   */
  getApp(): INestApplication {
    return this.app;
  }

  /**
   * Get module reference for dependency injection
   */
  getModuleRef(): TestingModule {
    return this.moduleRef;
  }

  /**
   * Get DataSource for direct database access
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }

  /**
   * Get mock Redis client
   */
  getRedis(): Redis {
    return this.mockRedis;
  }

  /**
   * Reset Redis mocks between tests
   */
  resetRedisMocks(): void {
    jest.clearAllMocks();
    this.setupRedisMocks();
  }

  /**
   * Fast cleanup between tests (TRUNCATE only)
   */
  async cleanup(): Promise<void> {
    // Clean database using fast TRUNCATE
    await TestDatabaseModule.cleanup();

    // Reset Redis mocks
    this.resetRedisMocks();
  }

  /**
   * Close application and cleanup resources
   */
  async close(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }

    if (this.mockRedis) {
      this.mockRedis.disconnect();
    }
  }

  /**
   * Helper: Create authenticated user and return access token
   */
  async createAuthenticatedUser(overrides: {
    email?: string;
    password?: string;
    role?: string;
  } = {}): Promise<{ userId: string; accessToken: string; email: string }> {
    const email = overrides.email || `test${Date.now()}@example.com`;
    const password = overrides.password || 'Test@Password123';

    // Register user
    const registerResponse = await this.request()
      .post('/auth/register')
      .send({
        email,
        password,
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);

    const userId = registerResponse.body.id;

    // Login to get access token
    const loginResponse = await this.request()
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const accessToken = loginResponse.body.accessToken;

    return { userId, accessToken, email };
  }

  /**
   * Helper: Create Authorization header for authenticated requests
   */
  authHeader(accessToken: string): { Authorization: string } {
    return { Authorization: `Bearer ${accessToken}` };
  }
}
