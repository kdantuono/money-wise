import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { CloudWatchService } from './cloudwatch.service';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    cloudwatch: 'healthy' | 'unhealthy' | 'disabled';
  };
  metrics: {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    memoryUsage: number;
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly cloudWatchService: CloudWatchService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({
    status: 200,
    description: 'Application health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        timestamp: { type: 'string' },
        uptime: { type: 'number' },
        version: { type: 'string' },
        environment: { type: 'string' },
        services: {
          type: 'object',
          properties: {
            database: { type: 'string', enum: ['healthy', 'unhealthy'] },
            redis: { type: 'string', enum: ['healthy', 'unhealthy'] },
            cloudwatch: { type: 'string', enum: ['healthy', 'unhealthy', 'disabled'] },
          },
        },
        metrics: {
          type: 'object',
          properties: {
            totalRequests: { type: 'number' },
            errorCount: { type: 'number' },
            errorRate: { type: 'number' },
            memoryUsage: { type: 'number' },
          },
        },
      },
    },
  })
  async getHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Get performance metrics
      const performanceSummary = this.monitoringService.getPerformanceSummary();

      // Check service health
      const services = await this.checkServices();

      // Determine overall status
      const overallStatus = this.calculateOverallStatus(services, performanceSummary);

      const healthStatus: HealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: performanceSummary.uptime,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services,
        metrics: {
          totalRequests: performanceSummary.totalRequests,
          errorCount: performanceSummary.errorCount,
          errorRate: performanceSummary.errorRate,
          memoryUsage: performanceSummary.memoryUsage,
        },
      };

      // Track this health check
      const responseTime = Date.now() - startTime;
      await this.monitoringService.trackApiRequest(
        '/health',
        'GET',
        200,
        responseTime,
      );

      return healthStatus;
    } catch (error) {
      this.logger.error('Health check failed', error.stack);

      const responseTime = Date.now() - startTime;
      await this.monitoringService.trackApiRequest(
        '/health',
        'GET',
        500,
        responseTime,
      );

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime() * 1000,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: 'unhealthy',
          redis: 'unhealthy',
          cloudwatch: 'unhealthy',
        },
        metrics: {
          totalRequests: 0,
          errorCount: 1,
          errorRate: 100,
          memoryUsage: 0,
        },
      };
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get detailed system metrics' })
  @ApiResponse({
    status: 200,
    description: 'Detailed system metrics',
  })
  async getMetrics() {
    const systemMetrics = this.monitoringService.getSystemMetrics();
    const performanceSummary = this.monitoringService.getPerformanceSummary();

    // Send current metrics to CloudWatch
    await this.cloudWatchService.logSystemMetrics();

    return {
      system: systemMetrics,
      performance: performanceSummary,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkServices(): Promise<{
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    cloudwatch: 'healthy' | 'unhealthy' | 'disabled';
  }> {
    return {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      cloudwatch: await this.checkCloudWatch(),
    };
  }

  private async checkDatabase(): Promise<'healthy' | 'unhealthy'> {
    try {
      // Simple database connection check
      // This would be implemented with actual database connection test
      return 'healthy';
    } catch (error) {
      this.logger.error('Database health check failed', error.stack);
      return 'unhealthy';
    }
  }

  private async checkRedis(): Promise<'healthy' | 'unhealthy'> {
    try {
      // Simple Redis connection check
      // This would be implemented with actual Redis connection test
      return 'healthy';
    } catch (error) {
      this.logger.error('Redis health check failed', error.stack);
      return 'unhealthy';
    }
  }

  private async checkCloudWatch(): Promise<'healthy' | 'unhealthy' | 'disabled'> {
    try {
      // Check if CloudWatch is enabled and accessible
      if (!process.env.CLOUDWATCH_ENABLED || process.env.CLOUDWATCH_ENABLED === 'false') {
        return 'disabled';
      }

      // Test CloudWatch connectivity by sending a test metric
      await this.cloudWatchService.putMetric('HealthCheck', 1);
      return 'healthy';
    } catch (error) {
      this.logger.error('CloudWatch health check failed', error.stack);
      return 'unhealthy';
    }
  }

  private calculateOverallStatus(
    services: {
      database: 'healthy' | 'unhealthy';
      redis: 'healthy' | 'unhealthy';
      cloudwatch: 'healthy' | 'unhealthy' | 'disabled';
    },
    performance: {
      errorRate: number;
      memoryUsage: number;
    },
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Critical services check
    if (services.database === 'unhealthy') {
      return 'unhealthy';
    }

    // Performance degradation check
    if (performance.errorRate > 10 || performance.memoryUsage > 90) {
      return 'degraded';
    }

    // Non-critical services check
    if (services.redis === 'unhealthy' || services.cloudwatch === 'unhealthy') {
      return 'degraded';
    }

    return 'healthy';
  }
}