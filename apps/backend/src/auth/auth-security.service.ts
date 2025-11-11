import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { User as PrismaUser, UserStatus } from '../../generated/prisma';
import { PrismaUserService } from '../core/database/prisma/services/user.service';
import { PrismaFamilyService } from '../core/database/prisma/services/family.service';
import { enrichUserWithVirtuals } from '../core/database/prisma/utils/user-virtuals';
import { AuthConfig } from '../core/config/auth.config';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import {
  PasswordChangeDto,
  PasswordChangeResponseDto,
} from './dto/password-change.dto';
import {
  PasswordResetRequestDto,
  ResetPasswordDto,
  PasswordResetResponseDto,
} from './dto/password-reset.dto';
import {
  EmailVerificationResponseDto,
  ResendEmailVerificationResponseDto,
} from './dto/email-verification.dto';
import {
  PasswordStrengthCheckDto,
  PasswordStrengthResponseDto,
} from './dto/password-strength.dto';

// Security services
import { PasswordSecurityService } from './services/password-security.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { AuditLogService, AuditEventType } from './services/audit-log.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthSecurityService {
  private readonly logger = new Logger(AuthSecurityService.name);
  private readonly jwtAccessSecret: string;
  private readonly jwtAccessExpiresIn: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtRefreshExpiresIn: string;
  private readonly isTestEnvironment: boolean;

  constructor(
    private prismaUserService: PrismaUserService,
    private prismaFamilyService: PrismaFamilyService,
    private jwtService: JwtService,
    private passwordSecurityService: PasswordSecurityService,
    private accountLockoutService: AccountLockoutService,
    private emailVerificationService: EmailVerificationService,
    private passwordResetService: PasswordResetService,
    private auditLogService: AuditLogService,
    private configService: ConfigService,
  ) {
    // Cache JWT configuration for performance and fail fast if missing
    const authConfig = this.configService.get<AuthConfig>('auth');

    if (!authConfig?.JWT_ACCESS_SECRET || !authConfig?.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets not configured');
    }

    this.jwtAccessSecret = authConfig.JWT_ACCESS_SECRET;
    this.jwtAccessExpiresIn = authConfig.JWT_ACCESS_EXPIRES_IN || '15m';
    this.jwtRefreshSecret = authConfig.JWT_REFRESH_SECRET;
    this.jwtRefreshExpiresIn = authConfig.JWT_REFRESH_EXPIRES_IN || '7d';
    this.isTestEnvironment = this.configService.get<string>('NODE_ENV') === 'test';
  }

  /**
   * Enhanced registration with email verification
   */
  async register(
    registerDto: RegisterDto,
    request: Request
  ): Promise<AuthResponseDto & { verificationToken?: string }> {
    const { email, password, firstName, lastName } = registerDto;

    try {
      // Check if user already exists
      // MIGRATION: userRepository.findOne({where: {email}}) → prismaUserService.findByEmail(email)
      const existingUser = await this.prismaUserService.findByEmail(email.toLowerCase());

      if (existingUser) {
        await this.auditLogService.logEvent(
          AuditEventType.REGISTRATION_FAILED,
          request,
          { reason: 'email_already_exists' },
          undefined,
          email
        );
        throw new ConflictException('User with this email already exists');
      }

      // Validate password strength
      const passwordValidation = await this.passwordSecurityService.validatePassword(
        password,
        { email, firstName, lastName }
      );

      if (!passwordValidation.strengthResult.meets_requirements) {
        await this.auditLogService.logEvent(
          AuditEventType.REGISTRATION_FAILED,
          request,
          { reason: 'weak_password', feedback: passwordValidation.strengthResult.feedback },
          undefined,
          email
        );
        throw new BadRequestException({
          message: 'Password does not meet security requirements',
          feedback: passwordValidation.strengthResult.feedback,
          strength: passwordValidation.strengthResult.strength,
          score: passwordValidation.strengthResult.score,
        });
      }

      // Hash password
      const passwordHash =
        await this.passwordSecurityService.hashPassword(password);

      // Create family for new user (users always belong to a family)
      // Family name defaults to "[FirstName] [LastName]'s Family"
      const familyName = firstName && lastName
        ? `${firstName} ${lastName}'s Family`
        : email.split('@')[0] + "'s Family";

      const family = await this.prismaFamilyService.create({
        name: familyName
      });

      // Create user with ACTIVE status (MVP: email verification bypassed)
      // MIGRATION: userRepository.create() + save() → prismaUserService.createWithHash()
      // Note: Using createWithHash since password is already hashed by PasswordSecurityService
      // TODO: Re-enable email verification for production by changing status to INACTIVE
      const savedUser = await this.prismaUserService.createWithHash({
        email: email.toLowerCase(),
        firstName,
        lastName,
        passwordHash,
        familyId: family.id, // Link user to newly created family
        status: UserStatus.ACTIVE, // MVP: Auto-activate for immediate access (bypass email verification)
      });

      // Generate email verification token
      const verificationToken =
        await this.emailVerificationService.generateVerificationToken(
          savedUser.id,
          savedUser.email
        );

      // Log successful registration
      await this.auditLogService.logEvent(
        AuditEventType.REGISTRATION_SUCCESS,
        request,
        { requiresVerification: true },
        savedUser.id,
        savedUser.email
      );

      // Generate tokens for the response
      const authResponse = await this.generateAuthResponse(savedUser);

      return {
        ...authResponse,
        verificationToken, // Include verification token for testing/email sending
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error('Registration error:', error);
      await this.auditLogService.logEvent(
        AuditEventType.REGISTRATION_FAILED,
        request,
        { reason: 'internal_error' },
        undefined,
        email
      );
      throw new Error('Registration failed');
    }
  }

  /**
   * Enhanced login with rate limiting and lockout protection
   */
  async login(loginDto: LoginDto, request: Request): Promise<AuthResponseDto> {
    const { email, password } = loginDto;
    const normalizedEmail = email.toLowerCase();

    try {
      // Check for account lockout first (skip in test environment)
      if (!this.isTestEnvironment) {
        const lockoutInfo =
          await this.accountLockoutService.getLockoutInfo(normalizedEmail);
        if (lockoutInfo.isLocked) {
          await this.auditLogService.logEvent(
            AuditEventType.LOGIN_FAILED,
            request,
            { reason: 'account_locked', lockedUntil: lockoutInfo.lockedUntil },
            undefined,
            normalizedEmail
          );
          throw new UnauthorizedException(
            'Account is temporarily locked due to too many failed attempts'
          );
        }
      }

      // Find user with password
      // MIGRATION: userRepository.findOne({where: {email}, select: [...]}) → prismaUserService.findByEmail(email)
      // Note: Prisma returns all fields by default, select array not needed
      const user = await this.prismaUserService.findByEmail(normalizedEmail);

      if (!user) {
        await this.recordFailedLogin(
          normalizedEmail,
          'user_not_found',
          request
        );
        throw new UnauthorizedException('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await this.passwordSecurityService.verifyPassword(
        password,
        user.passwordHash
      );
      if (!isPasswordValid) {
        await this.recordFailedLogin(
          normalizedEmail,
          'invalid_password',
          request,
          user.id
        );
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if user account is active
      if (user.status !== UserStatus.ACTIVE) {
        await this.auditLogService.logEvent(
          AuditEventType.LOGIN_FAILED,
          request,
          { reason: 'account_inactive', status: user.status },
          user.id,
          user.email
        );
        throw new UnauthorizedException('Account is not active');
      }

      // Clear any existing failed attempts
      await this.accountLockoutService.clearFailedAttempts(normalizedEmail);

      // Update last login
      // MIGRATION: userRepository.update(id, {lastLoginAt}) → prismaUserService.updateLastLogin(id)
      await this.prismaUserService.updateLastLogin(user.id);

      // Log successful login
      await this.auditLogService.logLoginSuccess(request, user.id, user.email);

      // Generate tokens
      return this.generateAuthResponse(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Login error:', error);
      await this.auditLogService.logEvent(
        AuditEventType.LOGIN_FAILED,
        request,
        { reason: 'internal_error' },
        undefined,
        normalizedEmail
      );
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  /**
   * Secure password change
   */
  async changePassword(
    userId: string,
    passwordChangeDto: PasswordChangeDto,
    request: Request
  ): Promise<PasswordChangeResponseDto> {
    const { currentPassword, newPassword } = passwordChangeDto;

    try {
      // Find user with current password
      // MIGRATION: userRepository.findOne({where: {id}, select: [...]}) → prismaUserService.findOne(id)
      // Note: Prisma returns all fields including passwordHash
      const user = await this.prismaUserService.findOne(userId);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid =
        await this.passwordSecurityService.verifyPassword(
          currentPassword,
          user.passwordHash
        );

      if (!isCurrentPasswordValid) {
        await this.auditLogService.logPasswordChange(
          request,
          userId,
          user.email,
          false
        );
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Validate new password
      const passwordValidation = await this.passwordSecurityService.validatePassword(
        newPassword,
        {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      );

      if (!passwordValidation.strengthResult.meets_requirements) {
        throw new BadRequestException({
          message: 'New password does not meet security requirements',
          feedback: passwordValidation.strengthResult.feedback,
          strength: passwordValidation.strengthResult.strength,
          score: passwordValidation.strengthResult.score,
        });
      }

      // Check if new password is different from current
      const isSamePassword = await this.passwordSecurityService.verifyPassword(
        newPassword,
        user.passwordHash
      );

      if (isSamePassword) {
        throw new BadRequestException(
          'New password must be different from current password'
        );
      }

      // Check password history
      const isInHistory =
        await this.passwordSecurityService.isPasswordInHistory(
          userId,
          newPassword
        );
      if (isInHistory) {
        throw new BadRequestException(
          'You cannot reuse a recently used password'
        );
      }

      // Hash new password
      const newPasswordHash =
        await this.passwordSecurityService.hashPassword(newPassword);

      // Update password
      // MIGRATION: userRepository.update(id, {passwordHash}) → prismaUserService.updatePasswordHash(id, hash)
      // Note: Using updatePasswordHash since password is already hashed by PasswordSecurityService
      await this.prismaUserService.updatePasswordHash(userId, newPasswordHash);

      // Log successful password change
      await this.auditLogService.logPasswordChange(
        request,
        userId,
        user.email,
        true
      );

      return {
        success: true,
        message: 'Password changed successfully',
        passwordStrength: {
          score: passwordValidation.strengthResult.score,
          strength: passwordValidation.strengthResult.strength,
          feedback: passwordValidation.strengthResult.feedback,
        },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error('Password change error:', error);
      throw new Error('Failed to change password');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(
    passwordResetRequestDto: PasswordResetRequestDto,
    request: Request
  ): Promise<{ message: string; token?: string }> {
    const { email } = passwordResetRequestDto;

    try {
      const result = await this.passwordResetService.requestPasswordReset(
        email.toLowerCase(),
        {
          ipAddress: this.getClientIp(request),
          userAgent: request.get('User-Agent') || 'unknown'
        }
      );

      await this.auditLogService.logEvent(
        AuditEventType.PASSWORD_RESET_REQUESTED,
        request,
        { email },
        undefined,
        email
      );

      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
        token: result.token, // Include token for testing (remove in production)
      };
    } catch (error) {
      this.logger.error('Password reset request error:', error);
      throw new Error('Failed to process password reset request');
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(
    passwordResetDto: ResetPasswordDto,
    request: Request
  ): Promise<PasswordResetResponseDto> {
    const { token, newPassword, confirmPassword } = passwordResetDto;

    try {
      const result = await this.passwordResetService.resetPassword(
        token,
        newPassword,
        confirmPassword,
        {
          ipAddress: this.getClientIp(request),
          userAgent: request.get('User-Agent') || 'unknown'
        }
      );

      await this.auditLogService.logEvent(
        AuditEventType.PASSWORD_RESET_SUCCESS,
        request,
        { token: token.substring(0, 8) + '...' }
      );

      // Ensure message is always present for the DTO
      return {
        success: result.success,
        message: result.message || (result.success ? 'Password has been reset successfully' : result.error || 'Password reset failed'),
        requiresEmailVerification: result.requiresEmailVerification
      };
    } catch (error) {
      await this.auditLogService.logEvent(
        AuditEventType.PASSWORD_RESET_FAILED,
        request,
        { token: token.substring(0, 8) + '...', error: error.message }
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Password reset error:', error);
      throw new Error('Failed to reset password');
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(
    token: string,
    request: Request
  ): Promise<EmailVerificationResponseDto> {
    try {
      const result = await this.emailVerificationService.verifyEmail(token);

      await this.auditLogService.logEvent(
        AuditEventType.EMAIL_VERIFIED,
        request,
        { token: token.substring(0, 8) + '...' },
        result.user?.id,
        result.user?.email
      );

      return result as EmailVerificationResponseDto;
    } catch (error) {
      await this.auditLogService.logEvent(
        AuditEventType.EMAIL_VERIFICATION_FAILED,
        request,
        { token: token.substring(0, 8) + '...', error: error.message }
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Email verification error:', error);
      throw new Error('Failed to verify email');
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(
    userId: string,
    request: Request
  ): Promise<ResendEmailVerificationResponseDto> {
    try {
      await this.emailVerificationService.resendVerificationEmail(userId);

      await this.auditLogService.logEvent(
        AuditEventType.EMAIL_VERIFICATION_SENT,
        request,
        { type: 'resend' },
        userId
      );

      return {
        success: true,
        message: 'Verification email sent successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Resend verification error:', error);
      throw new Error('Failed to resend verification email');
    }
  }

  /**
   * Check password strength
   */
  async checkPasswordStrength(
    passwordStrengthDto: PasswordStrengthCheckDto
  ): Promise<PasswordStrengthResponseDto> {
    const { password, email, firstName, lastName } = passwordStrengthDto;

    const validation = await this.passwordSecurityService.validatePassword(password, {
      email,
      firstName,
      lastName,
    });

    return {
      score: validation.strengthResult.score,
      strength: validation.strengthResult.strength,
      feedback: validation.strengthResult.feedback,
      meets_requirements: validation.strengthResult.meets_requirements,
    };
  }

  /**
   * Enhanced token refresh with security checks
   */
  async refreshToken(
    refreshToken: string,
    request: Request
  ): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.jwtRefreshSecret,
      });

      // MIGRATION: userRepository.findOne({where: {id}}) → prismaUserService.findOne(id)
      const user = await this.prismaUserService.findOne(payload.sub);

      if (!user || user.status !== UserStatus.ACTIVE) {
        await this.auditLogService.logEvent(
          AuditEventType.TOKEN_REFRESH,
          request,
          { success: false, reason: 'invalid_user' },
          payload.sub
        );
        throw new UnauthorizedException('Invalid refresh token');
      }

      await this.auditLogService.logEvent(
        AuditEventType.TOKEN_REFRESH,
        request,
        { success: true },
        user.id,
        user.email
      );

      return this.generateAuthResponse(user);
    } catch (error) {
      await this.auditLogService.logEvent(
        AuditEventType.TOKEN_REFRESH,
        request,
        { success: false, error: error.message }
      );
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Enhanced logout with audit logging
   */
  async logout(userId: string, request: Request): Promise<void> {
    await this.auditLogService.logEvent(
      AuditEventType.LOGOUT,
      request,
      {},
      userId
    );
    // In production, you might want to blacklist the token
  }

  private async recordFailedLogin(
    email: string,
    reason: string,
    request: Request,
    userId?: string
  ): Promise<void> {
    // Record failed attempt for lockout tracking
    const lockoutInfo =
      await this.accountLockoutService.recordFailedAttempt(email);

    // Log the failed attempt
    await this.auditLogService.logLoginFailed(request, email, reason);

    // If account gets locked, log that too
    if (lockoutInfo.isLocked) {
      await this.auditLogService.logAccountLocked(
        request,
        userId || 'unknown',
        email,
        {
          failedAttempts: lockoutInfo.failedAttempts,
          lockedUntil: lockoutInfo.lockedUntil,
        }
      );
    }
  }

  private async generateAuthResponse(user: PrismaUser): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtAccessSecret,
      expiresIn: this.jwtAccessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.jwtRefreshExpiresIn,
    });

    // Enrich user with virtual properties (fullName, isEmailVerified, isActive)
    // MIGRATION: TypeORM virtual properties (getters) → Prisma utility function
    const enrichedUser = enrichUserWithVirtuals(user);

    // Create user object without password and include virtual properties
    const userWithoutPassword = {
      id: enrichedUser.id,
      email: enrichedUser.email,
      firstName: enrichedUser.firstName,
      lastName: enrichedUser.lastName,
      role: enrichedUser.role,
      status: enrichedUser.status,
      avatar: enrichedUser.avatar,
      timezone: enrichedUser.timezone,
      currency: enrichedUser.currency,
      preferences: enrichedUser.preferences,
      lastLoginAt: enrichedUser.lastLoginAt,
      emailVerifiedAt: enrichedUser.emailVerifiedAt,
      familyId: enrichedUser.familyId,
      createdAt: enrichedUser.createdAt,
      updatedAt: enrichedUser.updatedAt,
      accounts: [], // Default empty - not loaded by default for performance
      // Virtual properties
      fullName: enrichedUser.fullName,
      isEmailVerified: enrichedUser.isEmailVerified,
      isActive: enrichedUser.isActive,
    };

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}
