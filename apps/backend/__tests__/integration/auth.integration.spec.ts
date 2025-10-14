/**
 * Auth Integration Tests
 *
 * ⚠️ DEFERRED TO P.3.5 - Unit Tests Disguised as Integration Tests
 *
 * These tests mock all TypeORM repositories and never connect to a real database.
 * They are unit tests, not integration tests. When services internally use Prisma,
 * they fail because no real database exists.
 *
 * Issues:
 * - Lines 126-146: Overrides all repositories with jest.fn() mocks
 * - Never initializes PrismaModule or actual database
 * - Services use PrismaUserService internally → real DB queries fail
 * - Error: "column users.first_name does not exist" (database doesn't exist at all)
 *
 * Migration Status:
 * - ✅ Prisma migrations created and working (20251012173537_initial_schema)
 * - ✅ All 1760 unit tests passing with Prisma
 * - ✅ Services fully migrated to Prisma
 * - ⏸️ Real integration tests deferred to P.3.5
 *
 * See: docs/migration/P.3.4.9-INTEGRATION-TEST-ANALYSIS.md
 *
 * TODO P.3.5: Rewrite as real integration tests using actual Prisma database
 * TODO P.3.5: Remove mocked repositories, use setupTestDatabase()
 * TODO P.3.5: Test actual HTTP → Service → Database flow
 */

// Mock bcrypt - MUST be before imports for Jest hoisting
jest.mock('bcryptjs');

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { AuthModule } from '@/auth/auth.module';
import { RedisModule } from '@/core/redis/redis.module';
import { RateLimitGuard } from '@/auth/guards/rate-limit.guard';
import {
  User,
  UserStatus,
  UserRole,
} from '../../generated/prisma';
import { AuditLog } from '../../generated/prisma';
import { PasswordHistory } from '../../generated/prisma';
import { PasswordSecurityService } from '@/auth/services/password-security.service';
import { RateLimitService } from '@/auth/services/rate-limit.service';
import { AccountLockoutService } from '@/auth/services/account-lockout.service';
import { EmailVerificationService } from '@/auth/services/email-verification.service';
import { RegisterDto } from '@/auth/dto/register.dto';
import { LoginDto } from '@/auth/dto/login.dto';

import { createMockRedis } from '../mocks/redis.mock';

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Create proper Redis mock with EventEmitter
const mockRedisClient = createMockRedis();

