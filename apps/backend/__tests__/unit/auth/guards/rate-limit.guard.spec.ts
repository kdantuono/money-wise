import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RateLimitGuard, RateLimitOptions, RATE_LIMIT_KEY, RateLimit } from '../../../../src/auth/guards/rate-limit.guard';

// Mock Redis instance
const mockRedis = {
  get: jest.fn(),
  multi: jest.fn(() => ({
    incr: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([[null, 1], [null, 1]]),
  })),
  quit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

// Mock Reflector
const mockReflector = {
  get: jest.fn(),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      REDIS_DB: 0,
    };
    return config[key] ?? defaultValue;
  }),
};

// Mock ExecutionContext factory
const createMockExecutionContext = (
  options: {
    headers?: Record<string, string>;
    method?: string;
    path?: string;
    route?: { path: string };
    ip?: string;
    connection?: { remoteAddress?: string };
    socket?: { remoteAddress?: string };
  } = {},
): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => ({
      headers: options.headers || {},
      method: options.method || 'GET',
      path: options.path || '/api/test',
      route: options.route,
      ip: options.ip || '192.168.1.1',
      get: jest.fn((key: string) => options.headers?.[key.toLowerCase()]),
      connection: options.connection || { remoteAddress: '192.168.1.1' },
      socket: options.socket || { remoteAddress: '192.168.1.2' },
    }),
  }),
  getHandler: jest.fn(),
  getClass: jest.fn(),
} as any);

