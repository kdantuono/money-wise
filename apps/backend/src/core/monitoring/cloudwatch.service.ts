import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CloudWatchClient,
  PutMetricDataCommand,
  MetricDatum,
  StandardUnit,
  PutMetricAlarmCommand,
  PutMetricAlarmCommandInput,
} from '@aws-sdk/client-cloudwatch';
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

export interface CloudWatchConfig {
  region: string;
  namespace: string;
  enabled: boolean;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface BusinessMetrics {
  activeUsers: number;
  transactionCount: number;
  totalTransactionValue: number;
  errorRate: number;
  responseTime: number;
}

@Injectable()
export class CloudWatchService implements OnModuleInit {
  private readonly logger = new Logger(CloudWatchService.name);
  private cloudWatchClient: CloudWatchClient;
  private cloudWatchLogsClient: CloudWatchLogsClient;
  private config: CloudWatchConfig;
  private logGroupName: string;
  private logStreamName: string;

  constructor(private configService: ConfigService) {
    this.config = {
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      namespace: this.configService.get('CLOUDWATCH_NAMESPACE', 'MoneyWise/Backend'),
      enabled: this.configService.get('CLOUDWATCH_ENABLED', 'false') === 'true',
      credentials: this.configService.get('AWS_ACCESS_KEY_ID') ? {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      } : undefined,
    };

    this.logGroupName = `/aws/moneywise/${this.configService.get('NODE_ENV', 'development')}`;
    this.logStreamName = `backend-${new Date().toISOString().slice(0, 10)}-${process.pid}`;
  }

  async onModuleInit() {
    if (!this.config.enabled) {
      this.logger.log('CloudWatch monitoring disabled');
      return;
    }

    try {
      // Initialize CloudWatch clients
      const clientConfig = {
        region: this.config.region,
        ...(this.config.credentials && { credentials: this.config.credentials }),
      };

      this.cloudWatchClient = new CloudWatchClient(clientConfig);
      this.cloudWatchLogsClient = new CloudWatchLogsClient(clientConfig);

      // Setup log group and stream
      await this.setupLogging();

      // Setup default alarms
      await this.setupDefaultAlarms();

      this.logger.log(`CloudWatch monitoring initialized for region: ${this.config.region}`);
    } catch (error) {
      this.logger.error('Failed to initialize CloudWatch service', error.stack);
    }
  }

  /**
   * Send custom metric to CloudWatch
   */
  async putMetric(
    metricName: string,
    value: number,
    unit: StandardUnit = StandardUnit.Count,
    dimensions: Record<string, string> = {},
  ): Promise<void> {
    if (!this.config.enabled || !this.cloudWatchClient) {
      return;
    }

    try {
      const metricData: MetricDatum = {
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({
          Name,
          Value,
        })),
      };

      const command = new PutMetricDataCommand({
        Namespace: this.config.namespace,
        MetricData: [metricData],
      });

      await this.cloudWatchClient.send(command);
      this.logger.debug(`Metric sent to CloudWatch: ${metricName} = ${value}`);
    } catch (error) {
      this.logger.error(`Failed to send metric ${metricName}`, error.stack);
    }
  }

  /**
   * Send multiple metrics in batch
   */
  async putMetrics(metrics: MetricDatum[]): Promise<void> {
    if (!this.config.enabled || !this.cloudWatchClient || metrics.length === 0) {
      return;
    }

    try {
      // CloudWatch allows max 20 metrics per request
      const chunks = this.chunkArray(metrics, 20);

      for (const chunk of chunks) {
        const command = new PutMetricDataCommand({
          Namespace: this.config.namespace,
          MetricData: chunk.map(metric => ({
            ...metric,
            Timestamp: metric.Timestamp || new Date(),
          })),
        });

        await this.cloudWatchClient.send(command);
      }

      this.logger.debug(`Sent ${metrics.length} metrics to CloudWatch`);
    } catch (error) {
      this.logger.error('Failed to send batch metrics', error.stack);
    }
  }

  /**
   * Log API performance metrics
   */
  async logApiMetrics(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
  ): Promise<void> {
    const dimensions = {
      Endpoint: endpoint,
      Method: method,
      StatusCode: statusCode.toString(),
      ...(userId && { UserId: userId }),
    };

    await Promise.all([
      this.putMetric('ApiRequests', 1, StandardUnit.Count, dimensions),
      this.putMetric('ResponseTime', responseTime, StandardUnit.Milliseconds, dimensions),
      this.putMetric('ApiErrors', statusCode >= 400 ? 1 : 0, StandardUnit.Count, dimensions),
    ]);
  }

