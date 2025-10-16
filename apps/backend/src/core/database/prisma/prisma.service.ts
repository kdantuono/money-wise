import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../../generated/prisma';

/**
 * PrismaService - Singleton Prisma Client for database operations
 *
 * ARCHITECTURAL DECISION: Global Prisma client with lifecycle management
 * - Extends PrismaClient for direct access to all Prisma methods
 * - Implements OnModuleInit: Connect to database on application startup
 * - Implements OnModuleDestroy: Graceful disconnect on application shutdown
 * - Singleton pattern ensures single connection pool across application
 *
 * USAGE:
 * - Inject PrismaService into any service that needs database access
 * - Access model methods directly: prisma.family.create()
 * - Use transactions: prisma.$transaction([...])
 * - Query raw SQL: prisma.$queryRaw`SELECT ...`
 *
 * @example
 * ```typescript
 * constructor(private readonly prisma: PrismaService) {}
 *
 * async findFamily(id: string) {
 *   return this.prisma.family.findUnique({ where: { id } });
 * }
 * ```
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * OnModuleInit lifecycle hook
   * Connects to database when NestJS module initializes
   * Ensures database is ready before accepting requests
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * OnModuleDestroy lifecycle hook
   * Gracefully disconnects from database on application shutdown
   * Ensures all pending queries complete before exit
   */
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database connection closed');
    } catch (error) {
      this.logger.error('Error disconnecting from database', error);
      throw error;
    }
  }
}
