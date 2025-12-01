# MoneyWise Project Planning

> **Central hub for all MVP planning, requirements, and implementation roadmaps**
> **Status: MVP 95% Complete (December 2025)**

## Current Project State

MoneyWise has achieved near-MVP completion. Most planning documents in this directory are now **historical reference** rather than active roadmaps.

### What's Implemented
- ✅ Authentication (JWT, 2FA, protected routes)
- ✅ Dashboard with financial insights
- ✅ Banking integration (SaltEdge v6)
- ✅ Budget management
- ✅ Analytics API
- ✅ Docker E2E infrastructure

### What's Remaining
- Transaction management UI (manual entry)
- Account details pages
- Investment tracking
- Goal setting
- Mobile app (React Native)

**See**: [`../development/progress.md`](../development/progress.md) for detailed current state

---

## Planning Documents

### Active Reference
- [`app-overview.md`](./app-overview.md) - Multi-generational finance platform vision
- [`../development/progress.md`](../development/progress.md) - **Current development state**

### Historical Reference
The following documents were used during initial planning but contain outdated information:

| Document | Status | Notes |
|----------|--------|-------|
| `critical-path.md` | 📜 Historical | MVP timeline from early planning |
| `mvp/` | 📜 Historical | Original 8-week plan - most items complete |
| `milestones/` | 📜 Historical | M1-M6 planning - M1-M3 complete |
| `epics/EPIC-2.1-*.md` | ✅ Complete | Frontend auth implemented |
| `epics/EPIC-2.2-*.md` | ✅ Complete | Dashboard/analytics implemented |
| `epics/EPIC-2.3-*.md` | 🔄 Replaced | Plaid → SaltEdge v6 |

### Banking Integration (Active)
- [`integrations/SALTEDGE-INTEGRATION-GUIDE.md`](./integrations/SALTEDGE-INTEGRATION-GUIDE.md) - Current banking provider
- [`BANKING-PROVIDER-RESEARCH-PHASE4.md`](./BANKING-PROVIDER-RESEARCH-PHASE4.md) - Provider comparison research
- [`BANKING-PROVIDER-EXECUTIVE-SUMMARY.md`](./BANKING-PROVIDER-EXECUTIVE-SUMMARY.md) - Decision summary

---

## Project Vision

**Target**: Multi-generational finance platform (ages 7-70+)
**Tech Stack**: NestJS + Next.js + PostgreSQL + Redis + React Native
**Banking Provider**: SaltEdge v6 (changed from Plaid)

---

## Relationship to Development

```
docs/planning/     →     .claude/agents/     →     apps/
(Historical Plans)       (AI Orchestration)        (Implementation)
       ↓                        ↓                        ↓
docs/development/progress.md ← Single source of truth
```

---

## Key Connections

| Need | Location |
|------|----------|
| Current progress | [`../development/progress.md`](../development/progress.md) |
| Setup guide | [`../development/setup.md`](../development/setup.md) |
| AI orchestration | [`.claude/README.md`](../../.claude/README.md) |
| Project vision | [`app-overview.md`](./app-overview.md) |

---

## Archived/Completed Epics

### EPIC-1.5: Technical Debt (October 2025) ✅
- All 7 stories delivered
- TypeORM → Prisma migration complete
- CI/CD infrastructure complete

### EPIC-2.1: Frontend Authentication (November 2025) ✅
- Login/Register forms: Complete
- Protected routes: Complete
- Token management: Complete

### EPIC-2.2: Dashboard & Analytics (November 2025) ✅
- Dashboard components: Complete
- Analytics API: Complete
- Banking integration: Complete

---

*This planning hub updated December 1, 2025 to reflect actual project state*
