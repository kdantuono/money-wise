import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { AuthService, JwtPayload } from '../auth.service';
import { User, UserStatus, UserRole } from '../../core/database/entities/user.entity';
import { UserFactory } from '../../../tests/factories/user.factory';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser: User = UserFactory.build({
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  });

  const mockEnv = {
    JWT_ACCESS_SECRET: 'test-access-secret',
  };

  beforeAll(() => {
    Object.keys(mockEnv).forEach(key => {
      process.env[key] = mockEnv[key as keyof typeof mockEnv];
    });
  });

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
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const validPayload: JwtPayload = {
      sub: '1',
      email: 'test@example.com',
      role: UserRole.USER,
    };

    it('should return user when payload is valid', async () => {
      authService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate(validPayload);

      expect(authService.validateUser).toHaveBeenCalledWith(validPayload);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user validation fails', async () => {
      authService.validateUser.mockRejectedValue(
        new UnauthorizedException('User not found')
      );

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authService.validateUser).toHaveBeenCalledWith(validPayload);
    });

    it('should throw UnauthorizedException when auth service throws other errors', async () => {
      authService.validateUser.mockRejectedValue(
        new Error('Database connection error')
      );

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle malformed payload gracefully', async () => {
      const malformedPayload = {
        sub: '',
        email: 'invalid-email',
        role: 'invalid-role',
      } as JwtPayload;

      authService.validateUser.mockRejectedValue(
        new UnauthorizedException('Invalid payload')
      );

      await expect(strategy.validate(malformedPayload)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should validate payload structure', async () => {
      const validPayloads = [
        {
          sub: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          role: UserRole.USER,
        },
        {
          sub: '987fcdeb-51a2-43d7-8f9e-123456789abc',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
      ];

      for (const payload of validPayloads) {
        authService.validateUser.mockResolvedValue(mockUser);

        const result = await strategy.validate(payload);

        expect(result).toBeDefined();
        expect(authService.validateUser).toHaveBeenCalledWith(payload);
      }
    });
  });

  describe('configuration', () => {
    it('should be configured with correct JWT options', () => {
      // The strategy should be properly configured
      expect(strategy).toBeDefined();
      expect(process.env.JWT_ACCESS_SECRET).toBe('test-access-secret');
    });

    it('should use JWT strategy', () => {
      // Verify the strategy is a JWT strategy
      expect(strategy).toBeInstanceOf(JwtStrategy);
      expect((strategy as any).name).toBe('jwt');
    });
  });

  describe('error scenarios', () => {
    it('should handle network errors from auth service', async () => {
      const payload: JwtPayload = {
        sub: '1',
        email: 'test@example.com',
        role: UserRole.USER,
      };

      authService.validateUser.mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle unexpected errors gracefully', async () => {
      const payload: JwtPayload = {
        sub: '1',
        email: 'test@example.com',
        role: UserRole.USER,
      };

      authService.validateUser.mockImplementation(() => {
        throw null; // Simulate unexpected error
      });

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});