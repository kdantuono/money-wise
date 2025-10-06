# MoneyWise Architecture Documentation

This directory contains comprehensive technical architecture documentation for the MoneyWise personal finance platform.

## 📚 Documentation Structure

### Architectural Decision Records (ADRs)

ADRs document significant architectural decisions made during development, including context, alternatives considered, and consequences.

Located in [`decisions/`](./decisions/):

#### Infrastructure & Foundation

- **[ADR-001: Monorepo Structure](./decisions/ADR-001-monorepo-structure.md)**
  - Turborepo + pnpm workspaces for multi-app coordination
  - Shared packages for UI components, utilities, and configuration
  - Incremental builds and remote caching strategy
  - *Status*: Accepted | *Date*: 2025-10-06

- **[ADR-002: Configuration Management](./decisions/ADR-002-configuration-management.md)**
  - NestJS ConfigModule with class-validator for type-safe config
  - Zero direct `process.env` access (except documented exceptions)
  - Fail-fast validation at application startup
  - *Status*: Accepted | *Date*: 2025-10-06

- **[ADR-006: Database Architecture](./decisions/ADR-006-database-architecture.md)**
  - PostgreSQL 15 + TypeORM for relational data
  - TimescaleDB extension for time-series transaction data
  - Migration-based schema versioning
  - *Status*: Accepted | *Date*: 2025-10-06

#### Observability & Quality

- **[ADR-003: Monitoring & Observability](./decisions/ADR-003-monitoring-observability.md)**
  - Sentry for error tracking and performance monitoring
  - AWS CloudWatch for infrastructure metrics and logs
  - Custom health check endpoints for service availability
  - *Status*: Accepted | *Date*: 2025-10-06

- **[ADR-004: Testing Strategy](./decisions/ADR-004-testing-strategy.md)**
  - Testing pyramid: 70% unit, 20% integration, 10% E2E
  - Jest + React Testing Library + Playwright
  - 70% overall coverage target, 80%+ for critical modules
  - *Status*: Accepted | *Date*: 2025-10-06

- **[ADR-005: Error Handling](./decisions/ADR-005-error-handling.md)**
  - Custom exception classes for business logic errors
  - NestJS global exception filters for standardized responses
  - React error boundaries for UI error handling
  - Winston + Sentry for structured logging
  - *Status*: Accepted | *Date*: 2025-10-06

## 🎯 Quick Reference

### Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 15, React 18, TypeScript, Tailwind CSS |
| **Backend** | NestJS, TypeScript, Node.js 20 |
| **Database** | PostgreSQL 15, TimescaleDB 2.x, TypeORM |
| **Caching** | Redis 7 |
| **Monitoring** | Sentry, AWS CloudWatch, Winston |
| **Testing** | Jest, React Testing Library, Playwright |
| **Infrastructure** | Docker, Docker Compose, AWS ECS (future) |

### Architecture Principles

1. **Type Safety First**: TypeScript everywhere, strict mode enabled
2. **Fail Fast**: Validate early, reject invalid states at startup
3. **Observability Built-In**: All critical paths instrumented with monitoring
4. **Test Coverage Matters**: 70%+ coverage required, 80%+ for financial logic
5. **Configuration as Code**: All config type-safe and validated
6. **Security by Design**: No secrets in code, principle of least privilege

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────┐
│ Frontend (Next.js 15)                               │
│ ├─ Server Components (RSC)                          │
│ ├─ Client Components (React 18)                     │
│ ├─ Sentry Browser SDK                               │
│ └─ TanStack Query (data fetching)                   │
└─────────────────────────────────────────────────────┘
                        ↓ HTTP/REST
┌─────────────────────────────────────────────────────┐
│ Backend (NestJS)                                    │
│ ├─ Controllers (REST API endpoints)                 │
│ ├─ Services (Business logic)                        │
│ ├─ Repositories (TypeORM data access)               │
│ ├─ Guards (Authentication/Authorization)            │
│ ├─ Interceptors (Logging, caching)                  │
│ └─ Exception Filters (Error handling)               │
└─────────────────────────────────────────────────────┘
                        ↓
┌──────────────────┬──────────────────┬───────────────┐
│ PostgreSQL 15    │ Redis 7          │ External APIs │
│ + TimescaleDB    │ (Cache + Queue)  │ (Plaid, etc.) │
└──────────────────┴──────────────────┴───────────────┘
```

## 🔗 Related Documentation

- **[Project Planning](../planning/README.md)** - MVP roadmap, features, milestones
- **[Development Setup](../development/setup.md)** - Environment configuration
- **[Development Progress](../development/progress.md)** - Real-time tracking
- **[AI Orchestration](../../.claude/README.md)** - Claude Code agent system (when available)

## 📝 ADR Template

When creating new ADRs, use this structure:

```markdown
# ADR-XXX: [Title]

**Status**: [Proposed | Accepted | Deprecated | Superseded]
**Date**: YYYY-MM-DD
**Deciders**: [Team/Role]
**Technical Story**: [Epic/Story ID]

## Context
[Problem statement and background]

## Decision
[Chosen solution with key details]

## Rationale
[Why this solution? Alternatives considered?]

## Consequences
[Positive/Negative impacts, mitigations]

## Implementation
[How to implement, code examples]

## Monitoring
[How to measure success]

## References
[Links to docs, related ADRs]

---
**Superseded By**: [ADR-XXX if deprecated]
**Related ADRs**: [ADR-XXX, ADR-YYY]
```

## 🚀 Contributing

When making significant architectural changes:

1. **Draft ADR**: Create new ADR in `decisions/` following template
2. **Team Review**: Present decision with alternatives analysis
3. **Implementation**: Code changes following ADR guidelines
4. **Update Status**: Mark as "Accepted" when merged to main
5. **Cross-Reference**: Link from related ADRs

## 📖 Version History

| ADR | Version | Date | Status |
|-----|---------|------|--------|
| ADR-001 | 1.0 | 2025-10-06 | Accepted |
| ADR-002 | 1.0 | 2025-10-06 | Accepted |
| ADR-003 | 1.0 | 2025-10-06 | Accepted |
| ADR-004 | 1.0 | 2025-10-06 | Accepted |
| ADR-005 | 1.0 | 2025-10-06 | Accepted |
| ADR-006 | 1.0 | 2025-10-06 | Accepted |

---

**Last Updated**: 2025-10-06
**Maintained By**: Development Team
**Status**: Active Development
