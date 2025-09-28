import { IsEmail, IsString, MinLength, MaxLength, Matches, IsUUID } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail()
  email: string;
}

export class ValidateResetTokenDto {
  @IsString()
  @IsUUID()
  token: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsUUID()
  token: string;

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

  @IsString()
  confirmPassword: string;
}