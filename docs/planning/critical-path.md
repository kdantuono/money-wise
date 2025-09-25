# MoneyWise MVP - Critical Path Document

## Executive Summary
This document identifies the **blocking tasks** that must be completed in sequence to deliver the MVP. Each task listed here blocks subsequent work and cannot be parallelized. Non-critical tasks can be worked on by other agents in parallel.

**Total Critical Path Duration**: 8 weeks
**Critical Tasks**: 47 (out of ~800 total)
**Agents Required**: Minimum 1, Optimal 4-5

---

## Week 1: Foundation Layer
*These tasks block everything - no other work can begin until complete*

### Day 1-2: Repository & Environment
```yaml
[CRITICAL-001] Initialize Git Repository
Branch: setup/git-init
Agent: Claude-Infra
Duration: 2 hours
Blocks: ALL subsequent work
Command: |
  git init
  git flow init
  Create .gitignore, README.md
  Setup monorepo structure

[CRITICAL-002] Docker Environment Setup
Branch: setup/docker-compose  
Agent: Claude-Infra
Duration: 4 hours
Blocks: All development work
Dependencies: CRITICAL-001
Files:
  - docker-compose.yml
  - apps/backend/Dockerfile
  - apps/web/Dockerfile
```

### Day 3-4: Database Foundation
```yaml
[CRITICAL-003] Database Schema Design
Branch: database/schema
Agent: Claude-Backend
Duration: 6 hours
Blocks: All data-related features
Dependencies: CRITICAL-002
Critical Tables:
  - users (auth blocker)
  - accounts (plaid blocker)
  - transactions (core feature)
  - categories (categorization blocker)

[CRITICAL-004] Initial Database Migration
Branch: database/migration
Agent: Claude-Backend  
Duration: 2 hours
Blocks: All backend development
Dependencies: CRITICAL-003
Command: |
  alembic init
  alembic revision --autogenerate
  alembic upgrade head
```

### Day 5: CI/CD Pipeline
```yaml
[CRITICAL-005] GitHub Actions Setup
Branch: cicd/setup
Agent: Claude-Infra
Duration: 3 hours
Blocks: Automated testing & deployment
Files:
  - .github/workflows/backend-ci.yml
  - .github/workflows/frontend-ci.yml
Note: Can be refined later, but basic CI blocks team productivity
```

---

## Week 2: Authentication Core
*Auth blocks all user-specific features*

### Day 6-7: JWT Implementation
```yaml
[CRITICAL-006] JWT Token System
Branch: auth/jwt
Agent: Claude-Backend
Duration: 8 hours
Blocks: ALL authenticated endpoints
Dependencies: CRITICAL-003
Key Files:
  - app/core/security/token.py
  - app/core/security/password.py
  - app/services/auth.py
```

### Day 8-9: Auth Endpoints
```yaml
[CRITICAL-007] Register/Login Endpoints
Branch: auth/endpoints
Agent: Claude-Backend
Duration: 6 hours
Blocks: User onboarding
Dependencies: CRITICAL-006
Endpoints:
  - POST /auth/register
  - POST /auth/login
  - POST /auth/refresh
  
[CRITICAL-008] Current User Dependency
Branch: auth/current-user
Agent: Claude-Backend
Duration: 3 hours
Blocks: ALL protected routes
Dependencies: CRITICAL-007
File: app/api/deps/auth.py
```

### Day 10: Frontend Auth
```yaml
[CRITICAL-009] Auth Store & Protected Routes
Branch: auth/frontend
Agent: Claude-Frontend
Duration: 6 hours
Blocks: Entire frontend app
Dependencies: CRITICAL-007
Key Components:
  - store/auth.ts
  - components/ProtectedRoute.tsx
  - services/auth.ts
```

---

## Week 3: Plaid Integration Core
*Plaid is the main value prop - blocks automated banking*

### Day 11-12: Plaid Setup
```yaml
[CRITICAL-010] Plaid Client Configuration
Branch: plaid/setup
Agent: Claude-Banking
Duration: 4 hours
Blocks: All Plaid features
Dependencies: CRITICAL-008
Files:
  - app/core/config/plaid.py
  - app/services/plaid/client.py

[CRITICAL-011] Link Token Generation
Branch: plaid/link-token
Agent: Claude-Banking
Duration: 4 hours
Blocks: Bank connection flow
Dependencies: CRITICAL-010
Endpoint: POST /plaid/link/token
```

### Day 13-14: Token Exchange
```yaml
[CRITICAL-012] Public Token Exchange
Branch: plaid/exchange
Agent: Claude-Banking
Duration: 6 hours
Blocks: Account access
Dependencies: CRITICAL-011
Critical Logic:
  - Exchange public → access token
  - Encrypt & store token
  - Trigger initial sync
```

