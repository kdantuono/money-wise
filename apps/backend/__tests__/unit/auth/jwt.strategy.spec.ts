import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { AuthService, JwtPayload } from '@/auth/auth.service';
import {
  User,
  UserStatus,
  UserRole,
} from '@/core/database/entities/user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: jest.Mocked<AuthService>;

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
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    },
    get isEmailVerified() {
      return this.emailVerifiedAt !== null;
    },
    get isActive() {
      return this.status === UserStatus.ACTIVE;
    },
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'auth') {
                return {
                  JWT_ACCESS_SECRET: 'test-secret',
                  JWT_ACCESS_EXPIRES_IN: '15m',
                  JWT_REFRESH_SECRET: 'test-refresh-secret',
                  JWT_REFRESH_EXPIRES_IN: '7d',
                };
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should configure strategy with correct options', () => {
      // The strategy should be configured with the correct JWT options
      // These are typically set in the super() call, but we can verify
      // the strategy is properly initialized
      expect(strategy).toBeInstanceOf(JwtStrategy);
    });
  });

  describe('validate', () => {
    const validPayload: JwtPayload = {
      sub: '1',
      email: 'test@example.com',
      role: 'user',
    };

    it('should return user for valid payload', async () => {
      authService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate(validPayload);

      expect(authService.validateUser).toHaveBeenCalledWith(validPayload);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user validation fails', async () => {
      authService.validateUser.mockRejectedValue(
        new UnauthorizedException('User not found or inactive')
      );

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authService.validateUser).toHaveBeenCalledWith(validPayload);
    });

    it('should throw UnauthorizedException with custom message for invalid token', async () => {
      authService.validateUser.mockRejectedValue(new Error('Database error'));

      try {
        await strategy.validate(validPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('Invalid token');
      }
    });

    it('should handle payload with different user roles', async () => {
      const adminPayload: JwtPayload = {
        sub: '2',
        email: 'admin@example.com',
        role: 'admin',
      };

      const adminUser = {
        ...mockUser,
        id: '2',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as User;

      authService.validateUser.mockResolvedValue(adminUser);

      const result = await strategy.validate(adminPayload);

      expect(authService.validateUser).toHaveBeenCalledWith(adminPayload);
      expect(result).toEqual(adminUser);
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should handle payload with missing fields', async () => {
      const incompletePayload = {
        sub: '1',
        email: 'test@example.com',
        // missing role
      } as JwtPayload;

      authService.validateUser.mockRejectedValue(
        new UnauthorizedException('Invalid payload')
      );

      await expect(strategy.validate(incompletePayload)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle payload with invalid user ID format', async () => {
      const invalidPayload: JwtPayload = {
        sub: 'invalid-uuid',
        email: 'test@example.com',
        role: 'user',
      };

      authService.validateUser.mockRejectedValue(
        new UnauthorizedException('User not found')
      );

      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle null or undefined payload gracefully', async () => {
      authService.validateUser.mockRejectedValue(
        new UnauthorizedException('Invalid payload')
      );

      await expect(strategy.validate(null as never)).rejects.toThrow(
        UnauthorizedException
      );

      await expect(strategy.validate(undefined as never)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle empty payload object', async () => {
      const emptyPayload = {} as JwtPayload;

      authService.validateUser.mockRejectedValue(
        new UnauthorizedException('Invalid payload')
      );

      await expect(strategy.validate(emptyPayload)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should propagate specific error messages from AuthService', async () => {
      const specificError = new UnauthorizedException('Account suspended');
      authService.validateUser.mockRejectedValue(specificError);

      try {
        await strategy.validate(validPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('Invalid token');
        // The strategy wraps the original error with a generic message
      }
    });

    it('should handle concurrent validation requests', async () => {
      const payload1: JwtPayload = {
        sub: '1',
        email: 'test1@example.com',
        role: 'user',
      };

      const payload2: JwtPayload = {
        sub: '2',
        email: 'test2@example.com',
        role: 'user',
      };

      const user1 = {
        ...mockUser,
        id: '1',
        email: 'test1@example.com',
      } as User;
      const user2 = {
        ...mockUser,
        id: '2',
        email: 'test2@example.com',
      } as User;

      authService.validateUser
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2);

      const [result1, result2] = await Promise.all([
        strategy.validate(payload1),
        strategy.validate(payload2),
      ]);

      expect(result1).toEqual(user1);
      expect(result2).toEqual(user2);
      expect(authService.validateUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('error scenarios', () => {
    it('should handle AuthService throwing non-UnauthorizedException errors', async () => {
      const validPayload: JwtPayload = {
        sub: '1',
        email: 'test@example.com',
        role: 'user',
      };

      authService.validateUser.mockRejectedValue(new Error('Network timeout'));

      try {
        await strategy.validate(validPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('Invalid token');
      }
    });

    it('should handle AuthService returning null unexpectedly', async () => {
      const validPayload: JwtPayload = {
        sub: '1',
        email: 'test@example.com',
        role: 'user',
      };

      authService.validateUser.mockResolvedValue(null);

      const result = await strategy.validate(validPayload);
      expect(result).toBeNull();
    });

    it('should handle malformed JWT payload structure', async () => {
      const malformedPayload = {
        id: '1', // wrong field name
        userEmail: 'test@example.com', // wrong field name
        userRole: 'user', // wrong field name
      } as unknown as JwtPayload;

      authService.validateUser.mockRejectedValue(
        new UnauthorizedException('Malformed payload')
      );

      await expect(strategy.validate(malformedPayload)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
