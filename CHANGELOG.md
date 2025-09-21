# Changelog

All notable changes to the MoneyWise MVP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Branch Documentation Maintenance Rule (Section K in best-practices.md)
  - Mandatory README.md, CHANGELOG.md, SETUP.md maintenance during branch development
  - Phase 0 integration with post-feature workflow
  - Quality standards and verification procedures for project health documentation
- Post-Feature Workflow Protocol (Section I in best-practices.md)
  - 4-phase mandatory workflow: Push → Verify CI/CD → Merge → Cleanup
  - Emergency procedures for CI/CD failures
  - Complete verification checklist and branch cleanup
- Documentation Consistency Standards (Section J in best-practices.md)
  - Comprehensive newcomer onboarding documentation requirements
  - Required documentation elements for all types (Application/Feature/Fix)
  - Update protocols and quality standards

### Changed
- Enhanced CLAUDE.md with mandatory branch documentation maintenance requirements
- Enhanced CLAUDE.md with post-feature workflow enforcement
- Updated best-practices.md version to 2.2.0 with comprehensive workflow rules
- Improved Git workflow section with documentation health requirements

### Fixed
- Critical ESLint warnings in PlaidService (unused variables, complexity)
- Reduced PlaidService syncTransactions complexity from 35 to ≤15
- Fixed test file length issues (kept under 500 lines)

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