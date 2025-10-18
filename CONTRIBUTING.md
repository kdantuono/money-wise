# Contributing to MoneyWise

Thank you for your interest in contributing to MoneyWise! This document provides guidelines and instructions for contributing to the project.

## 🚀 Quick Start for Contributors

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/money-wise.git
   cd money-wise
   ```

2. **Set up development environment**
   ```bash
   # Install dependencies
   pnpm install

   # Copy environment configuration
   cp .env.example .env

   # Start Docker services (PostgreSQL + Redis)
   pnpm docker:dev

   # Verify setup
   pnpm test:unit
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## 📋 Git Workflow

### Branch Naming Convention

- **Features**: `feature/short-description`
- **Bug Fixes**: `fix/short-description`
- **Documentation**: `docs/short-description`
- **Refactoring**: `refactor/short-description`
- **Tests**: `test/short-description`

**Examples**:
- `feature/add-budget-alerts`
- `fix/transaction-date-validation`
- `docs/update-api-reference`

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no logic changes)
- `refactor`: Code restructuring (no behavior changes)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```bash
feat(auth): add password reset functionality
fix(transactions): correct balance calculation for refunds
docs(readme): update environment setup instructions
test(accounts): add integration tests for account service
```

---

## 🔄 Pull Request Process

### Before Submitting a PR

1. **Ensure all tests pass**:
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

2. **Update documentation** if you've changed:
   - API endpoints
   - Configuration options
   - User-facing features

3. **Add tests** for new features:
   - Unit tests for business logic
   - Integration tests for API endpoints
   - E2E tests for critical user flows

### Submitting Your PR

1. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub:
   - Use a clear, descriptive title
   - Reference any related issues (`Fixes #123`, `Relates to #456`)
   - Provide a detailed description of changes
   - Include screenshots for UI changes

### PR Description Template

```markdown
## Summary
Brief description of what this PR does

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Fixes #123
```

### Code Review Process

- Maintainers will review your PR within 1-3 business days
- Address review feedback by pushing new commits
- Once approved, a maintainer will merge your PR
- After merge, your branch will be automatically deleted

### Review Timeline & Expectations

**What to expect after submitting a PR:**

1. **Automated Checks** (immediate)
   - CI pipeline runs linting, tests, type checking
   - All checks must pass before human review
   - Fix any failures and push updates

2. **Initial Response** (within 48 hours)
   - Maintainer comments or assigns reviewers
   - May request clarifications or changes
   - May label PR for tracking

3. **Code Review** (within 5 business days)
   - Reviewer examines code quality, tests, documentation
   - Feedback provided as inline comments
   - May request changes or approve

4. **Revisions** (your timeline)
   - Address feedback within 1 week (preferred)
   - Push updates to same branch
   - Request re-review when ready

5. **Approval & Merge** (1-2 days after approval)
   - Requires 1+ maintainer approval
   - All conversations resolved
   - Branch up-to-date with target branch

**If your PR gets stale:**
- No response after 7 days? Comment to bump
- Blocked by another PR? Maintainer will communicate
- Needs work but no time? Explain in comment
- Lost interest? Close PR so issue can be reassigned

---

## ✅ Code Quality Standards

### TypeScript

- **Type Safety**: Avoid `any` types; use proper type definitions
- **Interfaces**: Define interfaces for complex objects
- **Null Checks**: Handle `null`/`undefined` explicitly

### Testing

- **Minimum Coverage**: Aim for >80% code coverage
- **Test Structure**: Use `describe`/`it` blocks with clear names
- **Test Independence**: Tests should not depend on each other
- **Mock External Dependencies**: Use mocks for databases, APIs, etc.

### Code Style

We use automated formatters and linters:
- **ESLint**: Enforces code quality rules
- **Prettier**: Enforces consistent formatting

Run before committing:
```bash
pnpm lint:fix
pnpm format
```

---

## 🌱 Finding Your First Issue

### Recommended Starting Points

1. **Documentation Improvements** (easiest)
   - Look for issues tagged `label:docs`
   - Fix typos, improve clarity, add examples
   - No code changes needed

