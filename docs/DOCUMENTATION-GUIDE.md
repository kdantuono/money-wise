# MoneyWise Documentation Guide

**Last Updated**: October 18, 2025
**Status**: Living Document
**Purpose**: Comprehensive guide to navigating and contributing to MoneyWise documentation

---

## 🗺️ Quick Navigation Map

**I want to...**

- **Get Started with Development** → Start with [`development/setup.md`](./development/setup.md)
- **Understand the Project Vision** → Read [`planning/app-overview.md`](./planning/app-overview.md)
- **Learn Authentication Implementation** → See [`auth/README.md`](./auth/README.md)
- **Check Database Schema** → Go to [`development/database/`](./development/database/)
- **View API Documentation** → Browse [`api/`](./api/)
- **Understand Architecture Decisions** → Review [`architecture/`](./architecture/)
- **See Project Progress** → Check [`planning/`](./planning/)
- **Find Security Information** → Read [`security/`](./security/)

---

## 📚 Full Documentation Structure

### 🎯 Planning & Strategy
**Location**: `docs/planning/`

Roadmaps, milestones, and feature specifications for MoneyWise development.

**Key Files**:
- `README.md` - Planning overview and navigation
- `app-overview.md` - Product vision, target users, key features
- `critical-path.md` - 47 blocking tasks for MVP completion
- `milestones/` - 6 detailed implementation phases
  - Milestone 1: Foundation
  - Milestone 2: Authentication & Core Models
  - Milestone 3: Banking Integration & Plaid
  - Milestone 4: Transaction Management
  - Milestone 5: Financial Intelligence & Dashboard
  - Milestone 6: Polish & Optimization
- `epics/` - Active epics (3 current)
  - EPIC-2.1: Frontend Authentication
  - EPIC-2.2: Account Transaction Management
  - EPIC-2.3: Plaid Integration MVP
- `integrations/` - Third-party API specifications (Plaid, banking services)
- `mvp/` - MVP development plan and specifications

**Use Case**: Understanding what we're building and project timeline

---

### 🔧 Development Documentation
**Location**: `docs/development/`

Day-to-day development guides, setup instructions, and progress tracking.

**Key Files**:
- `setup.md` - **START HERE** for environment configuration
- `progress.md` - Real-time development progress tracking
- `monorepo-structure.md` - Monorepo organization and workspace setup
- `environment-variables.md` - All environment configuration required
- `database/` - Database setup and schema documentation
- `sessions/` - Session management implementation
- `testing/` - Testing setup and strategies

**Troubleshooting Guides**:
- `authentication-troubleshooting.md` - Common auth issues and solutions
- `authentication-setup.md` - Auth system setup guide

**Database Documentation**:
- `database/README.md` - Database overview and setup
- `database/schema-reference.md` - Current Prisma schema
- `database/migration-guide.md` - How to create and run migrations

**Use Case**: Setting up your dev environment, daily development, debugging

---

### 🏗️ Architecture & Decisions
**Location**: `docs/architecture/`

System design, architectural decisions, and design patterns.

**Key Files**:
- `README.md` - Architecture overview
- `adr/` - Architecture Decision Records (numbered 001-009+)
  - ADR-001: Monorepo Structure
  - ADR-002: Configuration Management
  - ADR-003: Monitoring & Observability
  - ADR-004: Testing Strategy
  - ADR-005: Error Handling
  - ADR-006: Database Architecture
  - ADR-009: Unified Configuration Management
- `decisions/` - Additional architectural decisions

**Use Case**: Understanding system design, making new architectural decisions, technology choices

---

### 🔐 Authentication & Security
**Location**: `docs/auth/` and `docs/security/`

Authentication implementation and security best practices.

**Authentication** (`docs/auth/`):
- `README.md` - Complete authentication system overview
- `IMPLEMENTATION_SUMMARY.md` - Implementation checklist
- `JWT_IMPLEMENTATION_GUIDE.md` - JWT token handling
- `SECURITY_BEST_PRACTICES.md` - Security hardening
- `password-security-implementation.md` - Password security patterns

**Security** (`docs/security/`):
- `authentication-security.md` - Authentication security specifics
- `features.md` - Security features overview

**Use Case**: Implementing user auth, understanding security requirements

---

### 🌐 API Documentation
**Location**: `docs/api/`

REST API specifications, endpoints, and usage guides.

**Key Files**:
- `README.md` - API overview and versioning
- `authentication.md` - Auth endpoints and flows
- `authentication-flows.md` - OAuth/JWT flow diagrams

**Use Case**: API endpoint specifications, integration testing

---

### 🧪 Testing Documentation
**Location**: `docs/testing/`

Testing strategies, test setup, and quality assurance.

**Key Files**:
- Unit testing guides
- Integration testing strategies
- E2E testing setup

**Use Case**: Writing tests, understanding quality standards

---

### 📊 Monitoring & Analytics
**Location**: `docs/monitoring/`

Application monitoring, observability, and metrics.

**Files**:
- Performance monitoring setup
- Logging configuration
- Metrics collection

**Use Case**: Setting up monitoring, understanding app health

---

### 📁 Migration Documentation
**Location**: `docs/migration/`

TypeORM to Prisma migration history and patterns.

**Key Files**:
- `TYPEORM-PRISMA-PATTERNS.md` - Migration patterns and gotchas
- `P.3.4-USER-MIGRATION-PLAN.md` - User model migration specifics
- `e2e-testing-summary.md` - Testing during migration
- `performance-testing-summary.md` - Performance validation

