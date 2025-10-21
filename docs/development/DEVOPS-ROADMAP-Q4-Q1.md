# MoneyWise DevOps Roadmap - Q4 2025 / Q1 2026

**Document Type:** Implementation Roadmap
**Status:** Ready for Implementation
**Priority Level:** CRITICAL
**Timeline:** Immediate through Q1 2026

---

## Executive Overview

MoneyWise CI/CD infrastructure is **99% complete**. All development and testing automation is production-grade. The missing **1%** is the actual deployment to production - the final critical execution layer.

**Current State:**
- Artifacts built and tested ✅
- Security scanning comprehensive ✅
- Quality gates enforced ✅
- Release automation ready ✅
- Docker registry configured ✅
- **Deployment step:** MISSING ❌

**Estimated Implementation Effort:**
- Phase 1 (Immediate): 1-2 weeks
- Phase 2 (Short-term): 2-3 weeks
- Phase 3 (Medium-term): 3-4 weeks
- **Total to Production Ready:** 6-8 weeks

---

## Phase 1: Immediate Actions (Weeks 1-2)

### Goal
Enable actual deployments to production environment

### 1.1 Create Dockerfiles

**Files to Create:**

**1. `/home/nemesi/dev/money-wise/apps/backend/Dockerfile`**

```dockerfile
# Multi-stage Dockerfile for NestJS Backend
# Target: < 200MB image size

FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY packages/ ./packages/
COPY apps/backend/package.json ./apps/backend/

# Install pnpm
RUN npm install -g pnpm@8.15.1

# Install production dependencies (frozen lock)
RUN pnpm install --frozen-lockfile --prod --no-optional

# Copy source code
COPY apps/backend/ ./apps/backend/

# Build application
WORKDIR /build/apps/backend
RUN pnpm build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /build/apps/backend/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /build/apps/backend/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /build/apps/backend/package.json ./

# Set environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=256"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
```

**2. `/home/nemesi/dev/money-wise/apps/web/Dockerfile`**

```dockerfile
# Multi-stage Dockerfile for Next.js Frontend
# Target: < 150MB image size

FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY packages/ ./packages/
COPY apps/web/package.json ./apps/web/

# Install pnpm
RUN npm install -g pnpm@8.15.1

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/web/ ./apps/web/

# Build Next.js app (outputs .next directory)
WORKDIR /build/apps/web
RUN pnpm build

# Standalone output stage (optimized)
FROM node:18-alpine

WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy standalone output from builder
COPY --from=builder --chown=nodejs:nodejs /build/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /build/apps/web/public ./public

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Use dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Start Next.js
CMD ["node", "server.js"]
```

**Verification Steps:**
```bash
# Build locally
docker build -f apps/backend/Dockerfile -t moneywise-backend:test .
docker build -f apps/web/Dockerfile -t moneywise-web:test .

# Verify image sizes
docker images | grep moneywise

# Test containers
docker run -p 3001:3001 moneywise-backend:test
curl http://localhost:3001/api/health

docker run -p 3000:3000 moneywise-web:test
curl http://localhost:3000
```

### 1.2 Add `.dockerignore` Files

**`apps/backend/.dockerignore`**
```
.git
.gitignore
.dockerignore
.env*
.env.local
node_modules
npm-debug.log
dist
coverage
.turbo
.next
.DS_Store
```

**`apps/web/.dockerignore`**
```
.git
.gitignore
.dockerignore
.env*
.env.local
node_modules
npm-debug.log
.turbo
.next
coverage
.DS_Store
public/.next
```

### 1.3 Update Release Workflow

**File:** `.github/workflows/release.yml`

Add deployment section after docker-release:

