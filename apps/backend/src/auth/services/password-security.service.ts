import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as argon2 from 'argon2';
import { User } from '../../core/database/entities/user.entity';
import { PasswordHistory } from '../../core/database/entities/password-history.entity';
import { AuditLog, AuditEventType } from '../../core/database/entities/audit-log.entity';
import { PasswordStrengthService, PasswordStrengthResult } from './password-strength.service';
import { PasswordPolicyConfig, DEFAULT_PASSWORD_POLICY } from '../config/password-policy.config';

export enum HashingAlgorithm {
  BCRYPT = 'bcrypt',
  ARGON2 = 'argon2',
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
  private readonly policy: PasswordPolicyConfig = DEFAULT_PASSWORD_POLICY;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PasswordHistory)
    private passwordHistoryRepository: Repository<PasswordHistory>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private passwordStrengthService: PasswordStrengthService,
  ) {}

  async validatePassword(
    password: string,
    userInfo?: { firstName?: string; lastName?: string; email?: string },
    customPolicy?: Partial<PasswordPolicyConfig>
  ): Promise<PasswordValidationResult> {
    const effectivePolicy = { ...this.policy, ...customPolicy };

    // Basic policy validation
    const policyValidation = this.passwordStrengthService.validatePolicy(password, effectivePolicy);

    // Strength calculation
    const strengthResult = this.passwordStrengthService.calculateStrength(password, effectivePolicy, userInfo);

    return {
      isValid: policyValidation.isValid && strengthResult.score >= 40, // Minimum fair strength
      strengthResult,
      violations: policyValidation.violations,
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
    const user = await this.userRepository.findOne({ where: { id: userId } });
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
        error: `Password cannot be one of your last ${this.policy.historyCount} passwords`,
      };
    }

    try {
      // Hash new password with Argon2
      const newPasswordHash = await this.hashPassword(newPassword, HashingAlgorithm.ARGON2);

      // Calculate password expiry
      const passwordExpiry = new Date();
      passwordExpiry.setDate(passwordExpiry.getDate() + this.policy.expirationDays);

      // Save old password to history
      await this.savePasswordHistory(userId, user.passwordHash, metadata);

      // Update user password
      await this.userRepository.update(userId, {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      });

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
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['updatedAt']
    });

    if (!user || !user.updatedAt) return false;

    const daysSinceUpdate = Math.floor(
      (Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceUpdate >= this.policy.expirationDays;
  }

  async getDaysUntilExpiration(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['updatedAt']
    });

    if (!user || !user.updatedAt) return this.policy.expirationDays;

    const daysSinceUpdate = Math.floor(
      (Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return Math.max(0, this.policy.expirationDays - daysSinceUpdate);
  }

  async shouldWarnPasswordExpiry(userId: string): Promise<boolean> {
    const daysUntilExpiry = await this.getDaysUntilExpiration(userId);
    return daysUntilExpiry <= this.policy.warningDays;
  }

  private async isPasswordReused(userId: string, newPassword: string): Promise<boolean> {
    const history = await this.passwordHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: this.policy.historyCount,
    });

    for (const record of history) {
      const matches = await this.verifyPassword(newPassword, record.passwordHash);
      if (matches) return true;
    }

    return false;
  }

  private async savePasswordHistory(
    userId: string,
    passwordHash: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    // Clean up old history beyond the limit
    const historyCount = await this.passwordHistoryRepository.count({ where: { userId } });
    if (historyCount >= this.policy.historyCount) {
      const oldRecords = await this.passwordHistoryRepository.find({
        where: { userId },
        order: { createdAt: 'ASC' },
        take: historyCount - this.policy.historyCount + 1,
      });

      await this.passwordHistoryRepository.remove(oldRecords);
    }

    // Save current password to history
    const historyRecord = this.passwordHistoryRepository.create({
      userId,
      passwordHash,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    await this.passwordHistoryRepository.save(historyRecord);
  }

  private async logPasswordEvent(
    userId: string,
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

  async getPasswordPolicy(): Promise<PasswordPolicyConfig> {
    return { ...this.policy };
  }
}