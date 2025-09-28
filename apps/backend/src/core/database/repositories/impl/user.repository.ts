/**
 * User Repository Implementation for MoneyWise Application
 * Implements User-specific data access operations
 */

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { IUserRepository } from '../interfaces/user.repository.interface';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor(dataSource: DataSource) {
    super(dataSource, User);
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.repository.findOne({
        where: { email: email.toLowerCase() },
      });
      return user || null;
    } catch (error) {
      this.logger.error(`Failed to find user by email: ${error.message}`, error.stack);
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      const query = this.repository.createQueryBuilder('user')
        .where('LOWER(user.email) = LOWER(:email)', { email });

      if (excludeUserId) {
        query.andWhere('user.id != :excludeUserId', { excludeUserId });
      }

      const count = await query.getCount();
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check if email is taken: ${error.message}`, error.stack);
      throw new Error(`Failed to check if email is taken: ${error.message}`);
    }
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    try {
      const user = await this.repository.findOne({
        where: { emailVerificationToken: token },
      });
      return user || null;
    } catch (error) {
      this.logger.error(`Failed to find user by verification token: ${error.message}`, error.stack);
      throw new Error(`Failed to find user by verification token: ${error.message}`);
    }
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    try {
      const user = await this.repository.findOne({
        where: { passwordResetToken: token },
      });
      return user || null;
    } catch (error) {
      this.logger.error(`Failed to find user by reset token: ${error.message}`, error.stack);
      throw new Error(`Failed to find user by reset token: ${error.message}`);
    }
  }

  async markEmailAsVerified(userId: string): Promise<boolean> {
    try {
      const result = await this.repository.update(userId, {
        emailVerified: true,
        emailVerificationToken: null,
      });
      return !!(result.affected && result.affected > 0);
    } catch (error) {
      this.logger.error(`Failed to mark email as verified: ${error.message}`, error.stack);
      throw new Error(`Failed to mark email as verified: ${error.message}`);
    }
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<boolean> {
    try {
      const result = await this.repository.update(userId, { passwordHash });
      return !!(result.affected && result.affected > 0);
    } catch (error) {
      this.logger.error(`Failed to update password hash: ${error.message}`, error.stack);
      throw new Error(`Failed to update password hash: ${error.message}`);
    }
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<boolean> {
    try {
      const result = await this.repository.update(userId, {
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
      });
      return !!(result.affected && result.affected > 0);
    } catch (error) {
      this.logger.error(`Failed to set password reset token: ${error.message}`, error.stack);
      throw new Error(`Failed to set password reset token: ${error.message}`);
    }
  }

  async clearPasswordResetToken(userId: string): Promise<boolean> {
    try {
      const result = await this.repository.update(userId, {
        passwordResetToken: null,
        passwordResetExpires: null,
      });
      return !!(result.affected && result.affected > 0);
    } catch (error) {
      this.logger.error(`Failed to clear password reset token: ${error.message}`, error.stack);
      throw new Error(`Failed to clear password reset token: ${error.message}`);
    }
  }

  async findWithAccounts(userId: string): Promise<User | null> {
    try {
      const user = await this.repository.findOne({
        where: { id: userId },
        relations: ['accounts'],
      });
      return user || null;
    } catch (error) {
      this.logger.error(`Failed to find user with accounts: ${error.message}`, error.stack);
      throw new Error(`Failed to find user with accounts: ${error.message}`);
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    try {
      const users = await this.repository
        .createQueryBuilder('user')
        .where('user.createdAt >= :startDate', { startDate })
        .andWhere('user.createdAt <= :endDate', { endDate })
        .orderBy('user.createdAt', 'DESC')
        .getMany();

      return users;
    } catch (error) {
      this.logger.error(`Failed to find users by date range: ${error.message}`, error.stack);
      throw new Error(`Failed to find users by date range: ${error.message}`);
    }
  }

  async getUserStats(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    recentlyCreated: number;
  }> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [total, verified, recentlyCreated] = await Promise.all([
        this.repository.count(),
        this.repository.count({ where: { emailVerified: true } }),
        this.repository.count({
          where: {
            createdAt: this.repository.manager.createQueryBuilder()
              .select()
              .where('createdAt >= :date', { date: sevenDaysAgo })
              .getQuery() as any,
          },
        }),
      ]);

      return {
        total,
        verified,
        unverified: total - verified,
        recentlyCreated,
      };
    } catch (error) {
      this.logger.error(`Failed to get user stats: ${error.message}`, error.stack);
      throw new Error(`Failed to get user stats: ${error.message}`);
    }
  }

  async softDelete(userId: string): Promise<boolean> {
    try {
      // In a real implementation, you might add an 'isActive' field
      // For now, we'll just log the soft delete
      this.logger.warn(`Soft delete requested for user: ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to soft delete user: ${error.message}`, error.stack);
      throw new Error(`Failed to soft delete user: ${error.message}`);
    }
  }

  async search(query: string, limit = 10): Promise<User[]> {
    try {
      const users = await this.repository
        .createQueryBuilder('user')
        .where('LOWER(user.firstName) LIKE LOWER(:query)', { query: `%${query}%` })
        .orWhere('LOWER(user.lastName) LIKE LOWER(:query)', { query: `%${query}%` })
        .orWhere('LOWER(user.email) LIKE LOWER(:query)', { query: `%${query}%` })
        .orderBy('user.firstName', 'ASC')
        .addOrderBy('user.lastName', 'ASC')
        .limit(limit)
        .getMany();

      return users;
    } catch (error) {
      this.logger.error(`Failed to search users: ${error.message}`, error.stack);
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }
}