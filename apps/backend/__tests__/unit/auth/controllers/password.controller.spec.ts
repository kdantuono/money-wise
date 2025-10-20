import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PasswordController } from '@/auth/controllers/password.controller';
import { PasswordSecurityService } from '@/auth/services/password-security.service';
import { PasswordResetService } from '@/auth/services/password-reset.service';
import { RateLimitService } from '@/auth/services/rate-limit.service';
import { User, UserRole, UserStatus } from '../../../../generated/prisma';

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
    role: UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    currency: 'USD',
    avatar: null,
    timezone: null,
    preferences: null,
    lastLoginAt: null,
    emailVerifiedAt: null,
    familyId: 'family-1',
    createdAt: new Date(),
    updatedAt: new Date(),
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
          meets_requirements: true,
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
        meets_requirements: true,
      });
      expect(passwordSecurityService.validatePassword).toHaveBeenCalledWith(
        'MySecur3P@ssw0rd!',
        {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
        }
      );
    });

    it('should return weak password result', async () => {
      const mockValidation = {
        isValid: false,
        strengthResult: {
          score: 30,
          strength: 'weak' as const,
          feedback: ['Password is too short', 'Add uppercase letters'],
          meets_requirements: false,
        },
        violations: ['minLength', 'requireUppercase'],
      };

      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue(mockValidation);

      const result = await controller.checkPasswordStrength({
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      });

      expect(result.score).toBe(30);
      expect(result.strength).toBe('weak');
      expect(result.meets_requirements).toBe(false);
      expect(result.feedback).toContain('Password is too short');
    });

    it('should detect personal information in password', async () => {
      const mockValidation = {
        isValid: false,
        strengthResult: {
          score: 45,
          strength: 'fair' as const,
          feedback: ['Password contains personal information'],
          meets_requirements: false,
        },
        violations: ['preventUserInfoInPassword'],
      };

      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue(mockValidation);

      const result = await controller.checkPasswordStrength({
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      });

      expect(result.feedback).toContain('Password contains personal information');
    });

    it('should validate without personal information context', async () => {
      const mockValidation = {
        isValid: true,
        strengthResult: {
          score: 75,
          strength: 'strong' as const,
          feedback: ['Good password'],
          meets_requirements: true,
        },
        violations: [],
      };

      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue(mockValidation);

      const result = await controller.checkPasswordStrength({
        password: 'RandomP@ssw0rd!',
      });

      expect(result.meets_requirements).toBe(true);
      expect(passwordSecurityService.validatePassword).toHaveBeenCalledWith(
        'RandomP@ssw0rd!',
        {
          firstName: undefined,
          lastName: undefined,
          email: undefined,
        }
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockRateLimit = { allowed: true, attemptsRemaining: 9, resetTime: new Date(), isLocked: false };
      const mockChangeResult = { success: true, passwordExpiry: new Date() };

      jest.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue(mockRateLimit);
      jest.spyOn(passwordSecurityService, 'verifyPassword').mockResolvedValue(true);
      jest.spyOn(passwordSecurityService, 'changePassword').mockResolvedValue(mockChangeResult);
      jest.spyOn(rateLimitService, 'recordAttempt').mockResolvedValue(undefined);

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
      jest.spyOn(rateLimitService, 'recordAttempt').mockResolvedValue(undefined);

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
      jest.spyOn(rateLimitService, 'recordAttempt').mockResolvedValue(undefined);

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

      expect(rateLimitService.recordAttempt).toHaveBeenCalledWith(mockUser.id, 'passwordChange', false);
    });

    it('should handle password change failure from service', async () => {
      const mockRateLimit = { allowed: true, attemptsRemaining: 9, resetTime: new Date(), isLocked: false };
      const mockChangeResult = { success: false, error: 'Password reused recently' };

      jest.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue(mockRateLimit);
      jest.spyOn(passwordSecurityService, 'verifyPassword').mockResolvedValue(true);
      jest.spyOn(passwordSecurityService, 'changePassword').mockResolvedValue(mockChangeResult);
      jest.spyOn(rateLimitService, 'recordAttempt').mockResolvedValue(undefined);

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

      expect(rateLimitService.recordAttempt).toHaveBeenCalledWith(mockUser.id, 'passwordChange', false);
    });

    it('should clear rate limit on successful change', async () => {
      const mockRateLimit = { allowed: true, attemptsRemaining: 9, resetTime: new Date(), isLocked: false };
      const mockChangeResult = { success: true, passwordExpiry: new Date() };

      jest.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue(mockRateLimit);
      jest.spyOn(passwordSecurityService, 'verifyPassword').mockResolvedValue(true);
      jest.spyOn(passwordSecurityService, 'changePassword').mockResolvedValue(mockChangeResult);
      jest.spyOn(rateLimitService, 'recordAttempt').mockResolvedValue(undefined);

      await controller.changePassword(
        mockUser,
        {
          currentPassword: 'oldPassword',
          newPassword: 'NewSecur3P@ssw0rd!',
          confirmPassword: 'NewSecur3P@ssw0rd!',
        },
        mockRequest
      );

      expect(rateLimitService.recordAttempt).toHaveBeenCalledWith(mockUser.id, 'passwordChange', true);
    });

    it('should extract IP from various headers', async () => {
      const mockRateLimit = { allowed: true, attemptsRemaining: 9, resetTime: new Date(), isLocked: false };
      const mockChangeResult = { success: true, passwordExpiry: new Date() };

      const requestWithXForwardedFor = {
        ...mockRequest,
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'test-agent',
        },
      } as any;

      jest.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue(mockRateLimit);
      jest.spyOn(passwordSecurityService, 'verifyPassword').mockResolvedValue(true);
      jest.spyOn(passwordSecurityService, 'changePassword').mockResolvedValue(mockChangeResult);
      jest.spyOn(rateLimitService, 'recordAttempt').mockResolvedValue(undefined);

      await controller.changePassword(
        mockUser,
        {
          currentPassword: 'oldPassword',
          newPassword: 'NewSecur3P@ssw0rd!',
          confirmPassword: 'NewSecur3P@ssw0rd!',
        },
        requestWithXForwardedFor
      );

      expect(passwordSecurityService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        'NewSecur3P@ssw0rd!',
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
        })
      );
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
      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        })
      );
    });

    it('should handle non-existent email gracefully', async () => {
      const mockResult = {
        success: true,
        message: 'If an account with that email exists, you will receive a password reset link shortly.',
      };

      jest.spyOn(passwordResetService, 'requestPasswordReset').mockResolvedValue(mockResult);

      const result = await controller.requestPasswordReset(
        { email: 'nonexistent@example.com' },
        mockRequest
      );

      expect(result).toEqual(mockResult);
    });

    it('should extract IP from x-real-ip header', async () => {
      const mockResult = { success: true, message: 'Reset email sent' };
      const requestWithRealIp = {
        ...mockRequest,
        headers: {
          'x-real-ip': '10.0.0.1',
          'user-agent': 'test-agent',
        },
      } as any;

      jest.spyOn(passwordResetService, 'requestPasswordReset').mockResolvedValue(mockResult);

      await controller.requestPasswordReset(
        { email: 'test@example.com' },
        requestWithRealIp
      );

      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          ipAddress: '10.0.0.1',
        })
      );
    });

    it('should handle unknown IP address', async () => {
      const mockResult = { success: true, message: 'Reset email sent' };
      const requestWithoutIp = {
        headers: { 'user-agent': 'test-agent' },
        connection: {},
        socket: {},
      } as any;

      jest.spyOn(passwordResetService, 'requestPasswordReset').mockResolvedValue(mockResult);

      await controller.requestPasswordReset(
        { email: 'test@example.com' },
        requestWithoutIp
      );

      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          ipAddress: 'unknown',
        })
      );
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
      expect(passwordResetService.validateResetToken).toHaveBeenCalledWith(
        'valid-token',
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        })
      );
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

    it('should return invalid for expired token', async () => {
      const mockResult = { valid: false, error: 'Token has expired' };

      jest.spyOn(passwordResetService, 'validateResetToken').mockResolvedValue(mockResult);

      const result = await controller.validateResetToken(
        { token: 'expired-token' },
        mockRequest
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token has expired');
    });

    it('should pass IP and user agent to service', async () => {
      const mockResult = { valid: true };

      jest.spyOn(passwordResetService, 'validateResetToken').mockResolvedValue(mockResult);

      await controller.validateResetToken(
        { token: 'test-token' },
        mockRequest
      );

      expect(passwordResetService.validateResetToken).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        })
      );
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
      expect(passwordResetService.resetPassword).toHaveBeenCalledWith(
        'valid-token',
        'NewSecur3P@ssw0rd!',
        'NewSecur3P@ssw0rd!',
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        })
      );
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

    it('should throw error for mismatched passwords', async () => {
      const mockResult = { success: false, error: 'Passwords do not match' };

      jest.spyOn(passwordResetService, 'resetPassword').mockResolvedValue(mockResult);

      await expect(
        controller.resetPassword(
          {
            token: 'valid-token',
            newPassword: 'NewSecur3P@ssw0rd!',
            confirmPassword: 'DifferentPassword!',
          },
          mockRequest
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for weak password', async () => {
      const mockResult = { success: false, error: 'Password does not meet requirements' };

      jest.spyOn(passwordResetService, 'resetPassword').mockResolvedValue(mockResult);

      await expect(
        controller.resetPassword(
          {
            token: 'valid-token',
            newPassword: 'weak',
            confirmPassword: 'weak',
          },
          mockRequest
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for expired token', async () => {
      const mockResult = { success: false, error: 'Token has expired' };

      jest.spyOn(passwordResetService, 'resetPassword').mockResolvedValue(mockResult);

      await expect(
        controller.resetPassword(
          {
            token: 'expired-token',
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
        requireNonRepeatChars: true,
        preventCommonPasswords: true,
        preventUserInfoInPassword: true,
        historyLength: 5,
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
      expect(passwordSecurityService.isPasswordExpired).toHaveBeenCalledWith(mockUser.id);
      expect(passwordSecurityService.getDaysUntilExpiration).toHaveBeenCalledWith(mockUser.id);
      expect(passwordSecurityService.shouldWarnPasswordExpiry).toHaveBeenCalledWith(mockUser.id);
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

    it('should return warning status', async () => {
      jest.spyOn(passwordSecurityService, 'isPasswordExpired').mockResolvedValue(false);
      jest.spyOn(passwordSecurityService, 'getDaysUntilExpiration').mockResolvedValue(5);
      jest.spyOn(passwordSecurityService, 'shouldWarnPasswordExpiry').mockResolvedValue(true);

      const result = await controller.getPasswordStatus(mockUser);

      expect(result).toEqual({
        isExpired: false,
        daysUntilExpiration: 5,
        shouldWarn: true,
        mustChangePassword: false,
      });
    });

    it('should handle negative days until expiration', async () => {
      jest.spyOn(passwordSecurityService, 'isPasswordExpired').mockResolvedValue(true);
      jest.spyOn(passwordSecurityService, 'getDaysUntilExpiration').mockResolvedValue(-5);
      jest.spyOn(passwordSecurityService, 'shouldWarnPasswordExpiry').mockResolvedValue(true);

      const result = await controller.getPasswordStatus(mockUser);

      expect(result.isExpired).toBe(true);
      expect(result.daysUntilExpiration).toBe(-5);
      expect(result.mustChangePassword).toBe(true);
    });
  });

  describe('IP extraction (getClientIp)', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const mockResult = { success: true, message: 'Reset email sent' };
      const requestWithForwarded = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'test-agent',
        },
        connection: {},
        socket: {},
      } as any;

      jest.spyOn(passwordResetService, 'requestPasswordReset').mockResolvedValue(mockResult);

      await controller.requestPasswordReset(
        { email: 'test@example.com' },
        requestWithForwarded
      );

      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          ipAddress: '192.168.1.1',
        })
      );
    });

    it('should extract IP from x-real-ip header', async () => {
      const mockResult = { success: true, message: 'Reset email sent' };
      const requestWithRealIp = {
        headers: {
          'x-real-ip': '10.0.0.1',
          'user-agent': 'test-agent',
        },
        connection: {},
        socket: {},
      } as any;

      jest.spyOn(passwordResetService, 'requestPasswordReset').mockResolvedValue(mockResult);

      await controller.requestPasswordReset(
        { email: 'test@example.com' },
        requestWithRealIp
      );

      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          ipAddress: '10.0.0.1',
        })
      );
    });

    it('should extract IP from connection.remoteAddress', async () => {
      const mockResult = { success: true, message: 'Reset email sent' };
      const requestWithConnection = {
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '172.16.0.1' },
      } as any;

      jest.spyOn(passwordResetService, 'requestPasswordReset').mockResolvedValue(mockResult);

      await controller.requestPasswordReset(
        { email: 'test@example.com' },
        requestWithConnection
      );

      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          ipAddress: '172.16.0.1',
        })
      );
    });

    it('should extract IP from socket.remoteAddress', async () => {
      const mockResult = { success: true, message: 'Reset email sent' };
      const requestWithSocket = {
        headers: { 'user-agent': 'test-agent' },
        connection: {},
        socket: { remoteAddress: '192.168.2.1' },
      } as any;

      jest.spyOn(passwordResetService, 'requestPasswordReset').mockResolvedValue(mockResult);

      await controller.requestPasswordReset(
        { email: 'test@example.com' },
        requestWithSocket
      );

      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          ipAddress: '192.168.2.1',
        })
      );
    });

    it('should return unknown when no IP is found', async () => {
      const mockResult = { success: true, message: 'Reset email sent' };
      const requestWithoutIp = {
        headers: { 'user-agent': 'test-agent' },
        connection: {},
        socket: {},
      } as any;

      jest.spyOn(passwordResetService, 'requestPasswordReset').mockResolvedValue(mockResult);

      await controller.requestPasswordReset(
        { email: 'test@example.com' },
        requestWithoutIp
      );

      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          ipAddress: 'unknown',
        })
      );
    });
  });
});