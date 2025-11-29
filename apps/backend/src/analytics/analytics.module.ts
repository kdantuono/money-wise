import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from '../core/database/prisma/prisma.module';

/**
 * Analytics Module
 *
 * Provides dashboard analytics functionality including:
 * - Dashboard statistics (balance, income, expenses, savings rate)
 * - Spending breakdown by category
 * - Recent transactions
 * - Spending trends over time
 *
 * All analytics data is scoped to the authenticated user's accounts.
 */
@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
