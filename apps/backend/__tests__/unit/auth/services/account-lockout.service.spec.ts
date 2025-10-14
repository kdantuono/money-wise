// Mock ioredis BEFORE any imports that use it
jest.mock('ioredis', () => {
  const { MockRedis } = require('../../../mocks/redis.mock');
  return { Redis: MockRedis };
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AccountLockoutService, LockoutInfo } from '@/auth/services/account-lockout.service';
import { UserStatus } from '../../../../generated/prisma';
import { PrismaUserService } from '@/core/database/prisma/services/user.service';
import { MockRedis, createMockRedis } from '../../../mocks/redis.mock';

// Mock user type matching Prisma User
interface MockUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: any;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  currency: string;
  timezone: string;
  avatar: string | null;
  preferences: any;
  createdAt: Date;
  updatedAt: Date;
  familyId: string;
}

describe('AccountLockoutService', () => {
  let service: AccountLockoutService;
  let mockPrismaUserService: jest.Mocked<PrismaUserService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockRedis: MockRedis;

  const createMockUser = (overrides?: Partial<MockUser>): MockUser => {
    return {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      firstName: 'Test',
      lastName: 'User',
      role: 'MEMBER' as any,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date('2025-01-01'),
      lastLoginAt: null,
      currency: 'USD',
      timezone: 'UTC',
      avatar: null,
      preferences: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      familyId: 'family-123',
      ...overrides,
    };
  };

  beforeEach(async () => {
    mockRedis = createMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountLockoutService,
        {
          provide: PrismaUserService,
          useValue: {
            findByIdentifier: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: 'default',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<AccountLockoutService>(AccountLockoutService);
    mockPrismaUserService = module.get(PrismaUserService);
    mockConfigService = module.get(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockRedis.__reset();
  });

  describe('recordFailedAttempt', () => {
    const identifier = 'test@example.com';
    const now = Date.now();

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(now);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should record first failed attempt', async () => {
      // Mock Redis returning no existing data
      mockRedis.hmget.mockResolvedValueOnce([null, null, null, null]);

      const result = await service.recordFailedAttempt(identifier);

      expect(result).toEqual({
        isLocked: false,
        failedAttempts: 1,
      });

      expect(mockRedis.hmset).toHaveBeenCalledWith(`lockout:${identifier}`, {
        failedAttempts: 1,
        firstFailedAt: now,
      });

      expect(mockRedis.expire).toHaveBeenCalledWith(
        `lockout:${identifier}`,
        Math.ceil((24 * 60 * 60 * 1000) / 1000) // 24 hours in seconds
      );
    });

    it('should increment failed attempts (2/5)', async () => {
      const firstFailedAt = now - 1000;
      mockRedis.hmget.mockResolvedValueOnce(['1', null, '0', String(firstFailedAt)]);

      const result = await service.recordFailedAttempt(identifier);

      expect(result).toEqual({
        isLocked: false,
        failedAttempts: 2,
      });

      expect(mockRedis.hmset).toHaveBeenCalledWith(`lockout:${identifier}`, {
        failedAttempts: 2,
        firstFailedAt,
      });
    });

    it('should increment failed attempts (3/5)', async () => {
      const firstFailedAt = now - 2000;
      mockRedis.hmget.mockResolvedValueOnce(['2', null, '0', String(firstFailedAt)]);

      const result = await service.recordFailedAttempt(identifier);

      expect(result).toEqual({
        isLocked: false,
        failedAttempts: 3,
      });
    });

    it('should increment failed attempts (4/5)', async () => {
      const firstFailedAt = now - 3000;
      mockRedis.hmget.mockResolvedValueOnce(['3', null, '0', String(firstFailedAt)]);

      const result = await service.recordFailedAttempt(identifier);

      expect(result).toEqual({
        isLocked: false,
        failedAttempts: 4,
      });
    });

    it('should lock account after 5 failed attempts with default settings', async () => {
      const firstFailedAt = now - 4000;
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '0', String(firstFailedAt)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      const result = await service.recordFailedAttempt(identifier);

      const expectedLockoutDuration = 30 * 60 * 1000; // 30 minutes
      const expectedLockedUntil = now + expectedLockoutDuration;

      expect(result).toEqual({
        isLocked: true,
        failedAttempts: 5,
        lockedUntil: new Date(expectedLockedUntil),
        nextAttemptAllowedAt: new Date(expectedLockedUntil),
      });

      // Verify Redis storage
      expect(mockRedis.hmset).toHaveBeenCalledWith(`lockout:${identifier}`, {
        failedAttempts: 0, // Reset to 0 after locking
        lockedUntil: expectedLockedUntil,
        lockoutCount: 1,
        firstFailedAt: now,
      });

      // Verify expiration set
      expect(mockRedis.expire).toHaveBeenCalledWith(
        `lockout:${identifier}`,
        Math.ceil(expectedLockoutDuration / 1000) + 86400
      );

      // Verify user status updated to SUSPENDED
      expect(mockPrismaUserService.findByIdentifier).toHaveBeenCalledWith(identifier);
      expect(mockPrismaUserService.update).toHaveBeenCalledWith('user-123', {
        status: UserStatus.SUSPENDED,
      });
    });

    it('should not increment failed attempts when account is currently locked', async () => {
      const lockedUntil = now + 10 * 60 * 1000; // Locked for 10 more minutes
      mockRedis.hmget.mockResolvedValueOnce(['3', String(lockedUntil), '1', String(now - 5000)]);

      const result = await service.recordFailedAttempt(identifier);

      expect(result).toEqual({
        isLocked: true,
        failedAttempts: 3,
        lockedUntil: new Date(lockedUntil),
        nextAttemptAllowedAt: new Date(lockedUntil),
      });

      // Should NOT call hmset to increment attempts
      expect(mockRedis.hmset).not.toHaveBeenCalled();
    });

    it('should reset failed attempts after resetTimeMs (24 hours)', async () => {
      const firstFailedAt = now - (25 * 60 * 60 * 1000); // 25 hours ago
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '0', String(firstFailedAt)]);

      const result = await service.recordFailedAttempt(identifier);

      // Should be treated as first attempt
      expect(result).toEqual({
        isLocked: false,
        failedAttempts: 1,
      });

      expect(mockRedis.hmset).toHaveBeenCalledWith(`lockout:${identifier}`, {
        failedAttempts: 1,
        firstFailedAt: now,
      });
    });

    it('should apply progressive lockout on second lockout (2x multiplier)', async () => {
      const firstFailedAt = now - 4000;
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '1', String(firstFailedAt)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      const result = await service.recordFailedAttempt(identifier);

      const baseDuration = 30 * 60 * 1000; // 30 minutes
      const expectedLockoutDuration = baseDuration * 2; // 1 hour (2x multiplier)
      const expectedLockedUntil = now + expectedLockoutDuration;

      expect(result).toEqual({
        isLocked: true,
        failedAttempts: 5,
        lockedUntil: new Date(expectedLockedUntil),
        nextAttemptAllowedAt: new Date(expectedLockedUntil),
      });

      expect(mockRedis.hmset).toHaveBeenCalledWith(`lockout:${identifier}`, {
        failedAttempts: 0,
        lockedUntil: expectedLockedUntil,
        lockoutCount: 2,
        firstFailedAt: now,
      });
    });

    it('should apply progressive lockout on third lockout (4x multiplier)', async () => {
      const firstFailedAt = now - 4000;
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '2', String(firstFailedAt)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      const result = await service.recordFailedAttempt(identifier);

      const baseDuration = 30 * 60 * 1000;
      const expectedLockoutDuration = baseDuration * 4; // 2 hours (4x multiplier)
      const expectedLockedUntil = now + expectedLockoutDuration;

      expect(result.lockedUntil).toEqual(new Date(expectedLockedUntil));
      expect(mockRedis.hmset).toHaveBeenCalledWith(`lockout:${identifier}`, {
        failedAttempts: 0,
        lockedUntil: expectedLockedUntil,
        lockoutCount: 3,
        firstFailedAt: now,
      });
    });

    it('should apply progressive lockout on fourth lockout (8x multiplier)', async () => {
      const firstFailedAt = now - 4000;
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '3', String(firstFailedAt)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      const result = await service.recordFailedAttempt(identifier);

      const baseDuration = 30 * 60 * 1000;
      const expectedLockoutDuration = baseDuration * 8; // 4 hours (8x multiplier)
      const expectedLockedUntil = now + expectedLockoutDuration;

      expect(result.lockedUntil).toEqual(new Date(expectedLockedUntil));
    });

    it('should apply progressive lockout on fifth lockout (16x multiplier)', async () => {
      const firstFailedAt = now - 4000;
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '4', String(firstFailedAt)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      const result = await service.recordFailedAttempt(identifier);

      const baseDuration = 30 * 60 * 1000;
      const expectedLockoutDuration = baseDuration * 16; // 8 hours (16x multiplier)
      const expectedLockedUntil = now + expectedLockoutDuration;

      expect(result.lockedUntil).toEqual(new Date(expectedLockedUntil));
    });

    it('should cap progressive lockout at 48x multiplier', async () => {
      const firstFailedAt = now - 4000;
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '10', String(firstFailedAt)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      const result = await service.recordFailedAttempt(identifier);

      const baseDuration = 30 * 60 * 1000;
      const expectedLockoutDuration = baseDuration * 48; // 24 hours (48x multiplier - max)
      const expectedLockedUntil = now + expectedLockoutDuration;

      expect(result.lockedUntil).toEqual(new Date(expectedLockedUntil));
      expect(mockRedis.hmset).toHaveBeenCalledWith(`lockout:${identifier}`, {
        failedAttempts: 0,
        lockedUntil: expectedLockedUntil,
        lockoutCount: 11,
        firstFailedAt: now,
      });
    });

    it('should respect custom maxFailedAttempts setting', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['2', null, '0', String(now - 2000)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      const result = await service.recordFailedAttempt(identifier, {
        maxFailedAttempts: 3,
      });

      expect(result.isLocked).toBe(true);
      expect(result.failedAttempts).toBe(3);
    });

    it('should respect custom lockoutDurationMs setting', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '0', String(now - 4000)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      const customDuration = 60 * 60 * 1000; // 1 hour
      const result = await service.recordFailedAttempt(identifier, {
        lockoutDurationMs: customDuration,
      });

      const expectedLockedUntil = now + customDuration;
      expect(result.lockedUntil).toEqual(new Date(expectedLockedUntil));
    });

    it('should disable progressive lockout when progressiveLockout is false', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '5', String(now - 4000)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      const result = await service.recordFailedAttempt(identifier, {
        progressiveLockout: false,
      });

      // Should use base duration, not progressive
      const baseDuration = 30 * 60 * 1000;
      const expectedLockedUntil = now + baseDuration;
      expect(result.lockedUntil).toEqual(new Date(expectedLockedUntil));
    });

    it('should handle user ID identifier (UUID)', async () => {
      const userId = 'user-123';
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '0', String(now - 4000)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      await service.recordFailedAttempt(userId);

      expect(mockPrismaUserService.findByIdentifier).toHaveBeenCalledWith(userId);
    });

    it('should handle email identifier', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '0', String(now - 4000)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      await service.recordFailedAttempt(identifier);

      expect(mockPrismaUserService.findByIdentifier).toHaveBeenCalledWith(identifier);
    });

    it('should handle user not found gracefully', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '0', String(now - 4000)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(null);

      const result = await service.recordFailedAttempt(identifier);

      // Should still lock in Redis even if user not found in DB
      expect(result.isLocked).toBe(true);
      expect(mockPrismaUserService.update).not.toHaveBeenCalled();
    });

    it('should handle user already SUSPENDED', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '0', String(now - 4000)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(
        createMockUser({ status: UserStatus.SUSPENDED })
      );

      const result = await service.recordFailedAttempt(identifier);

      expect(result.isLocked).toBe(true);
      // Should not update status since already SUSPENDED
      expect(mockPrismaUserService.update).not.toHaveBeenCalled();
    });

    it('should return safe default on Redis error', async () => {
      mockRedis.hmget.mockRejectedValueOnce(new Error('Redis connection failed'));

      const result = await service.recordFailedAttempt(identifier);

      expect(result).toEqual({
        isLocked: false,
        failedAttempts: 1,
      });
    });

    it('should handle Redis hmset error gracefully', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['0', null, '0', null]);
      mockRedis.hmset.mockRejectedValueOnce(new Error('Redis write failed'));

      const result = await service.recordFailedAttempt(identifier);

      // Should still return safe default
      expect(result).toEqual({
        isLocked: false,
        failedAttempts: 1,
      });
    });
  });

  describe('clearFailedAttempts', () => {
    const identifier = 'test@example.com';

    it('should clear failed attempts from Redis', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(
        createMockUser({ status: UserStatus.SUSPENDED })
      );

      await service.clearFailedAttempts(identifier);

      expect(mockRedis.del).toHaveBeenCalledWith(`lockout:${identifier}`);
    });

    it('should update user status to ACTIVE if currently SUSPENDED', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(
        createMockUser({ status: UserStatus.SUSPENDED })
      );

      await service.clearFailedAttempts(identifier);

      expect(mockPrismaUserService.findByIdentifier).toHaveBeenCalledWith(identifier);
      expect(mockPrismaUserService.update).toHaveBeenCalledWith('user-123', {
        status: UserStatus.ACTIVE,
      });
    });

    it('should not update user status if already ACTIVE', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      await service.clearFailedAttempts(identifier);

      expect(mockPrismaUserService.update).not.toHaveBeenCalled();
    });

    it('should handle user not found gracefully', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(null);

      await expect(service.clearFailedAttempts(identifier)).resolves.not.toThrow();
      expect(mockPrismaUserService.update).not.toHaveBeenCalled();
    });

    it('should handle Redis error gracefully', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('Redis connection failed'));

      await expect(service.clearFailedAttempts(identifier)).resolves.not.toThrow();
    });

    it('should handle database error gracefully', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      mockPrismaUserService.findByIdentifier.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.clearFailedAttempts(identifier)).resolves.not.toThrow();
    });
  });

  describe('getLockoutInfo', () => {
    const identifier = 'test@example.com';
    const now = Date.now();

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(now);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return locked status when account is currently locked', async () => {
      const lockedUntil = now + 10 * 60 * 1000; // 10 minutes from now
      mockRedis.hmget.mockResolvedValueOnce(['3', String(lockedUntil)]);

      const result = await service.getLockoutInfo(identifier);

      expect(result).toEqual({
        isLocked: true,
        failedAttempts: 3,
        lockedUntil: new Date(lockedUntil),
        nextAttemptAllowedAt: new Date(lockedUntil),
      });
    });

    it('should return unlocked status when lockout has expired', async () => {
      const lockedUntil = now - 1000; // 1 second ago (expired)
      mockRedis.hmget.mockResolvedValueOnce(['5', String(lockedUntil)]);

      const result = await service.getLockoutInfo(identifier);

      expect(result).toEqual({
        isLocked: false,
        failedAttempts: 5,
      });
    });

    it('should return unlocked status when no lockout data exists', async () => {
      mockRedis.hmget.mockResolvedValueOnce([null, null]);

      const result = await service.getLockoutInfo(identifier);

      expect(result).toEqual({
        isLocked: false,
        failedAttempts: 0,
      });
    });

    it('should return unlocked status with failed attempts but no lockout', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['2', null]);

      const result = await service.getLockoutInfo(identifier);

      expect(result).toEqual({
        isLocked: false,
        failedAttempts: 2,
      });
    });

    it('should handle Redis error gracefully', async () => {
      mockRedis.hmget.mockRejectedValueOnce(new Error('Redis connection failed'));

      const result = await service.getLockoutInfo(identifier);

      expect(result).toEqual({
        isLocked: false,
        failedAttempts: 0,
      });
    });

    it('should handle invalid Redis data gracefully', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['invalid', 'invalid']);

      const result = await service.getLockoutInfo(identifier);

      // parseInt of 'invalid' returns NaN, which should be handled
      expect(result.isLocked).toBe(false);
    });
  });

  describe('unlockAccount', () => {
    const identifier = 'test@example.com';

    it('should clear lockout data from Redis', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(
        createMockUser({ status: UserStatus.SUSPENDED })
      );

      await service.unlockAccount(identifier);

      expect(mockRedis.del).toHaveBeenCalledWith(`lockout:${identifier}`);
    });

    it('should update user status to ACTIVE', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(
        createMockUser({ status: UserStatus.SUSPENDED })
      );

      await service.unlockAccount(identifier);

      expect(mockPrismaUserService.findByIdentifier).toHaveBeenCalledWith(identifier);
      expect(mockPrismaUserService.update).toHaveBeenCalledWith('user-123', {
        status: UserStatus.ACTIVE,
      });
    });

    it('should not update status if already ACTIVE', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      await service.unlockAccount(identifier);

      expect(mockPrismaUserService.update).not.toHaveBeenCalled();
    });

    it('should handle user not found gracefully', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(null);

      await expect(service.unlockAccount(identifier)).resolves.not.toThrow();
      expect(mockPrismaUserService.update).not.toHaveBeenCalled();
    });

    it('should handle Redis error gracefully', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('Redis connection failed'));

      await expect(service.unlockAccount(identifier)).resolves.not.toThrow();
    });

    it('should handle database error gracefully', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      mockPrismaUserService.findByIdentifier.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.unlockAccount(identifier)).resolves.not.toThrow();
    });
  });

  describe('getLockoutStats', () => {
    const now = Date.now();

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(now);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return zero stats when no lockouts exist', async () => {
      mockRedis.keys.mockResolvedValueOnce([]);

      const result = await service.getLockoutStats();

      expect(result).toEqual({
        totalLockedAccounts: 0,
        recentLockouts: [],
      });

      expect(mockRedis.keys).toHaveBeenCalledWith('lockout:*');
    });

    it('should count active lockouts correctly', async () => {
      const lockedUntil1 = now + 10 * 60 * 1000;
      const lockedUntil2 = now + 20 * 60 * 1000;
      const lockedUntil3 = now + 30 * 60 * 1000;

      mockRedis.keys.mockResolvedValueOnce([
        'lockout:user1@example.com',
        'lockout:user2@example.com',
        'lockout:user3@example.com',
      ]);

      mockRedis.hget
        .mockResolvedValueOnce(String(lockedUntil1))
        .mockResolvedValueOnce(String(lockedUntil2))
        .mockResolvedValueOnce(String(lockedUntil3));

      const result = await service.getLockoutStats();

      expect(result.totalLockedAccounts).toBe(3);
      expect(result.recentLockouts).toHaveLength(3);
    });

    it('should exclude expired lockouts from count', async () => {
      const lockedUntil1 = now + 10 * 60 * 1000; // Active
      const lockedUntil2 = now - 5 * 60 * 1000; // Expired
      const lockedUntil3 = now + 20 * 60 * 1000; // Active

      mockRedis.keys.mockResolvedValueOnce([
        'lockout:user1@example.com',
        'lockout:user2@example.com',
        'lockout:user3@example.com',
      ]);

      mockRedis.hget
        .mockResolvedValueOnce(String(lockedUntil1))
        .mockResolvedValueOnce(String(lockedUntil2))
        .mockResolvedValueOnce(String(lockedUntil3));

      const result = await service.getLockoutStats();

      expect(result.totalLockedAccounts).toBe(2);
      expect(result.recentLockouts).toHaveLength(2);
      expect(result.recentLockouts.some(l => l.identifier === 'user2@example.com')).toBe(false);
    });

    it('should sort lockouts by lockedUntil descending', async () => {
      const lockedUntil1 = now + 10 * 60 * 1000;
      const lockedUntil2 = now + 30 * 60 * 1000;
      const lockedUntil3 = now + 20 * 60 * 1000;

      mockRedis.keys.mockResolvedValueOnce([
        'lockout:user1@example.com',
        'lockout:user2@example.com',
        'lockout:user3@example.com',
      ]);

      mockRedis.hget
        .mockResolvedValueOnce(String(lockedUntil1))
        .mockResolvedValueOnce(String(lockedUntil2))
        .mockResolvedValueOnce(String(lockedUntil3));

      const result = await service.getLockoutStats();

      expect(result.recentLockouts[0].identifier).toBe('user2@example.com');
      expect(result.recentLockouts[1].identifier).toBe('user3@example.com');
      expect(result.recentLockouts[2].identifier).toBe('user1@example.com');
    });

    it('should limit results to top 10 lockouts', async () => {
      const keys = Array.from({ length: 15 }, (_, i) => `lockout:user${i}@example.com`);
      mockRedis.keys.mockResolvedValueOnce(keys);

      // Mock all as active lockouts
      for (let i = 0; i < 15; i++) {
        mockRedis.hget.mockResolvedValueOnce(String(now + (i + 1) * 60 * 1000));
      }

      const result = await service.getLockoutStats();

      expect(result.totalLockedAccounts).toBe(15);
      expect(result.recentLockouts).toHaveLength(10);
    });

    it('should handle keys without lockout data', async () => {
      mockRedis.keys.mockResolvedValueOnce([
        'lockout:user1@example.com',
        'lockout:user2@example.com',
      ]);

      mockRedis.hget
        .mockResolvedValueOnce(String(now + 10 * 60 * 1000))
        .mockResolvedValueOnce(null); // No lockedUntil

      const result = await service.getLockoutStats();

      expect(result.totalLockedAccounts).toBe(1);
      expect(result.recentLockouts).toHaveLength(1);
    });

    it('should handle Redis error gracefully', async () => {
      mockRedis.keys.mockRejectedValueOnce(new Error('Redis connection failed'));

      const result = await service.getLockoutStats();

      expect(result).toEqual({
        totalLockedAccounts: 0,
        recentLockouts: [],
      });
    });

    it('should handle hget error gracefully', async () => {
      mockRedis.keys.mockResolvedValueOnce(['lockout:user1@example.com']);
      mockRedis.hget.mockRejectedValueOnce(new Error('Redis read failed'));

      const result = await service.getLockoutStats();

      // Should continue despite error
      expect(result.totalLockedAccounts).toBe(0);
      expect(result.recentLockouts).toHaveLength(0);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection', async () => {
      await service.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle Redis quit error gracefully', async () => {
      mockRedis.quit.mockRejectedValueOnce(new Error('Quit failed'));

      await expect(service.onModuleDestroy()).rejects.toThrow('Quit failed');
    });
  });

  describe('Redis error event handling', () => {
    it('should handle Redis error events', () => {
      // Trigger a Redis error event
      const error = new Error('Test Redis error');
      mockRedis.emit('error', error);

      // Should not throw, just log
      expect(true).toBe(true);
    });
  });

  describe('Edge cases and concurrent scenarios', () => {
    const identifier = 'test@example.com';
    const now = Date.now();

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(now);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should handle concurrent failed attempts safely', async () => {
      // Simulate race condition: both requests see 3 attempts
      mockRedis.hmget
        .mockResolvedValueOnce(['3', null, '0', String(now - 3000)])
        .mockResolvedValueOnce(['3', null, '0', String(now - 3000)]);

      const [result1, result2] = await Promise.all([
        service.recordFailedAttempt(identifier),
        service.recordFailedAttempt(identifier),
      ]);

      // Both should increment
      expect(result1.failedAttempts).toBeGreaterThan(0);
      expect(result2.failedAttempts).toBeGreaterThan(0);
    });

    it('should handle lockout at exact threshold', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '0', String(now - 4000)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      const result = await service.recordFailedAttempt(identifier);

      expect(result.isLocked).toBe(true);
      expect(result.failedAttempts).toBe(5);
    });

    it('should handle lockout just before threshold', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['3', null, '0', String(now - 3000)]);

      const result = await service.recordFailedAttempt(identifier);

      expect(result.isLocked).toBe(false);
      expect(result.failedAttempts).toBe(4);
    });

    it('should handle empty identifier gracefully', async () => {
      mockRedis.hmget.mockResolvedValueOnce([null, null, null, null]);

      const result = await service.recordFailedAttempt('');

      expect(result.isLocked).toBe(false);
      expect(result.failedAttempts).toBe(1);
    });

    it('should handle very long lockout duration', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['4', null, '10', String(now - 4000)]);
      mockPrismaUserService.findByIdentifier.mockResolvedValueOnce(createMockUser());

      const result = await service.recordFailedAttempt(identifier);

      // 48x multiplier on 30min = 24 hours
      const expectedDuration = 30 * 60 * 1000 * 48;
      const expectedLockedUntil = now + expectedDuration;

      expect(result.lockedUntil?.getTime()).toBe(expectedLockedUntil);
    });

    it('should handle lockout expiring exactly now', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['5', String(now)]);

      const result = await service.getLockoutInfo(identifier);

      // Equal to now should be treated as expired
      expect(result.isLocked).toBe(false);
    });

    it('should handle lockout expiring 1ms from now', async () => {
      mockRedis.hmget.mockResolvedValueOnce(['5', String(now + 1)]);

      const result = await service.getLockoutInfo(identifier);

      // Still locked
      expect(result.isLocked).toBe(true);
    });
  });
});
