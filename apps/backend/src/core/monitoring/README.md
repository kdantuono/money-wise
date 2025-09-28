# MoneyWise Backend Monitoring Module

## Overview

The monitoring module provides comprehensive observability for the MoneyWise backend application, including metrics collection, logging, health checks, and AWS CloudWatch integration.

## Features

### 🔍 Metrics Collection
- **API Performance**: Request counts, response times, error rates
- **System Resources**: Memory usage, CPU utilization, uptime
- **Database Performance**: Query execution times, connection health
- **Business Metrics**: User activity, transaction volumes, feature usage

### 📊 CloudWatch Integration
- Automatic metric publishing to AWS CloudWatch
- Structured logging to CloudWatch Logs
- Production-grade alarms and notifications
- Environment-specific configurations

### 🏥 Health Monitoring
- RESTful health check endpoints
- Service dependency verification
- Performance metrics API
- Real-time status reporting

## Quick Start

### 1. Enable Monitoring

```typescript
// In your app.module.ts
import { MonitoringModule } from './core/monitoring/monitoring.module';

@Module({
  imports: [
    MonitoringModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 2. Environment Configuration

```bash
# .env file
CLOUDWATCH_ENABLED=true
CLOUDWATCH_NAMESPACE=MoneyWise/Backend
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 3. Add API Monitoring

```typescript
// Global interceptor for automatic API tracking
app.useGlobalInterceptors(
  new MonitoringInterceptor(app.get(MonitoringService))
);
```

## Usage Examples

### Manual Metric Tracking

```typescript
import { MonitoringService, CloudWatchService } from './core/monitoring';

@Injectable()
export class TransactionService {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly cloudWatchService: CloudWatchService,
  ) {}

  async createTransaction(data: CreateTransactionDto) {
    const startTime = Date.now();

    try {
      const transaction = await this.repository.save(data);

      // Track successful transaction
      await this.cloudWatchService.putMetric(
        'TransactionCreated',
        1,
        StandardUnit.Count,
        { Category: data.category, Amount: data.amount.toString() }
      );

      return transaction;
    } catch (error) {
      // Track transaction failure
      await this.cloudWatchService.putMetric(
        'TransactionError',
        1,
        StandardUnit.Count,
        { ErrorType: error.constructor.name }
      );

      throw error;
    } finally {
      // Track operation duration
      const duration = Date.now() - startTime;
      this.monitoringService.logPerformanceMetric('createTransaction', duration);
    }
  }
}
```

### Business Metrics Tracking

```typescript
@Cron('0 */5 * * * *') // Every 5 minutes
async trackBusinessMetrics() {
  const activeUsers = await this.userService.getActiveUserCount();
  const transactionCount = await this.transactionService.getRecentCount();
  const totalValue = await this.transactionService.getTotalValue();

  await this.monitoringService.trackBusinessMetrics(
    activeUsers,
    transactionCount,
    totalValue
  );
}
```

### Database Query Monitoring

```typescript
@Injectable()
export class UserRepository {
  constructor(private readonly monitoringService: MonitoringService) {}

  async findByEmail(email: string) {
    const startTime = Date.now();

    try {
      const user = await this.repository.findOne({ where: { email } });
      return user;
    } finally {
      const duration = Date.now() - startTime;
      this.monitoringService.logDatabaseQuery('findByEmail', duration);
    }
  }
}
```

## API Endpoints

### Health Check

```http
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2025-09-28T10:30:00.000Z",
  "uptime": 86400000,
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "cloudwatch": "healthy"
  },
  "metrics": {
    "totalRequests": 15420,
    "errorCount": 23,
    "errorRate": 0.15,
    "memoryUsage": 67.3
  }
}
```

### Detailed Metrics

```http
GET /health/metrics

Response:
{
  "system": {
    "timestamp": "2025-09-28T10:30:00.000Z",
    "uptime": 86400000,
    "memory": {
      "used": 134217728,
      "total": 268435456,
      "usage": 50.0
    },
    "cpu": {
      "usage": 15.2
    },
    "requests": {
      "total": 15420,
      "errors": 23,
      "successRate": 99.85
    }
  },
  "performance": {
    "totalRequests": 15420,
    "errorCount": 23,
    "errorRate": 0.15,
    "uptime": 86400000,
    "memoryUsage": 67.3
  }
}
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CLOUDWATCH_ENABLED` | Enable CloudWatch integration | `false` | No |
| `CLOUDWATCH_NAMESPACE` | CloudWatch namespace | `MoneyWise/Backend` | No |
| `AWS_REGION` | AWS region | `us-east-1` | Yes* |
| `AWS_ACCESS_KEY_ID` | AWS access key | - | Yes* |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - | Yes* |
| `METRICS_ENABLED` | Enable metrics collection | `true` | No |
| `METRICS_FLUSH_INTERVAL` | Metrics flush interval (ms) | `30000` | No |
| `HEALTH_CHECK_ENABLED` | Enable health endpoints | `true` | No |

*Required when CloudWatch is enabled

### Alarm Configuration

Alarms are automatically configured based on environment:

