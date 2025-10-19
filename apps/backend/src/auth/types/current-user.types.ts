import { $Enums } from '../../../generated/prisma';

/**
 * Current User Payload Interface
 *
 * Represents the authenticated user data extracted from JWT token
 * and attached to the request context by the JwtAuthGuard.
 *
 * Used by @CurrentUser() decorator to provide strongly-typed
 * user information in controller methods.
 *
 * @property id - Unique user identifier (UUID)
 * @property email - User email address
 * @property role - User role for RBAC authorization (strongly typed enum)
 * @property familyId - Optional family identifier for multi-user household management
 *
 * @example
 * ```typescript
 * async create(
 *   @Body() dto: CreateAccountDto,
 *   @CurrentUser() user: CurrentUserPayload,
 * ): Promise<AccountResponseDto> {
 *   // user.role is typed as UserRole enum (no any-casting needed)
 *   return this.accountsService.create(dto, user.id, user.familyId);
 * }
 * ```
 *
 * @phase Phase 2.2 - ESLint Warning Elimination
 * @related JwtAuthGuard, CurrentUserDecorator, UserRole
 */
export interface CurrentUserPayload {
  /**
   * Unique user identifier (UUID)
   */
  id: string;

  /**
   * User email address (verified during authentication)
   */
  email: string;

  /**
   * User role for Role-Based Access Control (RBAC)
   * Uses strongly-typed UserRole enum from Prisma generated client
   */
  role: $Enums.UserRole;

  /**
   * Optional family identifier for multi-user household management
   * Used in shared account and budget features
   */
  familyId?: string;
}
