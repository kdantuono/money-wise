import { User } from '../../../generated/prisma';

export type AuthResponseUserDto = Omit<User, 'passwordHash'> & {
  accounts: any[]; // Account array - empty by default for performance
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