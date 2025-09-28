import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CloudWatchService } from './cloudwatch.service';

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

export interface ApiMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
}

@Injectable()
export class MonitoringService implements OnModuleInit {
  private readonly logger = new Logger(MonitoringService.name);
  private startTime = Date.now();
  private requestCount = 0;
  private errorCount = 0;
  private metricsBuffer: ApiMetrics[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(private readonly cloudWatchService?: CloudWatchService) {}

  async onModuleInit() {
    // Setup periodic system metrics reporting
    this.setupSystemMetricsReporting();

    // Setup metrics buffer flushing
    this.setupMetricsBufferFlushing();

    this.logger.log('Monitoring service initialized');
  }

  onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }

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

    // Send to CloudWatch if available
    if (this.cloudWatchService) {
      this.cloudWatchService.logDatabaseMetrics(query, duration);
    }
  }

  /**
   * Track API request metrics with CloudWatch integration
   */
  async trackApiRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
  ): Promise<void> {
    // Update local counters
    this.incrementRequestCount();
    if (statusCode >= 400) {
      this.incrementErrorCount();
    }

    // Buffer metrics for batch sending to CloudWatch
    const metrics: ApiMetrics = {
      endpoint,
      method,
      statusCode,
      responseTime,
      userId,
    };

    this.metricsBuffer.push(metrics);

    // Log performance issues immediately
    this.logPerformanceMetric(`${method} ${endpoint}`, responseTime);

    // Send to CloudWatch immediately for critical metrics
    if (this.cloudWatchService) {
      await this.cloudWatchService.logApiMetrics(
        endpoint,
        method,
        statusCode,
        responseTime,
        userId,
      );
    }
  }

  /**
   * Track business metrics specific to MoneyWise
   */
  async trackBusinessMetrics(
    activeUsers: number,
    transactionCount: number,
    totalTransactionValue: number,
  ): Promise<void> {
    const errorRate = this.requestCount > 0
      ? (this.errorCount / this.requestCount) * 100
      : 0;

    const avgResponseTime = this.getAverageResponseTime();

    if (this.cloudWatchService) {
      await this.cloudWatchService.logBusinessMetrics({
        activeUsers,
        transactionCount,
        totalTransactionValue,
        errorRate,
        responseTime: avgResponseTime,
      });
    }

    this.logger.log(`Business metrics: ${activeUsers} users, ${transactionCount} transactions, $${totalTransactionValue.toFixed(2)} total value`);
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary(): {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    uptime: number;
    memoryUsage: number;
  } {
    const memory = process.memoryUsage();
    const uptime = Date.now() - this.startTime;

    return {
      totalRequests: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      uptime,
      memoryUsage: (memory.heapUsed / memory.heapTotal) * 100,
    };
  }

  /**
   * Setup periodic system metrics reporting to CloudWatch
   */
  private setupSystemMetricsReporting(): void {
    if (!this.cloudWatchService) {
      return;
    }

    // Report system metrics every 5 minutes
    setInterval(async () => {
      try {
        await this.cloudWatchService.logSystemMetrics();
        this.logger.debug('System metrics sent to CloudWatch');
      } catch (error) {
        this.logger.error('Failed to send system metrics to CloudWatch', error.stack);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Setup metrics buffer flushing
   */
  private setupMetricsBufferFlushing(): void {
    // Flush metrics buffer every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushMetricsBuffer();
    }, 30 * 1000); // 30 seconds
  }

  /**
   * Flush accumulated metrics to CloudWatch
   */
  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0 || !this.cloudWatchService) {
      return;
    }

    try {
      // Process buffered metrics for aggregation
      const aggregatedMetrics = this.aggregateMetrics(this.metricsBuffer);

      // Send aggregated metrics to CloudWatch
      for (const metric of aggregatedMetrics) {
        await this.cloudWatchService.putMetric(
          metric.name,
          metric.value,
          'Count', // Default unit as string
          metric.dimensions,
        );
      }

      this.logger.debug(`Flushed ${this.metricsBuffer.length} metrics to CloudWatch`);
      this.metricsBuffer = []; // Clear buffer
    } catch (error) {
      this.logger.error('Failed to flush metrics buffer', error.stack);
    }
  }

  /**
   * Aggregate metrics for efficient CloudWatch usage
   */
  private aggregateMetrics(metrics: ApiMetrics[]): Array<{
    name: string;
    value: number;
    unit: string;
    dimensions: Record<string, string>;
  }> {
    const aggregated = [];

    // Group by endpoint and method
    const grouped = metrics.reduce((acc, metric) => {
      const key = `${metric.method}:${metric.endpoint}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(metric);
      return acc;
    }, {} as Record<string, ApiMetrics[]>);

    // Create aggregated metrics
    for (const [key, groupedMetrics] of Object.entries(grouped)) {
      const [method, endpoint] = key.split(':');
      const responseTimes = groupedMetrics.map(m => m.responseTime);
      const errorCount = groupedMetrics.filter(m => m.statusCode >= 400).length;

      aggregated.push(
        {
          name: 'RequestCount',
          value: groupedMetrics.length,
          unit: 'Count',
          dimensions: { Endpoint: endpoint, Method: method },
        },
        {
          name: 'AverageResponseTime',
          value: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          unit: 'Milliseconds',
          dimensions: { Endpoint: endpoint, Method: method },
        },
        {
          name: 'ErrorCount',
          value: errorCount,
          unit: 'Count',
          dimensions: { Endpoint: endpoint, Method: method },
        },
      );
    }

    return aggregated;
  }

  /**
   * Calculate average response time from buffer
   */
  private getAverageResponseTime(): number {
    if (this.metricsBuffer.length === 0) {
      return 0;
    }

    const totalTime = this.metricsBuffer.reduce((sum, metric) => sum + metric.responseTime, 0);
    return totalTime / this.metricsBuffer.length;
  }
}