# Architecture Decision Records (ADRs)

## Overview
This directory contains Architecture Decision Records (ADRs) - documents that capture important architectural decisions made during the development of MoneyWise.

## ADR Template

```markdown
# ADR-[NUMBER]: [TITLE]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?
```

## Current ADRs (Detailed Documents)

| ADR | Title | Status | File |
|-----|-------|--------|------|
| ADR-001 | Monorepo Structure with Turborepo | Accepted | [ADR-001-monorepo-structure.md](./ADR-001-monorepo-structure.md) |
| ADR-002 | Centralized Configuration Management | Accepted | [ADR-002-configuration-management.md](./ADR-002-configuration-management.md) |
| ADR-003 | Monitoring and Observability Stack | Accepted | [ADR-003-monitoring-observability.md](./ADR-003-monitoring-observability.md) |
| ADR-004 | Testing Strategy and Coverage Standards | Accepted | [ADR-004-testing-strategy.md](./ADR-004-testing-strategy.md) |
| ADR-005 | Error Handling and Logging Strategy | Accepted | [ADR-005-error-handling.md](./ADR-005-error-handling.md) |
| ADR-006 | Database Architecture and ORM Strategy | Accepted | [ADR-006-database-architecture.md](./ADR-006-database-architecture.md) |
| ADR-007 | CI/CD Budget Optimization Strategy | Accepted | [ADR-007-ci-cd-budget-optimization.md](./ADR-007-ci-cd-budget-optimization.md) |
| ADR-008 | Turborepo Telemetry Opt-Out | Accepted | [ADR-008-turborepo-telemetry-opt-out.md](./ADR-008-turborepo-telemetry-opt-out.md) |
| ADR-009 | Strategic Migration from TypeORM to Prisma | Accepted | [ADR-009-prisma-migration.md](./ADR-009-prisma-migration.md) |
| ADR-010 | Unified Configuration Management Strategy | Proposed | [ADR-010-unified-configuration-management.md](./ADR-010-unified-configuration-management.md) |

## Quick Reference (Legacy Summaries)

These are historical summaries. See the detailed documents above for current decisions.

### Infrastructure Decisions
- **NestJS Backend**: Enterprise-ready, TypeScript-first, excellent DI system
- **PostgreSQL + Prisma**: Robust, scalable, type-safe ORM
- **Redis**: Session management and caching
- **Monorepo with Turborepo**: Code sharing, atomic commits, unified tooling

### Security Decisions
- **JWT Authentication**: httpOnly cookies, stateless, scalable
- **TypeScript Strict Mode**: Catch errors early, safer code

### Process Decisions
- **Progressive Merge**: task→story→epic→dev→main
- **Multi-Agent Orchestration**: Parallel execution via git worktrees  

## Decision Process

1. **Propose**: Create ADR with Proposed status
2. **Discuss**: Team reviews and comments
3. **Decide**: Mark as Accepted or Rejected
4. **Implement**: Reference ADR in code/commits
5. **Review**: Periodically review for relevance

## Principles

### Technical Decisions
- Prefer boring technology
- Optimize for developer experience
- Design for testability
- Plan for scale but build for now

### Process Decisions
- Automate everything possible
- Fail fast and explicitly
- Document decisions and rationale
- Measure and monitor

### Architecture Principles
- Loose coupling, high cohesion
- Single responsibility principle
- Don't repeat yourself (DRY)
- You aren't gonna need it (YAGNI)

## References

- [ADR Tools](https://github.com/npryce/adr-tools)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://adr.github.io/)

## Contributing

To add a new ADR:
1. Copy the template above
2. Create `ADR-XXX-title.md`
3. Fill in all sections
4. Submit PR for review
5. Update this README after acceptance