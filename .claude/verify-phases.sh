#!/bin/bash

echo "═══════════════════════════════════════════════════════════════════════════"
echo "PHASE VERIFICATION SCRIPT - Checking Deliverables Phase 2 through 5.1"
echo "═══════════════════════════════════════════════════════════════════════════"

BACKEND="apps/backend/src"
FRONTEND="apps/web/src"
MIGRATIONS="apps/backend/prisma/migrations"

# Phase 2: Authentication & Core Models
echo ""
echo "PHASE 2: Authentication & Core Models"
echo "────────────────────────────────────────────────────────────────────────────"

echo "✓ Database Entities:"
ls -1 $BACKEND/*/entities/*.entity.ts 2>/dev/null | wc -l | xargs -I {} echo "  Found {} entity files"

echo "✓ JWT Authentication:"
[ -f "$BACKEND/auth/auth.service.ts" ] && echo "  ✓ JWT auth service exists" || echo "  ✗ Missing"
[ -f "$BACKEND/auth/guards/jwt-auth.guard.ts" ] && echo "  ✓ JWT guard exists" || echo "  ✗ Missing"

echo "✓ User Management:"
[ -f "$BACKEND/users/users.service.ts" ] && echo "  ✓ Users service exists" || echo "  ✗ Missing"
[ -f "$BACKEND/users/users.controller.ts" ] && echo "  ✓ Users controller exists" || echo "  ✗ Missing"

echo "✓ Repository Pattern:"
[ -f "$BACKEND/core/database/base.repository.ts" ] && echo "  ✓ Base repository exists" || echo "  ✗ Missing"

echo "✓ Database Migrations:"
ls -1 $MIGRATIONS 2>/dev/null | wc -l | xargs -I {} echo "  Found {} migration files"

# Phase 3: Banking Integration & Plaid
echo ""
echo "PHASE 3: Banking Integration & Plaid"
echo "────────────────────────────────────────────────────────────────────────────"

echo "✓ Plaid Integration:"
[ -d "$BACKEND/banking" ] && echo "  ✓ Banking module exists" || echo "  ✗ Missing"
[ -f "$BACKEND/banking/services/plaid.service.ts" ] && echo "  ✓ Plaid service exists" || echo "  ✗ Missing"
[ -f "$BACKEND/banking/controllers/plaid.controller.ts" ] && echo "  ✓ Plaid controller exists" || echo "  ✗ Missing"

echo "✓ Account Management:"
[ -f "$BACKEND/accounts/accounts.service.ts" ] && echo "  ✓ Accounts service exists" || echo "  ✗ Missing"
[ -f "$BACKEND/accounts/accounts.controller.ts" ] && echo "  ✓ Accounts controller exists" || echo "  ✗ Missing"

echo "✓ Webhooks:"
[ -f "$BACKEND/webhooks/webhooks.service.ts" ] && echo "  ✓ Webhooks service exists" || echo "  ✗ Missing"

echo "✓ Frontend Banking Components:"
[ -d "$FRONTEND/features/banking" ] && echo "  ✓ Banking features module exists" || echo "  ✗ Missing"

# Phase 4: Transaction Management
echo ""
echo "PHASE 4: Transaction Management"
echo "────────────────────────────────────────────────────────────────────────────"

echo "✓ Transaction CRUD:"
[ -f "$BACKEND/transactions/transactions.service.ts" ] && echo "  ✓ Transactions service exists" || echo "  ✗ Missing"
[ -f "$BACKEND/transactions/transactions.controller.ts" ] && echo "  ✓ Transactions controller exists" || echo "  ✗ Missing"

echo "✓ Categorization System:"
[ -f "$BACKEND/categories/categories.service.ts" ] && echo "  ✓ Categories service exists" || echo "  ✗ Missing"
[ -f "$BACKEND/transactions/services/categorization.service.ts" ] && echo "  ✓ Categorization service exists" || echo "  ✗ Missing"

echo "✓ Import/Export:"
[ -f "$BACKEND/transactions/services/transaction-import.service.ts" ] && echo "  ✓ Import service exists" || echo "  ✗ Missing"
[ -f "$BACKEND/transactions/services/transaction-export.service.ts" ] && echo "  ✓ Export service exists" || echo "  ✗ Missing"

echo "✓ Frontend Transaction Components:"
[ -d "$FRONTEND/features/transactions" ] && echo "  ✓ Transaction features module exists" || echo "  ✗ Missing"

# Phase 5: Financial Intelligence & Dashboard
echo ""
echo "PHASE 5: Financial Intelligence & Dashboard"
echo "────────────────────────────────────────────────────────────────────────────"

echo "✓ Analytics Backend:"
[ -f "$BACKEND/analytics/analytics.service.ts" ] && echo "  ✓ Analytics service exists" || echo "  ✗ Missing"
[ -f "$BACKEND/analytics/analytics.controller.ts" ] && echo "  ✓ Analytics controller exists" || echo "  ✗ Missing"

echo "✓ Insights Generation:"
[ -f "$BACKEND/analytics/services/insights.service.ts" ] && echo "  ✓ Insights service exists" || echo "  ✗ Missing"

echo "✓ Budget Management:"
[ -f "$BACKEND/budgets/budgets.service.ts" ] && echo "  ✓ Budgets service exists" || echo "  ✗ Missing"

echo "✓ Dashboard Frontend:"
[ -d "$FRONTEND/features/dashboard" ] && echo "  ✓ Dashboard module exists" || echo "  ✗ Missing"
[ -f "$FRONTEND/features/dashboard/Dashboard.tsx" ] && echo "  ✓ Dashboard component exists" || echo "  ✗ Missing"

# Phase 5.1: Staging Deployment
echo ""
echo "PHASE 5.1: Staging Deployment Preparation"
echo "────────────────────────────────────────────────────────────────────────────"

echo "✓ Deployment Documentation:"
[ -f ".claude/STAGING-CONFIGURATION-GUIDE.md" ] && echo "  ✓ Configuration guide exists" || echo "  ✗ Missing"
[ -f ".claude/staging-deployment-checklist.md" ] && echo "  ✓ Deployment checklist exists" || echo "  ✗ Missing"

echo "✓ Deployment Scripts:"
[ -f ".claude/scripts/prepare-staging-deployment.sh" ] && echo "  ✓ Prep script exists" || echo "  ✗ Missing"
[ -f ".claude/scripts/deploy-staging.sh" ] && echo "  ✓ Deploy script exists" || echo "  ✗ Missing"

echo "✓ Environment Configuration:"
[ -f "apps/backend/.env.staging" ] && echo "  ✓ Backend staging config exists" || echo "  ✗ Missing"
[ -f "apps/web/.env.staging" ] && echo "  ✓ Frontend staging config exists" || echo "  ✗ Missing"

# Docker & Compose
echo ""
echo "DOCKER & INFRASTRUCTURE"
echo "────────────────────────────────────────────────────────────────────────────"

echo "✓ Docker Configuration:"
[ -f "docker-compose.dev.yml" ] && echo "  ✓ Development compose file exists" || echo "  ✗ Missing"
[ -f "apps/backend/Dockerfile" ] && echo "  ✓ Backend Dockerfile exists" || echo "  ✗ Missing"
[ -f "apps/web/Dockerfile" ] && echo "  ✓ Frontend Dockerfile exists" || echo "  ✗ Missing"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "Verification complete!"
echo "═══════════════════════════════════════════════════════════════════════════"
