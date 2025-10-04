import {
  PutMetricAlarmCommandInput,
  ComparisonOperator,
  Statistic,
} from '@aws-sdk/client-cloudwatch';

export interface AlarmConfig extends Omit<PutMetricAlarmCommandInput, 'Namespace'> {
  enabled: boolean;
  environment?: string[];
}

/**
 * CloudWatch Alarms Configuration for MoneyWise Backend
 *
 * These alarms monitor critical metrics and alert on production issues
 */
export const CLOUDWATCH_ALARMS: AlarmConfig[] = [
  // API Performance Alarms
  {
    enabled: true,
    environment: ['production', 'staging'],
    AlarmName: 'MoneyWise-HighErrorRate',
    AlarmDescription: 'Alert when API error rate exceeds 5% over 5 minutes',
    ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
    EvaluationPeriods: 2,
    MetricName: 'ApiErrors',
    Period: 300, // 5 minutes
    Statistic: Statistic.Sum,
    Threshold: 10, // 10 errors in 5 minutes
    TreatMissingData: 'notBreaching',
    AlarmActions: [
      // SNS topic ARN would be configured here
      // 'arn:aws:sns:us-east-1:123456789012:moneywise-alerts'
    ],
    OKActions: [
      // SNS topic ARN for recovery notifications
    ],
  },
  {
    enabled: true,
    environment: ['production'],
    AlarmName: 'MoneyWise-HighResponseTime',
    AlarmDescription: 'Alert when average API response time exceeds 2 seconds',
    ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
    EvaluationPeriods: 3,
    MetricName: 'ResponseTime',
    Period: 300,
    Statistic: Statistic.Average,
    Threshold: 2000, // 2 seconds
    TreatMissingData: 'notBreaching',
  },
  {
    enabled: true,
    environment: ['production'],
    AlarmName: 'MoneyWise-HighRequestVolume',
    AlarmDescription: 'Alert when request volume exceeds normal capacity',
    ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
    EvaluationPeriods: 2,
    MetricName: 'ApiRequests',
    Period: 300,
    Statistic: Statistic.Sum,
    Threshold: 1000, // 1000 requests per 5 minutes
    TreatMissingData: 'notBreaching',
  },

  // System Resource Alarms
  {
    enabled: true,
    environment: ['production', 'staging'],
    AlarmName: 'MoneyWise-HighMemoryUsage',
    AlarmDescription: 'Alert when memory usage exceeds 80%',
    ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
    EvaluationPeriods: 3,
    MetricName: 'MemoryUsage',
    Period: 300,
    Statistic: Statistic.Average,
    Threshold: 80, // 80%
    TreatMissingData: 'notBreaching',
  },
  {
    enabled: true,
    environment: ['production'],
    AlarmName: 'MoneyWise-HighHeapUsage',
    AlarmDescription: 'Alert when heap usage exceeds 512MB',
    ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
    EvaluationPeriods: 2,
    MetricName: 'HeapUsed',
    Period: 300,
    Statistic: Statistic.Average,
    Threshold: 512, // 512MB
    TreatMissingData: 'notBreaching',
  },

  // Database Performance Alarms
  {
    enabled: true,
    environment: ['production'],
    AlarmName: 'MoneyWise-SlowDatabaseQueries',
    AlarmDescription: 'Alert when database query time exceeds 1 second',
    ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
    EvaluationPeriods: 2,
    MetricName: 'DatabaseQueryDuration',
    Period: 300,
    Statistic: Statistic.Average,
    Threshold: 1000, // 1 second
    TreatMissingData: 'notBreaching',
  },

  // Business Logic Alarms
  {
    enabled: true,
    environment: ['production'],
    AlarmName: 'MoneyWise-LowActiveUsers',
    AlarmDescription: 'Alert when active user count drops significantly',
    ComparisonOperator: ComparisonOperator.LessThanThreshold,
    EvaluationPeriods: 3,
    MetricName: 'ActiveUsers',
    Period: 900, // 15 minutes
    Statistic: Statistic.Average,
    Threshold: 10, // Less than 10 active users
    TreatMissingData: 'breaching',
  },
  {
    enabled: true,
    environment: ['production'],
    AlarmName: 'MoneyWise-TransactionFailures',
    AlarmDescription: 'Alert when transaction processing fails',
    ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
    EvaluationPeriods: 2,
    MetricName: 'TransactionErrors',
    Period: 300,
    Statistic: Statistic.Sum,
    Threshold: 5, // More than 5 transaction errors
    TreatMissingData: 'notBreaching',
  },

  // Security Alarms
  {
    enabled: true,
    environment: ['production', 'staging'],
    AlarmName: 'MoneyWise-HighAuthFailures',
    AlarmDescription: 'Alert on potential security threats - high authentication failures',
    ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
    EvaluationPeriods: 1,
    MetricName: 'AuthenticationFailures',
    Period: 300,
    Statistic: Statistic.Sum,
    Threshold: 20, // More than 20 failed auth attempts
    TreatMissingData: 'notBreaching',
  },

  // Availability Alarms
  {
    enabled: true,
    environment: ['production'],
    AlarmName: 'MoneyWise-ServiceUnavailable',
    AlarmDescription: 'Alert when service becomes unavailable',
    ComparisonOperator: ComparisonOperator.LessThanThreshold,
    EvaluationPeriods: 1,
    MetricName: 'HealthCheckSuccess',
    Period: 60, // 1 minute
    Statistic: Statistic.Sum,
    Threshold: 1, // No successful health checks
    TreatMissingData: 'breaching',
  },
];

/**
 * Environment-specific thresholds
 */
export const ENVIRONMENT_THRESHOLDS = {
  development: {
    errorRate: 20, // 20% error rate tolerance in dev
    responseTime: 5000, // 5 second response time tolerance
    memoryUsage: 90, // 90% memory usage tolerance
  },
  staging: {
    errorRate: 10, // 10% error rate tolerance in staging
    responseTime: 3000, // 3 second response time tolerance
    memoryUsage: 85, // 85% memory usage tolerance
  },
  production: {
    errorRate: 5, // 5% error rate tolerance in production
    responseTime: 2000, // 2 second response time tolerance
    memoryUsage: 80, // 80% memory usage tolerance
  },
};

/**
 * Alarm notification configuration
 */
export const ALARM_NOTIFICATIONS = {
  // Critical alarms - immediate notification
  critical: [
    'MoneyWise-HighErrorRate',
    'MoneyWise-ServiceUnavailable',
    'MoneyWise-HighAuthFailures',
  ],

  // Warning alarms - notification during business hours
  warning: [
    'MoneyWise-HighResponseTime',
    'MoneyWise-HighMemoryUsage',
    'MoneyWise-SlowDatabaseQueries',
  ],

  // Info alarms - daily digest
  info: [
    'MoneyWise-HighRequestVolume',
    'MoneyWise-LowActiveUsers',
  ],
};