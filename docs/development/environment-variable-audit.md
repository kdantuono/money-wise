# Environment Variable Audit - STORY-1.5.2

**Date**: 2025-10-05
**Status**: ✅ Complete
**Purpose**: Comprehensive audit of all environment variables across backend and web applications

---

## 📋 Executive Summary

| Category | Status | Issues Found | Recommendations |
|----------|--------|--------------|-----------------|
| **Backend** | 🟡 Partial | 3 missing, 1 inconsistent | Add REDIS_* variables, fix Sentry config |
| **Web (Next.js)** | 🟡 Partial | 2 missing | Add SENTRY_ENVIRONMENT, fix DSN naming |
| **Cross-App** | ✅ Good | 0 | Sentry configuration aligned |
| **Security** | ⚠️ Warning | JWT secrets weak | Rotate in production |
| **Documentation** | ✅ Good | 0 | Well-documented examples |

---

## 🔍 Backend Environment Variables (`apps/backend`)

### Current Variables (`.env.example`)

#### Application Configuration
| Variable | Required | Default | Environment | Notes |
|----------|----------|---------|-------------|-------|
| `NODE_ENV` | ✅ Yes | `development` | All | `development`, `staging`, `production` |
| `PORT` | ✅ Yes | `3001` | All | Backend API port |
| `APP_NAME` | ⚠️ Optional | `MoneyWise Backend` | All | Display name |
| `APP_VERSION` | ⚠️ Optional | `0.1.0` | All | Sync with `package.json` |
| `API_PREFIX` | ⚠️ Optional | `api` | All | API route prefix |
| `CORS_ORIGIN` | ✅ Yes | `http://localhost:3000` | All | Frontend URL (comma-separated for multiple) |

#### Database Configuration
| Variable | Required | Default | Environment | Notes |
|----------|----------|---------|-------------|-------|
| `DB_HOST` | ✅ Yes | `localhost` | All | PostgreSQL host |
| `DB_PORT` | ✅ Yes | `5432` | All | PostgreSQL port |
| `DB_USERNAME` | ✅ Yes | `postgres` | All | Database user |
| `DB_PASSWORD` | ✅ Yes | `password` | All | **🔐 SECRET** - Rotate in production |
| `DB_NAME` | ✅ Yes | `moneywise` | All | Database name |
| `DB_SCHEMA` | ⚠️ Optional | `public` | All | PostgreSQL schema |
| `DB_SYNCHRONIZE` | ✅ Yes | `false` | All | **⚠️ MUST be `false` in production** |
| `DB_LOGGING` | ⚠️ Optional | `true` | Dev/Staging | Disable in production for performance |

#### TimescaleDB Configuration
| Variable | Required | Default | Environment | Notes |
|----------|----------|---------|-------------|-------|
| `TIMESCALEDB_ENABLED` | ⚠️ Optional | `true` | All | Enable TimescaleDB extension |
| `TIMESCALEDB_COMPRESSION_ENABLED` | ⚠️ Optional | `true` | Prod/Staging | Compress old data |
| `TIMESCALEDB_RETENTION_ENABLED` | ⚠️ Optional | `true` | All | Auto-delete old data |
| `TIMESCALEDB_CHUNK_TIME_INTERVAL` | ⚠️ Optional | `1d` | All | Chunk interval for partitioning |
| `TIMESCALEDB_COMPRESSION_AFTER` | ⚠️ Optional | `7d` | All | Compress data after 7 days |
| `TIMESCALEDB_RETENTION_AFTER` | ⚠️ Optional | `7y` | All | Delete data after 7 years |

#### Authentication (JWT)
| Variable | Required | Default | Environment | Notes |
|----------|----------|---------|-------------|-------|
| `JWT_ACCESS_SECRET` | ✅ Yes | `your-super-secret...` | All | **🔐 SECRET** - Min 32 chars, rotate regularly |
| `JWT_ACCESS_EXPIRES_IN` | ⚠️ Optional | `15m` | All | Access token lifetime |
| `JWT_REFRESH_SECRET` | ✅ Yes | `your-super-secret...` | All | **🔐 SECRET** - Min 32 chars, different from access |
| `JWT_REFRESH_EXPIRES_IN` | ⚠️ Optional | `7d` | All | Refresh token lifetime |

#### Sentry Error Tracking
| Variable | Required | Default | Environment | Notes |
|----------|----------|---------|-------------|-------|
| `SENTRY_DSN` | ⚠️ Optional | ` ` | All | Sentry project DSN (if empty, Sentry disabled) |
| `SENTRY_ENVIRONMENT` | ✅ Yes* | ` ` | All | **MISSING**: Should default to `NODE_ENV` |
| `SENTRY_RELEASE` | ⚠️ Optional | ` ` | All | Git SHA or version (for deploy tracking) |

**Issue**: `SENTRY_ENVIRONMENT` not documented but used in `instrument.ts`