```typescript
// alarms.config.ts
export const CLOUDWATCH_ALARMS: AlarmConfig[] = [
  {
    enabled: true,
    environment: ['production'],
    AlarmName: 'MoneyWise-HighErrorRate',
    MetricName: 'ApiErrors',
    Threshold: 10, // 10 errors in 5 minutes
    ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
  },
  // ... more alarms
];
```

## Development Setup

### Local Development

```bash
# Start with basic infrastructure
docker compose -f docker-compose.dev.yml up -d

# Add monitoring stack for local testing
docker compose -f docker-compose.dev.yml -f docker-compose.monitoring.yml up -d --profile monitoring

# Access monitoring tools
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
```

### Testing CloudWatch Integration

```bash
# Set environment variables
export CLOUDWATCH_ENABLED=true
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret

# Start the application
npm run dev

# Generate test metrics
curl http://localhost:3001/health
curl http://localhost:3001/health/metrics
```

## Architecture

### Service Structure

```
monitoring/
├── monitoring.service.ts      # Core monitoring logic
├── cloudwatch.service.ts      # AWS CloudWatch integration
├── monitoring.interceptor.ts  # Automatic API tracking
├── health.controller.ts       # Health check endpoints
├── alarms.config.ts          # CloudWatch alarm definitions
└── monitoring.module.ts       # Module configuration
```

### Data Flow

1. **API Requests** → MonitoringInterceptor → Metrics Buffer
2. **Business Events** → MonitoringService → CloudWatch
3. **System Metrics** → Periodic Collection → CloudWatch
4. **Health Checks** → Real-time Status → HTTP Endpoints

### Metrics Aggregation

- **Real-time**: Critical metrics sent immediately
- **Buffered**: Non-critical metrics batched every 30 seconds
- **Periodic**: System metrics collected every 5 minutes

## Best Practices

### 1. Metric Naming

```typescript
// ✅ Good: Descriptive and consistent
'UserSignup', 'TransactionCreated', 'DatabaseQueryDuration'

// ❌ Bad: Generic and unclear
'Event', 'Action', 'Time'
```

### 2. Dimension Usage

```typescript
// ✅ Good: Meaningful dimensions with controlled cardinality
{
  Endpoint: '/api/transactions',
  Method: 'POST',
  StatusCode: '201'
}

// ❌ Bad: High cardinality dimensions
{
  UserId: '12345',  // Too many unique values
  Timestamp: '2025-09-28T10:30:00Z'  // Infinite cardinality
}
```

### 3. Error Handling

```typescript
// Always wrap CloudWatch calls in try-catch
try {
  await this.cloudWatchService.putMetric('MyMetric', value);
} catch (error) {
  // Log but don't fail the operation
  this.logger.error('Failed to send metric', error);
}
```

### 4. Cost Optimization

- Use appropriate metric frequencies
- Aggregate before sending to reduce costs
- Set log retention policies
- Monitor CloudWatch billing

## Troubleshooting

### Common Issues

#### CloudWatch Metrics Not Appearing

1. **Check AWS Credentials**
   ```bash
   aws sts get-caller-identity
   ```

2. **Verify IAM Permissions**
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "cloudwatch:PutMetricData",
       "logs:CreateLogStream",
       "logs:PutLogEvents"
     ],
     "Resource": "*"
   }
   ```

3. **Check Application Logs**
   ```bash
   # Look for CloudWatch errors
   docker logs backend-container | grep -i cloudwatch
   ```

#### High Memory Usage

1. **Check Metrics Buffer Size**
2. **Verify Flush Interval Configuration**
3. **Monitor for Memory Leaks in Metric Collection**

#### Missing Health Check Data

1. **Verify Health Check Endpoints are Accessible**
2. **Check Service Dependencies (Database, Redis)**
3. **Review Health Check Configuration**

### Debugging Commands

```bash
# Check CloudWatch metrics
aws cloudwatch list-metrics --namespace MoneyWise/Backend

# View recent log events
aws logs filter-log-events \
  --log-group-name /aws/moneywise/backend \
  --start-time $(date -d '1 hour ago' +%s)000

# Test metric publishing
aws cloudwatch put-metric-data \
  --namespace MoneyWise/Test \
  --metric-data MetricName=Test,Value=1
```

## Performance Considerations

### Metric Collection Overhead

- **Async Operations**: All CloudWatch calls are non-blocking
- **Buffering**: Metrics are batched to reduce API calls
- **Error Isolation**: CloudWatch failures don't affect application logic

### Resource Usage

- **Memory**: ~5-10MB additional for metric buffering
- **CPU**: <1% overhead for metric collection
- **Network**: Optimized batch uploads to CloudWatch

## Contributing

### Adding New Metrics

1. Define metric in appropriate service
2. Add to alarm configuration if needed
3. Update documentation
4. Test in development environment

### Modifying Alarms

1. Update `alarms.config.ts`
2. Test threshold values in staging
3. Consider environment-specific settings
4. Document changes in cloudwatch-setup.md

---

For detailed setup instructions, see [CloudWatch Setup Guide](../../../docs/monitoring/cloudwatch-setup.md).