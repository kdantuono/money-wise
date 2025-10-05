# Sentry Alert Configuration - MoneyWise

**Date**: 2025-10-05
**Status**: ✅ Documented
**Purpose**: Comprehensive alert strategy and Sentry configuration for production monitoring

---

## 📋 Executive Summary

| Alert Type | Trigger | Response Time | Severity |
|------------|---------|---------------|----------|
| **Error Rate Spike** | >5% error rate | Immediate | Critical |
| **Performance Degradation** | p95 >1000ms | 5 minutes | High |
| **High Memory Usage** | >80% heap | 10 minutes | High |
| **Database Unavailable** | Health check fail | Immediate | Critical |
| **Redis Unavailable** | Health check fail | Immediate | Critical |
| **Slow Request** | Single request >2000ms | 15 minutes | Medium |

---

## 🎯 Alert Philosophy

### Core Principles

1. **Signal Over Noise**: Only alert on actionable issues that require human intervention
2. **Graduated Severity**: Use appropriate severity levels to avoid alert fatigue
3. **Context-Rich**: Include sufficient context for rapid diagnosis and response
4. **Environment-Aware**: Different thresholds for dev/staging/production

### Alert Categories

**🔴 Critical** - Immediate action required (affects users now)
- Service unavailability (database, Redis)
- Error rate spike (>5%)
- Complete service outage

**🟠 High** - Action required within hours (affects user experience)
- Performance degradation (p95 >1000ms)
- High memory usage (>80%)
- Elevated error rate (2-5%)

**🟡 Medium** - Action required within 24 hours (monitoring/investigation)
- Individual slow requests (>2000ms)
- Memory trending upward
- Unusual traffic patterns

**🟢 Low** - FYI only (no immediate action)
- Successful deployments
- Configuration changes
- Metric threshold warnings

---

## 🚨 Alert Configuration (Sentry UI)

### Prerequisites

1. **Sentry Account**: Organization and project created
2. **DSN Configured**: `SENTRY_DSN` in environment variables
3. **Team Setup**: On-call rotation configured
4. **Integrations**: Slack/email notifications configured

### Step-by-Step Configuration

#### 1. Error Rate Spike Alert

**Navigate**: Sentry → Alerts → Create Alert Rule

**Configuration**:
```yaml
Alert Name: "Production Error Rate Spike"
Environment: production
Metric: error_count()
Condition: change(percentage, 5min) > 50%
Threshold: Absolute count > 10 errors
Time Window: 5 minutes
Action: Send notification to #alerts-critical
Severity: critical
```

**Rationale**: Detects sudden error rate increases (e.g., from 2 errors/min to 3+ errors/min = 50% increase) while ignoring noise (must have >10 total errors).

#### 2. Performance Degradation Alert

**Navigate**: Sentry → Performance → Alerts → Create Alert Rule

**Configuration**:
```yaml
Alert Name: "Production Performance Degradation (p95)"
Environment: production
Metric: p95(transaction.duration)
Condition: > 1000ms
Time Window: 5 minutes
Action: Send notification to #alerts-high
Severity: high
```

**Rationale**: Alerts when 95th percentile response time exceeds 1 second for 5 consecutive minutes, indicating widespread performance issues.

#### 3. Critical Endpoint Performance

**Navigate**: Sentry → Performance → Alerts → Create Alert Rule

**Configuration**:
```yaml
Alert Name: "Critical Endpoint Slow (Auth/Payments)"
Environment: production
Metric: p95(transaction.duration)
Filter: transaction IN ["/api/auth/login", "/api/payments/*"]
Condition: > 500ms
Time Window: 3 minutes
Action: Send notification to #alerts-high
Severity: high
```

**Rationale**: Stricter thresholds for business-critical endpoints (authentication, payments) to ensure excellent user experience.

#### 4. High Memory Usage Alert

**Navigate**: Sentry → Alerts → Create Alert Rule → Metric Alert