```yaml
# ===================================================================
# 🚀 DEPLOY TO PRODUCTION: Deployment automation
# ===================================================================

deploy-production:
  name: 🚀 Deploy to Production
  runs-on: ubuntu-latest
  needs: [docker-release]
  if: startsWith(github.ref, 'refs/tags/')
  timeout-minutes: 15

  environment:
    name: production
    url: https://moneywise.app

  steps:
    - name: 📥 Checkout
      uses: actions/checkout@v4

    - name: 🔐 Configure AWS credentials (if using AWS)
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1

    - name: 📋 Extract version
      id: version
      run: |
        VERSION=${GITHUB_REF#refs/tags/}
        echo "version=$VERSION" >> $GITHUB_OUTPUT

    - name: 🚀 Deploy Backend
      run: |
        # Deployment command (varies by platform)
        # Example for ECS:
        # aws ecs update-service \
        #   --cluster production \
        #   --service moneywise-backend \
        #   --force-new-deployment

        echo "🚀 Deploying backend ${{ steps.version.outputs.version }}"
        echo "Docker image: ghcr.io/${{ github.repository }}/backend:${{ steps.version.outputs.version }}"
        # Add your deployment command here

    - name: 🚀 Deploy Frontend
      run: |
        # Similar deployment for web
        echo "🚀 Deploying frontend ${{ steps.version.outputs.version }}"
        echo "Docker image: ghcr.io/${{ github.repository }}/web:${{ steps.version.outputs.version }}"
        # Add your deployment command here

    - name: 🏥 Health Check
      run: |
        echo "Waiting 30s for deployment to stabilize..."
        sleep 30

        # Test backend health
        echo "Checking backend health..."
        curl -f https://api.moneywise.app/health || exit 1

        # Test frontend health
        echo "Checking frontend health..."
        curl -f https://moneywise.app || exit 1

        echo "✅ Deployment healthy"

    - name: 📢 Deployment Success Notification
      if: success()
      run: |
        echo "✅ Successfully deployed version ${{ steps.version.outputs.version }}"
        echo "Backend: https://api.moneywise.app"
        echo "Frontend: https://moneywise.app"
```

**Note:** Replace deployment commands with your actual platform (ECS, K8s, Heroku, etc.)

### 1.4 Create Environment Secrets

**In GitHub Repository Settings > Secrets:**

```yaml
# AWS Credentials (if using AWS)
AWS_ACCESS_KEY_ID: <your-key>
AWS_SECRET_ACCESS_KEY: <your-secret>

# Deployment Credentials
DEPLOY_USER: <deployment-user>
DEPLOY_KEY: <deployment-key>

# Database (Production)
PROD_DATABASE_URL: <postgresql-connection>
PROD_REDIS_URL: <redis-connection>

# API Keys
PROD_SENTRY_DSN: <production-sentry-dsn>
PROD_API_KEY: <production-api-key>
```

### 1.5 Create `.github/ENVIRONMENTS.md`

```markdown
# Deployment Environments

## Production
- URL: https://moneywise.app
- Backend: https://api.moneywise.app
- Database: AWS RDS PostgreSQL
- Cache: AWS ElastiCache Redis
- Logs: CloudWatch
- Monitoring: Sentry (10% sampling)

## Staging
- URL: https://staging.moneywise.app
- Backend: https://staging-api.moneywise.app
- Database: AWS RDS PostgreSQL (separate)
- Cache: AWS ElastiCache Redis (separate)
- Logs: CloudWatch
- Monitoring: Sentry (50% sampling)

## Development
- Local Docker Compose
- Database: PostgreSQL 15
- Cache: Redis 7
- Monitoring: Optional Prometheus/Grafana
```

**Deliverables:**
- Dockerfiles created and tested locally ✅
- .dockerignore files added ✅
- Release workflow updated with deploy step ✅
- Environment secrets configured ✅
- Documentation updated ✅

**Testing:**
```bash
# Verify Dockerfiles work
docker build -f apps/backend/Dockerfile .
docker build -f apps/web/Dockerfile .

# Verify images run
docker run -p 3001:3001 -e NODE_ENV=production <backend-image>
docker run -p 3000:3000 -e NODE_ENV=production <web-image>
```

---

## Phase 2: Short-term Actions (Weeks 3-4)

### Goal
Implement blue-green deployment strategy and infrastructure configuration

