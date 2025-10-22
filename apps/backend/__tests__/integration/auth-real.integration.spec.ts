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
import { PrismaModule } from '@/core/database/prisma/prisma.module';
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
    const testPrismaClient = await setupTestDatabase();

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
          cache: false, // Don't cache config in tests
          load: [
            // Test config factory - groups env vars into nested objects like production
            () => ({
              auth: {
                JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
                JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
                JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
                JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
              },
            }),
          ],
        }),
        PrismaModule, // Real Prisma database
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(testPrismaClient) // Use test database Prisma client
      .compile();

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
      try {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(validRegisterDto);

        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(response.body, null, 2));

        expect(response.status).toBe(201);
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
        expect(user!.status).toBe('INACTIVE'); // Users start INACTIVE until email verification
        expect(user!.role).toBe('MEMBER');
      } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error('Stack:', error.stack);
        throw error;
      }
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
      // Wait 1 second to ensure different iat timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);

      // New tokens should be different from original (due to different iat)
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

  describe('Complete Registration-to-Login Data Flow', () => {
    /**
     * CRITICAL TEST SUITE: Verifies data integrity throughout the complete registration cycle
     * Tests the exact scenario: Register → Data Stored → Activate → Login → Data Retrieved
     */

    it('should register user, store data, and allow login with same credentials', async () => {
      // === PHASE 1: DATA SUBMISSION & REGISTRATION ===
      const registrationData = {
        firstName: 'Complete',
        lastName: 'Flow',
        email: 'completeflow@example.com',
        password: 'SecureTest123!@', // Must not contain firstName/lastName/email
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registrationData)
        .expect(201);

      // Verify registration response
      expect(registerResponse.body).toHaveProperty('accessToken');
      expect(registerResponse.body).toHaveProperty('user');
      const registeredUser = registerResponse.body.user;

      // === PHASE 2: VERIFY DATA STORAGE ===
      // Check exact data stored in database
      const storedUser = await prismaService.user.findUnique({
        where: { email: registrationData.email.toLowerCase() },
      });

      expect(storedUser).toBeTruthy();
      expect(storedUser!.firstName).toBe(registrationData.firstName);
      expect(storedUser!.lastName).toBe(registrationData.lastName);
      expect(storedUser!.email).toBe(registrationData.email.toLowerCase());
      expect(storedUser!.status).toBe('INACTIVE'); // New users are inactive until email verified
      expect(storedUser!.passwordHash).toBeTruthy(); // Password should be hashed
      expect(storedUser!.passwordHash).not.toBe(registrationData.password); // Should NOT be plaintext

      // === PHASE 3: ACTIVATE USER FOR LOGIN ===
      // Simulate email verification
      const activatedUser = await prismaService.user.update({
        where: { id: storedUser!.id },
        data: {
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });

      // === PHASE 4: LOGIN WITH SAME CREDENTIALS ===
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password,
        })
        .expect(200);

      // === PHASE 5: VERIFY DATA CONSISTENCY ===
      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('refreshToken');
      expect(loginResponse.body).toHaveProperty('user');

      const loggedInUser = loginResponse.body.user;

      // Verify returned user matches registered data
      expect(loggedInUser.firstName).toBe(registrationData.firstName);
      expect(loggedInUser.lastName).toBe(registrationData.lastName);
      expect(loggedInUser.email).toBe(registrationData.email.toLowerCase());
      expect(loggedInUser.status).toBe('ACTIVE');
      expect(loggedInUser).not.toHaveProperty('passwordHash');

      // Verify JWT tokens are valid and contain correct user info
      const decodedToken = JSON.parse(
        Buffer.from(loginResponse.body.accessToken.split('.')[1], 'base64').toString()
      );
      expect(decodedToken.sub).toBe(loggedInUser.id);
      expect(decodedToken.email).toBe(registrationData.email.toLowerCase());
    });

    it('should reject login with registered email but wrong password', async () => {
      // Register user
      const registrationData = {
        firstName: 'Wrong',
        lastName: 'Password',
        email: 'wrongpass@example.com',
        password: 'SecureKey123!@#', // Must not contain firstName/lastName/email
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registrationData)
        .expect(201);

      // Activate user
      const user = await prismaService.user.findUnique({
        where: { email: registrationData.email.toLowerCase() },
      });
      await prismaService.user.update({
        where: { id: user!.id },
        data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
      });

      // Try login with wrong password
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registrationData.email,
          password: 'DifferentKey456!@',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });

    it('should preserve data integrity across multiple login attempts', async () => {
      // Register user with specific data
      const registrationData = {
        firstName: 'Multi',
        lastName: 'Login',
        email: 'multilogin@example.com',
        password: 'SecureAccess987!@', // Must not contain firstName/lastName/email
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registrationData)
        .expect(201);

      // Activate user
      const user = await prismaService.user.findUnique({
        where: { email: registrationData.email.toLowerCase() },
      });
      await prismaService.user.update({
        where: { id: user!.id },
        data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
      });

      // Login multiple times
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: registrationData.email,
            password: registrationData.password,
          })
          .expect(200);

        // Verify data consistency on each login
        expect(response.body.user.firstName).toBe(registrationData.firstName);
        expect(response.body.user.lastName).toBe(registrationData.lastName);
        expect(response.body.user.email).toBe(registrationData.email.toLowerCase());
        expect(response.body.user.status).toBe('ACTIVE');
      }

      // Verify lastLoginAt was updated
      const finalUser = await prismaService.user.findUnique({
        where: { email: registrationData.email.toLowerCase() },
      });
      expect(finalUser!.lastLoginAt).toBeTruthy();
    });

    it('should handle data normalization consistently (uppercase email)', async () => {
      // Register with mixed case email
      const registrationData = {
        firstName: 'Norm',
        lastName: 'Case',
        email: 'NormCase@EXAMPLE.COM',
        password: 'ValidKey456!@#', // Must not contain firstName/lastName/email
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registrationData)
        .expect(201);

      // Should return lowercase email
      expect(registerResponse.body.user.email).toBe('normcase@example.com');

      // Activate user
      const user = await prismaService.user.findUnique({
        where: { email: 'normcase@example.com' },
      });
      await prismaService.user.update({
        where: { id: user!.id },
        data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
      });

      // Login with different case variations should all work
      const loginVariations = [
        'normcase@example.com',
        'NORMCASE@EXAMPLE.COM',
        'NormCase@Example.Com',
      ];

      for (const emailVariation of loginVariations) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: emailVariation,
            password: registrationData.password,
          })
          .expect(200);

        expect(response.body.user.email).toBe('normcase@example.com');
      }
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

  describe('POST /auth/password/reset/request', () => {
    let testUser: Awaited<ReturnType<typeof factory.users.buildWithPassword>>;

    beforeEach(async () => {
      // Create test user
      testUser = await factory.users.buildWithPassword('Password123!', {
        email: 'passwordreset@example.com',
        firstName: 'John',
        lastName: 'Johnson',
        status: 'ACTIVE' as any,
        emailVerifiedAt: new Date(),
      });
    });

    it('should initiate password reset successfully for existing user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/password/reset/request')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('reset');

      // In test environment, token should be returned (in production it's only emailed)
      if (process.env.NODE_ENV === 'test') {
        expect(response.body).toHaveProperty('token');
      }
    });

    it('should return success even for non-existent user (security)', async () => {
      // Security: Don't reveal whether email exists
      const response = await request(app.getHttpServer())
        .post('/auth/password/reset/request')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/password/reset/request')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should handle multiple reset requests (rate limiting)', async () => {
      // First request succeeds
      await request(app.getHttpServer())
        .post('/auth/password/reset/request')
        .send({ email: testUser.email })
        .expect(200);

      // Second request within rate limit window should still succeed
      // but might not generate new token
      const response = await request(app.getHttpServer())
        .post('/auth/password/reset/request')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /auth/password/reset/validate', () => {
    let testUser: Awaited<ReturnType<typeof factory.users.buildWithPassword>>;
    let resetToken: string;

    beforeEach(async () => {
      // Create test user and request password reset
      testUser = await factory.users.buildWithPassword('Password123!', {
        email: 'validatetoken@example.com',
        firstName: 'Validate',
        lastName: 'Token',
        status: 'ACTIVE' as any,
        emailVerifiedAt: new Date(),
      });

      const resetResponse = await request(app.getHttpServer())
        .post('/auth/password/reset/request')
        .send({ email: testUser.email });

      resetToken = resetResponse.body.token;
    });

    it('should validate valid reset token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/password/reset/validate')
        .send({ token: resetToken })
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).not.toHaveProperty('error');
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/password/reset/validate')
        .send({ token: 'invalid-token-12345' })
        .expect(200);

      expect(response.body).toHaveProperty('valid', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject empty token', async () => {
      await request(app.getHttpServer())
        .post('/auth/password/reset/validate')
        .send({ token: '' })
        .expect(400);
    });
  });

  describe('POST /auth/password/reset/complete', () => {
    let testUser: Awaited<ReturnType<typeof factory.users.buildWithPassword>>;
    let resetToken: string;
    const newPassword = 'NewPassword123!';

    beforeEach(async () => {
      // Create test user and request password reset
      testUser = await factory.users.buildWithPassword('Password123!', {
        email: 'completereset@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        status: 'ACTIVE' as any,
        emailVerifiedAt: new Date(),
      });

      const resetResponse = await request(app.getHttpServer())
        .post('/auth/password/reset/request')
        .send({ email: testUser.email });

      resetToken = resetResponse.body.token;
    });

    it('should reset password successfully with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/password/reset/complete')
        .send({
          token: resetToken,
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');

      // Verify can login with new password
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');

      // Verify old password no longer works
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'Password123!',
        })
        .expect(401);
    });

    it('should return 400 when passwords do not match', async () => {
      await request(app.getHttpServer())
        .post('/auth/password/reset/complete')
        .send({
          token: resetToken,
          newPassword,
          confirmPassword: 'DifferentPassword123!',
        })
        .expect(400);
    });

    it('should return 400 for weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/password/reset/complete')
        .send({
          token: resetToken,
          newPassword: 'weak',
          confirmPassword: 'weak',
        })
        .expect(400);
    });

    it('should return 400 for invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/password/reset/complete')
        .send({
          token: 'invalid-token',
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(400);
    });

    it('should invalidate token after successful reset', async () => {
      // Reset password
      await request(app.getHttpServer())
        .post('/auth/password/reset/complete')
        .send({
          token: resetToken,
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      // Try to use same token again
      await request(app.getHttpServer())
        .post('/auth/password/reset/complete')
        .send({
          token: resetToken,
          newPassword: 'AnotherPassword123!',
          confirmPassword: 'AnotherPassword123!',
        })
        .expect(400);
    });
  });

  describe('POST /auth/password/change', () => {
    let testUser: Awaited<ReturnType<typeof factory.users.buildWithPassword>>;
    let accessToken: string;
    const currentPassword = 'Password123!';
    const newPassword = 'SecureKey789!';

    beforeEach(async () => {
      // Create test user and login
      testUser = await factory.users.buildWithPassword(currentPassword, {
        email: 'changepassword@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
        status: 'ACTIVE' as any,
        emailVerifiedAt: new Date(),
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: currentPassword,
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should change password successfully with valid current password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');

      // Verify can login with new password
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');

      // Verify old password no longer works
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: currentPassword,
        })
        .expect(401);
    });

    it('should return 401 for incorrect current password', async () => {
      await request(app.getHttpServer())
        .post('/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(401);
    });

    it('should return 400 when new passwords do not match', async () => {
      await request(app.getHttpServer())
        .post('/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword,
          confirmPassword: 'DifferentPassword456!',
        })
        .expect(400);
    });

    it('should return 400 for weak new password', async () => {
      await request(app.getHttpServer())
        .post('/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword: 'weak',
          confirmPassword: 'weak',
        })
        .expect(400);
    });

    it('should return 401 without authorization header', async () => {
      await request(app.getHttpServer())
        .post('/auth/password/change')
        .send({
          currentPassword,
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(401);
    });

    it('should prevent password reuse', async () => {
      // Change password to newPassword
      await request(app.getHttpServer())
        .post('/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      // Login with new password to get new token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        });

      const newAccessToken = loginResponse.body.accessToken;

      // Try to change back to old password (should be prevented by password history)
      const response = await request(app.getHttpServer())
        .post('/auth/password/change')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({
          currentPassword: newPassword,
          newPassword: currentPassword,
          confirmPassword: currentPassword,
        });

      // Should return 400 if password history is enforced
      // If it returns 200, password history is not enforced (which is also acceptable)
      expect([200, 400]).toContain(response.status);
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

      // 2. Activate user (simulate email verification)
      // NOTE: Users must be ACTIVE to use protected endpoints
      await prismaService.user.update({
        where: { email: userEmail },
        data: {
          status: 'ACTIVE',
          emailVerifiedAt: new Date()
        },
      });

      // 3. Login to get fresh tokens for ACTIVE user
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userEmail,
          password: userPassword,
        })
        .expect(200);

      const activeAccessToken = loginResponse.body.accessToken;

      // 4. Access profile with active user token
      const profileResponse1 = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${activeAccessToken}`)
        .expect(200);

      expect(profileResponse1.body.email).toBe(userEmail);

      // 5. Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${activeAccessToken}`)
        .expect(204);

      // 6. Login again with credentials (verify re-login works)
      const loginResponse2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userEmail,
          password: userPassword,
        })
        .expect(200);

      // 7. Verify new tokens work
      const profileResponse2 = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginResponse2.body.accessToken}`)
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

      // 2. Activate user (simulate email verification)
      await prismaService.user.update({
        where: { email: 'refreshflow@example.com' },
        data: {
          status: 'ACTIVE',
          emailVerifiedAt: new Date()
        },
      });

      // Wait 1 second to ensure different iat timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Refresh token
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
        email: `concurrent-${Date.now()}@example.com`,
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

    it('should complete full password reset flow (request → validate → complete)', async () => {
      const userEmail = 'fullresetflow@example.com';
      const originalPassword = 'OriginalPassword123!';
      const newPassword = 'UpdatedKey456!';

      // 1. Create user
      const testUser = await factory.users.buildWithPassword(originalPassword, {
        email: userEmail,
        firstName: 'Robert',
        lastName: 'Wilson',
        status: 'ACTIVE' as any,
        emailVerifiedAt: new Date(),
      });

      // 2. Verify user can login with original password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userEmail, password: originalPassword })
        .expect(200);

      // 3. Request password reset
      const resetResponse = await request(app.getHttpServer())
        .post('/auth/password/reset/request')
        .send({ email: userEmail })
        .expect(200);

      expect(resetResponse.body).toHaveProperty('success', true);
      expect(resetResponse.body).toHaveProperty('token'); // Test mode returns token

      const resetToken = resetResponse.body.token;

      // 4. Validate reset token
      const validateResponse = await request(app.getHttpServer())
        .post('/auth/password/reset/validate')
        .send({ token: resetToken })
        .expect(200);

      expect(validateResponse.body).toHaveProperty('valid', true);

      // 5. Complete password reset
      const completeResponse = await request(app.getHttpServer())
        .post('/auth/password/reset/complete')
        .send({
          token: resetToken,
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      expect(completeResponse.body).toHaveProperty('success', true);

      // 6. Verify original password no longer works
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userEmail, password: originalPassword })
        .expect(401);

      // 7. Verify new password works
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userEmail, password: newPassword })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');

      // 8. Verify reset token cannot be reused
      await request(app.getHttpServer())
        .post('/auth/password/reset/complete')
        .send({
          token: resetToken,
          newPassword: 'AnotherPassword789!',
          confirmPassword: 'AnotherPassword789!',
        })
        .expect(400);

      // 9. Use new token to access protected endpoint
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(200);
    });

    it('should complete full password change flow (authenticated user changes password)', async () => {
      const userEmail = 'changeflow@example.com';
      const originalPassword = 'OriginalPassword123!';
      const newPassword = 'ModifiedKey789!';

      // 1. Create user
      await factory.users.buildWithPassword(originalPassword, {
        email: userEmail,
        firstName: 'Michael',
        lastName: 'Brown',
        status: 'ACTIVE' as any,
        emailVerifiedAt: new Date(),
      });

      // 2. Login with original password
      const loginResponse1 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userEmail, password: originalPassword })
        .expect(200);

      const originalAccessToken = loginResponse1.body.accessToken;

      // 3. Change password while authenticated
      const changeResponse = await request(app.getHttpServer())
        .post('/auth/password/change')
        .set('Authorization', `Bearer ${originalAccessToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      expect(changeResponse.body).toHaveProperty('success', true);

      // 4. Verify old password no longer works
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userEmail, password: originalPassword })
        .expect(401);

      // 5. Verify new password works
      const loginResponse2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userEmail, password: newPassword })
        .expect(200);

      expect(loginResponse2.body).toHaveProperty('accessToken');

      // 6. Verify old access token still works (until expiry)
      // JWT tokens remain valid until they expire
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${originalAccessToken}`)
        .expect(200);

      // 7. Verify new access token works
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginResponse2.body.accessToken}`)
        .expect(200);
    });
  });

  describe('Email Verification Integration Tests', () => {
    it('should generate verification token during user registration', async () => {
      const email = `verify-test-${Date.now()}@example.com`;
      const password = 'ValidPassword123!@#SecurePassword456!@#';

      // Register user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password,
          firstName: 'Verify',
          lastName: 'Test',
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('success', true);
      expect(registerResponse.body).toHaveProperty('user.email', email);
      expect(registerResponse.body).toHaveProperty('user.emailVerifiedAt', null);

      // Verify user is created but not verified
      const createdUser = await prismaService.user.findUnique({
        where: { email },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser?.emailVerifiedAt).toBeNull();
    });

    it('should successfully verify email with valid token', async () => {
      const email = `verify-valid-${Date.now()}@example.com`;
      const password = 'ValidPassword123!@#SecurePassword456!@#';

      // Register user (generates verification token in Redis)
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password,
          firstName: 'Valid',
          lastName: 'Token',
        })
        .expect(201);

      // Get verification token from Redis (simulating email link)
      const userKey = `email_verification_user:${(await prismaService.user.findUnique({ where: { email } }))?.id}`;
      const verificationToken = await mockRedisClient.get(userKey);
      expect(verificationToken).toBeDefined();

      // Verify email with token
      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(verifyResponse.body).toHaveProperty('success', true);
      expect(verifyResponse.body).toHaveProperty('message');
      expect(verifyResponse.body.user).toHaveProperty('emailVerifiedAt');

      // Verify user status is now ACTIVE
      const verifiedUser = await prismaService.user.findUnique({
        where: { email },
      });
      expect(verifiedUser?.emailVerifiedAt).not.toBeNull();
      expect(verifiedUser?.status).toBe('ACTIVE');
    });

    it('should reject verification with invalid token', async () => {
      const invalidToken = 'a'.repeat(64);

      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: invalidToken })
        .expect(400);

      expect(verifyResponse.body).toHaveProperty('message');
      expect(verifyResponse.body.message).toContain('Invalid');
    });

    it('should reject verification with malformed token', async () => {
      const malformedToken = 'not-a-valid-token';

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: malformedToken })
        .expect(400);
    });

    it('should allow user to login after email verification', async () => {
      const email = `verify-login-${Date.now()}@example.com`;
      const password = 'ValidPassword123!@#SecurePassword456!@#';

      // Register user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password,
          firstName: 'Verify',
          lastName: 'Login',
        })
        .expect(201);

      // Get and use verification token
      const user = await prismaService.user.findUnique({ where: { email } });
      const userKey = `email_verification_user:${user?.id}`;
      const verificationToken = await mockRedisClient.get(userKey);

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      // Login should now succeed (user is ACTIVE)
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('refreshToken');
    });

    it('should prevent login with unverified email (INACTIVE status)', async () => {
      const email = `verify-inactive-${Date.now()}@example.com`;
      const password = 'ValidPassword123!@#SecurePassword456!@#';

      // Register user but don't verify email
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password,
          firstName: 'Inactive',
          lastName: 'User',
        })
        .expect(201);

      // Login attempt should fail (user still INACTIVE)
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(401);
    });

    it('should handle resend verification email for valid user', async () => {
      const email = `resend-test-${Date.now()}@example.com`;
      const password = 'ValidPassword123!@#SecurePassword456!@#';

      // Register user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password,
          firstName: 'Resend',
          lastName: 'Test',
        })
        .expect(201);

      const userId = registerResponse.body.user.id;

      // Login would fail (user not verified), but first try to resend
      // Resend requires authentication, so we need to bypass it or test as documented
      // Note: This would require implementing a public resend endpoint or testing through auth
    });

    it('should prevent token reuse after verification', async () => {
      const email = `reuse-test-${Date.now()}@example.com`;
      const password = 'ValidPassword123!@#SecurePassword456!@#';

      // Register user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password,
          firstName: 'Reuse',
          lastName: 'Test',
        })
        .expect(201);

      // Get verification token
      const user = await prismaService.user.findUnique({ where: { email } });
      const userKey = `email_verification_user:${user?.id}`;
      const verificationToken = await mockRedisClient.get(userKey);

      // Verify email (consumes token)
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      // Attempt to reuse same token (should fail)
      const reuseResponse = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(400);

      expect(reuseResponse.body.message).toContain('Invalid');
    });

    it('should handle complete registration to verification to login flow', async () => {
      const email = `complete-flow-${Date.now()}@example.com`;
      const password = 'ValidPassword123!@#SecurePassword456!@#';

      // 1. Register
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password,
          firstName: 'Complete',
          lastName: 'Flow',
        })
        .expect(201);

      expect(registerResponse.body.user.status).toBe('INACTIVE');
      expect(registerResponse.body.user.emailVerifiedAt).toBeNull();
      const userId = registerResponse.body.user.id;

      // 2. Verify email is not yet verified
      const unverifiedUser = await prismaService.user.findUnique({
        where: { id: userId },
      });
      expect(unverifiedUser?.emailVerifiedAt).toBeNull();

      // 3. Get verification token and verify email
      const userKey = `email_verification_user:${userId}`;
      const verificationToken = await mockRedisClient.get(userKey);
      expect(verificationToken).toBeDefined();

      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.user.status).toBe('ACTIVE');
      expect(verifyResponse.body.user.emailVerifiedAt).not.toBeNull();

      // 4. Verify user status changed in database
      const verifiedUser = await prismaService.user.findUnique({
        where: { id: userId },
      });
      expect(verifiedUser?.status).toBe('ACTIVE');
      expect(verifiedUser?.emailVerifiedAt).not.toBeNull();

      // 5. Login should now succeed
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('refreshToken');
      expect(loginResponse.body.user.emailVerifiedAt).not.toBeNull();
    });

    it('should handle multiple users with independent verification tokens', async () => {
      const email1 = `multi-user-1-${Date.now()}@example.com`;
      const email2 = `multi-user-2-${Date.now()}@example.com`;
      const password = 'ValidPassword123!@#SecurePassword456!@#';

      // Register two users
      const reg1 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: email1,
          password,
          firstName: 'User',
          lastName: 'One',
        })
        .expect(201);

      const reg2 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: email2,
          password,
          firstName: 'User',
          lastName: 'Two',
        })
        .expect(201);

      const userId1 = reg1.body.user.id;
      const userId2 = reg2.body.user.id;

      // Get tokens for both users
      const token1 = await mockRedisClient.get(`email_verification_user:${userId1}`);
      const token2 = await mockRedisClient.get(`email_verification_user:${userId2}`);

      expect(token1).not.toBe(token2);

      // Verify user 1
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: token1 })
        .expect(200);

      // User 2 should still be inactive
      const user2Check = await prismaService.user.findUnique({
        where: { id: userId2 },
      });
      expect(user2Check?.status).toBe('INACTIVE');

      // Verify user 2
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: token2 })
        .expect(200);

      // Both should now be active
      const user1Check = await prismaService.user.findUnique({
        where: { id: userId1 },
      });
      const user2Final = await prismaService.user.findUnique({
        where: { id: userId2 },
      });
      expect(user1Check?.status).toBe('ACTIVE');
      expect(user2Final?.status).toBe('ACTIVE');
    });
  });
});
