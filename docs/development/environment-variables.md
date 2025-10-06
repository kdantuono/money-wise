# Environment Variables Documentation

**Last Updated**: 2025-10-06
**Story**: [STORY-1.5.4] Configuration Management (#105)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Security Guidelines](#security-guidelines)
3. [Backend Variables](#backend-variables)
4. [Frontend Variables](#frontend-variables)
5. [Mobile Variables](#mobile-variables)
6. [Environment-Specific Configuration](#environment-specific-configuration)
7. [Quick Start](#quick-start)

---

## Overview

This document provides comprehensive documentation for all environment variables used across the MoneyWise application. Each variable includes:
- **Purpose**: What the variable controls
- **Required**: Whether it's mandatory
- **Default**: Default value if not set
- **Format**: Expected value format
- **Security**: Security considerations
- **Environments**: Which environments need it

---

## Security Guidelines

### 🔴 Critical Security Rules

1. **NEVER commit real secrets** to version control
2. **Use different secrets** for each environment
3. **Generate strong secrets** using cryptographic tools
4. **Store production secrets** in a secure secrets manager (AWS Secrets Manager, Vault, etc.)
5. **Rotate secrets regularly** (at least quarterly)
6. **Audit secret access** and monitor for unauthorized usage

### Secret Generation

```bash
# Generate JWT secrets (64 character hex)
openssl rand -hex 32

# Generate API keys (32 character base64)
openssl rand -base64 32
```

---

## Backend Variables

### Application Configuration

#### `NODE_ENV`
- **Purpose**: Application environment mode
- **Required**: Yes
- **Format**: `development | staging | production | test`
- **Default**: `development`
- **Environments**: All
- **Security**: Not sensitive
- **Notes**: Controls feature flags, logging level, error verbosity

#### `PORT`
- **Purpose**: HTTP server port
- **Required**: No
- **Format**: Number (1024-65535)
- **Default**: `3001`
- **Environments**: All
- **Security**: Not sensitive
- **Notes**: Backend API server port

#### `APP_NAME`
- **Purpose**: Application display name
- **Required**: No
- **Format**: String
- **Default**: `MoneyWise Backend`
- **Environments**: All
- **Security**: Not sensitive

#### `APP_VERSION`
- **Purpose**: Application version for tracking
- **Required**: No
- **Format**: Semantic version (e.g., `0.4.7`)
- **Default**: From `package.json`
- **Environments**: All
- **Security**: Not sensitive
- **Notes**: Used for release tracking in Sentry

#### `API_PREFIX`
- **Purpose**: Global API route prefix
- **Required**: No
- **Format**: String (no leading/trailing slashes)
- **Default**: `api`
- **Environments**: All
- **Security**: Not sensitive
- **Example**: Routes become `/api/auth/login`

#### `CORS_ORIGIN`
- **Purpose**: Allowed frontend origin for CORS
- **Required**: No
- **Format**: URL with protocol (e.g., `http://localhost:3000`)
- **Default**: `http://localhost:3000`
- **Environments**: All
- **Security**: Moderate - prevents unauthorized domain access
- **Production Example**: `https://app.moneywise.com`

---

### Database Configuration

#### `DB_HOST`
- **Purpose**: PostgreSQL/TimescaleDB host
- **Required**: Yes
- **Format**: Hostname or IP address
- **Default**: `localhost`
- **Environments**: All
- **Security**: Moderate - database endpoint

#### `DB_PORT`
- **Purpose**: Database port
- **Required**: Yes
- **Format**: Number
- **Default**: `5432`
- **Environments**: All
- **Security**: Not sensitive

#### `DB_USERNAME`
- **Purpose**: Database connection username
- **Required**: Yes
- **Format**: String
- **Default**: `postgres`
- **Environments**: All
- **Security**: 🔴 **High** - use strong usernames in production

#### `DB_PASSWORD`
- **Purpose**: Database connection password
- **Required**: Yes
- **Format**: String
- **Default**: `password` (development only)
- **Environments**: All
- **Security**: 🔴 **Critical** - use strong passwords, rotate regularly

#### `DB_NAME`
- **Purpose**: Database name
- **Required**: Yes
- **Format**: String
- **Default**: `moneywise`
- **Environments**: All
- **Security**: Not sensitive

#### `DB_SCHEMA`
- **Purpose**: PostgreSQL schema name
- **Required**: No
- **Format**: String
- **Default**: `public`
- **Environments**: All
- **Security**: Not sensitive

#### `DB_SYNCHRONIZE`
- **Purpose**: Auto-sync TypeORM entities to database schema
- **Required**: No
- **Format**: Boolean (`true | false`)
- **Default**: `false`
- **Environments**: Development only
- **Security**: 🔴 **Critical** - MUST be `false` in production
- **Warning**: Setting to `true` in production will DROP and RECREATE tables on schema changes, causing DATA LOSS

#### `DB_LOGGING`
- **Purpose**: Enable SQL query logging
- **Required**: No
- **Format**: Boolean (`true | false`)
- **Default**: `true` (development), `false` (production)
- **Environments**: All
- **Security**: Low - may log sensitive data

---

### TimescaleDB Configuration

#### `TIMESCALEDB_ENABLED`
- **Purpose**: Enable TimescaleDB-specific features
- **Required**: No
- **Format**: Boolean
- **Default**: `true`
- **Environments**: All
- **Security**: Not sensitive

#### `TIMESCALEDB_COMPRESSION_ENABLED`
- **Purpose**: Enable automatic data compression
- **Required**: No
- **Format**: Boolean
- **Default**: `true`
- **Environments**: Production, Staging
- **Security**: Not sensitive

#### `TIMESCALEDB_RETENTION_ENABLED`
- **Purpose**: Enable automatic data retention policies
- **Required**: No
- **Format**: Boolean
- **Default**: `true`
- **Environments**: Production, Staging
- **Security**: Not sensitive

#### `TIMESCALEDB_CHUNK_TIME_INTERVAL`
- **Purpose**: Time interval for data chunks
- **Required**: No
- **Format**: Duration (e.g., `1d`, `7d`, `1h`)
- **Default**: `1d`
- **Environments**: All
- **Security**: Not sensitive

#### `TIMESCALEDB_COMPRESSION_AFTER`
- **Purpose**: Compress data older than this interval
- **Required**: No
- **Format**: Duration (e.g., `7d`, `30d`)
- **Default**: `7d`
- **Environments**: Production, Staging
- **Security**: Not sensitive

#### `TIMESCALEDB_RETENTION_AFTER`
- **Purpose**: Delete data older than this interval
- **Required**: No
- **Format**: Duration (e.g., `7y`, `10y`)
- **Default**: `7y`
- **Environments**: Production, Staging
- **Security**: Moderate - affects data retention compliance

---

### Redis Configuration

#### `REDIS_HOST`
- **Purpose**: Redis server host
- **Required**: Yes
- **Format**: Hostname or IP address
- **Default**: `localhost`
- **Environments**: All
- **Security**: Moderate - cache/session store endpoint

#### `REDIS_PORT`
- **Purpose**: Redis server port
- **Required**: Yes
- **Format**: Number
- **Default**: `6379`
- **Environments**: All
- **Security**: Not sensitive

#### `REDIS_PASSWORD`
- **Purpose**: Redis authentication password
- **Required**: No (local dev), Yes (staging/production)
- **Format**: String
- **Default**: Empty (local dev)
- **Environments**: All
- **Security**: 🔴 **High** - use strong passwords in production

#### `REDIS_DB`
- **Purpose**: Redis database number (0-15)
- **Required**: No
- **Format**: Number (0-15)
- **Default**: `0`
- **Environments**: All
- **Security**: Not sensitive

---

### JWT Authentication

#### `JWT_ACCESS_SECRET`
- **Purpose**: Secret key for signing access tokens
- **Required**: Yes
- **Format**: 64-character hex string
- **Default**: None - MUST be set
- **Environments**: All
- **Security**: 🔴 **Critical** - protect at all costs
- **Generation**: `openssl rand -hex 32`
- **Notes**: Use different secrets for each environment, rotate quarterly

#### `JWT_REFRESH_SECRET`
- **Purpose**: Secret key for signing refresh tokens
- **Required**: Yes
- **Format**: 64-character hex string (MUST be different from ACCESS_SECRET)
- **Default**: None - MUST be set
- **Environments**: All
- **Security**: 🔴 **Critical** - protect at all costs
- **Generation**: `openssl rand -hex 32`

#### `JWT_ACCESS_EXPIRES_IN`
- **Purpose**: Access token lifetime
- **Required**: No
- **Format**: Time string (e.g., `15m`, `1h`, `2d`)
- **Default**: `15m`
- **Environments**: All
- **Security**: Moderate - shorter = more secure, longer = better UX
- **Recommendations**: Dev: 15m, Staging: 15m, Production: 5m-15m

#### `JWT_REFRESH_EXPIRES_IN`
- **Purpose**: Refresh token lifetime
- **Required**: No
- **Format**: Time string (e.g., `7d`, `30d`)
- **Default**: `7d`
- **Environments**: All
- **Security**: Moderate
- **Recommendations**: Dev: 7d, Staging: 7d, Production: 7d-14d

---

### Sentry Error Tracking

#### `SENTRY_DSN`
- **Purpose**: Sentry Data Source Name (backend project)
- **Required**: No (strongly recommended for staging/production)
- **Format**: `https://<key>@o<org>.ingest.sentry.io/<project-id>`
- **Default**: Empty (disabled)
- **Environments**: All (separate projects per environment)
- **Security**: Low - DSN can be public, but keep separate per environment
- **Get From**: Sentry.io → Settings → Projects → {project} → Client Keys
- **Example**: `https://4dd53c1f@o123.ingest.de.sentry.io/4510133210775632`

#### `SENTRY_ENVIRONMENT`
- **Purpose**: Environment name for Sentry events
- **Required**: If SENTRY_DSN is set
- **Format**: `development | staging | production`
- **Default**: Matches `NODE_ENV`
- **Environments**: All
- **Security**: Not sensitive
- **Notes**: Must match frontend `NEXT_PUBLIC_SENTRY_ENVIRONMENT`

#### `SENTRY_RELEASE`
- **Purpose**: Release version for Sentry tracking
- **Required**: No (recommended for production)
- **Format**: String (e.g., `moneywise@0.4.7`, `moneywise@abc123`)
- **Default**: Empty
- **Environments**: All
- **Security**: Not sensitive
- **Recommendations**:
  - Development: `dev-local`
  - Staging: `moneywise@$(git rev-parse --short HEAD)`
  - Production: `moneywise@{version}` (match package.json)

---

### CloudWatch Monitoring

#### `CLOUDWATCH_ENABLED`
- **Purpose**: Enable AWS CloudWatch metrics
- **Required**: No
- **Format**: Boolean
- **Default**: `false`
- **Environments**: Production, Staging (AWS deployments only)
- **Security**: Not sensitive

#### `CLOUDWATCH_NAMESPACE`
- **Purpose**: CloudWatch metrics namespace
- **Required**: If CLOUDWATCH_ENABLED is true
- **Format**: String (e.g., `MoneyWise/Backend`)
- **Default**: `MoneyWise/Backend`
- **Environments**: Production, Staging
- **Security**: Not sensitive

#### `AWS_REGION`
- **Purpose**: AWS region for CloudWatch
- **Required**: If CLOUDWATCH_ENABLED is true
- **Format**: AWS region code (e.g., `us-east-1`, `eu-west-1`)
- **Default**: `us-east-1`
- **Environments**: Production, Staging
- **Security**: Not sensitive

#### `AWS_ACCESS_KEY_ID`
- **Purpose**: AWS IAM access key for CloudWatch
- **Required**: If CLOUDWATCH_ENABLED is true
- **Format**: AWS access key ID
- **Default**: None
- **Environments**: Production, Staging
- **Security**: 🔴 **Critical** - use IAM roles when possible, otherwise use least-privilege keys

#### `AWS_SECRET_ACCESS_KEY`
- **Purpose**: AWS IAM secret key for CloudWatch
- **Required**: If CLOUDWATCH_ENABLED is true
- **Format**: AWS secret access key
- **Default**: None
- **Environments**: Production, Staging
- **Security**: 🔴 **Critical** - use IAM roles when possible

---

### Development Features

#### `SWAGGER_ENABLED`
- **Purpose**: Enable Swagger API documentation at `/api/docs`
- **Required**: No
- **Format**: Boolean
- **Default**: `true` (development), `false` (production)
- **Environments**: All
- **Security**: Moderate - may expose API structure
- **Notes**: Should be disabled in production

#### `LOG_LEVEL`
- **Purpose**: Logging verbosity
- **Required**: No
- **Format**: `debug | info | warn | error`
- **Default**: `debug` (development), `info` (production)
- **Environments**: All
- **Security**: Low - verbose logs may contain sensitive data

#### `ENABLE_METRICS`
- **Purpose**: Enable Prometheus metrics endpoint at `/metrics`
- **Required**: No
- **Format**: Boolean
- **Default**: `true`
- **Environments**: All
- **Security**: Moderate - may expose system info

#### `METRICS_ENABLED`
- **Purpose**: Enable internal metrics collection
- **Required**: No
- **Format**: Boolean
- **Default**: `true`
- **Environments**: All
- **Security**: Not sensitive

#### `METRICS_FLUSH_INTERVAL`
- **Purpose**: Metrics flush interval (milliseconds)
- **Required**: No
- **Format**: Number
- **Default**: `30000` (30 seconds)
- **Environments**: All
- **Security**: Not sensitive

#### `HEALTH_CHECK_ENABLED`
- **Purpose**: Enable health check endpoints
- **Required**: No
- **Format**: Boolean
- **Default**: `true`
- **Environments**: All
- **Security**: Not sensitive

---

## Frontend Variables

### Application Configuration

#### `NEXT_PUBLIC_APP_NAME`
- **Purpose**: Application display name (publicly visible)
- **Required**: No
- **Format**: String
- **Default**: `MoneyWise`
- **Environments**: All
- **Security**: Not sensitive
- **Notes**: Exposed to browser, appears in UI

#### `NEXT_PUBLIC_APP_VERSION`
- **Purpose**: Application version (publicly visible)
- **Required**: No
- **Format**: Semantic version
- **Default**: From `package.json`
- **Environments**: All
- **Security**: Not sensitive

#### `NEXT_PUBLIC_API_URL`
- **Purpose**: Backend API base URL
- **Required**: Yes
- **Format**: Full URL with protocol and path (e.g., `http://localhost:3001/api`)
- **Default**: `http://localhost:3001/api`
- **Environments**: All
- **Security**: Not sensitive
- **Production Example**: `https://api.moneywise.com/api`

---

### Sentry Configuration (Frontend)

#### `NEXT_PUBLIC_SENTRY_DSN`
- **Purpose**: Sentry DSN for frontend (client-side, browser)
- **Required**: No (recommended for production)
- **Format**: `https://<key>@o<org>.ingest.sentry.io/<frontend-project-id>`
- **Default**: Empty
- **Environments**: All (separate projects per environment)
- **Security**: Not sensitive - public DSN safe to expose
- **Notes**: Use separate frontend Sentry project from backend

#### `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
- **Purpose**: Environment name for frontend Sentry events
- **Required**: If NEXT_PUBLIC_SENTRY_DSN is set
- **Format**: `development | staging | production`
- **Default**: Matches `NODE_ENV`
- **Environments**: All
- **Security**: Not sensitive
- **Notes**: Must match backend `SENTRY_ENVIRONMENT`

#### `SENTRY_ORG`
- **Purpose**: Sentry organization slug (for source map upload)
- **Required**: If using Sentry
- **Format**: String (organization slug from Sentry)
- **Default**: None
- **Environments**: All
- **Security**: Not sensitive
- **Example**: `your-org-slug`

#### `SENTRY_PROJECT`
- **Purpose**: Sentry project slug (for source map upload)
- **Required**: If using Sentry
- **Format**: String (project slug from Sentry)
- **Default**: None
- **Environments**: All (change per environment)
- **Security**: Not sensitive
- **Examples**: `moneywise-development`, `moneywise-staging`, `moneywise-production`

#### `SENTRY_RELEASE`
- **Purpose**: Release version for server-side Sentry
- **Required**: No
- **Format**: String
- **Default**: Empty
- **Environments**: All
- **Security**: Not sensitive
- **Notes**: Should match `NEXT_PUBLIC_SENTRY_RELEASE`

#### `NEXT_PUBLIC_SENTRY_RELEASE`
- **Purpose**: Release version for client-side Sentry
- **Required**: No
- **Format**: String (same as SENTRY_RELEASE)
- **Default**: Empty
- **Environments**: All
- **Security**: Not sensitive

#### `SENTRY_ENVIRONMENT`
- **Purpose**: Environment for server/edge runtime Sentry
- **Required**: If using Sentry
- **Format**: `development | staging | production`
- **Default**: Matches `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
- **Environments**: All
- **Security**: Not sensitive

#### `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`
- **Purpose**: Override default performance sampling rate
- **Required**: No
- **Format**: Number (0.0 to 1.0)
- **Default**: 1.0 (development), 0.5 (staging), 0.1 (production)
- **Environments**: All
- **Security**: Not sensitive
- **Notes**: Higher rate = more quota usage but better performance visibility

#### `NEXT_PUBLIC_SENTRY_DEBUG`
- **Purpose**: Enable Sentry debug logging in browser console
- **Required**: No
- **Format**: Boolean
- **Default**: `false`
- **Environments**: Development only
- **Security**: Not sensitive
- **Notes**: Should be `false` in production

---

### Analytics Configuration

#### `NEXT_PUBLIC_ANALYTICS_ENABLED`
- **Purpose**: Enable frontend analytics tracking
- **Required**: No
- **Format**: Boolean
- **Default**: `false`
- **Environments**: All
- **Security**: Moderate - may track user behavior
- **Notes**: Future implementation for STORY-1.6.1

---

## Mobile Variables

### Application Configuration

#### `EXPO_PUBLIC_APP_NAME`
- **Purpose**: React Native app display name
- **Required**: No
- **Format**: String
- **Default**: `MoneyWise`
- **Environments**: All
- **Security**: Not sensitive

#### `EXPO_PUBLIC_API_URL`
- **Purpose**: Backend API base URL for mobile app
- **Required**: Yes
- **Format**: Full URL (e.g., `http://localhost:3001/api`)
- **Default**: `http://localhost:3001/api`
- **Environments**: All
- **Security**: Not sensitive
- **Production Example**: `https://api.moneywise.com/api`

---

## Environment-Specific Configuration

### Development

**Focus**: Developer experience, debugging, rapid iteration

```bash
# Backend
NODE_ENV=development
DB_SYNCHRONIZE=false  # Manual migrations only
DB_LOGGING=true
SWAGGER_ENABLED=true
LOG_LEVEL=debug
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=dev-local

# Frontend
NEXT_PUBLIC_SENTRY_DEBUG=false
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=1.0  # 100% sampling
```

### Staging

**Focus**: Production-like testing, validation, QA

```bash
# Backend
NODE_ENV=staging
DB_SYNCHRONIZE=false
DB_LOGGING=false
SWAGGER_ENABLED=false
LOG_LEVEL=info
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=moneywise@$(git rev-parse --short HEAD)
TIMESCALEDB_COMPRESSION_ENABLED=true
TIMESCALEDB_RETENTION_ENABLED=true

# Frontend
NEXT_PUBLIC_SENTRY_DEBUG=false
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.5  # 50% sampling
NEXT_PUBLIC_API_URL=https://api-staging.moneywise.com/api
```

### Production

**Focus**: Performance, security, reliability

```bash
# Backend
NODE_ENV=production
DB_SYNCHRONIZE=false  # CRITICAL: Never enable in production
DB_LOGGING=false
SWAGGER_ENABLED=false
LOG_LEVEL=info
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=moneywise@0.4.7  # Match package.json
TIMESCALEDB_COMPRESSION_ENABLED=true
TIMESCALEDB_RETENTION_ENABLED=true
CLOUDWATCH_ENABLED=true
JWT_ACCESS_EXPIRES_IN=5m  # Shorter expiration for security

# Frontend
NEXT_PUBLIC_SENTRY_DEBUG=false
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% sampling
NEXT_PUBLIC_API_URL=https://api.moneywise.com/api
```

---

## Quick Start

### 1. Development Setup

```bash
# Root directory
cp .env.example .env

# Backend
cp apps/backend/.env.example apps/backend/.env

# Frontend
cp apps/web/.env.example apps/web/.env
cp apps/web/.env.example apps/web/.env.local  # For local overrides

# Mobile
cp apps/mobile/.env.example apps/mobile/.env
```

### 2. Generate Secrets

```bash
# Generate JWT secrets
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)" >> .env
```

### 3. Configure Sentry (Optional but Recommended)

1. Create Sentry account at https://sentry.io
2. Create separate projects:
   - `moneywise-backend-development`
   - `moneywise-frontend-development`
3. Copy DSNs to `.env` files
4. Set `SENTRY_ORG` and `SENTRY_PROJECT` in `apps/web/.env`

### 4. Verify Configuration

```bash
# Start services
docker compose -f docker-compose.dev.yml up -d

# Start backend (will validate all env vars on startup)
pnpm --filter @money-wise/backend run dev

# Start frontend
pnpm --filter @money-wise/web run dev
```

### 5. Test Backend Health

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"...","database":"connected","redis":"connected"}
```

---

## Troubleshooting

### "Configuration validation failed"

**Cause**: Missing or invalid required environment variables

**Solution**:
1. Check error message for specific variable
2. Verify `.env` file exists and has correct values
3. Ensure no extra spaces or quotes around values
4. Restart application after changes

### "Database connection failed"

**Cause**: Database not running or wrong credentials

**Solution**:
```bash
# Check Docker services
docker compose -f docker-compose.dev.yml ps

# Restart database
docker compose -f docker-compose.dev.yml restart db

# Check logs
docker compose -f docker-compose.dev.yml logs db
```

### "Redis connection failed"

**Cause**: Redis not running

**Solution**:
```bash
# Check Redis status
docker compose -f docker-compose.dev.yml ps redis

# Restart Redis
docker compose -f docker-compose.dev.yml restart redis
```

### "CORS error" in browser

**Cause**: Frontend URL not in `CORS_ORIGIN`

**Solution**:
- Verify `CORS_ORIGIN` in backend `.env` matches your frontend URL exactly
- Include protocol (`http://` or `https://`)
- Restart backend after changes

---

## References

- **Sentry Documentation**: `docs/development/sentry-integration-completion-report.md`
- **Sentry Testing Guide**: `docs/development/sentry-testing-guide.md`
- **Setup Guide**: `docs/development/setup.md`
- **Architecture**: `.claude/knowledge/architecture.md`

---

**Generated**: 2025-10-06
**Author**: Claude Code
**Branch**: feature/story-1.5.4-complete
**Story**: STORY-1.5.4 (#105)
