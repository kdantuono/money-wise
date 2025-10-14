import { User } from '../../../generated/prisma';

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash'>;
  expiresIn: number;
}