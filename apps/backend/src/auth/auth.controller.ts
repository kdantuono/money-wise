import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthSecurityService } from './auth-security.service';
import { CsrfService } from './services/csrf.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { PasswordChangeDto, PasswordChangeResponseDto } from './dto/password-change.dto';
import { PasswordResetRequestDto, ResetPasswordDto, PasswordResetResponseDto, PasswordResetTokenValidationDto, PasswordResetTokenResponseDto } from './dto/password-reset.dto';
import { EmailVerificationDto, EmailVerificationResponseDto, ResendEmailVerificationResponseDto } from './dto/email-verification.dto';
import { PasswordStrengthCheckDto, PasswordStrengthResponseDto } from './dto/password-strength.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { RateLimitGuard, RateLimit, AuthRateLimits } from './guards/rate-limit.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../../generated/prisma';

/**
 * Authentication Controller
 *
 * Handles all authentication operations including registration, login, logout,
 * password management, and email verification.
 *
 * Security Features:
 * - JWT-based authentication with access & refresh tokens
 * - Rate limiting on sensitive endpoints (register, login, password reset)
 * - Password strength validation (min 32 chars, uppercase, lowercase, numbers, symbols)
 * - Account lockout after 5 failed login attempts
 * - Email verification for new accounts
 * - Secure password reset with time-limited tokens
 *
 * @example
 * // Register
 * POST /api/auth/register
 * { "email": "user@example.com", "password": "ValidPassword123!@#" }
 *
 * // Login
 * POST /api/auth/login
 * { "email": "user@example.com", "password": "ValidPassword123!@#" }
 *
 * // Refresh token
 * POST /api/auth/refresh
 * { "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }
 *
 * // Get profile
 * GET /api/auth/profile
 * Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 *
 * @see AuthService for core authentication logic
 * @see AuthSecurityService for security checks
 */
