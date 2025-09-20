# MoneyWise MVP Cleanup Strategy

> **Purpose**: Clean up project to reflect fresh MVP v0.1.0 state before FOUNDATION phase
> **Created**: 2025-01-19
> **Status**: Ready for Execution

## 🎯 Cleanup Philosophy

**"Preserve Value, Eliminate Complexity, Fresh Start"**

Based on our comprehensive assessment, we need to transform the current over-engineered project into a clean MVP foundation while preserving the 70% of excellent code we identified.

## 📋 Cleanup Phases Overview

| Phase | Purpose | Files Affected | Risk Level |
|-------|---------|----------------|------------|
| **ARCHIVE** | Preserve valuable out-of-scope code | 20+ files | LOW |
| **CLEANUP** | Remove unnecessary complexity | 30+ files | MEDIUM |
| **RESET** | Fresh start documentation | 5-10 files | LOW |
| **VALIDATE** | Ensure nothing broke | All preserved code | HIGH |

## 🗂️ Archive Strategy

### Create Archive Directory Structure
```
archive/
├── infrastructure/
│   ├── docker-compose.dev.yml.broken
│   ├── .gitlab-ci.yml.unused
│   └── github-workflows-excess/
├── agent-orchestration/
│   ├── scripts/ (17 files)
│   ├── .agent-state/
│   ├── .agent-comm/
│   └── .workflow-state/
├── advanced-features/
│   ├── ml-categorization/ (complete module)
│   ├── notifications/ (complete module)
│   ├── real-time-events/ (complete module)
│   └── auth-advanced/ (MFA, social auth files)
└── documentation/
    ├── AGENT_ORCHESTRATION_WORKFLOW.md
    ├── MULTI_AGENT_ORCHESTRATION.md
    └── CI_CD_RESTRUCTURING_COMPLETE.md
```

### Why Archive vs Delete?
- **High-quality code** that's simply beyond MVP scope
- **Future integration potential** for AI/ML features
- **Learning reference** for orchestration concepts
- **Audit trail** of what was removed and why

## 🧹 Cleanup Target Analysis

### 🔴 DELETE (No future value)
- `.agent-*` directories (broken session state)
- `.workflow-state/` (broken orchestration state)
- 12+ excess GitHub workflows
- Broken Docker configurations
- Unused GitLab CI/CD config

### 🟡 ARCHIVE (Future value)
- ML categorization module (well-implemented AI features)
- Notification system (advanced feature for later)
- Real-time events (WebSocket infrastructure)
- Agent orchestration scripts (valuable concepts)
- Advanced auth features (MFA, social auth)

### 🟢 PRESERVE & CLEAN (MVP core)
- `packages/types/` (complete preservation)
- `apps/backend/src/modules/auth/` (simplified)
- `apps/backend/src/modules/transactions/` (complete)
- `apps/backend/src/modules/budgets/` (complete)
- Frontend core infrastructure

## 📦 Dependency Cleanup Strategy

### Root package.json Changes
```json
{
  "name": "money-wise-mvp",
  "version": "0.1.0",
  "description": "Personal Finance Management MVP",
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

### Dependencies to Remove
- ML/AI libraries (tensorflow, brain.js, etc.)
- Real-time libraries (socket.io, ws)
- Advanced auth libraries (passport-google, passport-facebook)
- Over-complex testing utilities
- Orchestration-specific dependencies

### Dependencies to Keep
- Core NestJS ecosystem
- Next.js 14 ecosystem
- TypeORM + PostgreSQL
- Essential testing (Jest, Playwright core)
- Security essentials (bcrypt, jsonwebtoken)

## 🔧 Module Simplification Plan

### Auth Module Cleanup
**Remove Advanced Features:**
- `services/mfa.service.ts` → Archive
- `services/social-auth.service.ts` → Archive
- `entities/user-mfa-settings.entity.ts` → Archive
- `controllers/auth-enhanced.controller.ts` → Simplify to basic auth

**Keep Core Features:**
- Basic JWT authentication
- Password hashing (bcrypt)
- User registration/login
- Session management (simplified)
- Rate limiting (basic)

### Analytics Module Cleanup
**Simplify to Basic Dashboard:**
- Remove ML-powered insights
- Keep basic transaction summaries
- Keep simple category analytics
- Remove real-time streaming features

## 📄 Documentation Reset Strategy

### New README.md Structure
```markdown
# MoneyWise MVP v0.1.0

> Personal Finance Management Application - Minimum Viable Product

## Quick Start
- Simple Docker setup
- Basic authentication
- Transaction management
- Budget tracking
- Clean dashboard

## Architecture
- NestJS backend
- Next.js frontend
- PostgreSQL database
- TypeScript throughout
```

### Updated CLAUDE.md Focus
- Remove agent orchestration complexity
- Focus on simple development workflow
- Clean Docker requirements (100% reliability)
- Basic CI/CD (3-4 workflows max)
- MVP feature scope only

## 🎯 Success Criteria

### After Cleanup Completion
- ✅ Project feels like fresh v0.1.0 start
- ✅ 0 broken dependencies or imports
- ✅ All preserved code compiles successfully
- ✅ Documentation reflects MVP scope only
- ✅ Clean git history with tagged cleanup commit
- ✅ Archive preserves valuable future assets
- ✅ Development environment simpler and reliable

### Quality Gates
- **Build Success**: `npm run build` works across all apps
- **Type Safety**: Zero TypeScript errors
- **Test Coverage**: Preserved modules maintain >80% coverage
- **Security**: No security vulnerabilities introduced
- **Documentation**: All docs reflect new clean structure

## ⚠️ Risk Mitigation

### High-Risk Activities
1. **Auth Module Simplification**: Core authentication must remain functional
2. **Dependency Removal**: Must not break core functionality
3. **File Deletions**: Ensure no critical references remain

### Mitigation Strategies
1. **Archive Before Delete**: Never permanently delete valuable code
2. **Gradual Cleanup**: One module at a time with testing
3. **Dependency Analysis**: Check for hidden dependencies before removal
4. **Rollback Plan**: Git commits at each major step

## 📊 Cleanup Metrics

### File Count Targets
- **Before**: ~500+ files across entire project
- **After**: ~200 files (MVP essentials only)
- **Archived**: ~150 files (valuable future assets)
- **Deleted**: ~150 files (no future value)

### Dependency Count Targets
- **Before**: ~200+ npm dependencies
- **After**: ~80 core dependencies
- **Reduction**: 60% dependency reduction

### Complexity Reduction
- **Scripts**: 17 → 3 orchestration scripts
- **Workflows**: 14 → 3 CI/CD workflows
- **Modules**: 11 → 6 backend modules
- **Docs**: 20+ → 8 focused docs

## 🚀 Next Steps After Cleanup

Once cleanup is complete, we'll have:
- Clean MVP foundation (version 0.1.0)
- Preserved 70% of valuable code
- Eliminated infrastructure complexity
- Fresh documentation reflecting reality
- Ready for systematic FOUNDATION phase

The project will feel like a brand new, well-architected MVP with a solid foundation built from proven, high-quality components.

---

**Execution**: Follow the 18 cleanup todos in sequence for systematic cleanup.