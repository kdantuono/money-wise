# CloudWatch Monitoring Setup for MoneyWise

## Overview

This document provides comprehensive instructions for setting up AWS CloudWatch monitoring for the MoneyWise backend application. The monitoring system includes metrics collection, log aggregation, and automated alerting for production environments.

## Features

### Metrics Collected

- **API Performance**
  - Request count and response times
  - Error rates by endpoint
  - Success/failure ratios
  - User-specific metrics

- **System Resources**
  - Memory usage (heap and total)
  - CPU utilization
  - Process uptime
  - Container metrics

- **Database Performance**
  - Query execution times
  - Database connection counts
  - Slow query detection
  - Query success/failure rates

- **Business Metrics**
  - Active user counts
  - Transaction volumes and values
  - Feature usage analytics
  - Error tracking by user journey

### Alarms Configured

- High error rate detection (>5% in production)
- Slow response time alerts (>2 seconds average)
- Memory usage warnings (>80%)
- Database performance degradation
- Service availability monitoring

## Prerequisites

### AWS Account Setup

1. **AWS Account with CloudWatch Access**
   ```bash
   # Verify AWS CLI is configured
   aws sts get-caller-identity
   ```

2. **IAM User with Required Permissions**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "cloudwatch:PutMetricData",
           "cloudwatch:PutMetricAlarm",
           "cloudwatch:DeleteAlarms",
           "cloudwatch:DescribeAlarms",
           "logs:CreateLogGroup",
           "logs:CreateLogStream",
           "logs:PutLogEvents",
           "logs:DescribeLogGroups",
           "logs:DescribeLogStreams"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

### Environment Configuration

1. **Environment Variables**
   ```bash
   # Add to .env file
   CLOUDWATCH_ENABLED=true
   CLOUDWATCH_NAMESPACE=MoneyWise/Backend
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   ```

2. **Production Environment Variables**
   ```bash
   # Production-specific settings
   NODE_ENV=production
   CLOUDWATCH_ENABLED=true
   CLOUDWATCH_NAMESPACE=MoneyWise/Production
   ```

## Installation and Configuration

### 1. Backend Integration

The CloudWatch integration is automatically enabled when the environment variables are configured. The monitoring service initializes during application startup.

```typescript
// Service is automatically injected
constructor(
  private readonly monitoringService: MonitoringService,
  private readonly cloudWatchService: CloudWatchService,
) {}

// Track API requests automatically via interceptor
// Or manually track business metrics
await this.monitoringService.trackBusinessMetrics(
  activeUsers,
  transactionCount,
  totalValue
);
```

### 2. Automatic API Monitoring

Add the monitoring interceptor to automatically track all API requests:

```typescript
// In your main.ts or app.module.ts
app.useGlobalInterceptors(new MonitoringInterceptor(monitoringService));
```

### 3. Manual Metric Tracking

```typescript
// Track custom business events
await cloudWatchService.putMetric(
  'UserSignup',
  1,
  StandardUnit.Count,
  { Source: 'web', Plan: 'premium' }
);

// Track performance metrics
await cloudWatchService.logApiMetrics(
  '/api/transactions',
  'POST',
  201,
  150,
  userId
);
```

## Development Setup

### Local Testing with Docker

1. **Start Monitoring Stack**
   ```bash
   # Start with monitoring profile
   docker compose -f docker-compose.dev.yml -f docker-compose.monitoring.yml up -d --profile monitoring
   ```

2. **Access Monitoring Tools**
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001 (admin/admin)
   - Application Health: http://localhost:3001/health

### Environment-Specific Configuration

```bash
# Development (local testing)
CLOUDWATCH_ENABLED=false  # Use Prometheus/Grafana locally

# Staging
CLOUDWATCH_ENABLED=true
CLOUDWATCH_NAMESPACE=MoneyWise/Staging

# Production
CLOUDWATCH_ENABLED=true
CLOUDWATCH_NAMESPACE=MoneyWise/Production
```

## Production Deployment

### 1. AWS Infrastructure Setup

#### CloudWatch Log Groups
```bash
# Create log groups (or they'll be created automatically)
aws logs create-log-group --log-group-name /aws/moneywise/production
aws logs create-log-group --log-group-name /aws/moneywise/docker
```