### Day 15: Account Sync
```yaml
[CRITICAL-013] Account Synchronization
Branch: plaid/accounts
Agent: Claude-Banking
Duration: 6 hours
Blocks: Transaction sync
Dependencies: CRITICAL-012
Features:
  - Fetch accounts from Plaid
  - Store in database
  - Update balances
```

---

## Week 4: Transaction Core
*Transactions are the core data model*

### Day 16-17: Transaction Service
```yaml
[CRITICAL-014] Transaction CRUD Service
Branch: transactions/service
Agent: Claude-Backend
Duration: 8 hours
Blocks: All transaction features
Dependencies: CRITICAL-013
Key Methods:
  - create_transaction()
  - get_transactions()
  - update_balance()
```

### Day 18: Transaction Sync
```yaml
[CRITICAL-015] Plaid Transaction Sync
Branch: plaid/transactions
Agent: Claude-Banking
Duration: 8 hours
Blocks: Automated data import
Dependencies: CRITICAL-014
Critical Features:
  - Fetch from Plaid
  - Deduplicate
  - Bulk insert
  - Balance reconciliation
```

### Day 19-20: Categorization
```yaml
[CRITICAL-016] Rule-Based Categorization
Branch: categorization/rules
Agent: Claude-Backend
Duration: 6 hours
Blocks: Spending insights
Dependencies: CRITICAL-014
Files:
  - app/services/categorization/rules.py
  - app/core/categorization_rules.py
Note: ML can wait, but basic categorization is critical
```

---

## Week 5: Dashboard Core
*Dashboard is the primary user interface*

### Day 21-22: Analytics Backend
```yaml
[CRITICAL-017] Analytics Service
Branch: analytics/service
Agent: Claude-Backend
Duration: 8 hours
Blocks: All dashboard widgets
Dependencies: CRITICAL-016
Key Calculations:
  - Cash flow
  - Category breakdown
  - Spending trends
  - Budget status

[CRITICAL-018] Dashboard API Endpoint
Branch: analytics/endpoint
Agent: Claude-Backend
Duration: 4 hours
Blocks: Dashboard frontend
Dependencies: CRITICAL-017
Endpoint: GET /dashboard/overview
```

### Day 23-25: Dashboard UI
```yaml
[CRITICAL-019] Dashboard Container
Branch: dashboard/container
Agent: Claude-Frontend
Duration: 6 hours
Blocks: User experience
Dependencies: CRITICAL-018
Component: features/dashboard/Dashboard.tsx

[CRITICAL-020] Core Charts
Branch: dashboard/charts
Agent: Claude-Frontend
Duration: 8 hours
Blocks: Data visualization
Dependencies: CRITICAL-019
Components:
  - CashFlowChart.tsx
  - CategoryPieChart.tsx
  - BudgetProgress.tsx
```

---

## Week 6: Essential Polish
*Performance issues block user adoption*

### Day 26-27: Backend Optimization
```yaml
[CRITICAL-021] Query Optimization
Branch: perf/queries
Agent: Claude-Backend
Duration: 8 hours
Blocks: Scalability
Dependencies: CRITICAL-020
Focus:
  - Add missing indexes
  - Fix N+1 queries
  - Implement caching
```

### Day 28-29: Frontend Optimization
```yaml
[CRITICAL-022] Code Splitting
Branch: perf/splitting
Agent: Claude-Frontend
Duration: 6 hours
Blocks: Load time
Dependencies: CRITICAL-020
Changes:
  - Route-based splitting
  - Lazy component loading
  - Bundle optimization
```

### Day 30: E2E Testing
```yaml
[CRITICAL-023] Critical Path E2E Test
Branch: testing/e2e-critical
Agent: Claude-Frontend
Duration: 6 hours
Blocks: Production confidence
Dependencies: CRITICAL-022
Test Flow:
  1. Register
  2. Connect bank (sandbox)
  3. View dashboard
  4. Add transaction
  5. Set budget
```

---

## Week 7: Production Infrastructure
*Can't launch without infrastructure*

### Day 31-32: AWS Foundation
```yaml
[CRITICAL-024] Terraform Base Setup
Branch: deploy/terraform
Agent: Claude-Infra
Duration: 8 hours
Blocks: All AWS resources
Files:
  - infrastructure/terraform/main.tf
  - infrastructure/terraform/variables.tf

[CRITICAL-025] VPC and Networking
Branch: deploy/networking
Agent: Claude-Infra
Duration: 6 hours
Blocks: All services
Dependencies: CRITICAL-024
```

