import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailVerificationDto {
  @ApiProperty({
    description: 'Email verification token received via email',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @MinLength(1)
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