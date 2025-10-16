import { IsString, MinLength, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordStrengthCheckDto {
  @ApiProperty({
    description: 'Password to check strength for',
    example: 'testPassword123!',
  })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiProperty({
    description: 'User email for context (optional)',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'User first name for context (optional)',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'User last name for context (optional)',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}

export class PasswordStrengthResponseDto {
  @ApiProperty({
    description: 'Password strength score (0-100)',
    example: 85,
  })
  score: number;

  @ApiProperty({
    description: 'Password strength level',
    example: 'strong',
    enum: ['very-weak', 'weak', 'fair', 'good', 'strong'],
  })
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';

  @ApiProperty({
    description: 'Feedback messages for improving password',
    example: ['Password is strong!'],
    type: [String],
  })
  feedback: string[];

  @ApiProperty({
    description: 'Whether password meets security requirements',
    example: true,
  })
  meets_requirements: boolean;
}