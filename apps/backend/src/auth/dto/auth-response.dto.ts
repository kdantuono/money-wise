import { User } from '../../../generated/prisma';

/**
 * User DTO for auth responses
 *
 * Excludes:
 * - passwordHash (security)
 * - accounts relation (not needed in auth response for performance)
 * - userAchievements relation (not needed in auth response)
 * - passwordHistory relation (not needed in auth response)
 * - auditLogs relation (not needed in auth response)
 *
 * Includes:
 * - Virtual properties (fullName, isEmailVerified, isActive)
 * - All essential user profile fields
 */
export type AuthResponseUserDto = Omit<User, 'passwordHash' | 'accounts' | 'userAchievements' | 'passwordHistory' | 'auditLogs'> & {
  fullName: string;
  isEmailVerified: boolean;
  isActive: boolean;
};

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: AuthResponseUserDto;
  expiresIn: number;
}