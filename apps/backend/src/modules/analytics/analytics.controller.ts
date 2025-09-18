import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview analytics' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics retrieved successfully' })
  async getDashboardOverview(@Request() req) {
    return await this.analyticsService.getDashboardOverview(req.user.id);
  }

  @Get('spending-trends')
  @ApiOperation({ summary: 'Get spending trends over time' })
  @ApiResponse({ status: 200, description: 'Spending trends retrieved successfully' })
  async getSpendingTrends(@Request() req, @Query('months') months?: number) {
    return await this.analyticsService.getSpendingTrends(req.user.id, months);
  }

  @Get('category-analytics')
  @ApiOperation({ summary: 'Get spending analytics by category' })
  @ApiResponse({ status: 200, description: 'Category analytics retrieved successfully' })
  async getCategoryAnalytics(@Request() req, @Query('period') period?: string) {
    return await this.analyticsService.getCategoryAnalytics(req.user.id, period);
  }
}