// Mock Logger
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(mockLoggerWarn);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLoggerError);
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'default', useValue: mockRedis }, // Provide mock Redis via DI
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should register Redis error handler', () => {
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should log Redis errors when they occur', () => {
      const errorHandler = mockRedis.on.mock.calls.find(call => call[0] === 'error')?.[1];
      const testError = new Error('Redis connection failed');

      errorHandler(testError);

      expect(mockLoggerError).toHaveBeenCalledWith('Redis connection error:', testError);
    });
  });

  describe('canActivate() - No Rate Limiting', () => {
    it('should return true when no rate limit options are set on handler or class', async () => {
      const context = createMockExecutionContext();
      mockReflector.get.mockReturnValueOnce(undefined).mockReturnValueOnce(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.get).toHaveBeenCalledTimes(2);
      expect(mockReflector.get).toHaveBeenNthCalledWith(1, RATE_LIMIT_KEY, context.getHandler());
      expect(mockReflector.get).toHaveBeenNthCalledWith(2, RATE_LIMIT_KEY, context.getClass());
    });
  });

  describe('canActivate() - Rate Limit Options Priority', () => {
    it('should apply rate limit options from handler when set', async () => {
      const context = createMockExecutionContext();
      const handlerOptions: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 10,
      };

      mockReflector.get.mockReturnValueOnce(handlerOptions);
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.get).toHaveBeenCalledWith(RATE_LIMIT_KEY, context.getHandler());
    });

    it('should apply rate limit options from class when handler has none', async () => {
      const context = createMockExecutionContext();
      const classOptions: RateLimitOptions = {
        windowMs: 120000,
        maxAttempts: 20,
      };

      mockReflector.get.mockReturnValueOnce(undefined).mockReturnValueOnce(classOptions);
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.get).toHaveBeenCalledTimes(2);
    });

    it('should prioritize handler options over class options', async () => {
      const context = createMockExecutionContext();
      const handlerOptions: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(handlerOptions);
      mockRedis.get.mockResolvedValueOnce(null);

      await guard.canActivate(context);

      // Should only check handler, not class (short-circuit)
      expect(mockReflector.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('canActivate() - Error Handling', () => {
    it('should return true on Redis errors (graceful degradation)', async () => {
      const context = createMockExecutionContext();
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockRejectedValueOnce(new Error('Redis connection lost'));

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockLoggerError).toHaveBeenCalledWith('Rate limiting infrastructure error (Redis):', expect.any(Error));
    });

    it('should re-throw HttpException when rate limit exceeded', async () => {
      const context = createMockExecutionContext();
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('5'); // At limit

      jest.spyOn(Date, 'now').mockReturnValue(1000000);

      const promise = guard.canActivate(context);
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toThrow('Too many requests, please try again later');
    });

    it('should differentiate between business errors (HttpException) and infrastructure errors', async () => {
      const context = createMockExecutionContext();
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      // Test 1: HttpException should propagate (not be caught)
      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('5');

      const startTime = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(startTime);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      expect(mockLoggerError).not.toHaveBeenCalledWith(
        'Rate limiting infrastructure error (Redis):',
        expect.anything()
      );

      jest.clearAllMocks();

      // Test 2: Redis error should be caught (graceful degradation)
      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockRejectedValueOnce(new Error('Redis timeout'));

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Rate limiting infrastructure error (Redis):',
        expect.any(Error)
      );
    });
  });

  describe('checkRateLimit() - Below Limit', () => {
    it('should increment count and return true when count is below limit', async () => {
      const context = createMockExecutionContext({
        method: 'POST',
        path: '/api/auth/login',
        connection: { remoteAddress: '10.0.0.1' },
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      const mockMultiChain = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 3], [null, 1]]),
      };
      mockRedis.multi.mockReturnValueOnce(mockMultiChain);

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('2'); // Below limit

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRedis.multi).toHaveBeenCalled();
      expect(mockMultiChain.incr).toHaveBeenCalled();
      expect(mockMultiChain.expire).toHaveBeenCalled();
      expect(mockMultiChain.exec).toHaveBeenCalled();
    });

    it('should handle first request with no existing count', async () => {
      const context = createMockExecutionContext();
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      const mockMultiChain = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1], [null, 1]]),
      };
      mockRedis.multi.mockReturnValueOnce(mockMultiChain);

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce(null); // No existing count

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockMultiChain.incr).toHaveBeenCalled();
    });
  });

  describe('checkRateLimit() - Limit Reached', () => {
    it('should throw HttpException when limit is reached', async () => {
      const context = createMockExecutionContext({
        ip: '192.168.1.1',
        headers: { 'user-agent': 'test-browser' },
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('5'); // At limit

      jest.spyOn(Date, 'now').mockReturnValue(1000000);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      // Should still log the warning
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded'),
        expect.objectContaining({
          ip: '192.168.1.1',
          userAgent: 'test-browser',
          count: 5,
          limit: 5,
        })
      );
    });

    it('should throw HttpException when count exceeds limit', async () => {
      const context = createMockExecutionContext();
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('10'); // Way over limit

      jest.spyOn(Date, 'now').mockReturnValue(1000000);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should throw HttpException with correct status code and message', async () => {
      const context = createMockExecutionContext();
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('5');

      jest.spyOn(Date, 'now').mockReturnValue(1000000);

      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: expect.objectContaining({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
        }),
      });
    });
  });

  describe('checkRateLimit() - Window Calculation', () => {
    it('should generate correct Redis key with window', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        path: '/api/test',
        ip: '192.168.1.1',
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('2');

      await guard.canActivate(context);

      // Verify Redis key format: rate_limit:${key}:${window}
      const getCall = mockRedis.get.mock.calls[0][0];
      expect(getCall).toMatch(/^rate_limit:192\.168\.1\.1:GET:\/api\/test:\d+$/);
    });

    it('should use consistent window for requests within same time period', async () => {
      const context = createMockExecutionContext();
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValue(options);
      mockRedis.get.mockResolvedValue('1');

      // Make two requests in quick succession
      await guard.canActivate(context);
      const firstKey = mockRedis.get.mock.calls[0][0];

      await guard.canActivate(context);
      const secondKey = mockRedis.get.mock.calls[1][0];

      // Should use same window (same key)
      expect(firstKey).toBe(secondKey);
    });
  });

  describe('checkRateLimit() - onLimitReached Callback', () => {
    it('should invoke onLimitReached callback when limit is hit', async () => {
      const callback = jest.fn();
      const context = createMockExecutionContext();
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
        onLimitReached: callback,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('5');

      jest.spyOn(Date, 'now').mockReturnValue(1000000);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        path: '/api/test',
      }));
    });

    it('should throw HttpException when limit hit without onLimitReached callback', async () => {
      const context = createMockExecutionContext();
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
        // No onLimitReached callback
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('5');

      jest.spyOn(Date, 'now').mockReturnValue(1000000);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should log warning with request details when limit exceeded', async () => {
      const context = createMockExecutionContext({
        headers: { 'user-agent': 'Mozilla/5.0' },
        connection: { remoteAddress: '10.0.0.1' },
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('5');

      jest.spyOn(Date, 'now').mockReturnValue(1000000);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded'),
        expect.objectContaining({
          ip: expect.any(String),
          userAgent: 'Mozilla/5.0',
          count: 5,
          limit: 5,
        }),
      );
    });
  });

  describe('generateKey() - Custom Key Generator', () => {
    it('should use custom keyGenerator when provided', async () => {
      const customKey = 'custom:user:123';
      const context = createMockExecutionContext();
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
        keyGenerator: jest.fn().mockReturnValue(customKey),
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('2');

      await guard.canActivate(context);

      expect(options.keyGenerator).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        path: '/api/test',
      }));

      const redisKey = mockRedis.get.mock.calls[0][0];
      expect(redisKey).toContain(customKey);
    });
  });

  describe('generateKey() - Default Key Generation', () => {
    it('should use IP:METHOD:path format when no custom generator', async () => {
      const context = createMockExecutionContext({
        method: 'POST',
        path: '/api/auth/login',
        connection: { remoteAddress: '10.0.0.5' },
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('1');

      await guard.canActivate(context);

      const redisKey = mockRedis.get.mock.calls[0][0];
      expect(redisKey).toContain('10.0.0.5:POST:/api/auth/login');
    });

    it('should use route.path when available', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        path: '/api/users/123',
        route: { path: '/api/users/:id' },
        ip: '192.168.1.1',
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('1');

      await guard.canActivate(context);

      const redisKey = mockRedis.get.mock.calls[0][0];
      expect(redisKey).toContain('192.168.1.1:GET:/api/users/:id');
    });

    it('should fallback to request.path when route.path is not available', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        path: '/api/test',
        route: undefined,
        ip: '192.168.1.1',
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('1');

      await guard.canActivate(context);

      const redisKey = mockRedis.get.mock.calls[0][0];
      expect(redisKey).toContain('192.168.1.1:GET:/api/test');
    });
  });

  describe('getClientIp() - IP Extraction', () => {
    it('should extract IP from x-forwarded-for header (first IP)', async () => {
      const context = createMockExecutionContext({
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1' },
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('1');

      await guard.canActivate(context);

      const redisKey = mockRedis.get.mock.calls[0][0];
      expect(redisKey).toContain('203.0.113.1');
    });

    it('should fallback to x-real-ip when x-forwarded-for is not present', async () => {
      const context = createMockExecutionContext({
        headers: { 'x-real-ip': '198.51.100.50' },
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('1');

      await guard.canActivate(context);

      const redisKey = mockRedis.get.mock.calls[0][0];
      expect(redisKey).toContain('198.51.100.50');
    });

    it('should fallback to connection.remoteAddress when headers are missing', async () => {
      const context = createMockExecutionContext({
        headers: {},
        connection: { remoteAddress: '192.168.10.20' },
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('1');

      await guard.canActivate(context);

      const redisKey = mockRedis.get.mock.calls[0][0];
      expect(redisKey).toContain('192.168.10.20');
    });

    it('should fallback to socket.remoteAddress when connection is unavailable', async () => {
      const context = createMockExecutionContext({
        headers: {},
        connection: {},
        socket: { remoteAddress: '172.16.0.100' },
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('1');

      await guard.canActivate(context);

      const redisKey = mockRedis.get.mock.calls[0][0];
      expect(redisKey).toContain('172.16.0.100');
    });

    it('should return "unknown" when all IP sources fail', async () => {
      const context = createMockExecutionContext({
        headers: {},
        connection: {},
        socket: {},
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('1');

      await guard.canActivate(context);

      const redisKey = mockRedis.get.mock.calls[0][0];
      expect(redisKey).toContain('unknown');
    });
  });

  describe('RateLimit Decorator', () => {
    it('should set metadata on method descriptor', () => {
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 10,
      };

      const descriptor = { value: jest.fn() };
      const decorator = RateLimit(options);
      decorator({}, 'testMethod', descriptor);

      const metadata = Reflect.getMetadata(RATE_LIMIT_KEY, descriptor.value);
      expect(metadata).toEqual(options);
    });

    it('should set metadata on class target', () => {
      const options: RateLimitOptions = {
        windowMs: 120000,
        maxAttempts: 20,
      };

      class TestClass {}
      const decorator = RateLimit(options);
      decorator(TestClass);

      const metadata = Reflect.getMetadata(RATE_LIMIT_KEY, TestClass);
      expect(metadata).toEqual(options);
    });
  });

  describe('Security - Rate Limit Enforcement', () => {
    it('should block request when rate limit exceeded (critical security test)', async () => {
      const context = createMockExecutionContext({
        method: 'POST',
        path: '/api/auth/login',
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 3,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('3'); // At limit

      jest.spyOn(Date, 'now').mockReturnValue(1000000);

      // CRITICAL: Must throw HttpException, NOT return true
      const promise = guard.canActivate(context);
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toMatchObject({
        response: expect.objectContaining({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
        }),
      });
    });

    it('should NOT apply graceful degradation when Redis is working and limit exceeded', async () => {
      const context = createMockExecutionContext();
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('5'); // Redis working, limit reached

      jest.spyOn(Date, 'now').mockReturnValue(1000000);

      // Should throw, not degrade gracefully
      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      // Should NOT log infrastructure error
      expect(mockLoggerError).not.toHaveBeenCalledWith(
        'Rate limiting infrastructure error (Redis):',
        expect.anything()
      );
    });

    it('should enforce rate limit across multiple requests from same IP', async () => {
      const context = createMockExecutionContext({
        ip: '203.0.113.1',
        method: 'POST',
        path: '/api/auth/login',
      });
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 3,
      };

      // Simulate sequential requests
      mockReflector.get.mockReturnValue(options);

      jest.spyOn(Date, 'now').mockReturnValue(1000000);

      // First request: count = 1 (below limit)
      mockRedis.get.mockResolvedValueOnce('0');
      const result1 = await guard.canActivate(context);
      expect(result1).toBe(true);

      // Second request: count = 2 (below limit)
      mockRedis.get.mockResolvedValueOnce('1');
      const result2 = await guard.canActivate(context);
      expect(result2).toBe(true);

      // Third request: count = 3 (at limit - should block)
      mockRedis.get.mockResolvedValueOnce('3');
      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should prevent brute force attacks by blocking excessive login attempts', async () => {
      const context = createMockExecutionContext({
        method: 'POST',
        path: '/api/auth/login',
        ip: '198.51.100.1',
      });
      const options: RateLimitOptions = {
        windowMs: 300000, // 5 minutes
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('10'); // Well over limit (brute force attempt)

      jest.spyOn(Date, 'now').mockReturnValue(1000000);

      // Should block the request
      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      // Should log warning about excessive attempts
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded'),
        expect.objectContaining({
          count: 10,
          limit: 5,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-numeric Redis count values', async () => {
      const context = createMockExecutionContext();
      const options: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
      };

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('invalid');

      const result = await guard.canActivate(context);

      expect(result).toBe(true); // Should treat as 0 (NaN defaults)
    });

    it('should apply default options when partial options provided', async () => {
      const context = createMockExecutionContext();
      const partialOptions: Partial<RateLimitOptions> = {
        maxAttempts: 3,
        // windowMs not provided - should use default
      };

      mockReflector.get.mockReturnValueOnce(partialOptions as RateLimitOptions);
      mockRedis.get.mockResolvedValueOnce('1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should set correct TTL on Redis key', async () => {
      const context = createMockExecutionContext();
      const windowMs = 120000; // 2 minutes
      const options: RateLimitOptions = {
        windowMs,
        maxAttempts: 5,
      };

      // Create a spy for the multi chain
      const mockMultiChain = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1], [null, 1]]),
      };
      mockRedis.multi.mockReturnValueOnce(mockMultiChain);

      mockReflector.get.mockReturnValueOnce(options);
      mockRedis.get.mockResolvedValueOnce('1');

      await guard.canActivate(context);

      expect(mockMultiChain.expire).toHaveBeenCalledWith(
        expect.any(String),
        Math.ceil(windowMs / 1000), // Convert to seconds
      );
    });
  });
});
