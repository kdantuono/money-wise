import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '@/auth/auth.service';
import { PasswordSecurityService } from '@/auth/services/password-security.service';
import { RateLimitService } from '@/auth/services/rate-limit.service';
import { User, UserStatus, UserRole } from '@/core/database/entities/user.entity';
import { AuditLog } from '@/core/database/entities/audit-log.entity';
import { RegisterDto } from '@/auth/dto/register.dto';
import { LoginDto } from '@/auth/dto/login.dto';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
const mockedBcrypt = bcrypt as unknown as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashedPassword',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
    accounts: [],
    get fullName() { return `${this.firstName} ${this.lastName}`; },
    get isEmailVerified() { return this.emailVerifiedAt !== null; },
    get isActive() { return this.status === UserStatus.ACTIVE; },
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
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
          provide: getRepositoryToken(AuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
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
            validatePasswordStrength: jest.fn().mockResolvedValue({ isValid: true }),
            hashPassword: jest.fn(),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkLimit: jest.fn().mockResolvedValue(true),
            increment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
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
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register(registerDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw ConflictException if user already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(undefined);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        select: ['id', 'email', 'firstName', 'lastName', 'passwordHash', 'role', 'status'],
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        lastLoginAt: expect.any(Date),
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        get isActive() { return this.status === UserStatus.ACTIVE; }
      } as User;
      userRepository.findOne.mockResolvedValue(inactiveUser);

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
      userRepository.findOne.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('new-jwt-token');

      const result = await service.refreshToken(refreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: payload.sub },
      });
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
        secret: process.env.JWT_REFRESH_SECRET,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      jwtService.verify.mockReturnValue(payload);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        get isActive() { return this.status === UserStatus.ACTIVE; }
      } as User;
      jwtService.verify.mockReturnValue(payload);
      userRepository.findOne.mockResolvedValue(inactiveUser);

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
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: payload.sub },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.validateUser(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        get isActive() { return this.status === UserStatus.ACTIVE; }
      } as User;
      userRepository.findOne.mockResolvedValue(inactiveUser);

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
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

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
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
        },
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
        },
      );
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.expiresIn).toBe(15 * 60);
      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.fullName).toBe(`${mockUser.firstName} ${mockUser.lastName}`);
      expect(result.user.isEmailVerified).toBeDefined();
      expect(result.user.isActive).toBeDefined();
    });
  });

  describe('error scenarios', () => {
    it('should handle bcrypt hashing errors during registration', async () => {
      const registerDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
      };

      userRepository.findOne.mockResolvedValue(null);
      (mockedBcrypt.hash as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      await expect(service.register(registerDto)).rejects.toThrow('Bcrypt error');
    });

    it('should handle database errors during user creation', async () => {
      const registerDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockRejectedValue(new Error('Database error'));
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      await expect(service.register(registerDto)).rejects.toThrow('Database error');
    });

    it('should handle bcrypt comparison errors during login', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      await expect(service.login(loginDto)).rejects.toThrow('Bcrypt error');
    });
  });
});