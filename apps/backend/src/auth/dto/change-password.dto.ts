import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for authentication',
    example: 'CurrentPass123!@#',
  })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty({
    description: 'New password with enhanced security requirements (min 12 chars, uppercase, lowercase, number, special char)',
    example: 'NewSecurePass123!@#',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @MinLength(12)
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
    example: 'NewSecurePass123!@#',
  })
  @IsString()
  @MinLength(1)
  confirmPassword: string;
}