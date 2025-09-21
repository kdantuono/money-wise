# Changelog

All notable changes to the MoneyWise MVP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Repository Optimization Epic (In Progress)**:
  - Package.json Scripts MVP Efficiency Audit with 15-20% faster npm install
  - Agile Methodology Integration with Board-First execution patterns
  - Comprehensive AGILE_GUIDE.md with 10-step Definition of Done
  - Documentation consolidation for newcomer accessibility
  - Epic completion and prioritization rules for continuous development flow
- **Enhanced Development Experience**:
  - MVP-optimized scripts: `audit:deps`, `clean`, `doctor`, `reset`
  - Workspace streamlined to backend + web only (removed mobile from MVP scope)
  - Best-practices.md fallback discovery rule (global → project)
- **Documentation Improvements**:
  - Newcomer-focused README.md with 30-second orientation
  - Setup verification checklist with confidence-building milestones
  - Historical implementation files moved to docs/archive/
  - Clear separation of current vs. historical content

### Changed
- **Workspace Optimization**: Removed mobile app from workspace (not MVP scope)
- **Dependency Organization**: Moved framer-motion from root to web package
- **Workflow Enhancement**: Board-First execution pattern with GitHub Projects integration
- **File Organization**: Root-level historical .md files moved to docs/archive/historical-implementations/

### Fixed
- **Package Dependencies**: Eliminated redundant dependencies and improved organization
- **Documentation Discovery**: Fallback sequence prevents file-not-found errors
- **Newcomer Experience**: Clear learning path and setup verification process

## [0.1.0] - 2025-09-20

### Added
- **Initial MVP Release**: Complete personal finance management application
- **Backend (NestJS)**:
  - User authentication with JWT and bcrypt
  - Transaction CRUD operations with categorization
  - Budget creation and tracking
  - Account management system
  - Security middleware and validation
  - Plaid integration for bank connectivity
  - Swagger/OpenAPI documentation
- **Frontend (Next.js)**:
  - Responsive web dashboard with Tailwind CSS
  - User authentication flow
  - Transaction management interface
  - Budget tracking dashboard
  - Account overview and management
- **Infrastructure**:
  - Docker Compose development environment
  - PostgreSQL database with TypeORM
  - Redis caching for session management
  - Comprehensive TypeScript configuration
- **Development Workflow**:
  - ESLint and Prettier code quality tools
  - Jest testing framework setup
  - Playwright E2E testing framework
  - Git hooks for quality gates
  - Claude Code integration and best practices

### Security
- JWT-based authentication with 7-day token expiration
- Bcrypt password hashing
- Rate limiting on authentication endpoints
- Input validation and sanitization
- SQL injection prevention
- CORS configuration
- Helmet security headers

### Infrastructure
- Monorepo structure with shared TypeScript types
- Docker development environment
- PostgreSQL and Redis services
- Automated database migrations
- CI/CD pipeline with GitHub Actions
- Quality gates and automated testing

---

**Version History:**
- **v0.1.0**: Initial MVP release with core functionality
- **v0.1.1**: Enhanced workflow rules and documentation standards (in progress)