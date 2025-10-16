# Monitoring Dashboard - MoneyWise

**Date**: 2025-10-05
**Status**: 📋 Planned (Sentry-based)
**Purpose**: Real-time monitoring dashboard for production observability

---

## 📋 Executive Summary

MoneyWise uses **Sentry Performance Dashboard** as the primary monitoring interface, supplemented by health endpoints for operational checks.

| Dashboard Component | Data Source | Update Frequency | Purpose |
|---------------------|-------------|------------------|---------|
| **Error Tracking** | Sentry Issues | Real-time | Track errors, exceptions, and failures |
| **Performance Metrics** | Sentry Performance | Real-time | Monitor API latency and throughput |
| **Health Status** | `/health` endpoints | On-demand | Operational health checks |
| **System Metrics** | Sentry Breadcrumbs | 1 minute | Memory, CPU, uptime tracking |
| **Business Metrics** | Sentry Breadcrumbs | Real-time | User actions, transactions |

---

## 🎯 Dashboard Philosophy

### Core Principles

1. **Sentry-First Approach**: Leverage Sentry's built-in dashboards instead of custom solutions
2. **Health Endpoint Fallback**: Use `/health/*` endpoints for infrastructure monitoring
3. **Progressive Enhancement**: Start simple, add complexity as needed
4. **Cost-Effective**: Maximize Sentry's free tier before considering custom solutions

### Why Sentry Over Custom Dashboard?

**Advantages**:
- ✅ Zero implementation cost (use existing Sentry integration)
- ✅ Real-time error tracking with automatic aggregation
- ✅ Performance monitoring with automatic transaction detection
- ✅ Built-in alerting (already configured in TASK-1.5.2.7)
- ✅ No infrastructure to maintain
- ✅ Mobile app for on-call monitoring

**Trade-offs**:
- ⚠️ Limited customization of visualizations
- ⚠️ Business metrics less prominent (mixed with technical metrics)
- ⚠️ 10% sampling in production (not full visibility)

---

## 📊 Dashboard Components

### 1. Sentry Performance Dashboard

**Access**: https://sentry.io/organizations/{org}/performance/

#### Overview Tab

**Metrics Displayed**:
- **Transaction Volume**: Requests per minute (RPM)
- **Failure Rate**: Percentage of failed transactions
- **Apdex Score**: Application performance index (user satisfaction)
- **p50/p75/p95/p99 Latency**: Response time percentiles

**Example View**:
```
┌─────────────────────────────────────────────────────┐
│ Performance Overview                                 │
│                                                      │
│ Apdex: 0.95 (Excellent)                             │
│ Throughput: 450 RPM                                  │
│ Failure Rate: 0.2%                                   │
│                                                      │
│ Latency Distribution (last 24h):                    │
│   p50: 120ms                                         │
│   p75: 180ms                                         │
│   p95: 450ms                                         │
│   p99: 890ms                                         │
└─────────────────────────────────────────────────────┘
```

#### Transactions Tab

**Metrics Per Endpoint**:
- Transaction name (e.g., `POST /api/auth/login`)
- Average duration
- p95 duration
- Request count
- Failure rate

**Sorting Options**:
- Slowest transactions (by p95)
- Most frequent transactions (by count)
- Highest failure rate

**Example View**:
```
┌────────────────────────────────────────────────────────────────┐
│ Top Transactions by p95 Duration                               │
├────────────────────┬──────────┬─────────┬──────────┬──────────┤
│ Transaction        │ Count    │ Avg     │ p95      │ Failures │
├────────────────────┼──────────┼─────────┼──────────┼──────────┤
│ GET /api/users/:id │ 12,450   │ 85ms    │ 320ms    │ 0.1%     │
│ POST /api/auth/... │ 8,320    │ 140ms   │ 450ms    │ 0.3%     │
│ GET /api/transa... │ 15,670   │ 95ms    │ 380ms    │ 0.0%     │
└────────────────────┴──────────┴─────────┴──────────┴──────────┘
```

#### Trends Tab

**Time-Series Graphs**:
- Throughput trend (requests/min over time)
- Latency trend (p50/p95/p99 over time)
- Error rate trend (errors/min over time)
- Apdex trend (user satisfaction over time)