**Configuration**:
```yaml
Alert Name: "Production High Memory Usage"
Environment: production
Metric: avg(system.memory.heap_used)
Condition: > 1024  # MB (assuming 1.5GB max heap)
Time Window: 10 minutes
Action: Send notification to #alerts-medium
Severity: medium
```

**Rationale**: Alerts when average heap usage exceeds 80% of allocated memory (1.5GB) for 10 minutes, indicating potential memory leak or insufficient resources.

**Note**: This requires custom metrics to be sent to Sentry. See "Custom Metric Integration" section below.

#### 5. Database Health Check Failure

**Navigate**: Sentry → Alerts → Create Issue Alert

**Configuration**:
```yaml
Alert Name: "Database Unavailable"
Environment: production
Condition: Error with tag healthCheck:database
Frequency: Every occurrence
Action: Send notification to #alerts-critical
Severity: critical
```

**Rationale**: Immediate notification when health endpoint detects database unavailability, captured via Sentry.captureException in HealthController.

#### 6. Redis Health Check Failure

**Navigate**: Sentry → Alerts → Create Issue Alert

**Configuration**:
```yaml
Alert Name: "Redis Unavailable"
Environment: production
Condition: Error with tag healthCheck:redis
Frequency: Every occurrence
Action: Send notification to #alerts-critical
Severity: critical
```

**Rationale**: Immediate notification when Redis (session storage) becomes unavailable, captured in HealthController.

#### 7. Slow Individual Request Alert

**Navigate**: Sentry → Performance → Alerts → Create Alert Rule

**Configuration**:
```yaml
Alert Name: "Slow Request Detected (>2s)"
Environment: production
Metric: max(transaction.duration)
Condition: > 2000ms
Time Window: 15 minutes
Action: Send notification to #alerts-medium
Severity: medium
```

**Rationale**: Detects individual requests exceeding 2 seconds, useful for identifying problematic queries or edge cases.

---

## 📊 Custom Metric Integration

### Sending Custom Metrics to Sentry

Currently, MoneyWise tracks metrics as **Sentry breadcrumbs** because `Sentry.metrics` API is not available in the current SDK version (@sentry/node@10.15.0).

**Future Enhancement** (when Sentry.metrics becomes available):

```typescript
// apps/backend/src/core/monitoring/metrics.service.ts

import * as Sentry from '@sentry/node';

export class MetricsService {
  trackSystemMetrics(): void {
    const memoryUsage = process.memoryUsage();

    // Send as Sentry metric (future)
    Sentry.metrics.gauge('system.memory.heap_used',
      Math.round(memoryUsage.heapUsed / 1024 / 1024),
      { unit: 'megabyte' }
    );

    Sentry.metrics.gauge('system.memory.rss',
      Math.round(memoryUsage.rss / 1024 / 1024),
      { unit: 'megabyte' }
    );

    // CPU usage
    const cpuUsage = process.cpuUsage();
    Sentry.metrics.gauge('system.cpu.usage',
      Math.round((cpuUsage.user + cpuUsage.system) / 1000),
      { unit: 'millisecond' }
    );
  }
}
```

**Alternative (current approach)**: Use Sentry breadcrumbs and create alert rules based on error patterns or log messages.

---

## 🔔 Notification Channels

### Slack Integration

**Setup**:
1. Navigate to Sentry → Settings → Integrations → Slack
2. Click "Add Workspace"
3. Authorize Sentry app in Slack
4. Configure notification routing:
   - `#alerts-critical` → Critical/high severity
   - `#alerts-medium` → Medium severity
   - `#monitoring` → All performance insights

**Message Format**:
```
🚨 [CRITICAL] Production Error Rate Spike
Errors increased by 150% in last 5 minutes
Current rate: 12 errors/min
View in Sentry: [Link]
```

### Email Notifications

**Setup**:
1. Navigate to Sentry → Settings → Alerts → Email Routing
2. Configure on-call rotation:
   - **Primary**: on-call engineer (PagerDuty integration)
   - **Secondary**: Team lead
   - **Tertiary**: Engineering manager

