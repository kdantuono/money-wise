# MoneyWise Staging Deployment - Quick Reference Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAGING ENVIRONMENT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │   Frontend   │         │   Backend    │                      │
│  │  Next.js     │────────▶│   NestJS     │                      │
│  │  Nginx       │         │   Node:20    │                      │
│  │  Port: 80    │         │   Port: 3001 │                      │
│  └──────────────┘         └──────────────┘                      │
│       │                           │                              │
│       │                           │                              │
│       └───────────┬───────────────┘                              │
│                   ▼                                               │
│         ┌─────────────────┐                                      │
│         │   PostgreSQL    │                                      │
│         │  TimescaleDB    │                                      │
│         │  Port: 5432     │                                      │
│         └─────────────────┘                                      │
│                   │                                               │
│                   │                                               │
│         ┌─────────────────┐                                      │
│         │     Redis       │                                      │
│         │  Port: 6379     │                                      │
│         └─────────────────┘                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Critical Configuration Parameters

### Backend (.env.staging)
```bash
NODE_ENV=staging
PORT=3001
CORS_ORIGIN=https://staging.moneywise.app

# Database (REQUIRED)
DB_HOST=<staging-db-host>
DB_PORT=5432
DB_NAME=moneywise_staging
DB_USERNAME=postgres
DB_PASSWORD=<SECURE-PASSWORD>

# JWT Secrets (REQUIRED - 32+ chars)
JWT_ACCESS_SECRET=<generate-with-openssl-rand-hex-32>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-hex-32>

# Redis (REQUIRED)
REDIS_HOST=<staging-redis-host>
REDIS_PASSWORD=<SECURE-PASSWORD>

# Error Tracking (REQUIRED)
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project-id>
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=moneywise@<version>

# Banking Integration
SALTEDGE_CLIENT_ID=<production-credentials>
SALTEDGE_SECRET=<production-credentials>
BANKING_INTEGRATION_ENABLED=true
```

### Frontend (.env.staging)
```bash
NEXT_PUBLIC_APP_NAME=MoneyWise
NEXT_PUBLIC_APP_VERSION=0.5.0
NEXT_PUBLIC_API_URL=https://staging-api.moneywise.app/api

# Sentry (REQUIRED)
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project-id>
NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.5

# Features
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_BANKING_ENABLED=true
NEXT_PUBLIC_OAUTH_REDIRECT_BASE=https://staging.moneywise.app
NEXT_PUBLIC_OAUTH_CALLBACK_PATH=/banking/callback
```

## Deployment Commands

### 1. Build Docker Images
```bash
# Backend
docker build -t moneywise-backend:staging apps/backend/

# Frontend
docker build -t moneywise-web:staging apps/web/
```

### 2. Push to Registry (Optional)
```bash
docker push <registry>/moneywise-backend:staging
docker push <registry>/moneywise-web:staging
```

### 3. Deploy Services
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### 4. Initialize Database
```bash
# Run migrations
docker exec moneywise-backend pnpm db:migrate

# Seed data (optional)
docker exec moneywise-backend pnpm db:seed
```

### 5. Verify Health
```bash
# Backend health
curl https://staging-api.moneywise.app/api/health

# Frontend
curl https://staging.moneywise.app

# Database connection
docker exec moneywise-postgres pg_isready -U postgres -d moneywise_staging

# Redis connection
docker exec moneywise-redis redis-cli ping
```

## Infrastructure Checklist

### Cloud Resources Required
- [ ] PostgreSQL 15 with TimescaleDB extension
- [ ] Redis 7+ instance (password-protected)
- [ ] Domain: staging.moneywise.app
- [ ] SSL/TLS certificate (HTTPS)
- [ ] Container registry (Docker Hub, ECR, GitHub)

### Service Credentials Required
- [ ] Sentry: Create projects for backend and frontend
- [ ] Database: Username and strong password
- [ ] Redis: Strong password
- [ ] JWT: Generate with `openssl rand -hex 32`
- [ ] CloudWatch: AWS credentials (optional)
- [ ] SaltEdge: Production API credentials

### Configuration Files
- [ ] Copy `.env.staging.example` to `.env.staging` (root)
- [ ] Copy `apps/backend/.env.staging.example` to `.env.staging`
- [ ] Copy `apps/web/.env.staging.example` to `.env.staging`
- [ ] Replace all `<CHANGE-ME-*>` placeholders
- [ ] Store secrets in secure location (GitHub Secrets, Vault)

## Service Ports & Health Checks

| Service | Container | Port | Health Check |
|---------|-----------|------|--------------|
| Backend | moneywise-backend | 3001 | `GET /api/health` |
| Frontend | moneywise-web | 80 | `GET /` |
| PostgreSQL | moneywise-postgres | 5432 (private) | `pg_isready` |
| Redis | moneywise-redis | 6379 (private) | `PING` |

## Environment Variables by Service

### Backend (15+ variables)
```
NODE_ENV, PORT, CORS_ORIGIN
DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
SENTRY_DSN, SENTRY_ENVIRONMENT
SALTEDGE_* (banking integration)
CLOUDWATCH_* (optional monitoring)
```

