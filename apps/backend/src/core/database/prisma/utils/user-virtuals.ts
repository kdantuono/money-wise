import type { User } from '../../../../../generated/prisma';
import { UserStatus } from '../../../../../generated/prisma';

/**
 * User entity with virtual properties
 *
 * Extends Prisma User entity with computed properties
 * that replicate TypeORM's virtual getters.
 */
export interface UserWithVirtuals extends User {
  fullName: string;
  isEmailVerified: boolean;
  isActive: boolean;
}

/**
 * Enrich Prisma User entity with virtual properties
 *
 * RATIONALE:
 * - Prisma doesn't support entity getters like TypeORM
 * - Services need virtual properties for business logic
 * - Maintains compatibility with existing service contracts
 *
 * VIRTUAL PROPERTIES:
 * - fullName: Computed from firstName + lastName
 * - isEmailVerified: Derived from emailVerifiedAt timestamp
 * - isActive: Derived from status field
 *
 * USAGE:
 * ```typescript
 * const user = await prismaService.user.findUnique({ where: { id } });
 * const enrichedUser = enrichUserWithVirtuals(user);
 * console.log(enrichedUser.fullName); // "John Doe"
 * console.log(enrichedUser.isEmailVerified); // true
 * console.log(enrichedUser.isActive); // true
 * ```
 *
 * PERFORMANCE:
 * - Zero database queries (computed from existing fields)
 * - Minimal CPU overhead (string concatenation, boolean checks)
 * - Safe to call on arrays with map()
 *
 * @param user - Prisma User entity
 * @returns User with computed virtual properties
 */
export function enrichUserWithVirtuals(user: User): UserWithVirtuals {
  return {
    ...user,
    fullName: buildFullName(user.firstName, user.lastName),
    isEmailVerified: user.emailVerifiedAt !== null,
    isActive: user.status === UserStatus.ACTIVE,
  };
}

/**
 * Build full name from first and last name components
 *
 * BEHAVIOR:
 * - Filters out null/undefined values
 * - Joins with space separator
 * - Returns empty string if both names are null
 *
 * EXAMPLES:
 * - buildFullName("John", "Doe") → "John Doe"
 * - buildFullName("John", null) → "John"
 * - buildFullName(null, "Doe") → "Doe"
 * - buildFullName(null, null) → ""
 *
 * @param firstName - Optional first name
 * @param lastName - Optional last name
 * @returns Full name string
 * @private
 */
function buildFullName(firstName: string | null, lastName: string | null): string {
  const parts = [firstName, lastName].filter((part) => part !== null && part !== undefined);
  return parts.join(' ');
}

/**
 * Enrich array of Prisma User entities with virtual properties
 *
 * CONVENIENCE WRAPPER:
 * - Maps enrichUserWithVirtuals over array
 * - Useful for list endpoints and bulk operations
 *
 * USAGE:
 * ```typescript
 * const users = await prismaService.user.findMany();
 * const enrichedUsers = enrichUsersWithVirtuals(users);
 * ```
 *
 * @param users - Array of Prisma User entities
 * @returns Array of users with virtual properties
 */
export function enrichUsersWithVirtuals(users: User[]): UserWithVirtuals[] {
  return users.map(enrichUserWithVirtuals);
}
