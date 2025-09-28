import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService, JwtPayload } from './auth.service';
import { User, UserStatus, UserRole } from '../core/database/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserFactory } from '../../tests/factories/user.factory';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  genSalt: jest.fn(),
}));
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock environment variables
const mockEnv = {
  JWT_ACCESS_SECRET: 'test-access-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

Object.keys(mockEnv).forEach(key => {
  process.env[key] = mockEnv[key as keyof typeof mockEnv];
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = UserFactory.build({
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashedPassword',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    currency: 'USD',
    lastLoginAt: new Date('2023-01-01'),
    emailVerifiedAt: new Date('2023-01-01'),
  });

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
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
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

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';
    const payload: JwtPayload = {
      sub: '1',
      email: 'test@example.com',
      role: UserRole.USER,
    };

    it('should refresh token successfully', async () => {
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
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      jwtService.verify.mockReturnValue(payload);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const inactiveUser = UserFactory.build({
        ...mockUser,
        status: UserStatus.INACTIVE,
      });
      jwtService.verify.mockReturnValue(payload);
      userRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('generateAuthResponse', () => {
    it('should generate complete auth response with tokens and user data', async () => {
      jwtService.sign.mockImplementation((payload, options) => {
        if (options?.secret === process.env.JWT_ACCESS_SECRET) {
          return 'access-token';
        }
        return 'refresh-token';
      });

      // Use reflection to access private method
      const result = await (service as any).generateAuthResponse(mockUser);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('expiresIn', 15 * 60);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).toHaveProperty('fullName');
      expect(result.user).toHaveProperty('isEmailVerified');
      expect(result.user).toHaveProperty('isActive');
    });

    it('should include virtual properties in user response', async () => {
      jwtService.sign.mockReturnValue('token');

      const result = await (service as any).generateAuthResponse(mockUser);

      expect(result.user.fullName).toBe(`${mockUser.firstName} ${mockUser.lastName}`);
      expect(result.user.isEmailVerified).toBe(true);
      expect(result.user.isActive).toBe(true);
    });
  });

  describe('password hashing', () => {
    it('should hash password with correct salt rounds', async () => {
      const registerDto: RegisterDto = {
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        password: 'Password123!',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jwtService.sign.mockReturnValue('jwt-token');

      await service.register(registerDto);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle database errors during registration', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.save.mockRejectedValue(new Error('Database error'));
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      await expect(service.register(registerDto)).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle database errors during login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.login(loginDto)).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle bcrypt comparison errors', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockRejectedValue(
        new Error('Bcrypt error')
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        'Bcrypt error'
      );
    });

    it('should handle JWT signing errors', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing error');
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        'JWT signing error'
      );
    });
  });

  describe('user validation scenarios', () => {
    it('should handle user with different statuses', async () => {
      const testCases = [
        { status: UserStatus.SUSPENDED, shouldThrow: true },
        { status: UserStatus.INACTIVE, shouldThrow: true },
        { status: UserStatus.ACTIVE, shouldThrow: false },
      ];

      for (const testCase of testCases) {
        const user = UserFactory.build({
          ...mockUser,
          status: testCase.status,
        });

        const payload: JwtPayload = {
          sub: user.id,
          email: user.email,
          role: user.role,
        };

        userRepository.findOne.mockResolvedValue(user);

        if (testCase.shouldThrow) {
          await expect(service.validateUser(payload)).rejects.toThrow(
            UnauthorizedException
          );
        } else {
          const result = await service.validateUser(payload);
          expect(result).toEqual(user);
        }
      }
    });

    it('should handle different user roles', async () => {
      const roles = [UserRole.USER, UserRole.ADMIN];

      for (const role of roles) {
        const user = UserFactory.build({
          ...mockUser,
          role,
        });

        const payload: JwtPayload = {
          sub: user.id,
          email: user.email,
          role,
        };

        userRepository.findOne.mockResolvedValue(user);

        const result = await service.validateUser(payload);
        expect(result.role).toBe(role);
      }
    });
  });

  describe('token expiration and lifecycle', () => {
    it('should create tokens with correct expiration times', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jwtService.sign.mockReturnValue('jwt-token');

      await service.register(registerDto);

      // Verify access token creation
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        }),
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
        }
      );

      // Verify refresh token creation
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        }),
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
        }
      );
    });
  });

  describe('security validations', () => {
    it('should not expose sensitive data in responses', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register(registerDto);

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(result)).not.toContain('hashedPassword');
    });

    it('should update lastLoginAt on successful login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(undefined);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt-token');

      await service.login(loginDto);

      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        {
          lastLoginAt: expect.any(Date),
        }
      );
    });

    it('should use generic error messages for security', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid email or password'
      );

      // Test wrong password
      userRepository.findOne.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid email or password'
      );
    });
  });
});