**Use Case**: Understanding migration history, learning from past decisions

---

### 🏛️ Archived Documentation
**Location**: `docs/archives/`

Historical documentation, old approaches, and reference material.

**Contents**:
- `ci-cd/` - Old CI/CD architecture and analyses
- `2025-01/` - January 2025 documentation snapshots
- Evolution of project approach and previous attempts

**Use Case**: Understanding project history, learning from previous approaches

---

### 📋 Releases
**Location**: `docs/releases/`

Release notes and version history.

**Files**:
- Version-specific release summaries
- Changelog and migration guides for major versions

**Use Case**: Understanding what changed in each release

---

## 🎯 Documentation Philosophy

### 1. **Reality-Based**
- Document what exists, not what's planned
- If docs and code differ, update docs
- Use actual code examples, not hypothetical

### 2. **Developer-Focused**
- Optimized for newcomer onboarding
- Written for daily development needs
- Clear, actionable, not abstract

### 3. **Living Documents**
- Updated alongside code changes
- Version controlled in git
- Reviewed in pull requests

### 4. **Just Enough**
- Comprehensive but not overwhelming
- Link to related docs instead of duplicating
- Focus on signal, not noise

---

## 🚀 For New Developers

### Day 1: Get Running
1. Clone repository
2. Follow [`development/setup.md`](./development/setup.md)
3. Run `pnpm install && pnpm dev`

### Day 2: Understand the Project
1. Read [`planning/app-overview.md`](./planning/app-overview.md)
2. Skim [`planning/critical-path.md`](./planning/critical-path.md)
3. Check current [`planning/README.md`](./planning/README.md)

### Day 3: Understand Current Work
1. Review [`development/progress.md`](./development/progress.md)
2. Read relevant epic documentation
3. Check active pull requests

### Week 2: Go Deep
1. Study [`architecture/`](./architecture/) ADRs
2. Review authentication implementation
3. Understand database schema
4. Check security practices

---

## 📖 For Contributors

### When You Make a Change
1. **Update relevant docs** alongside your code
2. **Add/update comments** in complex sections
3. **Link from index docs** if creating new documentation
4. **Update `LAST UPDATED`** date in doc header

### Creating New Documentation

**Location Decision**:
- Feature development docs → `development/`
- Architecture decisions → `architecture/adr/`
- API docs → `api/`
- Setup/config → `development/`
- Project planning → `planning/`

**Template**:
```markdown
# [Document Title]

**Last Updated**: [Date]
**Status**: [Living/Stable/Historical]
**Purpose**: [One-line summary]

---

[Content organized by heading levels]

## See Also
- [Related doc 1]
- [Related doc 2]
```

### Documentation Review Checklist
- [ ] Markdown is valid and renders correctly
- [ ] Links are relative and don't break
- [ ] Code examples are actual code (not pseudocode)
- [ ] Technical terms are consistent with rest of docs
- [ ] Status/Last Updated is current
- [ ] No TODO items left unresolved

---

## 🔗 Important Links

**MoneyWise Repository**: [GitHub](https://github.com/your-repo-link)
**Live Application**: [Production](https://moneywise.app)
**GitHub Project Board**: [Project](https://github.com/projects/your-project)
**Team Slack**: #moneywise-dev

---

## 📊 Documentation Statistics

- **Total Files**: 127+ markdown files
- **Main Categories**: 10 (Planning, Development, Architecture, etc.)
- **Active Epics**: 3
- **Milestones**: 6
- **Architecture Decisions**: 9+
- **Last Major Reorganization**: October 2025

---

## 🎓 Learning Paths

### I Want to Contribute Code
1. `development/setup.md` - Get environment running
2. `architecture/adr/` - Understand design patterns
3. `development/progress.md` - See current focus areas
4. Relevant epic docs - Understand feature context
5. Tests and PR reviews - Learn code standards

### I Want to Understand Auth
1. `auth/README.md` - Authentication overview
2. `auth/JWT_IMPLEMENTATION_GUIDE.md` - JWT specifics
3. `auth/SECURITY_BEST_PRACTICES.md` - Security hardening
4. `development/authentication-setup.md` - Setup guide
5. `development/authentication-troubleshooting.md` - Common issues

### I Want to Understand Database
1. `development/database/README.md` - Database overview
2. `development/database/schema-reference.md` - Current schema
3. `architecture/adr/006-database-architecture.md` - Design decisions
4. `development/database/migration-guide.md` - Working with migrations
5. `migration/TYPEORM-PRISMA-PATTERNS.md` - Historical patterns

### I Want to Deploy
1. `development/environment-variables.md` - Configuration
2. `architecture/adr/` - Infrastructure decisions
3. Deployment section in `development/setup.md`
4. Release notes in `releases/`

---

## 🐛 Report Documentation Issues

Found outdated or broken documentation?

1. **Check if it's outdated** - Last Updated date at top
2. **Search GitHub Issues** - Might already be reported
3. **Create a GitHub Issue** - Tag with `docs` label
4. **Submit a PR** - Fix and update the docs yourself!

---

## 🤝 Documentation Maintenance

### Monthly Review
- Update progress docs
- Archive completed epics/milestones
- Review and update broken links

### Quarterly Deep Review
- Review all major documentation sections
- Update architecture decisions
- Archive old approaches
- Create consolidation/organization plans

### Yearly Archive
- Move old documentation to archives
- Create retrospective documentation
- Plan documentation structure improvements

---

**Remember**: *Docs should be easier to update than code.*

If documentation is painful to maintain, we redesign it until it's not.

