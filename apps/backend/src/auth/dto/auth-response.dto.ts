import { User } from '../../core/database/entities/user.entity';

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash'>;
  expiresIn: number;
}