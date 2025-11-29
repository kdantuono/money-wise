import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  TimePeriod,
  DashboardStatsDto,
  CategorySpendingDto,
  RecentTransactionDto,
  TrendDataDto,
} from './dto/analytics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../auth/types/current-user.types';

/**
 * Analytics Controller
 *
 * Provides REST endpoints for dashboard analytics data.
 * All endpoints are authenticated and scoped to the current user's data.
 *
 * Endpoints:
 * - GET /api/analytics/stats - Dashboard statistics
 * - GET /api/analytics/spending-by-category - Category spending breakdown
 * - GET /api/analytics/transactions/recent - Recent transactions
 * - GET /api/analytics/trends - Spending trends over time
 */
@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Returns aggregated statistics including total balance, income, expenses, and savings rate for the selected time period.',
  })
  @ApiQuery({
    name: 'period',
    enum: TimePeriod,
    required: false,
    description: 'Time period for calculations (default: monthly)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query('period') period?: TimePeriod
  ): Promise<DashboardStatsDto> {
    return await this.analyticsService.getStats(
      user.id,
      period || TimePeriod.MONTHLY
    );
  }

  @Get('spending-by-category')
  @ApiOperation({
    summary: 'Get spending breakdown by category',
    description:
      'Returns spending aggregated by category with amounts and percentages for the selected time period.',
  })
  @ApiQuery({
    name: 'period',
    enum: TimePeriod,
    required: false,
    description: 'Time period for calculations (default: monthly)',
  })
  @ApiResponse({
    status: 200,
    description: 'Category spending retrieved successfully',
    type: [CategorySpendingDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getSpendingByCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Query('period') period?: TimePeriod
  ): Promise<CategorySpendingDto[]> {
    return await this.analyticsService.getSpendingByCategory(
      user.id,
      period || TimePeriod.MONTHLY
    );
  }

  @Get('transactions/recent')
  @ApiOperation({
    summary: 'Get recent transactions',
    description:
      'Returns the most recent transactions across all user accounts, sorted by date descending.',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of transactions to return (default: 10, max: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent transactions retrieved successfully',
    type: [RecentTransactionDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getRecentTransactions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ): Promise<RecentTransactionDto[]> {
    // Clamp limit to 1-50 range
    const clampedLimit = Math.min(Math.max(limit, 1), 50);
    return await this.analyticsService.getRecentTransactions(
      user.id,
      clampedLimit
    );
  }

  @Get('trends')
  @ApiOperation({
    summary: 'Get spending trends over time',
    description:
      'Returns income and expense trends grouped by time intervals (daily for weekly, weekly for monthly, monthly for yearly).',
  })
  @ApiQuery({
    name: 'period',
    enum: TimePeriod,
    required: false,
    description: 'Time period for trend calculation (default: monthly)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trend data retrieved successfully',
    type: [TrendDataDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getTrends(
    @CurrentUser() user: CurrentUserPayload,
    @Query('period') period?: TimePeriod
  ): Promise<TrendDataDto[]> {
    return await this.analyticsService.getTrends(
      user.id,
      period || TimePeriod.MONTHLY
    );
  }
}
