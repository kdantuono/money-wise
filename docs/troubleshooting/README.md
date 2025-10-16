# Troubleshooting Documentation

This directory contains detailed troubleshooting guides and root cause analyses for issues encountered in the MoneyWise project.

## Contents

### CI/CD and Testing

- **[CI/CD Test Failures (Oct 14, 2025)](./ci-cd-test-failures-2025-10-14.md)** - Comprehensive analysis and resolution of failing test pipeline checks
  - Missing `test:performance` script and Turbo task
  - Missing DATABASE_URL environment variable
  - Missing database services for performance tests
  - **Status**: ✅ Resolved

- **[Verification Checklist](./VERIFICATION-CHECKLIST.md)** - Quick reference for verifying CI/CD fixes

## How to Use This Documentation

### For Developers
When encountering CI/CD failures:
1. Check if a similar issue exists in this directory
2. Review the root cause analysis
3. Apply the documented solution
4. Update the documentation if you find new edge cases

### For New Team Members
These documents provide:
- Historical context for architectural decisions
- Common pitfalls and their solutions
- Best practices for CI/CD configuration
- Testing infrastructure setup guides

### Contributing
When resolving a new issue:
1. Create a dated troubleshooting document
2. Include root cause analysis
3. Document the solution with code examples
4. Add verification steps
5. Update this README with a link

## Quick Reference

### Test Infrastructure
- **Unit Tests**: No database required (mocked dependencies)
- **Integration Tests**: Require PostgreSQL + Redis
- **Performance Tests**: Require PostgreSQL + Redis (currently skipped)
- **E2E Tests**: Require full application stack

### Environment Variables
- **Local**: Use `.env.test` in apps/backend
- **CI/CD Pipeline**: Uses `postgres/testpassword/moneywise_test`
- **Quality Gates**: Uses `test/testpass/test_db`

### Key Commands
```bash
# Run all tests
pnpm test

# Run specific test types
pnpm test:unit
pnpm test:integration
pnpm test:performance
pnpm test:e2e

# Verify Turbo configuration
pnpm turbo run <task> --dry-run
```

## Related Documentation

- [Test Specialist Guide](../.claude/agents/test-specialist.md)
- [Turbo Configuration](../TURBO.md)
- [CI/CD Workflows](../.github/workflows/)
- [Environment Setup](../apps/backend/.env.test)