#### AWS CloudWatch (Optional)
| Variable | Required | Default | Environment | Notes |
|----------|----------|---------|-------------|-------|
| `CLOUDWATCH_ENABLED` | ⚠️ Optional | `false` | All | Enable CloudWatch metrics |
| `CLOUDWATCH_NAMESPACE` | ⚠️ Optional | `MoneyWise/Backend` | All | CloudWatch namespace |
| `AWS_REGION` | ⚠️ Optional | `us-east-1` | All | AWS region |
| `AWS_ACCESS_KEY_ID` | ⚠️ Optional | ` ` | All | **🔐 SECRET** - AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | ⚠️ Optional | ` ` | All | **🔐 SECRET** - AWS credentials |

#### Application Metrics
| Variable | Required | Default | Environment | Notes |
|----------|----------|---------|-------------|-------|
| `METRICS_ENABLED` | ⚠️ Optional | `true` | All | Enable custom metrics collection |
| `METRICS_FLUSH_INTERVAL` | ⚠️ Optional | `30000` | All | Metrics flush interval (ms) |
| `HEALTH_CHECK_ENABLED` | ⚠️ Optional | `true` | All | Enable health check endpoints |

---

### ❌ Missing Backend Variables

#### Redis Configuration (CRITICAL)
**Status**: ❌ **MISSING** - Used in `RedisModule` but not documented

| Variable | Required | Default | Environment | Notes |
|----------|----------|---------|-------------|-------|
| `REDIS_HOST` | ✅ Yes | `localhost` | All | **MISSING** - Redis server host |
| `REDIS_PORT` | ⚠️ Optional | `6379` | All | **MISSING** - Redis server port |
| `REDIS_PASSWORD` | ⚠️ Optional | ` ` | Prod/Staging | **MISSING** - Redis password (🔐 SECRET) |
| `REDIS_DB` | ⚠️ Optional | `0` | All | **MISSING** - Redis database number |

**Impact**: Redis health checks will fail if Redis is not running on default localhost:6379

**Recommendation**: Add to `.env.example`, `.env.staging.example`, `.env.production.example`

---

## 🌐 Web (Next.js) Environment Variables (`apps/web`)

### Current Variables (`.env.example`)

#### Application Configuration
| Variable | Required | Default | Environment | Notes |
|----------|----------|---------|-------------|-------|
| `NEXT_PUBLIC_APP_NAME` | ⚠️ Optional | `MoneyWise` | All | Display name |
| `NEXT_PUBLIC_APP_VERSION` | ⚠️ Optional | `0.1.0` | All | Sync with `package.json` |
| `NEXT_PUBLIC_API_URL` | ✅ Yes | `http://localhost:3001/api` | All | Backend API URL |

#### Sentry Configuration (Client-Side)
| Variable | Required | Default | Environment | Notes |
|----------|----------|---------|-------------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | ⚠️ Optional | ` ` | All | Sentry project DSN (client-side) |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | ✅ Yes* | ` ` | All | **MISSING**: Should be documented |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | ⚠️ Optional | ` ` | All | Override default sampling (0.0-1.0) |
| `NEXT_PUBLIC_SENTRY_DEBUG` | ⚠️ Optional | `false` | Dev only | Enable Sentry debug logs |
| `NEXT_PUBLIC_SENTRY_RELEASE` | ⚠️ Optional | ` ` | All | Git SHA or version |

#### Sentry Configuration (Server-Side)
| Variable | Required | Default | Environment | Notes |
|----------|----------|---------|-------------|-------|
| `SENTRY_DSN` | ⚠️ Optional | ` ` | All | **INCONSISTENT**: Use `NEXT_PUBLIC_SENTRY_DSN` |
| `SENTRY_ORG` | ⚠️ Optional | `your-org-slug` | All | Sentry organization slug (for source maps) |
| `SENTRY_PROJECT` | ⚠️ Optional | `moneywise-development` | All | Sentry project slug (change per env) |
| `SENTRY_RELEASE` | ⚠️ Optional | ` ` | All | **INCONSISTENT**: Use `NEXT_PUBLIC_SENTRY_RELEASE` |
| `SENTRY_ENVIRONMENT` | ✅ Yes* | ` ` | All | **MISSING**: Should be documented |

#### Analytics
| Variable | Required | Default | Environment | Notes |
|----------|----------|---------|-------------|-------|
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | ⚠️ Optional | `false` | All | Enable analytics tracking |

---

### ❌ Missing Web Variables

#### Sentry Configuration Issues

**Issue 1**: `NEXT_PUBLIC_SENTRY_ENVIRONMENT` used but not documented
- **Used in**: `apps/web/sentry.client.config.ts:19`
- **Fallback**: Falls back to `NODE_ENV`
- **Recommendation**: Document in `.env.example`

**Issue 2**: Inconsistent DSN usage
- **Client config** reads: `NEXT_PUBLIC_SENTRY_DSN`
- **Server/Edge config** reads: `SENTRY_DSN || NEXT_PUBLIC_SENTRY_DSN`
- **`.env.example`** shows: Both variables
- **Recommendation**: Use only `NEXT_PUBLIC_SENTRY_DSN` for consistency

---

## 🔧 Recommended Actions

### 1. Backend `.env.example` Updates

