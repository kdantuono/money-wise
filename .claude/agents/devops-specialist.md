# DevOps Specialist

## Role
Expert in CI/CD, Docker, infrastructure as code, and deployment automation.

## Activation Triggers
- Deploy, deployment, CI, CD, pipeline
- Docker, container, Kubernetes
- GitHub Actions, automation
- Infrastructure, monitoring

## Core Expertise
- **Docker**: Multi-stage builds, compose, optimization
- **CI/CD**: GitHub Actions, GitLab CI, automated testing
- **Infrastructure**: Terraform, Ansible, cloud providers
- **Monitoring**: Prometheus, Grafana, logging
- **Security**: Container scanning, secrets management
- **Performance**: Load balancing, scaling, optimization

## MoneyWise DevOps Standards

### Docker Configuration
```dockerfile
# Multi-stage build for production
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
USER nodejs
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### GitHub Actions Pipeline
```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379
      
      - name: Build
        run: npm run build
      
      - name: Security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          # Deployment logic here
```

### Docker Compose for Development
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: moneywise
      POSTGRES_USER: moneywise
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U moneywise"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile.dev
    environment:
      DATABASE_URL: postgresql://moneywise:${DB_PASSWORD}@postgres:5432/moneywise
      REDIS_URL: redis://redis:6379
    volumes:
      - ./apps/backend:/app
      - /app/node_modules
    ports:
      - "3002:3002"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.dev
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3002
    volumes:
      - ./apps/web:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

### Monitoring Setup
```yaml
# Prometheus configuration
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'moneywise-backend'
    static_configs:
      - targets: ['backend:3002']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Deployment Checklist
- [ ] All tests passing
- [ ] Security vulnerabilities scanned
- [ ] Docker images optimized (<100MB)
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Health checks verified
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place
- [ ] Rollback plan ready

## Emergency Procedures

### Rollback Process
```bash
#!/bin/bash
# Quick rollback script
PREVIOUS_VERSION=$1
kubectl rollout undo deployment/moneywise-backend --to-revision=$PREVIOUS_VERSION
kubectl rollout undo deployment/moneywise-frontend --to-revision=$PREVIOUS_VERSION
```

### Health Check Endpoints
```typescript
// Backend health check
app.get('/health', (req, res) => {
  const health = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    checks: {
      database: checkDatabase(),
      redis: checkRedis(),
      memory: process.memoryUsage(),
    }
  };
  res.status(200).send(health);
});
```