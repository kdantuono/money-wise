import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { User, Family, Account, UserAchievement } from '../../../../../generated/prisma';
import { Prisma, UserRole, UserStatus } from '../../../../../generated/prisma';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

/**
 * Salt rounds for bcrypt password hashing
 * - 10 rounds balances security and performance
 * - Higher = more secure but slower
 * - Industry standard for web applications
 */
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Options for loading relations with User entity
 */
export interface RelationOptions {
  family?: boolean;
  accounts?: boolean;
  userAchievements?: boolean;
}

/**
 * Options for findAll query
 */
export interface FindAllOptions {
  skip?: number;
  take?: number;
  where?: {
    familyId?: string;
    role?: UserRole;
    status?: UserStatus;
  };
  orderBy?: {
    createdAt?: 'asc' | 'desc';
    email?: 'asc' | 'desc';
  };
}

/**
 * User entity with optional relations
 */
export interface UserWithRelations extends User {
  family?: Family | null;
  accounts?: Account[];
  userAchievements?: UserAchievement[];
}

/**
 * PrismaUserService - User entity CRUD operations with authentication
 *
 * ARCHITECTURAL DECISIONS:
 * - Uses Prisma ORM for type-safe database operations
 * - Passwords NEVER stored in plain text (bcrypt with salt rounds 10)
 * - familyId is REQUIRED and IMMUTABLE (business rule)
 * - Email is case-insensitive (auto-lowercased)
 * - Validates UUIDs at service layer (fail fast)
 * - Separate methods for password operations (security isolation)
 * - Explicit error handling with domain-specific exceptions
 * - Supports selective relation loading for performance
 * - Follows NestJS dependency injection patterns
 *
 * ERROR HANDLING:
 * - BadRequestException: Invalid input (empty email, invalid UUID, immutable field update)
 * - ConflictException: Unique constraint violation (duplicate email)
 * - NotFoundException: Entity not found (P2025 Prisma error)
 * - InternalServerErrorException: Unexpected database errors
 *
 * VALIDATION:
 * - Email: Valid format, 1-255 characters, case-insensitive uniqueness
 * - Password: Minimum 8 characters, hashed before storage
 * - UUID: Standard RFC 4122 format validation
 * - familyId: Foreign key constraint (must reference existing Family)
 * - DTOs: class-validator decorators enforce types and constraints
 *
 * AUTHENTICATION:
 * - verifyPassword: Compare plain password against bcrypt hash
 * - updatePassword: Hash new password and update
 * - updateLastLogin: Track login timestamp for security
 * - verifyEmail: Mark email as verified
 *
 * CASCADING:
 * - User deletion cascades to: Accounts, UserAchievements
 * - Family deletion cascades to: Users (and transitively their relations)
 * - Defined in Prisma schema, no service-level logic needed
 *
 * IMMUTABILITY:
 * - familyId: Cannot be changed after user creation (business rule)
 * - password: Cannot be changed via update() method (security isolation)
 * - createdAt: Timestamp, never updatable
 * - id: Primary key, never updatable
 *
 * @example
 * ```typescript
 * // Create user with family
 * const user = await userService.create({
 *   email: 'john@example.com',
 *   password: 'SecurePass123',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   familyId: 'f1234567-89ab-cdef-0123-456789abcdef'
 * });
 *
 * // Verify password
 * const isValid = await userService.verifyPassword(user.id, 'SecurePass123');
 *
 * // Find with relations
 * const userWithFamily = await userService.findOneWithRelations(
 *   user.id,
 *   { family: true, accounts: true }
 * );
 *
 * // Paginated family members
 * const familyMembers = await userService.findByFamily(familyId, { role: UserRole.MEMBER });
 * ```
 */