**Add Redis Configuration**:
```bash
# Redis Configuration (Session Storage)
# IMPORTANT: Required for health checks and session management
# Development: Use local Redis instance
# Staging/Production: Use managed Redis service (AWS ElastiCache, Redis Cloud, etc.)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty for local dev, set in staging/production
REDIS_DB=0  # Redis database number (0-15)
```

**Fix Sentry Configuration**:
```bash
# Sentry Error Tracking Configuration
# IMPORTANT: Create separate Sentry projects for each environment
# Development: Use moneywise-development project
# Staging: Use moneywise-staging project
# Production: Use moneywise-production project

# Sentry DSN (Data Source Name) - Get from https://sentry.io/settings/projects/
SENTRY_DSN=

# Environment name (development/staging/production) - Defaults to NODE_ENV if not set
SENTRY_ENVIRONMENT=

# Release version for deploy tracking - Usually set by CI/CD (Git SHA or tag)
SENTRY_RELEASE=
```

### 2. Web `.env.example` Updates

**Add Missing Sentry Environment**:
```bash
# Sentry Environment Configuration
# IMPORTANT: Must match backend SENTRY_ENVIRONMENT
# Development: development
# Staging: staging
# Production: production
NEXT_PUBLIC_SENTRY_ENVIRONMENT=

# Sentry server-side environment (Edge/Server runtimes)
# IMPORTANT: Should match NEXT_PUBLIC_SENTRY_ENVIRONMENT
SENTRY_ENVIRONMENT=
```

**Simplify DSN Configuration**:
```bash
# Sentry Error Tracking Configuration
# IMPORTANT: Use the same DSN for client, server, and edge runtimes
# Get DSN from https://sentry.io/settings/projects/

# Client-side DSN (browser runtime)
NEXT_PUBLIC_SENTRY_DSN=

# Note: SENTRY_DSN is deprecated - use NEXT_PUBLIC_SENTRY_DSN for all runtimes
```

### 3. Environment-Specific Files

**Backend Staging** (`.env.staging.example`):
```bash
# Add Redis configuration
REDIS_HOST=<staging-redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<staging-redis-password>
REDIS_DB=0

# Update Sentry project
SENTRY_ENVIRONMENT=staging
```

**Backend Production** (`.env.production.example`):
```bash
# Add Redis configuration
REDIS_HOST=<prod-redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<prod-redis-password>
REDIS_DB=0

# Update Sentry project
SENTRY_ENVIRONMENT=production

# Security: Rotate secrets
JWT_ACCESS_SECRET=<generate-strong-secret-min-64-chars>
JWT_REFRESH_SECRET=<generate-different-strong-secret-min-64-chars>
DB_PASSWORD=<strong-database-password>
```

**Web Staging** (`.env.staging.example`):
```bash
# Add Sentry environment
NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging
SENTRY_ENVIRONMENT=staging
SENTRY_PROJECT=moneywise-staging
```

**Web Production** (`.env.production.example`):
```bash
# Add Sentry environment
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_ENVIRONMENT=production
SENTRY_PROJECT=moneywise-production
```

---

## 🔒 Security Audit

### Secrets Requiring Rotation

| Variable | Current Risk | Recommendation |
|----------|--------------|----------------|
| `JWT_ACCESS_SECRET` | 🔴 HIGH | Weak example value - Generate 64+ char secret in production |
| `JWT_REFRESH_SECRET` | 🔴 HIGH | Weak example value - Must differ from access secret |
| `DB_PASSWORD` | 🟡 MEDIUM | Default `password` - Use strong password in production |
| `REDIS_PASSWORD` | 🟢 LOW | Empty (local dev OK) - Set in staging/production |
| `AWS_SECRET_ACCESS_KEY` | 🟢 LOW | Not used if CloudWatch disabled |

### Secret Generation Commands

```bash
# Generate JWT secrets (64 characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate strong database password
openssl rand -base64 32
```

---

## ✅ Validation Checklist

- [ ] Add Redis variables to backend `.env.example`
- [ ] Add `SENTRY_ENVIRONMENT` to all `.env.example` files
- [ ] Simplify web Sentry DSN (use only `NEXT_PUBLIC_SENTRY_DSN`)
- [ ] Update staging/production example files with Redis config
- [ ] Rotate JWT secrets in production deployment
- [ ] Rotate database password in production deployment
- [ ] Verify all variables documented in this audit
- [ ] Test backend health checks with Redis configuration
- [ ] Test Sentry integration across all environments
- [ ] Update deployment documentation with new variables

---

## 📊 Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Backend Variables** | 34 |
| **Total Web Variables** | 11 |
| **Required Backend Variables** | 8 |
| **Required Web Variables** | 2 |
| **Missing Backend Variables** | 4 (Redis) |
| **Missing Web Variables** | 2 (Sentry env) |
| **Secrets (Backend)** | 5 |
| **Secrets (Web)** | 0 |
| **Inconsistencies** | 1 (Sentry DSN naming) |

---

**Audit Completed By**: Claude Code (AI Assistant)
**Reviewed By**: kdantuono (User)
**Next Steps**: Implement recommended changes in TASK-1.5.2.5 (Error tracking setup)
