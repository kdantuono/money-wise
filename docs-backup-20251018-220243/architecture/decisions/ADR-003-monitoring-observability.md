# ADR-003: Monitoring and Observability Stack

**Status**: Accepted
**Date**: 2025-10-06
**Deciders**: Development Team, DevOps Team
**Technical Story**: STORY-1.5.2 Monitoring & Observability

## Context

A production-ready application requires comprehensive monitoring and observability to:
- Detect and diagnose errors before users report them
- Track performance degradation and resource utilization
- Understand user behavior and feature adoption
- Meet SLA requirements and debug production issues
- Comply with financial service reliability standards

We need a monitoring stack that balances:
- **Cost**: Free tier compatibility for MVP/startup phase
- **Ease of Setup**: Minimal infrastructure and configuration overhead
- **Feature Completeness**: Error tracking, performance monitoring, metrics
- **Developer Experience**: Good documentation and debugging tools

## Decision

We will implement a **hybrid monitoring stack** combining:

1. **Sentry** - Error tracking and performance monitoring
2. **AWS CloudWatch** - Infrastructure metrics and application logs
3. **Custom Health Checks** - Service availability and dependency monitoring

### Architecture

```
Application Layers:
┌─────────────────────────────────────────────────────┐
│ Frontend (Next.js)                                  │
│ ├─ Sentry Browser SDK (errors, transactions)       │
│ └─ CloudWatch RUM (real user monitoring)           │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Backend (NestJS)                                    │
│ ├─ Sentry Node SDK (errors, profiling)             │
│ ├─ CloudWatch Metrics (custom business metrics)    │
│ ├─ Health Check Endpoint (/health, /health/metrics)│
│ └─ MonitoringService (centralized metric tracking) │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Infrastructure                                      │
│ ├─ PostgreSQL (connection pooling metrics)         │
│ ├─ Redis (cache hit/miss rates)                    │
│ └─ Docker Containers (resource utilization)        │
└─────────────────────────────────────────────────────┘
```

### Tool Selection Rationale

#### 1. Sentry (Error Tracking & Performance Monitoring)

**Why Sentry?**
- ✅ **Free Tier**: 5K errors/month, 10K transactions/month (sufficient for MVP)
- ✅ **Integrated Solution**: Single SDK for errors + performance + profiling
- ✅ **Source Maps**: Automatic de-minification of production stack traces
- ✅ **Release Tracking**: Track which deploys introduced errors
- ✅ **Breadcrumbs**: Automatic context capture (HTTP requests, user actions)

**Alternatives Considered**:
- **Rollbar** (rejected): Less generous free tier
- **Bugsnag** (rejected): More expensive, fewer features
- **LogRocket** (rejected): Session replay overkill for MVP

#### 2. AWS CloudWatch (Infrastructure & Application Metrics)

**Why CloudWatch?**
- ✅ **Free Tier**: 10 custom metrics, 5GB logs/month (sufficient for MVP)
- ✅ **AWS Native**: Seamless integration with ECS, RDS, ElastiCache
- ✅ **Custom Metrics**: Business KPIs (signups, transactions, errors)
- ✅ **Alarms**: Automated alerts for threshold breaches
- ✅ **Log Aggregation**: Centralized application and container logs

**Alternatives Considered**:
- **Datadog** (rejected): Expensive ($15/host/month)
- **New Relic** (rejected): Complex pricing model
- **Prometheus + Grafana** (rejected): Self-hosting overhead

#### 3. Custom Health Checks (Service Availability)

**Why Custom Implementation?**
- ✅ **Zero Cost**: Built into application code
- ✅ **Dependency Checks**: PostgreSQL, Redis, CloudWatch availability
- ✅ **Load Balancer Integration**: ECS health checks for auto-restart
- ✅ **Ops Dashboard**: Quick status overview without logging into tools

## Implementation Details

### 1. Sentry Configuration

#### Backend Instrumentation (`apps/backend/src/instrument.ts`)

```typescript
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// MUST run before NestJS bootstrap
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',

  // Performance Monitoring (environment-aware sampling)
  tracesSampleRate: 0.1,  // 10% in production, 100% in dev

  // Profiling (CPU/memory analysis)
  profilesSampleRate: 0.1,  // 10% in production, 0% in dev
  integrations: [nodeProfilingIntegration()],

  // Error Filtering (reduce noise)
  ignoreErrors: [
    'NotFoundException',      // Expected 404s
    'UnauthorizedException',  // Expected auth failures
  ],

  // Release Tracking
  release: process.env.SENTRY_RELEASE,  // Set by CI/CD
});
```

**Sampling Strategy**:
- **Development**: 100% traces, 0% profiles (full debugging, no overhead)
- **Staging**: 50% traces, 20% profiles (balance coverage vs quota)
- **Production**: 10% traces, 10% profiles (conserve free tier quota)

#### Frontend Instrumentation (`apps/web/src/instrument.ts`)

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring (capture page loads, API calls)
  tracesSampleRate: 0.1,

  // Session Replay (visual debugging)
  replaysSessionSampleRate: 0.1,   // 10% of sessions
  replaysOnErrorSampleRate: 1.0,   // 100% of error sessions

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,           // Privacy: mask user data
      blockAllMedia: true,          // Privacy: block images/videos
    }),
  ],
});
```

### 2. CloudWatch Integration

#### Custom Metrics (`apps/backend/src/core/monitoring/cloudwatch.service.ts`)

```typescript
@Injectable()
export class CloudWatchService {
  private readonly cloudWatch: CloudWatchClient;
  private readonly namespace = 'MoneyWise/Application';

