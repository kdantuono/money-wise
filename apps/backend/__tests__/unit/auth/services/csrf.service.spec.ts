import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CsrfService } from '@/auth/services/csrf.service';

describe('CsrfService - Comprehensive Security Tests', () => {
  let service: CsrfService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsrfService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CSRF_SECRET') return 'test-csrf-secret-for-testing-purposes';
              if (key === 'SESSION_SECRET') return 'test-session-secret-fallback';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CsrfService>(CsrfService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should use CSRF_SECRET from config', () => {
      expect(configService.get).toHaveBeenCalledWith('CSRF_SECRET');
    });

    it('should fall back to SESSION_SECRET if CSRF_SECRET not available', async () => {
      // Create new service with missing CSRF_SECRET
      configService.get.mockImplementation((key: string) => {
        if (key === 'SESSION_SECRET') return 'fallback-secret';
        return undefined;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CsrfService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const newService = module.get<CsrfService>(CsrfService);
      expect(newService).toBeDefined();
    });
  });

  describe('Token Generation', () => {
    it('should generate a valid token', () => {
      const token = service.generateToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should generate unique tokens on each call', () => {
      const token1 = service.generateToken();
      const token2 = service.generateToken();

      expect(token1).not.toBe(token2);
    });

    it('should generate token with correct format (randomToken.timestamp.signature)', () => {
      const token = service.generateToken();
      const parts = token.split('.');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(64); // 32 bytes hex = 64 characters
      expect(parseInt(parts[1], 10)).toBeGreaterThan(0); // Valid timestamp
      expect(parts[2]).toHaveLength(64); // SHA-256 hex = 64 characters
    });

    it('should include current timestamp in token', () => {
      const before = Date.now();
      const token = service.generateToken();
      const after = Date.now();

      const timestamp = parseInt(token.split('.')[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Token Validation - Basic Checks', () => {
    it('should validate a freshly generated token', async () => {
      const token = service.generateToken();
      const isValid = await service.validateToken(token);

      expect(isValid).toBe(true);
    });

    it('should reject null token', async () => {
      const isValid = await service.validateToken(null as any);

      expect(isValid).toBe(false);
    });

    it('should reject undefined token', async () => {
      const isValid = await service.validateToken(undefined as any);

      expect(isValid).toBe(false);
    });

    it('should reject empty string token', async () => {
      const isValid = await service.validateToken('');

      expect(isValid).toBe(false);
    });

    it('should reject token with invalid format (missing parts)', async () => {
      const invalidToken = 'only.two.parts';
      const isValid = await service.validateToken(invalidToken);

      expect(isValid).toBe(false);
    });

    it('should reject token with too many parts', async () => {
      const invalidToken = 'one.two.three.four';
      const isValid = await service.validateToken(invalidToken);

      expect(isValid).toBe(false);
    });

    it('should reject token with non-numeric timestamp', async () => {
      const invalidToken = 'randomtoken.notanumber.signature';
      const isValid = await service.validateToken(invalidToken);

      expect(isValid).toBe(false);
    });
  });

  describe('SECURITY: Token Reuse Prevention (Single-Use Enforcement)', () => {
    it('should accept token on first use', async () => {
      const token = service.generateToken();

      const firstValidation = await service.validateToken(token);

      expect(firstValidation).toBe(true);
    });

    it('should REJECT token on second use (replay attack prevention)', async () => {
      const token = service.generateToken();

      // First use - should succeed
      await service.validateToken(token);

      // Second use - should FAIL (replay attack)
      const secondValidation = await service.validateToken(token);

      expect(secondValidation).toBe(false);
    });

    it('should REJECT token on multiple reuse attempts', async () => {
      const token = service.generateToken();

      // First use succeeds
      await service.validateToken(token);

      // Multiple subsequent uses should all fail
      const attempt2 = await service.validateToken(token);
      const attempt3 = await service.validateToken(token);
      const attempt4 = await service.validateToken(token);

      expect(attempt2).toBe(false);
      expect(attempt3).toBe(false);
      expect(attempt4).toBe(false);
    });

    it('should track used tokens independently', async () => {
      const token1 = service.generateToken();
      const token2 = service.generateToken();

      // Use token1
      await service.validateToken(token1);

      // token2 should still be valid (different token)
      const token2Valid = await service.validateToken(token2);

      expect(token2Valid).toBe(true);

      // token1 should now be invalid (already used)
      const token1Reuse = await service.validateToken(token1);
      expect(token1Reuse).toBe(false);
    });
  });

  describe('SECURITY: Timestamp Validation (Expiration)', () => {
    it('should reject expired tokens (> 1 hour old)', async () => {
      // Create token with old timestamp (2 hours ago)
      const oldTimestamp = Date.now() - (2 * 60 * 60 * 1000);
      const randomToken = 'a'.repeat(64);

      // Create signature using private method (access via any type)
      const signature = (service as any).createSignature(randomToken, oldTimestamp.toString());
      const expiredToken = `${randomToken}.${oldTimestamp}.${signature}`;

      const isValid = await service.validateToken(expiredToken);

      expect(isValid).toBe(false);
    });

    it('should accept token within 1 hour TTL', async () => {
      // Create token with recent timestamp (30 minutes ago)
      const recentTimestamp = Date.now() - (30 * 60 * 1000);
      const randomToken = 'b'.repeat(64);

      const signature = (service as any).createSignature(randomToken, recentTimestamp.toString());
      const validToken = `${randomToken}.${recentTimestamp}.${signature}`;

      const isValid = await service.validateToken(validToken);

      expect(isValid).toBe(true);
    });

    it('should reject token at exact expiration boundary (1 hour + 1ms)', async () => {
      // Create token exactly at expiration boundary
      const expirationTime = Date.now() - (60 * 60 * 1000 + 1);
      const randomToken = 'c'.repeat(64);

      const signature = (service as any).createSignature(randomToken, expirationTime.toString());
      const expiredToken = `${randomToken}.${expirationTime}.${signature}`;

      const isValid = await service.validateToken(expiredToken);

      expect(isValid).toBe(false);
    });

    it('should REJECT future-dated tokens (clock skew attack)', async () => {
      // Create token with timestamp 1 hour in the future
      const futureTimestamp = Date.now() + (60 * 60 * 1000);
      const randomToken = 'd'.repeat(64);

      const signature = (service as any).createSignature(randomToken, futureTimestamp.toString());
      const futureToken = `${randomToken}.${futureTimestamp}.${signature}`;

      const isValid = await service.validateToken(futureToken);

      expect(isValid).toBe(false);
    });

    it('should REJECT token from far future (10 years)', async () => {
      // Create token with timestamp 10 years in future
      const farFutureTimestamp = Date.now() + (10 * 365 * 24 * 60 * 60 * 1000);
      const randomToken = 'e'.repeat(64);

      const signature = (service as any).createSignature(randomToken, farFutureTimestamp.toString());
      const futureToken = `${randomToken}.${farFutureTimestamp}.${signature}`;

      const isValid = await service.validateToken(futureToken);

      expect(isValid).toBe(false);
    });
  });

  describe('SECURITY: Signature Tampering Detection', () => {
    it('should REJECT token with modified signature', async () => {
      const token = service.generateToken();
      const parts = token.split('.');

      // Tamper with signature
      const tamperedSignature = parts[2].substring(0, parts[2].length - 4) + 'FAKE';
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

      const isValid = await service.validateToken(tamperedToken);

      expect(isValid).toBe(false);
    });

    it('should REJECT token with modified random token component', async () => {
      const token = service.generateToken();
      const parts = token.split('.');

      // Tamper with random token
      const tamperedRandomToken = parts[0].substring(0, parts[0].length - 4) + 'FAKE';
      const tamperedToken = `${tamperedRandomToken}.${parts[1]}.${parts[2]}`;

      const isValid = await service.validateToken(tamperedToken);

      expect(isValid).toBe(false);
    });

    it('should REJECT token with modified timestamp', async () => {
      const token = service.generateToken();
      const parts = token.split('.');

      // Tamper with timestamp
      const tamperedTimestamp = (parseInt(parts[1], 10) + 1000).toString();
      const tamperedToken = `${parts[0]}.${tamperedTimestamp}.${parts[2]}`;

      const isValid = await service.validateToken(tamperedToken);

      expect(isValid).toBe(false);
    });

    it('should REJECT completely fabricated token', async () => {
      const fakeToken = 'fake.123456.signature';

      const isValid = await service.validateToken(fakeToken);

      expect(isValid).toBe(false);
    });
  });

  describe('SECURITY: Rate Limiting', () => {
    it('should allow first validation attempt', async () => {
      const token = service.generateToken();

      const isValid = await service.validateToken(token, 'client-123');

      expect(isValid).toBe(true);
    });

    it('should allow up to 10 validation attempts per client', async () => {
      const clientId = 'client-rate-limit-test';

      // Generate 10 different tokens (to avoid single-use rejection)
      for (let i = 0; i < 10; i++) {
        const token = service.generateToken();
        const isValid = await service.validateToken(token, clientId);
        expect(isValid).toBe(true);
      }
    });

    it('should BLOCK 11th validation attempt (rate limit exceeded)', async () => {
      const clientId = 'client-rate-limit-exceeded';

      // Use 10 valid tokens
      for (let i = 0; i < 10; i++) {
        const token = service.generateToken();
        await service.validateToken(token, clientId);
      }

      // 11th attempt should be rate limited
      const token11 = service.generateToken();
      const isValid = await service.validateToken(token11, clientId);

      expect(isValid).toBe(false);
    });

    it('should track rate limits independently per client', async () => {
      const client1 = 'client-1';
      const client2 = 'client-2';

      // Exhaust client1's rate limit
      for (let i = 0; i < 10; i++) {
        await service.validateToken(service.generateToken(), client1);
      }

      // Client2 should still have their rate limit available
      const token = service.generateToken();
      const isValid = await service.validateToken(token, client2);

      expect(isValid).toBe(true);
    });
  });

  describe('SECURITY: Memory Leak Prevention', () => {
    it('should cleanup used tokens cache when limit exceeded', async () => {
      // Generate and use 10,001 tokens to trigger cleanup
      // (maxUsedTokensCache = 10,000)
      for (let i = 0; i < 10001; i++) {
        const token = service.generateToken();
        await service.validateToken(token);
      }

      // Cache should have been cleaned up (verify via internal state)
      const usedTokensSize = (service as any).usedTokens.size;
      expect(usedTokensSize).toBeLessThan(10001);
      expect(usedTokensSize).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle token with special characters in signature', async () => {
      const token = service.generateToken();

      // Valid token should still work
      const isValid = await service.validateToken(token);

      expect(isValid).toBe(true);
    });

    it('should handle very long tokens gracefully', async () => {
      const veryLongToken = 'a'.repeat(10000) + '.123456.' + 'b'.repeat(10000);

      const isValid = await service.validateToken(veryLongToken);

      expect(isValid).toBe(false);
    });

    it('should handle tokens with only dots', async () => {
      const invalidToken = '...';

      const isValid = await service.validateToken(invalidToken);

      expect(isValid).toBe(false);
    });

    it('should handle token validation errors gracefully', async () => {
      const malformedToken = 'this-will-cause-error';

      // Should not throw, should return false
      const result = await service.validateToken(malformedToken);

      expect(result).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full lifecycle: generate → validate → reject reuse', async () => {
      // 1. Generate token
      const token = service.generateToken();
      expect(token).toBeDefined();

      // 2. Validate token (first use)
      const firstValidation = await service.validateToken(token);
      expect(firstValidation).toBe(true);

      // 3. Attempt reuse (should fail)
      const reuseAttempt = await service.validateToken(token);
      expect(reuseAttempt).toBe(false);
    });

    it('should handle concurrent validations correctly', async () => {
      const token1 = service.generateToken();
      const token2 = service.generateToken();

      // Validate both tokens concurrently
      const [result1, result2] = await Promise.all([
        service.validateToken(token1),
        service.validateToken(token2),
      ]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);

      // Both should now be marked as used
      const [reuse1, reuse2] = await Promise.all([
        service.validateToken(token1),
        service.validateToken(token2),
      ]);

      expect(reuse1).toBe(false);
      expect(reuse2).toBe(false);
    });
  });
});