**Time Ranges**:
- Last hour (real-time monitoring)
- Last 24 hours (daily patterns)
- Last 7 days (weekly trends)
- Last 30 days (monthly analysis)

### 2. Sentry Issues Dashboard

**Access**: https://sentry.io/organizations/{org}/issues/

#### Error Tracking

**Metrics Displayed**:
- New issues (never seen before)
- Regressed issues (previously resolved, now recurring)
- Unhandled issues (not caught by error handlers)
- Issue frequency (events per hour)

**Grouping**:
- By error message
- By stack trace
- By user impact (number of affected users)
- By first seen / last seen

**Example View**:
```
┌────────────────────────────────────────────────────────────────┐
│ Issues (Last 24h)                                              │
├────────────────────┬──────────┬──────────┬───────────────────┤
│ Error              │ Events   │ Users    │ Last Seen         │
├────────────────────┼──────────┼──────────┼───────────────────┤
│ DatabaseConnecti...│ 45       │ 12       │ 2 minutes ago     │
│ ValidationError... │ 23       │ 18       │ 15 minutes ago    │
│ UnauthorizedExc... │ 8        │ 5        │ 1 hour ago        │
└────────────────────┴──────────┴──────────┴───────────────────┘
```

#### Issue Details

**For Each Issue**:
- Full stack trace with source code context
- Breadcrumbs (HTTP requests, logs leading to error)
- User context (ID, email if available)
- Tags (environment, endpoint, version)
- Release information (git commit, deployment time)

### 3. Health Endpoints Dashboard

**Access**: Programmatic via curl/Postman or custom dashboard

#### Liveness Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-05T22:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "heapUsed": 145.5,
    "heapTotal": 256.0,
    "rss": 320.8
  }
}
```

**Monitoring**:
- Use in Kubernetes liveness probe
- Alert if status != "ok"
- Track uptime for SLA reporting

#### Readiness Check

**Endpoint**: `GET /health/readiness`

**Response**:
```json
{
  "status": "ready",
  "timestamp": "2025-10-05T22:30:00.000Z",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

**Monitoring**:
- Use in Kubernetes readiness probe
- Alert if any check is false
- Track downtime for incident response

#### Detailed Health

**Endpoint**: `GET /health/detailed`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-05T22:30:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "0.4.7",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 12,
      "connections": {
        "total": 10,
        "active": 3,
        "idle": 7
      }
    },
    "redis": {
      "status": "healthy",
      "responseTime": 2,
      "version": "7.0.0"
    }
  },
  "memory": {
    "heapUsed": 145.5,
    "heapTotal": 256.0,
    "rss": 320.8,
    "external": 12.3
  }
}
```

**Monitoring**:
- Create Grafana dashboard (optional)
- Track connection pool utilization
- Monitor response times for degradation
- Alert on memory spikes

#### System Metrics

**Endpoint**: `GET /health/metrics`

**Response**:
```json
{
  "timestamp": "2025-10-05T22:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "heapUsed": 145.5,
    "heapTotal": 256.0,
    "rss": 320.8,
    "external": 12.3
  },
  "cpu": {
    "user": 123456789,
    "system": 45678901
  }
}
```

**Monitoring**:
- Poll every 60 seconds
- Store in time-series database (future: TimescaleDB)
- Graph trends over time
- Correlate with performance issues

---

## 🎛️ Sentry Dashboard Configuration

### Custom Discover Queries

Sentry allows creating custom queries for business metrics.

#### User Registration Rate

**Navigate**: Sentry → Discover → Build New Query

**Configuration**:
```sql
SELECT count() AS registrations
FROM breadcrumbs
WHERE category = 'metrics'
  AND message CONTAINS 'business.user.registration'
GROUP BY time(1h)
```

**Visualization**: Line chart showing registrations per hour

#### Payment Success Rate

**Navigate**: Sentry → Discover → Build New Query

**Configuration**:
```sql
SELECT
  count() AS total_payments,
  count() FILTER (WHERE message CONTAINS 'payment.completed') AS successful,
  count() FILTER (WHERE message CONTAINS 'payment.failed') AS failed,
  successful / total_payments * 100 AS success_rate
