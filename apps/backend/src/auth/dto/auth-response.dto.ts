import { User } from '../../../generated/prisma';
import { ApiProperty } from '@nestjs/swagger';

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
  @ApiProperty({
    description: 'JWT access token for API authentication',
    // eslint-disable-next-line no-secrets/no-secrets -- Example JWT token for API documentation
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token for obtaining new access tokens',
    example: 'refresh_token_xyz...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Authenticated user information',
    type: 'object',
    example: {
      id: 'user-uuid-123',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      isEmailVerified: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  })
  user: AuthResponseUserDto;

  @ApiProperty({
    description: 'Access token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;
}