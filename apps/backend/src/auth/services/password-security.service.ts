import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as argon2 from 'argon2';
import { PrismaUserService } from '../../core/database/prisma/services/user.service';
import { PrismaPasswordHistoryService } from '../../core/database/prisma/services/password-history.service';
import { PrismaAuditLogService } from '../../core/database/prisma/services/audit-log.service';
import { AuditEventType } from '../../../generated/prisma';

export enum HashingAlgorithm {
  BCRYPT = 'bcrypt',
  ARGON2 = 'argon2',
}

export interface PasswordStrengthResult {
  score: number; // 0-100
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  meets_requirements: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  requireNonRepeatChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfoInPassword: boolean;
  historyLength: number;
  expirationDays: number;
  warningDays: number;
}

export interface PasswordValidationResult {
  isValid: boolean;
  strengthResult: PasswordStrengthResult;
  violations: string[];
}

export interface PasswordChangeResult {
  success: boolean;
  error?: string;
  passwordExpiry?: Date;
  mustChangePassword?: boolean;
}

@Injectable()
export class PasswordSecurityService {
  private readonly logger = new Logger(PasswordSecurityService.name);

  // Enhanced security-first policy with 12-character minimum (financial application standard)
  private readonly defaultPolicy: PasswordPolicy = {
    minLength: 12, // Enhanced from epic's 8 characters for financial security
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    requireNonRepeatChars: true,
    preventCommonPasswords: true,
    preventUserInfoInPassword: true,
    historyLength: 5,
    expirationDays: 90,
    warningDays: 7,
  };

  // Common passwords to prevent (in production, this would be a larger list)
  private readonly commonPasswords = new Set([
    'password', '123456', '123456789', '12345678', '12345',
    'qwerty', 'abc123', 'password123', 'admin', 'letmein',
    'welcome', 'monkey', '1234567890', 'iloveyou', 'sunshine',
    'princess', 'dragon', 'rockyou', 'football', 'master',
  ]);

  constructor(
    private readonly prismaUserService: PrismaUserService,
    private readonly prismaPasswordHistoryService: PrismaPasswordHistoryService,
    private readonly prismaAuditLogService: PrismaAuditLogService,
  ) {}

  async validatePassword(
    password: string,
    userInfo?: { firstName?: string; lastName?: string; email?: string },
    customPolicy?: Partial<PasswordPolicy>
  ): Promise<PasswordValidationResult> {
    const effectivePolicy = { ...this.defaultPolicy, ...customPolicy };
    const strengthResult = this.calculatePasswordStrength(password, userInfo, effectivePolicy);

    return {
      isValid: strengthResult.meets_requirements && strengthResult.score >= 60, // Higher security bar for finance
      strengthResult,
      violations: strengthResult.feedback,
    };
  }

