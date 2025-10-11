import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole, UserStatus } from '../../../../../generated/prisma';

/**
 * CreateUserDto - Data Transfer Object for User creation
 *
 * VALIDATION RULES:
 * - email: Required, valid email format, auto-lowercased and trimmed
 * - password: Required, minimum 8 characters (hashed before storage)
 * - familyId: Required UUID (users MUST belong to a family)
 * - firstName: Optional, max 255 characters
 * - lastName: Optional, max 255 characters
 * - role: Optional, defaults to MEMBER
 * - status: Optional, defaults to ACTIVE
 *
 * SECURITY:
 * - Password is NEVER stored in plain text
 * - Service layer hashes password with bcrypt before database insert
 * - Email is always lowercased for case-insensitive uniqueness
 *
 * BUSINESS RULES:
 * - familyId is REQUIRED - MoneyWise is "family-first" architecture
 * - Solo users automatically get single-member family on signup
 * - Default role is MEMBER (not ADMIN) for security
 * - Default status is ACTIVE (user can immediately use the account)
 *
 * @example
 * ```typescript
 * const dto: CreateUserDto = {
 *   email: 'john.doe@example.com',
 *   password: 'SecurePassword123!',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   familyId: 'f1234567-89ab-cdef-0123-456789abcdef'
 * };
 * ```
 */
export class CreateUserDto {
  /**
   * User's email address (unique identifier)
   * - REQUIRED field
   * - Must be valid email format
   * - Automatically lowercased and trimmed
   * - Unique constraint enforced at database level
   */
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email!: string;

  /**
   * User's password (plain text, will be hashed)
   * - REQUIRED field
   * - Minimum 8 characters
   * - Hashed with bcrypt (salt rounds 10) before storage
   * - NEVER stored in plain text
   * - NEVER returned in API responses
   */
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  /**
   * Family ID (UUID)
   * - REQUIRED field (users must belong to a family)
   * - Must reference existing Family entity
   * - Foreign key constraint enforced at database level
   * - IMMUTABLE after creation (users cannot change families)
   */
  @IsNotEmpty({ message: 'familyId is required - users must belong to a family' })
  @IsUUID('4', { message: 'familyId must be a valid UUID' })
  familyId!: string;

  /**
   * User's first name
   * - OPTIONAL field
   * - Max 255 characters
   * - No special character restrictions (supports unicode)
   */
  @IsOptional()
  @MaxLength(255, { message: 'First name cannot exceed 255 characters' })
  firstName?: string;

  /**
   * User's last name
   * - OPTIONAL field
   * - Max 255 characters
   * - No special character restrictions (supports unicode)
   */
  @IsOptional()
  @MaxLength(255, { message: 'Last name cannot exceed 255 characters' })
  lastName?: string;

  /**
   * User role within family
   * - OPTIONAL field (defaults to MEMBER)
   * - ADMIN: Full family management
   * - MEMBER: Standard access (default)
   * - VIEWER: Read-only (for children)
   */
  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: UserRole;

  /**
   * User account status
   * - OPTIONAL field (defaults to ACTIVE)
   * - ACTIVE: Normal operation (default)
   * - INACTIVE: Temporarily disabled
   * - SUSPENDED: System-level suspension
   */
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid user status' })
  status?: UserStatus;
}
