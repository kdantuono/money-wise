# MoneyWise Staging Configuration Guide

## Overview

This guide walks you through configuring the MoneyWise staging environment. The preparation script has created template files that need to be populated with actual infrastructure details.

## Generated Files

After running `prepare-staging-deployment.sh`, you have:

1. **Environment Files** (need configuration)
   - `apps/backend/.env.staging` - Backend service configuration
   - `apps/web/.env.staging` - Frontend service configuration

2. **Secrets File** (keep secure)
   - `.claude/staging-secrets.json` - Generated secrets (delete after use)

3. **Deployment Automation**
   - `.claude/scripts/deploy-staging.sh` - Automated deployment script
   - `.claude/staging-deployment-checklist.md` - Comprehensive checklist

4. **Documentation**
   - `STAGING-DEPLOYMENT-ANALYSIS.md` - Deep technical analysis
   - `STAGING-QUICK-REFERENCE.md` - Quick command reference

## Configuration Steps

### Step 1: Infrastructure Prerequisites

Before configuring, you need to provision:

#### PostgreSQL Database
```
- PostgreSQL 15 with TimescaleDB extension
- Host: staging-db.example.com (replace with actual)
- Database: moneywise_staging
- User: postgres
- Password: Generate strong password (32+ chars)
- Backup: Consider automated backups
- Monitoring: Enable slow query logs
```

**Provisioning Options:**
- AWS RDS (PostgreSQL 15)
- DigitalOcean Managed Database
- Azure Database for PostgreSQL
- Self-managed on VPS

#### Redis Cache
```
- Redis 7.x Alpine
- Host: staging-redis-host (replace with actual)
- Port: 6379
- Password: Generate strong password (32+ chars)
- Persistence: Enable AOF (Append-Only File)
- Memory: 1GB minimum for staging
```

**Provisioning Options:**
- AWS ElastiCache
- DigitalOcean Managed Redis
- Redis Cloud
- Self-managed on VPS

#### Domain & SSL/TLS
```
- Primary domain: staging.moneywise.app
- API domain: staging-api.moneywise.app
- SSL Certificate: Self-signed or Let's Encrypt
- Auto-renewal: Recommended
```

#### Container Registry (Optional)
```
- Docker Hub, GitHub Container Registry, or AWS ECR
- Used for storing and deploying Docker images
- If local deployment, can skip this step
```

### Step 2: Populate Backend Configuration

Edit `apps/backend/.env.staging`:

```bash
# Open the file
nano apps/backend/.env.staging

# Replace the following placeholders:
```

#### Database Section
```bash
# From generated secrets:
DB_HOST=your-staging-db-host.example.com
DB_PORT=5432
DB_NAME=moneywise_staging
DB_USERNAME=postgres
DB_PASSWORD=<paste-from-staging-secrets.json: DB_PASSWORD>
```

#### JWT Secrets
```bash
# From generated secrets:
JWT_ACCESS_SECRET=<paste-from-staging-secrets.json: JWT_ACCESS_SECRET>
JWT_REFRESH_SECRET=<paste-from-staging-secrets.json: JWT_REFRESH_SECRET>
```

#### Redis Configuration
```bash
REDIS_HOST=your-staging-redis-host.example.com
REDIS_PORT=6379
REDIS_PASSWORD=<paste-from-staging-secrets.json: REDIS_PASSWORD>
```

#### Sentry Configuration
```bash
# Get this from: https://sentry.io/settings/{org}/projects/

# Create two Sentry projects first:
# 1. moneywise-staging-backend
# 2. moneywise-staging-web

SENTRY_DSN=https://<SENTRY_KEY>@o<ORG_ID>.ingest.sentry.io/<PROJECT_ID>
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=moneywise@$(git rev-parse --short HEAD)
```

#### Banking Integration (SaltEdge)
```bash
# Get staging credentials from SaltEdge dashboard
SALTEDGE_CLIENT_ID=<your-staging-client-id>
SALTEDGE_SECRET=<your-staging-secret>
BANKING_INTEGRATION_ENABLED=true
```

**Complete Backend Configuration Looks Like:**
```env
NODE_ENV=staging
PORT=3001
CORS_ORIGIN=https://staging.moneywise.app

DB_HOST=staging-db.mycompany.com
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=a7f2k9x1j8m3n5p2q0r1s2t3u4v5w6x
DB_NAME=moneywise_staging
DB_SCHEMA=public
DB_SYNCHRONIZE=false
DB_LOGGING=false

TIMESCALEDB_ENABLED=true
TIMESCALEDB_COMPRESSION_ENABLED=true
TIMESCALEDB_RETENTION_ENABLED=true
TIMESCALEDB_CHUNK_TIME_INTERVAL=1d
TIMESCALEDB_COMPRESSION_AFTER=7d
TIMESCALEDB_RETENTION_AFTER=7y

JWT_ACCESS_SECRET=3dafa819e2c1f4b5a8d9c2e1f4a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=c31e5cbde6f2a4c1b8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a
JWT_REFRESH_EXPIRES_IN=7d

REDIS_HOST=staging-redis.mycompany.com
REDIS_PORT=6379
REDIS_PASSWORD=a85f61c0d4e2f9b1a3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f
REDIS_DB=0

SENTRY_DSN=https://abc123def456@o789012.ingest.sentry.io/345678
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=moneywise@a1b2c3d

SALTEDGE_CLIENT_ID=staging_client_123
SALTEDGE_SECRET=staging_secret_xyz789
BANKING_INTEGRATION_ENABLED=true

METRICS_ENABLED=true
METRICS_FLUSH_INTERVAL=30000
HEALTH_CHECK_ENABLED=true
```

### Step 3: Populate Frontend Configuration

Edit `apps/web/.env.staging`:

