import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthSecurityService } from '@/auth/auth-security.service';
import { PasswordSecurityService } from '@/auth/services/password-security.service';
import { AccountLockoutService } from '@/auth/services/account-lockout.service';
import { EmailVerificationService } from '@/auth/services/email-verification.service';
import { PasswordResetService } from '@/auth/services/password-reset.service';
import { AuditLogService } from '@/auth/services/audit-log.service';
import {
  User,
  UserStatus,
  UserRole,
} from '@/core/database/entities/user.entity';

describe('AuthSecurityService', () => {
  let service: AuthSecurityService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let passwordSecurityService: PasswordSecurityService;
  let accountLockoutService: AccountLockoutService;
  let emailVerificationService: EmailVerificationService;
  let passwordResetService: PasswordResetService;
  let auditLogService: AuditLogService;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashedPassword',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    currency: 'USD',
    lastLoginAt: new Date(),
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    accounts: [],
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    },
    get isEmailVerified() {
      return !!this.emailVerifiedAt;
    },
    get isActive() {
      return this.status === UserStatus.ACTIVE;
    },
  } as User;

  const mockRequest = {
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('Mozilla/5.0'),
    headers: {},
    connection: { remoteAddress: '127.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthSecurityService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                auth: {
                  JWT_ACCESS_SECRET: 'test-access-secret-32-characters-long!!!',
                  JWT_ACCESS_EXPIRES_IN: '15m',
                  JWT_REFRESH_SECRET: 'test-refresh-secret-32-characters-long!!!',
                  JWT_REFRESH_EXPIRES_IN: '7d',
                },
              };
              return config[key];
            }),
          },
        },
        {
          provide: PasswordSecurityService,
          useValue: {
            validatePassword: jest.fn(),
            hashPassword: jest.fn(),
            verifyPassword: jest.fn(),
            isPasswordInHistory: jest.fn(),
          },
        },
        {
          provide: AccountLockoutService,
          useValue: {
            getLockoutInfo: jest.fn(),
            recordFailedAttempt: jest.fn(),
            clearFailedAttempts: jest.fn(),
          },
        },
        {
          provide: EmailVerificationService,
          useValue: {
            generateVerificationToken: jest.fn(),
            verifyEmail: jest.fn(),
            resendVerificationEmail: jest.fn(),
          },
        },
        {
          provide: PasswordResetService,
          useValue: {
            requestPasswordReset: jest.fn(),
            resetPassword: jest.fn(),
            validateResetToken: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logEvent: jest.fn(),
            logLoginSuccess: jest.fn(),
            logLoginFailed: jest.fn(),
            logAccountLocked: jest.fn(),
            logPasswordChange: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthSecurityService>(AuthSecurityService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    passwordSecurityService = module.get<PasswordSecurityService>(
      PasswordSecurityService
    );
    accountLockoutService = module.get<AccountLockoutService>(
      AccountLockoutService
    );
    emailVerificationService = module.get<EmailVerificationService>(
      EmailVerificationService
    );
    passwordResetService =
      module.get<PasswordResetService>(PasswordResetService);
    auditLogService = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should successfully register a new user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue({
        isValid: true,
        strengthResult: {
          score: 85,
          strength: 'strong',
          feedback: [],
          meets_requirements: true,
        },
        violations: [],
      });
      jest
        .spyOn(passwordSecurityService, 'hashPassword')
        .mockResolvedValue('hashedPassword');
      jest
        .spyOn(userRepository, 'create')
        .mockReturnValue({
          ...mockUser,
          ...registerDto,
          fullName: `${registerDto.firstName} ${registerDto.lastName}`,
          isEmailVerified: false,
          isActive: true
        } as unknown as User);
      jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue({
          ...mockUser,
          ...registerDto,
          fullName: `${registerDto.firstName} ${registerDto.lastName}`,
          isEmailVerified: false,
          isActive: true
        } as unknown as User);
      jest
        .spyOn(emailVerificationService, 'generateVerificationToken')
        .mockResolvedValue('verification-token');

      const result = await service.register(registerDto, mockRequest);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email.toLowerCase());
    });

    it('should throw ConflictException if user already exists', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.register(registerDto, mockRequest)).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw BadRequestException for weak password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue({
        isValid: false,
        strengthResult: {
          score: 30,
          strength: 'weak',
          feedback: ['Password is too weak'],
          meets_requirements: false,
        },
        violations: ['Password is too weak'],
      });

      await expect(service.register(registerDto, mockRequest)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    it('should successfully login with valid credentials', async () => {
      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValue(true);
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined);

      const result = await service.login(loginDto, mockRequest);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(accountLockoutService.clearFailedAttempts).toHaveBeenCalled();
      expect(auditLogService.logLoginSuccess).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if account is locked', async () => {
      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: true,
        failedAttempts: 5,
        lockedUntil: new Date(Date.now() + 3600000),
      });

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should record failed attempt on invalid password', async () => {
      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValue(false);
      jest
        .spyOn(accountLockoutService, 'recordFailedAttempt')
        .mockResolvedValue({
          isLocked: false,
          failedAttempts: 1,
        });

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException
      );
      expect(accountLockoutService.recordFailedAttempt).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const passwordChangeDto = {
      currentPassword: 'oldPassword',
      newPassword: 'NewSecurePass123!',
    };

    it('should successfully change password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValueOnce(true) // current password valid
        .mockResolvedValueOnce(false); // new password is different
      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue({
        isValid: true,
        strengthResult: {
          score: 85,
          strength: 'strong',
          feedback: [],
          meets_requirements: true,
        },
        violations: [],
      });
      jest
        .spyOn(passwordSecurityService, 'isPasswordInHistory')
        .mockResolvedValue(false);
      jest
        .spyOn(passwordSecurityService, 'hashPassword')
        .mockResolvedValue('newHashedPassword');
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined);

      const result = await service.changePassword(
        mockUser.id,
        passwordChangeDto,
        mockRequest
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');
      expect(auditLogService.logPasswordChange).toHaveBeenCalledWith(
        mockRequest,
        mockUser.id,
        mockUser.email,
        true
      );
    });

    it('should throw UnauthorizedException for invalid current password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValue(false);

      await expect(
        service.changePassword(mockUser.id, passwordChangeDto, mockRequest)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for weak new password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValue(true);
      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue({
        isValid: false,
        strengthResult: {
          score: 30,
          strength: 'weak',
          feedback: ['Password is too weak'],
          meets_requirements: false,
        },
        violations: ['Password is too weak'],
      });

      await expect(
        service.changePassword(mockUser.id, passwordChangeDto, mockRequest)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if new password is same as current', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValueOnce(true) // current password valid
        .mockResolvedValueOnce(true); // new password is same
      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue({
        isValid: true,
        strengthResult: {
          score: 85,
          strength: 'strong',
          feedback: [],
          meets_requirements: true,
        },
        violations: [],
      });

      await expect(
        service.changePassword(mockUser.id, passwordChangeDto, mockRequest)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestPasswordReset', () => {
    const passwordResetRequestDto = {
      email: 'test@example.com',
    };

    it('should request password reset', async () => {
      jest
        .spyOn(passwordResetService, 'requestPasswordReset')
        .mockResolvedValue({
          success: true,
          message: 'If an account with that email exists, you will receive a password reset link shortly.',
          token: 'reset-token',
        });

      const result = await service.requestPasswordReset(
        passwordResetRequestDto,
        mockRequest
      );

      expect(result.message).toContain('password reset link has been sent');
      expect(result.token).toBe('reset-token');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const verificationResult = {
        success: true,
        message: 'Email verified successfully',
        user: mockUser,
      };
      jest
        .spyOn(emailVerificationService, 'verifyEmail')
        .mockResolvedValue(verificationResult);

      const result = await service.verifyEmail(
        'verification-token',
        mockRequest
      );

      expect(result).toEqual(verificationResult);
    });
  });

  describe('checkPasswordStrength', () => {
    it('should return password strength analysis', async () => {
      const passwordStrengthDto = {
        password: 'TestPassword123!',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const strengthResult = {
        isValid: true,
        strengthResult: {
          score: 85,
          strength: 'strong' as const,
          feedback: [],
          meets_requirements: true,
        },
        violations: [],
      };

      jest
        .spyOn(passwordSecurityService, 'validatePassword')
        .mockResolvedValue(strengthResult);

      const result = await service.checkPasswordStrength(passwordStrengthDto);

      expect(result).toEqual(strengthResult.strengthResult);
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      jest.spyOn(jwtService, 'verify').mockReturnValue(payload);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.refreshToken('refresh-token', mockRequest);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.refreshToken('invalid-token', mockRequest)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload = {
        sub: 'non-existent-id',
        email: 'nonexistent@example.com',
        role: UserRole.USER,
      };
      jest.spyOn(jwtService, 'verify').mockReturnValue(payload);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.refreshToken('refresh-token', mockRequest)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        get isActive() {
          return this.status === UserStatus.ACTIVE;
        },
      } as User;
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      jest.spyOn(jwtService, 'verify').mockReturnValue(payload);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);

      await expect(
        service.refreshToken('refresh-token', mockRequest)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      token: 'reset-token-123',
      newPassword: 'NewSecurePass123!',
      confirmPassword: 'NewSecurePass123!',
    };

    it('should successfully reset password', async () => {
      jest.spyOn(passwordResetService, 'resetPassword').mockResolvedValue({
        success: true,
        message: 'Password has been reset successfully',
        requiresEmailVerification: false,
      });

      const result = await service.resetPassword(resetPasswordDto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password has been reset successfully');
      expect(passwordResetService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
        resetPasswordDto.confirmPassword,
        expect.objectContaining({
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        })
      );
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });

    it('should handle password reset with email verification required', async () => {
      jest.spyOn(passwordResetService, 'resetPassword').mockResolvedValue({
        success: true,
        message: 'Password reset. Please verify your email.',
        requiresEmailVerification: true,
      });

      const result = await service.resetPassword(resetPasswordDto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.requiresEmailVerification).toBe(true);
    });

    it('should throw BadRequestException for invalid token', async () => {
      jest.spyOn(passwordResetService, 'resetPassword').mockRejectedValue(
        new BadRequestException('Invalid or expired reset token')
      );

      await expect(
        service.resetPassword(resetPasswordDto, mockRequest)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle generic errors during password reset', async () => {
      jest.spyOn(passwordResetService, 'resetPassword').mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        service.resetPassword(resetPasswordDto, mockRequest)
      ).rejects.toThrow('Failed to reset password');
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });

    it('should provide default message when success is true but message is missing', async () => {
      jest.spyOn(passwordResetService, 'resetPassword').mockResolvedValue({
        success: true,
        message: undefined,
        requiresEmailVerification: false,
      });

      const result = await service.resetPassword(resetPasswordDto, mockRequest);

      expect(result.message).toBe('Password has been reset successfully');
    });

    it('should provide error message when success is false', async () => {
      jest.spyOn(passwordResetService, 'resetPassword').mockResolvedValue({
        success: false,
        message: undefined,
        error: 'Token expired',
        requiresEmailVerification: false,
      });

      const result = await service.resetPassword(resetPasswordDto, mockRequest);

      expect(result.message).toBe('Token expired');
    });
  });

  describe('resendEmailVerification', () => {
    it('should successfully resend verification email', async () => {
      jest
        .spyOn(emailVerificationService, 'resendVerificationEmail')
        .mockResolvedValue(undefined);

      const result = await service.resendEmailVerification(
        mockUser.id,
        mockRequest
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Verification email sent successfully');
      expect(emailVerificationService.resendVerificationEmail).toHaveBeenCalledWith(
        mockUser.id
      );
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });

    it('should throw BadRequestException if already verified', async () => {
      jest
        .spyOn(emailVerificationService, 'resendVerificationEmail')
        .mockRejectedValue(
          new BadRequestException('Email is already verified')
        );

      await expect(
        service.resendEmailVerification(mockUser.id, mockRequest)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle generic errors', async () => {
      jest
        .spyOn(emailVerificationService, 'resendVerificationEmail')
        .mockRejectedValue(new Error('Email service unavailable'));

      await expect(
        service.resendEmailVerification(mockUser.id, mockRequest)
      ).rejects.toThrow('Failed to resend verification email');
    });
  });

  describe('logout', () => {
    it('should successfully logout and log event', async () => {
      await service.logout(mockUser.id, mockRequest);

      expect(auditLogService.logEvent).toHaveBeenCalledWith(
        expect.any(String), // AuditEventType.LOGOUT
        mockRequest,
        {},
        mockUser.id
      );
    });
  });

  describe('verifyEmail - additional tests', () => {
    it('should throw BadRequestException for invalid token', async () => {
      jest
        .spyOn(emailVerificationService, 'verifyEmail')
        .mockRejectedValue(
          new BadRequestException('Invalid verification token')
        );

      await expect(
        service.verifyEmail('invalid-token', mockRequest)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle generic errors', async () => {
      jest
        .spyOn(emailVerificationService, 'verifyEmail')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.verifyEmail('verification-token', mockRequest)
      ).rejects.toThrow('Failed to verify email');
    });
  });

  describe('register - additional tests', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should handle generic errors during registration', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue({
        isValid: true,
        strengthResult: {
          score: 85,
          strength: 'strong',
          feedback: [],
          meets_requirements: true,
        },
        violations: [],
      });
      jest
        .spyOn(passwordSecurityService, 'hashPassword')
        .mockResolvedValue('hashedPassword');
      jest
        .spyOn(userRepository, 'create')
        .mockReturnValue({
          ...mockUser,
          ...registerDto,
          fullName: `${registerDto.firstName} ${registerDto.lastName}`,
          isEmailVerified: false,
          isActive: true
        } as unknown as User);
      jest
        .spyOn(userRepository, 'save')
        .mockRejectedValue(new Error('Database connection error'));

      await expect(service.register(registerDto, mockRequest)).rejects.toThrow(
        'Registration failed'
      );
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      const dtoWithUpperCaseEmail = {
        ...registerDto,
        email: 'NEWUSER@EXAMPLE.COM',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue({
        isValid: true,
        strengthResult: {
          score: 85,
          strength: 'strong',
          feedback: [],
          meets_requirements: true,
        },
        violations: [],
      });
      jest
        .spyOn(passwordSecurityService, 'hashPassword')
        .mockResolvedValue('hashedPassword');
      jest
        .spyOn(userRepository, 'create')
        .mockReturnValue({
          ...mockUser,
          email: 'newuser@example.com',
          fullName: `${registerDto.firstName} ${registerDto.lastName}`,
          isEmailVerified: false,
          isActive: true
        } as unknown as User);
      jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue({
          ...mockUser,
          email: 'newuser@example.com',
          fullName: `${registerDto.firstName} ${registerDto.lastName}`,
          isEmailVerified: false,
          isActive: true
        } as unknown as User);
      jest
        .spyOn(emailVerificationService, 'generateVerificationToken')
        .mockResolvedValue('verification-token');

      await service.register(dtoWithUpperCaseEmail, mockRequest);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });
    });
  });

  describe('login - additional tests', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        get isActive() {
          return this.status === UserStatus.ACTIVE;
        },
      } as User;
      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValue(true);

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException
      );
      expect(auditLogService.logEvent).toHaveBeenCalledWith(
        expect.any(String),
        mockRequest,
        expect.objectContaining({ reason: 'account_inactive' }),
        mockUser.id,
        mockUser.email
      );
    });

    it('should handle generic errors during login', async () => {
      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest
        .spyOn(userRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should normalize email to lowercase', async () => {
      const dtoWithUpperCaseEmail = {
        ...loginDto,
        email: 'TEST@EXAMPLE.COM',
      };

      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValue(true);
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined);

      await service.login(dtoWithUpperCaseEmail, mockRequest);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: expect.any(Array),
      });
    });

    it('should record failed login and trigger account lock', async () => {
      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValue(false);
      jest
        .spyOn(accountLockoutService, 'recordFailedAttempt')
        .mockResolvedValue({
          isLocked: true,
          failedAttempts: 5,
          lockedUntil: new Date(Date.now() + 3600000),
        });

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException
      );
      expect(accountLockoutService.recordFailedAttempt).toHaveBeenCalled();
      expect(auditLogService.logAccountLocked).toHaveBeenCalled();
    });
  });

  describe('changePassword - additional tests', () => {
    const passwordChangeDto = {
      currentPassword: 'oldPassword',
      newPassword: 'NewSecurePass123!',
    };

    it('should throw UnauthorizedException if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.changePassword(mockUser.id, passwordChangeDto, mockRequest)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if password is in history', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValueOnce(true) // current password valid
        .mockResolvedValueOnce(false); // new password is different
      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue({
        isValid: true,
        strengthResult: {
          score: 85,
          strength: 'strong',
          feedback: [],
          meets_requirements: true,
        },
        violations: [],
      });
      jest
        .spyOn(passwordSecurityService, 'isPasswordInHistory')
        .mockResolvedValue(true);

      await expect(
        service.changePassword(mockUser.id, passwordChangeDto, mockRequest)
      ).rejects.toThrow(BadRequestException);
      expect(passwordSecurityService.isPasswordInHistory).toHaveBeenCalledWith(
        mockUser.id,
        passwordChangeDto.newPassword
      );
    });

    it('should handle generic errors during password change', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValueOnce(true) // current password valid
        .mockResolvedValueOnce(false); // new password is different
      jest.spyOn(passwordSecurityService, 'validatePassword').mockResolvedValue({
        isValid: true,
        strengthResult: {
          score: 85,
          strength: 'strong',
          feedback: [],
          meets_requirements: true,
        },
        violations: [],
      });
      jest
        .spyOn(passwordSecurityService, 'isPasswordInHistory')
        .mockResolvedValue(false);
      jest
        .spyOn(passwordSecurityService, 'hashPassword')
        .mockRejectedValue(new Error('Hashing failed'));

      await expect(
        service.changePassword(mockUser.id, passwordChangeDto, mockRequest)
      ).rejects.toThrow('Failed to change password');
    });
  });

  describe('requestPasswordReset - additional tests', () => {
    const passwordResetRequestDto = {
      email: 'test@example.com',
    };

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(passwordResetService, 'requestPasswordReset')
        .mockRejectedValue(new Error('Email service error'));

      await expect(
        service.requestPasswordReset(passwordResetRequestDto, mockRequest)
      ).rejects.toThrow('Failed to process password reset request');
    });

    it('should normalize email to lowercase', async () => {
      const dtoWithUpperCaseEmail = {
        email: 'TEST@EXAMPLE.COM',
      };

      jest
        .spyOn(passwordResetService, 'requestPasswordReset')
        .mockResolvedValue({
          success: true,
          message: 'Password reset email sent',
          token: 'reset-token',
        });

      await service.requestPasswordReset(dtoWithUpperCaseEmail, mockRequest);

      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        })
      );
    });
  });

  describe('getClientIp - private method coverage', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const requestWithForwardedFor = {
        ...mockRequest,
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' },
      } as unknown as Request;

      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValue(true);
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined);

      await service.login(
        { email: 'test@example.com', password: 'pass' },
        requestWithForwardedFor
      );

      // Verify audit log was called (which uses getClientIp internally)
      expect(auditLogService.logLoginSuccess).toHaveBeenCalled();
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is not present', async () => {
      const requestWithRealIp = {
        ...mockRequest,
        headers: { 'x-real-ip': '203.0.113.1' },
      } as unknown as Request;

      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValue(true);
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined);

      await service.login(
        { email: 'test@example.com', password: 'pass' },
        requestWithRealIp
      );

      expect(auditLogService.logLoginSuccess).toHaveBeenCalled();
    });

    it('should use socket remoteAddress as fallback', async () => {
      const requestWithSocket = {
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        headers: {},
        connection: {},
        socket: { remoteAddress: '192.168.1.1' },
      } as unknown as Request;

      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValue(true);
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined);

      await service.login(
        { email: 'test@example.com', password: 'pass' },
        requestWithSocket
      );

      expect(auditLogService.logLoginSuccess).toHaveBeenCalled();
    });
  });

  describe('generateAuthResponse - private method coverage', () => {
    it('should include all user properties in auth response', async () => {
      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValue(true);
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined);

      const result = await service.login(
        { email: 'test@example.com', password: 'pass' },
        mockRequest
      );

      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('firstName');
      expect(result.user).toHaveProperty('lastName');
      expect(result.user).toHaveProperty('fullName');
      expect(result.user).toHaveProperty('isEmailVerified');
      expect(result.user).toHaveProperty('isActive');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.expiresIn).toBe(15 * 60);
    });
  });
});
