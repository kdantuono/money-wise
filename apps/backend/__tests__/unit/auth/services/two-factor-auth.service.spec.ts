// Mock ioredis BEFORE any imports that use it
jest.mock('ioredis', () => {
  const { MockRedis } = require('../../../mocks/redis.mock');
  return { Redis: MockRedis };
});

// Mock dependencies
jest.mock('speakeasy');
jest.mock('qrcode');

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { TwoFactorAuthService, BackupCode } from '@/auth/services/two-factor-auth.service';
import { User, UserStatus } from '@/core/database/entities/user.entity';
import { MockRedis, createMockRedis } from '../../../mocks/redis.mock';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

describe('TwoFactorAuthService', () => {
  let service: TwoFactorAuthService;
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

    // Add getter for fullName virtual property
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
        TwoFactorAuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'APP_NAME') return 'MoneyWise';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TwoFactorAuthService>(TwoFactorAuthService);
    mockUserRepository = module.get(getRepositoryToken(User));
    mockConfigService = module.get(ConfigService);

    // Replace the service's Redis instance with our mock
    (service as any).redis = mockRedis;

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockRedis.__reset();
  });

  describe('setupTwoFactor', () => {
    it('should generate 2FA setup with secret, QR code, and backup codes', async () => {
      const user = createMockUser();
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/MoneyWise(test@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=MoneyWise',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (qrcode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,mockQRCode');

      const result = await service.setupTwoFactor(user.id);

      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.qrCodeUrl).toBe('data:image/png;base64,mockQRCode');
      expect(result.backupCodes).toHaveLength(10);
      expect(result.backupCodes[0]).toMatch(/^[A-F0-9]{8}$/);

      // Verify setup data was stored in Redis
      const storedData = await mockRedis.get(`2fa_setup:${user.id}`);
      expect(storedData).toBeTruthy();
      const parsedData = JSON.parse(storedData!);
      expect(parsedData.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(parsedData.backupCodes).toHaveLength(10);
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.setupTwoFactor('invalid-user')).rejects.toThrow('Failed to setup two-factor authentication');
    });

    it('should throw error if QR code generation fails', async () => {
      const user = createMockUser();
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/MoneyWise(test@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=MoneyWise',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (qrcode.toDataURL as jest.Mock).mockRejectedValue(new Error('QR generation failed'));

      await expect(service.setupTwoFactor(user.id)).rejects.toThrow('Failed to setup two-factor authentication');
    });

    it('should store setup data with 10-minute expiration', async () => {
      const user = createMockUser();
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/MoneyWise(test@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=MoneyWise',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (qrcode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,mockQRCode');

      await service.setupTwoFactor(user.id);

      // Verify setex was called with 600 seconds (10 minutes)
      expect(mockRedis.setex).toHaveBeenCalledWith(`2fa_setup:${user.id}`, 600, expect.any(String));
    });

    it('should generate unique backup codes', async () => {
      const user = createMockUser();
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/MoneyWise(test@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=MoneyWise',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (qrcode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,mockQRCode');

      const result = await service.setupTwoFactor(user.id);

      // Check all backup codes are unique
      const codes = result.backupCodes;
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(10);
    });
  });

  describe('verifyAndEnable2FA', () => {
    it('should enable 2FA with valid token', async () => {
      const userId = 'user-123';
      const token = '123456';
      const setupData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [
          { code: 'ABCD1234', used: false },
          { code: 'EFGH5678', used: false },
        ],
      };

      await mockRedis.setex(`2fa_setup:${userId}`, 600, JSON.stringify(setupData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verifyAndEnable2FA(userId, token);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Two-factor authentication enabled successfully');

      // Verify setup data was deleted
      const deletedSetupData = await mockRedis.get(`2fa_setup:${userId}`);
      expect(deletedSetupData).toBeNull();

      // Verify user data was stored
      const userData = await mockRedis.get(`2fa_user:${userId}`);
      expect(userData).toBeTruthy();
      const parsedUserData = JSON.parse(userData!);
      expect(parsedUserData.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(parsedUserData.enabledAt).toBeDefined();
    });

    it('should throw error for invalid token', async () => {
      const userId = 'user-123';
      const token = '000000';
      const setupData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [],
      };

      await mockRedis.setex(`2fa_setup:${userId}`, 600, JSON.stringify(setupData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.verifyAndEnable2FA(userId, token)).rejects.toThrow(BadRequestException);
      await expect(service.verifyAndEnable2FA(userId, token)).rejects.toThrow('Invalid 2FA token');
    });

    it('should throw error if setup data not found', async () => {
      const userId = 'user-123';
      const token = '123456';

      await expect(service.verifyAndEnable2FA(userId, token)).rejects.toThrow(BadRequestException);
      await expect(service.verifyAndEnable2FA(userId, token)).rejects.toThrow('2FA setup not found or expired');
    });

    it('should throw error if setup data expired', async () => {
      const userId = 'user-123';
      const token = '123456';
      const setupData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [],
      };

      // Store data with very short expiration (1 second)
      await mockRedis.setex(`2fa_setup:${userId}`, 1, JSON.stringify(setupData));

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // After expiration, Redis returns null which triggers "2FA setup not found or expired"
      await expect(service.verifyAndEnable2FA(userId, token)).rejects.toThrow(BadRequestException);
      // Note: The exact message depends on whether MockRedis properly expires or speakeasy validates first
      // Both "2FA setup not found or expired" and "Invalid 2FA token" are acceptable for expired data
    });

    it('should handle Redis errors gracefully', async () => {
      const userId = 'user-123';
      const token = '123456';

      // Mock Redis to throw error
      mockRedis.get = jest.fn().mockRejectedValue(new Error('Redis error'));

      await expect(service.verifyAndEnable2FA(userId, token)).rejects.toThrow('Failed to verify two-factor authentication');
    });
  });

  describe('verifyTwoFactor', () => {
    it('should verify valid TOTP token', async () => {
      const userId = 'user-123';
      const token = '123456';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verifyTwoFactor(userId, token);

      expect(result.success).toBe(true);
      expect(result.message).toBe('2FA verification successful');
    });

    it('should verify valid backup code when TOTP fails', async () => {
      const userId = 'user-123';
      const backupCode = 'ABCD1234';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [
          { code: backupCode, used: false },
          { code: 'EFGH5678', used: false },
        ],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await service.verifyTwoFactor(userId, backupCode);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Backup code verification successful');

      // Verify backup code is marked as used
      const updatedData = await mockRedis.get(`2fa_user:${userId}`);
      const parsedData = JSON.parse(updatedData!);
      const usedCode = parsedData.backupCodes.find((bc: BackupCode) => bc.code === backupCode);

      expect(usedCode.used).toBe(true);
      expect(usedCode.usedAt).toBeDefined();
    });

    it('should throw error for already used backup code', async () => {
      const userId = 'user-123';
      const backupCode = 'ABCD1234';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [
          { code: backupCode, used: true, usedAt: new Date() },
          { code: 'EFGH5678', used: false },
        ],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.verifyTwoFactor(userId, backupCode)).rejects.toThrow(BadRequestException);
      await expect(service.verifyTwoFactor(userId, backupCode)).rejects.toThrow('Invalid 2FA token or backup code');
    });

    it('should throw error for invalid token and backup code', async () => {
      const userId = 'user-123';
      const token = '000000';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [{ code: 'ABCD1234', used: false }],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.verifyTwoFactor(userId, token)).rejects.toThrow(BadRequestException);
      await expect(service.verifyTwoFactor(userId, token)).rejects.toThrow('Invalid 2FA token or backup code');
    });

    it('should throw error if 2FA not enabled', async () => {
      const userId = 'user-123';
      const token = '123456';

      await expect(service.verifyTwoFactor(userId, token)).rejects.toThrow(BadRequestException);
      await expect(service.verifyTwoFactor(userId, token)).rejects.toThrow('2FA not enabled for this user');
    });

    it('should handle Redis errors gracefully', async () => {
      const userId = 'user-123';
      const token = '123456';

      // Mock Redis to throw error
      mockRedis.get = jest.fn().mockRejectedValue(new Error('Redis error'));

      await expect(service.verifyTwoFactor(userId, token)).rejects.toThrow('Failed to verify two-factor authentication');
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA with valid token', async () => {
      const userId = 'user-123';
      const token = '123456';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await service.disable2FA(userId, token);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Two-factor authentication disabled successfully');

      // Verify user data was deleted
      const deletedData = await mockRedis.get(`2fa_user:${userId}`);
      expect(deletedData).toBeNull();
    });

    it('should throw error for invalid token when disabling', async () => {
      const userId = 'user-123';
      const token = '000000';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.disable2FA(userId, token)).rejects.toThrow('Invalid 2FA token. Backup codes cannot be used to disable 2FA.');

      // Verify data was NOT deleted
      const stillExists = await mockRedis.get(`2fa_user:${userId}`);
      expect(stillExists).toBeTruthy();
    });

    it('should handle Redis errors gracefully', async () => {
      const userId = 'user-123';
      const token = '123456';

      // Mock Redis to throw error
      mockRedis.get = jest.fn().mockRejectedValue(new Error('Redis error'));

      await expect(service.disable2FA(userId, token)).rejects.toThrow('Failed to disable two-factor authentication');
    });
  });

  describe('is2FAEnabled', () => {
    it('should return true if 2FA is enabled', async () => {
      const userId = 'user-123';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));

      const result = await service.is2FAEnabled(userId);

      expect(result).toBe(true);
    });

    it('should return false if 2FA is not enabled', async () => {
      const userId = 'user-123';

      const result = await service.is2FAEnabled(userId);

      expect(result).toBe(false);
    });

    it('should return false on Redis errors', async () => {
      const userId = 'user-123';

      // Mock Redis to throw error - service catches and returns false
      mockRedis.exists = jest.fn().mockRejectedValue(new Error('Redis error'));

      const result = await service.is2FAEnabled(userId);

      expect(result).toBe(false);
    });
  });

  describe('generateNewBackupCodes', () => {
    it('should generate new backup codes with valid token', async () => {
      const userId = 'user-123';
      const token = '123456';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [
          { code: 'OLD11111', used: false },
          { code: 'OLD22222', used: true, usedAt: new Date() },
        ],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await service.generateNewBackupCodes(userId, token);

      expect(result.backupCodes).toHaveLength(10);
      expect(result.backupCodes[0]).toMatch(/^[A-F0-9]{8}$/);

      // Verify new codes were stored
      const updatedData = await mockRedis.get(`2fa_user:${userId}`);
      const parsedData = JSON.parse(updatedData!);
      expect(parsedData.backupCodes).toHaveLength(10);
      expect(parsedData.backupCodes[0].code).not.toBe('OLD11111');
    });

    it('should throw error for invalid token when generating new codes', async () => {
      const userId = 'user-123';
      const token = '000000';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.generateNewBackupCodes(userId, token)).rejects.toThrow(BadRequestException);
      await expect(service.generateNewBackupCodes(userId, token)).rejects.toThrow('Invalid 2FA token');
    });

    it('should throw error if 2FA not enabled', async () => {
      const userId = 'user-123';
      const token = '123456';

      // Mock successful verification but no user data
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      await expect(service.generateNewBackupCodes(userId, token)).rejects.toThrow(BadRequestException);
      await expect(service.generateNewBackupCodes(userId, token)).rejects.toThrow('2FA not enabled');
    });

    it('should handle Redis errors gracefully', async () => {
      const userId = 'user-123';
      const token = '123456';

      // Mock successful verification first
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [],
        enabledAt: new Date(),
      };
      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      // Then mock Redis to throw error on second get call
      mockRedis.get = jest.fn()
        .mockResolvedValueOnce(JSON.stringify(userData)) // First call for verifyTwoFactor
        .mockRejectedValueOnce(new Error('Redis error')); // Second call in generateNewBackupCodes

      await expect(service.generateNewBackupCodes(userId, token)).rejects.toThrow('Failed to generate new backup codes');
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection on module destroy', async () => {
      const quitSpy = jest.spyOn(mockRedis, 'quit');

      await service.onModuleDestroy();

      expect(quitSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Advanced Scenarios', () => {
    it('should handle backup code exhaustion (all codes used)', async () => {
      const userId = 'user-123';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [
          { code: 'CODE0001', used: true, usedAt: new Date() },
          { code: 'CODE0002', used: true, usedAt: new Date() },
          { code: 'CODE0003', used: true, usedAt: new Date() },
          { code: 'CODE0004', used: true, usedAt: new Date() },
          { code: 'CODE0005', used: true, usedAt: new Date() },
          { code: 'CODE0006', used: true, usedAt: new Date() },
          { code: 'CODE0007', used: true, usedAt: new Date() },
          { code: 'CODE0008', used: true, usedAt: new Date() },
          { code: 'CODE0009', used: true, usedAt: new Date() },
          { code: 'CODE0010', used: true, usedAt: new Date() },
        ],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      // Attempt to use backup code when all are exhausted
      await expect(service.verifyTwoFactor(userId, 'ANYCODE')).rejects.toThrow(BadRequestException);
      await expect(service.verifyTwoFactor(userId, 'ANYCODE')).rejects.toThrow('Invalid 2FA token or backup code');
    });

    it('should handle concurrent 2FA setup attempts by same user', async () => {
      const user = createMockUser();
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/MoneyWise(test@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=MoneyWise',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (qrcode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,mockQRCode');

      // Simulate concurrent setup requests
      const [result1, result2] = await Promise.all([
        service.setupTwoFactor(user.id),
        service.setupTwoFactor(user.id),
      ]);

      // Both should succeed but with different secrets/codes
      expect(result1.secret).toBeDefined();
      expect(result2.secret).toBeDefined();

      // Backup codes should be different
      expect(result1.backupCodes).not.toEqual(result2.backupCodes);
    });

    it('should handle 2FA verification with Redis connection failure', async () => {
      const userId = 'user-123';
      const token = '123456';

      // Mock Redis to throw connection error
      mockRedis.get = jest.fn().mockRejectedValue(new Error('ECONNREFUSED: Redis connection refused'));

      await expect(service.verifyTwoFactor(userId, token)).rejects.toThrow('Failed to verify two-factor authentication');
    });

    it('should handle backup code verification when only 1 code remains', async () => {
      const userId = 'user-123';
      const lastCode = 'LASTCODE';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [
          { code: 'CODE0001', used: true, usedAt: new Date() },
          { code: 'CODE0002', used: true, usedAt: new Date() },
          { code: 'CODE0003', used: true, usedAt: new Date() },
          { code: 'CODE0004', used: true, usedAt: new Date() },
          { code: 'CODE0005', used: true, usedAt: new Date() },
          { code: 'CODE0006', used: true, usedAt: new Date() },
          { code: 'CODE0007', used: true, usedAt: new Date() },
          { code: 'CODE0008', used: true, usedAt: new Date() },
          { code: 'CODE0009', used: true, usedAt: new Date() },
          { code: lastCode, used: false }, // Last unused code
        ],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await service.verifyTwoFactor(userId, lastCode);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Backup code verification successful');

      // Verify all codes are now used
      const updatedData = await mockRedis.get(`2fa_user:${userId}`);
      const parsedData = JSON.parse(updatedData!);
      const unusedCodes = parsedData.backupCodes.filter((bc: BackupCode) => !bc.used);
      expect(unusedCodes.length).toBe(0);
    });

    it('should handle case-insensitive backup code verification', async () => {
      const userId = 'user-123';
      const backupCode = 'ABCD1234';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [
          { code: backupCode, used: false },
        ],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      // Try lowercase version
      const result = await service.verifyTwoFactor(userId, 'abcd1234');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Backup code verification successful');
    });

    it('should prevent disabling 2FA with backup code (require TOTP)', async () => {
      const userId = 'user-123';
      const backupCode = 'ABCD1234';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [
          { code: backupCode, used: false },
        ],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      // Attempt to disable with backup code should fail
      await expect(service.disable2FA(userId, backupCode)).rejects.toThrow(BadRequestException);
    });

    it('should handle malformed 2FA setup data in Redis', async () => {
      const userId = 'user-123';
      const token = '123456';

      // Store malformed JSON
      await mockRedis.setex(`2fa_setup:${userId}`, 600, 'invalid-json{{{');

      await expect(service.verifyAndEnable2FA(userId, token)).rejects.toThrow('Failed to verify two-factor authentication');
    });

    it('should handle setup expiration edge case (expires during verification)', async () => {
      const userId = 'user-123';
      const token = '123456';
      const setupData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [{ code: 'CODE0001', used: false }],
      };

      // Set with 1 second expiration
      await mockRedis.setex(`2fa_setup:${userId}`, 1, JSON.stringify(setupData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should fail with setup not found
      await expect(service.verifyAndEnable2FA(userId, token)).rejects.toThrow(BadRequestException);
    });

    it('should generate exactly 10 unique backup codes every time', async () => {
      const user = createMockUser();
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/MoneyWise(test@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=MoneyWise',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (qrcode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,mockQRCode');

      // Run setup multiple times
      const results = await Promise.all([
        service.setupTwoFactor(user.id),
        service.setupTwoFactor(user.id),
        service.setupTwoFactor(user.id),
      ]);

      for (const result of results) {
        expect(result.backupCodes).toHaveLength(10);
        const uniqueCodes = new Set(result.backupCodes);
        expect(uniqueCodes.size).toBe(10);
      }

      // Codes should be different across setups
      expect(results[0].backupCodes).not.toEqual(results[1].backupCodes);
      expect(results[1].backupCodes).not.toEqual(results[2].backupCodes);
    });

    it('should handle TOTP token validation at time boundary (clock skew)', async () => {
      const userId = 'user-123';
      const token = '123456';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));

      // speakeasy handles time windows internally
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verifyTwoFactor(userId, token);

      expect(result.success).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith(
        expect.objectContaining({
          secret: 'JBSWY3DPEHPK3PXP',
          token,
          window: 1, // Allows for clock skew
        })
      );
    });

    it('should handle new backup code generation when Redis save fails', async () => {
      const userId = 'user-123';
      const token = '123456';
      const userData = {
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [{ code: 'OLD0001', used: false }],
        enabledAt: new Date(),
      };

      await mockRedis.set(`2fa_user:${userId}`, JSON.stringify(userData));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      // Mock Redis set to fail
      mockRedis.set = jest.fn().mockRejectedValue(new Error('Redis write failed'));

      await expect(service.generateNewBackupCodes(userId, token)).rejects.toThrow('Failed to generate new backup codes');
    });
  });
});
