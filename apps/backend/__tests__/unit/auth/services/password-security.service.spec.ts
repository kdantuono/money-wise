import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PasswordSecurityService, HashingAlgorithm } from '@/auth/services/password-security.service';
import { PrismaUserService } from '@/core/database/prisma/services/user.service';
import { PrismaPasswordHistoryService } from '@/core/database/prisma/services/password-history.service';
import { PrismaAuditLogService } from '@/core/database/prisma/services/audit-log.service';
import { AuditEventType } from '../../../../generated/prisma';

describe('PasswordSecurityService', () => {
  let service: PasswordSecurityService;
  let prismaUserService: jest.Mocked<PrismaUserService>;
  let prismaPasswordHistoryService: jest.Mocked<PrismaPasswordHistoryService>;
  let prismaAuditLogService: jest.Mocked<PrismaAuditLogService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=1$hash',
    updatedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    familyId: 'family-123',
    role: 'MEMBER',
    status: 'ACTIVE',
    avatar: null,
    timezone: 'UTC',
    currency: 'USD',
    preferences: null,
    lastLoginAt: null,
    emailVerifiedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordSecurityService,
        {
          provide: PrismaUserService,
          useValue: {
            findOne: jest.fn(),
            updatePasswordHash: jest.fn(),
          },
        },
        {
          provide: PrismaPasswordHistoryService,
          useValue: {
            getRecentPasswords: jest.fn(),
            create: jest.fn(),
            deleteOldPasswords: jest.fn(),
          },
        },
        {
          provide: PrismaAuditLogService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PasswordSecurityService>(PasswordSecurityService);
    prismaUserService = module.get(PrismaUserService);
    prismaPasswordHistoryService = module.get(PrismaPasswordHistoryService);
    prismaAuditLogService = module.get(PrismaAuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password, HashingAlgorithm.BCRYPT);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should hash password with argon2', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password, HashingAlgorithm.ARGON2);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('should default to argon2', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    it('should verify bcrypt password correctly', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password, HashingAlgorithm.BCRYPT);

      const isValid = await service.verifyPassword(password, hash, HashingAlgorithm.BCRYPT);
      expect(isValid).toBe(true);

      const isInvalid = await service.verifyPassword('wrongPassword', hash, HashingAlgorithm.BCRYPT);
      expect(isInvalid).toBe(false);
    });

    it('should verify argon2 password correctly', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password, HashingAlgorithm.ARGON2);

      const isValid = await service.verifyPassword(password, hash, HashingAlgorithm.ARGON2);
      expect(isValid).toBe(true);

      const isInvalid = await service.verifyPassword('wrongPassword', hash, HashingAlgorithm.ARGON2);
      expect(isInvalid).toBe(false);
    });

    it('should auto-detect hashing algorithm', async () => {
      const password = 'testPassword123!';
      const argonHash = await service.hashPassword(password, HashingAlgorithm.ARGON2);
      const bcryptHash = await service.hashPassword(password, HashingAlgorithm.BCRYPT);

      const argonValid = await service.verifyPassword(password, argonHash);
      const bcryptValid = await service.verifyPassword(password, bcryptHash);

      expect(argonValid).toBe(true);
      expect(bcryptValid).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', async () => {
      const result = await service.validatePassword('MyVeryStr0ng!P@ssword2024');

      expect(result.isValid).toBe(true);
      expect(result.strengthResult.score).toBeGreaterThan(60);
    });

    it('should reject weak password', async () => {
      const result = await service.validatePassword('weak');

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should reject password shorter than minimum length', async () => {
      const result = await service.validatePassword('Short1!');

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password must be at least 12 characters long');
    });

    it('should reject common passwords', async () => {
      const result = await service.validatePassword('password');

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password is too common, please choose a more unique password');
    });
  });

  describe('isPasswordExpired', () => {
    it('should return false for recent password', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30);

      prismaUserService.findOne.mockResolvedValue({
        ...mockUser,
        updatedAt: recentDate,
      } as any);

      const isExpired = await service.isPasswordExpired('user-123');
      expect(isExpired).toBe(false);
    });

    it('should return true for old password', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      prismaUserService.findOne.mockResolvedValue({
        ...mockUser,
        updatedAt: oldDate,
      } as any);

      const isExpired = await service.isPasswordExpired('user-123');
      expect(isExpired).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const newPassword = 'NewSecure!P@ssw0rd123';

      prismaUserService.findOne.mockResolvedValue(mockUser as any);
      prismaPasswordHistoryService.getRecentPasswords.mockResolvedValue([]);
      prismaPasswordHistoryService.deleteOldPasswords.mockResolvedValue(undefined);
      prismaPasswordHistoryService.create.mockResolvedValue(undefined as any);
      prismaUserService.updatePasswordHash.mockResolvedValue(undefined);
      prismaAuditLogService.create.mockResolvedValue(undefined as any);

      const result = await service.changePassword('user-123', newPassword, {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result.success).toBe(true);
      expect(result.passwordExpiry).toBeDefined();
      expect(prismaUserService.updatePasswordHash).toHaveBeenCalledWith('user-123', expect.any(String));
      expect(prismaAuditLogService.create).toHaveBeenCalled();
    });

    it('should reject change when user not found', async () => {
      prismaUserService.findOne.mockResolvedValue(null);

      await expect(service.changePassword('invalid-id', 'NewP@ssw0rd123!'))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject weak password', async () => {
      prismaUserService.findOne.mockResolvedValue(mockUser as any);

      const result = await service.changePassword('user-123', 'weak');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getPasswordPolicy', () => {
    it('should return default password policy', async () => {
      const policy = await service.getPasswordPolicy();

      expect(policy).toBeDefined();
      expect(policy.minLength).toBe(12);
      expect(policy.maxLength).toBe(128);
      expect(policy.requireUppercase).toBe(true);
      expect(policy.requireLowercase).toBe(true);
      expect(policy.requireNumbers).toBe(true);
      expect(policy.requireSpecialChars).toBe(true);
      expect(policy.historyLength).toBe(5);
      expect(policy.expirationDays).toBe(90);
      expect(policy.warningDays).toBe(7);
    });
  });

  // TODO: Comprehensive test coverage to be added in P.3.4.9 (Integration Testing)
  // This is a minimal test suite to verify core functionality during migration
});