2. **Test Coverage** (good learning path)
   - Look for issues tagged `label:testing`
   - Add missing unit or integration tests
   - Learn codebase while contributing

3. **Good First Issues** (curated for beginners)
   - Look for issues tagged `label:good-first-issue`
   - Self-contained tasks with clear scope
   - Maintainer support guaranteed

4. **Bug Fixes** (after initial contributions)
   - Look for `label:bug` + `label:help-wanted`
   - Clear reproduction steps provided
   - Good for understanding system behavior

### Before You Start

1. **Comment on the issue**: "I'd like to work on this"
2. **Wait for assignment**: Maintainer will assign you (prevents duplicate work)
3. **Ask questions**: Better to clarify upfront than submit wrong solution
4. **Estimate time**: If too complex, ask for guidance or try another

---

## 🧪 Testing Guidelines

### Running Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Watch mode (for development)
pnpm test:watch
```

### Writing Tests

**Unit Test Example** (`*.spec.ts`):
```typescript
describe('BudgetService', () => {
  describe('calculateRemaining', () => {
    it('should return correct remaining budget', () => {
      const budget = { limit: 1000, spent: 750 };
      const result = service.calculateRemaining(budget);
      expect(result).toBe(250);
    });
  });
});
```

**Integration Test Example** (`*.integration.spec.ts`):
```typescript
describe('Auth API (Integration)', () => {
  it('should register and login user successfully', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'Test123!' });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toHaveProperty('accessToken');
  });
});
```

---

## 🔧 Troubleshooting Common Issues

### Setup Problems

| Problem | Solution |
|---------|----------|
| `pnpm install` fails | Update pnpm: `npm install -g pnpm@latest` |
| Docker containers won't start | Ensure Docker Desktop is running: `docker ps` |
| Database migrations fail | Reset database: `pnpm prisma migrate reset` |
| Port 3000 already in use | Kill process: `lsof -ti:3000 \| xargs kill -9` |
| TypeScript errors after pull | Clean and reinstall: `rm -rf node_modules && pnpm install` |
| Tests fail locally but pass in CI | Check Node version matches CI (18.x): `node --version` |
| Git pre-commit hook fails | Run validation manually: `./.claude/scripts/validate-ci.sh 10` |

### Development Workflow Issues

**Database Connection Error**:
```
Error: P1001: Can't reach database server
```

**Solution**:
1. Verify Docker containers running: `docker compose ps`
2. Check `.env` has correct `DATABASE_URL`
3. Restart containers: `docker compose restart postgres redis`

**TypeScript Compilation Errors**:
```
Error: Cannot find module '@money-wise/backend'
```

**Solution**:
1. Ensure workspace is properly linked: `pnpm install`
2. Clear TypeScript cache: `rm -rf .next node_modules/.cache`
3. Rebuild workspace: `pnpm build`

### Getting Help

**Still stuck?** Create a [GitHub Discussion](https://github.com/kdantuono/money-wise/discussions) with:
- What you tried
- Error messages (full stack trace)
- Environment details (`node --version`, `pnpm --version`, OS)

---

## 🐛 Reporting Bugs

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Test on latest version** to ensure bug still exists
3. **Gather information**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., macOS 13.0]
- Node version: [e.g., 18.17.0]
- Package version: [e.g., 0.4.6]

**Additional context**
Any other context about the problem.
```

---

## 💡 Feature Requests

We welcome feature suggestions! Please:

1. **Check existing issues** for similar requests
2. **Describe the problem** your feature would solve
3. **Propose a solution** (optional but helpful)
4. **Consider alternatives** you've thought about

---

## 📚 Development Resources

- **Architecture Docs**: `docs/architecture/`
- **API Reference**: `docs/api/`
- **Setup Guide**: `docs/development/setup.md`
- **Troubleshooting**: `docs/development/troubleshooting.md`

---

## ❓ Questions?

- **General Questions**: Create a [GitHub Discussion](https://github.com/kdantuono/money-wise/discussions)
- **Bug Reports**: Create an [Issue](https://github.com/kdantuono/money-wise/issues)
- **Security Issues**: Email maintainers privately (see SECURITY.md)

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to MoneyWise!** 🎉
