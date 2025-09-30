import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordSecurityService, HashingAlgorithm } from './password-security.service';
import { PasswordStrengthService } from './password-strength.service';
import { User } from '@/core/database/entities/user.entity';
import { PasswordHistory } from '@/core/database/entities/password-history.entity';
import { AuditLog } from '@/core/database/entities/audit-log.entity';

describe('PasswordSecurityService', () => {
  let service: PasswordSecurityService;
  let userRepository: Repository<User>;
  let passwordHistoryRepository: Repository<PasswordHistory>;
  let auditLogRepository: Repository<AuditLog>;
  let passwordStrengthService: PasswordStrengthService;

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
        PasswordStrengthService,
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
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    passwordHistoryRepository = module.get<Repository<PasswordHistory>>(getRepositoryToken(PasswordHistory));
    auditLogRepository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
    passwordStrengthService = module.get<PasswordStrengthService>(PasswordStrengthService);
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password, HashingAlgorithm.BCRYPT);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true);
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
});