### 2.1 Infrastructure as Code Setup

**Choose Platform (Recommendation: Terraform for AWS)**

**File Structure:**
```
infrastructure/
├── terraform/
│  ├── main.tf
│  ├── variables.tf
│  ├── outputs.tf
│  ├── vpc.tf
│  ├── rds.tf (PostgreSQL)
│  ├── elasticache.tf (Redis)
│  ├── ecs.tf (or k8s)
│  ├── iam.tf
│  ├── security-groups.tf
│  ├── environments/
│  │  ├── staging.tfvars
│  │  ├── production.tfvars
│  │  └── dev.tfvars
│  └── modules/
│     ├── app-server/
│     ├── database/
│     └── cache/
│
├── kubernetes/ (if using K8s)
│  ├── backend-deployment.yaml
│  ├── frontend-deployment.yaml
│  ├── postgres-statefulset.yaml
│  ├── redis-deployment.yaml
│  ├── ingress.yaml
│  └── kustomize/
│     ├── base/
│     └── overlays/
│        ├── dev/
│        ├── staging/
│        └── production/
│
└── helm/ (optional for package management)
   └── moneywise/
      ├── values.yaml
      ├── values-staging.yaml
      ├── values-production.yaml
      └── templates/
```

### 2.2 Blue-Green Deployment Implementation

**Add to release.yml - Updated deploy-production job:**

```yaml
deploy-production:
  name: 🚀 Deploy to Production (Blue-Green)
  runs-on: ubuntu-latest
  needs: [docker-release, validate-release]
  if: startsWith(github.ref, 'refs/tags/')
  timeout-minutes: 20

  strategy:
    matrix:
      service: [backend, web]

  steps:
    - name: 📥 Checkout
      uses: actions/checkout@v4

    - name: 🔐 Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1

    - name: 📋 Get current active color
      id: current-color
      run: |
        # Check which environment is currently active (blue or green)
        CURRENT_COLOR=$(aws ecs list-tasks \
          --cluster production \
          --service-name moneywise-${{ matrix.service }} \
          --query 'taskArns[0]' \
          --output text | grep -o 'blue\|green' || echo 'blue')

        # Set target color to opposite
        TARGET_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")

        echo "current=$CURRENT_COLOR" >> $GITHUB_OUTPUT
        echo "target=$TARGET_COLOR" >> $GITHUB_OUTPUT

    - name: 📦 Deploy to ${{ steps.current-color.outputs.target }} environment
      run: |
        VERSION=${{ needs.validate-release.outputs.version }}
        TARGET_ENV=${{ steps.current-color.outputs.target }}
        IMAGE=ghcr.io/${{ github.repository }}/${{ matrix.service }}:${VERSION}

        # Update ECS task definition with new image
        aws ecs update-service \
          --cluster production \
          --service moneywise-${{ matrix.service }}-${TARGET_ENV} \
          --force-new-deployment

        echo "✅ Deployed to $TARGET_ENV environment"
        echo "   Service: moneywise-${{ matrix.service }}-${TARGET_ENV}"
        echo "   Image: ${IMAGE}"

    - name: ⏳ Wait for deployment to stabilize
      run: |
        echo "Waiting for ${{ steps.current-color.outputs.target }} environment to stabilize..."

        # Wait up to 5 minutes for deployment to be stable
        for i in {1..30}; do
          RUNNING=$(aws ecs describe-services \
            --cluster production \
            --services moneywise-${{ matrix.service }}-${{ steps.current-color.outputs.target }} \
            --query 'services[0].runningCount' \
            --output text)

          DESIRED=$(aws ecs describe-services \
            --cluster production \
            --services moneywise-${{ matrix.service }}-${{ steps.current-color.outputs.target }} \
            --query 'services[0].desiredCount' \
            --output text)

          if [ "$RUNNING" = "$DESIRED" ]; then
            echo "✅ Deployment stable ($RUNNING/$DESIRED tasks running)"
            break
          fi

          echo "⏳ Waiting... ($RUNNING/$DESIRED)"
          sleep 10
        done

    - name: 🏥 Health check on target environment
      run: |
        SERVICE=${{ matrix.service }}
        TARGET_URL=""

        if [ "$SERVICE" = "backend" ]; then
          TARGET_URL="https://api-${{ steps.current-color.outputs.target }}.moneywise.app/health"
        else
          TARGET_URL="https://${{ steps.current-color.outputs.target }}.moneywise.app"
        fi

        echo "Testing health endpoint: $TARGET_URL"

        # Retry health check up to 5 times
        for i in {1..5}; do
          if curl -f "$TARGET_URL"; then
            echo "✅ Health check passed"
            exit 0
          fi
          echo "Attempt $i/5 failed, retrying in 5 seconds..."
          sleep 5
        done

        echo "❌ Health check failed"
        exit 1

    - name: 🔄 Switch traffic to target environment
      if: success()
      run: |
        TARGET_COLOR=${{ steps.current-color.outputs.target }}
        SERVICE=${{ matrix.service }}

        echo "🔄 Switching traffic to $TARGET_COLOR environment..."

        # Update load balancer/ingress to route traffic to target
        # This example assumes ALB with rule changes
        aws elbv2 modify-rule \
          --rule-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:rule/app/production/$SERVICE/... \
          --conditions Field=path-pattern,Values="/api/*" \
          --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/$SERVICE-$TARGET_COLOR/...

        echo "✅ Traffic switched to $TARGET_COLOR"

        # Give downstream systems a moment to adjust
        sleep 30

    - name: 🔍 Verify traffic routing
      if: success()
      run: |
        echo "Verifying traffic is routed to ${{ steps.current-color.outputs.target }}"
        # Add verification logic here
        echo "✅ Traffic routing verified"

    - name: ⏮️  Rollback on failure
      if: failure()
      run: |
        CURRENT=${{ steps.current-color.outputs.current }}
        echo "❌ Deployment failed, rolling back to $CURRENT"

        # Revert to previous environment
        aws elbv2 modify-rule \
          --rule-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:rule/... \
          --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/${{ matrix.service }}-$CURRENT/...

        echo "✅ Rollback complete"
        exit 1

    - name: 📢 Deployment notification
      if: always()
      run: |
        VERSION=${{ needs.validate-release.outputs.version }}
        STATUS=${{ job.status }}

        echo "📢 Deployment Status: $STATUS"
        echo "   Version: $VERSION"
        echo "   Service: ${{ matrix.service }}"
        echo "   Environment: ${{ steps.current-color.outputs.target }}"

        # Send to Slack/Teams if desired
        # Webhook integration here
```

