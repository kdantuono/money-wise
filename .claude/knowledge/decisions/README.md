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

## Current ADRs

### ADR-001: Use NestJS for Backend API
**Status**: Accepted  
**Date**: 2024-01-15  
**Decision**: Use NestJS as the backend framework  
**Rationale**: Enterprise-ready, TypeScript-first, excellent DI system  

### ADR-002: PostgreSQL as Primary Database
**Status**: Accepted  
**Date**: 2024-01-15  
**Decision**: Use PostgreSQL 15 with TypeORM  
**Rationale**: Robust, scalable, excellent JSON support, familiar  

### ADR-003: Monorepo Structure
**Status**: Accepted  
**Date**: 2024-01-16  
**Decision**: Organize code as monorepo with apps/ and packages/  
**Rationale**: Code sharing, atomic commits, unified tooling  

### ADR-004: JWT Authentication
**Status**: Accepted  
**Date**: 2024-01-18  
**Decision**: Use JWT with httpOnly cookies  
**Rationale**: Stateless, scalable, secure when properly implemented  

### ADR-005: Multi-Agent Orchestration
**Status**: Accepted  
**Date**: 2024-01-20  
**Decision**: Implement parallel agent execution via git worktrees  
**Rationale**: Maximize development velocity, avoid conflicts  

### ADR-006: Progressive Merge Strategy
**Status**: Accepted  
**Date**: 2024-01-20  
**Decision**: Merge task→story→epic→dev→main progressively  
**Rationale**: Early integration, fast feedback, reduced conflicts  

### ADR-007: TypeScript Strict Mode
**Status**: Accepted  
**Date**: 2024-01-17  
**Decision**: Enable TypeScript strict mode everywhere  
**Rationale**: Catch errors early, better IDE support, safer code  

### ADR-008: Redis for Caching
**Status**: Accepted  
**Date**: 2024-01-18  
**Decision**: Use Redis for session management and caching  
**Rationale**: Fast, reliable, supports pub/sub for future features  

## Proposed ADRs

### ADR-009: GraphQL API Layer
**Status**: Proposed  
**Date**: 2024-01-22  
**Decision**: Add GraphQL alongside REST  
**Rationale**: Better client flexibility, reduced overfetching  
**Discussion**: Consider complexity vs benefits for MVP  

### ADR-010: Event-Driven Architecture
**Status**: Proposed  
**Date**: 2024-01-23  
**Decision**: Implement event sourcing for transactions  
**Rationale**: Audit trail, eventual consistency, scalability  
**Discussion**: May be overkill for MVP phase  

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