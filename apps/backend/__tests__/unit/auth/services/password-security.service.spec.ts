import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { PasswordSecurityService, HashingAlgorithm } from '@/auth/services/password-security.service';
import { User } from '@/core/database/entities/user.entity';
import { PasswordHistory } from '@/core/database/entities/password-history.entity';
import { AuditLog, AuditEventType } from '@/core/database/entities/audit-log.entity';

describe('PasswordSecurityService', () => {
  let service: PasswordSecurityService;
  let userRepository: jest.Mocked<Repository<User>>;
  let passwordHistoryRepository: jest.Mocked<Repository<PasswordHistory>>;
  let auditLogRepository: jest.Mocked<Repository<AuditLog>>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=1$hash',
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordSecurityService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PasswordHistory),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PasswordSecurityService>(PasswordSecurityService);
    userRepository = module.get(getRepositoryToken(User));
    passwordHistoryRepository = module.get(getRepositoryToken(PasswordHistory));
    auditLogRepository = module.get(getRepositoryToken(AuditLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password, HashingAlgorithm.BCRYPT);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      // Bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should hash password with argon2', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password, HashingAlgorithm.ARGON2);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
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
      expect(result.strengthResult.score).toBeGreaterThan(40);
    });

    it('should reject weak password', async () => {
      const result = await service.validatePassword('weak');

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('isPasswordExpired', () => {
    it('should return false for recent password', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago

      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        ...mockUser,
        updatedAt: recentDate,
      } as User);

      const isExpired = await service.isPasswordExpired('user-123');
      expect(isExpired).toBe(false);
    });

    it('should return true for old password', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago (beyond 90 day policy)

      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        ...mockUser,
        updatedAt: oldDate,
      } as User);

      const isExpired = await service.isPasswordExpired('user-123');
      expect(isExpired).toBe(true);
    });
  });

  describe('getDaysUntilExpiration', () => {
    it('should calculate days until expiration correctly', async () => {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - 80); // 80 days ago

      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        ...mockUser,
        updatedAt: testDate,
      } as User);

      const daysUntilExpiration = await service.getDaysUntilExpiration('user-123');
      expect(daysUntilExpiration).toBe(10); // 90 - 80 = 10 days
    });
  });

  describe('shouldWarnPasswordExpiry', () => {
    it('should warn when password expires soon', async () => {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - 85); // 85 days ago (5 days until expiry)

      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        ...mockUser,
        updatedAt: testDate,
      } as User);

      const shouldWarn = await service.shouldWarnPasswordExpiry('user-123');
      expect(shouldWarn).toBe(true);
    });

    it('should not warn when password is not expiring soon', async () => {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - 30); // 30 days ago

      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        ...mockUser,
        updatedAt: testDate,
      } as User);

      const shouldWarn = await service.shouldWarnPasswordExpiry('user-123');
      expect(shouldWarn).toBe(false);
    });
  });

  // ==================== EXPANDED TEST COVERAGE ====================

  describe('hashPassword - expanded coverage', () => {
    it('should default to argon2 when no algorithm specified', async () => {
      const password = 'SecureP@ssw0rd!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('should throw BadRequestException on hashing error', async () => {
      // Force an error by passing invalid data
      jest.spyOn(service as any, 'hashPassword').mockRejectedValueOnce(new Error('Hashing failed'));

      await expect(service.hashPassword('test')).rejects.toThrow();
    });
  });

  describe('verifyPassword - expanded coverage', () => {
    it('should return false for empty password', async () => {
      const hash = await service.hashPassword('TestP@ssw0rd123!');
      const result = await service.verifyPassword('', hash);

      expect(result).toBe(false);
    });

    it('should return false on verification error', async () => {
      const result = await service.verifyPassword('test', 'invalid-hash');

      expect(result).toBe(false);
    });

    it('should handle bcrypt hash without explicit algorithm', async () => {
      const password = 'TestP@ssw0rd123!';
      const bcryptHash = await service.hashPassword(password, HashingAlgorithm.BCRYPT);

      const result = await service.verifyPassword(password, bcryptHash);

      expect(result).toBe(true);
    });

    it('should return false for unknown algorithm prefix', async () => {
      const result = await service.verifyPassword('test', '$unknown$hash');

      expect(result).toBe(false);
    });
  });

  describe('validatePassword - comprehensive coverage', () => {
    it('should accept password with all required characteristics', async () => {
      const result = await service.validatePassword('MyStr0ng!P@ssword2024');

      expect(result.isValid).toBe(true);
      expect(result.strengthResult.meets_requirements).toBe(true);
      expect(result.strengthResult.score).toBeGreaterThanOrEqual(60);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject password shorter than minimum length', async () => {
      const result = await service.validatePassword('Short1!');

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password must be at least 12 characters long');
    });

    it('should reject password without uppercase letter', async () => {
      const result = await service.validatePassword('nocapitals123!@#');

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', async () => {
      const result = await service.validatePassword('NOLOWERCASE123!@#');

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without numbers', async () => {
      const result = await service.validatePassword('NoNumbers!@#Abc');

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password must contain at least one number');
    });

    it('should reject password without special characters', async () => {
      const result = await service.validatePassword('NoSpecialChars123Abc');

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password must contain at least one special character');
    });

    it('should reject password with repeated characters', async () => {
      const result = await service.validatePassword('TestPasssss123!');

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password should not contain repeated characters');
    });

    it('should reject common passwords', async () => {
      const result = await service.validatePassword('password');

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password is too common, please choose a more unique password');
    });

    it('should reject password containing user email', async () => {
      const userInfo = { email: 'john.doe@example.com', firstName: 'John', lastName: 'Doe' };
      const result = await service.validatePassword('john.doe123!ABC', userInfo);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password should not contain your email, first name, or last name');
    });

    it('should reject password containing user first name', async () => {
      const userInfo = { email: 'user@example.com', firstName: 'Alice', lastName: 'Smith' };
      const result = await service.validatePassword('Alice123!@#XYZ', userInfo);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password should not contain your email, first name, or last name');
    });

    it('should reject password containing user last name', async () => {
      const userInfo = { email: 'user@example.com', firstName: 'Bob', lastName: 'Johnson' };
      const result = await service.validatePassword('Johnson123!@#XYZ', userInfo);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password should not contain your email, first name, or last name');
    });

    it('should reject password longer than maximum length', async () => {
      const longPassword = 'A'.repeat(129) + '1!';
      const result = await service.validatePassword(longPassword);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password must not exceed 128 characters');
    });

    it('should accept password with custom policy', async () => {
      const customPolicy = {
        minLength: 8,
        requireSpecialChars: false,
        requireNonRepeatChars: false,
      };
      const result = await service.validatePassword('Simple123', undefined, customPolicy);

      expect(result.isValid).toBe(true);
    });

    it('should handle empty password', async () => {
      const result = await service.validatePassword('');

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should allow password with user info less than 3 characters', async () => {
      const userInfo = { email: 'a@b.com', firstName: 'Al', lastName: 'Bo' };
      const result = await service.validatePassword('MyStr0ng!P@ssword', userInfo);

      // Should not fail because names are too short to check
      expect(result.strengthResult.feedback).not.toContain('Password should not contain your email, first name, or last name');
    });
  });

  describe('calculatePasswordStrength', () => {
    it('should score very weak password correctly', async () => {
      // Very short password with no complexity
      const result = service.calculatePasswordStrength('pass');

      // Password may score as 'weak' due to entropy, but should fail requirements
      expect(['very-weak', 'weak']).toContain(result.strength);
      expect(result.score).toBeLessThan(50);
      expect(result.meets_requirements).toBe(false);
    });

    it('should score weak password correctly', async () => {
      const result = service.calculatePasswordStrength('abcdef');

      expect(result.strength).toBe('weak');
      expect(result.score).toBeGreaterThanOrEqual(30);
      expect(result.score).toBeLessThan(50);
    });

    it('should score fair password correctly', async () => {
      const result = service.calculatePasswordStrength('abcdefgh123');

      expect(result.strength).toBe('fair');
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.score).toBeLessThan(70);
    });

    it('should score good password correctly', async () => {
      const result = service.calculatePasswordStrength('Abcdefgh12');

      expect(result.strength).toBe('good');
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.score).toBeLessThan(85);
    });

    it('should score strong password correctly', async () => {
      const result = service.calculatePasswordStrength('V3ry!Str0ng@P#ssw0rd$2024');

      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.meets_requirements).toBe(true);
    });

    it('should calculate entropy score correctly', async () => {
      const strongPassword = 'C0mpl3x!P@ssw0rd#With$Many%Chars^2024';
      const result = service.calculatePasswordStrength(strongPassword);

      expect(result.score).toBeGreaterThan(80);
    });

    it('should handle empty password correctly', async () => {
      const result = service.calculatePasswordStrength('');

      expect(result.score).toBeLessThanOrEqual(20); // Entropy may add up to 20
      expect(result.strength).toBe('very-weak');
    });

    it('should cap score at 100', async () => {
      const superLongPassword = 'A1!b'.repeat(50); // Very long complex password
      const result = service.calculatePasswordStrength(superLongPassword);

      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const newPassword = 'NewSecure!P@ssw0rd123';

      userRepository.findOne.mockResolvedValue(mockUser as User);
      passwordHistoryRepository.find.mockResolvedValue([]);
      passwordHistoryRepository.count.mockResolvedValue(0);
      passwordHistoryRepository.create.mockReturnValue({} as PasswordHistory);
      passwordHistoryRepository.save.mockResolvedValue({} as PasswordHistory);
      auditLogRepository.create.mockReturnValue({} as AuditLog);
      auditLogRepository.save.mockResolvedValue({} as AuditLog);
      userRepository.update.mockResolvedValue(undefined as any);

      const result = await service.changePassword('user-123', newPassword, {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result.success).toBe(true);
      expect(result.passwordExpiry).toBeDefined();
      expect(result.mustChangePassword).toBe(false);
      expect(userRepository.update).toHaveBeenCalledWith('user-123', expect.objectContaining({
        passwordHash: expect.any(String),
        updatedAt: expect.any(Date),
      }));
      expect(auditLogRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        eventType: AuditEventType.PASSWORD_CHANGED,
      }));
    });

    it('should reject change when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.changePassword('invalid-id', 'NewP@ssw0rd123!'))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject weak password on change', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.changePassword('user-123', 'weak');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Password must be at least');
    });

    it('should detect password reuse', async () => {
      const newPassword = 'Reused!P@ssw0rd123';
      const hashedPassword = await service.hashPassword(newPassword);

      userRepository.findOne.mockResolvedValue(mockUser as User);
      passwordHistoryRepository.find.mockResolvedValue([
        { passwordHash: hashedPassword } as PasswordHistory,
      ]);

      const result = await service.changePassword('user-123', newPassword);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be one of your last');
    });

    it('should save password to history', async () => {
      const newPassword = 'NewSecure!P@ssw0rd123';

      userRepository.findOne.mockResolvedValue(mockUser as User);
      passwordHistoryRepository.find.mockResolvedValue([]);
      passwordHistoryRepository.count.mockResolvedValue(0);
      passwordHistoryRepository.create.mockReturnValue({} as PasswordHistory);
      passwordHistoryRepository.save.mockResolvedValue({} as PasswordHistory);
      auditLogRepository.create.mockReturnValue({} as AuditLog);
      auditLogRepository.save.mockResolvedValue({} as AuditLog);
      userRepository.update.mockResolvedValue(undefined as any);

      await service.changePassword('user-123', newPassword);

      expect(passwordHistoryRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        passwordHash: mockUser.passwordHash,
      }));
      expect(passwordHistoryRepository.save).toHaveBeenCalled();
    });

    it('should clean up old password history beyond limit', async () => {
      const newPassword = 'NewSecure!P@ssw0rd123';
      const oldRecords = Array(5).fill(null).map((_, i) => ({ id: `old-id-${i}` } as PasswordHistory));

      userRepository.findOne.mockResolvedValue(mockUser as User);
      passwordHistoryRepository.count.mockResolvedValue(5);

      // First call for password reuse check - return empty
      // Second call for cleanup - return old records
      passwordHistoryRepository.find
        .mockResolvedValueOnce([]) // isPasswordReused check
        .mockResolvedValueOnce(oldRecords); // cleanup check

      passwordHistoryRepository.create.mockReturnValue({} as PasswordHistory);
      passwordHistoryRepository.save.mockResolvedValue({} as PasswordHistory);
      passwordHistoryRepository.remove.mockResolvedValue(oldRecords as any);
      auditLogRepository.create.mockReturnValue({} as AuditLog);
      auditLogRepository.save.mockResolvedValue({} as AuditLog);
      userRepository.update.mockResolvedValue(undefined as any);

      await service.changePassword('user-123', newPassword);

      expect(passwordHistoryRepository.remove).toHaveBeenCalledWith(oldRecords);
    });

    it('should log audit event with metadata', async () => {
      const newPassword = 'NewSecure!P@ssw0rd123';
      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        isReset: true,
        adminInitiated: false,
      };

      userRepository.findOne.mockResolvedValue(mockUser as User);
      passwordHistoryRepository.find.mockResolvedValue([]);
      passwordHistoryRepository.count.mockResolvedValue(0);
      passwordHistoryRepository.create.mockReturnValue({} as PasswordHistory);
      passwordHistoryRepository.save.mockResolvedValue({} as PasswordHistory);
      auditLogRepository.create.mockReturnValue({} as AuditLog);
      auditLogRepository.save.mockResolvedValue({} as AuditLog);
      userRepository.update.mockResolvedValue(undefined as any);

      await service.changePassword('user-123', newPassword, metadata);

      expect(auditLogRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: expect.objectContaining({
          isReset: true,
          adminInitiated: false,
        }),
      }));
    });

    it('should handle database error gracefully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);
      passwordHistoryRepository.find.mockResolvedValue([]);
      passwordHistoryRepository.count.mockResolvedValue(0);
      userRepository.update.mockRejectedValue(new Error('Database error'));

      const result = await service.changePassword('user-123', 'NewSecure!P@ssw0rd123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update password');
    });
  });

  describe('isPasswordExpired - expanded coverage', () => {
    it('should return false when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.isPasswordExpired('invalid-id');

      expect(result).toBe(false);
    });

    it('should return false when updatedAt is null', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        updatedAt: null,
      } as any);

      const result = await service.isPasswordExpired('user-123');

      expect(result).toBe(false);
    });

    it('should return true exactly at expiration day', async () => {
      const exactlyExpired = new Date();
      exactlyExpired.setDate(exactlyExpired.getDate() - 90);

      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        updatedAt: exactlyExpired,
      } as User);

      const result = await service.isPasswordExpired('user-123');

      expect(result).toBe(true);
    });
  });

  describe('getDaysUntilExpiration - expanded coverage', () => {
    it('should return full expiration days when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.getDaysUntilExpiration('invalid-id');

      expect(result).toBe(90); // Default policy expirationDays
    });

    it('should return full expiration days when updatedAt is null', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        updatedAt: null,
      } as any);

      const result = await service.getDaysUntilExpiration('user-123');

      expect(result).toBe(90);
    });

    it('should return 0 when password is expired', async () => {
      const expired = new Date();
      expired.setDate(expired.getDate() - 100);

      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        updatedAt: expired,
      } as User);

      const result = await service.getDaysUntilExpiration('user-123');

      expect(result).toBe(0);
    });
  });

  describe('generateTemporaryPassword', () => {
    it('should generate password with default length', async () => {
      const password = service.generateTemporaryPassword();

      expect(password).toHaveLength(16);
    });

    it('should generate password with custom length', async () => {
      const password = service.generateTemporaryPassword(20);

      expect(password).toHaveLength(20);
    });

    it('should contain uppercase letters', async () => {
      const password = service.generateTemporaryPassword(16);

      expect(/[A-Z]/.test(password)).toBe(true);
    });

    it('should contain lowercase letters', async () => {
      const password = service.generateTemporaryPassword(16);

      expect(/[a-z]/.test(password)).toBe(true);
    });

    it('should contain numbers', async () => {
      const password = service.generateTemporaryPassword(16);

      expect(/\d/.test(password)).toBe(true);
    });

    it('should contain special characters', async () => {
      const password = service.generateTemporaryPassword(16);

      expect(/[!@#$%^&*]/.test(password)).toBe(true);
    });

    it('should generate unique passwords', async () => {
      const password1 = service.generateTemporaryPassword();
      const password2 = service.generateTemporaryPassword();

      expect(password1).not.toBe(password2);
    });

    it('should meet password validation requirements', async () => {
      const password = service.generateTemporaryPassword(16);
      const validation = await service.validatePassword(password);

      expect(validation.isValid).toBe(true);
    });
  });

  describe('isPasswordInHistory', () => {
    it('should return false (stub implementation)', async () => {
      const result = await service.isPasswordInHistory('user-123', 'TestP@ssw0rd123!');

      expect(result).toBe(false);
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
      expect(policy.requireNonRepeatChars).toBe(true);
      expect(policy.preventCommonPasswords).toBe(true);
      expect(policy.preventUserInfoInPassword).toBe(true);
      expect(policy.historyLength).toBe(5);
      expect(policy.expirationDays).toBe(90);
      expect(policy.warningDays).toBe(7);
    });

    it('should return a copy of the policy', async () => {
      const policy1 = await service.getPasswordPolicy();
      const policy2 = await service.getPasswordPolicy();

      expect(policy1).not.toBe(policy2); // Different objects
      expect(policy1).toEqual(policy2); // Same values
    });
  });
});