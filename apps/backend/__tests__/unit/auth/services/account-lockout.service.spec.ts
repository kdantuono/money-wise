// Mock ioredis BEFORE any imports that use it
jest.mock('ioredis', () => {
  const { MockRedis } = require('../../../mocks/redis.mock');
  return { Redis: MockRedis };
});

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AccountLockoutService, LockoutSettings, LockoutInfo } from '@/auth/services/account-lockout.service';
import { User, UserStatus } from '@/core/database/entities/user.entity';
import { MockRedis, createMockRedis } from '../../../mocks/redis.mock';

describe('AccountLockoutService', () => {
  let service: AccountLockoutService;
  let mockUserRepository: jest.Mocked<Repository<User>>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockRedis: MockRedis;

  const createMockUser = (overrides?: Partial<User>): User => {
    const baseUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      firstName: 'Test',
      lastName: 'User',
      role: 0 as any,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date('2025-01-01'),
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

    Object.defineProperty(baseUser, 'fullName', {
      get() {
        return `${this.firstName} ${this.lastName}`;
      },
      enumerable: true,
      configurable: true,
    });

    return baseUser as User;
  };

  beforeEach(async () => {
    mockRedis = createMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountLockoutService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
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
    mockUserRepository = module.get(getRepositoryToken(User));
    mockConfigService = module.get(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockRedis.__reset();
  });

  describe('recordFailedAttempt', () => {
    it('should record first failed attempt', async () => {
      const identifier = 'test@example.com';

      const result = await service.recordFailedAttempt(identifier);

      expect(result.isLocked).toBe(false);
      expect(result.failedAttempts).toBe(1);
      expect(result.lockedUntil).toBeUndefined();
      expect(result.nextAttemptAllowedAt).toBeUndefined();

      // Verify Redis storage
      const key = `lockout:${identifier}`;
      const data = await mockRedis.hmget(key, 'failedAttempts', 'firstFailedAt');
      expect(String(data[0])).toBe('1');
      expect(data[1]).toBeDefined();
    });

    it('should increment failed attempts on subsequent failures', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Simulate 2 previous attempts
      const firstFailedAt = Date.now();
      await mockRedis.hmset(key, {
        failedAttempts: '2',
        firstFailedAt: firstFailedAt.toString(),
        lockoutCount: '0',
      });

      const result = await service.recordFailedAttempt(identifier);

      expect(result.isLocked).toBe(false);
      expect(result.failedAttempts).toBe(3);

      // Verify count was incremented
      const data = await mockRedis.hmget(key, 'failedAttempts');
      expect(String(data[0])).toBe('3');
    });

    it('should lock account after max failed attempts', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Simulate 4 previous attempts (5th will trigger lockout)
      const firstFailedAt = Date.now();
      await mockRedis.hmset(key, {
        failedAttempts: '4',
        firstFailedAt: firstFailedAt.toString(),
        lockoutCount: '0',
      });

      const result = await service.recordFailedAttempt(identifier);

      expect(result.isLocked).toBe(true);
      expect(result.failedAttempts).toBe(5);
      expect(result.lockedUntil).toBeInstanceOf(Date);
      expect(result.nextAttemptAllowedAt).toBeInstanceOf(Date);

      // Verify lockout duration (30 minutes default)
      const expectedLockout = Date.now() + (30 * 60 * 1000);
      expect(result.lockedUntil!.getTime()).toBeGreaterThanOrEqual(expectedLockout - 1000);
      expect(result.lockedUntil!.getTime()).toBeLessThanOrEqual(expectedLockout + 1000);
    });

    it('should apply progressive lockout duration', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Simulate account that has been locked twice before (lockoutCount = 2)
      const firstFailedAt = Date.now();
      await mockRedis.hmset(key, {
        failedAttempts: '4',
        firstFailedAt: firstFailedAt.toString(),
        lockoutCount: '2',
      });

      const result = await service.recordFailedAttempt(identifier);

      expect(result.isLocked).toBe(true);

      // Progressive lockout: 30min * 2 = 60 minutes (multiplier at index 2)
      const expectedLockout = Date.now() + (60 * 60 * 1000);
      expect(result.lockedUntil!.getTime()).toBeGreaterThanOrEqual(expectedLockout - 1000);
      expect(result.lockedUntil!.getTime()).toBeLessThanOrEqual(expectedLockout + 1000);
    });

    it('should cap progressive lockout at 24 hours', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Simulate account locked many times (lockoutCount = 10)
      const firstFailedAt = Date.now();
      await mockRedis.hmset(key, {
        failedAttempts: '4',
        firstFailedAt: firstFailedAt.toString(),
        lockoutCount: '10',
      });

      const result = await service.recordFailedAttempt(identifier);

      expect(result.isLocked).toBe(true);

      // Max lockout: 24 hours
      const expectedLockout = Date.now() + (24 * 60 * 60 * 1000);
      expect(result.lockedUntil!.getTime()).toBeGreaterThanOrEqual(expectedLockout - 1000);
      expect(result.lockedUntil!.getTime()).toBeLessThanOrEqual(expectedLockout + 1000);
    });

    it('should reset failed attempts after reset time', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Simulate attempts from 25 hours ago (beyond 24-hour reset time)
      const oldFirstFailedAt = Date.now() - (25 * 60 * 60 * 1000);
      await mockRedis.hmset(key, {
        failedAttempts: '4',
        firstFailedAt: oldFirstFailedAt.toString(),
        lockoutCount: '2',
      });

      const result = await service.recordFailedAttempt(identifier);

      expect(result.isLocked).toBe(false);
      expect(result.failedAttempts).toBe(1); // Reset to 1 (current attempt)

      // Verify new firstFailedAt was set
      const data = await mockRedis.hmget(key, 'failedAttempts', 'firstFailedAt');
      expect(String(data[0])).toBe('1');
      expect(parseInt(data[1]!)).toBeGreaterThan(oldFirstFailedAt);
    });

    it('should return current lockout if account is already locked', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Set up active lockout
      const lockedUntil = Date.now() + (15 * 60 * 1000);
      await mockRedis.hmset(key, {
        failedAttempts: '5',
        lockedUntil: lockedUntil.toString(),
        lockoutCount: '1',
      });

      const result = await service.recordFailedAttempt(identifier);

      expect(result.isLocked).toBe(true);
      expect(result.lockedUntil).toBeInstanceOf(Date);
      expect(result.lockedUntil!.getTime()).toBe(lockedUntil);
    });

    it('should reset failed attempts to 0 after lockout', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Simulate max attempts
      const firstFailedAt = Date.now();
      await mockRedis.hmset(key, {
        failedAttempts: '4',
        firstFailedAt: firstFailedAt.toString(),
        lockoutCount: '0',
      });

      await service.recordFailedAttempt(identifier);

      // Verify failedAttempts was reset to 0 (not incremented further)
      const data = await mockRedis.hmget(key, 'failedAttempts');
      expect(String(data[0])).toBe('0');
    });

    it('should increment lockout count on each lockout', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // First lockout
      await mockRedis.hmset(key, {
        failedAttempts: '4',
        firstFailedAt: Date.now().toString(),
        lockoutCount: '0',
      });

      await service.recordFailedAttempt(identifier);

      const data = await mockRedis.hmget(key, 'lockoutCount');
      expect(String(data[0])).toBe('1');
    });

    it('should update user status to SUSPENDED when locked by email', async () => {
      const user = createMockUser({ email: 'test@example.com', status: UserStatus.ACTIVE });
      const key = `lockout:${user.email}`;

      mockUserRepository.findOne.mockResolvedValue(user);

      // Trigger lockout
      await mockRedis.hmset(key, {
        failedAttempts: '4',
        firstFailedAt: Date.now().toString(),
        lockoutCount: '0',
      });

      const result = await service.recordFailedAttempt(user.email);

      expect(result.isLocked).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalledWith(user.id, {
        status: UserStatus.SUSPENDED,
      });
    });

    it('should update user status to SUSPENDED when locked by user ID', async () => {
      const user = createMockUser({ id: 'user-123', status: UserStatus.ACTIVE });
      const key = `lockout:${user.id}`;

      mockUserRepository.findOne.mockResolvedValue(user);

      // Trigger lockout
      await mockRedis.hmset(key, {
        failedAttempts: '4',
        firstFailedAt: Date.now().toString(),
        lockoutCount: '0',
      });

      const result = await service.recordFailedAttempt(user.id);

      expect(result.isLocked).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalledWith(user.id, {
        status: UserStatus.SUSPENDED,
      });
    });

    it('should use custom lockout settings', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;
      const customSettings: Partial<LockoutSettings> = {
        maxFailedAttempts: 3,
        lockoutDurationMs: 60 * 60 * 1000, // 1 hour
      };

      // Simulate 2 previous attempts
      await mockRedis.hmset(key, {
        failedAttempts: '2',
        firstFailedAt: Date.now().toString(),
        lockoutCount: '0',
      });

      const result = await service.recordFailedAttempt(identifier, customSettings);

      expect(result.isLocked).toBe(true);
      expect(result.failedAttempts).toBe(3);

      // Verify 1-hour lockout
      const expectedLockout = Date.now() + (60 * 60 * 1000);
      expect(result.lockedUntil!.getTime()).toBeGreaterThanOrEqual(expectedLockout - 1000);
      expect(result.lockedUntil!.getTime()).toBeLessThanOrEqual(expectedLockout + 1000);
    });

    it('should handle Redis errors gracefully', async () => {
      const identifier = 'test@example.com';

      // Mock Redis to throw error
      mockRedis.hmget = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.recordFailedAttempt(identifier);

      // Should return safe default
      expect(result.isLocked).toBe(false);
      expect(result.failedAttempts).toBe(1);
    });

    it('should set appropriate expiration on lockout data', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Trigger lockout
      await mockRedis.hmset(key, {
        failedAttempts: '4',
        firstFailedAt: Date.now().toString(),
        lockoutCount: '0',
      });

      await service.recordFailedAttempt(identifier);

      // Verify expire was called with lockout duration + 1 day buffer
      expect(mockRedis.expire).toHaveBeenCalled();
      const expireCall = (mockRedis.expire as jest.Mock).mock.calls[0];
      const expireSeconds = expireCall[1];

      // Should be approximately 30 minutes + 1 day
      const expectedExpire = Math.ceil((30 * 60 * 1000) / 1000) + 86400;
      expect(expireSeconds).toBeGreaterThanOrEqual(expectedExpire - 10);
      expect(expireSeconds).toBeLessThanOrEqual(expectedExpire + 10);
    });
  });

  describe('clearFailedAttempts', () => {
    it('should clear lockout data on successful login', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Set up some failed attempts
      await mockRedis.hmset(key, {
        failedAttempts: '3',
        firstFailedAt: Date.now().toString(),
        lockoutCount: '1',
      });

      await service.clearFailedAttempts(identifier);

      // Verify data was deleted
      const data = await mockRedis.hmget(key, 'failedAttempts', 'lockedUntil');
      expect(data[0]).toBeNull();
      expect(data[1]).toBeNull();
    });

    it('should update user status to ACTIVE when unlocking by email', async () => {
      const user = createMockUser({ email: 'test@example.com', status: UserStatus.SUSPENDED });

      mockUserRepository.findOne.mockResolvedValue(user);

      await service.clearFailedAttempts(user.email);

      expect(mockUserRepository.update).toHaveBeenCalledWith(user.id, {
        status: UserStatus.ACTIVE,
      });
    });

    it('should update user status to ACTIVE when unlocking by user ID', async () => {
      const user = createMockUser({ id: 'user-123', status: UserStatus.SUSPENDED });

      mockUserRepository.findOne.mockResolvedValue(user);

      await service.clearFailedAttempts(user.id);

      expect(mockUserRepository.update).toHaveBeenCalledWith(user.id, {
        status: UserStatus.ACTIVE,
      });
    });

    it('should not update status if user is not SUSPENDED', async () => {
      const user = createMockUser({ email: 'test@example.com', status: UserStatus.ACTIVE });

      mockUserRepository.findOne.mockResolvedValue(user);

      await service.clearFailedAttempts(user.email);

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should handle user not found gracefully', async () => {
      const identifier = 'nonexistent@example.com';

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.clearFailedAttempts(identifier)).resolves.not.toThrow();
    });

    it('should handle Redis errors gracefully', async () => {
      const identifier = 'test@example.com';

      // Mock Redis to throw error
      mockRedis.del = jest.fn().mockRejectedValue(new Error('Redis error'));

      await expect(service.clearFailedAttempts(identifier)).resolves.not.toThrow();
    });
  });

  describe('getLockoutInfo', () => {
    it('should return lockout info for active lockout', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      const lockedUntil = Date.now() + (15 * 60 * 1000);
      await mockRedis.hmset(key, {
        failedAttempts: '5',
        lockedUntil: lockedUntil.toString(),
      });

      const info = await service.getLockoutInfo(identifier);

      expect(info.isLocked).toBe(true);
      expect(info.failedAttempts).toBe(5);
      expect(info.lockedUntil).toBeInstanceOf(Date);
      expect(info.lockedUntil!.getTime()).toBe(lockedUntil);
      expect(info.nextAttemptAllowedAt).toBeInstanceOf(Date);
    });

    it('should return unlocked info when no lockout exists', async () => {
      const identifier = 'test@example.com';

      const info = await service.getLockoutInfo(identifier);

      expect(info.isLocked).toBe(false);
      expect(info.failedAttempts).toBe(0);
      expect(info.lockedUntil).toBeUndefined();
      expect(info.nextAttemptAllowedAt).toBeUndefined();
    });

    it('should return unlocked info when lockout has expired', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Set expired lockout
      const expiredLockout = Date.now() - 1000;
      await mockRedis.hmset(key, {
        failedAttempts: '5',
        lockedUntil: expiredLockout.toString(),
      });

      const info = await service.getLockoutInfo(identifier);

      expect(info.isLocked).toBe(false);
      expect(info.failedAttempts).toBe(5);
    });

    it('should return failed attempts even when not locked', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      await mockRedis.hmset(key, {
        failedAttempts: '3',
        firstFailedAt: Date.now().toString(),
      });

      const info = await service.getLockoutInfo(identifier);

      expect(info.isLocked).toBe(false);
      expect(info.failedAttempts).toBe(3);
    });

    it('should handle Redis errors gracefully', async () => {
      const identifier = 'test@example.com';

      // Mock Redis to throw error
      mockRedis.hmget = jest.fn().mockRejectedValue(new Error('Redis error'));

      const info = await service.getLockoutInfo(identifier);

      expect(info.isLocked).toBe(false);
      expect(info.failedAttempts).toBe(0);
    });
  });

  describe('unlockAccount', () => {
    it('should manually unlock an account (admin function)', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;
      const user = createMockUser({ email: identifier, status: UserStatus.SUSPENDED });

      mockUserRepository.findOne.mockResolvedValue(user);

      // Set up lockout
      await mockRedis.hmset(key, {
        failedAttempts: '5',
        lockedUntil: (Date.now() + 30000).toString(),
        lockoutCount: '2',
      });

      await service.unlockAccount(identifier);

      // Verify data was deleted
      const data = await mockRedis.hmget(key, 'failedAttempts', 'lockedUntil');
      expect(data[0]).toBeNull();

      // Verify user status was updated
      expect(mockUserRepository.update).toHaveBeenCalledWith(user.id, {
        status: UserStatus.ACTIVE,
      });
    });

    it('should handle unlocking non-existent lockout', async () => {
      const identifier = 'test@example.com';

      await expect(service.unlockAccount(identifier)).resolves.not.toThrow();
    });

    it('should handle Redis errors gracefully', async () => {
      const identifier = 'test@example.com';

      // Mock Redis to throw error
      mockRedis.del = jest.fn().mockRejectedValue(new Error('Redis error'));

      await expect(service.unlockAccount(identifier)).resolves.not.toThrow();
    });
  });

  describe('getLockoutStats', () => {
    it('should return statistics for currently locked accounts', async () => {
      const now = Date.now();
      const futureTime = now + (30 * 60 * 1000);

      // Set up multiple locked accounts
      await mockRedis.hmset('lockout:user1@example.com', {
        failedAttempts: '5',
        lockedUntil: futureTime.toString(),
      });
      await mockRedis.hmset('lockout:user2@example.com', {
        failedAttempts: '5',
        lockedUntil: futureTime.toString(),
      });
      await mockRedis.hmset('lockout:user3@example.com', {
        failedAttempts: '3',
        // No lockout
      });

      const stats = await service.getLockoutStats();

      expect(stats.totalLockedAccounts).toBe(2);
      expect(stats.recentLockouts).toHaveLength(2);
      expect(stats.recentLockouts[0].identifier).toMatch(/user[12]@example.com/);
      expect(stats.recentLockouts[0].lockedUntil).toBeInstanceOf(Date);
    });

    it('should exclude expired lockouts from stats', async () => {
      const now = Date.now();
      const futureTime = now + (30 * 60 * 1000);
      const pastTime = now - 1000;

      await mockRedis.hmset('lockout:locked@example.com', {
        failedAttempts: '5',
        lockedUntil: futureTime.toString(),
      });
      await mockRedis.hmset('lockout:expired@example.com', {
        failedAttempts: '5',
        lockedUntil: pastTime.toString(),
      });

      const stats = await service.getLockoutStats();

      expect(stats.totalLockedAccounts).toBe(1);
      expect(stats.recentLockouts).toHaveLength(1);
      expect(stats.recentLockouts[0].identifier).toBe('locked@example.com');
    });

    it('should limit recent lockouts to 10 entries', async () => {
      const futureTime = Date.now() + (30 * 60 * 1000);

      // Create 15 locked accounts
      for (let i = 0; i < 15; i++) {
        await mockRedis.hmset(`lockout:user${i}@example.com`, {
          failedAttempts: '5',
          lockedUntil: futureTime.toString(),
        });
      }

      const stats = await service.getLockoutStats();

      expect(stats.totalLockedAccounts).toBe(15);
      expect(stats.recentLockouts).toHaveLength(10);
    });

    it('should sort recent lockouts by lockedUntil descending', async () => {
      const now = Date.now();

      await mockRedis.hmset('lockout:user1@example.com', {
        lockedUntil: (now + 10000).toString(),
      });
      await mockRedis.hmset('lockout:user2@example.com', {
        lockedUntil: (now + 30000).toString(),
      });
      await mockRedis.hmset('lockout:user3@example.com', {
        lockedUntil: (now + 20000).toString(),
      });

      const stats = await service.getLockoutStats();

      expect(stats.recentLockouts[0].identifier).toBe('user2@example.com');
      expect(stats.recentLockouts[1].identifier).toBe('user3@example.com');
      expect(stats.recentLockouts[2].identifier).toBe('user1@example.com');
    });

    it('should handle empty lockout data', async () => {
      const stats = await service.getLockoutStats();

      expect(stats.totalLockedAccounts).toBe(0);
      expect(stats.recentLockouts).toEqual([]);
    });

    it('should handle Redis errors gracefully', async () => {
      // Mock Redis to throw error
      mockRedis.keys = jest.fn().mockRejectedValue(new Error('Redis error'));

      const stats = await service.getLockoutStats();

      expect(stats.totalLockedAccounts).toBe(0);
      expect(stats.recentLockouts).toEqual([]);
    });
  });

  describe('Progressive Lockout Calculation', () => {
    it('should calculate progressive lockout durations correctly', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;
      const baseDuration = 30 * 60 * 1000; // 30 minutes

      const expectedMultipliers = [1, 2, 4, 8, 16, 48];

      for (let count = 0; count < expectedMultipliers.length; count++) {
        await mockRedis.hmset(key, {
          failedAttempts: '4',
          firstFailedAt: Date.now().toString(),
          lockoutCount: count.toString(),
        });

        const result = await service.recordFailedAttempt(identifier);

        const expectedDuration = baseDuration * expectedMultipliers[count];
        const expectedLockout = Date.now() + expectedDuration;

        expect(result.isLocked).toBe(true);
        expect(result.lockedUntil!.getTime()).toBeGreaterThanOrEqual(expectedLockout - 1000);
        expect(result.lockedUntil!.getTime()).toBeLessThanOrEqual(expectedLockout + 1000);
      }
    });

    it('should cap at 24 hours even with high lockout count', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Test lockout counts beyond the multiplier array
      for (const count of [10, 20, 100]) {
        await mockRedis.hmset(key, {
          failedAttempts: '4',
          firstFailedAt: Date.now().toString(),
          lockoutCount: count.toString(),
        });

        const result = await service.recordFailedAttempt(identifier);

        // Max should be 24 hours
        const maxDuration = 24 * 60 * 60 * 1000;
        const expectedLockout = Date.now() + maxDuration;

        expect(result.isLocked).toBe(true);
        expect(result.lockedUntil!.getTime()).toBeGreaterThanOrEqual(expectedLockout - 1000);
        expect(result.lockedUntil!.getTime()).toBeLessThanOrEqual(expectedLockout + 1000);
      }
    });

    it('should disable progressive lockout when configured', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;
      const settings: Partial<LockoutSettings> = {
        progressiveLockout: false,
        lockoutDurationMs: 30 * 60 * 1000,
      };

      // Multiple lockouts should have same duration
      for (let count = 0; count < 5; count++) {
        await mockRedis.hmset(key, {
          failedAttempts: '4',
          firstFailedAt: Date.now().toString(),
          lockoutCount: count.toString(),
        });

        const result = await service.recordFailedAttempt(identifier, settings);

        // Should always be 30 minutes
        const expectedDuration = 30 * 60 * 1000;
        const expectedLockout = Date.now() + expectedDuration;

        expect(result.isLocked).toBe(true);
        expect(result.lockedUntil!.getTime()).toBeGreaterThanOrEqual(expectedLockout - 1000);
        expect(result.lockedUntil!.getTime()).toBeLessThanOrEqual(expectedLockout + 1000);
      }
    });
  });

  describe('User Status Integration', () => {
    it('should distinguish between email and user ID identifiers', async () => {
      const userByEmail = createMockUser({ email: 'test@example.com', id: 'user-123' });
      const userById = createMockUser({ email: 'test@example.com', id: 'user-123' });

      mockUserRepository.findOne
        .mockResolvedValueOnce(userByEmail) // First call with email
        .mockResolvedValueOnce(userById); // Second call with ID

      // Test with email
      await service.clearFailedAttempts('test@example.com');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });

      // Test with user ID
      await service.clearFailedAttempts('user-123');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should not update status if user is already ACTIVE', async () => {
      const user = createMockUser({ status: UserStatus.ACTIVE });

      mockUserRepository.findOne.mockResolvedValue(user);

      await service.clearFailedAttempts(user.email);

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should not update status if user is INACTIVE', async () => {
      const user = createMockUser({ status: UserStatus.INACTIVE });

      mockUserRepository.findOne.mockResolvedValue(user);

      await service.clearFailedAttempts(user.email);

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const identifier = 'test@example.com';

      mockUserRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.clearFailedAttempts(identifier)).resolves.not.toThrow();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection on module destroy', async () => {
      const quitSpy = jest.spyOn(mockRedis, 'quit');

      await service.onModuleDestroy();

      expect(quitSpy).toHaveBeenCalled();
    });

    it('should handle null Redis instance gracefully', async () => {
      (service as any).redis = null;

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle concurrent failed attempts correctly', async () => {
      const identifier = 'test@example.com';

      // Simulate rapid concurrent failures
      const results = await Promise.all([
        service.recordFailedAttempt(identifier),
        service.recordFailedAttempt(identifier),
        service.recordFailedAttempt(identifier),
      ]);

      // All should record attempts
      results.forEach(result => {
        expect(result.isLocked).toBe(false);
        expect(result.failedAttempts).toBeGreaterThan(0);
      });
    });

    it('should handle time boundary conditions for reset', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Set firstFailedAt to exactly 24 hours ago
      const exactResetTime = Date.now() - (24 * 60 * 60 * 1000);
      await mockRedis.hmset(key, {
        failedAttempts: '4',
        firstFailedAt: exactResetTime.toString(),
        lockoutCount: '2',
      });

      const result = await service.recordFailedAttempt(identifier);

      // Should be treated as expired and reset
      expect(result.isLocked).toBe(false);
      expect(result.failedAttempts).toBe(1);
    });

    it('should handle malformed Redis data gracefully', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Store invalid data
      await mockRedis.hmset(key, {
        failedAttempts: 'invalid',
        lockedUntil: 'not-a-number',
        lockoutCount: 'bad-data',
      });

      // Should treat as fresh attempt (NaN converts to 0)
      const result = await service.recordFailedAttempt(identifier);

      expect(result.isLocked).toBe(false);
      expect(result.failedAttempts).toBe(1);
    });

    it('should handle Redis connection errors with safe defaults', async () => {
      const identifier = 'test@example.com';

      // Mock complete Redis failure
      mockRedis.hmget = jest.fn().mockRejectedValue(new Error('Connection refused'));
      mockRedis.hmset = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await service.recordFailedAttempt(identifier);

      // Should return safe default (not locked, 1 attempt)
      expect(result.isLocked).toBe(false);
      expect(result.failedAttempts).toBe(1);
    });

    it('should handle lockout at exact max attempts boundary', async () => {
      const identifier = 'test@example.com';
      const key = `lockout:${identifier}`;

      // Exactly at max - 1
      await mockRedis.hmset(key, {
        failedAttempts: '4',
        firstFailedAt: Date.now().toString(),
        lockoutCount: '0',
      });

      let result = await service.recordFailedAttempt(identifier);
      expect(result.isLocked).toBe(true); // Should trigger lockout

      // One more after lockout
      result = await service.recordFailedAttempt(identifier);
      expect(result.isLocked).toBe(true); // Should still be locked
    });
  });
});
