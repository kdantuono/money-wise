# MoneyWise Project Planning

> **Central hub for all MVP planning, requirements, and implementation roadmaps**

## 📋 Planning Documents

### Core Project Planning
- [`app-overview.md`](./app-overview.md) - Multi-generational finance platform vision and positioning
- [`critical-path.md`](./critical-path.md) - Critical blocking tasks for MVP delivery (8 weeks, 47 tasks)

### MVP Implementation
- [`mvp/`](./mvp/) - Complete MVP development plan
  - GitHub Projects ready execution document
  - 8-week timeline with detailed stories
  - Team coordination and velocity targets

### Development Milestones
- [`milestones/`](./milestones/) - 6 detailed milestone breakdowns
  - **Milestone 1**: Foundation (Infrastructure, Git, Docker)
  - **Milestone 2**: Authentication & Core Models
  - **Milestone 3**: Banking Integration & Plaid
  - **Milestone 4**: Transaction Management
  - **Milestone 5**: Financial Intelligence & Dashboard
  - **Milestone 6**: Polish & Optimization

### Integration Specifications
- [`integrations/`](./integrations/) - Third-party integration plans
  - Plaid integration hyper-granular tasks for AI agents
  - Banking API implementation specifications

## 🎯 Project Vision

**Target**: Multi-generational finance platform (ages 7-70+)
**Timeline**: 8-week MVP development
**Methodology**: Milestone-based Agile with AI agent orchestration
**Tech Stack**: NestJS + Next.js + PostgreSQL + Redis + React Native

## 🔄 Relationship to Development

### Planning → Implementation Flow
```
docs/planning/     →     .claude/agents/     →     apps/
(Requirements)           (AI Orchestration)        (Implementation)
```

### Key Connections
- **Planning docs** define WHAT to build
- **`.claude/` system** defines HOW Claude builds it
- **`apps/` directories** contain the actual implementation

## 📊 Development Metrics

- **Total Tasks**: ~800 across all milestones
- **Critical Path**: 47 blocking tasks
- **Team Velocity Target**: 40 story points/week
- **Completion Timeline**: 8 weeks to MVP

## 🚀 Getting Started

1. **Understand Vision**: Read [`app-overview.md`](./app-overview.md)
2. **Review Timeline**: Check [`critical-path.md`](./critical-path.md)
3. **Study Implementation**: Browse [`mvp/`](./mvp/) and [`milestones/`](./milestones/)
4. **Begin Development**: Use `.claude/` orchestration system

## 🔗 Related Documentation

- **Technical Setup**: [`../development/setup.md`](../development/setup.md)
- **Development Progress**: [`../development/progress.md`](../development/progress.md)
- **AI Orchestration**: [`../../.claude/README.md`](../../.claude/README.md) (when available)

---
*This planning documentation drives all development activities through AI agent orchestration*