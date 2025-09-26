import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';

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
  constructor(private readonly configService: ConfigService) {}

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
  getReadiness(): { status: string; timestamp: string } {
    // Add additional readiness checks here (database, external services, etc.)
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

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

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with service dependencies' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information including services',
  })
  async getDetailedHealth(): Promise<HealthCheckResponse & { services: any }> {
    const basicHealth = this.getHealth();

    // Add service health checks
    const services = {
      database: await this.checkDatabaseHealth(),
      redis: await this.checkRedisHealth(),
    };

    return {
      ...basicHealth,
      services,
    };
  }

  private async checkDatabaseHealth(): Promise<{ status: string; responseTime?: number; error?: string }> {
    try {
      const start = Date.now();
      // Mock database check for now - will be replaced with actual DataSource injection
      await new Promise(resolve => setTimeout(resolve, 1));
      const responseTime = Date.now() - start;

      return {
        status: 'ok',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  private async checkRedisHealth(): Promise<{ status: string; error?: string }> {
    try {
      // Mock Redis check for now - will be replaced with actual Redis client injection
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }
}