**Escalation Policy**:
- 0 min: Slack notification to `#alerts-critical`
- 5 min: Email to primary on-call
- 15 min: Page primary on-call (PagerDuty)
- 30 min: Escalate to secondary on-call

### PagerDuty Integration (Optional)

**Setup**:
1. Navigate to Sentry → Settings → Integrations → PagerDuty
2. Add integration key from PagerDuty service
3. Configure critical alerts to trigger pages:
   - Database unavailable
   - Redis unavailable
   - Error rate >10%

---

## 🎛️ Environment-Specific Configuration

### Development

**Philosophy**: Minimal alerting to reduce noise during development

```yaml
Alerts: Disabled (except manual testing)
Sampling: 100% (for debugging)
Notifications: None
```

### Staging

**Philosophy**: Test alert rules and validate thresholds

```yaml
Error Rate Threshold: 10% (more lenient)
Performance p95: 2000ms (more lenient)
Notifications: #alerts-staging only
Sampling: 50%
```

### Production

**Philosophy**: Strict thresholds with graduated severity

```yaml
Error Rate Threshold: 5% (strict)
Performance p95: 1000ms (strict)
Critical Endpoints p95: 500ms (very strict)
Notifications: Multi-channel (Slack, Email, PagerDuty)
Sampling: 10% (cost-effective)
```

---

## 📈 Alert Tuning and Iteration

### Initial Deployment (Week 1-2)

1. **Enable Low-Threshold Alerts**: Set permissive thresholds to gather baseline data
   - Error rate: 10%
   - p95: 2000ms
   - Memory: 90%

2. **Monitor Alert Frequency**: Track false positive rate
   - Target: <5% false positives
   - Adjust thresholds based on actual traffic patterns

3. **Collect Baseline Metrics**:
   - Normal error rate: X%
   - Normal p95 latency: Yms
   - Normal memory usage: Z%

### Refinement (Week 3-4)

1. **Tighten Thresholds**: Based on baseline data
   - Error rate: Baseline + 3 standard deviations
   - p95: Baseline + 50%
   - Memory: Baseline + 30%

2. **Add Context**: Enrich alerts with relevant metadata
   - User count when error occurred
   - Recent deployments
   - External service status

3. **Validate Escalation**: Test on-call rotation and response times

### Continuous Improvement

**Monthly Review**:
- Alert response time metrics
- False positive rate
- Missed incidents (post-mortems)
- Threshold adjustments

**Quarterly Optimization**:
- Review alert rule effectiveness
- Add new alerts for emerging patterns
- Remove/consolidate redundant alerts
- Update documentation

---

## 🔍 Alert Response Playbook

### Error Rate Spike

**Immediate Actions**:
1. Check Sentry error dashboard for common error types
2. Review recent deployments (last 30 minutes)
3. Check external service status (database, Redis, third-party APIs)
4. Verify if isolated to specific endpoint or global

**Diagnostic Commands**:
```bash
# Check recent deployments
gh run list --limit 5

# Check application logs
docker logs money-wise-backend --tail 100 --follow

# Check database health
docker exec money-wise-db pg_isready

# Check Redis health
docker exec money-wise-redis redis-cli ping
```

**Escalation**:
- If database/Redis unavailable → Page infrastructure team
- If deployment-related → Rollback immediately
- If unknown cause → Engage senior engineer

### Performance Degradation

**Immediate Actions**:
1. Check Sentry Performance → Transactions for slow endpoints
2. Identify slow spans (database queries, external API calls)
3. Check database connection pool utilization
4. Review recent code changes affecting slow endpoint

**Diagnostic Commands**:
```bash
# Check database query performance
docker exec money-wise-db psql -U postgres -d moneywise -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query
  FROM pg_stat_activity
  WHERE state = 'active'
  ORDER BY duration DESC;
"

# Check connection pool stats
curl http://localhost:3000/health/detailed | jq '.services.database'

# Check memory usage
curl http://localhost:3000/health/metrics | jq '.memory'
```

