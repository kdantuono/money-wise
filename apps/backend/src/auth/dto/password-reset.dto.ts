import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetRequestDto {
  @ApiProperty({
    description: 'Email address for password reset',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}

export class ValidateResetTokenDto {
  @ApiProperty({
    description: 'Password reset token to validate',
    example: 'a1b2c3d4-e5f6-7890-ab12-cdef34567890',
  })
  @IsString()
  @MinLength(1)
  token: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'a1b2c3d4-e5f6-7890-ab12-cdef34567890',
  })
  @IsString()
  @MinLength(1)
  token: string;

  @ApiProperty({
    description: 'New password with enhanced security requirements (min 12 chars)',
    example: 'MySecureP@ssw0rd!',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @MinLength(12)  // Enhanced security: 12 chars minimum for financial apps
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+-=[\]{}|;:,.<>~`])/,
    {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    },
  )
  newPassword: string;

  @ApiProperty({
    description: 'Password confirmation (must match newPassword)',
    example: 'MySecureP@ssw0rd!',
  })
  @IsString()
  confirmPassword: string;
}

export class PasswordResetResponseDto {
  @ApiProperty({
    description: 'Whether the password reset was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Password has been reset successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Whether email verification is required',
    example: false,
    required: false,
  })
  requiresEmailVerification?: boolean;
}

export class PasswordResetTokenValidationDto {
  @ApiProperty({
    description: 'Password reset token to validate',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @MinLength(1)
  token: string;
}

export class PasswordResetTokenResponseDto {
  @ApiProperty({
    description: 'Whether the token is valid',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'Associated email address',
    example: 'user@example.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'Token expiration date',
    example: '2023-12-31T23:59:59.999Z',
    required: false,
  })
  expiresAt?: Date;
}