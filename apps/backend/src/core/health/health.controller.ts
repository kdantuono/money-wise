import { Controller, Get, Inject, HttpStatus, HttpException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import * as Sentry from '@sentry/node';
import { AppConfig } from '../config/app.config';
import { Public } from '../../auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma/prisma.service';

interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  database?: {
    status: 'connected' | 'disconnected';
  };
  memory: {
    used: number;
    total: number;
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject('default') private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', example: 12345 },
        version: { type: 'string', example: '0.1.0' },
        environment: { type: 'string', example: 'development' },
        memory: {
          type: 'object',
          properties: {
            used: { type: 'number' },
            total: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy',
  })
  getHealth(): HealthCheckResponse {
    const appConfig = this.configService.get<AppConfig>('app');
    const memoryUsage = process.memoryUsage();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: appConfig?.APP_VERSION || '0.1.0',
      environment: appConfig?.NODE_ENV || 'development',
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      },
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to accept requests',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  async getReadiness(): Promise<{ status: string; timestamp: string; checks: Record<string, boolean> }> {
    const checks = {
      database: false,
      redis: false,
    };

    try {
      // Check database connection using Prisma
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { healthCheck: 'database' },
        level: 'warning',
      });
    }

    try {
      // Check Redis connection
      await this.redis.ping();
      checks.redis = true;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { healthCheck: 'redis' },
        level: 'warning',
      });
    }

    const isReady = checks.database && checks.redis;

    if (!isReady) {
      throw new HttpException(
        {
          status: 'not ready',
          timestamp: new Date().toISOString(),
          checks,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  getLiveness(): { status: string; timestamp: string } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with service dependencies' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information including services',
  })
  async getDetailedHealth(): Promise<HealthCheckResponse & { services: Record<string, { status: string; responseTime?: number; error?: string; details?: Record<string, unknown> }> }> {
    return Sentry.startSpan(
      {
        op: 'http.server',
        name: 'GET /health/detailed',
      },
      async () => {
        const basicHealth = this.getHealth();

        // Add service health checks with individual spans
        const database = await Sentry.startSpan(
          { op: 'db.check', name: 'Database Health Check' },
          () => this.checkDatabaseHealth(),
        );

        const redis = await Sentry.startSpan(
          { op: 'redis.check', name: 'Redis Health Check' },
          () => this.checkRedisHealth(),
        );

        const services = {
          database,
          redis,
        };

        // Determine overall health status
        const allHealthy = Object.values(services).every(service => service.status === 'ok');

        return {
          ...basicHealth,
          status: allHealthy ? 'ok' : 'error',
          services,
        };
      },
    );
  }

  @Public()
  @Get('metrics')
  @ApiOperation({ summary: 'Application metrics and resource usage' })
  @ApiResponse({
    status: 200,
    description: 'Detailed application metrics',
  })
  getMetrics(): {
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    process: {
      pid: number;
      uptime: number;
      cpuUsage: {
        user: number;
        system: number;
      };
    };
    system: {
      platform: string;
      nodeVersion: string;
      v8Version: string;
    };
  } {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024), // MB
      },
      process: {
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        cpuUsage,
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        v8Version: process.versions.v8,
      },
    };
  }

  private async checkDatabaseHealth(): Promise<{ status: string; responseTime?: number; error?: string; details?: Record<string, unknown> }> {
    try {
      const start = Date.now();

      // Execute simple query with 5-second timeout to prevent hanging
      const healthCheck = this.prisma.$queryRaw`SELECT 1 as health`;
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database health check timeout (5s)')), 5000)
      );

      await Promise.race([healthCheck, timeout]);

      const responseTime = Date.now() - start;

      // Note: Prisma doesn't expose connection pool stats directly
      // Pool is managed internally by Prisma's connection management
      return {
        status: 'ok',
        responseTime,
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { healthCheck: 'database' },
      });

      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  private async checkRedisHealth(): Promise<{ status: string; responseTime?: number; error?: string; details?: Record<string, unknown> }> {
    try {
      const start = Date.now();

      // Create 5-second timeout promise
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis health check timeout (5s)')), 5000)
      );

      // Ping Redis with timeout
      const pingPromise = this.redis.ping();
      const pong = await Promise.race([pingPromise, timeout]);

      if (pong !== 'PONG') {
        throw new Error(`Unexpected Redis response: ${pong}`);
      }

      // Get Redis info with timeout
      const infoPromise = this.redis.info('server');
      const info = await Promise.race([infoPromise, timeout]) as string;
      const versionMatch = info.match(/redis_version:([^\r\n]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      const responseTime = Date.now() - start;

      return {
        status: 'ok',
        responseTime,
        details: { version },
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { healthCheck: 'redis' },
      });

      return {
        status: 'error',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Sentry Test Endpoint
   * Triggers a test error to verify Sentry integration is working
   *
   * ⚠️ This endpoint is for testing ONLY - remove in production or add auth guard
   *
   * Usage:
   * 1. Set SENTRY_DSN in .env
   * 2. Start backend: pnpm --filter @money-wise/backend dev
   * 3. Trigger error: curl http://localhost:3001/api/health/sentry-test
   * 4. Check Sentry dashboard for error
   */
  @Public()
  @Get('sentry-test')
  @ApiOperation({
    summary: 'Test Sentry error tracking (DEV ONLY)',
    description: 'Triggers a test error to verify Sentry integration. Remove in production.'
  })
  @ApiResponse({
    status: 500,
    description: 'Intentional test error for Sentry verification',
  })
  testSentry(): never {
    const appConfig = this.configService.get<AppConfig>('app');

    // Only allow in non-production environments
    if (appConfig?.NODE_ENV === 'production') {
      throw new Error('Sentry test endpoint is disabled in production');
    }

    // Trigger test error
    throw new Error('[SENTRY TEST] This is an intentional test error to verify Sentry integration');
  }
}