@ApiTags('Authentication')
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  /**
   * Initializes the authentication controller
   * @param authService - Core authentication service
   * @param authSecurityService - Security verification service
   * @param csrfService - CSRF token service
   * @param configService - Configuration service
   */
  constructor(
    private readonly authService: AuthService,
    private readonly authSecurityService: AuthSecurityService,
    private readonly csrfService: CsrfService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get cookie options based on environment
   * @private
   */
  private getCookieOptions(maxAge: number) {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict' as const,
      maxAge,
      path: '/',
    };
  }

  /**
   * Register a new user account
   *
   * Creates a new user account with email and password. Password must meet strength requirements:
   * - Minimum 32 characters
   * - Contains uppercase letters (A-Z)
   * - Contains lowercase letters (a-z)
   * - Contains numbers (0-9)
   * - Contains special symbols (!@#$%^&*)
   *
   * After registration, an email verification link is sent to the provided email address.
   * The user must verify their email before some features are available.
   *
   * Rate limited to prevent abuse (max 5 attempts per 15 minutes per IP).
   *
   * @param registerDto - User registration data (email, password, firstName, lastName)
   * @param request - Express request object for IP tracking
   * @returns Access token, refresh token, and user profile
   *
   * @throws ConflictException (409) - Email already registered
   * @throws BadRequestException (400) - Invalid email or weak password
   * @throws TooManyRequestsException (429) - Rate limit exceeded
   *
   * @example
   * POST /api/auth/register
   * {
   *   "email": "john@example.com",
   *   "password": "SecurePassword123!@#Password",
   *   "firstName": "John",
   *   "lastName": "Smith"
   * }
   *
   * Response (201):
   * {
   *   "accessToken": "eyJhbGciOiJIUzI1NiIs...",
   *   "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
   *   "user": {
   *     "id": "550e8400-e29b-41d4-a716-446655440000",
   *     "email": "john@example.com",
   *     "firstName": "John",
   *     "lastName": "Smith",
   *     "emailVerified": false
   *   }
   * }
   */
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
  async register(
    @Body() registerDto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<AuthResponseDto, 'accessToken' | 'refreshToken'> & { csrfToken: string }> {
    const result = await this.authSecurityService.register(registerDto, request);

    // Set HttpOnly cookies for tokens
    res.cookie('accessToken', result.accessToken, this.getCookieOptions(15 * 60 * 1000)); // 15 minutes
    res.cookie('refreshToken', result.refreshToken, this.getCookieOptions(7 * 24 * 60 * 60 * 1000)); // 7 days

    // Generate CSRF token
    const csrfToken = this.csrfService.generateToken();

    // Remove sensitive data from response
    const { accessToken: _accessToken, refreshToken: _refreshToken, verificationToken: _verificationToken, ...response } = result;

    return {
      ...response,
      csrfToken,
    };
  }

  /**
   * Authenticate user with email and password
   *
   * Verifies user credentials and returns JWT tokens for subsequent API calls.
   * Implements security measures:
   * - Account lockout after 5 failed login attempts (15 minute duration)
   * - Rate limiting to prevent brute force attacks
   * - IP-based tracking for suspicious patterns
   *
   * Access tokens are short-lived (15 minutes) and refresh tokens are long-lived (7 days).
   *
   * @param loginDto - Credentials (email, password)
   * @param request - Express request object for IP tracking
   * @returns Access token, refresh token, and user profile
   *
   * @throws UnauthorizedException (401) - Invalid credentials or account locked
   * @throws TooManyRequestsException (429) - Rate limit exceeded
   *
   * @example
   * POST /api/auth/login
   * {
   *   "email": "john@example.com",
   *   "password": "SecurePassword123!@#Password"
   * }
   */
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
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<AuthResponseDto, 'accessToken' | 'refreshToken'> & { csrfToken: string }> {
    const result = await this.authSecurityService.login(loginDto, request);

    // Set HttpOnly cookies for tokens
    res.cookie('accessToken', result.accessToken, this.getCookieOptions(15 * 60 * 1000)); // 15 minutes
    res.cookie('refreshToken', result.refreshToken, this.getCookieOptions(7 * 24 * 60 * 60 * 1000)); // 7 days

    // Generate CSRF token
    const csrfToken = this.csrfService.generateToken();

    // Remove tokens from response (they're in cookies now)
    const { accessToken: _accessToken, refreshToken: _refreshToken, ...response } = result;

    return {
      ...response,
      csrfToken,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using HttpOnly cookie' })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or missing refresh token',
  })
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<AuthResponseDto, 'accessToken' | 'refreshToken'> & { csrfToken: string }> {
    // Extract refresh token from cookie
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found in cookies');
    }

    const result = await this.authSecurityService.refreshToken(refreshToken, request);

    // Set new HttpOnly cookies
    res.cookie('accessToken', result.accessToken, this.getCookieOptions(15 * 60 * 1000)); // 15 minutes
    res.cookie('refreshToken', result.refreshToken, this.getCookieOptions(7 * 24 * 60 * 60 * 1000)); // 7 days

    // Generate new CSRF token
    const csrfToken = this.csrfService.generateToken();

    // Remove tokens from response
    const { accessToken: _accessToken, refreshToken: _refreshToken, ...response } = result;

    return {
      ...response,
      csrfToken,
    };
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
    // Return user without password (Prisma User type)
    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout - clears auth cookies' })
  @ApiResponse({
    status: 204,
    description: 'User successfully logged out',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - invalid or missing CSRF token',
  })
  async logout(
    @CurrentUser() user: User,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authSecurityService.logout(user.id, request);

    // Clear auth cookies with same options used to set them
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/',
    };
    res.clearCookie('accessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);
  }

  /**
   * Get CSRF token
   *
   * Generates a new CSRF token for use in subsequent state-changing requests.
   * This endpoint is public and doesn't require authentication.
   *
   * The CSRF token must be included in the X-CSRF-Token header for all
   * POST, PUT, PATCH, and DELETE requests.
   *
   * @returns CSRF token
   *
   * @example
   * GET /api/auth/csrf-token
   *
   * Response (200):
   * {
   *   "csrfToken": "a1b2c3d4...e5f6.1698765432000.9f8e7d6c..."
   * }
   */
  @Public()
  @Get('csrf-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get CSRF token for secure requests' })
  @ApiResponse({
    status: 200,
    description: 'CSRF token generated successfully',
    schema: {
      type: 'object',
      properties: {
        csrfToken: {
          type: 'string',
          description: 'CSRF token to include in X-CSRF-Token header',
        },
      },
    },
  })
  getCsrfToken(): { csrfToken: string } {
    const csrfToken = this.csrfService.generateToken();
    return { csrfToken };
  }

  // === NEW SECURITY ENDPOINTS ===

  @Post('change-password')
  @UseGuards(JwtAuthGuard, CsrfGuard)
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - invalid or missing CSRF token',
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
  @ApiBody({ type: ResetPasswordDto })
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
    @Body() passwordResetDto: ResetPasswordDto,
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
  @UseGuards(JwtAuthGuard, CsrfGuard)
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
    status: 403,
    description: 'Forbidden - invalid or missing CSRF token',
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