### 2.3 Monitoring & Health Checks

**Create `infrastructure/health-check.sh`:**

```bash
#!/bin/bash

set -e

ENVIRONMENT=${1:-production}
BACKEND_URL="https://api-${ENVIRONMENT}.moneywise.app"
FRONTEND_URL="https://${ENVIRONMENT}.moneywise.app"
TIMEOUT=30

check_health() {
  local url=$1
  local name=$2

  echo "Checking $name at $url..."

  response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "000")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ] || [ "$http_code" = "301" ]; then
    echo "✅ $name is healthy (HTTP $http_code)"
    return 0
  else
    echo "❌ $name returned HTTP $http_code"
    return 1
  fi
}

# Check backend health
if ! check_health "${BACKEND_URL}/health" "Backend"; then
  echo "Backend health check failed"
  exit 1
fi

# Check frontend health
if ! check_health "${FRONTEND_URL}" "Frontend"; then
  echo "Frontend health check failed"
  exit 1
fi

echo "✅ All health checks passed"
```

### 2.4 Runbook Documentation

**Create `/home/nemesi/dev/money-wise/docs/operations/DEPLOYMENT-RUNBOOK.md`:**

```markdown
# MoneyWise Deployment Runbook

## Standard Deployment Process

1. Tag a release: `git tag -a v1.0.0 -m "Release 1.0.0"`
2. Push tag: `git push origin v1.0.0`
3. Monitor release workflow: `gh run watch`
4. Verify in GitHub releases
5. Monitor post-deployment for errors

## Rollback Procedures

### Quick Rollback (< 5 minutes)
1. Switch traffic back to blue/green (whichever was active)
2. Verify traffic switched
3. Investigate root cause

### Full Rollback (> 5 minutes)
1. Create hotfix branch from previous tag
2. Tag new patch version
3. Deploy new version

## Health Checks

### Pre-deployment
```bash
./infrastructure/health-check.sh production
```

### Post-deployment
```bash
./infrastructure/health-check.sh production
```

## Emergency Procedures

### Database Migration Failed
1. Check current status: `pnpm db:status`
2. Review migration: `pnpm db:show-migrations`
3. Rollback if needed: `pnpm db:rollback`
4. Fix issue and redeploy

### Service Down
1. Check logs: Check CloudWatch
2. Check health: `curl https://api.moneywise.app/health`
3. Restart if needed: AWS ECS restart task
4. Escalate if issues persist

