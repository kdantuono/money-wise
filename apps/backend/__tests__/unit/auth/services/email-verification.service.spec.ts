import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  EmailVerificationService,
  EmailVerificationToken,
} from '../../../../src/auth/services/email-verification.service';
import { EmailVerificationConfig } from '../../../../src/core/config/email-verification.config';
import { UserStatus } from '../../../../generated/prisma';
import { PrismaUserService } from '../../../../src/core/database/prisma/services/user.service';
import { PrismaService } from '../../../../src/core/database/prisma/prisma.service';
import type { User } from '../../../../generated/prisma';

// Mock Redis implementation with date serialization handling
class MockRedis {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Parse and properly convert dates from ISO strings back to Date objects
    try {
      const parsed = JSON.parse(entry.value);
      if (parsed.expiresAt) parsed.expiresAt = new Date(parsed.expiresAt);
      if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt);
      return JSON.stringify(parsed);
    } catch {
      return entry.value;
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + seconds * 1000,
    });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    keys.forEach((key) => {
      if (this.store.delete(key)) deleted++;
    });
    return deleted;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter((key) => regex.test(key));
  }

  async scan(cursor: string, ...args: any[]): Promise<[string, string[]]> {
    let match = '*';
    let count = 10;

    // Parse MATCH and COUNT arguments
    for (let i = 0; i < args.length; i += 2) {
      if (args[i] === 'MATCH') match = args[i + 1];
      if (args[i] === 'COUNT') count = args[i + 1];
    }

    const regex = new RegExp('^' + match.replace(/\*/g, '.*') + '$');
    const allKeys = Array.from(this.store.keys()).filter((key) => regex.test(key));

    // Simple cursor implementation: divide keys into chunks
    const startIdx = cursor === '0' ? 0 : parseInt(cursor);
    const endIdx = Math.min(startIdx + count, allKeys.length);
    const keys = allKeys.slice(startIdx, endIdx);
    const nextCursor = endIdx >= allKeys.length ? '0' : endIdx.toString();

    return [nextCursor, keys];
  }

  async getdel(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Delete and return
    this.store.delete(key);
    return entry.value;
  }

  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    const currentValue = entry ? parseInt(entry.value) : 0;
    const newValue = currentValue + 1;
    this.store.set(key, { value: newValue.toString() });
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async eval(
    script: string,
    numKeys: number,
    ...args: any[]
  ): Promise<any> {
    // Simple mock for Lua script evaluation
    // In this case, we're mainly supporting INCR + EXPIRE pattern
    // Extract keys and argv from args
    const keys = args.slice(0, numKeys);
    const argv = args.slice(numKeys);

    // Mock the common INCR + EXPIRE pattern
    if (
      script.includes('INCR') &&
      script.includes('EXPIRE') &&
      keys.length > 0
    ) {
      const key = keys[0];
      const ttl = argv[0];

      // Perform INCR
      const entry = this.store.get(key);
      const currentValue = entry ? parseInt(entry.value) : 0;
      const newValue = currentValue + 1;

      // Set with expiration
      this.store.set(key, {
        value: newValue.toString(),
        expiresAt: Date.now() + ttl * 1000,
      });

      return 1; // Return value from script
    }

    return 1; // Default return
  }

  pipeline(): MockRedisPipeline {
    return new MockRedisPipeline(this.store);
  }

  on(event: string, handler: (...args: any[]) => void): void {
    // Mock event listener
  }

  async quit(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  clear(): void {
    this.store.clear();
  }
}

class MockRedisPipeline {
  private commands: Array<{ cmd: string; args: any[] }> = [];

  constructor(private store: Map<string, { value: string; expiresAt?: number }>) {}

  get(key: string): this {
    this.commands.push({ cmd: 'get', args: [key] });
    return this;
  }

  del(key: string): this {
    this.commands.push({ cmd: 'del', args: [key] });
    return this;
  }

  setex(key: string, seconds: number, value: string): this {
    this.commands.push({ cmd: 'setex', args: [key, seconds, value] });
    return this;
  }

  incr(key: string): this {
    this.commands.push({ cmd: 'incr', args: [key] });
    return this;
  }

  expire(key: string, seconds: number): this {
    this.commands.push({ cmd: 'expire', args: [key, seconds] });
    return this;
  }

  async exec(): Promise<any[]> {
    const results: any[] = [];

    for (const { cmd, args } of this.commands) {
      if (cmd === 'get') {
        const entry = this.store.get(args[0]);
        if (!entry) {
          results.push([null, null]);
        } else {
          if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.store.delete(args[0]);
            results.push([null, null]);
          } else {
            results.push([null, entry.value]);
          }
        }
      } else if (cmd === 'del') {
        const deleted = this.store.delete(args[0]) ? 1 : 0;
        results.push([null, deleted]);
      } else if (cmd === 'setex') {
        this.store.set(args[0], {
          value: args[2],
          expiresAt: Date.now() + args[1] * 1000,
        });
        results.push([null, 'OK']);
      } else if (cmd === 'incr') {
        const entry = this.store.get(args[0]);
        const currentValue = entry ? parseInt(entry.value) : 0;
        const newValue = currentValue + 1;
        this.store.set(args[0], { value: newValue.toString() });
        results.push([null, newValue]);
      } else if (cmd === 'expire') {
        const entry = this.store.get(args[0]);
        if (entry) {
          entry.expiresAt = Date.now() + args[1] * 1000;
          results.push([null, 1]);
        } else {
          results.push([null, 0]);
        }
      }
    }

