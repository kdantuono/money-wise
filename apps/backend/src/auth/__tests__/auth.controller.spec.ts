import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { AuthSecurityService } from '../auth-security.service';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import {
  User,
  UserStatus,
  UserRole,
} from '../../core/database/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let authSecurityService: jest.Mocked<AuthSecurityService>;
  let mockRequest: Partial<Request>;

  const mockUser: Omit<User, 'passwordHash'> = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
    accounts: [],
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    },
    get isEmailVerified() {
      return this.emailVerifiedAt !== null;
    },
    get isActive() {
      return this.status === UserStatus.ACTIVE;
    },
  } as Omit<User, 'passwordHash'>;

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

      expect(result).toEqual(mockUser);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.fullName).toBe(
        `${mockUser.firstName} ${mockUser.lastName}`
      );
      expect(result.isActive).toBe(true);
    });

    it('should include virtual properties in profile', async () => {
      const userWithData = {
        ...mockUser,
        passwordHash: 'hashedPassword',
        emailVerifiedAt: new Date(),
      } as User;

      const result = await controller.getProfile(userWithData);

      expect(result.fullName).toBe('John Doe');
      expect(result.isEmailVerified).toBe(true);
      expect(result.isActive).toBe(true);
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
        get isEmailVerified() {
          return this.emailVerifiedAt !== null;
        },
      } as User;

      const result = await controller.getProfile(userWithNulls);

      expect(result).toBeDefined();
      expect(result.avatar).toBeNull();
      expect(result.timezone).toBeNull();
      expect(result.isEmailVerified).toBe(false);
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
  });
});
