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

export class PasswordResetDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @MinLength(1)
  token: string;

  @ApiProperty({
    description: 'New password',
    example: 'newSecurePassword123!',
    minLength: 8,
    maxLength: 100,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    },
  )
  newPassword: string;
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