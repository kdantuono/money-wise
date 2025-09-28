import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User, UserStatus, UserRole } from '../../entities';
import { IUserRepository } from '../interfaces/user-repository.interface';
import { BaseRepository } from './base.repository';

/**
 * User repository implementation extending base repository with user-specific operations
 */
@Injectable()
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor(dataSource: DataSource) {
    super(dataSource, User, 'UserRepository');
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      this.logger.debug(`Finding user by email: ${email}`);

      const user = await this.repository.findOne({
        where: { email: email.toLowerCase() },
      });

      this.logger.debug(`Found user by email ${email}: ${user ? 'success' : 'not found'}`);
      return user;
    } catch (error) {
      this.logger.error(`Error finding user by email ${email}:`, error);
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  async findByStatus(status: UserStatus): Promise<User[]> {
    try {
      this.logger.debug(`Finding users by status: ${status}`);

      const users = await this.repository.find({
        where: { status },
        order: { createdAt: 'DESC' },
      });

      this.logger.debug(`Found ${users.length} users with status ${status}`);
      return users;
    } catch (error) {
      this.logger.error(`Error finding users by status ${status}:`, error);
      throw new Error(`Failed to find users by status: ${error.message}`);
    }
  }

  async findByRole(role: UserRole): Promise<User[]> {
    try {
      this.logger.debug(`Finding users by role: ${role}`);

      const users = await this.repository.find({
        where: { role },
        order: { createdAt: 'DESC' },
      });

      this.logger.debug(`Found ${users.length} users with role ${role}`);
      return users;
    } catch (error) {
      this.logger.error(`Error finding users by role ${role}:`, error);
      throw new Error(`Failed to find users by role: ${error.message}`);
    }
  }

  async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking if email is taken: ${email} (excluding: ${excludeUserId})`);

      const queryBuilder = this.createQueryBuilder('user')
        .where('LOWER(user.email) = LOWER(:email)', { email });

      if (excludeUserId) {
        queryBuilder.andWhere('user.id != :excludeUserId', { excludeUserId });
      }

      const count = await queryBuilder.getCount();
      const isTaken = count > 0;

      this.logger.debug(`Email ${email} is taken: ${isTaken}`);
      return isTaken;
    } catch (error) {
      this.logger.error(`Error checking if email is taken ${email}:`, error);
      throw new Error(`Failed to check email availability: ${error.message}`);
    }
  }

  async updateLastLogin(userId: string): Promise<boolean> {
    try {
      this.logger.debug(`Updating last login for user: ${userId}`);

      const result = await this.repository.update(userId, {
        lastLoginAt: new Date(),
      });

      const success = result.affected > 0;
      this.logger.debug(`Updated last login for user ${userId}: ${success ? 'success' : 'not found'}`);
      return success;
    } catch (error) {
      this.logger.error(`Error updating last login for user ${userId}:`, error);
      throw new Error(`Failed to update last login: ${error.message}`);
    }
  }

  async markEmailAsVerified(userId: string): Promise<boolean> {
    try {
      this.logger.debug(`Marking email as verified for user: ${userId}`);

      const result = await this.repository.update(userId, {
        emailVerifiedAt: new Date(),
      });

      const success = result.affected > 0;
      this.logger.debug(`Marked email as verified for user ${userId}: ${success ? 'success' : 'not found'}`);
      return success;
    } catch (error) {
      this.logger.error(`Error marking email as verified for user ${userId}:`, error);
      throw new Error(`Failed to mark email as verified: ${error.message}`);
    }
  }

  async updateStatus(userId: string, status: UserStatus): Promise<User | null> {
    try {
      this.logger.debug(`Updating status for user ${userId} to: ${status}`);

      await this.repository.update(userId, { status });
      const user = await this.findById(userId);

      this.logger.debug(`Updated status for user ${userId}: ${user ? 'success' : 'not found'}`);
      return user;
    } catch (error) {
      this.logger.error(`Error updating status for user ${userId}:`, error);
      throw new Error(`Failed to update user status: ${error.message}`);
    }
  }

  async updatePassword(userId: string, passwordHash: string): Promise<boolean> {
    try {
      this.logger.debug(`Updating password for user: ${userId}`);

      const result = await this.repository.update(userId, {
        passwordHash,
      });

      const success = result.affected > 0;
      this.logger.debug(`Updated password for user ${userId}: ${success ? 'success' : 'not found'}`);
      return success;
    } catch (error) {
      this.logger.error(`Error updating password for user ${userId}:`, error);
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  async updatePreferences(userId: string, preferences: User['preferences']): Promise<User | null> {
    try {
      this.logger.debug(`Updating preferences for user: ${userId}`);

      await this.repository.update(userId, { preferences });
      const user = await this.findById(userId);

      this.logger.debug(`Updated preferences for user ${userId}: ${user ? 'success' : 'not found'}`);
      return user;
    } catch (error) {
      this.logger.error(`Error updating preferences for user ${userId}:`, error);
      throw new Error(`Failed to update user preferences: ${error.message}`);
    }
  }

  async findUnverifiedUsers(daysSinceRegistration?: number): Promise<User[]> {
    try {
      this.logger.debug(`Finding unverified users (days since registration: ${daysSinceRegistration})`);

      const queryBuilder = this.createQueryBuilder('user')
        .where('user.emailVerifiedAt IS NULL');

      if (daysSinceRegistration) {
        queryBuilder.andWhere(
          'user.createdAt <= :cutoffDate',
          { cutoffDate: new Date(Date.now() - daysSinceRegistration * 24 * 60 * 60 * 1000) }
        );
      }

      const users = await queryBuilder
        .orderBy('user.createdAt', 'ASC')
        .getMany();

      this.logger.debug(`Found ${users.length} unverified users`);
      return users;
    } catch (error) {
      this.logger.error(`Error finding unverified users:`, error);
      throw new Error(`Failed to find unverified users: ${error.message}`);
    }
  }

  async findInactiveUsers(daysSinceLastLogin: number): Promise<User[]> {
    try {
      this.logger.debug(`Finding inactive users (days since last login: ${daysSinceLastLogin})`);

      const cutoffDate = new Date(Date.now() - daysSinceLastLogin * 24 * 60 * 60 * 1000);

      const users = await this.createQueryBuilder('user')
        .where('user.lastLoginAt <= :cutoffDate OR user.lastLoginAt IS NULL', { cutoffDate })
        .andWhere('user.status = :activeStatus', { activeStatus: UserStatus.ACTIVE })
        .orderBy('user.lastLoginAt', 'ASC')
        .getMany();

      this.logger.debug(`Found ${users.length} inactive users`);
      return users;
    } catch (error) {
      this.logger.error(`Error finding inactive users:`, error);
      throw new Error(`Failed to find inactive users: ${error.message}`);
    }
  }

  async getUserStats(): Promise<{
    total: number;
    byStatus: Record<UserStatus, number>;
    byRole: Record<UserRole, number>;
    verified: number;
    unverified: number;
  }> {
    try {
      this.logger.debug(`Getting user statistics`);

      const [
        total,
        statusStats,
        roleStats,
        verified,
        unverified,
      ] = await Promise.all([
        this.repository.count(),
        this.createQueryBuilder('user')
          .select('user.status, COUNT(*) as count')
          .groupBy('user.status')
          .getRawMany(),
        this.createQueryBuilder('user')
          .select('user.role, COUNT(*) as count')
          .groupBy('user.role')
          .getRawMany(),
        this.repository.count({ where: { emailVerifiedAt: { } } }),
        this.repository.count({ where: { emailVerifiedAt: null } }),
      ]);

      // Build status counts with defaults
      const byStatus = Object.values(UserStatus).reduce((acc, status) => {
        acc[status] = 0;
        return acc;
      }, {} as Record<UserStatus, number>);

      statusStats.forEach(stat => {
        byStatus[stat.user_status] = parseInt(stat.count);
      });

      // Build role counts with defaults
      const byRole = Object.values(UserRole).reduce((acc, role) => {
        acc[role] = 0;
        return acc;
      }, {} as Record<UserRole, number>);

      roleStats.forEach(stat => {
        byRole[stat.user_role] = parseInt(stat.count);
      });

      const stats = {
        total,
        byStatus,
        byRole,
        verified,
        unverified,
      };

      this.logger.debug(`Got user statistics:`, stats);
      return stats;
    } catch (error) {
      this.logger.error(`Error getting user statistics:`, error);
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }
}