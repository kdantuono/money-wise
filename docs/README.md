# MoneyWise Documentation

> **Documentation Framework**: [Diátaxis](https://diataxis.fr/) - Industry Standard (Python, Django, Ubuntu, 2024-2025)

Welcome to MoneyWise documentation! This documentation follows the **Diátaxis framework**, organizing content into four distinct categories to help you find exactly what you need.

---

## 📍 Single Source of Truth

**For current project status, always consult:**

👉 **[Development Progress](development/progress.md)** - Live project tracking (v0.5.0)

This is the **authoritative source** for completion status, test counts, and current phase.

---

## 🗺️ Navigation by Purpose

### 🎓 Tutorials (Learning-Oriented)
*Step-by-step lessons for beginners to learn MoneyWise development*

**Status**: Coming soon! For now, see [How-to Guides](#-how-to-guides-problem-oriented) for practical workflows.

📁 **Location**: `docs/tutorials/`

---

### 🔧 How-to Guides (Problem-Oriented)
*Practical guides to solve specific development tasks*

**Setup & Environment**:
- [Setup Guide](how-to/setup.md) - Development environment configuration
- [Turbo Guide](how-to/turbo.md) - Monorepo build system usage

**Feature Development**:
- [Authentication](how-to/authentication.md) - Implementing auth features
- [Testing](how-to/testing.md) - Writing and running tests
- [Troubleshooting](how-to/troubleshooting.md) - Common issues and fixes

**Operations**:
- [Monitoring](how-to/monitoring/) - Sentry integration, logging, metrics

📁 **Location**: `docs/how-to/`

---

### 📖 Reference (Information-Oriented)
*Technical specifications and API documentation*

**API Documentation**:
- [API Reference](reference/api.md) - REST API endpoints specification

📁 **Location**: `docs/reference/`
**Future**: Auto-generated API docs, database schema reference

---

### 💡 Explanation (Understanding-Oriented)
*Background, context, and architectural decisions*

#### Architecture Decision Records (ADRs)
**Industry-standard format per Azure/AWS/GCP best practices:**

- [ADR-0001: Prisma ORM Migration](explanation/architecture/decisions/0001-prisma-orm-migration.md) (2025-10-14)
  *TypeORM → Prisma 6.18.0 migration rationale and results (-30% code, -83% type errors)*

- [ADR-0002: Cookie-Based Authentication](explanation/architecture/decisions/0002-cookie-based-authentication.md) (2025-11-05)
  *HttpOnly cookies + CSRF protection for financial app security (OWASP/PCI-DSS compliant)*

- [ADR-0003: Zero-Tolerance CI/CD](explanation/architecture/decisions/0003-zero-tolerance-cicd.md) (2025-11-05)
  *10-level pre-push validation achieving zero broken builds (was 8 in Oct 2025)*

#### Architecture & Design
- [Monorepo Structure](explanation/architecture/monorepo.md) - pnpm workspaces, Turborepo
- [Database Architecture](explanation/database/architecture.md) - PostgreSQL/TimescaleDB design

#### Product Context
- [Planning](explanation/planning/) - Product roadmap, epics, milestones, integrations
- [Banking Integration](explanation/banking/) - Multi-provider strategy (SaltEdge, Tink, Plaid)
- [Security](explanation/security/) - Security policies and best practices

📁 **Location**: `docs/explanation/`

---

## 🚀 Quick Start

**New to MoneyWise?**
1. Start with [Setup Guide](how-to/setup.md) to configure your environment
2. Read [ADR-0001](explanation/architecture/decisions/0001-prisma-orm-migration.md) to understand the ORM choice
3. Check [Development Progress](development/progress.md) for current status
4. Review [API Reference](reference/api.md) for available endpoints

**Implementing a feature?**
- Consult the appropriate [How-to Guide](#-how-to-guides-problem-oriented)
- Review related [ADRs](#architecture-decision-records-adrs) for architectural context
- Follow [Testing Guide](how-to/testing.md) to validate your changes

**Troubleshooting an issue?**
- See [Troubleshooting Guide](how-to/troubleshooting.md) first
- Check [GitHub Issues](https://github.com/kdantuono/money-wise/issues) for known problems
- Review [Monitoring](how-to/monitoring/) for debugging tools

---

## 📊 Project Overview

**Version**: v0.5.0
**Status**: MVP 60% Complete | Phase 5.2 E2E Testing
**Tech Stack**: NestJS + Next.js + Prisma ORM + PostgreSQL/TimescaleDB + Redis

**Key Achievements** (as of 2025-11-10):
- ✅ 373 verified passing tests across 13 complete test suites
- ✅ Cookie-based authentication (HttpOnly + CSRF protection)
- ✅ Zero broken builds achieved (10-level CI/CD validation)
- ✅ Prisma ORM migration complete (30% code reduction)
- ✅ E2E testing infrastructure (Playwright)

See [Development Progress](development/progress.md) for detailed metrics.

---

## 🏗️ Documentation Principles

This documentation follows **industry best practices**:

1. **Single Source of Truth**: [Development Progress](development/progress.md) is the authoritative status
   *Links instead of duplication (GitLab/GitHub standard)*

2. **ADRs for Decisions**: All major architectural decisions documented per Azure/AWS/GCP standards
   *See [Architecture Decisions](explanation/architecture/decisions/)*

3. **Diátaxis Framework**: Content organized by purpose (Tutorials, How-to, Reference, Explanation)
   *Industry standard used by Python, Django, Ubuntu (2024-2025)*

4. **KISS Principle**: Minimal documentation, maximum clarity
   *"Just enough documentation" approach (2024-2025 standard)*

5. **Documentation as Code**: All docs version-controlled with git
   *Git history provides audit trail, no redundant archives*

---

## 📚 External Resources

- [Diátaxis Framework](https://diataxis.fr/) - Documentation system philosophy
- [ADR Template](https://github.com/joelparkerhenderson/architecture-decision-record) - Industry-standard ADR format
- [Azure Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/) - ADR best practices
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Security compliance
- [Prisma Documentation](https://www.prisma.io/docs) - ORM reference

---

## 🔄 Documentation Updates

**Last Major Update**: 2025-11-10
**Changes**: Implemented Diátaxis framework, added ADRs, established single source of truth

**Update History**:
- 2025-11-10: Diátaxis restructuring (282 → 126 files, -55%)
- 2025-11-10: Added ADR-0001, ADR-0002, ADR-0003
- 2025-11-10: Designated progress.md as authoritative source

---

**Questions?** File an [issue](https://github.com/kdantuono/money-wise/issues) or consult the [Troubleshooting Guide](how-to/troubleshooting.md).