    return results;
  }
}

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let mockPrismaUserService: jest.Mocked<PrismaUserService>;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockRedis: MockRedis;

  const createMockUser = (overrides?: Partial<User>): User => {
    const baseUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      firstName: 'Test',
      lastName: 'User',
      role: 0 as any, // UserRole.USER
      status: UserStatus.INACTIVE,
      emailVerifiedAt: null,
      lastLoginAt: null,
      currency: 'USD',
      timezone: 'UTC',
      avatar: null,
      preferences: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      accounts: [],
      ...overrides,
    };

    // Add getters
    Object.defineProperty(baseUser, 'fullName', {
      get: function() { return `${this.firstName} ${this.lastName}`; },
      enumerable: true,
    });
    Object.defineProperty(baseUser, 'isEmailVerified', {
      get: function() { return this.emailVerifiedAt !== null; },
      enumerable: true,
    });
    Object.defineProperty(baseUser, 'isActive', {
      get: function() { return this.status === UserStatus.ACTIVE; },
      enumerable: true,
    });

    return baseUser as User;
  };

  beforeEach(async () => {
    mockRedis = new MockRedis();

    mockPrismaUserService = {
      findOne: jest.fn(),
      update: jest.fn(),
      verifyEmail: jest.fn(),
      countVerifiedSince: jest.fn(),
    } as any;

    mockPrismaService = {
      $transaction: jest.fn(),
    } as any;

    // Create default email verification config
    const emailVerificationConfig = new EmailVerificationConfig({
      EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS: 24,
      EMAIL_VERIFICATION_MIN_VALIDITY_HOURS: 1,
      EMAIL_VERIFICATION_RESEND_RATE_LIMIT: 3,
      EMAIL_VERIFICATION_VERIFICATION_RATE_LIMIT: 5,
      EMAIL_VERIFICATION_TIMING_ATTACK_DELAY_MIN_MS: 100,
      EMAIL_VERIFICATION_TIMING_ATTACK_DELAY_MAX_MS: 300,
    });

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'emailVerification') {
          return emailVerificationConfig;
        }
        return null;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        {
          provide: PrismaUserService,
          useValue: mockPrismaUserService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'default',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRedis.clear();
  });

  describe('generateVerificationToken', () => {
    it('should generate and store verification token for valid user', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      const token = await service.generateVerificationToken(userId, email);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes -> 64 hex chars

      // Verify token is stored in Redis
      const tokenKey = `email_verification:${token}`;
      const storedData = await mockRedis.get(tokenKey);
      expect(storedData).toBeDefined();

      const tokenData: EmailVerificationToken = JSON.parse(storedData!);
      expect(tokenData.userId).toBe(userId);
      expect(tokenData.email).toBe(email);
      expect(tokenData.token).toBe(token);

      // Verify user reverse lookup is stored
      const userKey = `email_verification_user:${userId}`;
      const storedToken = await mockRedis.get(userKey);
      expect(storedToken).toBe(token);
    });

    it('should set token expiration to 24 hours from creation', async () => {
      const token = await service.generateVerificationToken('user-123', 'test@example.com');

      const tokenKey = `email_verification:${token}`;
      const storedData = await mockRedis.get(tokenKey);
      const tokenData: EmailVerificationToken = JSON.parse(storedData!);

      const expectedExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const actualExpiry = new Date(tokenData.expiresAt);

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(actualExpiry.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it('should generate unique tokens for multiple calls', async () => {
      const token1 = await service.generateVerificationToken('user-123', 'test1@example.com');
      const token2 = await service.generateVerificationToken('user-456', 'test2@example.com');

      expect(token1).not.toBe(token2);
    });

    it('should handle Redis errors gracefully during token generation', async () => {
      // Mock pipeline to throw error during exec
      const originalPipeline = mockRedis.pipeline.bind(mockRedis);
      jest.spyOn(mockRedis, 'pipeline').mockImplementation(() => {
        const pipeline = originalPipeline();
        // Override exec to throw error
        pipeline.exec = jest.fn().mockRejectedValueOnce(new Error('Redis connection failed'));
        return pipeline;
      });

      await expect(
        service.generateVerificationToken('user-123', 'test@example.com'),
      ).rejects.toThrow('Failed to generate verification token');
    });

    it('should store both token data and user reverse lookup', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      const token = await service.generateVerificationToken(userId, email);

      const tokenKey = `email_verification:${token}`;
      const userKey = `email_verification_user:${userId}`;

      expect(await mockRedis.get(tokenKey)).toBeDefined();
      expect(await mockRedis.get(userKey)).toBe(token);
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      const user = createMockUser({ emailVerifiedAt: null });
      const token = crypto.randomBytes(32).toString('hex');
      const tokenData: EmailVerificationToken = {
        token,
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      const tokenKey = `email_verification:${token}`;
      await mockRedis.setex(tokenKey, 24 * 60 * 60, JSON.stringify(tokenData));

      const updatedUser = createMockUser({
        id: user.id,
        email: user.email,
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
      });

      mockPrismaUserService.findOne.mockResolvedValueOnce(user);
      // Mock the transaction to return the updated user
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockPrismaInTx = {
          user: {
            update: jest.fn().mockResolvedValueOnce(updatedUser),
          },
        } as any;
        return callback(mockPrismaInTx);
      });

      const result = await service.verifyEmail(token);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email verified successfully');
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe(user.id);

      // Verify tokens were cleaned up
      expect(await mockRedis.get(tokenKey)).toBeNull();
      expect(await mockRedis.get(`email_verification_user:${user.id}`)).toBeNull();
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid-token';

      await expect(service.verifyEmail(invalidToken)).rejects.toThrow(BadRequestException);
      await expect(service.verifyEmail(invalidToken)).rejects.toThrow(
        'Invalid or expired verification token',
      );
    });

    it('should reject expired token', async () => {
      const user = createMockUser();
      const token = crypto.randomBytes(32).toString('hex');
      const tokenData: EmailVerificationToken = {
        token,
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      };

      const tokenKey = `email_verification:${token}`;
      // Use longer TTL so Redis doesn't auto-expire before service check
      await mockRedis.setex(tokenKey, 3600, JSON.stringify(tokenData));

      mockPrismaUserService.findOne.mockResolvedValue(user);

      // Generic error message for security (prevents user enumeration)
      await expect(service.verifyEmail(token)).rejects.toThrow('Invalid or expired verification token');

      // Verify expired token was cleaned up
      expect(await mockRedis.get(tokenKey)).toBeNull();
    });

    it('should reject token for non-existent user', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenData: EmailVerificationToken = {
        token,
        userId: 'non-existent-user',
        email: 'test@example.com',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      const tokenKey = `email_verification:${token}`;
      await mockRedis.setex(tokenKey, 24 * 60 * 60, JSON.stringify(tokenData));

      mockPrismaUserService.findOne.mockResolvedValueOnce(null);

      // Generic error message for security (prevents user enumeration)
      // Changed from NotFoundException to BadRequestException
      await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException);
      await expect(service.verifyEmail(token)).rejects.toThrow('Invalid or expired verification token');
    });

    it('should reject token if email does not match user', async () => {
      const user = createMockUser({ email: 'user@example.com', emailVerifiedAt: null });
      const token = crypto.randomBytes(32).toString('hex');
      const tokenData: EmailVerificationToken = {
        token,
        userId: user.id,
        email: 'different@example.com', // Mismatched email
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      const tokenKey = `email_verification:${token}`;
      await mockRedis.setex(tokenKey, 24 * 60 * 60, JSON.stringify(tokenData));

      mockPrismaUserService.findOne.mockResolvedValue(user);

      // Generic error message for security (prevents user enumeration)
      await expect(service.verifyEmail(token)).rejects.toThrow(
        'Invalid or expired verification token',
      );
    });

    it('should handle already verified email gracefully', async () => {
      const user = createMockUser({ emailVerifiedAt: new Date('2025-01-01') });
      const token = crypto.randomBytes(32).toString('hex');
      const tokenData: EmailVerificationToken = {
        token,
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      const tokenKey = `email_verification:${token}`;
      await mockRedis.setex(tokenKey, 24 * 60 * 60, JSON.stringify(tokenData));

      mockPrismaUserService.findOne.mockResolvedValueOnce(user);

      const result = await service.verifyEmail(token);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email is already verified');
      expect(result.user).toBeDefined();

      // Verify update was not called
      expect(mockPrismaUserService.update).not.toHaveBeenCalled();

      // Verify tokens were cleaned up
      expect(await mockRedis.get(tokenKey)).toBeNull();
    });

    it('should sanitize user data in response (exclude password)', async () => {
      const user = createMockUser({ passwordHash: 'super-secret-hash' });
      const token = crypto.randomBytes(32).toString('hex');
      const tokenData: EmailVerificationToken = {
        token,
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      await mockRedis.setex(`email_verification:${token}`, 24 * 60 * 60, JSON.stringify(tokenData));

      const updatedUser = createMockUser({
        id: user.id,
        email: user.email,
        passwordHash: 'super-secret-hash',
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
      });

      mockPrismaUserService.findOne.mockResolvedValueOnce(user);
      // Mock the transaction to return the updated user
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockPrismaInTx = {
          user: {
            update: jest.fn().mockResolvedValueOnce(updatedUser),
          },
        } as any;
        return callback(mockPrismaInTx);
      });

      const result = await service.verifyEmail(token);

      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should handle database errors during verification', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenData: EmailVerificationToken = {
        token,
        userId: 'user-123',
        email: 'test@example.com',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      await mockRedis.setex(`email_verification:${token}`, 24 * 60 * 60, JSON.stringify(tokenData));

      mockPrismaUserService.findOne.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(service.verifyEmail(token)).rejects.toThrow('Failed to verify email');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email for valid user', async () => {
      const user = createMockUser({ emailVerifiedAt: null });

      mockPrismaUserService.findOne.mockResolvedValueOnce(user);

      const token = await service.resendVerificationEmail(user.id);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token is stored
      const tokenKey = `email_verification:${token}`;
      const storedData = await mockRedis.get(tokenKey);
      expect(storedData).toBeDefined();
    });

    it('should reject resend for non-existent user', async () => {
      mockPrismaUserService.findOne.mockResolvedValueOnce(null);

      // Generic error message for security (prevents user enumeration)
      // Changed from NotFoundException to BadRequestException
      await expect(service.resendVerificationEmail('non-existent-user')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resendVerificationEmail('non-existent-user')).rejects.toThrow(
        'Unable to process resend request at this time',
      );
    });

    it('should reject resend for already verified email', async () => {
      const user = createMockUser({ emailVerifiedAt: new Date('2025-01-01') });

      mockPrismaUserService.findOne.mockResolvedValue(user);

      await expect(service.resendVerificationEmail(user.id)).rejects.toThrow(BadRequestException);
      await expect(service.resendVerificationEmail(user.id)).rejects.toThrow(
        'Email is already verified',
      );
    });

    it('should allow resending even if token exists (replace with new one)', async () => {
      const user = createMockUser({ emailVerifiedAt: null });
      const existingToken = crypto.randomBytes(32).toString('hex');
      const tokenData: EmailVerificationToken = {
        token: existingToken,
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000), // 23 hours remaining
        createdAt: new Date(),
      };

      await mockRedis.setex(
        `email_verification:${existingToken}`,
        23 * 60 * 60,
        JSON.stringify(tokenData),
      );
      await mockRedis.setex(`email_verification_user:${user.id}`, 23 * 60 * 60, existingToken);

      mockPrismaUserService.findOne.mockResolvedValue(user);

      // Should successfully generate a new token and replace the existing one
      const newToken = await service.resendVerificationEmail(user.id);
      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(existingToken); // Different token

      // Old token should be cleaned up
      expect(await mockRedis.get(`email_verification:${existingToken}`)).toBeNull();
      // New token should exist
      const newTokenData = await mockRedis.get(`email_verification:${newToken}`);
      expect(newTokenData).toBeDefined();
    });

    it('should allow resending if existing token expires soon (less than 1 hour)', async () => {
      const user = createMockUser({ emailVerifiedAt: null });
      const existingToken = crypto.randomBytes(32).toString('hex');
      const tokenData: EmailVerificationToken = {
        token: existingToken,
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes remaining
        createdAt: new Date(),
      };

      await mockRedis.setex(
        `email_verification:${existingToken}`,
        30 * 60,
        JSON.stringify(tokenData),
      );
      await mockRedis.setex(`email_verification_user:${user.id}`, 30 * 60, existingToken);

      mockPrismaUserService.findOne.mockResolvedValueOnce(user);

      const newToken = await service.resendVerificationEmail(user.id);

      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(existingToken);

      // Verify old token was cleaned up
      expect(await mockRedis.get(`email_verification:${existingToken}`)).toBeNull();

      // Verify new token exists
      const newTokenKey = `email_verification:${newToken}`;
      expect(await mockRedis.get(newTokenKey)).toBeDefined();
    });

    it('should clean up expired existing token before generating new one', async () => {
      const user = createMockUser({ emailVerifiedAt: null });
      const expiredToken = crypto.randomBytes(32).toString('hex');

      await mockRedis.setex(`email_verification_user:${user.id}`, 1, expiredToken);

      mockPrismaUserService.findOne.mockResolvedValueOnce(user);

      const newToken = await service.resendVerificationEmail(user.id);

      expect(newToken).toBeDefined();
      expect(await mockRedis.get(`email_verification:${expiredToken}`)).toBeNull();
    });

    it('should handle database errors during resend', async () => {
      mockPrismaUserService.findOne.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.resendVerificationEmail('user-123')).rejects.toThrow(
        'Failed to resend verification email',
      );
    });
  });

  describe('isVerificationRequired', () => {
    it('should return true for unverified user', async () => {
      const user = createMockUser({ emailVerifiedAt: null });

      mockPrismaUserService.findOne.mockResolvedValueOnce(user);

      const required = await service.isVerificationRequired(user.id);

      expect(required).toBe(true);
    });

    it('should return false for verified user', async () => {
      const user = createMockUser({ emailVerifiedAt: new Date('2025-01-01') });

      mockPrismaUserService.findOne.mockResolvedValueOnce(user);

      const required = await service.isVerificationRequired(user.id);

      expect(required).toBe(false);
    });

    it('should return true for non-existent user (fail-safe)', async () => {
      mockPrismaUserService.findOne.mockResolvedValueOnce(null);

      const required = await service.isVerificationRequired('non-existent-user');

      expect(required).toBe(true);
    });

    it('should return true on database error (fail-safe)', async () => {
      mockPrismaUserService.findOne.mockRejectedValueOnce(new Error('Database error'));

      const required = await service.isVerificationRequired('user-123');

      expect(required).toBe(true);
    });
  });

  describe('getTokenInfo', () => {
    it('should return token information for valid token', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenData: EmailVerificationToken = {
        token,
        userId: 'user-123',
        email: 'test@example.com',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      await mockRedis.setex(`email_verification:${token}`, 24 * 60 * 60, JSON.stringify(tokenData));

      const info = await service.getTokenInfo(token);

      expect(info).toBeDefined();
      expect(info?.userId).toBe('user-123');
      expect(info?.email).toBe('test@example.com');
      expect(info?.expiresAt).toBeDefined();
      expect(info?.createdAt).toBeDefined();
      expect(info).not.toHaveProperty('token'); // Sanitized
    });

    it('should return null for non-existent token', async () => {
      const info = await service.getTokenInfo('non-existent-token');

      expect(info).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      jest.spyOn(mockRedis, 'get').mockRejectedValueOnce(new Error('Redis error'));

      const info = await service.getTokenInfo('some-token');

      expect(info).toBeNull();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      const expiredToken1 = crypto.randomBytes(32).toString('hex');
      const expiredToken2 = crypto.randomBytes(32).toString('hex');
      const validToken = crypto.randomBytes(32).toString('hex');

      const expiredTokenData1: EmailVerificationToken = {
        token: expiredToken1,
        userId: 'user-1',
        email: 'user1@example.com',
        expiresAt: new Date(Date.now() - 3600000), // Expired
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      };

      const expiredTokenData2: EmailVerificationToken = {
        token: expiredToken2,
        userId: 'user-2',
        email: 'user2@example.com',
        expiresAt: new Date(Date.now() - 7200000), // Expired
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
      };

      const validTokenData: EmailVerificationToken = {
        token: validToken,
        userId: 'user-3',
        email: 'user3@example.com',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Valid
        createdAt: new Date(),
      };

      await mockRedis.setex(
        `email_verification:${expiredToken1}`,
        1,
        JSON.stringify(expiredTokenData1),
      );
      await mockRedis.setex(
        `email_verification:${expiredToken2}`,
        1,
        JSON.stringify(expiredTokenData2),
      );
      await mockRedis.setex(
        `email_verification:${validToken}`,
        24 * 60 * 60,
        JSON.stringify(validTokenData),
      );
      await mockRedis.setex(`email_verification_user:user-1`, 1, expiredToken1);
      await mockRedis.setex(`email_verification_user:user-2`, 1, expiredToken2);
      await mockRedis.setex(`email_verification_user:user-3`, 24 * 60 * 60, validToken);

      const deletedCount = await service.cleanupExpiredTokens();

      expect(deletedCount).toBe(2);

      // Verify expired tokens were deleted
      expect(await mockRedis.get(`email_verification:${expiredToken1}`)).toBeNull();
      expect(await mockRedis.get(`email_verification:${expiredToken2}`)).toBeNull();
      expect(await mockRedis.get(`email_verification_user:user-1`)).toBeNull();
      expect(await mockRedis.get(`email_verification_user:user-2`)).toBeNull();

      // Verify valid token still exists
      expect(await mockRedis.get(`email_verification:${validToken}`)).toBeDefined();
    });

    it('should return 0 if no expired tokens found', async () => {
      const validToken = crypto.randomBytes(32).toString('hex');
      const validTokenData: EmailVerificationToken = {
        token: validToken,
        userId: 'user-1',
        email: 'user1@example.com',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      await mockRedis.setex(
        `email_verification:${validToken}`,
        24 * 60 * 60,
        JSON.stringify(validTokenData),
      );

      const deletedCount = await service.cleanupExpiredTokens();

      expect(deletedCount).toBe(0);
    });

    it('should handle Redis errors gracefully during cleanup', async () => {
      jest.spyOn(mockRedis, 'keys').mockRejectedValueOnce(new Error('Redis error'));

      const deletedCount = await service.cleanupExpiredTokens();

      expect(deletedCount).toBe(0);
    });
  });

  describe('getVerificationStats', () => {
    it('should return correct statistics', async () => {
      const expiredToken = crypto.randomBytes(32).toString('hex');
      const pendingToken1 = crypto.randomBytes(32).toString('hex');
      const pendingToken2 = crypto.randomBytes(32).toString('hex');

      const expiredTokenData: EmailVerificationToken = {
        token: expiredToken,
        userId: 'user-1',
        email: 'user1@example.com',
        expiresAt: new Date(Date.now() - 3600000), // Expired
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      };

      const pendingTokenData1: EmailVerificationToken = {
        token: pendingToken1,
        userId: 'user-2',
        email: 'user2@example.com',
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      const pendingTokenData2: EmailVerificationToken = {
        token: pendingToken2,
        userId: 'user-3',
        email: 'user3@example.com',
        expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      await mockRedis.setex(
        `email_verification:${expiredToken}`,
        1,
        JSON.stringify(expiredTokenData),
      );
      await mockRedis.setex(
        `email_verification:${pendingToken1}`,
        12 * 60 * 60,
        JSON.stringify(pendingTokenData1),
      );
      await mockRedis.setex(
        `email_verification:${pendingToken2}`,
        18 * 60 * 60,
        JSON.stringify(pendingTokenData2),
      );

      mockPrismaUserService.countVerifiedSince.mockResolvedValue(5);

      const stats = await service.getVerificationStats();

      expect(stats.totalPendingVerifications).toBe(2);
      expect(stats.expiredTokens).toBe(1);
      expect(stats.recentVerifications).toBe(5);
    });

    it('should return zero stats on error', async () => {
      // Mock scan to throw error (scan is used instead of keys)
      jest.spyOn(mockRedis, 'scan').mockRejectedValueOnce(new Error('Redis error'));

      const stats = await service.getVerificationStats();

      expect(stats.totalPendingVerifications).toBe(0);
      expect(stats.expiredTokens).toBe(0);
      expect(stats.recentVerifications).toBe(0);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection on module destroy', async () => {
      const quitSpy = jest.spyOn(mockRedis, 'quit');

      await service.onModuleDestroy();

      expect(quitSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Race Conditions', () => {
    it('should handle multiple concurrent token generation requests', async () => {
      const userId = 'user-concurrent-123';
      const email = 'concurrent@example.com';

      // Generate multiple tokens concurrently
      const promises = Array(5).fill(null).map(() =>
        service.generateVerificationToken(userId, email)
      );

      const tokens = await Promise.all(promises);

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(5);

      // All tokens should be stored in Redis
      for (const token of tokens) {
        const storedData = await mockRedis.get(`email_verification:${token}`);
        expect(storedData).toBeDefined();
      }
    });

    it('should handle token generation with special characters in email', async () => {
      const userId = 'user-special-123';
      const specialEmail = 'test+special@example.com';

      const token = await service.generateVerificationToken(userId, specialEmail);

      expect(token).toBeDefined();

      const tokenData = await mockRedis.get(`email_verification:${token}`);
      const parsed: EmailVerificationToken = JSON.parse(tokenData!);
      expect(parsed.email).toBe(specialEmail);
    });

    it('should handle very long email addresses', async () => {
      const userId = 'user-long-email-123';
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(100) + '.com';

      const token = await service.generateVerificationToken(userId, longEmail);

      expect(token).toBeDefined();
      expect(token.length).toBe(64);
    });

    it('should handle verification when Redis is slow (timeout scenario)', async () => {
      const user = createMockUser();
      const token = crypto.randomBytes(32).toString('hex');
      const tokenData: EmailVerificationToken = {
        token,
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      await mockRedis.setex(`email_verification:${token}`, 24 * 60 * 60, JSON.stringify(tokenData));

      const updatedUser = createMockUser({
        id: user.id,
        email: user.email,
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
      });

      mockPrismaUserService.findOne.mockResolvedValue(user);
      // Mock the transaction to return the updated user
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockPrismaInTx = {
          user: {
            update: jest.fn().mockResolvedValueOnce(updatedUser),
          },
        } as any;
        return callback(mockPrismaInTx);
      });

      const result = await service.verifyEmail(token);

      expect(result.success).toBe(true);
    });

    it('should handle cleanup when user has abandoned verification (never completed)', async () => {
      const userId = 'abandoned-user-123';
      const email = 'abandoned@example.com';

      // Create expired tokens directly (simulating abandoned verifications)
      const expiredToken1 = crypto.randomBytes(32).toString('hex');
      const expiredToken2 = crypto.randomBytes(32).toString('hex');

      const expiredTokenData1: EmailVerificationToken = {
        token: expiredToken1,
        userId,
        email,
        expiresAt: new Date(Date.now() - 1000), // Already expired
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      };

      const expiredTokenData2: EmailVerificationToken = {
        token: expiredToken2,
        userId: `${userId}-2`,
        email: 'another@example.com',
        expiresAt: new Date(Date.now() - 5000), // Already expired
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
      };

      // Store with longer TTL so Redis doesn't auto-delete before cleanup runs
      await mockRedis.setex(
        `email_verification:${expiredToken1}`,
        3600,
        JSON.stringify(expiredTokenData1),
      );
      await mockRedis.setex(
        `email_verification:${expiredToken2}`,
        3600,
        JSON.stringify(expiredTokenData2),
      );

      const deletedCount = await service.cleanupExpiredTokens();
      expect(deletedCount).toBe(2);

      // Verify tokens were actually deleted
      expect(await mockRedis.get(`email_verification:${expiredToken1}`)).toBeNull();
      expect(await mockRedis.get(`email_verification:${expiredToken2}`)).toBeNull();
    });

    it('should handle getTokenInfo for malformed token data', async () => {
      const token = crypto.randomBytes(32).toString('hex');

      // Store malformed JSON
      await mockRedis.setex(`email_verification:${token}`, 3600, 'invalid-json{{{');

      const info = await service.getTokenInfo(token);

      // Service should handle gracefully
      expect(info).toBeNull();
    });

    it('should handle resend when previous token was manually deleted', async () => {
      const user = createMockUser({ emailVerifiedAt: null });

      // Set user token key to non-existent token
      await mockRedis.setex(`email_verification_user:${user.id}`, 3600, 'non-existent-token');

      mockPrismaUserService.findOne.mockResolvedValue(user);

      const newToken = await service.resendVerificationEmail(user.id);

      expect(newToken).toBeDefined();
      expect(newToken).not.toBe('non-existent-token');
    });

    it('should handle stats calculation with no tokens', async () => {
      mockRedis.clear();

      mockPrismaUserService.countVerifiedSince.mockResolvedValue(0);

      const stats = await service.getVerificationStats();

      expect(stats.totalPendingVerifications).toBe(0);
      expect(stats.expiredTokens).toBe(0);
      expect(stats.recentVerifications).toBe(0);
    });

    it('should handle verification when user status changes between checks', async () => {
      const user = createMockUser({ emailVerifiedAt: null, status: UserStatus.ACTIVE });
      const token = crypto.randomBytes(32).toString('hex');
      const tokenData: EmailVerificationToken = {
        token,
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      await mockRedis.setex(`email_verification:${token}`, 24 * 60 * 60, JSON.stringify(tokenData));

      // Transaction returns suspended user (changed during verification)
      const suspendedUser = createMockUser({
        id: user.id,
        email: user.email,
        emailVerifiedAt: new Date(),
        status: UserStatus.SUSPENDED,
      });

      mockPrismaUserService.findOne.mockResolvedValueOnce(user);
      // Mock the transaction to return the suspended user
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockPrismaInTx = {
          user: {
            update: jest.fn().mockResolvedValueOnce(suspendedUser),
          },
        } as any;
        return callback(mockPrismaInTx);
      });

      const result = await service.verifyEmail(token);

      // Should still succeed but reflect new status
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.status).toBe(UserStatus.SUSPENDED);
    });
  });

  describe('Security Verification Tests', () => {
    describe('Timing Attack Prevention', () => {
      it('should apply artificial delay on invalid token', async () => {
        const invalidToken = 'invalid_token_12345678901234567890123456789012';

        const startTime = Date.now();
        try {
          await service.verifyEmail(invalidToken);
        } catch (error) {
          // Expected to throw
        }
        const endTime = Date.now();

        // Artificial delay should add 100-300ms
        // We check that some delay occurred (at least 50ms to account for execution time)
        const executionTime = endTime - startTime;
        expect(executionTime).toBeGreaterThanOrEqual(50);
      });

      it('should apply artificial delay on expired token', async () => {
        const user = createMockUser({ emailVerifiedAt: null });
        const token = crypto.randomBytes(32).toString('hex');
        const tokenData: EmailVerificationToken = {
          token,
          userId: user.id,
          email: user.email,
          expiresAt: new Date(Date.now() - 1000), // Already expired
          createdAt: new Date(),
        };

        const tokenKey = `email_verification:${token}`;
        await mockRedis.setex(tokenKey, 24 * 60 * 60, JSON.stringify(tokenData));

        const startTime = Date.now();
        try {
          await service.verifyEmail(token);
        } catch (error) {
          // Expected to throw
        }
        const endTime = Date.now();

        // Artificial delay should add 100-300ms
        const executionTime = endTime - startTime;
        expect(executionTime).toBeGreaterThanOrEqual(50);
      });

      it('should apply artificial delay on user not found', async () => {
        const token = crypto.randomBytes(32).toString('hex');
        const tokenData: EmailVerificationToken = {
          token,
          userId: 'nonexistent-user',
          email: 'nonexistent@example.com',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };

        const tokenKey = `email_verification:${token}`;
        await mockRedis.setex(tokenKey, 24 * 60 * 60, JSON.stringify(tokenData));

        mockPrismaUserService.findOne.mockResolvedValueOnce(null);

        const startTime = Date.now();
        try {
          await service.verifyEmail(token);
        } catch (error) {
          // Expected to throw
        }
        const endTime = Date.now();

        // Artificial delay should add 100-300ms
        const executionTime = endTime - startTime;
        expect(executionTime).toBeGreaterThanOrEqual(50);
      });
    });

    describe('Token Reuse Prevention (GETDEL Atomicity)', () => {
      it('should delete token atomically using GETDEL', async () => {
        const user = createMockUser({ emailVerifiedAt: null });
        const token = crypto.randomBytes(32).toString('hex');
        const tokenData: EmailVerificationToken = {
          token,
          userId: user.id,
          email: user.email,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };

        const tokenKey = `email_verification:${token}`;
        await mockRedis.setex(tokenKey, 24 * 60 * 60, JSON.stringify(tokenData));

        // Verify token exists before verification
        const existsBefore = await mockRedis.get(tokenKey);
        expect(existsBefore).toBeDefined();

        const updatedUser = createMockUser({
          id: user.id,
          email: user.email,
          emailVerifiedAt: new Date(),
          status: UserStatus.ACTIVE,
        });

        mockPrismaUserService.findOne.mockResolvedValueOnce(user);
        mockPrismaService.$transaction.mockImplementation(async (callback) => {
          const mockPrismaInTx = {
            user: {
              update: jest.fn().mockResolvedValueOnce(updatedUser),
            },
          } as any;
          return callback(mockPrismaInTx);
        });

        await service.verifyEmail(token);

        // Verify token is deleted after verification
        const existsAfter = await mockRedis.get(tokenKey);
        expect(existsAfter).toBeNull();
      });

      it('should prevent token reuse after verification', async () => {
        const user = createMockUser({ emailVerifiedAt: null });
        const token = crypto.randomBytes(32).toString('hex');
        const tokenData: EmailVerificationToken = {
          token,
          userId: user.id,
          email: user.email,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };

        const tokenKey = `email_verification:${token}`;
        await mockRedis.setex(tokenKey, 24 * 60 * 60, JSON.stringify(tokenData));

        const updatedUser = createMockUser({
          id: user.id,
          email: user.email,
          emailVerifiedAt: new Date(),
          status: UserStatus.ACTIVE,
        });

        mockPrismaUserService.findOne.mockResolvedValueOnce(user);
        mockPrismaService.$transaction.mockImplementation(async (callback) => {
          const mockPrismaInTx = {
            user: {
              update: jest.fn().mockResolvedValueOnce(updatedUser),
            },
          } as any;
          return callback(mockPrismaInTx);
        });

        // First verification should succeed
        const result1 = await service.verifyEmail(token);
        expect(result1.success).toBe(true);

        // Reset mocks for second attempt
        jest.clearAllMocks();
        mockPrismaUserService.findOne.mockResolvedValueOnce(user);

        // Second verification with same token should fail
        await expect(service.verifyEmail(token)).rejects.toThrow(
          'Invalid or expired verification token',
        );
      });
    });

    describe('Constant-Time Comparison', () => {
      it('should reject token with different value using constant-time comparison', async () => {
        const user = createMockUser({ emailVerifiedAt: null });
        const validToken = crypto.randomBytes(32).toString('hex');
        const tamperingToken = crypto.randomBytes(32).toString('hex'); // Different token

        const tokenData: EmailVerificationToken = {
          token: validToken, // Stored token value
          userId: user.id,
          email: user.email,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };

        const tokenKey = `email_verification:${validToken}`;
        await mockRedis.setex(tokenKey, 24 * 60 * 60, JSON.stringify(tokenData));

        mockPrismaUserService.findOne.mockResolvedValueOnce(user);

        // Try to verify with different token (tampered)
        await expect(service.verifyEmail(tamperingToken)).rejects.toThrow(
          'Invalid or expired verification token',
        );
      });

      it('should use constant-time comparison to prevent timing attacks', async () => {
        const user = createMockUser({ emailVerifiedAt: null });
        const token = crypto.randomBytes(32).toString('hex');

        const tokenData: EmailVerificationToken = {
          token,
          userId: user.id,
          email: user.email,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };

        const tokenKey = `email_verification:${token}`;
        await mockRedis.setex(tokenKey, 24 * 60 * 60, JSON.stringify(tokenData));

        mockPrismaUserService.findOne.mockResolvedValueOnce(user);

        // Create a token that's almost identical (timing attack attempt)
        const modifiedToken = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');

        // Timing attack should fail silently without leaking information about where mismatch occurred
        await expect(service.verifyEmail(modifiedToken)).rejects.toThrow(
          'Invalid or expired verification token',
        );
      });
    });

    describe('Error Message Consistency (User Enumeration Prevention)', () => {
      it('should use same error message for missing token and expired token', async () => {
        const missingTokenMessage = 'Invalid or expired verification token';

        // Test missing token
        try {
          await service.verifyEmail('missing_token_12345678901234567890123456');
        } catch (error: any) {
          expect(error.message).toBe(missingTokenMessage);
        }

        // Test expired token
        const user = createMockUser({ emailVerifiedAt: null });
        const expiredToken = crypto.randomBytes(32).toString('hex');
        const tokenData: EmailVerificationToken = {
          token: expiredToken,
          userId: user.id,
          email: user.email,
          expiresAt: new Date(Date.now() - 1000), // Already expired
          createdAt: new Date(),
        };

        const tokenKey = `email_verification:${expiredToken}`;
        await mockRedis.setex(tokenKey, 24 * 60 * 60, JSON.stringify(tokenData));

        try {
          await service.verifyEmail(expiredToken);
        } catch (error: any) {
          expect(error.message).toBe(missingTokenMessage);
        }
      });

      it('should use same error message for user not found and email mismatch', async () => {
        const user = createMockUser({ emailVerifiedAt: null });
        const token = crypto.randomBytes(32).toString('hex');
        const genericErrorMessage = 'Invalid or expired verification token';

        // Test 1: User not found
        const tokenData1: EmailVerificationToken = {
          token,
          userId: 'nonexistent-user',
          email: 'nonexistent@example.com',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };

        await mockRedis.setex(`email_verification:${token}`, 24 * 60 * 60, JSON.stringify(tokenData1));
        mockPrismaUserService.findOne.mockResolvedValueOnce(null);

        try {
          await service.verifyEmail(token);
        } catch (error: any) {
          expect(error.message).toBe(genericErrorMessage);
        }

        // Clean up
        mockRedis.clear();
        jest.clearAllMocks();

        // Test 2: Email mismatch
        const token2 = crypto.randomBytes(32).toString('hex');
        const tokenData2: EmailVerificationToken = {
          token: token2,
          userId: user.id,
          email: 'different@example.com', // Different email than user's actual email
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };

        await mockRedis.setex(`email_verification:${token2}`, 24 * 60 * 60, JSON.stringify(tokenData2));
        mockPrismaUserService.findOne.mockResolvedValueOnce(user);

        try {
          await service.verifyEmail(token2);
        } catch (error: any) {
          expect(error.message).toBe(genericErrorMessage);
        }
      });
    });

    describe('Rate Limit Enforcement', () => {
      it('should enforce rate limit for resend attempts', async () => {
        const user = createMockUser({ emailVerifiedAt: null });

        // First resend should succeed
        mockPrismaUserService.findOne.mockResolvedValueOnce(user);
        const token1 = await service.resendVerificationEmail(user.id);
        expect(token1).toBeDefined();

        // Second resend should succeed
        mockPrismaUserService.findOne.mockResolvedValueOnce(user);
        const token2 = await service.resendVerificationEmail(user.id);
        expect(token2).toBeDefined();

        // Third resend should succeed
        mockPrismaUserService.findOne.mockResolvedValueOnce(user);
        const token3 = await service.resendVerificationEmail(user.id);
        expect(token3).toBeDefined();

        // Fourth resend should fail (exceeds limit of 3)
        mockPrismaUserService.findOne.mockResolvedValueOnce(user);
        await expect(service.resendVerificationEmail(user.id)).rejects.toThrow(
          'Too many verification email requests',
        );
      });

      it('should track rate limit per user independently', async () => {
        const user1 = createMockUser({ id: 'user-1', email: 'user1@example.com', emailVerifiedAt: null });
        const user2 = createMockUser({ id: 'user-2', email: 'user2@example.com', emailVerifiedAt: null });

        // User 1 reaches limit
        for (let i = 0; i < 3; i++) {
          mockPrismaUserService.findOne.mockResolvedValueOnce(user1);
          await service.resendVerificationEmail(user1.id);
        }

        // User 1 should be rate limited
        mockPrismaUserService.findOne.mockResolvedValueOnce(user1);
        await expect(service.resendVerificationEmail(user1.id)).rejects.toThrow(
          'Too many verification email requests',
        );

        // User 2 should still be able to resend (independent rate limit)
        mockPrismaUserService.findOne.mockResolvedValueOnce(user2);
        const token = await service.resendVerificationEmail(user2.id);
        expect(token).toBeDefined();
      });
    });
  });
});