  async hashPassword(
    password: string,
    algorithm: HashingAlgorithm = HashingAlgorithm.ARGON2
  ): Promise<string> {
    try {
      switch (algorithm) {
        case HashingAlgorithm.BCRYPT:
          return await bcrypt.hash(password, 12);

        case HashingAlgorithm.ARGON2:
          return await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16, // 64 MB
            timeCost: 3,
            parallelism: 1,
          });

        default:
          throw new Error(`Unsupported hashing algorithm: ${algorithm}`);
      }
    } catch (error) {
      this.logger.error(`Failed to hash password with ${algorithm}:`, error);
      throw new BadRequestException('Failed to process password');
    }
  }

  async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
    algorithm?: HashingAlgorithm
  ): Promise<boolean> {
    try {
      // Auto-detect algorithm if not provided
      if (!algorithm) {
        algorithm = hashedPassword.startsWith('$argon2') ? HashingAlgorithm.ARGON2 : HashingAlgorithm.BCRYPT;
      }

      switch (algorithm) {
        case HashingAlgorithm.BCRYPT:
          return await bcrypt.compare(plainPassword, hashedPassword);

        case HashingAlgorithm.ARGON2:
          return await argon2.verify(hashedPassword, plainPassword);

        default:
          return false;
      }
    } catch (error) {
      this.logger.error('Password verification failed:', error);
      return false;
    }
  }

  async changePassword(
    userId: string,
    newPassword: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      isReset?: boolean;
      adminInitiated?: boolean;
    }
  ): Promise<PasswordChangeResult> {
    const user = await this.prismaUserService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Validate new password
    const validation = await this.validatePassword(newPassword, {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.violations.join('; '),
      };
    }

    // Check password history
    const isReused = await this.isPasswordReused(userId, newPassword);
    if (isReused) {
      return {
        success: false,
        error: `Password cannot be one of your last ${this.defaultPolicy.historyLength} passwords`,
      };
    }

    try {
      // Hash new password with Argon2
      const newPasswordHash = await this.hashPassword(newPassword, HashingAlgorithm.ARGON2);

      // Calculate password expiry
      const passwordExpiry = new Date();
      passwordExpiry.setDate(passwordExpiry.getDate() + this.defaultPolicy.expirationDays);

      // Save old password to history
      await this.savePasswordHistory(userId, user.passwordHash, metadata);

      // Update user password using updatePassword which handles hashing internally
      // NOTE: We pass the already-hashed password here, so we need direct update
      // TODO: Consider refactoring to use a separate method for pre-hashed passwords
      await this.prismaUserService.updatePasswordHash(userId, newPasswordHash);

      // Log the password change
      await this.logPasswordEvent(
        userId,
        AuditEventType.PASSWORD_CHANGED,
        'Password changed successfully',
        metadata?.ipAddress,
        metadata?.userAgent,
        {
          passwordStrength: validation.strengthResult.score,
          isReset: metadata?.isReset || false,
          adminInitiated: metadata?.adminInitiated || false,
        }
      );

      this.logger.log(`Password changed for user ${userId}`);

      return {
        success: true,
        passwordExpiry,
        mustChangePassword: false,
      };
    } catch (error) {
      this.logger.error(`Failed to change password for user ${userId}:`, error);
      return {
        success: false,
        error: 'Failed to update password',
      };
    }
  }

  async isPasswordExpired(userId: string): Promise<boolean> {
    const user = await this.prismaUserService.findOne(userId);

    if (!user || !user.updatedAt) return false;

    const daysSinceUpdate = Math.floor(
      (Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceUpdate >= this.defaultPolicy.expirationDays;
  }

  async getDaysUntilExpiration(userId: string): Promise<number> {
    const user = await this.prismaUserService.findOne(userId);

    if (!user || !user.updatedAt) return this.defaultPolicy.expirationDays;

    const daysSinceUpdate = Math.floor(
      (Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return Math.max(0, this.defaultPolicy.expirationDays - daysSinceUpdate);
  }

  async shouldWarnPasswordExpiry(userId: string): Promise<boolean> {
    const daysUntilExpiry = await this.getDaysUntilExpiration(userId);
    return daysUntilExpiry <= this.defaultPolicy.warningDays;
  }

  private async isPasswordReused(userId: string, newPassword: string): Promise<boolean> {
    const history = await this.prismaPasswordHistoryService.getRecentPasswords(
      userId,
      this.defaultPolicy.historyLength
    );

    for (const record of history) {
      const matches = await this.verifyPassword(newPassword, record.passwordHash);
      if (matches) return true;
    }

    return false;
  }

  /**
   * Enhanced password strength calculation (hybrid of feature + epic approaches)
   */
  calculatePasswordStrength(
    password: string,
    userInfo?: { email?: string; firstName?: string; lastName?: string },
    policy?: Partial<PasswordPolicy>
  ): PasswordStrengthResult {
    const appliedPolicy = { ...this.defaultPolicy, ...policy };
    const feedback: string[] = [];
    let score = 0;

    // Length checks (enhanced for financial applications)
    if (password.length < appliedPolicy.minLength) {
      feedback.push(`Password must be at least ${appliedPolicy.minLength} characters long`);
    } else {
      score += 15;
    }

    if (password.length > appliedPolicy.maxLength) {
      feedback.push(`Password must not exceed ${appliedPolicy.maxLength} characters`);
    }

    // Character requirement checks
    if (appliedPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
    } else if (appliedPolicy.requireUppercase) {
      score += 15;
    }

    if (appliedPolicy.requireLowercase && !/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
    } else if (appliedPolicy.requireLowercase) {
      score += 15;
    }

    if (appliedPolicy.requireNumbers && !/\d/.test(password)) {
      feedback.push('Password must contain at least one number');
    } else if (appliedPolicy.requireNumbers) {
      score += 15;
    }

    if (appliedPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      feedback.push('Password must contain at least one special character');
    } else if (appliedPolicy.requireSpecialChars) {
      score += 15;
    }

    // Advanced checks
    if (appliedPolicy.requireNonRepeatChars) {
      const repeatedChars = this.hasRepeatedCharacters(password);
      if (repeatedChars) {
        feedback.push('Password should not contain repeated characters');
      } else {
        score += 10;
      }
    }

    // Common password check
    if (appliedPolicy.preventCommonPasswords && this.isCommonPassword(password)) {
      feedback.push('Password is too common, please choose a more unique password');
    } else if (appliedPolicy.preventCommonPasswords) {
      score += 10;
    }

    // User info in password check
    if (appliedPolicy.preventUserInfoInPassword && userInfo) {
      const containsUserInfo = this.containsUserInfo(password, userInfo);
      if (containsUserInfo) {
        feedback.push('Password should not contain your email, first name, or last name');
      } else {
        score += 5;
      }
    }

    // Additional strength scoring based on entropy
    score += this.calculateEntropyScore(password);

    const strength = this.getStrengthLevel(score);
    const meets_requirements = feedback.length === 0 && score >= 60;

    return {
      score: Math.min(100, score),
      strength,
      feedback,
      meets_requirements,
    };
  }

  /**
   * Check if password has been used recently by user
   */
  async isPasswordInHistory(_userId: string, _newPassword: string): Promise<boolean> {
    // In a real implementation, you would store password hashes in a separate table
    // For now, we'll return false (no history check)
    // TODO: Implement password history table and check
    return false;
  }

  /**
   * Generate a secure temporary password
   */
  generateTemporaryPassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one character from each required category
    password += this.getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    password += this.getRandomChar('abcdefghijklmnopqrstuvwxyz');
    password += this.getRandomChar('0123456789');
    password += this.getRandomChar('!@#$%^&*');

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  private hasRepeatedCharacters(password: string): boolean {
    return /(.)\1{2,}/.test(password); // 3 or more repeated characters
  }

  private isCommonPassword(password: string): boolean {
    return this.commonPasswords.has(password.toLowerCase());
  }

  private containsUserInfo(password: string, userInfo: { email?: string; firstName?: string; lastName?: string }): boolean {
    const lowercasePassword = password.toLowerCase();

    if (userInfo.email) {
      const emailParts = userInfo.email.toLowerCase().split('@');
      if (lowercasePassword.includes(emailParts[0])) {
        return true;
      }
    }

    if (userInfo.firstName && userInfo.firstName.length >= 3) {
      if (lowercasePassword.includes(userInfo.firstName.toLowerCase())) {
        return true;
      }
    }

    if (userInfo.lastName && userInfo.lastName.length >= 3) {
      if (lowercasePassword.includes(userInfo.lastName.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  // Enhanced entropy scoring from epic branch
  private calculateEntropyScore(password: string): number {
    const charSets = [
      { regex: /[a-z]/, size: 26 },
      { regex: /[A-Z]/, size: 26 },
      { regex: /[0-9]/, size: 10 },
      { regex: /[^a-zA-Z0-9]/, size: 32 },
    ];

    let charsetSize = 0;
    charSets.forEach(set => {
      if (set.regex.test(password)) {
        charsetSize += set.size;
      }
    });

    if (charsetSize === 0) return 0;

    const entropy = password.length * Math.log2(charsetSize);

    // Scale entropy to 0-20 points
    return Math.min(20, Math.floor(entropy / 3));
  }

  private getStrengthLevel(score: number): 'very-weak' | 'weak' | 'fair' | 'good' | 'strong' {
    if (score < 30) return 'very-weak';
    if (score < 50) return 'weak';
    if (score < 70) return 'fair';
    if (score < 85) return 'good';
    return 'strong';
  }

  private getRandomChar(charset: string): string {
    return charset.charAt(Math.floor(Math.random() * charset.length));
  }
  private async savePasswordHistory(
    userId: string,
    passwordHash: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    // Clean up old history beyond the limit
    await this.prismaPasswordHistoryService.deleteOldPasswords(
      userId,
      this.defaultPolicy.historyLength
    );

    // Save current password to history
    await this.prismaPasswordHistoryService.create({
      userId,
      passwordHash,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });
  }

  private async logPasswordEvent(
    userId: string,
    eventType: AuditEventType,
    description: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.prismaAuditLogService.create({
      userId,
      eventType,
      description,
      ipAddress,
      userAgent,
      metadata,
      isSecurityEvent: true,
    });
  }

  async getPasswordPolicy(): Promise<PasswordPolicy> {
    return { ...this.defaultPolicy };
  }
}