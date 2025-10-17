# Performance Monitoring - MoneyWise

**Date**: 2025-10-05
**Status**: ✅ Implemented
**Purpose**: Comprehensive performance tracking and monitoring for production systems

---

## 📋 Executive Summary

| Component | Purpose | Status |
|-----------|---------|--------|
| **PerformanceInterceptor** | Auto-track HTTP request performance | ✅ Complete |
| **MetricsService** | Business & system metrics collection | ✅ Complete |
| **Sentry Integration** | Performance visualization & alerting | ✅ Complete |
| **Slow Request Detection** | Auto-detect requests >1000ms | ✅ Complete |
| **System Metrics** | Memory, CPU, uptime tracking | ✅ Complete |

---

## 🎯 Monitoring Philosophy

### What We Track

1. **HTTP Performance**
   - Request duration (all requests)
   - Status codes (200, 400, 500, etc.)
   - Slow requests (>1000ms automatically flagged)
   - Error rates by endpoint

2. **System Health**
   - Memory usage (heap, RSS)
   - CPU usage (user, system)
   - Process uptime
   - Connection pool stats (database, Redis)

3. **Business Metrics**
   - User registrations
   - Transactions processed
   - API usage by endpoint
   - Custom application events

---

## 🏗️ Architecture

### PerformanceInterceptor

**Location**: `apps/backend/src/core/monitoring/performance.interceptor.ts`

**Functionality**:
- Automatically applied to ALL HTTP requests (global interceptor)
- Measures request duration from start to finish
- Logs performance metrics via LoggerService
- Sends metrics to Sentry for visualization
- Detects and flags slow requests (>1000ms)

**What Gets Tracked**:
```typescript
{
  method: 'GET',
  url: '/api/users/123',
  statusCode: 200,
  duration: 45, // milliseconds
  userId: '123', // if authenticated
  ip: '192.168.1.1'
}
```

**Automatic Sentry Transaction**:
```typescript
// Each HTTP request creates a Sentry transaction
Sentry.startSpan({
  op: 'http.server',
  name: 'GET /api/users/123',
  attributes: {
    'http.method': 'GET',
    'http.url': '/api/users/123',
    'http.user_id': '123',
  }
});
```

### MetricsService

**Location**: `apps/backend/src/core/monitoring/metrics.service.ts`

**Methods**:

#### `incrementCounter(name, tags?, value?)`
Count events (e.g., user registrations, errors)

```typescript
this.metrics.incrementCounter('users.created', { plan: 'premium' });
this.metrics.incrementCounter('api.errors', { endpoint: '/users', status: '500' });
```

#### `recordDistribution(name, value, tags?, unit?)`
Record varying values (e.g., file sizes, queue lengths)

```typescript
this.metrics.recordDistribution('upload.size', fileSizeBytes, { type: 'image' }, 'byte');
this.metrics.recordDistribution('queue.length', queueSize, { queue: 'email' });
```

#### `setGauge(name, value, tags?)`
Set current value (e.g., active connections, memory usage)

```typescript
this.metrics.setGauge('database.connections.active', activeCount);
this.metrics.setGauge('cache.hit_rate', hitRate, { cache: 'redis' });
```

#### `recordTiming(name, durationMs, tags?)`
Convenience method for duration tracking

```typescript
const start = Date.now();
await operation();
this.metrics.recordTiming('operation.duration', Date.now() - start, { op: 'processPayment' });
```

#### `trackBusinessMetric(event, tags?)`
Track business-specific events

```typescript
this.metrics.trackBusinessMetric('user.registration', { plan: 'premium', source: 'google' });
this.metrics.trackBusinessMetric('payment.completed', { amount: 99.99, currency: 'USD' });
```

#### `trackSystemMetrics()`
Collect current system resource usage

```typescript
// Collects: memory (heap, RSS), CPU (user, system), uptime
this.metrics.trackSystemMetrics();
```

#### `startPeriodicCollection(intervalMs?)`
Start automatic system metrics collection

```typescript
// Called in app bootstrap to collect system metrics every minute
this.metrics.startPeriodicCollection(60000); // 60 seconds
```

---

## 📊 Usage Patterns

### Controller Performance Tracking

