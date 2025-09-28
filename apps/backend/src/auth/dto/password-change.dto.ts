import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordChangeDto {
  @ApiProperty({
    description: 'Current password',
    example: 'currentPassword123!',
  })
  @IsString()
  @MinLength(1)
  currentPassword: string;

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

export class PasswordChangeResponseDto {
  @ApiProperty({
    description: 'Whether the password change was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Password changed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Password strength information',
    required: false,
  })
  passwordStrength?: {
    score: number;
    strength: string;
    feedback: string[];
  };
}