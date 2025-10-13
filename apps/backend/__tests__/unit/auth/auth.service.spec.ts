import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { PasswordSecurityService } from '@/auth/services/password-security.service';
import { RateLimitService } from '@/auth/services/rate-limit.service';
import { PrismaUserService } from '@/core/database/prisma/services/user.service';
import { PrismaAuditLogService } from '@/core/database/prisma/services/audit-log.service';
import type { User, AuditLog } from '../../../generated/prisma';
import { UserStatus, UserRole } from '../../../generated/prisma';
import { RegisterDto } from '@/auth/dto/register.dto';
import { LoginDto } from '@/auth/dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let prismaUserService: jest.Mocked<PrismaUserService>;
  let prismaAuditLogService: jest.Mocked<PrismaAuditLogService>;
  let jwtService: jest.Mocked<JwtService>;
  let passwordSecurityService: jest.Mocked<PasswordSecurityService>;
  let rateLimitService: jest.Mocked<RateLimitService>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashedPassword',
    role: UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    currency: 'USD',
    timezone: 'UTC',
    avatar: null,
    preferences: null,
    lastLoginAt: null,
    emailVerifiedAt: null,
    familyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaUserService,
          useValue: {
            findByEmail: jest.fn(),
            findOne: jest.fn(),
            createWithHash: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: PrismaAuditLogService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: PasswordSecurityService,
          useValue: {
            validatePassword: jest.fn().mockResolvedValue({
              isValid: true,
              strengthResult: { score: 80, meets_requirements: true, feedback: [] },
              violations: []
            }),
            hashPassword: jest.fn().mockResolvedValue('hashedPassword'),
            verifyPassword: jest.fn().mockResolvedValue(true),
            isPasswordExpired: jest.fn().mockResolvedValue(false),
            shouldWarnPasswordExpiry: jest.fn().mockResolvedValue(false),
            getDaysUntilExpiration: jest.fn().mockResolvedValue(90),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 5 }),
            recordAttempt: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                auth: {
                  JWT_ACCESS_SECRET: 'test-access-secret',
                  JWT_ACCESS_EXPIRES_IN: '15m',
                  JWT_REFRESH_SECRET: 'test-refresh-secret',
                  JWT_REFRESH_EXPIRES_IN: '7d',
                },
              };
              return config[key] || config;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaUserService = module.get(PrismaUserService);
    prismaAuditLogService = module.get(PrismaAuditLogService);
    jwtService = module.get(JwtService);
    passwordSecurityService = module.get(PasswordSecurityService);
    rateLimitService = module.get(RateLimitService);
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
      prismaUserService.findByEmail.mockResolvedValue(null);
      prismaUserService.createWithHash.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register(registerDto);

      expect(prismaUserService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(prismaUserService.createWithHash).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw ConflictException if user already exists', async () => {
      prismaUserService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaUserService.findByEmail).toHaveBeenCalledWith(registerDto.email);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      prismaUserService.findByEmail.mockResolvedValue(mockUser);
      prismaUserService.updateLastLogin.mockResolvedValue(undefined);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(prismaUserService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(prismaUserService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prismaUserService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      prismaUserService.findByEmail.mockResolvedValue(mockUser);
      passwordSecurityService.verifyPassword.mockResolvedValueOnce(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
      } as User;
      prismaUserService.findByEmail.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';
    const payload = {
      sub: '1',
      email: 'test@example.com',
      role: 'user',
    };

    beforeEach(() => {
      process.env.JWT_REFRESH_SECRET = 'refresh-secret';
    });

    it('should refresh token successfully with valid refresh token', async () => {
      jwtService.verify.mockReturnValue(payload);
      prismaUserService.findOne.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('new-jwt-token');

      const result = await service.refreshToken(refreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-refresh-secret',
      });
      expect(prismaUserService.findOne).toHaveBeenCalledWith(payload.sub);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException with invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      jwtService.verify.mockReturnValue(payload);
      prismaUserService.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
      } as User;
      jwtService.verify.mockReturnValue(payload);
      prismaUserService.findOne.mockResolvedValue(inactiveUser);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with expired refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    const payload = {
      sub: '1',
      email: 'test@example.com',
      role: 'user',
    };

    it('should return user if valid', async () => {
      prismaUserService.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(prismaUserService.findOne).toHaveBeenCalledWith(payload.sub);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prismaUserService.findOne.mockResolvedValue(null);

      await expect(service.validateUser(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
      } as User;
      prismaUserService.findOne.mockResolvedValue(inactiveUser);

      await expect(service.validateUser(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('generateAuthResponse', () => {
    beforeEach(() => {
      process.env.JWT_ACCESS_SECRET = 'access-secret';
      process.env.JWT_REFRESH_SECRET = 'refresh-secret';
      process.env.JWT_ACCESS_EXPIRES_IN = '15m';
      process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    });

    it('should generate proper auth response with tokens', async () => {
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      // Test via register since generateAuthResponse is private
      prismaUserService.findByEmail.mockResolvedValue(null);
      prismaUserService.createWithHash.mockResolvedValue(mockUser);

      const registerDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
      };

      const result = await service.register(registerDto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        },
        {
          secret: 'test-access-secret',
          expiresIn: '15m',
        },
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        },
        {
          secret: 'test-refresh-secret',
          expiresIn: '7d',
        },
      );
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.expiresIn).toBe(15 * 60);
      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.firstName).toBe(mockUser.firstName);
      expect(result.user.lastName).toBe(mockUser.lastName);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('error scenarios', () => {
    it('should handle password hashing errors during registration', async () => {
      const registerDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
      };

      prismaUserService.findByEmail.mockResolvedValue(null);
      passwordSecurityService.hashPassword.mockRejectedValueOnce(new Error('Hashing error'));

      await expect(service.register(registerDto)).rejects.toThrow('Hashing error');
    });

    it('should handle database errors during user creation', async () => {
      const registerDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
      };

      prismaUserService.findByEmail.mockResolvedValue(null);
      prismaUserService.createWithHash.mockRejectedValue(new Error('Database error'));

      await expect(service.register(registerDto)).rejects.toThrow('Database error');
    });

    it('should handle password verification errors during login', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      prismaUserService.findByEmail.mockResolvedValue(mockUser);
      passwordSecurityService.verifyPassword.mockRejectedValueOnce(new Error('Verification error'));

      await expect(service.login(loginDto)).rejects.toThrow('Verification error');
    });
  });
});