/**
 * Real Auth Integration Tests with Prisma
 *
 * @phase P.3.5.2
 * @description Real integration tests using actual Prisma database
 * @replaces auth.integration.spec.ts (mocked TypeORM tests)
 *
 * These tests:
 * - Use real PostgreSQL database (TestContainers or local)
 * - Apply Prisma migrations automatically
 * - Test actual HTTP → Controller → Service → Prisma flow
 * - Clean database between tests
 * - No mocks for database operations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';

import { AuthModule } from '@/auth/auth.module';
import { RedisModule } from '@/core/redis/redis.module';
import { DatabaseModule } from '@/core/database/database.module';
import {
  setupTestDatabase,
  cleanTestDatabase,
  teardownTestDatabase,
  getTestDataFactory,
} from '@/core/database/tests/database-test.config';
import { PrismaService } from '@/core/database/prisma/prisma.service';
import { RegisterDto } from '@/auth/dto/register.dto';
import { LoginDto } from '@/auth/dto/login.dto';

import { createMockRedis } from '../mocks/redis.mock';

describe('Real Auth Integration Tests (Prisma)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: Awaited<ReturnType<typeof getTestDataFactory>>;

  // Create proper Redis mock with EventEmitter
  const mockRedisClient = createMockRedis();

  beforeAll(async () => {
    // Setup test database (TestContainers or local PostgreSQL)
    await setupTestDatabase();

    // Get test data factory
    factory = await getTestDataFactory();

    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.APP_NAME = 'MoneyWise Test';
    process.env.APP_PORT = '4000';
    process.env.APP_HOST = 'localhost';
    process.env.APP_VERSION = '0.4.1';

    // JWT Configuration (must be ≥32 chars AND different from each other)
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-exactly-32-chars-long-for-jwt!!';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-exactly-32-chars-long-jwt!';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    // Redis Configuration
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';

    // Security Configuration
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    process.env.SESSION_SECRET = 'test-session-secret-min-32-characters-long';
    process.env.CSRF_SECRET = 'test-csrf-secret-minimum-32-characters-long';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        RedisModule.forTest(mockRedisClient), // Use testable Redis module
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true, // Use process.env directly
          validate: undefined, // Skip validation in tests
          cache: false, // Don't cache config in tests
        }),
        DatabaseModule, // Real Prisma database
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true })
    );

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await teardownTestDatabase();
  });

  afterEach(async () => {
    // Clean database between tests
    await cleanTestDatabase();

    // Reset Redis mock state
    if (mockRedisClient.__reset) {
      mockRedisClient.__reset();
    }
  });

  describe('POST /auth/register', () => {
    const validRegisterDto: RegisterDto = {
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'Password123!',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user.email).toBe(validRegisterDto.email.toLowerCase());
      expect(response.body.user.firstName).toBe(validRegisterDto.firstName);
      expect(response.body.user.lastName).toBe(validRegisterDto.lastName);

      // Verify user was actually created in database
      const user = await prismaService.user.findUnique({
        where: { email: validRegisterDto.email.toLowerCase() },
      });
      expect(user).toBeTruthy();
      expect(user!.firstName).toBe(validRegisterDto.firstName);
      expect(user!.lastName).toBe(validRegisterDto.lastName);
      expect(user!.status).toBe('ACTIVE');
      expect(user!.role).toBe('MEMBER');
    });

    it('should return 409 when user already exists', async () => {
      // Create user using factory
      await factory.users.build({
        email: validRegisterDto.email,
        firstName: 'Existing',
        lastName: 'User',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidDto = {
        ...validRegisterDto,
        email: 'invalid-email',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 400 for weak password', async () => {
      const weakPasswordDto = {
        ...validRegisterDto,
        password: 'weak',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(weakPasswordDto)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteDto = {
        email: 'test@example.com',
        // missing firstName, lastName, password
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(incompleteDto)
        .expect(400);
    });

    it('should normalize email to lowercase', async () => {
      const upperCaseEmailDto = {
        ...validRegisterDto,
        email: 'NewUser@EXAMPLE.COM',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(upperCaseEmailDto)
        .expect(201);

      expect(response.body.user.email).toBe('newuser@example.com');

      // Verify in database
      const user = await prismaService.user.findUnique({
        where: { email: 'newuser@example.com' },
      });
      expect(user).toBeTruthy();
    });
  });

  describe('POST /auth/login', () => {
    const testPassword = 'Password123!';
    let testUser: Awaited<ReturnType<typeof factory.users.buildWithPassword>>;

    beforeEach(async () => {
      // Create test user with known password
      testUser = await factory.users.buildWithPassword(testPassword, {
        email: 'testlogin@example.com',
        firstName: 'Test',
        lastName: 'Login',
        status: 'ACTIVE' as any,
        emailVerifiedAt: new Date(),
      });
    });

    const validLoginDto: LoginDto = {
      email: 'testlogin@example.com',
      password: testPassword,
    };

    it('should login user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user.email).toBe(testUser.email);

      // Verify lastLoginAt was updated in database
      const updatedUser = await prismaService.user.findUnique({
        where: { id: testUser.id },
      });
      expect(updatedUser!.lastLoginAt).toBeTruthy();
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: validLoginDto.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });

    it('should return 401 for inactive user', async () => {
      // Update user status to INACTIVE
      await prismaService.user.update({
        where: { id: testUser.id },
        data: { status: 'INACTIVE' },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginDto)
        .expect(401);

      expect(response.body.message).toContain('not active');
    });

    it('should handle case-insensitive email login', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'TESTLOGIN@EXAMPLE.COM', // uppercase
          password: testPassword,
        })
        .expect(200);

      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should return 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: testPassword,
        })
        .expect(400);
    });

    it('should return 400 for empty password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: validLoginDto.email,
          password: '',
        })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    let testUser: Awaited<ReturnType<typeof factory.users.buildWithPassword>>;
    let refreshToken: string;

    beforeEach(async () => {
      // Create test user and login to get refresh token
      testUser = await factory.users.buildWithPassword('Password123!', {
        email: 'testrefresh@example.com',
        firstName: 'Test',
        lastName: 'Refresh',
        status: 'ACTIVE' as any,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'Password123!',
        });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);

      // New tokens should be different from original
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });

    it('should return 401 for missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(401);
    });

    it('should return 401 when user is deleted after token issued', async () => {
      // Delete user from database
      await prismaService.user.delete({
        where: { id: testUser.id },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('GET /auth/profile', () => {
    let testUser: Awaited<ReturnType<typeof factory.users.buildWithPassword>>;
    let accessToken: string;

    beforeEach(async () => {
      // Create test user and login to get access token
      testUser = await factory.users.buildWithPassword('Password123!', {
        email: 'testprofile@example.com',
        firstName: 'Test',
        lastName: 'Profile',
        status: 'ACTIVE' as any,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'Password123!',
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('firstName', testUser.firstName);
      expect(response.body).toHaveProperty('lastName', testUser.lastName);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 401 without authorization header', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 when user is deleted after token issued', async () => {
      // Delete user from database
      await prismaService.user.delete({
        where: { id: testUser.id },
      });

      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create test user and login
      const testUser = await factory.users.buildWithPassword('Password123!', {
        email: 'testlogout@example.com',
        firstName: 'Test',
        lastName: 'Logout',
        status: 'ACTIVE' as any,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'Password123!',
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('should return 401 without authorization header', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full registration → login → profile → logout flow', async () => {
      const userEmail = 'flowtest@example.com';
      const userPassword = 'Password123!';

      // 1. Register
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: userEmail,
          firstName: 'Flow',
          lastName: 'Test',
          password: userPassword,
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('accessToken');
      expect(registerResponse.body).toHaveProperty('refreshToken');

      const { accessToken, refreshToken } = registerResponse.body;

      // 2. Access profile with registration token
      const profileResponse1 = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse1.body.email).toBe(userEmail);

      // 3. Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // 4. Login again with credentials
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userEmail,
          password: userPassword,
        })
        .expect(200);

      // 5. Verify new tokens work
      const profileResponse2 = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(200);

      expect(profileResponse2.body.email).toBe(userEmail);

      // Verify user exists in database
      const user = await prismaService.user.findUnique({
        where: { email: userEmail },
      });
      expect(user).toBeTruthy();
      expect(user!.lastLoginAt).toBeTruthy();
    });

    it('should handle token refresh flow', async () => {
      // 1. Register user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'refreshflow@example.com',
          firstName: 'Refresh',
          lastName: 'Flow',
          password: 'Password123!',
        })
        .expect(201);

      const { accessToken: originalAccessToken, refreshToken } = registerResponse.body;

      // 2. Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
      expect(refreshResponse.body.accessToken).not.toBe(originalAccessToken);
      expect(refreshResponse.body.refreshToken).not.toBe(refreshToken);

      // 3. Use new access token to access profile
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe('refreshflow@example.com');

      // 4. Old access token should still work (until it expires)
      const profileResponse2 = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${originalAccessToken}`)
        .expect(200);

      expect(profileResponse2.body.email).toBe('refreshflow@example.com');
    });

    it('should handle concurrent registration attempts with same email', async () => {
      const registerDto = {
        email: 'concurrent@example.com',
        firstName: 'Concurrent',
        lastName: 'Test',
        password: 'Password123!',
      };

      // Start two registration requests concurrently
      const [response1, response2] = await Promise.allSettled([
        request(app.getHttpServer()).post('/auth/register').send(registerDto),
        request(app.getHttpServer()).post('/auth/register').send(registerDto),
      ]);

      // One should succeed (201), one should fail (409)
      const statuses = [
        response1.status === 'fulfilled' ? response1.value.status : 500,
        response2.status === 'fulfilled' ? response2.value.status : 500,
      ].sort();

      expect(statuses).toEqual([201, 409]);

      // Verify only one user was created
      const users = await prismaService.user.findMany({
        where: { email: registerDto.email },
      });
      expect(users).toHaveLength(1);
    });
  });
});
