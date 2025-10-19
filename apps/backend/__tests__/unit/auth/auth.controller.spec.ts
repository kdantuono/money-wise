import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { AuthSecurityService } from '@/auth/auth-security.service';
import { RateLimitGuard } from '@/auth/guards/rate-limit.guard';
import { RegisterDto } from '@/auth/dto/register.dto';
import { LoginDto } from '@/auth/dto/login.dto';
import { AuthResponseDto, AuthResponseUserDto } from '@/auth/dto/auth-response.dto';
import {
  User,
  UserStatus,
  UserRole,
} from '../../../generated/prisma';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let authSecurityService: jest.Mocked<AuthSecurityService>;
  let mockRequest: Partial<Request>;

  const mockUser: AuthResponseUserDto = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    currency: 'USD',
    avatar: null,
    timezone: null,
    preferences: null,
    lastLoginAt: null,
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    familyId: 'family-1',
    accounts: [],
    fullName: 'John Doe',
    isEmailVerified: true,
    isActive: true,
  };

  const mockAuthResponse: AuthResponseDto = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: mockUser,
    expiresIn: 900,
  };

  beforeEach(async () => {
    mockRequest = {
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      headers: { 'user-agent': 'test-user-agent' },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
          },
        },
        {
          provide: AuthSecurityService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
            changePassword: jest.fn(),
            requestPasswordReset: jest.fn(),
            resetPassword: jest.fn(),
            verifyEmail: jest.fn(),
            resendEmailVerification: jest.fn(),
            checkPasswordStrength: jest.fn(),
            passwordResetService: {
              validateResetToken: jest.fn(),
            },
          },
        },
      ],
    })
    .overrideGuard(RateLimitGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    authSecurityService = module.get(AuthSecurityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'Password123!',
    };

    it('should register a new user successfully', async () => {
      const mockResponseWithToken = {
        ...mockAuthResponse,
        verificationToken: 'mock-verification-token',
      };
      authSecurityService.register.mockResolvedValue(mockResponseWithToken);

      const result = await controller.register(registerDto, mockRequest as Request);

      expect(authSecurityService.register).toHaveBeenCalledWith(registerDto, mockRequest);
      expect(result).toEqual(mockAuthResponse);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('verificationToken');
    });

    it('should throw ConflictException when user already exists', async () => {
      authSecurityService.register.mockRejectedValue(
        new ConflictException('User with this email already exists')
      );

      await expect(controller.register(registerDto, mockRequest as Request)).rejects.toThrow(
        ConflictException
      );
      expect(authSecurityService.register).toHaveBeenCalledWith(registerDto, mockRequest);
    });

    it('should handle invalid registration data', async () => {
      const invalidDto = {
        ...registerDto,
        email: 'invalid-email',
      };

      // This would typically be caught by validation pipes
      authSecurityService.register.mockRejectedValue(new Error('Validation failed'));

      await expect(
        controller.register(invalidDto as RegisterDto, mockRequest as Request)
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      authSecurityService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto, mockRequest as Request);

      expect(authSecurityService.login).toHaveBeenCalledWith(loginDto, mockRequest);
      expect(result).toEqual(mockAuthResponse);
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      authSecurityService.login.mockRejectedValue(
        new UnauthorizedException('Invalid email or password')
      );

      await expect(controller.login(loginDto, mockRequest as Request)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authSecurityService.login).toHaveBeenCalledWith(loginDto, mockRequest);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      authSecurityService.login.mockRejectedValue(
        new UnauthorizedException('Account is not active')
      );

      await expect(controller.login(loginDto, mockRequest as Request)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle empty credentials', async () => {
      const emptyDto = { email: '', password: '' };

      authSecurityService.login.mockRejectedValue(
        new UnauthorizedException('Invalid email or password')
      );

      await expect(controller.login(emptyDto as LoginDto, mockRequest as Request)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh token successfully', async () => {
      authSecurityService.refreshToken.mockResolvedValue(mockAuthResponse);

      const result = await controller.refreshToken(refreshToken, mockRequest as Request);

      expect(authSecurityService.refreshToken).toHaveBeenCalledWith(refreshToken, mockRequest);
      expect(result).toEqual(mockAuthResponse);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException with invalid refresh token', async () => {
      authSecurityService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token')
      );

      await expect(controller.refreshToken(refreshToken, mockRequest as Request)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authSecurityService.refreshToken).toHaveBeenCalledWith(refreshToken, mockRequest);
    });

    it('should throw UnauthorizedException with expired refresh token', async () => {
      authSecurityService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token')
      );

      await expect(controller.refreshToken('expired-token', mockRequest as Request)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle malformed refresh token', async () => {
      authSecurityService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token')
      );

      await expect(controller.refreshToken('malformed.token', mockRequest as Request)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const userWithPassword = {
        ...mockUser,
        passwordHash: 'hashedPassword',
      } as User;

      const result = await controller.getProfile(userWithPassword);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.firstName).toBe(mockUser.firstName);
      expect(result.lastName).toBe(mockUser.lastName);
    });

    it('should include all user fields except password', async () => {
      const userWithData = {
        ...mockUser,
        passwordHash: 'hashedPassword',
        emailVerifiedAt: new Date(),
      } as User;

      const result = await controller.getProfile(userWithData);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(result.emailVerifiedAt).toBeDefined();
    });

    it('should handle user with null optional fields', async () => {
      const userWithNulls = {
        ...mockUser,
        passwordHash: 'hashedPassword',
        avatar: null,
        timezone: null,
        preferences: null,
        lastLoginAt: null,
        emailVerifiedAt: null,
      } as User;

      const result = await controller.getProfile(userWithNulls);

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.avatar).toBeNull();
      expect(result.timezone).toBeNull();
      expect(result.emailVerifiedAt).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const user = {
        ...mockUser,
        passwordHash: 'hashedPassword',
      } as User;

      authSecurityService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(user, mockRequest as Request);

      expect(authSecurityService.logout).toHaveBeenCalledWith(user.id, mockRequest);
      expect(result).toBeUndefined();
    });

    it('should handle logout for any authenticated user', async () => {
      const adminUser = {
        ...mockUser,
        role: UserRole.ADMIN,
        passwordHash: 'hashedPassword',
      } as User;

      authSecurityService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(adminUser, mockRequest as Request);

      expect(authSecurityService.logout).toHaveBeenCalledWith(adminUser.id, mockRequest);
      expect(result).toBeUndefined();
    });
  });

  describe('changePassword', () => {
    const testUser = {
      ...mockUser,
      passwordHash: 'hashedPassword',
    } as User;

    const passwordChangeDto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    };

    it('should change password successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      authSecurityService.changePassword.mockResolvedValue(mockResponse);

      const result = await controller.changePassword(
        testUser,
        passwordChangeDto,
        mockRequest as Request
      );

      expect(authSecurityService.changePassword).toHaveBeenCalledWith(
        testUser.id,
        passwordChangeDto,
        mockRequest
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for invalid current password', async () => {
      authSecurityService.changePassword.mockRejectedValue(
        new UnauthorizedException('Current password is incorrect')
      );

      await expect(
        controller.changePassword(testUser, passwordChangeDto, mockRequest as Request)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error for weak new password', async () => {
      authSecurityService.changePassword.mockRejectedValue(
        new Error('Password does not meet strength requirements')
      );

      await expect(
        controller.changePassword(testUser, passwordChangeDto, mockRequest as Request)
      ).rejects.toThrow('Password does not meet strength requirements');
    });
  });

  describe('requestPasswordReset', () => {
    const resetRequestDto = {
      email: 'test@example.com',
    };

    it('should request password reset successfully', async () => {
      const mockResponse = {
        message: 'Password reset email sent if account exists',
        success: true,
      };

      authSecurityService.requestPasswordReset.mockResolvedValue(mockResponse);

      const result = await controller.requestPasswordReset(
        resetRequestDto,
        mockRequest as Request
      );

      expect(authSecurityService.requestPasswordReset).toHaveBeenCalledWith(
        resetRequestDto,
        mockRequest
      );
      expect(result).toEqual({ message: mockResponse.message });
      expect(result).not.toHaveProperty('success');
    });

    it('should handle non-existent email gracefully', async () => {
      const mockResponse = {
        message: 'Password reset email sent if account exists',
        success: true,
      };

      authSecurityService.requestPasswordReset.mockResolvedValue(mockResponse);

      const result = await controller.requestPasswordReset(
        { email: 'nonexistent@example.com' },
        mockRequest as Request
      );

      expect(result).toEqual({ message: mockResponse.message });
    });

    it('should handle service errors', async () => {
      authSecurityService.requestPasswordReset.mockRejectedValue(
        new Error('Email service unavailable')
      );

      await expect(
        controller.requestPasswordReset(resetRequestDto, mockRequest as Request)
      ).rejects.toThrow('Email service unavailable');
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      token: 'valid-reset-token',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    it('should reset password successfully', async () => {
      const mockResponse = {
        message: 'Password has been reset successfully',
        success: true,
      };

      authSecurityService.resetPassword.mockResolvedValue(mockResponse);

      const result = await controller.resetPassword(
        resetPasswordDto,
        mockRequest as Request
      );

      expect(authSecurityService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto,
        mockRequest
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for invalid token', async () => {
      authSecurityService.resetPassword.mockRejectedValue(
        new Error('Invalid or expired reset token')
      );

      await expect(
        controller.resetPassword(
          { ...resetPasswordDto, token: 'invalid-token' },
          mockRequest as Request
        )
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw error for weak password', async () => {
      authSecurityService.resetPassword.mockRejectedValue(
        new Error('Password does not meet strength requirements')
      );

      await expect(
        controller.resetPassword(resetPasswordDto, mockRequest as Request)
      ).rejects.toThrow('Password does not meet strength requirements');
    });

    it('should throw error for expired token', async () => {
      authSecurityService.resetPassword.mockRejectedValue(
        new Error('Reset token has expired')
      );

      await expect(
        controller.resetPassword(resetPasswordDto, mockRequest as Request)
      ).rejects.toThrow('Reset token has expired');
    });
  });

  describe('validatePasswordResetToken', () => {
    const tokenValidationDto = {
      token: 'valid-token',
    };

    it('should validate token successfully', async () => {
      const mockResponse = {
        valid: true,
        email: 'test@example.com',
      };

      (authSecurityService as any).passwordResetService.validateResetToken.mockResolvedValue(
        mockResponse
      );

      const result = await controller.validatePasswordResetToken(tokenValidationDto);

      expect(
        (authSecurityService as any).passwordResetService.validateResetToken
      ).toHaveBeenCalledWith(tokenValidationDto.token);
      expect(result).toEqual(mockResponse);
    });

    it('should return invalid for expired token', async () => {
      const mockResponse = {
        valid: false,
      };

      (authSecurityService as any).passwordResetService.validateResetToken.mockResolvedValue(
        mockResponse
      );

      const result = await controller.validatePasswordResetToken({
        token: 'expired-token',
      });

      expect(result.valid).toBe(false);
    });

    it('should return invalid for malformed token', async () => {
      const mockResponse = {
        valid: false,
      };

      (authSecurityService as any).passwordResetService.validateResetToken.mockResolvedValue(
        mockResponse
      );

      const result = await controller.validatePasswordResetToken({
        token: 'malformed.token',
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('verifyEmail', () => {
    const emailVerificationDto = {
      token: 'valid-verification-token',
    };

    it('should verify email successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Email verified successfully',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      authSecurityService.verifyEmail.mockResolvedValue(mockResponse);

      const result = await controller.verifyEmail(
        emailVerificationDto,
        mockRequest as Request
      );

      expect(authSecurityService.verifyEmail).toHaveBeenCalledWith(
        emailVerificationDto.token,
        mockRequest
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for invalid token', async () => {
      authSecurityService.verifyEmail.mockRejectedValue(
        new Error('Invalid verification token')
      );

      await expect(
        controller.verifyEmail(
          { token: 'invalid-token' },
          mockRequest as Request
        )
      ).rejects.toThrow('Invalid verification token');
    });

    it('should throw error for expired token', async () => {
      authSecurityService.verifyEmail.mockRejectedValue(
        new Error('Verification token has expired')
      );

      await expect(
        controller.verifyEmail(
          { token: 'expired-token' },
          mockRequest as Request
        )
      ).rejects.toThrow('Verification token has expired');
    });

    it('should throw error for already verified email', async () => {
      authSecurityService.verifyEmail.mockRejectedValue(
        new Error('Email already verified')
      );

      await expect(
        controller.verifyEmail(emailVerificationDto, mockRequest as Request)
      ).rejects.toThrow('Email already verified');
    });
  });

  describe('resendEmailVerification', () => {
    const user = {
      ...mockUser,
      passwordHash: 'hashedPassword',
      emailVerifiedAt: null,
    } as User;

    it('should resend verification email successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Verification email sent successfully',
      };

      authSecurityService.resendEmailVerification.mockResolvedValue(mockResponse);

      const result = await controller.resendEmailVerification(
        user,
        mockRequest as Request
      );

      expect(authSecurityService.resendEmailVerification).toHaveBeenCalledWith(
        user.id,
        mockRequest
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for already verified email', async () => {
      const verifiedUser = {
        ...user,
        emailVerifiedAt: new Date(),
      } as User;

      authSecurityService.resendEmailVerification.mockRejectedValue(
        new Error('Email already verified')
      );

      await expect(
        controller.resendEmailVerification(verifiedUser, mockRequest as Request)
      ).rejects.toThrow('Email already verified');
    });

    it('should handle rate limiting', async () => {
      authSecurityService.resendEmailVerification.mockRejectedValue(
        new Error('Too many verification requests')
      );

      await expect(
        controller.resendEmailVerification(user, mockRequest as Request)
      ).rejects.toThrow('Too many verification requests');
    });

    it('should handle email service errors', async () => {
      authSecurityService.resendEmailVerification.mockRejectedValue(
        new Error('Email service unavailable')
      );

      await expect(
        controller.resendEmailVerification(user, mockRequest as Request)
      ).rejects.toThrow('Email service unavailable');
    });
  });

  describe('checkPasswordStrength', () => {
    const passwordStrengthDto = {
      password: 'TestPassword123!',
      email: 'test@example.com',
    };

    it('should return strong password result', async () => {
      const mockResponse = {
        score: 4,
        strength: 'strong' as const,
        feedback: ['Password is strong'],
        meets_requirements: true,
      };

      authSecurityService.checkPasswordStrength.mockResolvedValue(mockResponse);

      const result = await controller.checkPasswordStrength(passwordStrengthDto);

      expect(authSecurityService.checkPasswordStrength).toHaveBeenCalledWith(
        passwordStrengthDto
      );
      expect(result).toEqual(mockResponse);
      expect(result.score).toBe(4);
      expect(result.strength).toBe('strong');
    });

    it('should return weak password result', async () => {
      const mockResponse = {
        score: 1,
        strength: 'weak' as const,
        feedback: ['Password is too short', 'Add special characters'],
        meets_requirements: false,
      };

      authSecurityService.checkPasswordStrength.mockResolvedValue(mockResponse);

      const result = await controller.checkPasswordStrength({
        password: 'weak',
        email: 'test@example.com',
      });

      expect(result.score).toBe(1);
      expect(result.strength).toBe('weak');
      expect(result.meets_requirements).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should detect password with user information', async () => {
      const mockResponse = {
        score: 2,
        strength: 'fair' as const,
        feedback: ['Password contains personal information'],
        meets_requirements: false,
      };

      authSecurityService.checkPasswordStrength.mockResolvedValue(mockResponse);

      const result = await controller.checkPasswordStrength({
        password: 'test@example.com123',
        email: 'test@example.com',
      });

      expect(result.feedback).toContain('Password contains personal information');
    });

    it('should handle empty password', async () => {
      const mockResponse = {
        score: 0,
        strength: 'very-weak' as const,
        feedback: ['Password is required'],
        meets_requirements: false,
      };

      authSecurityService.checkPasswordStrength.mockResolvedValue(mockResponse);

      const result = await controller.checkPasswordStrength({
        password: '',
        email: 'test@example.com',
      });

      expect(result.score).toBe(0);
      expect(result.strength).toBe('very-weak');
    });
  });

  describe('error handling', () => {
    it('should propagate service errors correctly', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
      };

      authSecurityService.register.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(controller.register(registerDto, mockRequest as Request)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle unexpected errors during login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      authSecurityService.login.mockRejectedValue(new Error('Unexpected error'));

      await expect(controller.login(loginDto, mockRequest as Request)).rejects.toThrow(
        'Unexpected error'
      );
    });

    it('should handle service timeout errors', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      authSecurityService.login.mockRejectedValue(new Error('Service timeout'));

      await expect(controller.login(loginDto, mockRequest as Request)).rejects.toThrow(
        'Service timeout'
      );
    });
  });
});
