import { Injectable } from '@nestjs/common';
import { PasswordPolicyConfig, SPECIAL_CHARACTERS, COMMON_PASSWORDS } from '../../core/config/auth-password-policy.config';

export interface PasswordStrengthResult {
  score: number; // 0-100
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  isValid: boolean;
}

@Injectable()
export class PasswordStrengthService {
  calculateStrength(
    password: string,
    policy: PasswordPolicyConfig,
    userInfo?: { firstName?: string; lastName?: string; email?: string }
  ): PasswordStrengthResult {
    const feedback: string[] = [];
    let score = 0;

    // Length scoring (0-25 points)
    if (password.length >= policy.minLength) {
      score += Math.min(25, (password.length - policy.minLength) * 2 + 10);
    } else {
      feedback.push(`Password must be at least ${policy.minLength} characters long`);
    }

    // Character variety scoring (0-40 points)
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = new RegExp(`[${SPECIAL_CHARACTERS.replace(/[[\]\\]/g, '\\$&')}]`).test(password);

    if (hasLower) score += 10;
    else if (policy.requireLowercase) feedback.push('Password must contain at least one lowercase letter');

    if (hasUpper) score += 10;
    else if (policy.requireUppercase) feedback.push('Password must contain at least one uppercase letter');

    if (hasNumbers) score += 10;
    else if (policy.requireNumbers) feedback.push('Password must contain at least one number');

    if (hasSpecial) score += 10;
    else if (policy.requireSpecialChars) feedback.push('Password must contain at least one special character');

    // Pattern complexity (0-20 points)
    const uniqueChars = new Set(password).size;
    score += Math.min(20, (uniqueChars / password.length) * 20);

    // Check for repeating characters
    const repeatingPattern = this.hasRepeatingPattern(password, policy.maxRepeatingChars);
    if (repeatingPattern) {
      score -= 10;
      feedback.push(`Avoid repeating characters more than ${policy.maxRepeatingChars} times`);
    }

    // Sequential characters check
    if (this.hasSequentialChars(password)) {
      score -= 10;
      feedback.push('Avoid sequential characters (e.g., abc, 123)');
    }

    // Common password check (0-15 points penalty)
    if (policy.preventCommonPasswords && this.isCommonPassword(password)) {
      score -= 15;
      feedback.push('This password is too common. Please choose a more unique password');
    }

    // Personal information check
    if (policy.preventPersonalInfo && userInfo && this.containsPersonalInfo(password, userInfo)) {
      score -= 15;
      feedback.push('Password should not contain personal information');
    }

    // Entropy bonus (0-15 points)
    const entropy = this.calculateEntropy(password);
    if (entropy > 50) {
      score += Math.min(15, (entropy - 50) / 5);
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine strength level
    let strength: PasswordStrengthResult['strength'];
    if (score < 20) strength = 'very-weak';
    else if (score < 40) strength = 'weak';
    else if (score < 60) strength = 'fair';
    else if (score < 80) strength = 'good';
    else strength = 'strong';

    // Add positive feedback for strong passwords
    if (score >= 80) {
      feedback.unshift('Excellent! This is a strong password');
    } else if (score >= 60) {
      feedback.unshift('Good password strength');
    }

    return {
      score,
      strength,
      feedback,
      isValid: feedback.length === 0 || feedback[0].startsWith('Excellent') || feedback[0].startsWith('Good'),
    };
  }

  private hasRepeatingPattern(password: string, maxRepeating: number): boolean {
    for (let i = 0; i <= password.length - maxRepeating - 1; i++) {
      const char = password[i];
      let count = 1;
      for (let j = i + 1; j < password.length && password[j] === char; j++) {
        count++;
      }
      if (count > maxRepeating) return true;
    }
    return false;
  }

  private hasSequentialChars(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      '0123456789',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm',
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substring(i, i + 3);
        if (password.includes(subseq) || password.includes(subseq.split('').reverse().join(''))) {
          return true;
        }
      }
    }
    return false;
  }

  private isCommonPassword(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    return COMMON_PASSWORDS.some(common =>
      lowerPassword.includes(common.toLowerCase()) ||
      common.toLowerCase().includes(lowerPassword)
    );
  }

  private containsPersonalInfo(password: string, userInfo: { firstName?: string; lastName?: string; email?: string }): boolean {
    const lowerPassword = password.toLowerCase();
    const checks = [
      userInfo.firstName?.toLowerCase(),
      userInfo.lastName?.toLowerCase(),
      userInfo.email?.split('@')[0]?.toLowerCase(),
    ];

    return checks.some(info =>
      info && info.length >= 3 && lowerPassword.includes(info)
    );
  }

  private calculateEntropy(password: string): number {
    const charSet = new Set(password);
    const charset = charSet.size;
    return Math.log2(Math.pow(charset, password.length));
  }

  validatePolicy(password: string, policy: PasswordPolicyConfig): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    if (password.length < policy.minLength) {
      violations.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (password.length > policy.maxLength) {
      violations.push(`Password must not exceed ${policy.maxLength} characters`);
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      violations.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      violations.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      violations.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars) {
      const specialCharRegex = new RegExp(`[${SPECIAL_CHARACTERS.replace(/[[\]\\]/g, '\\$&')}]`);
      const specialMatches = password.match(new RegExp(specialCharRegex, 'g'));
      if (!specialMatches || specialMatches.length < policy.minSpecialChars) {
        violations.push(`Password must contain at least ${policy.minSpecialChars} special character(s)`);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }
}