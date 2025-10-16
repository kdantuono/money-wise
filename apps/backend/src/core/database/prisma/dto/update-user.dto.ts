import {
  IsEmail,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole, UserStatus } from '../../../../../generated/prisma';

/**
 * UpdateUserDto - Data Transfer Object for User updates
 *
 * IMMUTABLE FIELDS (NOT in this DTO):
 * - familyId: IMMUTABLE - users cannot change families after creation
 * - password: Use separate updatePassword() method for security isolation
 * - id: Primary key, never updatable
 * - createdAt: Timestamp, never updatable
 * - updatedAt: Auto-updated by Prisma
 *
 * UPDATABLE FIELDS:
 * - email: Can be changed (must remain unique)
 * - firstName: Can be changed
 * - lastName: Can be changed
 * - role: Can be changed (admin privilege escalation)
 * - status: Can be changed (account suspension)
 *
 * BUSINESS RULES:
 * - familyId updates are REJECTED (immutable business rule)
 * - Password updates via separate method (security best practice)
 * - Email updates must maintain uniqueness constraint
 * - Role/status changes typically require admin privileges (enforced at controller level)
 *
 * VALIDATION:
 * - All fields are optional (partial updates supported)
 * - Email is auto-lowercased and trimmed if provided
 * - Empty DTO is valid (no-op update)
 *
 * @example
 * ```typescript
 * // Update name only
 * const dto: UpdateUserDto = {
 *   firstName: 'Jane',
 *   lastName: 'Smith'
 * };
 *
 * // Update role (admin action)
 * const dto: UpdateUserDto = {
 *   role: UserRole.ADMIN
 * };
 *
 * // Suspend user account
 * const dto: UpdateUserDto = {
 *   status: UserStatus.SUSPENDED
 * };
 * ```
 */
export class UpdateUserDto {
  /**
   * User's email address
   * - OPTIONAL (partial update)
   * - Must be valid email format if provided
   * - Automatically lowercased and trimmed
   * - Unique constraint enforced at database level
   * - Duplicate email will throw ConflictException
   */
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  /**
   * User's first name
   * - OPTIONAL (partial update)
   * - Max 255 characters
   * - No special character restrictions (supports unicode)
   */
  @IsOptional()
  @MaxLength(255, { message: 'First name cannot exceed 255 characters' })
  firstName?: string;

  /**
   * User's last name
   * - OPTIONAL (partial update)
   * - Max 255 characters
   * - No special character restrictions (supports unicode)
   */
  @IsOptional()
  @MaxLength(255, { message: 'Last name cannot exceed 255 characters' })
  lastName?: string;

  /**
   * User role within family
   * - OPTIONAL (partial update)
   * - ADMIN: Full family management
   * - MEMBER: Standard access
   * - VIEWER: Read-only
   * - Role changes typically require admin authorization
   */
  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: UserRole;

  /**
   * User account status
   * - OPTIONAL (partial update)
   * - ACTIVE: Normal operation
   * - INACTIVE: Temporarily disabled
   * - SUSPENDED: System-level suspension
   * - Status changes typically require admin authorization
   */
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid user status' })
  status?: UserStatus;
}