### Day 33-34: Core Services
```yaml
[CRITICAL-026] RDS PostgreSQL
Branch: deploy/database
Agent: Claude-Infra
Duration: 6 hours
Blocks: Backend deployment
Dependencies: CRITICAL-025

[CRITICAL-027] ECS Cluster & Services
Branch: deploy/ecs
Agent: Claude-Infra
Duration: 8 hours
Blocks: Application deployment
Dependencies: CRITICAL-026
```

### Day 35: Load Balancer
```yaml
[CRITICAL-028] ALB Configuration
Branch: deploy/alb
Agent: Claude-Infra
Duration: 6 hours
Blocks: Public access
Dependencies: CRITICAL-027
```

---

## Week 8: Launch Preparation
*Final blockers before go-live*

### Day 36-37: Monitoring
```yaml
[CRITICAL-029] CloudWatch & Alarms
Branch: monitoring/setup
Agent: Claude-Infra
Duration: 6 hours
Blocks: Production visibility
Dependencies: CRITICAL-028

[CRITICAL-030] Sentry Integration
Branch: monitoring/sentry
Agent: Claude-Backend
Duration: 3 hours
Blocks: Error tracking
Dependencies: CRITICAL-029
```

### Day 38-39: Security
```yaml
[CRITICAL-031] Security Audit
Branch: security/audit
Agent: Claude-Security
Duration: 8 hours
Blocks: Production launch
Dependencies: CRITICAL-030
Checklist:
  - OWASP Top 10
  - Secrets management
  - HTTPS/TLS setup
  - WAF configuration
```

### Day 40: Production Deployment
```yaml
[CRITICAL-032] Production Deploy
Branch: main
Agent: @me (Human)
Duration: 4 hours
Blocks: User access
Dependencies: ALL ABOVE
Steps:
  1. Database migration
  2. Backend deployment
  3. Frontend deployment
  4. DNS switch
  5. Smoke tests
```

---

## Parallelization Opportunities

While one agent works on critical path, others can work on:

**Week 1-2**: 
- Documentation (Copilot)
- Test fixtures (Copilot)
- UI components without data (Claude-Frontend)

**Week 3-4**:
- Manual transaction entry (Claude-Backend)
- Category management UI (Claude-Frontend)
- Import/Export features (Claude-Data)

**Week 5-6**:
- Budget features (Claude-Backend)
- Settings pages (Claude-Frontend)
- Performance tests (Copilot)

**Week 7-8**:
- Monitoring dashboards (Claude-Infra)
- API documentation (Copilot)
- User guides (Copilot)

---

## Risk Mitigation

### Highest Risk Tasks
1. **Plaid Integration** - May have unexpected API issues
   - Mitigation: Start with sandbox early, have manual entry backup

2. **Performance at Scale** - May not handle load
   - Mitigation: Load test early, implement caching aggressively

3. **Security Vulnerabilities** - Handling financial data
   - Mitigation: Security review after each major feature

### Contingency Plans
- If Plaid delays: Launch with manual entry only
- If performance issues: Reduce dashboard complexity
- If security concerns: Delay launch for fixes

---

## Success Criteria

MVP is ready when:
- [ ] User can register and login
- [ ] User can connect bank account (or add manual)
- [ ] Transactions sync and categorize
- [ ] Dashboard shows spending insights
- [ ] Basic budgets can be set
- [ ] System handles 100 concurrent users
- [ ] Error rate <1%
- [ ] Page load <2 seconds

---

## Notes for Claude Code

When executing this critical path:
1. **Always complete critical tasks in order** - they block everything
2. **Check dependencies** before starting any task
3. **Test immediately** after each critical task
4. **Commit after each task** with clear message
5. **Alert human** if any critical task fails

Use command:
```bash
git checkout -b [branch-name]
# Complete task
git add .
git commit -m "[CRITICAL-XXX] Description"
git push origin [branch-name]
```

---

## Quick Start Guide

### Day 1 - Start NOW with:
```bash
# CRITICAL-001: Initialize repository
mkdir moneywise && cd moneywise
git init
git flow init
echo "# MoneyWise" > README.md
mkdir -p apps/{backend,web} packages infrastructure docs
```

### Day 2 - Docker setup:
```bash
# CRITICAL-002: Docker environment
# Create docker-compose.yml with PostgreSQL, Redis, Backend, Frontend
docker-compose up -d
```

### Day 3 - Database:
```bash
# CRITICAL-003 & 004: Database schema
cd apps/backend
alembic init alembic
# Create models
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

---

*This critical path represents approximately 6% of total tasks but blocks 100% of the project. Focus here first.*