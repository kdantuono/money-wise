import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../core/database/entities/user.entity';

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
  historyLength: number; // How many previous passwords to check against
}

@Injectable()
export class PasswordSecurityService {
  private readonly defaultPolicy: PasswordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    requireNonRepeatChars: true,
    preventCommonPasswords: true,
    preventUserInfoInPassword: true,
    historyLength: 5,
  };

  // Common passwords to prevent (in production, this would be a larger list)
  private readonly commonPasswords = new Set([
    'password', '123456', '123456789', '12345678', '12345',
    'qwerty', 'abc123', 'password123', 'admin', 'letmein',
    'welcome', 'monkey', '1234567890', 'iloveyou', 'sunshine',
    'princess', 'dragon', 'rockyou', 'football', 'master',
  ]);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Validates password against security policy
   */
  validatePassword(
    password: string,
    userInfo?: { email?: string; firstName?: string; lastName?: string },
    policy: Partial<PasswordPolicy> = {},
  ): PasswordStrengthResult {
    const appliedPolicy = { ...this.defaultPolicy, ...policy };
    const feedback: string[] = [];
    let score = 0;

    // Length checks
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

    if (appliedPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
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
   * Hash password with secure salt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Check if password has been used recently by user
   */
  async isPasswordInHistory(userId: string, newPassword: string): Promise<boolean> {
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
}