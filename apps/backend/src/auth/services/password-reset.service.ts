import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus } from '../../core/database/entities/user.entity';
import { AuditLog, AuditEventType } from '../../core/database/entities/audit-log.entity';
import { PasswordSecurityService } from './password-security.service';
import { RateLimitService } from './rate-limit.service';

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly tokenExpirationMinutes = 30;
  private readonly maxActiveTokens = 3;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private passwordSecurityService: PasswordSecurityService,
    private rateLimitService: RateLimitService,
  ) {}

  async requestPasswordReset(
    email: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ success: boolean; message: string; token?: string }> {
    // Check rate limit
    const rateLimitResult = await this.rateLimitService.checkRateLimit(
      metadata?.ipAddress || email,
      'passwordReset'
    );

    if (!rateLimitResult.allowed) {
      await this.rateLimitService.recordAttempt(metadata?.ipAddress || email, 'passwordReset', false);

      const lockoutMessage = rateLimitResult.isLocked
        ? `Too many password reset attempts. Try again after ${rateLimitResult.lockoutExpiry?.toISOString()}`
        : `Rate limit exceeded. Try again in ${Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 60000)} minutes`;

      // Log the rate limit event
      await this.logResetEvent(
        null,
        AuditEventType.PASSWORD_RESET_REQUESTED,
        `Password reset rate limit exceeded for email: ${email}`,
        metadata?.ipAddress,
        metadata?.userAgent,
        { rateLimited: true, email }
      );

      return {
        success: false,
        message: lockoutMessage,
      };
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'firstName', 'lastName', 'status'],
    });

    // Always return success message for security (don't reveal if email exists)
    const successMessage = 'If an account with that email exists, you will receive a password reset link shortly.';

    if (!user) {
      // Record attempt even for non-existent users
      await this.rateLimitService.recordAttempt(metadata?.ipAddress || email, 'passwordReset', false);

      await this.logResetEvent(
        null,
        AuditEventType.PASSWORD_RESET_REQUESTED,
        `Password reset requested for non-existent email: ${email}`,
        metadata?.ipAddress,
        metadata?.userAgent,
        { email, userExists: false }
      );

      return {
        success: true,
        message: successMessage,
      };
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      await this.rateLimitService.recordAttempt(metadata?.ipAddress || email, 'passwordReset', false);

      await this.logResetEvent(
        user.id,
        AuditEventType.PASSWORD_RESET_REQUESTED,
        `Password reset requested for inactive user: ${email}`,
        metadata?.ipAddress,
        metadata?.userAgent,
        { email, userStatus: user.status }
      );

      return {
        success: true,
        message: successMessage,
      };
    }

    try {
      // Clean up expired tokens and limit active tokens
      await this.cleanupExpiredTokens(user.id);
      await this.limitActiveTokens(user.id);

      // Generate reset token
      const resetToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.tokenExpirationMinutes);

      // Store token (in a real app, you'd store this in a separate table)
      // For now, we'll use a simple in-memory approach or extend user entity
      const tokenData: PasswordResetToken = {
        id: uuidv4(),
        userId: user.id,
        token: resetToken,
        expiresAt,
        used: false,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      };

      // Store token in Redis or database (for this example, we'll log it)
      await this.storeResetToken(tokenData);

      // Record successful request
      await this.rateLimitService.recordAttempt(metadata?.ipAddress || email, 'passwordReset', true);

      // Log the event
      await this.logResetEvent(
        user.id,
        AuditEventType.PASSWORD_RESET_REQUESTED,
        'Password reset token generated successfully',
        metadata?.ipAddress,
        metadata?.userAgent,
        {
          tokenId: tokenData.id,
          expiresAt: expiresAt.toISOString(),
        }
      );

      this.logger.log(`Password reset token generated for user ${user.id}`);

      // In a real application, you would send an email here
      // For development, we'll return the token
      return {
        success: true,
        message: successMessage,
        token: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to generate password reset token for ${email}:`, error);
      await this.rateLimitService.recordAttempt(metadata?.ipAddress || email, 'passwordReset', false);

      return {
        success: true, // Still return success for security
        message: successMessage,
      };
    }
  }

  async validateResetToken(
    token: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ valid: boolean; userId?: string; error?: string }> {
    try {
      const tokenData = await this.getResetToken(token);

      if (!tokenData) {
        await this.logResetEvent(
          null,
          AuditEventType.PASSWORD_RESET_REQUESTED,
          'Invalid password reset token used',
          metadata?.ipAddress,
          metadata?.userAgent,
          { invalidToken: true }
        );

        return { valid: false, error: 'Invalid or expired reset token' };
      }

      if (tokenData.used) {
        await this.logResetEvent(
          tokenData.userId,
          AuditEventType.PASSWORD_RESET_REQUESTED,
          'Already used password reset token attempted',
          metadata?.ipAddress,
          metadata?.userAgent,
          { tokenId: tokenData.id, alreadyUsed: true }
        );

        return { valid: false, error: 'Reset token has already been used' };
      }

      if (tokenData.expiresAt < new Date()) {
        await this.logResetEvent(
          tokenData.userId,
          AuditEventType.PASSWORD_RESET_REQUESTED,
          'Expired password reset token used',
          metadata?.ipAddress,
          metadata?.userAgent,
          { tokenId: tokenData.id, expired: true }
        );

        return { valid: false, error: 'Reset token has expired' };
      }

      // Verify user still exists and is active
      const user = await this.userRepository.findOne({
        where: { id: tokenData.userId },
        select: ['id', 'status'],
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        return { valid: false, error: 'User account is not available' };
      }

      return { valid: true, userId: tokenData.userId };
    } catch (error) {
      this.logger.error('Error validating reset token:', error);
      return { valid: false, error: 'Invalid or expired reset token' };
    }
  }

  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ success: boolean; error?: string }> {
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    // Validate token
    const tokenValidation = await this.validateResetToken(token, metadata);
    if (!tokenValidation.valid || !tokenValidation.userId) {
      return { success: false, error: tokenValidation.error || 'Invalid token' };
    }

    try {
      const userId = tokenValidation.userId;

      // Change password using security service
      const changeResult = await this.passwordSecurityService.changePassword(
        userId,
        newPassword,
        {
          ...metadata,
          isReset: true,
        }
      );

      if (!changeResult.success) {
        await this.logResetEvent(
          userId,
          AuditEventType.PASSWORD_RESET_REQUESTED,
          `Password reset failed: ${changeResult.error}`,
          metadata?.ipAddress,
          metadata?.userAgent,
          { validationError: changeResult.error }
        );

        return { success: false, error: changeResult.error };
      }

      // Mark token as used
      await this.markTokenAsUsed(token);

      // Clear any rate limits for successful reset
      await this.rateLimitService.clearRateLimit(metadata?.ipAddress || userId, 'passwordReset');

      // Log successful reset
      await this.logResetEvent(
        userId,
        AuditEventType.PASSWORD_RESET_COMPLETED,
        'Password reset completed successfully',
        metadata?.ipAddress,
        metadata?.userAgent,
        { tokenUsed: true }
      );

      this.logger.log(`Password reset completed for user ${userId}`);

      return { success: true };
    } catch (error) {
      this.logger.error('Error resetting password:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }

  private async storeResetToken(tokenData: PasswordResetToken): Promise<void> {
    // In a real application, store this in Redis or a database table
    // For this example, we'll use a simple approach
    this.logger.debug(`Storing reset token ${tokenData.id} for user ${tokenData.userId}`);
  }

  private async getResetToken(token: string): Promise<PasswordResetToken | null> {
    // In a real application, retrieve from Redis or database
    // For this example, return null to simulate not found
    this.logger.debug(`Retrieving reset token ${token}`);
    return null;
  }

  private async markTokenAsUsed(token: string): Promise<void> {
    // In a real application, mark the token as used in storage
    this.logger.debug(`Marking token ${token} as used`);
  }

  private async cleanupExpiredTokens(userId: string): Promise<void> {
    // In a real application, remove expired tokens from storage
    this.logger.debug(`Cleaning up expired tokens for user ${userId}`);
  }

  private async limitActiveTokens(userId: string): Promise<void> {
    // In a real application, limit the number of active tokens per user
    this.logger.debug(`Limiting active tokens for user ${userId} to ${this.maxActiveTokens}`);
  }

  private async logResetEvent(
    userId: string | null,
    eventType: AuditEventType,
    description: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: any
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      userId,
      eventType,
      description,
      ipAddress,
      userAgent,
      metadata,
      isSecurityEvent: true,
    });

    await this.auditLogRepository.save(auditLog);
  }
}