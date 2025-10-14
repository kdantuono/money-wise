import { JwtService } from '@nestjs/jwt';
import { Repository, EntityManager, EntityMetadata } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User, UserStatus, UserRole } from '../../../generated/prisma';
import { RegisterDto } from '../../dto/register.dto';
import { LoginDto } from '../../dto/login.dto';
import { AuthResponseDto } from '../../dto/auth-response.dto';
import { JwtPayload } from '../../auth.service';

/**
 * Factory class for creating test data and utilities for authentication tests
 */
export class AuthTestFactory {
  /**
   * Create a mock user with default or custom properties
   */
  static createMockUser(overrides: Partial<User> = {}): User {
    const defaultUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: 'hashedPassword123',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      currency: 'USD',
      avatar: null,
      timezone: 'UTC',
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          categories: true,
          budgets: true,
        },
      },
      lastLoginAt: null,
      emailVerifiedAt: null,
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      accounts: [],
      get fullName() { return `${this.firstName} ${this.lastName}`; },
      get isEmailVerified() { return this.emailVerifiedAt !== null; },
      get isActive() { return this.status === UserStatus.ACTIVE; },
      ...overrides,
    } as User;

    return defaultUser;
  }

  /**
   * Create multiple mock users with unique emails
   */
  static createMockUsers(count: number, baseOverrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, (_, index) =>
      this.createMockUser({
        id: `user-${index + 1}`,
        email: `test${index + 1}@example.com`,
        firstName: `User${index + 1}`,
        ...baseOverrides,
      })
    );
  }

  /**
   * Create a valid RegisterDto for testing
   */
  static createRegisterDto(overrides: Partial<RegisterDto> = {}): RegisterDto {
    return {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'Password123!',
      ...overrides,
    };
  }

  /**
   * Create multiple unique RegisterDto objects
   */
  static createRegisterDtos(count: number, baseOverrides: Partial<RegisterDto> = {}): RegisterDto[] {
    return Array.from({ length: count }, (_, index) =>
      this.createRegisterDto({
        email: `test${index + 1}@example.com`,
        firstName: `User${index + 1}`,
        ...baseOverrides,
      })
    );
  }

  /**
   * Create a valid LoginDto for testing
   */
  static createLoginDto(overrides: Partial<LoginDto> = {}): LoginDto {
    return {
      email: 'test@example.com',
      password: 'Password123!',
      ...overrides,
    };
  }

  /**
   * Create a mock AuthResponseDto
   */
  static createAuthResponse(user: User, tokenOverrides: Partial<AuthResponseDto> = {}): AuthResponseDto {
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      timezone: user.timezone,
      currency: user.currency,
      preferences: user.preferences,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      accounts: user.accounts,
      fullName: user.fullName,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
    };

    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: userWithoutPassword,
      expiresIn: 900, // 15 minutes
      ...tokenOverrides,
    };
  }

  /**
   * Create a JWT payload for testing
   */
  static createJwtPayload(user: User, overrides: Partial<JwtPayload> = {}): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      ...overrides,
    };
  }

  /**
   * Create invalid RegisterDto examples for validation testing
   */
  static createInvalidRegisterDtos(): Array<{ dto: Partial<RegisterDto>; expectedErrors: string[] }> {
    return [
      {
        dto: { email: 'invalid-email', firstName: 'John', lastName: 'Doe', password: 'Password123!' },
        expectedErrors: ['email must be an email'],
      },
      {
        dto: { email: 'test@example.com', firstName: 'A', lastName: 'Doe', password: 'Password123!' },
        expectedErrors: ['firstName must be longer than or equal to 2 characters'],
      },
      {
        dto: { email: 'test@example.com', firstName: 'John', lastName: 'B', password: 'Password123!' },
        expectedErrors: ['lastName must be longer than or equal to 2 characters'],
      },
      {
        dto: { email: 'test@example.com', firstName: 'John', lastName: 'Doe', password: 'weak' },
        expectedErrors: ['password must be longer than or equal to 8 characters'],
      },
      {
        dto: { email: 'test@example.com', firstName: 'John', lastName: 'Doe', password: 'weakpassword' },
        expectedErrors: ['Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'],
      },
      {
        dto: { firstName: 'John', lastName: 'Doe', password: 'Password123!' },
        expectedErrors: ['email should not be empty', 'email must be an email'],
      },
      {
        dto: { email: 'test@example.com', lastName: 'Doe', password: 'Password123!' },
        expectedErrors: ['firstName should not be empty'],
      },
    ];
  }

  /**
   * Create invalid LoginDto examples for validation testing
   */
  static createInvalidLoginDtos(): Array<{ dto: Partial<LoginDto>; expectedErrors: string[] }> {
    return [
      {
        dto: { email: 'invalid-email', password: 'Password123!' },
        expectedErrors: ['email must be an email'],
      },
      {
        dto: { email: 'test@example.com', password: '' },
        expectedErrors: ['password must be longer than or equal to 1 characters'],
      },
      {
        dto: { password: 'Password123!' },
        expectedErrors: ['email should not be empty', 'email must be an email'],
      },
      {
        dto: { email: 'test@example.com' },
        expectedErrors: ['password should not be empty'],
      },
      {
        dto: {},
        expectedErrors: ['email should not be empty', 'email must be an email', 'password should not be empty'],
      },
    ];
  }

  /**
   * Setup mock repository with common methods
   */
  static setupMockRepository(): jest.Mocked<Repository<User>> {
    return {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      query: jest.fn(),
      manager: {} as EntityManager,
      metadata: {} as EntityMetadata,
      target: User,
      createQueryBuilder: jest.fn(),
      clear: jest.fn(),
      increment: jest.fn(),
      decrement: jest.fn(),
      insert: jest.fn(),
      upsert: jest.fn(),
      recover: jest.fn(),
      restore: jest.fn(),
      softDelete: jest.fn(),
      softRemove: jest.fn(),
      remove: jest.fn(),
      preload: jest.fn(),
      findOneBy: jest.fn(),
      findBy: jest.fn(),
      findAndCount: jest.fn(),
      findAndCountBy: jest.fn(),
      findOneOrFail: jest.fn(),
      findOneByOrFail: jest.fn(),
      countBy: jest.fn(),
      sum: jest.fn(),
      average: jest.fn(),
      minimum: jest.fn(),
      maximum: jest.fn(),
      exist: jest.fn(),
      existsBy: jest.fn(),
      extend: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;
  }

  /**
   * Setup mock JWT service
   */
  static setupMockJwtService(): jest.Mocked<JwtService> {
    return {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
      verify: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
  }

  /**
   * Setup mock bcrypt functions
   */
  static setupMockBcrypt() {
    const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
    mockedBcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');
    mockedBcrypt.compare = jest.fn().mockResolvedValue(true);
    return mockedBcrypt;
  }

  /**
   * Create test users with different statuses
   */
  static createUsersWithDifferentStatuses(): Record<UserStatus, User> {
    return {
      [UserStatus.ACTIVE]: this.createMockUser({
        id: 'active-user',
        email: 'active@example.com',
        status: UserStatus.ACTIVE,
      }),
      [UserStatus.INACTIVE]: this.createMockUser({
        id: 'inactive-user',
        email: 'inactive@example.com',
        status: UserStatus.INACTIVE,
      }),
      [UserStatus.SUSPENDED]: this.createMockUser({
        id: 'suspended-user',
        email: 'suspended@example.com',
        status: UserStatus.SUSPENDED,
      }),
    };
  }

  /**
   * Create test users with different roles
   */
  static createUsersWithDifferentRoles(): Record<UserRole, User> {
    return {
      [UserRole.USER]: this.createMockUser({
        id: 'regular-user',
        email: 'user@example.com',
        role: UserRole.USER,
      }),
      [UserRole.ADMIN]: this.createMockUser({
        id: 'admin-user',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      }),
    };
  }

  /**
   * Create environment variables for testing
   */
  static setupTestEnvironment(): void {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  }

  /**
   * Clean up environment variables after testing
   */
  static cleanupTestEnvironment(): void {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_ACCESS_EXPIRES_IN;
    delete process.env.JWT_REFRESH_EXPIRES_IN;
  }

  /**
   * Create a realistic test scenario with multiple users and various states
   */
  static createTestScenario() {
    const adminUser = this.createMockUser({
      id: 'admin-1',
      email: 'admin@company.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    });

    const regularUser = this.createMockUser({
      id: 'user-1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.USER,
      emailVerifiedAt: new Date(),
    });

    const newUser = this.createMockUser({
      id: 'user-2',
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.USER,
      emailVerifiedAt: null,
      lastLoginAt: null,
    });

    const inactiveUser = this.createMockUser({
      id: 'user-3',
      email: 'inactive@example.com',
      firstName: 'Inactive',
      lastName: 'User',
      status: UserStatus.INACTIVE,
    });

    return {
      adminUser,
      regularUser,
      newUser,
      inactiveUser,
      allUsers: [adminUser, regularUser, newUser, inactiveUser],
    };
  }
}

/**
 * Test utility functions for authentication
 */
export class AuthTestUtils {
  /**
   * Generate a valid JWT token for testing
   */
  static generateTestJwtToken(jwtService: JwtService, payload: JwtPayload, secret?: string): string {
    return jwtService.sign(payload, {
      secret: secret || process.env.JWT_ACCESS_SECRET || 'test-secret',
      expiresIn: '15m',
    });
  }

  /**
   * Generate an expired JWT token for testing
   */
  static generateExpiredJwtToken(jwtService: JwtService, payload: JwtPayload, secret?: string): string {
    return jwtService.sign(payload, {
      secret: secret || process.env.JWT_ACCESS_SECRET || 'test-secret',
      expiresIn: '-1h', // Already expired
    });
  }

  /**
   * Verify that a response contains valid auth structure
   */
  static validateAuthResponse(response: unknown): boolean {
    if (!response || typeof response !== 'object') {
      return false;
    }

    const resp = response as Record<string, unknown>;

    return (
      typeof resp.accessToken === 'string' &&
      typeof resp.refreshToken === 'string' &&
      typeof resp.expiresIn === 'number' &&
      resp.user &&
      typeof resp.user === 'object' &&
      resp.user !== null &&
      typeof (resp.user as Record<string, unknown>).id === 'string' &&
      typeof (resp.user as Record<string, unknown>).email === 'string' &&
      !Object.prototype.hasOwnProperty.call(resp.user, 'passwordHash')
    );
  }

  /**
   * Create authorization header for requests
   */
  static createAuthHeader(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Extract JWT payload without verification (for testing)
   */
  static decodeJwtPayload(token: string): Record<string, unknown> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  }

  /**
   * Wait for a specific amount of time (useful for token expiration tests)
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random test data
   */
  static generateRandomTestData() {
    const timestamp = Date.now();
    return {
      email: `test${timestamp}@example.com`,
      firstName: `FirstName${timestamp}`,
      lastName: `LastName${timestamp}`,
      password: `Password${timestamp}!`,
    };
  }
}

/**
 * Custom matchers for authentication testing
 */
export class AuthTestMatchers {
  /**
   * Check if object matches AuthResponse structure
   */
  static toBeValidAuthResponse(received: unknown) {
    const pass = AuthTestUtils.validateAuthResponse(received);

    if (pass) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to be a valid auth response`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${JSON.stringify(received)} to be a valid auth response with accessToken, refreshToken, expiresIn, and user properties`,
        pass: false,
      };
    }
  }

  /**
   * Check if JWT token is valid format
   */
  static toBeValidJwtToken(received: unknown) {
    const pass = typeof received === 'string' && received.split('.').length === 3;

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid JWT token`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid JWT token with three parts separated by dots`,
        pass: false,
      };
    }
  }
}

// Add a basic test to satisfy Jest's requirement for test files
describe('AuthTestFactory', () => {
  it('should create mock user with default values', () => {
    const user = AuthTestFactory.createMockUser();
    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.firstName).toBe('John');
    expect(user.lastName).toBe('Doe');
    expect(user.role).toBe(UserRole.USER);
    expect(user.status).toBe(UserStatus.ACTIVE);
  });

  it('should create register dto with default values', () => {
    const dto = AuthTestFactory.createRegisterDto();
    expect(dto).toBeDefined();
    expect(dto.email).toBe('test@example.com');
    expect(dto.firstName).toBe('John');
    expect(dto.lastName).toBe('Doe');
    expect(dto.password).toBe('Password123!');
  });
});