```bash
nano apps/web/.env.staging
```

#### Application Configuration
```bash
NEXT_PUBLIC_APP_NAME=MoneyWise
NEXT_PUBLIC_APP_VERSION=0.5.0
NEXT_PUBLIC_API_URL=https://staging-api.moneywise.app/api
```

#### Sentry Configuration
```bash
# Use the same Sentry project you created for frontend
NEXT_PUBLIC_SENTRY_DSN=https://<SENTRY_KEY>@o<ORG_ID>.ingest.sentry.io/<FRONTEND_PROJECT_ID>
NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=moneywise@$(git rev-parse --short HEAD)
NEXT_PUBLIC_SENTRY_RELEASE=moneywise@$(git rev-parse --short HEAD)
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.5
```

#### Feature Flags
```bash
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_BANKING_ENABLED=true
NEXT_PUBLIC_OAUTH_REDIRECT_BASE=https://staging.moneywise.app
NEXT_PUBLIC_OAUTH_CALLBACK_PATH=/banking/callback
```

**Complete Frontend Configuration Looks Like:**
```env
NEXT_PUBLIC_APP_NAME=MoneyWise
NEXT_PUBLIC_APP_VERSION=0.5.0
NEXT_PUBLIC_API_URL=https://staging-api.moneywise.app/api

NEXT_PUBLIC_SENTRY_DSN=https://def789ghi012@o789012.ingest.sentry.io/456789
NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=moneywise-staging-web
SENTRY_RELEASE=moneywise@a1b2c3d
NEXT_PUBLIC_SENTRY_RELEASE=moneywise@a1b2c3d
SENTRY_ENVIRONMENT=staging

NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.5
NEXT_PUBLIC_SENTRY_DEBUG=false

NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_BANKING_ENABLED=true
NEXT_PUBLIC_OAUTH_REDIRECT_BASE=https://staging.moneywise.app
NEXT_PUBLIC_OAUTH_CALLBACK_PATH=/banking/callback
```

### Step 4: Verify Configuration

Run the verification script:

```bash
./.claude/scripts/prepare-staging-deployment.sh --verify
```

Expected output:
```
✓ Backend .env.staging exists
✓ Backend .env.staging appears fully configured
✓ Web .env.staging exists
✓ Web .env.staging appears fully configured
✓ docker-compose.dev.yml is valid
✓ Staging configuration is ready for deployment
```

### Step 5: Secure Secrets

The `staging-secrets.json` file contains sensitive information:

```bash
# Review the secrets
cat .claude/staging-secrets.json

# Delete after configuration is complete
rm .claude/staging-secrets.json

# Alternatively, store in GitHub Secrets:
gh secret set DB_PASSWORD --body "a7f2k9x1j8m3n5p2..."
gh secret set JWT_ACCESS_SECRET --body "3dafa819..."
gh secret set JWT_REFRESH_SECRET --body "c31e5cbd..."
gh secret set REDIS_PASSWORD --body "a85f61c0..."
```

## Pre-Deployment Checklist

Before running the deployment script, verify:

- [ ] Database is provisioned and accessible
- [ ] Redis is provisioned and accessible
- [ ] Domain DNS records are configured
- [ ] SSL/TLS certificate is installed
- [ ] Sentry projects are created
- [ ] Backend .env.staging is fully configured (no placeholders)
- [ ] Web .env.staging is fully configured (no placeholders)
- [ ] All secrets are stored securely
- [ ] Docker daemon is running
- [ ] docker-compose is installed

## Running Deployment

Once configuration is complete:

```bash
# Run the automated deployment script
./.claude/scripts/deploy-staging.sh

# Or run docker-compose manually:
docker-compose -f docker-compose.dev.yml up -d
```

## Monitoring Configuration Progress

The deployment script will:

1. Build Docker images for backend and frontend
2. Start all services (backend, frontend, database, cache)
3. Run database migrations
4. Perform health checks
5. Display service URLs and status

## Troubleshooting

### Database Connection Failed
```bash
# Check environment variables
docker exec moneywise-backend env | grep DB_

# Test connection directly
psql -h staging-db.example.com -U postgres -d moneywise_staging -c "SELECT 1"

# Check logs
docker logs moneywise-postgres
```

### Redis Connection Failed
```bash
# Test Redis connection
redis-cli -h staging-redis-host -a <password> ping

# Check logs
docker logs moneywise-redis
```

### Frontend API Errors
```bash
# Check backend health
curl https://staging-api.moneywise.app/api/health

# Verify CORS_ORIGIN matches frontend domain
docker exec moneywise-backend env | grep CORS_ORIGIN

# Check browser console for errors
# Check Sentry dashboard at https://sentry.io/
```

### Sentry Events Not Appearing
```bash
# Verify DSN in environment variables
docker exec moneywise-backend env | grep SENTRY_DSN
docker exec moneywise-web env | grep SENTRY_DSN

# Check Sentry project settings
# Ensure project is active and accepting events
# Test with: curl -X POST https://<dsn>@ingest.sentry.io/<project-id>/store/
```

## Next Steps

After deployment is complete:

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

## Reference Documents

- **Quick Reference**: `STAGING-QUICK-REFERENCE.md`
- **Full Analysis**: `STAGING-DEPLOYMENT-ANALYSIS.md`
- **Deployment Checklist**: `.claude/staging-deployment-checklist.md`
- **Setup Guide**: `docs/development/setup.md`
- **Architecture Docs**: `docs/architecture/`

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the full analysis document
3. Check Sentry dashboard for error details
4. Review Docker logs: `docker logs <container-name>`
5. Check application logs in Sentry

---

**Status**: Staging deployment ready for configuration
**Last Updated**: 2025-10-27
**Maintained by**: Claude Code
