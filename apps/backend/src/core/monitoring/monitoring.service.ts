import { Injectable, Logger } from '@nestjs/common';

export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  cpu: {
    usage: number;
  };
  requests: {
    total: number;
    errors: number;
    successRate: number;
  };
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private startTime = Date.now();
  private requestCount = 0;
  private errorCount = 0;

  getSystemMetrics(): SystemMetrics {
    const uptime = Date.now() - this.startTime;
    const memory = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      uptime,
      memory: {
        used: memory.heapUsed,
        total: memory.heapTotal,
        usage: (memory.heapUsed / memory.heapTotal) * 100,
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
      },
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        successRate: this.requestCount > 0 ?
          ((this.requestCount - this.errorCount) / this.requestCount) * 100 : 100,
      },
    };
  }

  incrementRequestCount(): void {
    this.requestCount++;
  }

  incrementErrorCount(): void {
    this.errorCount++;
    this.logger.warn(`Error count increased to ${this.errorCount}`);
  }

  logPerformanceMetric(operation: string, duration: number): void {
    this.logger.log(`Performance: ${operation} took ${duration}ms`);

    if (duration > 1000) {
      this.logger.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }
  }

  logDatabaseQuery(query: string, duration: number): void {
    this.logger.debug(`DB Query: ${query} (${duration}ms)`);

    if (duration > 500) {
      this.logger.warn(`Slow database query: ${query} took ${duration}ms`);
    }
  }
}