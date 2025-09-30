import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PasswordController } from './password.controller';
import { PasswordSecurityService } from '../services/password-security.service';
import { PasswordResetService } from '../services/password-reset.service';
import { RateLimitService } from '../services/rate-limit.service';
import { User, UserRole, UserStatus } from '../../core/database/entities/user.entity';

describe('PasswordController', () => {
  let controller: PasswordController;
  let passwordSecurityService: PasswordSecurityService;
  let passwordResetService: PasswordResetService;
  let rateLimitService: RateLimitService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=1$hash',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
    accounts: [],
    fullName: 'Test User',
    isEmailVerified: false,
    isActive: true,
  } as User;

  const mockRequest = {
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '127.0.0.1',
    },
    connection: {
      remoteAddress: '127.0.0.1',
    },
    socket: {
      remoteAddress: '127.0.0.1',
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PasswordController],
      providers: [
        {
          provide: PasswordSecurityService,
          useValue: {
            validatePassword: jest.fn(),
            verifyPassword: jest.fn(),
            changePassword: jest.fn(),
            getPasswordPolicy: jest.fn(),
            isPasswordExpired: jest.fn(),
            getDaysUntilExpiration: jest.fn(),
            shouldWarnPasswordExpiry: jest.fn(),
          },
        },
        {
          provide: PasswordResetService,
          useValue: {
            requestPasswordReset: jest.fn(),
            validateResetToken: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkRateLimit: jest.fn(),
            recordAttempt: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PasswordController>(PasswordController);
    passwordSecurityService = module.get<PasswordSecurityService>(PasswordSecurityService);
    passwordResetService = module.get<PasswordResetService>(PasswordResetService);
    rateLimitService = module.get<RateLimitService>(RateLimitService);
  });

  describe('checkPasswordStrength', () => {
    it('should return password strength result', async () => {
      const mockValidation = {
        isValid: true,
        strengthResult: {
          score: 85,
          strength: 'strong' as const,
          feedback: ['Excellent! This is a strong password'],
          isValid: true,
        },
        violations: [],
      };

      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue(mockValidation);

      const result = await controller.checkPasswordStrength({
        password: 'MySecur3P@ssw0rd!',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      });

      expect(result).toEqual({
        score: 85,
        strength: 'strong',
        feedback: ['Excellent! This is a strong password'],
        isValid: true,
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockRateLimit = { allowed: true, attemptsRemaining: 9, resetTime: new Date(), isLocked: false };
      const mockChangeResult = { success: true, passwordExpiry: new Date() };

      jest.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue(mockRateLimit);
      jest.spyOn(passwordSecurityService, 'verifyPassword').mockResolvedValue(true);
      jest.spyOn(passwordSecurityService, 'changePassword').mockResolvedValue(mockChangeResult);
      jest.spyOn(rateLimitService, 'recordAttempt').mockResolvedValue();

      const result = await controller.changePassword(
        mockUser,
        {
          currentPassword: 'oldPassword',
          newPassword: 'NewSecur3P@ssw0rd!',
          confirmPassword: 'NewSecur3P@ssw0rd!',
        },
        mockRequest
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');
    });

    it('should throw error for mismatched passwords', async () => {
      await expect(
        controller.changePassword(
          mockUser,
          {
            currentPassword: 'oldPassword',
            newPassword: 'NewSecur3P@ssw0rd!',
            confirmPassword: 'DifferentPassword!',
          },
          mockRequest
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when rate limited', async () => {
      const mockRateLimit = {
        allowed: false,
        attemptsRemaining: 0,
        resetTime: new Date(Date.now() + 30 * 60 * 1000),
        isLocked: true,
        lockoutExpiry: new Date(Date.now() + 30 * 60 * 1000),
      };

      jest.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue(mockRateLimit);
      jest.spyOn(rateLimitService, 'recordAttempt').mockResolvedValue();

      await expect(
        controller.changePassword(
          mockUser,
          {
            currentPassword: 'oldPassword',
            newPassword: 'NewSecur3P@ssw0rd!',
            confirmPassword: 'NewSecur3P@ssw0rd!',
          },
          mockRequest
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for incorrect current password', async () => {
      const mockRateLimit = { allowed: true, attemptsRemaining: 9, resetTime: new Date(), isLocked: false };

      jest.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue(mockRateLimit);
      jest.spyOn(passwordSecurityService, 'verifyPassword').mockResolvedValue(false);
      jest.spyOn(rateLimitService, 'recordAttempt').mockResolvedValue();

      await expect(
        controller.changePassword(
          mockUser,
          {
            currentPassword: 'wrongPassword',
            newPassword: 'NewSecur3P@ssw0rd!',
            confirmPassword: 'NewSecur3P@ssw0rd!',
          },
          mockRequest
        )
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      const mockResult = {
        success: true,
        message: 'If an account with that email exists, you will receive a password reset link shortly.',
      };

      jest.spyOn(passwordResetService, 'requestPasswordReset').mockResolvedValue(mockResult);

      const result = await controller.requestPasswordReset(
        { email: 'test@example.com' },
        mockRequest
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe('validateResetToken', () => {
    it('should validate reset token successfully', async () => {
      const mockResult = { valid: true };

      jest.spyOn(passwordResetService, 'validateResetToken').mockResolvedValue(mockResult);

      const result = await controller.validateResetToken(
        { token: 'valid-token' },
        mockRequest
      );

      expect(result.valid).toBe(true);
    });

    it('should return invalid for bad token', async () => {
      const mockResult = { valid: false, error: 'Invalid or expired reset token' };

      jest.spyOn(passwordResetService, 'validateResetToken').mockResolvedValue(mockResult);

      const result = await controller.validateResetToken(
        { token: 'invalid-token' },
        mockRequest
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockResult = { success: true };

      jest.spyOn(passwordResetService, 'resetPassword').mockResolvedValue(mockResult);

      const result = await controller.resetPassword(
        {
          token: 'valid-token',
          newPassword: 'NewSecur3P@ssw0rd!',
          confirmPassword: 'NewSecur3P@ssw0rd!',
        },
        mockRequest
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password reset successfully');
    });

    it('should throw error for failed reset', async () => {
      const mockResult = { success: false, error: 'Invalid token' };

      jest.spyOn(passwordResetService, 'resetPassword').mockResolvedValue(mockResult);

      await expect(
        controller.resetPassword(
          {
            token: 'invalid-token',
            newPassword: 'NewSecur3P@ssw0rd!',
            confirmPassword: 'NewSecur3P@ssw0rd!',
          },
          mockRequest
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPasswordPolicy', () => {
    it('should return password policy', async () => {
      const mockPolicy = {
        minLength: 12,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        minSpecialChars: 1,
        maxRepeatingChars: 2,
        preventCommonPasswords: true,
        preventPersonalInfo: true,
        historyCount: 5,
        expirationDays: 90,
        warningDays: 7,
      };

      jest.spyOn(passwordSecurityService, 'getPasswordPolicy').mockResolvedValue(mockPolicy);

      const result = await controller.getPasswordPolicy();

      expect(result).toEqual(mockPolicy);
    });
  });

  describe('getPasswordStatus', () => {
    it('should return password status', async () => {
      jest.spyOn(passwordSecurityService, 'isPasswordExpired').mockResolvedValue(false);
      jest.spyOn(passwordSecurityService, 'getDaysUntilExpiration').mockResolvedValue(60);
      jest.spyOn(passwordSecurityService, 'shouldWarnPasswordExpiry').mockResolvedValue(false);

      const result = await controller.getPasswordStatus(mockUser);

      expect(result).toEqual({
        isExpired: false,
        daysUntilExpiration: 60,
        shouldWarn: false,
        mustChangePassword: false,
      });
    });

    it('should return expired status', async () => {
      jest.spyOn(passwordSecurityService, 'isPasswordExpired').mockResolvedValue(true);
      jest.spyOn(passwordSecurityService, 'getDaysUntilExpiration').mockResolvedValue(0);
      jest.spyOn(passwordSecurityService, 'shouldWarnPasswordExpiry').mockResolvedValue(true);

      const result = await controller.getPasswordStatus(mockUser);

      expect(result).toEqual({
        isExpired: true,
        daysUntilExpiration: 0,
        shouldWarn: true,
        mustChangePassword: true,
      });
    });
  });
});