FROM breadcrumbs
WHERE category = 'metrics'
  AND (message CONTAINS 'payment.completed' OR message CONTAINS 'payment.failed')
GROUP BY time(1h)
```

**Visualization**: Stacked bar chart with success/failure breakdown

#### Slow Request Frequency

**Navigate**: Sentry → Discover → Build New Query

**Configuration**:
```sql
SELECT count() AS slow_requests
FROM breadcrumbs
WHERE category = 'http.request'
  AND data.duration > 1000
GROUP BY time(15m), data.url
```

**Visualization**: Heatmap showing slow request distribution by endpoint

---

## 📱 Mobile Monitoring

### Sentry Mobile App

**Features**:
- Real-time push notifications for alerts
- Error tracking on-the-go
- Performance dashboard (simplified)
- Issue assignment and resolution
- Release tracking

**Use Cases**:
- On-call engineer monitoring
- Incident response while away from desk
- Quick triage during commute

**Download**:
- iOS: https://apps.apple.com/us/app/sentry/id1146756166
- Android: https://play.google.com/store/apps/details?id=io.sentry.mobile

---

## 🚀 Custom Dashboard (Future Enhancement)

### Rationale for Custom Solution

When to consider building a custom dashboard:
1. **Business metrics prominence**: Need to highlight business KPIs
2. **Multi-source aggregation**: Combine Sentry + database + third-party APIs
3. **Custom visualizations**: Specific chart types not available in Sentry
4. **White-label needs**: Customer-facing status page

### Tech Stack Recommendation

**Frontend**:
- Next.js (already in monorepo)
- Recharts or Chart.js (lightweight charting)
- TailwindCSS (already configured)

**Backend**:
- NestJS health endpoints (already available)
- TimescaleDB (time-series data storage)
- Redis (caching for performance)

**Data Flow**:
```
MetricsService → TimescaleDB → GraphQL API → Next.js Dashboard
      ↓
Sentry (real-time alerts)
```

### Custom Dashboard MVP Features

**Phase 1** (2-3 days):
1. Real-time error count graph (last 1 hour)
2. p95 latency graph (last 1 hour)
3. Active users count (from session storage)
4. Health status indicators (database, Redis)

**Phase 2** (1 week):
5. Business metrics: registrations, transactions
6. Endpoint performance breakdown
7. Memory/CPU usage graphs
8. Alert history timeline

**Phase 3** (2 weeks):
9. Custom time range selection
10. Metric comparison (current vs previous week)
11. Exportable reports (PDF/CSV)
12. User-specific dashboards (admin vs engineer)

### Implementation Estimate

**Total Effort**: 2-3 weeks (1 developer)

**Breakdown**:
- Backend metrics API: 3 days
- TimescaleDB integration: 2 days
- Frontend dashboard UI: 5 days
- Real-time updates (WebSocket): 2 days
- Testing and refinement: 3 days

**Cost vs Benefit**:
- **Cost**: 2-3 weeks development + ongoing maintenance
- **Benefit**: Better business visibility, custom branding
- **Recommendation**: Use Sentry until business metrics become critical KPI

---

## 🔧 Operational Dashboards

### Grafana Dashboard (Optional)

If you have Grafana infrastructure, create a dashboard using health endpoint data.

**Data Source**: HTTP JSON API

**Panels**:

#### Panel 1: Service Health Status
```yaml
Type: Stat
Query: GET /health/detailed
Metric: services.database.status, services.redis.status
Thresholds: healthy = green, degraded = yellow, unhealthy = red
```

#### Panel 2: Database Connection Pool
```yaml
Type: Gauge
Query: GET /health/detailed
Metric: services.database.connections.active / services.database.connections.total
Thresholds: <70% = green, 70-90% = yellow, >90% = red
```

#### Panel 3: Memory Usage
```yaml
Type: Time Series
Query: GET /health/metrics (poll every 60s)
Metric: memory.heapUsed, memory.heapTotal, memory.rss
```

#### Panel 4: API Response Time
```yaml
Type: Time Series
Query: Parse /health/detailed (services.database.responseTime)
Metric: services.database.responseTime, services.redis.responseTime
```

**Example Dashboard JSON**: (See appendix below)

---

## 📊 Dashboard Access Control

### Sentry Access

**Team Structure**:
- **Owner**: Full access (platform owners)
- **Admin**: Alert configuration, member management
- **Member**: Read-only access to errors and performance
- **Billing**: Billing and subscription management only

**Recommended Setup**:
- Developers: Member role
- Team Leads: Admin role
- DevOps: Admin role
- Product Managers: Member role (view-only)

### Health Endpoint Access

**Public Endpoints** (no authentication):
- `GET /health` - Basic liveness check (for load balancers)

**Protected Endpoints** (require API key or internal network):
- `GET /health/readiness` - Readiness check
- `GET /health/detailed` - Detailed system information
- `GET /health/metrics` - System resource metrics

**Security Configuration**:
```typescript
// apps/backend/src/core/health/health.controller.ts

