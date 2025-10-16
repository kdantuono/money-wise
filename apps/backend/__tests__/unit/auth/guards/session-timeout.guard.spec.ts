import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { SessionTimeoutGuard, SessionManagementService, SessionInfo } from '../../../../src/auth/guards/session-timeout.guard';

// Mock Redis instance
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

// Mock Redis constructor
jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => mockRedis),
  };
});

// Mock JwtService
const mockJwtService = {
  verify: jest.fn(),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      REDIS_DB: 0,
      REDIS_PASSWORD: undefined,
      JWT_ACCESS_SECRET: 'test-secret',
      SESSION_MAX_DURATION: 8 * 60 * 60 * 1000, // 8 hours
      SESSION_IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    };
    return config[key] ?? defaultValue;
  }),
};

// Mock ExecutionContext
const createMockExecutionContext = (headers: Record<string, string> = {}, connectionInfo: any = {}): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => ({
      headers,
      get: (key: string) => headers[key.toLowerCase()],
      connection: { remoteAddress: connectionInfo.remoteAddress || '192.168.1.1' },
      socket: { remoteAddress: connectionInfo.socketAddress || '192.168.1.2' },
    }),
  }),
} as any);

// Mock Logger
jest.spyOn(Logger.prototype, 'warn').mockImplementation();
jest.spyOn(Logger.prototype, 'error').mockImplementation();
jest.spyOn(Logger.prototype, 'log').mockImplementation();

