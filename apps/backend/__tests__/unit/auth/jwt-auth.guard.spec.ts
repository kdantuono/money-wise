import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '@/auth/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;

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

    // Mock ExecutionContext
    mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
      getType: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as jest.Mocked<ExecutionContext>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      // Mock the reflector to return true for IS_PUBLIC_KEY
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
      expect(result).toBe(true);
    });

    it('should call super.canActivate for protected routes', () => {
      // Mock the reflector to return false/undefined for IS_PUBLIC_KEY
      reflector.getAllAndOverride.mockReturnValue(false);

      // Mock the super.canActivate method
      const superCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate',
      );
      superCanActivateSpy.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
      expect(result).toBe(true);

      superCanActivateSpy.mockRestore();
    });

    it('should handle undefined public key', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const superCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate',
      );
      superCanActivateSpy.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(superCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
      expect(result).toBe(true);

      superCanActivateSpy.mockRestore();
    });

    it('should properly check method and class decorators', () => {
      const mockHandler = jest.fn();
      const mockClass = jest.fn();

      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getClass.mockReturnValue(mockClass);
      reflector.getAllAndOverride.mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockHandler,
        mockClass,
      ]);
    });
  });

  describe('handleRequest', () => {
    it('should return user when no error and user exists', () => {
      const mockUser = { id: '1', email: 'test@example.com' };

      const result = guard.handleRequest(null, mockUser, null, null, null);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when error exists', () => {
      const error = new Error('JWT error');
      const mockUser = { id: '1', email: 'test@example.com' };

      expect(() => {
        guard.handleRequest(error, mockUser, null, null, null);
      }).toThrow(error);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => {
        guard.handleRequest(null, null, null, null, null);
      }).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => {
        guard.handleRequest(null, undefined, null, null, null);
      }).toThrow(UnauthorizedException);
    });

    it('should throw custom UnauthorizedException with proper message', () => {
      try {
        guard.handleRequest(null, null, null, null, null);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('Access token required');
      }
    });

    it('should prioritize original error over missing user', () => {
      const originalError = new UnauthorizedException('Token expired');

      try {
        guard.handleRequest(originalError, null, null, null, null);
      } catch (error) {
        expect(error).toBe(originalError);
      }
    });

    it('should handle falsy user values', () => {
      const falsyValues = [false, 0, '', null, undefined];

      falsyValues.forEach((falsyValue) => {
        expect(() => {
          guard.handleRequest(null, falsyValue, null, null, null);
        }).toThrow(UnauthorizedException);
      });
    });

    it('should handle truthy user values', () => {
      const truthyUsers = [
        { id: '1' },
        { id: '2', name: 'test' },
        { email: 'test@example.com' },
        'string-user', // edge case
        1, // edge case
        true, // edge case
      ];

      truthyUsers.forEach((user) => {
        const result = guard.handleRequest(null, user, null, null, null);
        expect(result).toBe(user);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle public route with missing user gracefully', () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      // Should not call handleRequest for public routes
    });

    it('should handle protected route with valid token', () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const superCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate',
      );
      superCanActivateSpy.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      superCanActivateSpy.mockRestore();
    });
  });
});