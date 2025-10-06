/**
 * Authentication Configuration
 *
 * JWT token configuration with security validations.
 * Ensures secrets are strong and unique between access/refresh tokens.
 */
import { registerAs } from '@nestjs/config';
import { IsString, IsOptional, MinLength, Validate } from 'class-validator';
import { IsUniqueSecret } from './validators';

export class AuthConfig {
  @IsString()
  @MinLength(32, {
    message: 'JWT_ACCESS_SECRET must be at least 32 characters for security',
  })
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN?: string = '15m';

  @IsString()
  @MinLength(32, {
    message: 'JWT_REFRESH_SECRET must be at least 32 characters for security',
  })
  @Validate(IsUniqueSecret, ['JWT_ACCESS_SECRET'], {
    message:
      'JWT_REFRESH_SECRET must be different from JWT_ACCESS_SECRET for security',
  })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string = '7d';
}

export default registerAs('auth', () => ({
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
}));