describe('SessionTimeoutGuard', () => {
  let guard: SessionTimeoutGuard;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionTimeoutGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<SessionTimeoutGuard>(SessionTimeoutGuard);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no token is present', async () => {
      const context = createMockExecutionContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('should return true when authorization header does not start with Bearer', async () => {
      const context = createMockExecutionContext({
        authorization: 'Basic abc123',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('should create new session when valid token has no existing session', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
        'user-agent': 'Mozilla/5.0 Test Browser',
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verify).toHaveBeenCalledWith(token, {
        secret: 'test-secret',
      });
      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('session:user123:'),
        28800, // 8 hours in seconds
        expect.stringContaining('user123'),
      );
    });

    it('should update session activity when valid token has active session', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const now = Date.now();
      const sessionInfo: SessionInfo = {
        userId: 'user123',
        lastActivity: now - 5 * 60 * 1000, // 5 minutes ago
        createdAt: now - 60 * 60 * 1000, // 1 hour ago
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionInfo));

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
      // Verify activity was updated
      const setexCall = mockRedis.setex.mock.calls[0];
      const updatedSessionInfo = JSON.parse(setexCall[2]);
      expect(updatedSessionInfo.lastActivity).toBeGreaterThan(sessionInfo.lastActivity);
    });

    it('should throw UnauthorizedException when absolute timeout exceeded', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const now = Date.now();
      const sessionInfo: SessionInfo = {
        userId: 'user123',
        lastActivity: now - 5 * 60 * 1000, // 5 minutes ago
        createdAt: now - (9 * 60 * 60 * 1000), // 9 hours ago (exceeds 8 hour max)
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionInfo));

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Session expired due to maximum duration reached');
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when idle timeout exceeded', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const now = Date.now();
      const sessionInfo: SessionInfo = {
        userId: 'user123',
        lastActivity: now - (31 * 60 * 1000), // 31 minutes ago (exceeds 30 minute idle)
        createdAt: now - 60 * 60 * 1000, // 1 hour ago
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionInfo));

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Session expired due to inactivity');
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should return true when JWT verification fails', async () => {
      const token = 'invalid-jwt-token';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Session timeout guard error:',
        expect.any(Error),
      );
    });

    it('should return true on Redis error during getSessionInfo', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockRejectedValue(new Error('Redis connection error'));

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should re-throw UnauthorizedException', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const now = Date.now();
      const sessionInfo: SessionInfo = {
        userId: 'user123',
        lastActivity: now - (31 * 60 * 1000),
        createdAt: now - 60 * 60 * 1000,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionInfo));

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      // Should not catch and return true
      expect(Logger.prototype.error).not.toHaveBeenCalledWith(
        'Session timeout guard error:',
        expect.any(UnauthorizedException),
      );
    });
  });

  describe('createSession', () => {
    it('should create session with correct structure and TTL', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
        'user-agent': 'Mozilla/5.0 Test Browser',
        'x-forwarded-for': '203.0.113.1, 192.168.1.1',
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('session:user123:'),
        28800, // 8 hours in seconds
        expect.any(String),
      );

      const sessionJson = mockRedis.setex.mock.calls[0][2];
      const sessionInfo = JSON.parse(sessionJson);

      expect(sessionInfo).toEqual({
        userId: 'user123',
        lastActivity: expect.any(Number),
        createdAt: expect.any(Number),
        ipAddress: '203.0.113.1', // First IP from x-forwarded-for
        userAgent: 'Mozilla/5.0 Test Browser',
      });
    });

    it('should handle missing user-agent', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      const sessionJson = mockRedis.setex.mock.calls[0][2];
      const sessionInfo = JSON.parse(sessionJson);

      expect(sessionInfo.userAgent).toBe('unknown');
    });
  });

  describe('getSessionInfo', () => {
    it('should return parsed SessionInfo when session exists', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const sessionInfo: SessionInfo = {
        userId: 'user123',
        lastActivity: Date.now(),
        createdAt: Date.now(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionInfo));

      await guard.canActivate(context);

      expect(mockRedis.get).toHaveBeenCalled();
    });

    it('should return null when no session exists', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      expect(mockRedis.setex).toHaveBeenCalled(); // New session created
    });

    it('should return null on JSON parse error', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue('invalid-json{');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error getting session info:',
        expect.any(Error),
      );
    });
  });

  describe('updateSessionActivity', () => {
    it('should update lastActivity to current time', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const now = Date.now();
      const sessionInfo: SessionInfo = {
        userId: 'user123',
        lastActivity: now - 5 * 60 * 1000,
        createdAt: now - 60 * 60 * 1000,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionInfo));

      await guard.canActivate(context);

      const setexCall = mockRedis.setex.mock.calls[0];
      const updatedSessionInfo = JSON.parse(setexCall[2]);
      expect(updatedSessionInfo.lastActivity).toBeGreaterThan(sessionInfo.lastActivity);
    });

    it('should calculate TTL as minimum of remaining maxSessionDuration and idleTimeout', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const now = Date.now();
      // Session created 7.5 hours ago (30 minutes remaining until max duration)
      const sessionInfo: SessionInfo = {
        userId: 'user123',
        lastActivity: now - 5 * 60 * 1000,
        createdAt: now - (7.5 * 60 * 60 * 1000),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionInfo));

      await guard.canActivate(context);

      const setexCall = mockRedis.setex.mock.calls[0];
      const ttl = setexCall[1];
      // TTL should be ~30 minutes (1800 seconds) or less, not the full idle timeout
      expect(ttl).toBeLessThanOrEqual(1800);
      expect(ttl).toBeGreaterThan(1700); // Account for execution time
    });

    it('should delete session when TTL is zero or negative', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const now = Date.now();
      // Session created just beyond the max duration boundary
      const sessionInfo: SessionInfo = {
        userId: 'user123',
        lastActivity: now,
        createdAt: now - (8 * 60 * 60 * 1000) - 1000, // Just over 8 hours ago
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionInfo));

      // Should throw because absolute timeout exceeded
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle Redis errors gracefully', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const now = Date.now();
      const sessionInfo: SessionInfo = {
        userId: 'user123',
        lastActivity: now - 5 * 60 * 1000,
        createdAt: now - 60 * 60 * 1000,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionInfo));
      mockRedis.setex.mockRejectedValue(new Error('Redis write error'));

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error updating session activity:',
        expect.any(Error),
      );
    });
  });

  describe('invalidateSession', () => {
    it('should delete session key from Redis', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const now = Date.now();
      const sessionInfo: SessionInfo = {
        userId: 'user123',
        lastActivity: now - (31 * 60 * 1000),
        createdAt: now - 60 * 60 * 1000,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionInfo));

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);

      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining('session:user123:'),
      );
    });

    it('should handle Redis errors gracefully', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const now = Date.now();
      const sessionInfo: SessionInfo = {
        userId: 'user123',
        lastActivity: now - (31 * 60 * 1000),
        createdAt: now - 60 * 60 * 1000,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionInfo));
      mockRedis.del.mockRejectedValue(new Error('Redis delete error'));

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error invalidating session:',
        expect.any(Error),
      );
    });
  });

  describe('getTimeoutPolicies', () => {
    it('should return maxSessionDuration from config with default', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      expect(mockConfigService.get).toHaveBeenCalledWith('SESSION_MAX_DURATION', 8 * 60 * 60 * 1000);
    });

    it('should return idleTimeout from config with default', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      expect(mockConfigService.get).toHaveBeenCalledWith('SESSION_IDLE_TIMEOUT', 30 * 60 * 1000);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract Bearer token from Authorization header', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      expect(mockJwtService.verify).toHaveBeenCalledWith(token, expect.any(Object));
    });

    it('should return undefined for missing Authorization header', async () => {
      const context = createMockExecutionContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('should return undefined for non-Bearer tokens', async () => {
      const context = createMockExecutionContext({
        authorization: 'Basic abc123',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });
  });

  describe('hashToken', () => {
    it('should return base64-encoded hash of last 20 chars', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      const sessionKey = mockRedis.setex.mock.calls[0][0];
      // Should contain base64-encoded hash without special characters
      expect(sessionKey).toMatch(/^session:user123:[a-zA-Z0-9]+$/);
    });

    it('should remove non-alphanumeric characters from hash', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      const sessionKey = mockRedis.setex.mock.calls[0][0];
      // Hash part should not contain =, +, /, etc.
      const hashPart = sessionKey.split(':')[2];
      expect(hashPart).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header (first IP)', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
        'x-forwarded-for': '203.0.113.1, 192.168.1.1, 10.0.0.1',
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      const sessionJson = mockRedis.setex.mock.calls[0][2];
      const sessionInfo = JSON.parse(sessionJson);
      expect(sessionInfo.ipAddress).toBe('203.0.113.1');
    });

    it('should fall back to x-real-ip header', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext({
        authorization: `Bearer ${token}`,
        'x-real-ip': '198.51.100.1',
      });

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      const sessionJson = mockRedis.setex.mock.calls[0][2];
      const sessionInfo = JSON.parse(sessionJson);
      expect(sessionInfo.ipAddress).toBe('198.51.100.1');
    });

    it('should fall back to connection.remoteAddress', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = createMockExecutionContext(
        { authorization: `Bearer ${token}` },
        { remoteAddress: '192.168.1.100' },
      );

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      const sessionJson = mockRedis.setex.mock.calls[0][2];
      const sessionInfo = JSON.parse(sessionJson);
      expect(sessionInfo.ipAddress).toBe('192.168.1.100');
    });

    it('should fall back to socket.remoteAddress', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${token}` },
            get: (key: string) => (key.toLowerCase() === 'user-agent' ? undefined : undefined),
            connection: {}, // No remoteAddress
            socket: { remoteAddress: '192.168.1.200' },
          }),
        }),
      } as any;

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      const sessionJson = mockRedis.setex.mock.calls[0][2];
      const sessionInfo = JSON.parse(sessionJson);
      expect(sessionInfo.ipAddress).toBe('192.168.1.200');
    });

    it('should return "unknown" when all sources fail', async () => {
      const token = 'valid-jwt-token-123456789012345678901234567890';
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${token}` },
            get: (key: string) => undefined,
            connection: {},
            socket: {},
          }),
        }),
      } as any;

      mockJwtService.verify.mockReturnValue({ sub: 'user123' });
      mockRedis.get.mockResolvedValue(null);

      await guard.canActivate(context);

      const sessionJson = mockRedis.setex.mock.calls[0][2];
      const sessionInfo = JSON.parse(sessionJson);
      expect(sessionInfo.ipAddress).toBe('unknown');
    });
  });

  describe('onModuleDestroy', () => {
    it('should call redis.quit()', async () => {
      await guard.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });

  describe('Redis error handling', () => {
    it('should register error handler on Redis connection', () => {
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should log Redis connection errors', () => {
      const errorHandler = mockRedis.on.mock.calls.find(call => call[0] === 'error')?.[1];
      const testError = new Error('Redis connection failed');

      errorHandler(testError);

      expect(Logger.prototype.error).toHaveBeenCalledWith('Redis connection error:', testError);
    });
  });
});

