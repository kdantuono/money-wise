import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Get,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../../generated/prisma';
import { PasswordSecurityService } from '../services/password-security.service';
import { PasswordResetService } from '../services/password-reset.service';
import { RateLimitService } from '../services/rate-limit.service';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { PasswordResetRequestDto, ResetPasswordDto, ValidateResetTokenDto } from '../dto/password-reset.dto';
import { PasswordStrengthCheckDto, PasswordStrengthResponseDto } from '../dto/password-strength.dto';

@Controller('auth/password')
export class PasswordController {
  constructor(
    private passwordSecurityService: PasswordSecurityService,
    private passwordResetService: PasswordResetService,
    private rateLimitService: RateLimitService,
  ) {}

  @Post('check-strength')
  @HttpCode(HttpStatus.OK)
  async checkPasswordStrength(
    @Body() checkPasswordStrengthDto: PasswordStrengthCheckDto,
  ): Promise<PasswordStrengthResponseDto> {
    const { password, firstName, lastName, email } = checkPasswordStrengthDto;

    const validation = await this.passwordSecurityService.validatePassword(password, {
      firstName,
      lastName,
      email,
    });

    return {
      score: validation.strengthResult.score,
      strength: validation.strengthResult.strength,
      feedback: validation.strengthResult.feedback,
      meets_requirements: validation.strengthResult.meets_requirements,
    };
  }

  @Post('change')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() request: Request,
  ): Promise<{ success: boolean; message: string; passwordExpiry?: Date }> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check rate limit for password changes
    const ipAddress = this.getClientIp(request);
    const rateLimitResult = await this.rateLimitService.checkRateLimit(
      user.id,
      'passwordChange'
    );

    if (!rateLimitResult.allowed) {
      await this.rateLimitService.recordAttempt(user.id, 'passwordChange', false);

      const message = rateLimitResult.isLocked
        ? `Too many password change attempts. Try again after ${rateLimitResult.lockoutExpiry?.toISOString()}`
        : `Rate limit exceeded. Try again in ${Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 60000)} minutes`;

      throw new BadRequestException(message);
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordSecurityService.verifyPassword(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      await this.rateLimitService.recordAttempt(user.id, 'passwordChange', false);
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Change password
    const changeResult = await this.passwordSecurityService.changePassword(
      user.id,
      newPassword,
      {
        ipAddress,
        userAgent: request.headers['user-agent'],
        adminInitiated: false,
      }
    );

    if (!changeResult.success) {
      await this.rateLimitService.recordAttempt(user.id, 'passwordChange', false);
      throw new BadRequestException(changeResult.error);
    }

    // Clear rate limit on success
    await this.rateLimitService.recordAttempt(user.id, 'passwordChange', true);

    return {
      success: true,
      message: 'Password changed successfully',
      passwordExpiry: changeResult.passwordExpiry,
    };
  }

  @Post('reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() requestPasswordResetDto: PasswordResetRequestDto,
    @Req() request: Request,
  ): Promise<{ success: boolean; message: string; token?: string }> {
    const { email } = requestPasswordResetDto;
    const ipAddress = this.getClientIp(request);

    const result = await this.passwordResetService.requestPasswordReset(email, {
      ipAddress,
      userAgent: request.headers['user-agent'],
    });

    return result;
  }

  @Post('reset/validate')
  @HttpCode(HttpStatus.OK)
  async validateResetToken(
    @Body() validateResetTokenDto: ValidateResetTokenDto,
    @Req() request: Request,
  ): Promise<{ valid: boolean; error?: string }> {
    const { token } = validateResetTokenDto;
    const ipAddress = this.getClientIp(request);

    const result = await this.passwordResetService.validateResetToken(token, {
      ipAddress,
      userAgent: request.headers['user-agent'],
    });

    return {
      valid: result.valid,
      error: result.error,
    };
  }

  @Post('reset/complete')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() request: Request,
  ): Promise<{ success: boolean; message: string }> {
    const { token, newPassword, confirmPassword } = resetPasswordDto;
    const ipAddress = this.getClientIp(request);

    const result = await this.passwordResetService.resetPassword(
      token,
      newPassword,
      confirmPassword,
      {
        ipAddress,
        userAgent: request.headers['user-agent'],
      }
    );

    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  @Get('policy')
  @HttpCode(HttpStatus.OK)
  async getPasswordPolicy() {
    return this.passwordSecurityService.getPasswordPolicy();
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getPasswordStatus(@CurrentUser() user: User) {
    const isExpired = await this.passwordSecurityService.isPasswordExpired(user.id);
    const daysUntilExpiration = await this.passwordSecurityService.getDaysUntilExpiration(user.id);
    const shouldWarn = await this.passwordSecurityService.shouldWarnPasswordExpiry(user.id);

    return {
      isExpired,
      daysUntilExpiration,
      shouldWarn,
      mustChangePassword: isExpired,
    };
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      (request as any).connection?.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}