#### SNS Topic for Alerts
```bash
# Create SNS topic for critical alerts
aws sns create-topic --name moneywise-critical-alerts

# Subscribe email endpoint
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:moneywise-critical-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

### 2. Container Deployment

#### ECS Task Definition
```json
{
  "family": "moneywise-backend",
  "taskRoleArn": "arn:aws:iam::123456789012:role/MoneyWiseTaskRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "moneywise/backend:latest",
      "environment": [
        {
          "name": "CLOUDWATCH_ENABLED",
          "value": "true"
        },
        {
          "name": "AWS_REGION",
          "value": "us-east-1"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/aws/moneywise/production",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "backend"
        }
      }
    }
  ]
}
```

#### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: moneywise-backend
spec:
  template:
    spec:
      serviceAccountName: moneywise-cloudwatch
      containers:
      - name: backend
        image: moneywise/backend:latest
        env:
        - name: CLOUDWATCH_ENABLED
          value: "true"
        - name: AWS_REGION
          value: us-east-1
```

### 3. Production Alarms

Alarms are automatically created based on environment. For production:

- **Critical Alarms** (immediate notification)
  - High error rate (>5%)
  - Service unavailable
  - High authentication failures

- **Warning Alarms** (business hours notification)
  - High response time (>2s)
  - High memory usage (>80%)
  - Slow database queries (>1s)

- **Info Alarms** (daily digest)
  - High request volume
  - Low active users

## Monitoring Dashboard

### CloudWatch Dashboard

Access your metrics in the AWS CloudWatch console:

1. Navigate to CloudWatch → Dashboards
2. Create custom dashboard with widgets for:
   - API request rates and errors
   - Response time percentiles
   - System resource utilization
   - Business metrics trends

### Grafana Dashboard (Development)

For local development, Grafana provides visualization:

1. Import MoneyWise dashboard template
2. Configure Prometheus data source
3. View real-time metrics and alerts

## Troubleshooting

### Common Issues

#### CloudWatch Not Receiving Metrics

1. **Check AWS Credentials**
   ```bash
   # Verify credentials work
   aws cloudwatch list-metrics --namespace MoneyWise/Backend
   ```

2. **Check IAM Permissions**
   ```bash
   # Test metric publishing
   aws cloudwatch put-metric-data \
     --namespace MoneyWise/Test \
     --metric-data MetricName=Test,Value=1
   ```

3. **Check Application Logs**
   ```bash
   # Look for CloudWatch errors in logs
   docker logs backend-container | grep -i cloudwatch
   ```

#### High CloudWatch Costs

1. **Optimize Metric Frequency**
   - Use 30-second intervals for critical metrics
   - Use 5-minute intervals for non-critical metrics
   - Aggregate metrics before sending

2. **Review Alarm Configuration**
   - Disable unnecessary alarms in development
   - Use composite alarms for complex conditions

#### Missing Business Metrics

1. **Verify Metric Tracking**
   ```typescript
   // Add debug logging
   this.logger.debug('Sending business metrics', { activeUsers, transactions });
   await this.cloudWatchService.logBusinessMetrics(metrics);
   ```

2. **Check Metric Dimensions**
   - Ensure dimensions don't create too many unique metric combinations
   - Limit dimension cardinality

## Cost Optimization

### Metrics Strategy

- **High-frequency metrics** (30s): Error rates, response times
- **Medium-frequency metrics** (5m): System resources, business KPIs
- **Low-frequency metrics** (15m): Long-term trends, usage analytics

### Log Retention

```bash
# Set log retention period (e.g., 30 days)
aws logs put-retention-policy \
  --log-group-name /aws/moneywise/production \
  --retention-in-days 30
```

### Alarm Optimization

- Use composite alarms to reduce costs
- Set appropriate evaluation periods
- Use treat missing data policies effectively

## Security Considerations

### IAM Best Practices

1. **Least Privilege Access**
   - Grant only necessary CloudWatch permissions
   - Use IAM roles instead of access keys when possible

2. **Credential Management**
   ```bash
   # Use AWS Secrets Manager or Parameter Store
   aws ssm put-parameter \
     --name /moneywise/cloudwatch/access-key \
     --value "your-access-key" \
     --type SecureString
   ```

3. **VPC Endpoints**
   - Use VPC endpoints for CloudWatch API calls
   - Reduce data transfer costs and improve security

## Maintenance

### Regular Tasks

1. **Monthly Cost Review**
   - Review CloudWatch billing
   - Optimize metric collection frequency
   - Clean up unused alarms

2. **Quarterly Alarm Review**
   - Verify alarm thresholds are appropriate
   - Update notification channels
   - Test alarm functionality

3. **Annual Architecture Review**
   - Evaluate new CloudWatch features
   - Consider cost optimization opportunities
   - Update monitoring strategy

## Support and Resources

### Documentation Links

- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [CloudWatch Metrics API Reference](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/)
- [CloudWatch Logs Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/)

### MoneyWise Monitoring Team

- **Primary Contact**: DevOps Team
- **Escalation**: Platform Team
- **On-call Rotation**: See internal documentation

---

*Last Updated: 2025-09-28*
*Version: 1.0.0*