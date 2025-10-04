import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  RateLimitService,
  RateLimitConfig,
  RateLimitResult,
} from '../../../../src/auth/services/rate-limit.service';
import { Redis } from 'ioredis';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let mockRedis: jest.Mocked<Redis>;

  // Mock Date.now for consistent time-based testing
  let mockNow: number;

  beforeEach(async () => {
    mockNow = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => mockNow);

    // Create Redis mock
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      hgetall: jest.fn(),
      hset: jest.fn(),
      expire: jest.fn(),
      pipeline: jest.fn(() => ({
        hgetall: jest.fn().mockReturnThis(),
        hset: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, {}]]),
      })),
    } as any;

    // Mock Logger methods
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkRateLimit()', () => {
    const identifier = 'test@example.com';

    describe('Active lockout scenarios', () => {
      it('should deny request when currently locked out', async () => {
        const lockoutExpiry = mockNow + 30 * 60 * 1000; // 30 minutes from now
        mockRedis.get.mockResolvedValue(lockoutExpiry.toString());

        const result = await service.checkRateLimit(identifier, 'login');

        expect(result).toEqual({
          allowed: false,
          attemptsRemaining: 0,
          resetTime: new Date(lockoutExpiry),
          isLocked: true,
          lockoutExpiry: new Date(lockoutExpiry),
        });
        expect(mockRedis.get).toHaveBeenCalledWith(`lockout:login:${identifier}`);
      });

      it('should clean up expired lockout and allow request', async () => {
        const expiredLockout = mockNow - 1000; // Expired 1 second ago
        mockRedis.get.mockResolvedValue(expiredLockout.toString());

        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, {}]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'login');

        expect(mockRedis.del).toHaveBeenCalledWith(`lockout:login:${identifier}`);
        expect(mockRedis.del).toHaveBeenCalledWith(`rate_limit:login:${identifier}`);
        expect(result.allowed).toBe(true);
      });
    });

    describe('Within rate limit', () => {
      it('should allow request when no previous attempts', async () => {
        mockRedis.get.mockResolvedValue(null);

        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, {}]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'login');

        expect(result).toEqual({
          allowed: true,
          attemptsRemaining: 4, // maxAttempts(5) - currentCount(0) - 1
          resetTime: new Date(mockNow + 15 * 60 * 1000),
          isLocked: false,
        });
      });

      it('should allow request with attempts remaining', async () => {
        mockRedis.get.mockResolvedValue(null);

        const windowStart = mockNow - 5 * 60 * 1000; // 5 minutes ago
        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([[null, { count: '2', windowStart: windowStart.toString() }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'login');

        expect(result).toEqual({
          allowed: true,
          attemptsRemaining: 2, // maxAttempts(5) - currentCount(2) - 1
          resetTime: new Date(windowStart + 15 * 60 * 1000),
          isLocked: false,
        });
      });

      it('should calculate correct reset time based on window start', async () => {
        mockRedis.get.mockResolvedValue(null);

        const windowStart = mockNow - 10 * 60 * 1000; // 10 minutes ago
        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([[null, { count: '3', windowStart: windowStart.toString() }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'login');

        const expectedResetTime = windowStart + 15 * 60 * 1000; // windowStart + 15 minutes
        expect(result.resetTime).toEqual(new Date(expectedResetTime));
      });
    });

    describe('Expired window reset', () => {
      it('should reset window when expired and allow request', async () => {
        mockRedis.get.mockResolvedValue(null);

        const expiredWindowStart = mockNow - 20 * 60 * 1000; // 20 minutes ago (> 15 min window)
        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([[null, { count: '5', windowStart: expiredWindowStart.toString() }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'login');

        expect(mockRedis.del).toHaveBeenCalledWith(`rate_limit:login:${identifier}`);
        expect(result).toEqual({
          allowed: true,
          attemptsRemaining: 4, // maxAttempts(5) - 1
          resetTime: new Date(mockNow + 15 * 60 * 1000),
          isLocked: false,
        });
      });

      it('should reset window for passwordReset action', async () => {
        mockRedis.get.mockResolvedValue(null);

        const expiredWindowStart = mockNow - 70 * 60 * 1000; // 70 minutes ago (> 60 min window)
        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([[null, { count: '3', windowStart: expiredWindowStart.toString() }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'passwordReset');

        expect(mockRedis.del).toHaveBeenCalledWith(`rate_limit:passwordReset:${identifier}`);
        expect(result.attemptsRemaining).toBe(2); // maxAttempts(3) - 1
      });
    });

    describe('Rate limit exceeded', () => {
      it('should lockout when limit exceeded - first lockout', async () => {
        mockRedis.get.mockResolvedValue(null);

        const windowStart = mockNow - 5 * 60 * 1000;
        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([[null, { count: '5', windowStart: windowStart.toString(), lockoutCount: '0' }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'login');

        const expectedLockoutDuration = 30; // 30 * 2^0 = 30 minutes
        const expectedLockoutExpiry = mockNow + expectedLockoutDuration * 60 * 1000;

        expect(mockRedis.setex).toHaveBeenCalledWith(
          `lockout:login:${identifier}`,
          expectedLockoutDuration * 60,
          expectedLockoutExpiry.toString()
        );
        expect(mockRedis.hset).toHaveBeenCalledWith(`rate_limit:login:${identifier}`, 'lockoutCount', 1);
        expect(mockRedis.expire).toHaveBeenCalledWith(`rate_limit:login:${identifier}`, 24 * 60 * 60);

        expect(result).toEqual({
          allowed: false,
          attemptsRemaining: 0,
          resetTime: new Date(expectedLockoutExpiry),
          isLocked: true,
          lockoutExpiry: new Date(expectedLockoutExpiry),
        });
      });

      it('should apply progressive lockout - second lockout', async () => {
        mockRedis.get.mockResolvedValue(null);

        const windowStart = mockNow - 5 * 60 * 1000;
        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([[null, { count: '5', windowStart: windowStart.toString(), lockoutCount: '1' }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'login');

        const expectedLockoutDuration = 60; // 30 * 2^1 = 60 minutes
        const expectedLockoutExpiry = mockNow + expectedLockoutDuration * 60 * 1000;

        expect(mockRedis.setex).toHaveBeenCalledWith(
          `lockout:login:${identifier}`,
          expectedLockoutDuration * 60,
          expectedLockoutExpiry.toString()
        );
        expect(mockRedis.hset).toHaveBeenCalledWith(`rate_limit:login:${identifier}`, 'lockoutCount', 2);
      });

      it('should apply progressive lockout - third lockout (2 hours)', async () => {
        mockRedis.get.mockResolvedValue(null);

        const windowStart = mockNow - 5 * 60 * 1000;
        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([[null, { count: '5', windowStart: windowStart.toString(), lockoutCount: '2' }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        await service.checkRateLimit(identifier, 'login');

        const expectedLockoutDuration = 120; // 30 * 2^2 = 120 minutes
        const expectedLockoutExpiry = mockNow + expectedLockoutDuration * 60 * 1000;

        expect(mockRedis.setex).toHaveBeenCalledWith(
          `lockout:login:${identifier}`,
          expectedLockoutDuration * 60,
          expectedLockoutExpiry.toString()
        );
      });

      it('should cap progressive lockout at 24 hours', async () => {
        mockRedis.get.mockResolvedValue(null);

        const windowStart = mockNow - 5 * 60 * 1000;
        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([[null, { count: '5', windowStart: windowStart.toString(), lockoutCount: '10' }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        await service.checkRateLimit(identifier, 'login');

        // 30 * 2^10 = 30720 minutes, but should be capped at 1440 (24 hours)
        const expectedLockoutDuration = 1440;
        const expectedLockoutExpiry = mockNow + expectedLockoutDuration * 60 * 1000;

        expect(mockRedis.setex).toHaveBeenCalledWith(
          `lockout:login:${identifier}`,
          expectedLockoutDuration * 60,
          expectedLockoutExpiry.toString()
        );
      });

      it('should NOT apply progressive lockout for passwordReset', async () => {
        mockRedis.get.mockResolvedValue(null);

        const windowStart = mockNow - 5 * 60 * 1000;
        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([[null, { count: '3', windowStart: windowStart.toString(), lockoutCount: '2' }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'passwordReset');

        // Should always be 60 minutes, not progressive
        const expectedLockoutDuration = 60;
        const expectedLockoutExpiry = mockNow + expectedLockoutDuration * 60 * 1000;

        expect(mockRedis.setex).toHaveBeenCalledWith(
          `lockout:passwordReset:${identifier}`,
          expectedLockoutDuration * 60,
          expectedLockoutExpiry.toString()
        );
        // Should NOT increment lockout count
        expect(mockRedis.hset).not.toHaveBeenCalledWith(expect.anything(), 'lockoutCount', expect.anything());
        expect(mockRedis.expire).not.toHaveBeenCalled();
      });

      it('should NOT apply progressive lockout for passwordChange', async () => {
        mockRedis.get.mockResolvedValue(null);

        const windowStart = mockNow - 5 * 60 * 1000;
        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([[null, { count: '10', windowStart: windowStart.toString() }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        await service.checkRateLimit(identifier, 'passwordChange');

        const expectedLockoutDuration = 15; // Static 15 minutes
        expect(mockRedis.setex).toHaveBeenCalledWith(
          `lockout:passwordChange:${identifier}`,
          expectedLockoutDuration * 60,
          expect.any(String)
        );
        expect(mockRedis.hset).not.toHaveBeenCalledWith(expect.anything(), 'lockoutCount', expect.anything());
      });

      it('should log warning when rate limit exceeded', async () => {
        mockRedis.get.mockResolvedValue(null);

        const windowStart = mockNow - 5 * 60 * 1000;
        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([[null, { count: '5', windowStart: windowStart.toString(), lockoutCount: '0' }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        await service.checkRateLimit(identifier, 'login');

        expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit exceeded'));
        expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining(`login:${identifier}`));
      });
    });

    describe('Custom configuration', () => {
      it('should use custom maxAttempts', async () => {
        mockRedis.get.mockResolvedValue(null);

        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, { count: '0' }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const customConfig: Partial<RateLimitConfig> = { maxAttempts: 10 };
        const result = await service.checkRateLimit(identifier, 'login', customConfig);

        expect(result.attemptsRemaining).toBe(9); // 10 - 0 - 1
      });

      it('should use custom windowMinutes', async () => {
        mockRedis.get.mockResolvedValue(null);

        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, {}]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const customConfig: Partial<RateLimitConfig> = { windowMinutes: 30 };
        const result = await service.checkRateLimit(identifier, 'login', customConfig);

        expect(result.resetTime).toEqual(new Date(mockNow + 30 * 60 * 1000));
      });

      it('should use custom lockoutMinutes', async () => {
        mockRedis.get.mockResolvedValue(null);

        const windowStart = mockNow - 5 * 60 * 1000;
        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue([[null, { count: '5', windowStart: windowStart.toString(), lockoutCount: '0' }]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const customConfig: Partial<RateLimitConfig> = { lockoutMinutes: 60 };
        await service.checkRateLimit(identifier, 'login', customConfig);

        const expectedLockoutDuration = 60; // Custom 60 minutes
        expect(mockRedis.setex).toHaveBeenCalledWith(
          `lockout:login:${identifier}`,
          expectedLockoutDuration * 60,
          expect.any(String)
        );
      });
    });

    describe('All action types', () => {
      it('should handle login action', async () => {
        mockRedis.get.mockResolvedValue(null);

        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, {}]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'login');

        expect(result.attemptsRemaining).toBe(4); // maxAttempts: 5
      });

      it('should handle passwordReset action', async () => {
        mockRedis.get.mockResolvedValue(null);

        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, {}]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'passwordReset');

        expect(result.attemptsRemaining).toBe(2); // maxAttempts: 3
      });

      it('should handle passwordChange action', async () => {
        mockRedis.get.mockResolvedValue(null);

        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, {}]]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'passwordChange');

        expect(result.attemptsRemaining).toBe(9); // maxAttempts: 10
      });
    });

    describe('Edge cases and error handling', () => {
      it('should handle pipeline returning null gracefully', async () => {
        mockRedis.get.mockResolvedValue(null);

        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(null), // Pipeline returns null
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'login');

        // Should default to empty object and allow request
        expect(result.allowed).toBe(true);
        expect(result.attemptsRemaining).toBe(4);
      });

      it('should handle pipeline returning undefined gracefully', async () => {
        mockRedis.get.mockResolvedValue(null);

        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(undefined), // Pipeline returns undefined
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'login');

        expect(result.allowed).toBe(true);
        expect(result.attemptsRemaining).toBe(4);
      });

      it('should handle pipeline returning empty array', async () => {
        mockRedis.get.mockResolvedValue(null);

        const pipeline = {
          hgetall: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]), // Empty array
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        const result = await service.checkRateLimit(identifier, 'login');

        expect(result.allowed).toBe(true);
        expect(result.attemptsRemaining).toBe(4);
      });
    });
  });

  describe('recordAttempt()', () => {
    const identifier = 'test@example.com';

    describe('Successful attempts', () => {
      it('should clear rate limit on successful attempt', async () => {
        await service.recordAttempt(identifier, 'login', true);

        expect(mockRedis.del).toHaveBeenCalledWith(`rate_limit:login:${identifier}`);
      });

      it('should not record count on successful attempt', async () => {
        await service.recordAttempt(identifier, 'login', true);

        expect(mockRedis.hgetall).not.toHaveBeenCalled();
        expect(mockRedis.hset).not.toHaveBeenCalled();
      });
    });

    describe('Failed attempts - new window', () => {
      it('should initialize window on first failed attempt', async () => {
        mockRedis.hgetall.mockResolvedValue({});

        const pipeline = {
          hset: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        await service.recordAttempt(identifier, 'login', false);

        expect(mockRedis.hgetall).toHaveBeenCalledWith(`rate_limit:login:${identifier}`);
        expect(pipeline.hset).toHaveBeenCalledWith(`rate_limit:login:${identifier}`, 'count', '1');
        expect(pipeline.expire).toHaveBeenCalledWith(`rate_limit:login:${identifier}`, 15 * 60);
      });

      it('should log debug message for failed attempt', async () => {
        mockRedis.hgetall.mockResolvedValue({});

        const pipeline = {
          hset: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        await service.recordAttempt(identifier, 'login', false);

        expect(Logger.prototype.debug).toHaveBeenCalledWith(expect.stringContaining('Recorded failed attempt'));
        expect(Logger.prototype.debug).toHaveBeenCalledWith(expect.stringContaining('Count: 1'));
      });
    });

    describe('Failed attempts - within window', () => {
      it('should increment count within active window', async () => {
        const windowStart = mockNow - 5 * 60 * 1000; // 5 minutes ago
        mockRedis.hgetall.mockResolvedValue({
          count: '3',
          windowStart: windowStart.toString(),
          lockoutCount: '0',
        });

        const pipeline = {
          hset: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        await service.recordAttempt(identifier, 'login', false);

        expect(pipeline.hset).toHaveBeenCalledWith(`rate_limit:login:${identifier}`, 'count', '4');
        expect(Logger.prototype.debug).toHaveBeenCalledWith(expect.stringContaining('Count: 4'));
      });

      it('should preserve lockoutCount when incrementing', async () => {
        const windowStart = mockNow - 5 * 60 * 1000;
        mockRedis.hgetall.mockResolvedValue({
          count: '2',
          windowStart: windowStart.toString(),
          lockoutCount: '3',
        });

        const pipeline = {
          hset: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        await service.recordAttempt(identifier, 'login', false);

        expect(pipeline.hset).toHaveBeenCalledWith(`rate_limit:login:${identifier}`, 'count', '3');
        // Lockout count should remain in hash (not explicitly tested in current implementation)
      });
    });

    describe('Failed attempts - expired window', () => {
      it('should reset window when expired', async () => {
        const expiredWindowStart = mockNow - 20 * 60 * 1000; // 20 minutes ago (> 15 min)
        mockRedis.hgetall.mockResolvedValue({
          count: '5',
          windowStart: expiredWindowStart.toString(),
          lockoutCount: '2',
        });

        const pipeline = {
          hset: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        await service.recordAttempt(identifier, 'login', false);

        expect(pipeline.hset).toHaveBeenCalledWith(`rate_limit:login:${identifier}`, {
          count: '1',
          windowStart: mockNow.toString(),
          lockoutCount: '2',
        });
      });

      it('should preserve lockoutCount when resetting window', async () => {
        const expiredWindowStart = mockNow - 70 * 60 * 1000; // 70 minutes ago
        mockRedis.hgetall.mockResolvedValue({
          count: '3',
          windowStart: expiredWindowStart.toString(),
          lockoutCount: '5',
        });

        const pipeline = {
          hset: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        await service.recordAttempt(identifier, 'passwordReset', false);

        expect(pipeline.hset).toHaveBeenCalledWith(`rate_limit:passwordReset:${identifier}`, {
          count: '1',
          windowStart: mockNow.toString(),
          lockoutCount: '5',
        });
      });

      it('should handle missing lockoutCount when resetting', async () => {
        const expiredWindowStart = mockNow - 20 * 60 * 1000;
        mockRedis.hgetall.mockResolvedValue({
          count: '4',
          windowStart: expiredWindowStart.toString(),
        });

        const pipeline = {
          hset: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline as any);

        await service.recordAttempt(identifier, 'login', false);

        expect(pipeline.hset).toHaveBeenCalledWith(`rate_limit:login:${identifier}`, {
          count: '1',
          windowStart: mockNow.toString(),
          lockoutCount: '0',
        });
      });
    });
  });

  describe('clearRateLimit()', () => {
    const identifier = 'test@example.com';

    it('should delete both rate limit and lockout keys', async () => {
      await service.clearRateLimit(identifier, 'login');

      expect(mockRedis.del).toHaveBeenCalledWith(`rate_limit:login:${identifier}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`lockout:login:${identifier}`);
    });

    it('should log debug message', async () => {
      await service.clearRateLimit(identifier, 'login');

      expect(Logger.prototype.debug).toHaveBeenCalledWith(expect.stringContaining('Cleared rate limit'));
      expect(Logger.prototype.debug).toHaveBeenCalledWith(expect.stringContaining(`login:${identifier}`));
    });

    it('should handle passwordReset action', async () => {
      await service.clearRateLimit(identifier, 'passwordReset');

      expect(mockRedis.del).toHaveBeenCalledWith(`rate_limit:passwordReset:${identifier}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`lockout:passwordReset:${identifier}`);
    });

    it('should handle passwordChange action', async () => {
      await service.clearRateLimit(identifier, 'passwordChange');

      expect(mockRedis.del).toHaveBeenCalledWith(`rate_limit:passwordChange:${identifier}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`lockout:passwordChange:${identifier}`);
    });
  });

  describe('getRateLimitStatus()', () => {
    const identifier = 'test@example.com';

    it('should delegate to checkRateLimit', async () => {
      mockRedis.get.mockResolvedValue(null);

      const pipeline = {
        hgetall: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, {}]]),
      };
      mockRedis.pipeline.mockReturnValue(pipeline as any);

      const result = await service.getRateLimitStatus(identifier, 'login');

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('attemptsRemaining');
      expect(result).toHaveProperty('resetTime');
      expect(result).toHaveProperty('isLocked');
    });

    it('should return locked status when locked', async () => {
      const lockoutExpiry = mockNow + 30 * 60 * 1000;
      mockRedis.get.mockResolvedValue(lockoutExpiry.toString());

      const result = await service.getRateLimitStatus(identifier, 'login');

      expect(result.isLocked).toBe(true);
      expect(result.allowed).toBe(false);
    });

    it('should return allowed status when not locked', async () => {
      mockRedis.get.mockResolvedValue(null);

      const pipeline = {
        hgetall: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, { count: '2' }]]),
      };
      mockRedis.pipeline.mockReturnValue(pipeline as any);

      const result = await service.getRateLimitStatus(identifier, 'login');

      expect(result.isLocked).toBe(false);
      expect(result.allowed).toBe(true);
    });
  });

  describe('isCurrentlyLocked()', () => {
    const identifier = 'test@example.com';

    it('should return true when actively locked', async () => {
      const lockoutExpiry = mockNow + 30 * 60 * 1000; // Future lockout
      mockRedis.get.mockResolvedValue(lockoutExpiry.toString());

      const result = await service.isCurrentlyLocked(identifier, 'login');

      expect(result).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(`lockout:login:${identifier}`);
    });

    it('should return false when lockout expired', async () => {
      const expiredLockout = mockNow - 1000; // Past lockout
      mockRedis.get.mockResolvedValue(expiredLockout.toString());

      const result = await service.isCurrentlyLocked(identifier, 'login');

      expect(result).toBe(false);
    });

    it('should return false when no lockout exists', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.isCurrentlyLocked(identifier, 'login');

      expect(result).toBe(false);
    });

    it('should handle passwordReset action', async () => {
      const lockoutExpiry = mockNow + 60 * 60 * 1000;
      mockRedis.get.mockResolvedValue(lockoutExpiry.toString());

      const result = await service.isCurrentlyLocked(identifier, 'passwordReset');

      expect(result).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(`lockout:passwordReset:${identifier}`);
    });

    it('should handle passwordChange action', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.isCurrentlyLocked(identifier, 'passwordChange');

      expect(result).toBe(false);
      expect(mockRedis.get).toHaveBeenCalledWith(`lockout:passwordChange:${identifier}`);
    });
  });
});