### Frontend (10+ variables)
```
NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_APP_VERSION
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_SENTRY_ENVIRONMENT
NEXT_PUBLIC_ANALYTICS_ENABLED
NEXT_PUBLIC_BANKING_ENABLED
NEXT_PUBLIC_OAUTH_REDIRECT_BASE
NEXT_PUBLIC_OAUTH_CALLBACK_PATH
```

## Security Best Practices

### Secrets Management
- Use GitHub Secrets for CI/CD variables
- Use AWS Secrets Manager or HashiCorp Vault for runtime
- Never commit `.env` files with real values
- Rotate secrets every 90 days
- Different secrets for each environment

### Network Security
- Database & Redis: Private (not internet-accessible)
- Backend API: Behind reverse proxy/load balancer
- HTTPS only (HTTP 301 redirect to HTTPS)
- CORS: Configured for staging domain only
- Rate limiting on API endpoints

### Container Security
- Run containers as non-root users (nestjs, nextjs)
- Alpine base images (minimal attack surface)
- Multi-stage builds (reduced image size)
- Health checks on all services
- Resource limits (CPU, memory)

## Monitoring & Troubleshooting

### Health Endpoints
```bash
# Backend health
curl -i https://staging-api.moneywise.app/api/health

# Response should be:
# HTTP/1.1 200 OK
# {"status":"ok","uptime":1234.56}
```

### Common Issues

**Database Connection Failed**
```bash
# Check environment variables
docker exec moneywise-backend env | grep DB_

# Test connection directly
docker exec moneywise-postgres pg_isready -U postgres -d moneywise_staging -h localhost

# Check logs
docker logs moneywise-postgres
```

**Frontend API Errors**
```bash
# Check backend health
curl https://staging-api.moneywise.app/api/health

# Verify CORS_ORIGIN matches frontend domain
docker exec moneywise-backend env | grep CORS_ORIGIN

# Check browser console for errors
# Check Sentry dashboard for detailed errors
```

**Redis Connection Failed**
```bash
# Test Redis connection
docker exec moneywise-redis redis-cli ping

# Check password in environment
docker exec moneywise-backend env | grep REDIS_PASSWORD

# View Redis logs
docker logs moneywise-redis
```

## Rollback Procedure

```bash
# 1. Stop current services
docker-compose -f docker-compose.dev.yml down

# 2. Switch to previous image version
docker tag moneywise-backend:staging-old moneywise-backend:staging

# 3. Restart services
docker-compose -f docker-compose.dev.yml up -d

# 4. Verify health endpoints
curl https://staging-api.moneywise.app/api/health
```

## Performance Monitoring

### Key Metrics to Monitor
- Backend response time (target: < 200ms)
- Database query performance
- Redis cache hit ratio (target: > 80%)
- Frontend Largest Contentful Paint (LCP < 2.5s)
- Error rate (target: < 0.1%)

### Sentry Alerts
- Exceptions: Alert on any new exception types
- Error rate: Alert if > 5% of transactions
- Performance: Alert if response time > 5 seconds
- Release health: Monitor each deployment

### CloudWatch Alarms
- CPU utilization > 80%
- Memory utilization > 85%
- Database connections > 80
- Redis memory > 80%
- Error rate in logs

## Useful Docker Commands

```bash
# View all containers
docker ps -a

# View logs for specific service
docker logs moneywise-backend -f
docker logs moneywise-postgres -f
docker logs moneywise-redis -f

# Execute commands in container
docker exec moneywise-backend pnpm db:migrate
docker exec moneywise-backend pnpm db:seed

# View environment variables
docker exec moneywise-backend env | grep SENTRY

# Access database directly
docker exec -it moneywise-postgres psql -U postgres -d moneywise_staging

# Access Redis CLI
docker exec -it moneywise-redis redis-cli

# Check container stats
docker stats

# Rebuild and restart specific service
docker-compose -f docker-compose.dev.yml up -d --build moneywise-backend
```

## Database Migrations

```bash
# View current schema
docker exec moneywise-postgres psql -U postgres -d moneywise_staging -c "\dt"

# Run pending migrations
docker exec moneywise-backend pnpm db:migrate

# Create new migration (if needed)
docker exec moneywise-backend pnpm db:generate "migration_name"

# Rollback last migration (WARNING: destructive)
docker exec moneywise-backend pnpm db:migrate:reset
```

## Support & Documentation

- Full Analysis: `/home/nemesi/dev/money-wise/STAGING-DEPLOYMENT-ANALYSIS.md`
- Setup Guide: `/home/nemesi/dev/money-wise/docs/development/setup.md`
- Architecture: `/home/nemesi/dev/money-wise/docs/architecture/`
- API Docs: `/home/nemesi/dev/money-wise/docs/api/`

## Version Info

- Project: MoneyWise v0.5.0
- Node.js: 20.x (Alpine)
- PostgreSQL: 15 (with TimescaleDB)
- Redis: 7 (Alpine)
- NestJS: 10.0.0
- Next.js: 15.4.7
- pnpm: 8.15.1+

---

**Last Updated**: October 27, 2025
**Status**: Staging Deployment Ready
**Estimated Setup Time**: 2-4 hours (with infrastructure pre-provisioned)
