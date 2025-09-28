import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthSecurityService } from './auth-security.service';
import { PasswordSecurityService } from './services/password-security.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { AuditLogService } from './services/audit-log.service';
import { User, UserStatus, UserRole } from '../core/database/entities/user.entity';

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
    get fullName() { return `${this.firstName} ${this.lastName}`; },
    get isEmailVerified() { return !!this.emailVerifiedAt; },
    get isActive() { return this.status === UserStatus.ACTIVE; },
  } as User;

  const mockRequest = {
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('Mozilla/5.0'),
    headers: {},
    connection: { remoteAddress: '127.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' },
  } as any;

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
            get: jest.fn().mockReturnValue('test-value'),
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
    passwordSecurityService = module.get<PasswordSecurityService>(PasswordSecurityService);
    accountLockoutService = module.get<AccountLockoutService>(AccountLockoutService);
    emailVerificationService = module.get<EmailVerificationService>(EmailVerificationService);
    passwordResetService = module.get<PasswordResetService>(PasswordResetService);
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
      jest.spyOn(passwordSecurityService, 'validatePassword').mockReturnValue({
        score: 85,
        strength: 'strong',
        feedback: [],
        meets_requirements: true,
      });
      jest.spyOn(passwordSecurityService, 'hashPassword').mockResolvedValue('hashedPassword');
      jest.spyOn(userRepository, 'create').mockReturnValue({ ...mockUser, ...registerDto } as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...mockUser, ...registerDto } as User);
      jest.spyOn(emailVerificationService, 'generateVerificationToken').mockResolvedValue('verification-token');

      const result = await service.register(registerDto, mockRequest);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email.toLowerCase());
    });

    it('should throw ConflictException if user already exists', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.register(registerDto, mockRequest)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for weak password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(passwordSecurityService, 'validatePassword').mockReturnValue({
        score: 30,
        strength: 'weak',
        feedback: ['Password is too weak'],
        meets_requirements: false,
      });

      await expect(service.register(registerDto, mockRequest)).rejects.toThrow(BadRequestException);
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
      jest.spyOn(passwordSecurityService, 'verifyPassword').mockResolvedValue(true);
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

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(UnauthorizedException);
    });

    it('should record failed attempt on invalid password', async () => {
      jest.spyOn(accountLockoutService, 'getLockoutInfo').mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(passwordSecurityService, 'verifyPassword').mockResolvedValue(false);
      jest.spyOn(accountLockoutService, 'recordFailedAttempt').mockResolvedValue({
        isLocked: false,
        failedAttempts: 1,
      });

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(UnauthorizedException);
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
      jest.spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValueOnce(true) // current password valid
        .mockResolvedValueOnce(false); // new password is different
      jest.spyOn(passwordSecurityService, 'validatePassword').mockReturnValue({
        score: 85,
        strength: 'strong',
        feedback: [],
        meets_requirements: true,
      });
      jest.spyOn(passwordSecurityService, 'isPasswordInHistory').mockResolvedValue(false);
      jest.spyOn(passwordSecurityService, 'hashPassword').mockResolvedValue('newHashedPassword');
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined);

      const result = await service.changePassword(mockUser.id, passwordChangeDto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');
      expect(auditLogService.logPasswordChange).toHaveBeenCalledWith(mockRequest, mockUser.id, mockUser.email, true);
    });

    it('should throw UnauthorizedException for invalid current password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(passwordSecurityService, 'verifyPassword').mockResolvedValue(false);

      await expect(service.changePassword(mockUser.id, passwordChangeDto, mockRequest)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for weak new password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(passwordSecurityService, 'verifyPassword').mockResolvedValue(true);
      jest.spyOn(passwordSecurityService, 'validatePassword').mockReturnValue({
        score: 30,
        strength: 'weak',
        feedback: ['Password is too weak'],
        meets_requirements: false,
      });

      await expect(service.changePassword(mockUser.id, passwordChangeDto, mockRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if new password is same as current', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(passwordSecurityService, 'verifyPassword')
        .mockResolvedValueOnce(true) // current password valid
        .mockResolvedValueOnce(true); // new password is same
      jest.spyOn(passwordSecurityService, 'validatePassword').mockReturnValue({
        score: 85,
        strength: 'strong',
        feedback: [],
        meets_requirements: true,
      });

      await expect(service.changePassword(mockUser.id, passwordChangeDto, mockRequest)).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestPasswordReset', () => {
    const passwordResetRequestDto = {
      email: 'test@example.com',
    };

    it('should request password reset', async () => {
      jest.spyOn(passwordResetService, 'requestPasswordReset').mockResolvedValue({
        token: 'reset-token',
        expiresIn: 1800,
      });

      const result = await service.requestPasswordReset(passwordResetRequestDto, mockRequest);

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
      jest.spyOn(emailVerificationService, 'verifyEmail').mockResolvedValue(verificationResult);

      const result = await service.verifyEmail('verification-token', mockRequest);

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
        score: 85,
        strength: 'strong' as const,
        feedback: [],
        meets_requirements: true,
      };

      jest.spyOn(passwordSecurityService, 'validatePassword').mockReturnValue(strengthResult);

      const result = await service.checkPasswordStrength(passwordStrengthDto);

      expect(result).toEqual(strengthResult);
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      const payload = { sub: mockUser.id, email: mockUser.email, role: mockUser.role };
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

      await expect(service.refreshToken('invalid-token', mockRequest)).rejects.toThrow(UnauthorizedException);
    });
  });
});