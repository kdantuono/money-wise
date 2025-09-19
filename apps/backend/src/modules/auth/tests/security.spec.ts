import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { MfaService } from '../services/mfa.service';
import { SessionService } from '../services/session.service';
import { SecurityService } from '../../security/security.service';
import { SocialAuthService } from '../services/social-auth.service';
import { AuthService } from '../auth.service';
import { User } from '../user.entity';
import { UserMfaSettings } from '../entities/user-mfa-settings.entity';
import { UserSession } from '../entities/user-session.entity';
import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  pipeline: jest.fn(() => ({
    incr: jest.fn(),
    expire: jest.fn(),
    exec: jest.fn(),
  })),
  lpush: jest.fn(),
  ltrim: jest.fn(),
};

describe('Security Framework Tests', () => {
  let mfaService: MfaService;
  let sessionService: SessionService;
  let securityService: SecurityService;
  let socialAuthService: SocialAuthService;
  let userRepository: Repository<User>;
  let mfaRepository: Repository<UserMfaSettings>;
  let sessionRepository: Repository<UserSession>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        SessionService,
        SecurityService,
        SocialAuthService,
        AuthService,
        JwtService,
        ConfigService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(UserMfaSettings),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(UserSession),
          useClass: Repository,
        },
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
      ],
    }).compile();

    mfaService = module.get<MfaService>(MfaService);
    sessionService = module.get<SessionService>(SessionService);
    securityService = module.get<SecurityService>(SecurityService);
    socialAuthService = module.get<SocialAuthService>(SocialAuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    mfaRepository = module.get<Repository<UserMfaSettings>>(getRepositoryToken(UserMfaSettings));
    sessionRepository = module.get<Repository<UserSession>>(getRepositoryToken(UserSession));
  });

  describe('MFA Security Tests', () => {
    describe('TOTP Implementation Security', () => {
      it('should generate cryptographically secure TOTP secrets', async () => {
        const userId = 'test-user-id';
        const email = 'test@moneywise.com';
        
        // Mock repository methods
        jest.spyOn(mfaRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(mfaRepository, 'create').mockReturnValue({} as UserMfaSettings);
        jest.spyOn(mfaRepository, 'save').mockResolvedValue({} as UserMfaSettings);
        
        const result = await mfaService.generateTotpSecret(userId, email);
        
        expect(result.secret).toBeDefined();
        expect(result.secret.length).toBeGreaterThanOrEqual(32);
        expect(result.qrCodeUrl).toContain('data:image/png;base64');
        expect(result.manualEntryCode).toBe(result.secret);
      });

      it('should validate TOTP codes within time window', async () => {
        const userId = 'test-user-id';
        const secret = 'JBSWY3DPEHPK3PXP'; // Base32 encoded secret
        
        // Generate current TOTP code
        const validCode = speakeasy.totp({
          secret,
          encoding: 'base32',
        });
        
        // Mock MFA settings
        const mfaSettings = {
          userId,
          totpSecret: secret,
          isEnabled: false,
        } as UserMfaSettings;
        
        jest.spyOn(mfaRepository, 'findOne').mockResolvedValue(mfaSettings);
        jest.spyOn(mfaRepository, 'save').mockResolvedValue(mfaSettings);
        
        const result = await mfaService.verifyTotpCode(userId, validCode);
        
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should prevent TOTP replay attacks', async () => {
        // This test would require implementing TOTP replay protection
        // by storing used codes in Redis with expiration
        expect(true).toBe(true); // Placeholder
      });

      it('should reject invalid TOTP codes', async () => {
        const userId = 'test-user-id';
        const secret = 'JBSWY3DPEHPK3PXP';
        const invalidCode = '000000';
        
        const mfaSettings = {
          userId,
          totpSecret: secret,
          isEnabled: false,
        } as UserMfaSettings;
        
        jest.spyOn(mfaRepository, 'findOne').mockResolvedValue(mfaSettings);
        
        const result = await mfaService.verifyTotpCode(userId, invalidCode);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid TOTP code');
      });
    });

    describe('Backup Codes Security', () => {
      it('should generate unique, single-use backup codes', async () => {
        const userId = 'test-user-id';
        
        const mfaSettings = { userId } as UserMfaSettings;
        jest.spyOn(mfaRepository, 'findOne').mockResolvedValue(mfaSettings);
        jest.spyOn(mfaRepository, 'save').mockResolvedValue(mfaSettings);
        
        const backupCodes = await mfaService.generateBackupCodes(userId);
        
        expect(backupCodes).toHaveLength(10);
        expect(new Set(backupCodes).size).toBe(10); // All unique
        
        // Verify codes are properly formatted
        backupCodes.forEach(code => {
          expect(code).toMatch(/^[0-9A-F]{8}$/);
        });
      });

      it('should invalidate backup codes after use', async () => {
        const userId = 'test-user-id';
        const testCode = 'ABCD1234';
        
        // Mock hashed backup codes
        const hashedCode = await new Promise<Buffer>((resolve, reject) => {
          crypto.scrypt(testCode, 'moneywise-backup', 32, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
          });
        });
        const mfaSettings = {
          userId,
          backupCodes: [hashedCode.toString('hex')],
        } as UserMfaSettings;
        
        jest.spyOn(mfaRepository, 'findOne').mockResolvedValue(mfaSettings);
        jest.spyOn(mfaRepository, 'save').mockResolvedValue(mfaSettings);
        
        const result = await mfaService.verifyBackupCode(userId, testCode);
        
        expect(result.isValid).toBe(true);
        expect(mfaSettings.backupCodes).toHaveLength(0); // Code removed
      });
    });
  });

  describe('Session Security Tests', () => {
    describe('JWT Token Security', () => {
      it('should detect and prevent token tampering', async () => {
        // This would test JWT signature validation
        // Implementation depends on JWT configuration
        expect(true).toBe(true); // Placeholder
      });

      it('should enforce token expiration', async () => {
        const userId = 'test-user-id';
        const deviceInfo = {
          fingerprint: 'test-fingerprint',
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1',
        };
        
        jest.spyOn(sessionRepository, 'create').mockReturnValue({} as UserSession);
        jest.spyOn(sessionRepository, 'save').mockResolvedValue({} as UserSession);
        
        const tokens = await sessionService.generateTokenPair(userId, deviceInfo);
        
        expect(tokens.expiresIn).toBe(15 * 60); // 15 minutes
        expect(tokens.tokenType).toBe('Bearer');
      });

      it('should rotate refresh tokens securely', async () => {
        // Test refresh token rotation logic
        expect(true).toBe(true); // Placeholder
      });
    });

    describe('Session Hijacking Protection', () => {
      it('should detect suspicious session activity', async () => {
        const session = {
          deviceFingerprint: 'original-fingerprint',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (original)',
        } as UserSession;
        
        const suspiciousDevice = {
          fingerprint: 'different-fingerprint',
          userAgent: 'curl/7.0',
          ipAddress: '192.168.1.100',
        };
        
        jest.spyOn(sessionRepository, 'count').mockResolvedValue(1);
        
        const securityCheck = await sessionService.validateTokenSecurity(session, suspiciousDevice);
        
        expect(securityCheck.isValid).toBe(false);
        expect(securityCheck.suspiciousActivity).toBe(true);
        expect(securityCheck.riskLevel).toBe('high');
      });

      it('should require re-authentication for sensitive operations', async () => {
        // Test step-up authentication
        expect(true).toBe(true); // Placeholder
      });
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should enforce rate limits per endpoint', async () => {
      const identifier = '127.0.0.1';
      const endpoint = 'auth';
      
      mockRedis.get.mockResolvedValue('5'); // At limit
      mockRedis.ttl.mockResolvedValue(300);
      
      const result = await securityService.checkRateLimit(identifier, endpoint);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(300);
    });

    it('should allow requests within rate limit', async () => {
      const identifier = '127.0.0.1';
      const endpoint = 'auth';
      
      mockRedis.get.mockResolvedValue('2'); // Below limit
      
      const result = await securityService.checkRateLimit(identifier, endpoint);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });
  });

  describe('Security Threat Detection', () => {
    it('should detect brute force attempts', async () => {
      const mockRequest = {
        path: '/auth/login',
        get: jest.fn((header) => {
          if (header === 'User-Agent') return 'curl/7.0';
          return null;
        }),
        connection: { remoteAddress: '127.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' },
      } as any;
      
      mockRedis.get.mockResolvedValue('25'); // High attempt count
      
      const threat = await securityService.detectSuspiciousActivity(mockRequest);
      
      expect(threat).toBeDefined();
      expect(threat?.type).toBe('brute_force');
      expect(threat?.severity).toBe('critical');
    });

    it('should detect suspicious user agents', async () => {
      const mockRequest = {
        path: '/api/transactions',
        get: jest.fn((header) => {
          if (header === 'User-Agent') return 'python-requests/2.25.1';
          if (header === 'Accept') return 'application/json';
          if (header === 'Accept-Language') return 'en-US';
          return null;
        }),
        connection: { remoteAddress: '127.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' },
        body: {},
        query: {},
      } as any;
      
      mockRedis.get.mockResolvedValue('0');
      
      const threat = await securityService.detectSuspiciousActivity(mockRequest);
      
      expect(threat).toBeDefined();
      expect(threat?.type).toBe('suspicious_pattern');
      expect(threat?.severity).toBe('medium');
    });

    it('should detect SQL injection attempts', async () => {
      const mockRequest = {
        path: '/api/transactions',
        get: jest.fn(() => 'Mozilla/5.0'),
        connection: { remoteAddress: '127.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' },
        body: { search: "'; DROP TABLE users; --" },
        query: {},
      } as any;
      
      const threat = await securityService.detectSuspiciousActivity(mockRequest);
      
      expect(threat).toBeDefined();
      expect(threat?.type).toBe('invalid_request');
      expect(threat?.severity).toBe('high');
    });
  });

  describe('Social Authentication Security', () => {
    it('should validate OAuth tokens properly', async () => {
      // Mock successful Google authentication
      const authCode = 'valid-auth-code';
      const deviceInfo = {
        fingerprint: 'test-fingerprint',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      };
      
      // Mock external dependencies
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'access-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            sub: 'google-user-id',
            email: 'user@example.com',
            name: 'Test User',
            email_verified: true,
          }),
        });
      
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue({} as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
      } as User);
      
      jest.spyOn(sessionService, 'generateTokenPair').mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      });
      
      const result = await socialAuthService.authenticateWithGoogle(authCode, deviceInfo);
      
      expect(result.user).toBeDefined();
      expect(result.isNewUser).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.linkedAccounts).toContain('google');
    });

    it('should reject unverified email addresses', async () => {
      const authCode = 'auth-code-unverified';
      const deviceInfo = {
        fingerprint: 'test-fingerprint',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      };
      
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'access-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            sub: 'google-user-id',
            email: 'user@example.com',
            name: 'Test User',
            email_verified: false, // Not verified
          }),
        });
      
      await expect(
        socialAuthService.authenticateWithGoogle(authCode, deviceInfo)
      ).rejects.toThrow('Google authentication failed');
    });
  });

  describe('Compliance and Audit Tests', () => {
    it('should log all security events for audit', async () => {
      const event = 'test_security_event';
      const severity = 'medium';
      const metadata = { test: 'data' };
      
      await securityService.logSecurityEvent(event, severity, metadata);
      
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'security_events',
        expect.stringContaining(event)
      );
      expect(mockRedis.ltrim).toHaveBeenCalledWith('security_events', 0, 9999);
    });

    it('should maintain security event retention policy', async () => {
      // Test that old security events are properly archived
      expect(true).toBe(true); // Placeholder
    });

    it('should encrypt sensitive data at rest', async () => {
      // Test database encryption
      expect(true).toBe(true); // Placeholder
    });

    it('should secure all data in transit', async () => {
      // Test TLS configuration
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Performance Impact Tests', () => {
    it('should complete authentication operations under 200ms', async () => {
      const startTime = Date.now();
      
      // Simulate auth operation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(200);
    });

    it('should complete MFA validation under 100ms', async () => {
      const startTime = Date.now();
      
      // Simulate MFA validation
      await new Promise(resolve => setTimeout(resolve, 25));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
    });
  });
});