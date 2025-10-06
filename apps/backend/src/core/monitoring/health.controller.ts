import { Controller, Get, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { CloudWatchService } from './cloudwatch.service';
import { AppConfig } from '../config/app.config';
import { MonitoringConfig } from '../config/monitoring.config';

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
  private readonly appVersion: string;
  private readonly environment: string;

  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly cloudWatchService: CloudWatchService,
    private readonly configService: ConfigService,
  ) {
    // Cache config values to avoid repeated lookups
    const appConfig = this.configService.get<AppConfig>('app');
    this.appVersion = appConfig?.APP_VERSION || '1.0.0';
    this.environment = appConfig?.NODE_ENV || 'development';
  }

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
        version: this.appVersion,
        environment: this.environment,
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
        version: this.appVersion,
        environment: this.environment,
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
      // TODO: Implement actual database connection test using TypeORM DataSource
      // For now, assume healthy if database config is present
      const dbConfig = this.configService.get('database');
      if (!dbConfig || !dbConfig.DB_HOST) {
        throw new Error('Database connection not configured');
      }
      return 'healthy';
    } catch {
      return 'unhealthy';
    }
  }

  private async checkRedis(): Promise<'healthy' | 'unhealthy'> {
    try {
      // TODO: Implement actual Redis connection test using Redis client
      // For now, assume healthy if Redis config is present
      const redisConfig = this.configService.get('redis');
      if (!redisConfig || !redisConfig.REDIS_HOST) {
        throw new Error('Redis connection not configured');
      }
      return 'healthy';
    } catch {
      return 'unhealthy';
    }
  }

  private async checkCloudWatch(): Promise<'healthy' | 'unhealthy' | 'disabled'> {
    try {
      // Check if CloudWatch is enabled and accessible
      const monitoringConfig = this.configService.get<MonitoringConfig>('monitoring');
      if (!monitoringConfig?.isCloudWatchEnabled()) {
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
