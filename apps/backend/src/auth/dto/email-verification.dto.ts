import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailVerificationDto {
  @ApiProperty({
    description: 'Email verification token received via email (64-character hexadecimal string)',
    example: 'a1b2c3d4e5f6789abcdef1234567890a1b2c3d4e5f6789abcdef1234567890',
    minLength: 64,
    maxLength: 64,
    pattern: '^[a-f0-9]{64}$',
  })
  @IsString()
  @MinLength(64, { message: 'Verification token must be exactly 64 characters' })
  @MaxLength(64, { message: 'Verification token must be exactly 64 characters' })
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'Verification token must be a valid hexadecimal string',
  })
  token: string;
}

export class EmailVerificationResponseDto {
  @ApiProperty({
    description: 'Whether the email verification was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Email verified successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Updated user information',
    required: false,
  })
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerifiedAt: Date;
    isEmailVerified: boolean;
  };
}

export class ResendEmailVerificationResponseDto {
  @ApiProperty({
    description: 'Whether the resend was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Verification email sent successfully',
  })
  message: string;
}