describe('SessionManagementService', () => {
  let service: SessionManagementService;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionManagementService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SessionManagementService>(SessionManagementService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserSessions', () => {
    it('should return all sessions for a user sorted by lastActivity descending', async () => {
      const userId = 'user123';
      const now = Date.now();
      const sessions = [
        {
          userId,
          lastActivity: now - 10 * 60 * 1000,
          createdAt: now - 60 * 60 * 1000,
          ipAddress: '192.168.1.1',
          userAgent: 'Browser 1',
        },
        {
          userId,
          lastActivity: now - 5 * 60 * 1000, // More recent
          createdAt: now - 30 * 60 * 1000,
          ipAddress: '192.168.1.2',
          userAgent: 'Browser 2',
        },
      ];

      mockRedis.keys.mockResolvedValue([
        `session:${userId}:token1`,
        `session:${userId}:token2`,
      ]);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(sessions[0]))
        .mockResolvedValueOnce(JSON.stringify(sessions[1]));

      const result = await service.getUserSessions(userId);

      expect(mockRedis.keys).toHaveBeenCalledWith(`session:${userId}:*`);
      expect(result).toHaveLength(2);
      expect(result[0].lastActivity).toBe(sessions[1].lastActivity); // Most recent first
      expect(result[1].lastActivity).toBe(sessions[0].lastActivity);
    });

    it('should return empty array when no sessions exist', async () => {
      const userId = 'user123';

      mockRedis.keys.mockResolvedValue([]);

      const result = await service.getUserSessions(userId);

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      const userId = 'user123';

      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const result = await service.getUserSessions(userId);

      expect(result).toEqual([]);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error getting user sessions:',
        expect.any(Error),
      );
    });

    it('should skip sessions with null data', async () => {
      const userId = 'user123';
      const now = Date.now();
      const session: SessionInfo = {
        userId,
        lastActivity: now - 5 * 60 * 1000,
        createdAt: now - 30 * 60 * 1000,
        ipAddress: '192.168.1.1',
        userAgent: 'Browser 1',
      };

      mockRedis.keys.mockResolvedValue([
        `session:${userId}:token1`,
        `session:${userId}:token2`,
      ]);
      mockRedis.get
        .mockResolvedValueOnce(null) // First session is null
        .mockResolvedValueOnce(JSON.stringify(session)); // Second is valid

      const result = await service.getUserSessions(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(session);
    });
  });

  describe('invalidateUserSessions', () => {
    it('should delete all sessions for a user and return count', async () => {
      const userId = 'user123';
      const sessionKeys = [
        `session:${userId}:token1`,
        `session:${userId}:token2`,
        `session:${userId}:token3`,
      ];

      mockRedis.keys.mockResolvedValue(sessionKeys);
      mockRedis.del.mockResolvedValue(3);

      const result = await service.invalidateUserSessions(userId);

      expect(mockRedis.keys).toHaveBeenCalledWith(`session:${userId}:*`);
      expect(mockRedis.del).toHaveBeenCalledWith(...sessionKeys);
      expect(result).toBe(3);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Invalidated 3 sessions for user ${userId}`,
      );
    });

    it('should return 0 when no sessions exist', async () => {
      const userId = 'user123';

      mockRedis.keys.mockResolvedValue([]);

      const result = await service.invalidateUserSessions(userId);

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should return 0 on error', async () => {
      const userId = 'user123';

      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const result = await service.invalidateUserSessions(userId);

      expect(result).toBe(0);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error invalidating user sessions:',
        expect.any(Error),
      );
    });
  });

  describe('getSessionStats', () => {
    it('should return total active sessions, sessions by user, and oldest session', async () => {
      const now = Date.now();
      const sessions = [
        {
          userId: 'user1',
          lastActivity: now,
          createdAt: now - 60 * 60 * 1000,
          ipAddress: '192.168.1.1',
          userAgent: 'Browser 1',
        },
        {
          userId: 'user1',
          lastActivity: now,
          createdAt: now - 30 * 60 * 1000,
          ipAddress: '192.168.1.2',
          userAgent: 'Browser 2',
        },
        {
          userId: 'user2',
          lastActivity: now,
          createdAt: now - 120 * 60 * 1000, // Oldest
          ipAddress: '192.168.1.3',
          userAgent: 'Browser 3',
        },
      ];

      mockRedis.keys.mockResolvedValue([
        'session:user1:token1',
        'session:user1:token2',
        'session:user2:token3',
      ]);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(sessions[0]))
        .mockResolvedValueOnce(JSON.stringify(sessions[1]))
        .mockResolvedValueOnce(JSON.stringify(sessions[2]));

      const result = await service.getSessionStats();

      expect(result.totalActiveSessions).toBe(3);
      expect(result.sessionsByUser).toEqual({
        user1: 2,
        user2: 1,
      });
      expect(result.oldestSession).toEqual(new Date(sessions[2].createdAt));
    });

    it('should return null oldestSession when no sessions exist', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.getSessionStats();

      expect(result).toEqual({
        totalActiveSessions: 0,
        sessionsByUser: {},
        oldestSession: null,
      });
    });

    it('should return safe defaults on error', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const result = await service.getSessionStats();

      expect(result).toEqual({
        totalActiveSessions: 0,
        sessionsByUser: {},
        oldestSession: null,
      });
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error getting session stats:',
        expect.any(Error),
      );
    });

    it('should skip sessions with null data', async () => {
      const now = Date.now();
      const session: SessionInfo = {
        userId: 'user1',
        lastActivity: now,
        createdAt: now - 60 * 60 * 1000,
        ipAddress: '192.168.1.1',
        userAgent: 'Browser 1',
      };

      mockRedis.keys.mockResolvedValue([
        'session:user1:token1',
        'session:user1:token2',
      ]);
      mockRedis.get
        .mockResolvedValueOnce(null) // First session is null
        .mockResolvedValueOnce(JSON.stringify(session));

      const result = await service.getSessionStats();

      expect(result.totalActiveSessions).toBe(2); // Counted from keys
      expect(result.sessionsByUser).toEqual({ user1: 1 }); // Only valid session counted
    });

    it('should handle multiple sessions for same user', async () => {
      const now = Date.now();
      const sessions = [
        {
          userId: 'user1',
          lastActivity: now,
          createdAt: now - 60 * 60 * 1000,
          ipAddress: '192.168.1.1',
          userAgent: 'Browser 1',
        },
        {
          userId: 'user1',
          lastActivity: now,
          createdAt: now - 30 * 60 * 1000,
          ipAddress: '192.168.1.2',
          userAgent: 'Browser 2',
        },
        {
          userId: 'user1',
          lastActivity: now,
          createdAt: now - 90 * 60 * 1000,
          ipAddress: '192.168.1.3',
          userAgent: 'Browser 3',
        },
      ];

      mockRedis.keys.mockResolvedValue([
        'session:user1:token1',
        'session:user1:token2',
        'session:user1:token3',
      ]);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(sessions[0]))
        .mockResolvedValueOnce(JSON.stringify(sessions[1]))
        .mockResolvedValueOnce(JSON.stringify(sessions[2]));

      const result = await service.getSessionStats();

      expect(result.totalActiveSessions).toBe(3);
      expect(result.sessionsByUser).toEqual({ user1: 3 });
    });
  });

  describe('onModuleDestroy', () => {
    it('should call redis.quit()', async () => {
      await service.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});
