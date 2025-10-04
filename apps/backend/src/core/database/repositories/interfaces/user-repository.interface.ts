import { User, UserStatus, UserRole } from '../../entities';
import { IBaseRepository } from './base-repository.interface';

/**
 * User repository interface extending base repository with user-specific operations
 */
export interface IUserRepository extends IBaseRepository<User> {
  /**
   * Find user by email address
   * @param email - User email
   * @returns Promise<User | null>
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find users by status
   * @param status - User status
   * @returns Promise<User[]>
   */
  findByStatus(status: UserStatus): Promise<User[]>;

  /**
   * Find users by role
   * @param role - User role
   * @returns Promise<User[]>
   */
  findByRole(role: UserRole): Promise<User[]>;

  /**
   * Check if email is already taken
   * @param email - Email to check
   * @param excludeUserId - User ID to exclude from check (for updates)
   * @returns Promise<boolean>
   */
  isEmailTaken(email: string, excludeUserId?: string): Promise<boolean>;

  /**
   * Update user's last login timestamp
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  updateLastLogin(userId: string): Promise<boolean>;

  /**
   * Update user's email verification status
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  markEmailAsVerified(userId: string): Promise<boolean>;

  /**
   * Update user's status
   * @param userId - User ID
   * @param status - New status
   * @returns Promise<User | null>
   */
  updateStatus(userId: string, status: UserStatus): Promise<User | null>;

  /**
   * Update user's password hash
   * @param userId - User ID
   * @param passwordHash - New password hash
   * @returns Promise<boolean>
   */
  updatePassword(userId: string, passwordHash: string): Promise<boolean>;

  /**
   * Update user preferences
   * @param userId - User ID
   * @param preferences - User preferences object
   * @returns Promise<User | null>
   */
  updatePreferences(userId: string, preferences: User['preferences']): Promise<User | null>;

  /**
   * Find users with pending email verification
   * @param daysSinceRegistration - Number of days since registration
   * @returns Promise<User[]>
   */
  findUnverifiedUsers(daysSinceRegistration?: number): Promise<User[]>;

  /**
   * Find inactive users
   * @param daysSinceLastLogin - Number of days since last login
   * @returns Promise<User[]>
   */
  findInactiveUsers(daysSinceLastLogin: number): Promise<User[]>;

  /**
   * Get user statistics
   * @returns Promise with user counts by status and role
   */
  getUserStats(): Promise<{
    total: number;
    byStatus: Record<UserStatus, number>;
    byRole: Record<UserRole, number>;
    verified: number;
    unverified: number;
  }>;
}