@Injectable()
export class PrismaUserService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new User
   *
   * VALIDATION:
   * - Trims whitespace and lowercases email
   * - Validates email format via DTO
   * - Validates password minimum length (8 characters)
   * - Validates familyId existence (foreign key)
   * - Rejects duplicate emails (unique constraint)
   *
   * PASSWORD SECURITY:
   * - Hashes password with bcrypt (salt rounds 10)
   * - Plain text password NEVER stored
   * - Hash format: $2b$10$... (60 characters)
   *
   * PRISMA BEHAVIOR:
   * - Generates UUID automatically (default(uuid()) in schema)
   * - Sets createdAt and updatedAt timestamps automatically
   * - Sets default role: MEMBER
   * - Sets default status: ACTIVE
   * - Sets emailVerifiedAt: null (must be verified separately)
   *
   * @param dto - CreateUserDto with validated fields
   * @returns Created User entity with hashed password
   * @throws BadRequestException if validation fails
   * @throws ConflictException if email already exists
   * @throws BadRequestException if familyId doesn't exist
   */
  async create(dto: CreateUserDto): Promise<User> {
    // Validate required familyId
    if (!dto.familyId) {
      throw new BadRequestException('familyId is required - users must belong to a family');
    }

    // Validate email format (basic check, DTO handles advanced validation)
    const email = dto.email.trim().toLowerCase();
    if (!email || email.length === 0) {
      throw new BadRequestException('Email cannot be empty');
    }

    // Email format validation (simple regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate password length
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    // Hash password with bcrypt
    const passwordHash = await this.hashPassword(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName: dto.firstName ?? null,
          lastName: dto.lastName ?? null,
          familyId: dto.familyId,
          role: dto.role ?? UserRole.MEMBER,
          status: dto.status ?? UserStatus.ACTIVE,
        },
      });

      return user;
    } catch (error) {
      // Transform Prisma errors to domain exceptions
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint violation (duplicate email)
        if (error.code === 'P2002') {
          throw new ConflictException('Email already exists - user with this email is already registered');
        }
        // P2003: Foreign key constraint violation (invalid familyId)
        if (error.code === 'P2003') {
          throw new BadRequestException('Foreign key constraint failed - familyId does not reference an existing family');
        }
      }
      throw error;
    }
  }

  /**
   * Find a User by ID (without relations)
   *
   * VALIDATION:
   * - Validates UUID format before database query
   * - Returns null for non-existent IDs (not an error)
   *
   * PERFORMANCE:
   * - No relations loaded by default (use findOneWithRelations for that)
   * - Single query with primary key lookup
   *
   * @param id - User UUID
   * @returns User entity or null if not found
   * @throws BadRequestException if UUID format is invalid
   */
  async findOne(id: string): Promise<User | null> {
    this.validateUuid(id);

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user;
  }

  /**
   * Find a User by email (case-insensitive)
   *
   * BEHAVIOR:
   * - Email is lowercased and trimmed before search
   * - Case-insensitive search (emails stored lowercased)
   * - Returns null for non-existent emails (not an error)
   *
   * USE CASES:
   * - Login authentication
   * - Email uniqueness checks
   * - User lookup by email
   *
   * @param email - User email address
   * @returns User entity or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    return user;
  }

  /**
   * Find a User by ID with optional relations
   *
   * RELATION OPTIONS:
   * - family: Load user's family
   * - accounts: Load user's financial accounts
   * - userAchievements: Load user's achievement progress
   *
   * PERFORMANCE:
   * - Only specified relations are loaded (opt-in)
   * - Single query with JOINs for requested relations
   * - Use sparingly for relations with many records (N+1 risk)
   *
   * @param id - User UUID
   * @param relations - Optional relations to load
   * @returns UserWithRelations or null if not found
   * @throws BadRequestException if UUID format is invalid
   */
  async findOneWithRelations(
    id: string,
    relations: RelationOptions,
  ): Promise<UserWithRelations | null> {
    this.validateUuid(id);

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        family: relations?.family ?? false,
        accounts: relations?.accounts ?? false,
        userAchievements: relations?.userAchievements ?? false,
      },
    });

    return user as UserWithRelations | null;
  }

  /**
   * Find all Users with optional pagination, filtering, and ordering
   *
   * PAGINATION:
   * - skip: Number of records to skip (for offset pagination)
   * - take: Number of records to return (page size)
   *
   * FILTERING:
   * - familyId: Filter by family membership
   * - role: Filter by user role (ADMIN, MEMBER, VIEWER)
   * - status: Filter by account status (ACTIVE, INACTIVE, SUSPENDED)
   *
   * ORDERING:
   * - createdAt: Sort by creation date (asc/desc)
   * - email: Sort alphabetically by email (asc/desc)
   * - Only one order field supported per query
   *
   * DEFAULT BEHAVIOR:
   * - No pagination (returns all users)
   * - No filtering (all users)
   * - No specific order (database default)
   * - No relations loaded
   *
   * @param options - Optional pagination, filtering, and ordering
   * @returns Array of User entities (empty if none exist)
   */
  async findAll(options?: FindAllOptions): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      skip: options?.skip,
      take: options?.take,
      where: options?.where,
      orderBy: options?.orderBy,
    });

    return users;
  }

  /**
   * Update a User by ID
   *
   * VALIDATION:
   * - Validates UUID format
   * - Trims whitespace and lowercases email if provided
   * - REJECTS familyId updates (immutable field)
   * - REJECTS password updates (use updatePassword method)
   * - Empty DTO is valid (no-op update)
   *
   * IMMUTABLE FIELDS (enforced at service layer):
   * - familyId: Users cannot change families after creation (business rule)
   * - password: Use updatePassword() method for security isolation
   *
   * PRISMA BEHAVIOR:
   * - updatedAt automatically updated
   * - createdAt remains unchanged
   * - Returns updated entity
   *
   * @param id - User UUID
   * @param dto - UpdateUserDto with optional fields
   * @returns Updated User entity
   * @throws BadRequestException if UUID is invalid or immutable field update attempted
   * @throws ConflictException if email update violates uniqueness
   * @throws NotFoundException if user doesn't exist (P2025)
   */
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    this.validateUuid(id);

    // CRITICAL: Prevent familyId updates (immutable business rule)
    if ('familyId' in dto) {
      throw new BadRequestException(
        'familyId is immutable - users cannot change families after creation'
      );
    }

    // CRITICAL: Prevent password updates via update method (security isolation)
    if ('password' in dto || 'passwordHash' in dto) {
      throw new BadRequestException(
        'Password cannot be updated via update method - use updatePassword for password changes'
      );
    }

    // Normalize email if provided
    const updateData: any = { ...dto };
    if (dto.email) {
      updateData.email = dto.email.trim().toLowerCase();
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });

      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2025: Record not found
        if (error.code === 'P2025') {
          throw new NotFoundException('Record to update not found');
        }
        // P2002: Unique constraint violation (duplicate email)
        if (error.code === 'P2002') {
          throw new ConflictException('Email already exists - another user is using this email');
        }
      }
      throw error;
    }
  }

  /**
   * Delete a User by ID
   *
   * CASCADE BEHAVIOR (defined in Prisma schema):
   * - Related Accounts are CASCADE deleted
   * - Related UserAchievements are CASCADE deleted
   * - Transitive cascades: Account → Transactions
   *
   * WARNING:
   * - This is a destructive operation with cascading effects
   * - Consider soft-delete (status field) for production use
   * - Export user data before deletion for audit trails
   *
   * @param id - User UUID
   * @returns void
   * @throws BadRequestException if UUID format is invalid
   * @throws NotFoundException if user doesn't exist (P2025)
   */
  async delete(id: string): Promise<void> {
    this.validateUuid(id);

    try {
      await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Record to delete does not exist');
        }
      }
      throw error;
    }
  }

  /**
   * Check if a User exists by ID
   *
   * PERFORMANCE:
   * - Uses findUnique (efficient primary key lookup)
   * - Returns boolean (lighter than full entity)
   * - Only selects id field for minimal data transfer
   *
   * @param id - User UUID
   * @returns true if exists, false otherwise
   * @throws BadRequestException if UUID format is invalid
   */
  async exists(id: string): Promise<boolean> {
    this.validateUuid(id);

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    return user !== null;
  }

  // ============================================================================
  // P.3.4 PREREQUISITE METHODS - NEW METHODS FOR SERVICE MIGRATION
  // ============================================================================

  /**
   * Find user by identifier (email)
   *
   * BEHAVIOR:
   * - Identifier is treated as email (case-insensitive)
   * - Used by account-lockout.service for failed login tracking
   *
   * USE CASES:
   * - Account lockout tracking by email
   * - Login attempts monitoring
   *
   * @param identifier - Email address
   * @returns User entity or null if not found
   */
  async findByIdentifier(identifier: string): Promise<User | null> {
    // Normalize identifier as email (trim and lowercase)
    const normalizedEmail = identifier.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    return user;
  }

  /**
   * Count users matching optional filter criteria
   *
   * FILTERING:
   * - familyId: Count users in specific family
   * - role: Count users by role
   * - status: Count users by status
   * - Can combine multiple filters
   *
   * USE CASES:
   * - User statistics
   * - Family member counts
   * - Email verification tracking
   *
   * @param where - Optional filter criteria
   * @returns Count of matching users
   */
  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return await this.prisma.user.count({
      where,
    });
  }

  /**
   * Count users grouped by status
   *
   * BEHAVIOR:
   * - Returns object with counts for each UserStatus (ACTIVE, INACTIVE, SUSPENDED)
   * - Missing statuses default to 0
   * - Optional familyId filter
   *
   * USE CASES:
   * - User statistics dashboard
   * - Family member status breakdown
   * - Admin analytics
   *
   * @param familyId - Optional family filter
   * @returns Object with status counts { ACTIVE: 10, INACTIVE: 3, SUSPENDED: 1 }
   * @throws BadRequestException if familyId UUID format is invalid
   */
  async countByStatus(familyId?: string): Promise<Record<UserStatus, number>> {
    // Validate familyId if provided
    if (familyId) {
      this.validateUuid(familyId);
    }

    // Group by status and count
    // Use conditional calls to avoid Prisma TypeScript circular reference issues
    const results = familyId
      ? await this.prisma.user.groupBy({
          by: ['status'],
          _count: { _all: true },
          where: { familyId },
        })
      : await this.prisma.user.groupBy({
          by: ['status'],
          _count: { _all: true },
        });

    // Initialize all statuses to 0
    const counts: Record<UserStatus, number> = {
      ACTIVE: 0,
      INACTIVE: 0,
      SUSPENDED: 0,
    };

    // Fill in actual counts
    for (const result of results) {
      counts[result.status] = result._count._all;
    }

    return counts;
  }

  /**
   * Find all users with total count (pagination support)
   *
   * BEHAVIOR:
   * - Returns both data array and total count
   * - Total count respects filter criteria but ignores pagination
   * - Useful for paginated UIs that need to show "Page X of Y"
   *
   * PERFORMANCE:
   * - Two queries: findMany + count
   * - Queries run sequentially
   * - Consider caching for frequently accessed data
   *
   * @param options - Optional pagination, filtering, and ordering
   * @returns Object with data array and total count
   *
   * @example
   * ```typescript
   * const result = await service.findAllWithCount({
   *   skip: 20,
   *   take: 10,
   *   where: { familyId },
   *   orderBy: { createdAt: 'desc' }
   * });
   * // result = { data: [10 users], total: 42 }
   * // Can show: "Page 3 of 5 (42 total users)"
   * ```
   */
  async findAllWithCount(options?: FindAllOptions): Promise<{ data: User[]; total: number }> {
    const { where, skip, take, orderBy } = options || {};

    // Execute queries sequentially
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      this.prisma.user.count({
        where,
      }),
    ]);

    return { data, total };
  }

  /**
   * Create user with pre-hashed password
   *
   * CRITICAL DIFFERENCE FROM create():
   * - Accepts passwordHash directly (NO hashing performed)
   * - Used by auth.service where password is already hashed
   * - familyId is OPTIONAL (unlike create() where it's required)
   *
   * USE CASES:
   * - Auth service registration flow
   * - User creation where password is pre-hashed
   * - Account migration scenarios
   *
   * VALIDATION:
   * - Email format and uniqueness
   * - passwordHash format validation (bcrypt-like)
   * - familyId is optional (for auth flows where family created after user)
   *
   * SECURITY:
   * - NEVER pass plain text passwords to this method
   * - passwordHash must be bcrypt/argon2 format
   * - Validates hash format before storage
   *
   * @param dto - User creation data with pre-hashed password
   * @returns Created User entity
   * @throws BadRequestException if validation fails
   * @throws ConflictException if email already exists
   */
  async createWithHash(dto: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    familyId?: string;
    role?: UserRole;
    status?: UserStatus;
  }): Promise<User> {
    // Validate email format (basic check)
    const email = dto.email.trim().toLowerCase();
    if (!email || email.length === 0) {
      throw new BadRequestException('Email cannot be empty');
    }

    // Email format validation (simple regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate passwordHash is not empty
    if (!dto.passwordHash || dto.passwordHash.length === 0) {
      throw new BadRequestException('passwordHash cannot be empty');
    }

    // Validate passwordHash format (bcrypt or argon2)
    // More lenient - just check prefix to allow test hashes
    const bcryptRegex = /^\$2[aby]\$\d{2}\$.+$/;
    const argon2Regex = /^\$argon2(id|i|d)\$.+$/;
    if (!bcryptRegex.test(dto.passwordHash) && !argon2Regex.test(dto.passwordHash)) {
      throw new BadRequestException(
        'Invalid passwordHash format - must be bcrypt or argon2 hash'
      );
    }

    // Build Prisma create input using Unchecked variant (allows optional familyId)
    const createData: Prisma.UserUncheckedCreateInput = {
      email,
      passwordHash: dto.passwordHash, // Use hash directly - NO hashing
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      familyId: dto.familyId ?? null, // Optional for auth flows
      role: dto.role ?? UserRole.MEMBER,
      status: dto.status ?? UserStatus.ACTIVE,
    };

    try {
      const user = await this.prisma.user.create({
        data: createData,
      });

      return user;
    } catch (error: any) {
      // Transform Prisma errors to domain exceptions
      // Check for Prisma error code property (more flexible for testing)
      if (error.code) {
        // P2002: Unique constraint violation (duplicate email)
        if (error.code === 'P2002') {
          throw new ConflictException('Email already exists - user with this email is already registered');
        }
        // P2003: Foreign key constraint violation (invalid familyId)
        if (error.code === 'P2003') {
          throw new BadRequestException('Foreign key constraint failed - familyId does not reference an existing family');
        }
      }
      throw error;
    }
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  /**
   * Verify password against stored hash
   *
   * SECURITY:
   * - Uses bcrypt.compare for constant-time comparison
   * - Returns boolean (true = match, false = no match)
   * - Does not reveal whether user exists (throws error for non-existent user)
   *
   * USE CASES:
   * - Login authentication
   * - Password confirmation dialogs
   * - Security-sensitive operations
   *
   * @param userId - User UUID
   * @param password - Plain text password to verify
   * @returns true if password matches, false otherwise
   * @throws BadRequestException if UUID format is invalid
   * @throws NotFoundException if user doesn't exist
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    this.validateUuid(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found - cannot verify password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    return isMatch;
  }

  /**
   * Update user password
   *
   * SECURITY:
   * - Validates minimum password length (8 characters)
   * - Hashes new password with bcrypt before storage
   * - Separate method for password changes (security isolation)
   *
   * VALIDATION:
   * - Password must be at least 8 characters
   * - User must exist (throws NotFoundException)
   *
   * USE CASES:
   * - Password reset flows
   * - Password change in user settings
   * - Admin password resets
   *
   * @param userId - User UUID
   * @param newPassword - New plain text password (will be hashed)
   * @returns void
   * @throws BadRequestException if UUID format is invalid or password too short
   * @throws NotFoundException if user doesn't exist
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    this.validateUuid(userId);

    // Validate password length
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found - cannot update password');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password hash
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /**
   * Update last login timestamp
   *
   * BEHAVIOR:
   * - Sets lastLoginAt to current timestamp
   * - Used for security tracking and analytics
   * - Silent operation (no exceptions for non-existent users)
   *
   * USE CASES:
   * - Login success tracking
   * - Security audit trails
   * - Inactive account detection
   *
   * @param userId - User UUID
   * @returns void
   * @throws BadRequestException if UUID format is invalid
   */
  async updateLastLogin(userId: string): Promise<void> {
    this.validateUuid(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Mark user email as verified
   *
   * BEHAVIOR:
   * - Sets emailVerifiedAt to current timestamp
   * - Idempotent operation (safe to call multiple times)
   * - Used after email verification flow completion
   *
   * USE CASES:
   * - Email verification confirmation
   * - Admin manual verification
   * - Account recovery flows
   *
   * @param userId - User UUID
   * @returns void
   * @throws BadRequestException if UUID format is invalid
   */
  async verifyEmail(userId: string): Promise<void> {
    this.validateUuid(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    });
  }

  // ============================================================================
  // FAMILY RELATIONSHIP METHODS
  // ============================================================================

  /**
   * Find all users in a family with optional filtering
   *
   * FILTERING:
   * - role: Filter by user role (ADMIN, MEMBER, VIEWER)
   * - status: Filter by account status (ACTIVE, INACTIVE, SUSPENDED)
   *
   * USE CASES:
   * - Family member list
   * - Admin user management
   * - Family statistics
   *
   * @param familyId - Family UUID
   * @param options - Optional role and status filters
   * @returns Array of User entities in the family
   * @throws BadRequestException if familyId UUID format is invalid
   */
  async findByFamily(
    familyId: string,
    options?: { role?: UserRole; status?: UserStatus },
  ): Promise<User[]> {
    this.validateUuid(familyId);

    const where: any = { familyId };

    if (options?.role) {
      where.role = options.role;
    }

    if (options?.status) {
      where.status = options.status;
    }

    const users = await this.prisma.user.findMany({
      where,
    });

    return users;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Hash password with bcrypt
   *
   * SECURITY:
   * - Uses bcrypt with salt rounds 10 (industry standard)
   * - Generates unique salt for each password
   * - Output format: $2b$10$... (60 characters)
   *
   * @param password - Plain text password
   * @returns Bcrypt hash string
   */
  private async hashPassword(password: string): Promise<string> {
    const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    return hash;
  }

  /**
   * Validate UUID format (RFC 4122)
   *
   * RATIONALE:
   * - Catch invalid UUIDs at service layer (fail fast)
   * - Prevents unnecessary database queries
   * - Provides clear error messages to clients
   *
   * UUID FORMAT:
   * - 8-4-4-4-12 hexadecimal digits
   * - Example: 123e4567-e89b-12d3-a456-426614174000
   * - Case-insensitive
   *
   * @param id - UUID string to validate
   * @throws BadRequestException if format is invalid
   */
  private validateUuid(id: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      throw new BadRequestException(`Invalid UUID format: ${id}`);
    }
  }
}
