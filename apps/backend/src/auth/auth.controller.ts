import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthSecurityService } from './auth-security.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { PasswordChangeDto, PasswordChangeResponseDto } from './dto/password-change.dto';
import { PasswordResetRequestDto, PasswordResetDto, PasswordResetResponseDto, PasswordResetTokenValidationDto, PasswordResetTokenResponseDto } from './dto/password-reset.dto';
import { EmailVerificationDto, EmailVerificationResponseDto, ResendEmailVerificationResponseDto } from './dto/email-verification.dto';
import { PasswordStrengthCheckDto, PasswordStrengthResponseDto } from './dto/password-strength.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard, RateLimit, AuthRateLimits } from './guards/rate-limit.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../core/database/entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authSecurityService: AuthSecurityService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit(AuthRateLimits.REGISTER)
  @ApiOperation({ summary: 'Register a new user with email verification' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or weak password',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many registration attempts',
  })
  async register(@Body() registerDto: RegisterDto, @Req() request: Request): Promise<AuthResponseDto> {
    const result = await this.authSecurityService.register(registerDto, request);
    // Remove verification token from response (used internally for email sending)
    // eslint-disable-next-line no-unused-vars
    const { verificationToken: _verificationToken, ...response } = result;
    return response;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit(AuthRateLimits.LOGIN)
  @ApiOperation({ summary: 'User login with security checks' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password, or account locked',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts',
  })
  async login(@Body() loginDto: LoginDto, @Req() request: Request): Promise<AuthResponseDto> {
    return this.authSecurityService.login(loginDto, request);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Valid refresh token',
        },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.authSecurityService.refreshToken(refreshToken, request);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getProfile(@CurrentUser() user: User): Promise<Omit<User, 'passwordHash'>> {
    // Create user object without password and include virtual properties
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      timezone: user.timezone,
      currency: user.currency,
      preferences: user.preferences,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      accounts: user.accounts,
      // Virtual properties
      fullName: user.fullName,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({
    status: 204,
    description: 'User successfully logged out',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async logout(@CurrentUser() user: User, @Req() request: Request): Promise<void> {
    await this.authSecurityService.logout(user.id, request);
  }

  // === NEW SECURITY ENDPOINTS ===

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: PasswordChangeDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: PasswordChangeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid current password or weak new password',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async changePassword(
    @CurrentUser() user: User,
    @Body() passwordChangeDto: PasswordChangeDto,
    @Req() request: Request,
  ): Promise<PasswordChangeResponseDto> {
    return this.authSecurityService.changePassword(user.id, passwordChangeDto, request);
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @RateLimit(AuthRateLimits.PASSWORD_RESET)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: PasswordResetRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if account exists',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many password reset requests',
  })
  async requestPasswordReset(
    @Body() passwordResetRequestDto: PasswordResetRequestDto,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    const result = await this.authSecurityService.requestPasswordReset(passwordResetRequestDto, request);
    return { message: result.message };
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiBody({ type: PasswordResetDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: PasswordResetResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or weak password',
  })
  async resetPassword(
    @Body() passwordResetDto: PasswordResetDto,
    @Req() request: Request,
  ): Promise<PasswordResetResponseDto> {
    return this.authSecurityService.resetPassword(passwordResetDto, request);
  }

  @Public()
  @Post('password-reset/validate-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate password reset token' })
  @ApiBody({ type: PasswordResetTokenValidationDto })
  @ApiResponse({
    status: 200,
    description: 'Token validation result',
    type: PasswordResetTokenResponseDto,
  })
  async validatePasswordResetToken(
    @Body() tokenValidationDto: PasswordResetTokenValidationDto,
  ): Promise<PasswordResetTokenResponseDto> {
    const result = await this.authSecurityService['passwordResetService'].validateResetToken(
      tokenValidationDto.token,
    );
    return result;
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiBody({ type: EmailVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: EmailVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
  })
  async verifyEmail(
    @Body() emailVerificationDto: EmailVerificationDto,
    @Req() request: Request,
  ): Promise<EmailVerificationResponseDto> {
    return this.authSecurityService.verifyEmail(emailVerificationDto.token, request);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @RateLimit(AuthRateLimits.EMAIL_VERIFICATION)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
    type: ResendEmailVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Email already verified or too many requests',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many verification requests',
  })
  async resendEmailVerification(
    @CurrentUser() user: User,
    @Req() request: Request,
  ): Promise<ResendEmailVerificationResponseDto> {
    return this.authSecurityService.resendEmailVerification(user.id, request);
  }

  @Public()
  @Post('check-password-strength')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check password strength' })
  @ApiBody({ type: PasswordStrengthCheckDto })
  @ApiResponse({
    status: 200,
    description: 'Password strength analysis',
    type: PasswordStrengthResponseDto,
  })
  async checkPasswordStrength(
    @Body() passwordStrengthDto: PasswordStrengthCheckDto,
  ): Promise<PasswordStrengthResponseDto> {
    return this.authSecurityService.checkPasswordStrength(passwordStrengthDto);
  }
}