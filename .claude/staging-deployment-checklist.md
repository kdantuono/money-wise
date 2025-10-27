# MoneyWise Staging Deployment Checklist

## ✅ Pre-Deployment Phase

### Infrastructure Setup
- [ ] PostgreSQL 15 with TimescaleDB extension provisioned
  - [ ] Host: `staging-db.example.com`
  - [ ] Database: `moneywise_staging`
  - [ ] User: `postgres`
  - [ ] Password: Set and secured

- [ ] Redis 7+ instance provisioned
  - [ ] Host: `staging-redis-host`
  - [ ] Port: 6379
  - [ ] Password: Set and secured
  - [ ] Persistence: Enabled

- [ ] Domain and SSL/TLS
  - [ ] Domain: `staging.moneywise.app`
  - [ ] DNS: Configured to point to staging server
  - [ ] SSL Certificate: Provisioned
  - [ ] HTTPS: Enforced

### Service Credentials
- [ ] Sentry Projects Created
  - [ ] Backend project: `moneywise-staging-backend`
  - [ ] Frontend project: `moneywise-staging-web`
  - [ ] DSNs: Obtained and documented

- [ ] Banking Integration (SaltEdge)
  - [ ] Staging credentials: Obtained
  - [ ] Client ID: Secured
  - [ ] Secret: Secured

- [ ] Monitoring (Optional)
  - [ ] AWS CloudWatch: Configured (optional)
  - [ ] Sentry: Configured
  - [ ] Alerts: Set up

### Configuration
- [ ] Secrets Generated
  - [ ] JWT_ACCESS_SECRET: Generated (32+ chars)
  - [ ] JWT_REFRESH_SECRET: Generated (32+ chars)
  - [ ] REDIS_PASSWORD: Set
  - [ ] DB_PASSWORD: Set

- [ ] Environment Files Updated
  - [ ] `apps/backend/.env.staging`: All placeholders replaced
  - [ ] `apps/web/.env.staging`: All placeholders replaced
  - [ ] Secrets: Stored securely (not committed)
  - [ ] Permissions: 600 (readable only by owner)

## 🚀 Deployment Phase

### Build & Push
- [ ] Docker images built
  - [ ] Backend: `moneywise-backend:staging`
  - [ ] Frontend: `moneywise-web:staging`

- [ ] Images pushed to registry (if using external registry)
  - [ ] Backend: Pushed
  - [ ] Frontend: Pushed
  - [ ] Tags: `staging` and `latest-staging`

### Services Started
- [ ] docker-compose services running
  - [ ] moneywise-backend: Up and healthy
  - [ ] moneywise-web: Up and healthy
  - [ ] moneywise-postgres: Up and healthy
  - [ ] moneywise-redis: Up and healthy

- [ ] Database initialized
  - [ ] Migrations run: `pnpm db:migrate`
  - [ ] Seed data: `pnpm db:seed` (optional)
  - [ ] Schema verified

## 🔍 Verification Phase

### Health Checks
- [ ] Backend health endpoint
  - [ ] `GET /api/health` returns 200 OK
  - [ ] Response includes uptime and status

- [ ] Frontend accessible
  - [ ] `GET /` returns 200 OK
  - [ ] Pages load without errors
  - [ ] CSS/JS assets load correctly

- [ ] Database connectivity
  - [ ] `pg_isready` returns success
  - [ ] Tables exist and have data
  - [ ] Queries execute without errors

- [ ] Redis connectivity
  - [ ] `redis-cli ping` returns PONG
  - [ ] Can set/get keys
  - [ ] Persistence verified

### Integration Tests
- [ ] Authentication flow
  - [ ] User login works
  - [ ] JWT tokens generated correctly
  - [ ] Token refresh works

- [ ] Banking integration
  - [ ] OAuth initiation works
  - [ ] Callback handling works
  - [ ] Account sync works

- [ ] API endpoints
  - [ ] CORS configured correctly
  - [ ] Content-Type headers correct
  - [ ] Error responses formatted correctly

### Monitoring Setup
- [ ] Sentry monitoring
  - [ ] Backend events received
  - [ ] Frontend events received
  - [ ] Release tracking working

- [ ] CloudWatch (if enabled)
  - [ ] Metrics being collected
  - [ ] Alarms configured
  - [ ] Dashboards accessible

## 📊 Post-Deployment Phase

### Performance Verification
- [ ] Backend response times
  - [ ] API endpoints: < 200ms
  - [ ] Database queries: < 100ms
  - [ ] Redis operations: < 10ms

- [ ] Frontend performance
  - [ ] Largest Contentful Paint: < 2.5s
  - [ ] Cumulative Layout Shift: < 0.1
  - [ ] First Input Delay: < 100ms

### Security Verification
- [ ] HTTPS enforced
  - [ ] HTTP redirects to HTTPS
  - [ ] HSTS headers present
  - [ ] Certificate valid

- [ ] Environment variables
  - [ ] No secrets in logs
  - [ ] No credentials in git history
  - [ ] Secrets stored securely

- [ ] Access control
  - [ ] Non-root container users (nestjs:1001, nextjs:1001)
  - [ ] Database credentials not exposed
  - [ ] API keys not exposed

### Documentation
- [ ] Deployment documented
  - [ ] Configuration documented
  - [ ] Secrets management documented
  - [ ] Rollback procedure documented

- [ ] Team notification
  - [ ] Team informed of staging deployment
  - [ ] Access details shared
  - [ ] Testing instructions provided

## 🎯 Sign-Off

- [ ] Deployment successful
- [ ] All checks passed
- [ ] Staging environment ready for testing
- [ ] Date: _______________
- [ ] Deployed by: _______________

## 🔄 Next Steps

1. **PHASE 5.2**: Run E2E tests against staging
   - Execute Playwright test suite
   - Verify all scenarios pass
   - Document any issues

2. **PHASE 5.3**: Set up monitoring and logging
   - Configure Sentry alerts
   - Set up CloudWatch dashboards
   - Configure log aggregation

3. **PHASE 5.4**: Production deployment
   - Create production environment
   - Run staging E2E tests against prod
   - Monitor production closely

---

**Status**: Preparing for deployment
**Last Updated**: 2025-10-27
**Maintained by**: Claude Code