**Automatic** - No code needed! Performance interceptor handles this globally.

```typescript
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string) {
    // Performance automatically tracked:
    // - Request start time
    // - Response time
    // - Status code
    // - Slow request detection
    return this.usersService.findOne(id);
  }
}
```

### Service-Level Metrics

```typescript
@Injectable()
export class PaymentService {
  constructor(
    private readonly metrics: MetricsService,
    private readonly logger: LoggerService,
  ) {
    this.logger = logger.child('PaymentService');
  }

  async processPayment(userId: string, amount: number): Promise<Payment> {
    const start = Date.now();

    try {
      const payment = await this.paymentGateway.charge(amount);

      // Track successful payment
      this.metrics.trackBusinessMetric('payment.completed', {
        amount: amount.toString(),
        currency: 'USD',
      });

      // Track payment processing time
      this.metrics.recordTiming('payment.processing_time', Date.now() - start, {
        gateway: 'stripe',
      });

      return payment;
    } catch (error) {
      // Track payment failure
      this.metrics.incrementCounter('payment.failed', {
        error: error.message,
      });

      throw error;
    }
  }
}
```

### Database Query Performance

```typescript
@Injectable()
export class UsersRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
  ) {
    this.logger = logger.child('UsersRepository');
  }

  async findWithTransactions(userId: string): Promise<User> {
    const start = Date.now();

    const user = await this.dataSource
      .getRepository(User)
      .findOne({
        where: { id: userId },
        relations: ['accounts', 'accounts.transactions'],
      });

    const duration = Date.now() - start;

    // Log query performance
    this.logger.query('User.findWithTransactions', duration, {
      userId,
      relationCount: user?.accounts.length || 0,
    });

    return user;
  }
}
```

### Background Job Monitoring

```typescript
@Injectable()
export class EmailProcessor {
  constructor(private readonly metrics: MetricsService) {}

  async processEmailQueue(): Promise<void> {
    const queueSize = await this.getQueueSize();

    // Track queue size
    this.metrics.setGauge('email.queue.size', queueSize);

    const start = Date.now();
    const processed = await this.processEmails();

    // Track processing time
    this.metrics.recordTiming('email.processing_time', Date.now() - start);

    // Track emails processed
    this.metrics.incrementCounter('email.processed', {}, processed);
  }
}
```

---

## 🎛️ Configuration

### Environment Variables

Performance monitoring uses existing configuration:

```bash
# Enable/disable metrics collection (default: true)
METRICS_ENABLED=true

# Sentry configuration (for performance visualization)
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of requests in production
```

### Sampling Rates

| Environment | Traces Sampled | Rationale |
|-------------|---------------|-----------|
| **Production** | 10% | Conserve Sentry quota, reduce overhead |
| **Staging** | 50% | Balance coverage vs cost |
| **Development** | 100% | Full visibility for debugging |

---

## 📈 Metrics Collected

### HTTP Metrics (Automatic)

| Metric | Type | Tags | Description |
|--------|------|------|-------------|
| `http.request.duration` | Distribution | method, status_code, route | Request duration in ms |
| `http.request.slow` | Counter | method, route | Requests >1000ms |
| `http.request.error` | Counter | method, status_code, route | Failed requests |

### System Metrics (Periodic)

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `system.memory.heap_used` | Gauge | megabytes | Heap memory usage |
| `system.memory.heap_total` | Gauge | megabytes | Total heap allocated |
| `system.memory.rss` | Gauge | megabytes | Resident set size |
| `system.cpu.user` | Gauge | microseconds | User CPU time |
| `system.cpu.system` | Gauge | microseconds | System CPU time |
| `system.uptime` | Gauge | seconds | Process uptime |

### Business Metrics (Custom)

| Metric | Type | Tags | Description |
|--------|------|------|-------------|
| `business.user.registration` | Counter | plan, source | New user registrations |
| `business.payment.completed` | Counter | amount, currency | Successful payments |
| `business.payment.failed` | Counter | error | Failed payments |

---

## 🚨 Alerting (Sentry)

### Automatic Alerts

1. **Slow Requests** (>1000ms)
   - Logged as WARNING
   - Tracked in Sentry breadcrumbs
   - Visible in Sentry Performance dashboard