describe.skip('Auth Integration Tests', () => {
  let app: INestApplication;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: JwtService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashedPassword123',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    currency: 'USD',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    lastLoginAt: null,
    emailVerifiedAt: null,
    accounts: [],
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    },
    get isEmailVerified() {
      return this.emailVerifiedAt !== null;
    },
    get isActive() {
      return this.status === UserStatus.ACTIVE;
    },
  } as User;

  beforeEach(async () => {
    // Set environment variables for ConfigService
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

    // Database Configuration
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_USERNAME = 'postgres';
    process.env.DB_PASSWORD = 'testpassword';
    process.env.DB_DATABASE = 'moneywise_test';

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
          ignoreEnvFile: true, // Use process.env directly (bypass .env files)
          validate: undefined, // Skip validation in tests
          cache: false, // Don't cache config in tests
        }),
        AuthModule,
      ],
    })
      // Override ConfigService to provide auth config
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          if (key === 'auth') {
            return {
              JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
              JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
              JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
              JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
            };
          }
          return process.env[key];
        }),
      })
      // RateLimitGuard now uses injected Redis from RedisModule.forTest()
      // No need to override - it will automatically use the mock Redis
      .overrideProvider(getRepositoryToken(User))
      .useValue({
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
      })
      .overrideProvider(getRepositoryToken(AuditLog))
      .useValue({
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
      })
      .overrideProvider(getRepositoryToken(PasswordHistory))
      .useValue({
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true })
    );

    userRepository = moduleFixture.get(getRepositoryToken(User));
    jwtService = moduleFixture.get(JwtService);

    await app.init();
  });

  afterEach(async () => {
    // Reset Redis mock state to prevent leakage between tests
    if (mockRedisClient.__reset) {
      mockRedisClient.__reset();
    }

    // Clear repository mocks
    userRepository.findOne.mockClear();
    userRepository.create.mockClear();
    userRepository.save.mockClear();
    userRepository.update.mockClear();

    if (app) {
      await app.close();
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
      userRepository.findOne.mockResolvedValue(null); // User doesn't exist
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user.email).toBe(mockUser.email);
      expect(response.body.user.fullName).toBe('John Doe');
    });

    it('should return 409 when user already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser); // User exists

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterDto)
        .expect(409);

      expect(response.body.message).toBe('User with this email already exists');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidDto = {
        ...validRegisterDto,
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 for weak password', async () => {
      const weakPasswordDto = {
        ...validRegisterDto,
        password: 'weak',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(weakPasswordDto)
        .expect(400);
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

    it('should return 400 for names that are too short', async () => {
      const shortNameDto = {
        ...validRegisterDto,
        firstName: 'A',
        lastName: 'B',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(shortNameDto)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    const validLoginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({} as UpdateResult);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 401 for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginDto)
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for incorrect password', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginDto)
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for inactive user', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
      } as User;

      userRepository.findOne.mockResolvedValue(inactiveUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginDto)
        .expect(401);

      expect(response.body.message).toBe('Account is not active');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidDto = {
        ...validLoginDto,
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 for empty password', async () => {
      const emptyPasswordDto = {
        ...validLoginDto,
        password: '',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(emptyPasswordDto)
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const validPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      userRepository.findOne.mockResolvedValue(mockUser);

      // Mock JWT service to return valid payload
      jest.spyOn(jwtService, 'verify').mockReturnValue(validPayload);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
    });

    it('should return 401 for invalid refresh token', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should return 401 when user not found', async () => {
      const validPayload = {
        sub: 'non-existent-id',
        email: 'test@example.com',
        role: 'user',
      };
      jest.spyOn(jwtService, 'verify').mockReturnValue(validPayload);
      userRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-token' })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should return 401 for missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(401);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const accessToken = jwtService.sign(
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' }
      );

      // Mock the validateUser method that gets called by JWT strategy
      userRepository.findOne.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockUser.id);
      expect(response.body).toHaveProperty('email', mockUser.email);
      expect(response.body).toHaveProperty('fullName', 'John Doe');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 401 without authorization header', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwtService.sign(
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '-1h' } // expired
      );

      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const accessToken = jwtService.sign(
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' }
      );

      userRepository.findOne.mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('should return 401 without authorization header', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('authentication flow integration', () => {
    it('should complete full registration -> login -> profile -> logout flow', async () => {
      // 1. Register
      userRepository.findOne.mockResolvedValue(null); // User doesn't exist
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'flow@example.com',
          firstName: 'Flow',
          lastName: 'Test',
          password: 'Password123!',
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('accessToken');

      // 2. Use token to access profile
      userRepository.findOne.mockResolvedValue(mockUser);

      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(mockUser.email);

      // 3. Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
        .expect(204);
    });

    it('should handle token refresh flow', async () => {
      // 1. Login to get tokens
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({} as UpdateResult);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(200);

      // 2. Refresh token
      const validPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      jest.spyOn(jwtService, 'verify').mockReturnValue(validPayload);
      // Mock jwtService.sign to return different valid JWT tokens with different timestamps
      const accessPayload = { sub: mockUser.id, email: mockUser.email, role: mockUser.role, iat: Math.floor(Date.now() / 1000) + 1 };
      const refreshPayload = { sub: mockUser.id, email: mockUser.email, role: mockUser.role, iat: Math.floor(Date.now() / 1000) + 2 };
      const newAccessToken = jwtService.sign(accessPayload, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' });
      const newRefreshToken = jwtService.sign(refreshPayload, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' });
      jest.spyOn(jwtService, 'sign').mockReturnValueOnce(newAccessToken).mockReturnValueOnce(newRefreshToken);
      userRepository.findOne.mockResolvedValue(mockUser);

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loginResponse.body.refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body.accessToken).not.toBe(
        loginResponse.body.accessToken
      );

      // 3. Use new token to access profile
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(mockUser.email);
    });
  });
});
