/**
 * User Repository Interface for MoneyWise Application
 * Extends base repository with User-specific operations
 */

import { User } from '../../../../entities/user.entity';
import { IBaseRepository } from './base.repository.interface';

export interface IUserRepository extends IBaseRepository<User> {
  /**
   * Find user by email address
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Check if email is already taken (excluding specific user)
   */
  isEmailTaken(email: string, excludeUserId?: string): Promise<boolean>;

  /**
   * Find user by email verification token
   */
  findByEmailVerificationToken(token: string): Promise<User | null>;

  /**
   * Find user by password reset token
   */
  findByPasswordResetToken(token: string): Promise<User | null>;

  /**
   * Mark user email as verified
   */
  markEmailAsVerified(userId: string): Promise<boolean>;

  /**
   * Update user password hash
   */
  updatePasswordHash(userId: string, passwordHash: string): Promise<boolean>;

  /**
   * Set password reset token
   */
  setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<boolean>;

  /**
   * Clear password reset token
   */
  clearPasswordResetToken(userId: string): Promise<boolean>;

  /**
   * Get user with their accounts
   */
  findWithAccounts(userId: string): Promise<User | null>;

  /**
   * Get users created within date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<User[]>;

  /**
   * Get user statistics
   */
  getUserStats(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    recentlyCreated: number;
  }>;

  /**
   * Soft delete user (mark as inactive)
   */
  softDelete(userId: string): Promise<boolean>;

  /**
   * Search users by name or email
   */
  search(query: string, limit?: number): Promise<User[]>;
}