2. **Error Spike Detection**
   - Sentry automatically detects error rate increases
   - Configurable thresholds (see TASK-1.5.2.7)

3. **Performance Degradation**
   - Sentry tracks p50, p75, p95, p99 latencies
   - Alerts when percentiles exceed thresholds

### Custom Alerts (Future - TASK-1.5.2.7)

**Status**: 🟡 **To Be Configured**

- Memory usage >80%
- CPU usage >90%
- Request rate >10,000/min
- Error rate >5%

---

## 📊 Performance Dashboards

### Sentry Performance Dashboard

**Access**: https://sentry.io/organizations/{org}/performance/

**Views**:
1. **Overview**
   - p50, p75, p95 latencies by endpoint
   - Request throughput
   - Error rates

2. **Transactions**
   - Detailed view per HTTP endpoint
   - Slowest transactions
   - Most frequent transactions

3. **Metrics**
   - Custom metrics visualization
   - Business metrics trends
   - System resource usage

### Custom Dashboard (Future - TASK-1.5.2.8)

**Status**: 🟡 **To Be Created**

Planned features:
- Real-time request rate
- Active users
- Database connection pool
- Cache hit rates
- Business KPIs

---

## 🔧 Troubleshooting

### Slow Request Investigation

**Symptom**: Request >1000ms warning in logs

**Investigation Steps**:
1. Check Sentry Performance → Find slow transaction
2. Review spans to identify bottleneck (database, external API, etc.)
3. Check database query logs for slow queries
4. Review cache hit rates

**Example Log**:
```json
{
  "level": "warn",
  "message": "Slow request detected",
  "method": "GET",
  "url": "/api/users/123/transactions",
  "duration": 1543,
  "userId": "123"
}
```

### High Memory Usage

**Symptom**: `system.memory.heap_used` increasing

**Investigation Steps**:
1. Check Sentry metrics for memory trend
2. Review recent code changes for memory leaks
3. Check for large in-memory caches
4. Review connection pool sizes

### Missing Metrics

**Symptom**: Metrics not appearing in Sentry

**Checklist**:
- [ ] `SENTRY_DSN` configured
- [ ] `METRICS_ENABLED=true`
- [ ] Sentry sample rate >0
- [ ] Wait 1-2 minutes (metrics batched)

---

## 🚀 Best Practices

### DO ✅

- Track business-critical operations (payments, registrations)
- Use tags for filtering (e.g., `{ plan: 'premium' }`)
- Monitor database query performance
- Track background job execution time
- Use meaningful metric names (`payment.processing_time`, not `pt`)

### DON'T ❌

- Track high-cardinality values as tags (user IDs, emails)
- Create excessive metrics (each costs money in Sentry)
- Log personal data in metrics (GDPR compliance)
- Track every single function call (focus on boundaries)
- Use metrics for debugging (use logs instead)

---

## 🔮 Future Enhancements

### Real-Time Monitoring Dashboard

**Status**: 📋 **Planned - TASK-1.5.2.8**

- Live request rate graph
- Active users count
- Resource usage gauges
- Recent errors feed

### Advanced Performance Profiling

**Status**: 🟡 **Future**

- Flame graphs for CPU profiling
- Memory heap snapshots
- Distributed tracing across services
- Database query analysis

### Custom Alert Rules

**Status**: 📋 **Planned - TASK-1.5.2.7**

- Threshold-based alerts (memory, CPU, error rate)
- Anomaly detection (unusual traffic patterns)
- SLA violation alerts (p95 >500ms)

---

## ✅ Implementation Checklist

- [x] Create PerformanceInterceptor for HTTP tracking
- [x] Create MetricsService for custom metrics
- [x] Integrate with Sentry for visualization
- [x] Add slow request detection (>1000ms)
- [x] Add system metrics collection
- [x] Configure global interceptor in MonitoringModule
- [x] Document usage patterns and best practices
- [ ] Configure Sentry alert rules - TASK-1.5.2.7
- [ ] Create monitoring dashboard - TASK-1.5.2.8

---

**Document Owner**: kdantuono (User) + Claude Code (AI Assistant)
**Status**: ✅ Complete - Ready for production
**Last Updated**: 2025-10-05 22:00 UTC