@Controller('health')
export class HealthController {
  @Get()
  @Public() // No authentication
  getHealth() { ... }

  @Get('readiness')
  @UseGuards(InternalOnlyGuard) // Internal network only
  getReadiness() { ... }

  @Get('detailed')
  @UseGuards(ApiKeyGuard) // Require API key
  getDetailedHealth() { ... }
}
```

---

## 🔍 Dashboard Usage Patterns

### Daily Operations

**Morning Check** (5 minutes):
1. Open Sentry Performance dashboard
2. Check error count (last 24 hours)
3. Verify p95 latency < 500ms
4. Review any new issues

**On-Call Monitoring** (continuous):
1. Enable Sentry mobile app push notifications
2. Monitor Slack #alerts-critical channel
3. Quick triage via mobile app
4. Deep investigation via web dashboard

**Post-Deployment Verification** (10 minutes):
1. Check error rate (should not increase)
2. Verify p95 latency (should not degrade)
3. Confirm new release tagged in Sentry
4. Monitor for 15 minutes after deployment

### Incident Response

**Step 1: Identify** (1-2 minutes)
- Check Sentry Issues for spike in errors
- Check Sentry Performance for latency spike
- Verify health endpoints (`/health/readiness`)

**Step 2: Diagnose** (5-10 minutes)
- Click into specific error in Sentry
- Review breadcrumbs for request context
- Check stack trace and source code
- Correlate with recent deployments

**Step 3: Triage** (2-5 minutes)
- Assign issue to appropriate team member
- Set priority (P0 = critical, P1 = high, P2 = medium)
- Create incident channel in Slack
- Update status page if customer-facing

**Step 4: Resolve** (varies)
- Fix code and deploy
- Verify error stops in Sentry
- Mark issue as resolved
- Document in post-mortem

---

## 📈 Metrics to Track

### Technical Metrics

**Performance**:
- p50, p75, p95, p99 latency (target: p95 < 500ms)
- Request throughput (RPM)
- Error rate (target: <1%)
- Apdex score (target: >0.9)

**Availability**:
- Uptime percentage (target: 99.9%)
- Database health (should always be "healthy")
- Redis health (should always be "healthy")
- Deployment success rate (target: 95%)

**Resource Usage**:
- Memory usage (target: <80% of allocated)
- CPU usage (target: <70% average)
- Database connection pool (target: <80% utilization)
- Disk space (target: <70% used)

### Business Metrics

**User Engagement**:
- Active users (daily/weekly/monthly)
- New user registrations
- Session duration
- Feature adoption rate

**Financial**:
- Transactions processed
- Payment success rate (target: >99%)
- Revenue per user
- Conversion funnel completion

**Quality**:
- User-reported errors (support tickets)
- Time to first error detection
- Mean time to resolution (MTTR)
- Repeat error rate

---

## ✅ Implementation Checklist

**Sentry Setup**:
- [x] Sentry organization and project created (TASK-1.5.2.1)
- [x] DSN configured in all environments (TASK-1.5.2.2)
- [x] Error tracking enabled (TASK-1.5.2.4)
- [x] Performance monitoring enabled (TASK-1.5.2.6)
- [x] Alert rules configured (TASK-1.5.2.7)
- [ ] Custom Discover queries created (business metrics)
- [ ] Team members invited and roles assigned
- [ ] Mobile app installed for on-call engineers

**Health Endpoints**:
- [x] `/health` liveness endpoint (TASK-1.5.2.1)
- [x] `/health/readiness` readiness endpoint (TASK-1.5.2.1)
- [x] `/health/detailed` detailed health endpoint (TASK-1.5.2.1)
- [x] `/health/metrics` system metrics endpoint (TASK-1.5.2.1)
- [ ] Access control configured (public vs protected)
- [ ] Grafana dashboard created (optional)

**Documentation**:
- [x] Dashboard documentation created (this document)
- [x] Alert configuration documented (TASK-1.5.2.7)
- [x] Performance monitoring documented (TASK-1.5.2.6)
- [ ] Operational runbook updated with dashboard links
- [ ] Team training on dashboard usage

---

## 🔮 Future Enhancements

### Real-Time Dashboard

**Tech Stack**: Next.js + WebSocket + TimescaleDB

**Features**:
- Live request rate graph (updates every second)
- Live error feed (newest errors streaming in)
- Active users map (geographic distribution)
- Database query performance (slow query alerts)

**Implementation Timeline**: 2-3 weeks

### Predictive Analytics

**Machine Learning Integration**:
- Anomaly detection (unusual traffic patterns)
- Forecasting (predict error spikes based on trends)
- Capacity planning (estimate when to scale)

**Tech Stack**: Python (scikit-learn) + Sentry data export

**Implementation Timeline**: 4-6 weeks

### Customer-Facing Status Page

**Purpose**: Public-facing uptime and incident communication

**Tech Stack**: Statuspage.io (SaaS) or custom Next.js page

**Features**:
- Current system status (all systems operational)
- Incident history and timeline
- Scheduled maintenance announcements
- Subscribe to notifications (email/SMS)

**Implementation Timeline**: 1 week (SaaS) or 2 weeks (custom)

---

## 📚 Reference

### Sentry Documentation
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Discover Queries](https://docs.sentry.io/product/discover-queries/)
- [Dashboards](https://docs.sentry.io/product/dashboards/)
- [Mobile App](https://docs.sentry.io/product/mobile/)

### Grafana Documentation
- [HTTP API Data Source](https://grafana.com/docs/grafana/latest/datasources/http-api/)
- [JSON API Plugin](https://grafana.com/grafana/plugins/marcusolsson-json-datasource/)

### Related MoneyWise Documentation
- [Health Endpoints](apps/backend/src/core/health/health.controller.ts:1)
- [Performance Monitoring](./performance-monitoring.md)
- [Alert Configuration](./sentry-alert-configuration.md)
- [Logging Strategy](./logging-strategy.md)

---

## 📎 Appendix: Sample Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "MoneyWise Production Health",
    "panels": [
      {
        "id": 1,
        "title": "Service Health Status",
        "type": "stat",
        "targets": [
          {
            "url": "http://localhost:3000/health/detailed",
            "method": "GET",
            "jsonPath": "$.services.database.status"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 1, "color": "green" }
              ]
            },
            "mappings": [
              { "value": "healthy", "text": "Healthy", "color": "green" },
              { "value": "unhealthy", "text": "Unhealthy", "color": "red" }
            ]
          }
        }
      },
      {
        "id": 2,
        "title": "Database Connection Pool Utilization",
        "type": "gauge",
        "targets": [
          {
            "url": "http://localhost:3000/health/detailed",
            "method": "GET",
            "jsonPath": "$.services.database.connections.active"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "min": 0,
            "max": 10,
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 7, "color": "yellow" },
                { "value": 9, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 3,
        "title": "Memory Usage (MB)",
        "type": "timeseries",
        "targets": [
          {
            "url": "http://localhost:3000/health/metrics",
            "method": "GET",
            "jsonPath": "$.memory.heapUsed"
          }
        ],
        "interval": "60s"
      }
    ]
  }
}
```

---

**Document Owner**: kdantuono (User) + Claude Code (AI Assistant)
**Status**: ✅ Complete - Sentry-based monitoring dashboard documented
**Last Updated**: 2025-10-05 22:45 UTC
