// Mock ioredis BEFORE any imports that use it
jest.mock('ioredis', () => {
  const { MockRedis } = require('../../../mocks/redis.mock');
  return { Redis: MockRedis };
});

import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService, RateLimitConfig, RateLimitResult } from '@/auth/services/rate-limit.service';
import { MockRedis, createMockRedis } from '../../../mocks/redis.mock';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let mockRedis: MockRedis;

  beforeEach(async () => {
    mockRedis = createMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: 'default',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockRedis.__reset();
  });

  describe('checkRateLimit', () => {
    describe('Login Rate Limiting', () => {
      it('should allow first attempt with full attempts remaining', async () => {
        const identifier = 'user@example.com';
        const action = 'login';

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(true);
        expect(result.attemptsRemaining).toBe(5);
        expect(result.isLocked).toBe(false);
        expect(result.resetTime).toBeInstanceOf(Date);
        expect(result.lockoutExpiry).toBeUndefined();
      });

      it('should track attempts within the rate limit window', async () => {
        const identifier = 'user@example.com';
        const action = 'login';
        const key = `rate_limit:${action}:${identifier}`;

        // Simulate 3 attempts already made
        await mockRedis.hset(key, {
          count: '3',
          windowStart: Date.now().toString(),
          lockoutCount: '0',
        });

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(true);
        expect(result.attemptsRemaining).toBe(1); // 5 max - 3 current - 1 for this check
        expect(result.isLocked).toBe(false);
      });

      it('should deny access when rate limit is exceeded', async () => {
        const identifier = 'user@example.com';
        const action = 'login';
        const key = `rate_limit:${action}:${identifier}`;

        // Simulate max attempts already made
        await mockRedis.hset(key, {
          count: '5',
          windowStart: Date.now().toString(),
          lockoutCount: '0',
        });

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(false);
        expect(result.attemptsRemaining).toBe(0);
        expect(result.isLocked).toBe(true);
        expect(result.lockoutExpiry).toBeInstanceOf(Date);
        expect(result.resetTime).toBeInstanceOf(Date);
      });

      it('should reset rate limit after window expires', async () => {
        const identifier = 'user@example.com';
        const action = 'login';
        const key = `rate_limit:${action}:${identifier}`;

        // Simulate attempts from expired window (16 minutes ago)
        const expiredWindowStart = Date.now() - (16 * 60 * 1000);
        await mockRedis.hset(key, {
          count: '5',
          windowStart: expiredWindowStart.toString(),
          lockoutCount: '1',
        });

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(true);
        expect(result.attemptsRemaining).toBe(4); // Max 5 - 1 for current check
        expect(result.isLocked).toBe(false);

        // Verify old data was deleted
        const deletedData = await mockRedis.hgetall(key);
        expect(deletedData).toEqual({});
      });

      it('should apply progressive lockout duration', async () => {
        const identifier = 'user@example.com';
        const action = 'login';
        const key = `rate_limit:${action}:${identifier}`;

        // Simulate multiple lockouts (lockoutCount = 2)
        await mockRedis.hset(key, {
          count: '5',
          windowStart: Date.now().toString(),
          lockoutCount: '2',
        });

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(false);
        expect(result.isLocked).toBe(true);

        // Progressive lockout: 30 * 2^2 = 120 minutes
        const lockoutDurationMs = 120 * 60 * 1000;
        const expectedExpiry = Date.now() + lockoutDurationMs;

        // Allow 1 second tolerance for test execution time
        expect(result.lockoutExpiry!.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(result.lockoutExpiry!.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
      });

      it('should cap progressive lockout at 24 hours', async () => {
        const identifier = 'user@example.com';
        const action = 'login';
        const key = `rate_limit:${action}:${identifier}`;

        // Simulate many lockouts (lockoutCount = 10)
        await mockRedis.hset(key, {
          count: '5',
          windowStart: Date.now().toString(),
          lockoutCount: '10',
        });

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(false);
        expect(result.isLocked).toBe(true);

        // Max lockout: 24 hours
        const maxLockoutMs = 24 * 60 * 60 * 1000;
        const expectedExpiry = Date.now() + maxLockoutMs;

        // Allow 1 second tolerance
        expect(result.lockoutExpiry!.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(result.lockoutExpiry!.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
      });

      it('should enforce active lockout period', async () => {
        const identifier = 'user@example.com';
        const action = 'login';
        const lockKey = `lockout:${action}:${identifier}`;

        // Set active lockout expiring in 10 minutes
        const lockoutExpiry = Date.now() + (10 * 60 * 1000);
        await mockRedis.setex(lockKey, 600, lockoutExpiry.toString());

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(false);
        expect(result.isLocked).toBe(true);
        expect(result.attemptsRemaining).toBe(0);
        expect(result.lockoutExpiry).toBeInstanceOf(Date);
      });

      it('should clear expired lockout and allow access', async () => {
        const identifier = 'user@example.com';
        const action = 'login';
        const lockKey = `lockout:${action}:${identifier}`;
        const key = `rate_limit:${action}:${identifier}`;

        // Set expired lockout (1 second ago)
        const expiredLockout = Date.now() - 1000;
        await mockRedis.setex(lockKey, 1, expiredLockout.toString());
        await mockRedis.hset(key, {
          count: '5',
          windowStart: Date.now().toString(),
          lockoutCount: '1',
        });

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(true);
        expect(result.isLocked).toBe(false);

        // Verify cleanup happened
        const lockDeleted = await mockRedis.get(lockKey);
        expect(lockDeleted).toBeNull();
      });

      it('should use custom rate limit configuration', async () => {
        const identifier = 'user@example.com';
        const action = 'login';
        const customConfig: Partial<RateLimitConfig> = {
          maxAttempts: 3,
          windowMinutes: 10,
          lockoutMinutes: 60,
        };

        const result = await service.checkRateLimit(identifier, action, customConfig);

        expect(result.allowed).toBe(true);
        expect(result.attemptsRemaining).toBe(2); // Custom max 3 - 1 for this check
        expect(result.isLocked).toBe(false);
      });
    });

    describe('Password Reset Rate Limiting', () => {
      it('should enforce stricter limits for password reset', async () => {
        const identifier = 'user@example.com';
        const action = 'passwordReset';

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(true);
        expect(result.attemptsRemaining).toBe(3); // Max 3 for password reset
        expect(result.isLocked).toBe(false);
      });

      it('should deny password reset after 3 attempts', async () => {
        const identifier = 'user@example.com';
        const action = 'passwordReset';
        const key = `rate_limit:${action}:${identifier}`;

        await mockRedis.hset(key, {
          count: '3',
          windowStart: Date.now().toString(),
          lockoutCount: '0',
        });

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(false);
        expect(result.attemptsRemaining).toBe(0);
        expect(result.isLocked).toBe(true);
      });

      it('should use 60-minute window and lockout for password reset', async () => {
        const identifier = 'user@example.com';
        const action = 'passwordReset';
        const key = `rate_limit:${action}:${identifier}`;

        await mockRedis.hset(key, {
          count: '3',
          windowStart: Date.now().toString(),
          lockoutCount: '0',
        });

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(false);

        // Lockout should be 60 minutes (no progressive lockout for password reset)
        const lockoutDurationMs = 60 * 60 * 1000;
        const expectedExpiry = Date.now() + lockoutDurationMs;

        expect(result.lockoutExpiry!.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(result.lockoutExpiry!.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
      });

      it('should not apply progressive lockout to password reset', async () => {
        const identifier = 'user@example.com';
        const action = 'passwordReset';
        const key = `rate_limit:${action}:${identifier}`;

        // Multiple lockouts should not increase duration
        await mockRedis.hset(key, {
          count: '3',
          windowStart: Date.now().toString(),
          lockoutCount: '5',
        });

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(false);

        // Lockout should still be 60 minutes (no progressive increase)
        const lockoutDurationMs = 60 * 60 * 1000;
        const expectedExpiry = Date.now() + lockoutDurationMs;

        expect(result.lockoutExpiry!.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(result.lockoutExpiry!.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
      });
    });

    describe('Password Change Rate Limiting', () => {
      it('should allow more attempts for password change', async () => {
        const identifier = 'user@example.com';
        const action = 'passwordChange';

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(true);
        expect(result.attemptsRemaining).toBe(10); // Max 10 for password change
        expect(result.isLocked).toBe(false);
      });

      it('should use 15-minute lockout for password change', async () => {
        const identifier = 'user@example.com';
        const action = 'passwordChange';
        const key = `rate_limit:${action}:${identifier}`;

        await mockRedis.hset(key, {
          count: '10',
          windowStart: Date.now().toString(),
          lockoutCount: '0',
        });

        const result = await service.checkRateLimit(identifier, action);

        expect(result.allowed).toBe(false);

        // Lockout should be 15 minutes
        const lockoutDurationMs = 15 * 60 * 1000;
        const expectedExpiry = Date.now() + lockoutDurationMs;

        expect(result.lockoutExpiry!.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(result.lockoutExpiry!.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
      });
    });
  });

  describe('recordAttempt', () => {
    it('should clear rate limit on successful attempt', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const key = `rate_limit:${action}:${identifier}`;

      // Set up some failed attempts
      await mockRedis.hset(key, {
        count: '3',
        windowStart: Date.now().toString(),
        lockoutCount: '1',
      });

      await service.recordAttempt(identifier, action, true);

      // Verify data was cleared
      const clearedData = await mockRedis.hgetall(key);
      expect(clearedData).toEqual({});
    });

    it('should increment count on failed attempt', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const key = `rate_limit:${action}:${identifier}`;

      // Record first failed attempt
      await service.recordAttempt(identifier, action, false);

      const data = await mockRedis.hgetall(key);
      expect(data.count).toBe('1');
      expect(data.windowStart).toBeDefined();
    });

    it('should increment existing count on subsequent failed attempts', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const key = `rate_limit:${action}:${identifier}`;

      // Set up initial count
      await mockRedis.hset(key, {
        count: '2',
        windowStart: Date.now().toString(),
        lockoutCount: '0',
      });

      await service.recordAttempt(identifier, action, false);

      const data = await mockRedis.hgetall(key);
      expect(data.count).toBe('3');
    });

    it('should reset window when expired', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const key = `rate_limit:${action}:${identifier}`;

      // Set up expired window (16 minutes ago)
      const expiredWindowStart = Date.now() - (16 * 60 * 1000);
      await mockRedis.hset(key, {
        count: '5',
        windowStart: expiredWindowStart.toString(),
        lockoutCount: '2',
      });

      await service.recordAttempt(identifier, action, false);

      const data = await mockRedis.hgetall(key);
      expect(data.count).toBe('1'); // Reset to 1 for new window
      expect(parseInt(data.windowStart)).toBeGreaterThan(expiredWindowStart);
      expect(data.lockoutCount).toBe('2'); // Preserved across window reset
    });

    it('should set expiration on rate limit data', async () => {
      const identifier = 'user@example.com';
      const action = 'login';

      await service.recordAttempt(identifier, action, false);

      // Verify expire was called (15 minutes for login)
      expect(mockRedis.expire).toHaveBeenCalled();
    });

    it('should preserve lockoutCount when resetting window', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const key = `rate_limit:${action}:${identifier}`;

      // Set up expired window with lockout history
      const expiredWindowStart = Date.now() - (20 * 60 * 1000);
      await mockRedis.hset(key, {
        count: '5',
        windowStart: expiredWindowStart.toString(),
        lockoutCount: '3',
      });

      await service.recordAttempt(identifier, action, false);

      const data = await mockRedis.hgetall(key);
      expect(data.count).toBe('1');
      expect(data.lockoutCount).toBe('3'); // Preserved
    });
  });

  describe('clearRateLimit', () => {
    it('should clear both rate limit and lockout data', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const key = `rate_limit:${action}:${identifier}`;
      const lockKey = `lockout:${action}:${identifier}`;

      // Set up data
      await mockRedis.hset(key, {
        count: '5',
        windowStart: Date.now().toString(),
        lockoutCount: '2',
      });
      await mockRedis.setex(lockKey, 600, (Date.now() + 10000).toString());

      await service.clearRateLimit(identifier, action);

      const clearedData = await mockRedis.hgetall(key);
      const clearedLock = await mockRedis.get(lockKey);

      expect(clearedData).toEqual({});
      expect(clearedLock).toBeNull();
    });

    it('should handle clearing non-existent rate limit', async () => {
      const identifier = 'user@example.com';
      const action = 'login';

      await expect(service.clearRateLimit(identifier, action)).resolves.not.toThrow();
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current rate limit status', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const key = `rate_limit:${action}:${identifier}`;

      await mockRedis.hset(key, {
        count: '2',
        windowStart: Date.now().toString(),
        lockoutCount: '0',
      });

      const status = await service.getRateLimitStatus(identifier, action);

      expect(status.allowed).toBe(true);
      expect(status.attemptsRemaining).toBe(2); // 5 max - 2 current - 1 for check
      expect(status.isLocked).toBe(false);
    });

    it('should return locked status when rate limit exceeded', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const lockKey = `lockout:${action}:${identifier}`;

      const lockoutExpiry = Date.now() + (30 * 60 * 1000);
      await mockRedis.setex(lockKey, 1800, lockoutExpiry.toString());

      const status = await service.getRateLimitStatus(identifier, action);

      expect(status.allowed).toBe(false);
      expect(status.isLocked).toBe(true);
      expect(status.lockoutExpiry).toBeInstanceOf(Date);
    });
  });

  describe('isCurrentlyLocked', () => {
    it('should return true if account is locked', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const lockKey = `lockout:${action}:${identifier}`;

      const lockoutExpiry = Date.now() + (30 * 60 * 1000);
      await mockRedis.setex(lockKey, 1800, lockoutExpiry.toString());

      const isLocked = await service.isCurrentlyLocked(identifier, action);

      expect(isLocked).toBe(true);
    });

    it('should return false if account is not locked', async () => {
      const identifier = 'user@example.com';
      const action = 'login';

      const isLocked = await service.isCurrentlyLocked(identifier, action);

      expect(isLocked).toBe(false);
    });

    it('should return false if lockout has expired', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const lockKey = `lockout:${action}:${identifier}`;

      // Set expired lockout
      const expiredLockout = Date.now() - 1000;
      await mockRedis.setex(lockKey, 1, expiredLockout.toString());

      const isLocked = await service.isCurrentlyLocked(identifier, action);

      expect(isLocked).toBe(false);
    });
  });

  describe('IP-Based vs User-Based Rate Limiting', () => {
    it('should track separate limits for different identifiers', async () => {
      const userIdentifier = 'user@example.com';
      const ipIdentifier = '192.168.1.1';
      const action = 'login';

      // Record failed attempt for user
      await service.recordAttempt(userIdentifier, action, false);
      await service.recordAttempt(userIdentifier, action, false);

      // Record failed attempt for IP
      await service.recordAttempt(ipIdentifier, action, false);

      // Check statuses
      const userStatus = await service.getRateLimitStatus(userIdentifier, action);
      const ipStatus = await service.getRateLimitStatus(ipIdentifier, action);

      expect(userStatus.attemptsRemaining).toBe(2); // 5 max - 2 current - 1 check
      expect(ipStatus.attemptsRemaining).toBe(3); // 5 max - 1 current - 1 check
    });

    it('should independently lock different identifiers', async () => {
      const user1 = 'user1@example.com';
      const user2 = 'user2@example.com';
      const action = 'login';
      const key1 = `rate_limit:${action}:${user1}`;

      // Lock user1
      await mockRedis.hset(key1, {
        count: '5',
        windowStart: Date.now().toString(),
        lockoutCount: '0',
      });

      const user1Status = await service.checkRateLimit(user1, action);
      const user2Status = await service.checkRateLimit(user2, action);

      expect(user1Status.isLocked).toBe(true);
      expect(user2Status.isLocked).toBe(false);
    });
  });

  describe('Distributed System Scenarios', () => {
    it('should handle concurrent rate limit checks', async () => {
      const identifier = 'user@example.com';
      const action = 'login';

      // Simulate concurrent checks
      const results = await Promise.all([
        service.checkRateLimit(identifier, action),
        service.checkRateLimit(identifier, action),
        service.checkRateLimit(identifier, action),
      ]);

      // All should succeed initially
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
    });

    it('should handle rapid sequential attempts', async () => {
      const identifier = 'user@example.com';
      const action = 'login';

      // Record 5 failed attempts rapidly
      for (let i = 0; i < 5; i++) {
        await service.recordAttempt(identifier, action, false);
      }

      // Should be locked after 5 attempts
      const status = await service.getRateLimitStatus(identifier, action);
      expect(status.isLocked).toBe(true);
    });

    it('should maintain consistency with pipeline operations', async () => {
      const identifier = 'user@example.com';
      const action = 'login';

      // Record multiple failed attempts
      await service.recordAttempt(identifier, action, false);
      await service.recordAttempt(identifier, action, false);
      await service.recordAttempt(identifier, action, false);

      // Check status
      const status = await service.getRateLimitStatus(identifier, action);

      expect(status.allowed).toBe(true);
      expect(status.attemptsRemaining).toBe(1); // 5 max - 3 recorded - 1 check
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero attempts remaining gracefully', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const key = `rate_limit:${action}:${identifier}`;

      await mockRedis.hset(key, {
        count: '4',
        windowStart: Date.now().toString(),
        lockoutCount: '0',
      });

      const result = await service.checkRateLimit(identifier, action);

      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(0); // Last attempt
    });

    it('should handle malformed Redis data gracefully', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const key = `rate_limit:${action}:${identifier}`;

      // Store invalid data
      await mockRedis.hset(key, {
        count: 'invalid',
        windowStart: 'not-a-number',
        lockoutCount: 'bad-data',
      });

      const result = await service.checkRateLimit(identifier, action);

      // Should treat as fresh attempt with defaults (NaN converts to 0)
      expect(result.allowed).toBe(true);
      expect(result.isLocked).toBe(false);
    });

    it('should handle Redis connection errors gracefully', async () => {
      const identifier = 'user@example.com';
      const action = 'login';

      // Mock Redis to throw error
      mockRedis.pipeline = jest.fn().mockReturnValue({
        hgetall: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
      });

      // Should not throw, but may return safe defaults or fail gracefully
      await expect(service.checkRateLimit(identifier, action)).rejects.toThrow();
    });

    it('should handle time boundary conditions', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const key = `rate_limit:${action}:${identifier}`;

      // Set window start to exactly 15 minutes ago
      const exactWindowEnd = Date.now() - (15 * 60 * 1000);
      await mockRedis.hset(key, {
        count: '5',
        windowStart: exactWindowEnd.toString(),
        lockoutCount: '0',
      });

      const result = await service.checkRateLimit(identifier, action);

      // Window should be expired and reset
      expect(result.allowed).toBe(true);
      expect(result.isLocked).toBe(false);
    });

    it('should handle lockout count incrementation correctly', async () => {
      const identifier = 'user@example.com';
      const action = 'login';
      const key = `rate_limit:${action}:${identifier}`;

      // Exceed rate limit multiple times to test lockout count
      for (let i = 0; i < 3; i++) {
        await mockRedis.hset(key, {
          count: '5',
          windowStart: Date.now().toString(),
          lockoutCount: i.toString(),
        });

        await service.checkRateLimit(identifier, action);

        const data = await mockRedis.hgetall(key);
        expect(data.lockoutCount).toBe((i + 1).toString());
      }
    });

    it('should set appropriate expiration times for different actions', async () => {
      const identifier = 'user@example.com';

      // Test login (15 minute window)
      await service.recordAttempt(identifier, 'login', false);
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'rate_limit:login:user@example.com',
        15 * 60
      );

      jest.clearAllMocks();

      // Test passwordReset (60 minute window)
      await service.recordAttempt(identifier, 'passwordReset', false);
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'rate_limit:passwordReset:user@example.com',
        60 * 60
      );

      jest.clearAllMocks();

      // Test passwordChange (60 minute window)
      await service.recordAttempt(identifier, 'passwordChange', false);
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'rate_limit:passwordChange:user@example.com',
        60 * 60
      );
    });
  });
});