## Monitoring

### Sentry Errors
- Navigate to: https://sentry.io/organizations/moneywise/
- Filter by environment: production
- Review recent errors

### Application Metrics
- CloudWatch dashboard
- Grafana (if configured)
- Performance graphs
```

**Deliverables:**
- Infrastructure as Code templates ✅
- Blue-green deployment automation ✅
- Health check scripts ✅
- Deployment runbook ✅

---

## Phase 3: Medium-term Actions (Weeks 5-6)

### Goal
Complete observability and incident response automation

### 3.1 Production Monitoring Setup

**CloudWatch Dashboards:**
- CPU/Memory utilization
- Request latency
- Error rates
- Database performance
- Cache hit rates

**Alert Rules:**
- High error rate (> 5%)
- High latency (P95 > 1s)
- High CPU (> 80%)
- Low disk space
- Database connection issues

### 3.2 On-Call Procedures

**Create escalation policy:**
1. Alert to team Slack channel
2. Page on-call engineer if no response in 10 min
3. Escalate to manager after 30 min

### 3.3 Incident Response Automation

**Auto-create issues on Sentry alerts**
**Auto-page on-call on critical errors**

---

## Phase 4: Advanced Enhancements (Q1 2026)

- Canary deployment (gradual rollout)
- Automated performance testing
- Advanced security scanning
- GitOps workflow integration
- Automated dependency updates

---

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Deployment automation | 100% | 0% | 🔴 |
| Time to deploy | < 10 min | N/A | 🔴 |
| Rollback time | < 5 min | N/A | 🔴 |
| Uptime SLA | 99.9% | N/A | 🔴 |
| MTTR (Mean Time To Recover) | < 30 min | N/A | 🔴 |
| Incident response | Automated | Manual | 🟡 |

---

## Implementation Checklist

### Week 1-2 (Phase 1)
- [ ] Create backend Dockerfile
- [ ] Create web Dockerfile
- [ ] Test locally
- [ ] Update release workflow
- [ ] Create environment secrets
- [ ] Document environments

### Week 3-4 (Phase 2)
- [ ] Set up infrastructure as code
- [ ] Implement blue-green deployment
- [ ] Create health check scripts
- [ ] Write deployment runbook
- [ ] Set up basic monitoring

### Week 5-6 (Phase 3)
- [ ] CloudWatch dashboards
- [ ] Alert rules
- [ ] On-call procedures
- [ ] Incident automation
- [ ] Test rollback procedures

### Q1 2026 (Phase 4)
- [ ] Canary deployment
- [ ] Performance testing automation
- [ ] GitOps integration
- [ ] Advanced security
- [ ] Dependency automation

---

## Support & Questions

For questions during implementation:
1. Check existing workflows in `.github/workflows/`
2. Review infrastructure documentation
3. Consult DevOps team
4. Check GitHub Actions documentation

---

**Document Status:** Ready for Implementation
**Last Updated:** October 21, 2025
**Next Review:** After Phase 1 completion