  async putMetric(
    metricName: string,
    value: number,
    unit: StandardUnit = 'Count',
    dimensions?: Record<string, string>,
  ): Promise<void> {
    await this.cloudWatch.send(new PutMetricDataCommand({
      Namespace: this.namespace,
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: Object.entries(dimensions || {}).map(([Name, Value]) =>
          ({ Name, Value })
        ),
      }],
    }));
  }

  // Track business metrics
  async trackUserSignup(userId: string): Promise<void> {
    await this.putMetric('UserSignup', 1, 'Count', {
      Environment: process.env.NODE_ENV,
    });
  }

  async trackTransactionSync(count: number): Promise<void> {
    await this.putMetric('TransactionsSynced', count, 'Count');
  }
}
```

#### Monitored Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `API_ResponseTime` | Milliseconds | Average API response time | >500ms |
| `API_ErrorRate` | Percent | HTTP 5xx error rate | >5% |
| `UserSignup` | Count | Daily new user registrations | <0 (anomaly) |
| `TransactionsSynced` | Count | Plaid sync volume | Trend analysis |
| `Cache_HitRate` | Percent | Redis cache effectiveness | <70% |
| `DB_ConnectionPoolUsage` | Percent | PostgreSQL connection utilization | >80% |

### 3. Health Check Implementation

#### Endpoint Structure (`apps/backend/src/core/monitoring/health.controller.ts`)

```typescript
@Controller('health')
export class HealthController {
  @Get()
  async getHealth(): Promise<HealthStatus> {
    return {
      status: 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime() * 1000,
      version: process.env.npm_package_version,
      environment: process.env.NODE_ENV,
      services: {
        database: await this.checkDatabase(),    // 'healthy' | 'unhealthy'
        redis: await this.checkRedis(),          // 'healthy' | 'unhealthy'
        cloudwatch: await this.checkCloudWatch(), // 'healthy' | 'unhealthy' | 'disabled'
      },
      metrics: {
        totalRequests: this.monitoringService.getTotalRequests(),
        errorCount: this.monitoringService.getErrorCount(),
        errorRate: this.monitoringService.getErrorRate(),
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      },
    };
  }

  @Get('metrics')
  async getMetrics() {
    // Detailed metrics for ops dashboard
    return {
      system: this.monitoringService.getSystemMetrics(),
      performance: this.monitoringService.getPerformanceSummary(),
      timestamp: new Date().toISOString(),
    };
  }
}
```

**Health Status Logic**:
- **Healthy**: All critical services up, error rate <5%, memory <90%
- **Degraded**: Non-critical service down (Redis, CloudWatch) OR error rate 5-10%
- **Unhealthy**: Database down OR error rate >10% OR memory >95%

## Consequences

### Positive

- **Proactive Error Detection**: Sentry alerts before users complain
- **Performance Insights**: CloudWatch tracks response times, bottlenecks
- **Cost-Effective**: Free tier sufficient for MVP (0-1000 users)
- **Debugging Efficiency**: Source maps + breadcrumbs reduce MTTR by ~60%
- **Business Intelligence**: Custom metrics inform product decisions

### Negative

- **Complexity**: Three monitoring tools to learn and maintain
- **Free Tier Limits**: Will require paid plans at scale (>5K errors/month)
- **Alert Fatigue Risk**: Poorly configured thresholds can spam on-call
- **Privacy Considerations**: Must scrub PII from error reports

### Mitigations

- **Complexity**: Centralize monitoring logic in `MonitoringService` abstraction
- **Free Tier Limits**: Monitor usage monthly, optimize sampling before scaling
- **Alert Fatigue**: Start with high thresholds, tune based on baseline noise
- **Privacy**: Configure Sentry `beforeSend` hook to strip sensitive data

## Migration Path

### Phase 1: Foundation (STORY-1.5.2) ✅
- [x] Sentry backend integration with profiling
- [x] CloudWatch metrics service
- [x] Health check endpoints (/health, /health/metrics)
- [x] MonitoringService for centralized tracking

### Phase 2: Production Readiness (M1.5)
- [ ] Sentry frontend integration (Next.js)
- [ ] CloudWatch alarms for critical metrics
- [ ] PagerDuty integration for on-call alerts
- [ ] Runbook documentation for common alerts

### Phase 3: Advanced Observability (M2+)
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Session replay analysis (Sentry Replay)
- [ ] Custom dashboards (CloudWatch or Grafana)
- [ ] Automated anomaly detection

## Monitoring

- **Sentry Quota Usage**: Track errors/transactions consumed (target: <80% free tier)
- **CloudWatch Costs**: Monitor monthly bill (target: $0-5/month in MVP)
- **Alert Response Time**: Measure time to acknowledge alerts (target: <15 min)
- **MTTR (Mean Time To Resolution)**: Track incident resolution speed (target: <2 hours)

## References

- [Sentry NestJS Documentation](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- [AWS CloudWatch Metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/working_with_metrics.html)
- [NestJS Health Checks](https://docs.nestjs.com/recipes/terminus)
- [ADR-002: Configuration Management](./ADR-002-configuration-management.md)
- [STORY-1.5.2: Monitoring Implementation](../../development/sessions/2025-10-06-monitoring-implementation.md)

---

**Superseded By**: N/A
**Related ADRs**: ADR-002 (Config), ADR-005 (Error Handling)