**Remediation**:
- Slow database query → Add index, optimize query
- Connection pool exhausted → Scale database connections
- Memory leak → Restart service, investigate leak source

### Database/Redis Unavailable

**Immediate Actions**:
1. Verify service is actually down (not false positive)
2. Check infrastructure status (AWS, Docker, network)
3. Attempt service restart if safe
4. Check for disk space/memory issues on host

**Recovery Steps**:
```bash
# Check Docker container status
docker compose ps

# Restart specific service
docker compose restart postgres
docker compose restart redis

# Check logs for errors
docker compose logs postgres --tail 100
docker compose logs redis --tail 100

# Verify health after restart
curl http://localhost:3000/health/readiness
```

**Communication**:
- Post incident status to #incidents channel
- Update status page if customer-facing
- Notify stakeholders of estimated recovery time

---

## ✅ Configuration Checklist

**Sentry Account Setup**:
- [ ] Create Sentry organization and project
- [ ] Configure DSN in all environments (.env.production, .env.staging)
- [ ] Set up team members and roles
- [ ] Configure on-call rotation

**Alert Rules**:
- [ ] Error rate spike alert (critical)
- [ ] Performance degradation p95 alert (high)
- [ ] Critical endpoint performance alert (high)
- [ ] Database health check failure alert (critical)
- [ ] Redis health check failure alert (critical)
- [ ] Slow individual request alert (medium)

**Notification Channels**:
- [ ] Slack integration configured (#alerts-critical, #alerts-high, #alerts-medium)
- [ ] Email routing configured for on-call rotation
- [ ] PagerDuty integration (optional, for critical alerts)

**Testing**:
- [ ] Trigger test error in staging to verify alerts
- [ ] Simulate slow request to verify performance alerts
- [ ] Test database health check failure alert
- [ ] Verify notification delivery to all channels
- [ ] Validate escalation policy timing

**Documentation**:
- [ ] Alert response playbook shared with team
- [ ] On-call rotation schedule published
- [ ] Incident communication template created
- [ ] Post-mortem template prepared

---

## 🔮 Future Enhancements

### Advanced Alert Rules

**Anomaly Detection** (Sentry AI-powered alerts):
- Automatically detect unusual traffic patterns
- Baseline learning for error rates and performance
- Smart thresholds that adapt to traffic variations

**SLA Violation Alerts**:
```yaml
Alert Name: "SLA Violation - API Availability"
Metric: uptime(24h)
Condition: < 99.9%
Action: Page infrastructure team
```

**User Impact Alerts**:
```yaml
Alert Name: "High User-Impacting Errors"
Metric: count_unique(user) WHERE error = true
Condition: > 100 users affected in 15 minutes
Action: Critical escalation
```

### Custom Dashboards

**Real-Time Monitoring Dashboard**:
- Live error rate graph
- p50/p75/p95/p99 latency charts
- Active users count
- Database/Redis health status
- Memory/CPU usage trends

**Business Metrics Dashboard**:
- User registrations per hour
- Transactions processed
- Payment success rate
- API endpoint usage breakdown

---

## 📚 Reference

### Sentry Documentation
- [Alert Rules](https://docs.sentry.io/product/alerts/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Metric Alerts](https://docs.sentry.io/product/alerts/create-alerts/metric-alert-config/)
- [Integrations](https://docs.sentry.io/product/integrations/)

### Related MoneyWise Documentation
- [Performance Monitoring](./performance-monitoring.md)
- [Logging Strategy](./logging-strategy.md)
- [Error Tracking](./error-tracking.md)
- [Health Endpoints](../api/health-endpoints.md)

---

**Document Owner**: kdantuono (User) + Claude Code (AI Assistant)
**Status**: ✅ Complete - Ready for Sentry UI configuration
**Last Updated**: 2025-10-05 22:15 UTC
