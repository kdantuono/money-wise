import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserFactory } from '../../../tests/factories/user.factory';
import { User, UserRole, UserStatus } from '../../core/database/entities/user.entity';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockUser: User = UserFactory.build({
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    let mockContext: jest.Mocked<ExecutionContext>;

    beforeEach(() => {
      mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: { authorization: 'Bearer valid-token' },
          }),
        }),
      } as any;
    });

    it('should allow access to public routes', () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
      expect(result).toBe(true);
    });

    it('should call parent canActivate for protected routes', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const parentCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate'
      ).mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
      expect(parentCanActivateSpy).toHaveBeenCalledWith(mockContext);
      expect(result).toBe(true);

      parentCanActivateSpy.mockRestore();
    });

    it('should handle undefined public decorator', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const parentCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate'
      ).mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(parentCanActivateSpy).toHaveBeenCalledWith(mockContext);
      expect(result).toBe(true);

      parentCanActivateSpy.mockRestore();
    });

    it('should check both handler and class decorators', () => {
      const mockHandler = jest.fn();
      const mockClass = jest.fn();
      mockContext.getHandler.mockReturnValue(mockHandler);
      mockContext.getClass.mockReturnValue(mockClass);

      reflector.getAllAndOverride.mockReturnValue(false);
      const parentCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate'
      ).mockReturnValue(true);

      guard.canActivate(mockContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockHandler,
        mockClass,
      ]);

      parentCanActivateSpy.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication is successful', () => {
      const result = guard.handleRequest(null, mockUser, null, null);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when there is an error', () => {
      const error = new Error('Authentication failed');

      expect(() => {
        guard.handleRequest(error, null, null, null);
      }).toThrow(error);
    });

    it('should throw UnauthorizedException when user is not provided', () => {
      expect(() => {
        guard.handleRequest(null, null, null, null);
      }).toThrow(UnauthorizedException);

      expect(() => {
        guard.handleRequest(null, undefined, null, null);
      }).toThrow(UnauthorizedException);
    });

    it('should throw custom UnauthorizedException when user is missing', () => {
      expect(() => {
        guard.handleRequest(null, null, null, null);
      }).toThrow('Access token required');
    });

    it('should handle different user types', () => {
      const adminUser = UserFactory.build({
        ...mockUser,
        role: UserRole.ADMIN,
      });

      const result = guard.handleRequest(null, adminUser, null, null);
      expect(result).toEqual(adminUser);
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should prioritize error over missing user', () => {
      const authError = new UnauthorizedException('Token expired');

      expect(() => {
        guard.handleRequest(authError, null, null, null);
      }).toThrow(authError);
    });

    it('should handle falsy user values', () => {
      const falsyValues = [false, 0, '', null, undefined];

      for (const falsyValue of falsyValues) {
        expect(() => {
          guard.handleRequest(null, falsyValue, null, null);
        }).toThrow(UnauthorizedException);
      }
    });
  });

  describe('integration scenarios', () => {
    let mockContext: jest.Mocked<ExecutionContext>;

    beforeEach(() => {
      mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: { authorization: 'Bearer valid-token' },
          }),
        }),
      } as any;
    });

    it('should handle mixed public and protected routes in same class', () => {
      // First call - public route
      reflector.getAllAndOverride.mockReturnValueOnce(true);
      let result = guard.canActivate(mockContext);
      expect(result).toBe(true);

      // Second call - protected route
      reflector.getAllAndOverride.mockReturnValueOnce(false);
      const parentCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate'
      ).mockReturnValue(true);

      result = guard.canActivate(mockContext);
      expect(result).toBe(true);

      parentCanActivateSpy.mockRestore();
    });

    it('should work with decorator inheritance', () => {
      // Class has @Public(), method doesn't
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('should handle error cases in canActivate', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const parentCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate'
      ).mockImplementation(() => {
        throw new UnauthorizedException('Invalid token');
      });

      expect(() => {
        guard.canActivate(mockContext);
      }).toThrow(UnauthorizedException);

      parentCanActivateSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle null context gracefully', () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      expect(() => {
        guard.canActivate(null as any);
      }).toThrow();
    });

    it('should handle reflector errors', () => {
      const mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      reflector.getAllAndOverride.mockImplementation(() => {
        throw new Error('Reflector error');
      });

      expect(() => {
        guard.canActivate(mockContext);
      }).toThrow('Reflector error');
    });

    it('should maintain type safety with handleRequest parameters', () => {
      // Test with correct types
      const result = guard.handleRequest(
        null,
        mockUser,
        { name: 'jwt' },
        {} as any,
        200
      );

      expect(result).toEqual(mockUser);
    });
  });
});