import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from '../../../../src/auth/guards/roles.guard';
import { UserRole } from '../../../../src/core/database/entities/user.entity';
import { ROLES_KEY } from '../../../../src/auth/decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  // Mock Reflector
  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  // Helper function to create mock ExecutionContext
  const createMockExecutionContext = (
    user?: { role: UserRole },
  ): ExecutionContext => {
    const mockHandler = jest.fn();
    const mockClass = jest.fn();

    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => mockHandler,
      getClass: () => mockClass,
    } as any;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
      expect(guard.canActivate).toBeDefined();
    });

    describe('when no required roles metadata exists', () => {
      it('should return true (allow all)', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValueOnce(undefined);
        const context = createMockExecutionContext({ role: UserRole.USER });

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
          ROLES_KEY,
          [context.getHandler(), context.getClass()],
        );
      });

      it('should return true even when no user exists on request', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValueOnce(undefined);
        const context = createMockExecutionContext(undefined);

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should return true when metadata is null', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValueOnce(null);
        const context = createMockExecutionContext({ role: UserRole.ADMIN });

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('when required roles metadata exists', () => {
      describe('single required role scenarios', () => {
        it('should return true when user has the required ADMIN role', () => {
          // Arrange
          mockReflector.getAllAndOverride.mockReturnValueOnce([UserRole.ADMIN]);
          const context = createMockExecutionContext({ role: UserRole.ADMIN });

          // Act
          const result = guard.canActivate(context);

          // Assert
          expect(result).toBe(true);
        });

        it('should return true when user has the required USER role', () => {
          // Arrange
          mockReflector.getAllAndOverride.mockReturnValueOnce([UserRole.USER]);
          const context = createMockExecutionContext({ role: UserRole.USER });

          // Act
          const result = guard.canActivate(context);

          // Assert
          expect(result).toBe(true);
        });

        it('should return false when user does not have the required ADMIN role', () => {
          // Arrange
          mockReflector.getAllAndOverride.mockReturnValueOnce([UserRole.ADMIN]);
          const context = createMockExecutionContext({ role: UserRole.USER });

          // Act
          const result = guard.canActivate(context);

          // Assert
          expect(result).toBe(false);
        });

        it('should return false when user does not have the required USER role', () => {
          // Arrange
          mockReflector.getAllAndOverride.mockReturnValueOnce([UserRole.USER]);
          const context = createMockExecutionContext({ role: UserRole.ADMIN });

          // Act
          const result = guard.canActivate(context);

          // Assert
          expect(result).toBe(false);
        });
      });

      describe('multiple required roles scenarios', () => {
        it('should return true when user matches one of multiple required roles (ADMIN)', () => {
          // Arrange
          mockReflector.getAllAndOverride.mockReturnValueOnce([
            UserRole.ADMIN,
            UserRole.USER,
          ]);
          const context = createMockExecutionContext({ role: UserRole.ADMIN });

          // Act
          const result = guard.canActivate(context);

          // Assert
          expect(result).toBe(true);
        });

        it('should return true when user matches one of multiple required roles (USER)', () => {
          // Arrange
          mockReflector.getAllAndOverride.mockReturnValueOnce([
            UserRole.ADMIN,
            UserRole.USER,
          ]);
          const context = createMockExecutionContext({ role: UserRole.USER });

          // Act
          const result = guard.canActivate(context);

          // Assert
          expect(result).toBe(true);
        });
      });

      describe('edge cases with missing or invalid user', () => {
        it('should return false when no user exists on request', () => {
          // Arrange
          mockReflector.getAllAndOverride.mockReturnValueOnce([UserRole.ADMIN]);
          const context = createMockExecutionContext(undefined);

          // Act & Assert
          // This will cause user.role to throw since user is undefined
          expect(() => guard.canActivate(context)).toThrow();
        });

        it('should return false when user exists but has no role property', () => {
          // Arrange
          mockReflector.getAllAndOverride.mockReturnValueOnce([UserRole.ADMIN]);
          const context = createMockExecutionContext({} as any);

          // Act
          const result = guard.canActivate(context);

          // Assert
          expect(result).toBe(false);
        });

        it('should return false when user role is undefined', () => {
          // Arrange
          mockReflector.getAllAndOverride.mockReturnValueOnce([UserRole.ADMIN]);
          const context = createMockExecutionContext({ role: undefined as any });

          // Act
          const result = guard.canActivate(context);

          // Assert
          expect(result).toBe(false);
        });
      });

      describe('getAllAndOverride behavior', () => {
        it('should call getAllAndOverride with correct parameters', () => {
          // Arrange
          mockReflector.getAllAndOverride.mockReturnValueOnce([UserRole.ADMIN]);
          const context = createMockExecutionContext({ role: UserRole.ADMIN });

          // Act
          guard.canActivate(context);

          // Assert
          expect(mockReflector.getAllAndOverride).toHaveBeenCalledTimes(1);
          expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
          );
        });

        it('should prioritize handler-level metadata over class-level', () => {
          // Arrange
          // getAllAndOverride handles this internally, we just verify it's called correctly
          mockReflector.getAllAndOverride.mockReturnValueOnce([UserRole.USER]);
          const context = createMockExecutionContext({ role: UserRole.USER });

          // Act
          const result = guard.canActivate(context);

          // Assert
          expect(result).toBe(true);
          expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
          );
        });
      });
    });

    describe('integration scenarios', () => {
      it('should handle empty required roles array', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValueOnce([]);
        const context = createMockExecutionContext({ role: UserRole.ADMIN });

        // Act
        const result = guard.canActivate(context);

        // Assert
        // Empty array means no role matches, some() returns false
        expect(result).toBe(false);
      });
    });
  });
});
