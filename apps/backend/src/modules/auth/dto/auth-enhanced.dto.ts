import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@moneywise.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@moneywise.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ example: '123456', description: 'MFA code if enabled' })
  @IsOptional()
  @IsString()
  mfaCode?: string;
}

export class MfaSetupDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class MfaVerifyDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class EnhancedAuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  tokenType: 'Bearer';

  @ApiProperty()
  user: {
    id: string;
    email: string;
    name: string;
  };

  @ApiProperty()
  mfaRequired: boolean;

  @ApiProperty()
  mfaEnabled: boolean;

  @ApiPropertyOptional()
  temporaryToken?: string;
}

export class SocialAuthDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  provider: 'google' | 'apple' | 'microsoft';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class SocialAuthResponseDto extends EnhancedAuthResponseDto {
  @ApiProperty()
  isNewUser: boolean;

  @ApiPropertyOptional()
  linkedAccounts?: string[];
}

export class PasswordResetRequestDto {
  @ApiProperty({ example: 'user@moneywise.com' })
  @IsEmail()
  email: string;
}

export class PasswordResetDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mfaCode?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mfaCode?: string;
}