  /**
   * Log database performance metrics
   */
  async logDatabaseMetrics(
    operation: string,
    duration: number,
    recordCount?: number,
  ): Promise<void> {
    const dimensions = {
      Operation: operation,
      DatabaseType: 'PostgreSQL',
    };

    const metrics: MetricDatum[] = [
      {
        MetricName: 'DatabaseQueryDuration',
        Value: duration,
        Unit: StandardUnit.Milliseconds,
        Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value })),
      },
    ];

    if (recordCount !== undefined) {
      metrics.push({
        MetricName: 'DatabaseRecordsProcessed',
        Value: recordCount,
        Unit: StandardUnit.Count,
        Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value })),
      });
    }

    await this.putMetrics(metrics);
  }

  /**
   * Log business metrics specific to MoneyWise
   */
  async logBusinessMetrics(metrics: BusinessMetrics): Promise<void> {
    const metricData: MetricDatum[] = [
      {
        MetricName: 'ActiveUsers',
        Value: metrics.activeUsers,
        Unit: StandardUnit.Count,
      },
      {
        MetricName: 'TransactionCount',
        Value: metrics.transactionCount,
        Unit: StandardUnit.Count,
      },
      {
        MetricName: 'TotalTransactionValue',
        Value: metrics.totalTransactionValue,
        Unit: StandardUnit.None,
      },
      {
        MetricName: 'ErrorRate',
        Value: metrics.errorRate,
        Unit: StandardUnit.Percent,
      },
      {
        MetricName: 'AverageResponseTime',
        Value: metrics.responseTime,
        Unit: StandardUnit.Milliseconds,
      },
    ];

    await this.putMetrics(metricData);
  }

  /**
   * Log system health metrics
   */
  async logSystemMetrics(): Promise<void> {
    const memory = process.memoryUsage();
    const uptime = process.uptime();

    const metrics: MetricDatum[] = [
      {
        MetricName: 'MemoryUsage',
        Value: (memory.heapUsed / memory.heapTotal) * 100,
        Unit: StandardUnit.Percent,
      },
      {
        MetricName: 'HeapUsed',
        Value: memory.heapUsed / 1024 / 1024, // Convert to MB
        Unit: StandardUnit.Megabytes,
      },
      {
        MetricName: 'HeapTotal',
        Value: memory.heapTotal / 1024 / 1024, // Convert to MB
        Unit: StandardUnit.Megabytes,
      },
      {
        MetricName: 'ProcessUptime',
        Value: uptime,
        Unit: StandardUnit.Seconds,
      },
    ];

    await this.putMetrics(metrics);
  }

  /**
   * Send structured logs to CloudWatch Logs
   */
  async sendLog(
    level: string,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.config.enabled || !this.cloudWatchLogsClient) {
      return;
    }

    try {
      const logEvent = {
        timestamp: Date.now(),
        message: JSON.stringify({
          level,
          message,
          context,
          metadata,
          timestamp: new Date().toISOString(),
          pid: process.pid,
        }),
      };

      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [logEvent],
      });

      await this.cloudWatchLogsClient.send(command);
    } catch (error) {
      this.logger.error('Failed to send log to CloudWatch', error.stack);
    }
  }

  /**
   * Setup CloudWatch log group and stream
   */
  private async setupLogging(): Promise<void> {
    try {
      // Check if log group exists
      const describeCommand = new DescribeLogGroupsCommand({
        logGroupNamePrefix: this.logGroupName,
      });

      const response = await this.cloudWatchLogsClient.send(describeCommand);
      const logGroupExists = response.logGroups?.some(
        group => group.logGroupName === this.logGroupName,
      );

      // Create log group if it doesn't exist
      if (!logGroupExists) {
        await this.cloudWatchLogsClient.send(
          new CreateLogGroupCommand({
            logGroupName: this.logGroupName,
          }),
        );
        this.logger.log(`Created CloudWatch log group: ${this.logGroupName}`);
      }

      // Create log stream
      await this.cloudWatchLogsClient.send(
        new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
        }),
      );

      this.logger.log(`Created CloudWatch log stream: ${this.logStreamName}`);
    } catch (error) {
      if (error.name !== 'ResourceAlreadyExistsException') {
        throw error;
      }
    }
  }

  /**
   * Setup CloudWatch alarms based on configuration
   */
  private async setupDefaultAlarms(): Promise<void> {
    const currentEnvironment = this.configService.get('NODE_ENV', 'development');

    // Import alarm configurations
    const { CLOUDWATCH_ALARMS, ENVIRONMENT_THRESHOLDS } = await import('./alarms.config');

    // Filter alarms for current environment
    const enabledAlarms = CLOUDWATCH_ALARMS.filter(alarm =>
      alarm.enabled &&
      (!alarm.environment || alarm.environment.includes(currentEnvironment))
    );

    this.logger.log(`Setting up ${enabledAlarms.length} CloudWatch alarms for ${currentEnvironment} environment`);

    for (const alarmConfig of enabledAlarms) {
      try {
        const alarmParams = { ...alarmConfig };
        delete alarmParams.environment;

        const alarm: PutMetricAlarmCommandInput = {
          ...alarmParams,
          Namespace: this.config.namespace,
        };

        // Adjust thresholds based on environment
        if (ENVIRONMENT_THRESHOLDS[currentEnvironment]) {
          alarm.Threshold = this.adjustThresholdForEnvironment(
            alarm.MetricName,
            alarm.Threshold,
            currentEnvironment,
            ENVIRONMENT_THRESHOLDS,
          );
        }

        await this.cloudWatchClient.send(new PutMetricAlarmCommand(alarm));
        this.logger.log(`Created CloudWatch alarm: ${alarm.AlarmName}`);
      } catch (error) {
        this.logger.error(`Failed to create alarm ${alarmConfig.AlarmName}`, error.stack);
      }
    }
  }

  /**
   * Adjust alarm thresholds based on environment
   */
  private adjustThresholdForEnvironment(
    metricName: string,
    defaultThreshold: number,
    environment: string,
    thresholds: Record<string, Record<string, number>>,
  ): number {
    const envThresholds = thresholds[environment];
    if (!envThresholds) {
      return defaultThreshold;
    }

    // Map metric names to threshold keys
    const thresholdMap = {
      'ApiErrors': 'errorRate',
      'ResponseTime': 'responseTime',
      'MemoryUsage': 'memoryUsage',
    };

    const thresholdKey = thresholdMap[metricName];
    return thresholdKey && envThresholds[thresholdKey]
      ? envThresholds[thresholdKey]
      : defaultThreshold;
  }

  /**
   * Utility function to chunk arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}