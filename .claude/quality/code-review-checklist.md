# Code Review Checklist

**Last Updated**: 2025-10-04
**Version**: 1.0.0

## Purpose

This checklist ensures code quality, security, and architectural consistency across the MoneyWise codebase. All pull requests should be reviewed against these criteria before approval.

---

## 🏗️ Architecture & Design

### Dependency Injection
- [ ] **Guards use `@Inject()` for all dependencies**
  - Guards should receive dependencies via DI, never instantiate them
  - Example: `@Inject('default') private readonly redis: Redis`
  - ❌ **Never**: `this.redis = new Redis({ ... })`

- [ ] **No hardcoded `new` instantiations in constructors**
  - Check for `new ClassName()` patterns in constructors
  - All dependencies should be injected
  - Exception: Simple value objects (DTOs, plain objects)

- [ ] **No lifecycle methods in stateless consumers**
  - Guards should NOT implement `onModuleDestroy()`, `onModuleInit()`, etc.
  - Lifecycle management belongs to the owning module (e.g., RedisModule)
  - ❌ **Anti-pattern**: Guard managing shared resource lifecycle

- [ ] **Proper separation of concerns**
  - Components should have single, well-defined responsibilities
  - No business logic in guards/interceptors
  - No infrastructure concerns in domain services

### NestJS Best Practices
- [ ] **Module dependencies properly declared**
  - All required modules imported in `@Module({ imports: [...] })`
  - No circular dependencies
  - Module exports properly configured

- [ ] **Providers correctly scoped**
  - Default scope (`SINGLETON`) for stateless services
  - `REQUEST` scope only when necessary (consider performance impact)
  - `TRANSIENT` scope rarely needed

- [ ] **Custom providers follow naming conventions**
  - Use string tokens or symbols for multi-provider injection
  - Document provider purpose in comments
  - Example: `@Inject('default')` for default Redis instance

---

## 🧪 Testing

### Test Structure
- [ ] **Integration tests can properly mock dependencies**
  - Guards/services receive mocks via TestingModule providers
  - No hardcoded dependencies that bypass DI
  - Test setup mirrors production DI pattern

- [ ] **Test cleanup includes mock reset calls**
  - Use `afterEach` to reset mock state
  - Example: `mockRedisClient.__reset()` if available
  - Prevents cross-test contamination

- [ ] **Test isolation verified**
  - Tests don't depend on execution order
  - Each test starts with clean state
  - No shared mutable state between tests

### Test Coverage
- [ ] **Unit tests for business logic**
  - All service methods tested
  - Edge cases covered
  - Error handling validated

- [ ] **Integration tests for critical paths**
  - API endpoints tested end-to-end
  - Database interactions verified
  - External service integration validated

- [ ] **Guard behavior tested**
  - Positive cases (access granted)
  - Negative cases (access denied)
  - Rate limiting enforcement
  - Error handling paths

### Test Quality
- [ ] **No obsolete tests after refactoring**
  - Remove tests for deleted methods
  - Update tests for changed interfaces
  - Verify all tests are still relevant

- [ ] **Test descriptions are clear and accurate**
  - Describe what is being tested, not implementation details
  - Use "should ..." format
  - Group related tests in `describe` blocks

---

## 🔐 Security

### Input Validation
- [ ] **All user inputs validated**
  - Use DTOs with class-validator decorators
  - Validate before any business logic
  - Return clear, safe error messages

- [ ] **Rate limiting properly configured**
  - Auth endpoints have rate limits
  - Limits tested in integration tests
  - 429 responses include `Retry-After` header

### Authentication & Authorization
- [ ] **Guards properly enforce security**
  - Authentication guards on protected routes
  - Authorization guards check permissions
  - Guards return proper HTTP status codes

- [ ] **Secrets managed securely**
  - No hardcoded secrets
  - Use environment variables
  - Validate environment config on startup

### Error Handling
- [ ] **No sensitive data in error messages**
  - Stack traces only in development
  - Generic errors for authentication failures
  - Audit logs for security events

---

## 📦 Database

### Queries
- [ ] **Repository methods use QueryBuilder for complex queries**
  - Avoid raw SQL when possible
  - Use TypeORM query builder for type safety
  - Test query performance with EXPLAIN

- [ ] **N+1 query problems prevented**
  - Use eager loading where appropriate
  - Left join for related entities
  - Test with realistic data volumes

### Migrations
- [ ] **Migrations are reversible**
  - Both `up()` and `down()` implemented
  - Test rollback before merging
  - Document breaking changes

- [ ] **Schema changes backward compatible**
  - Additive changes when possible
  - Multi-step migrations for breaking changes
  - Consider deployed code during migration

---

## 🎨 Code Quality

### TypeScript
- [ ] **No `any` types**
  - Use specific types
  - Use `unknown` for truly unknown types
  - Use generics for reusable code

- [ ] **Strict null checking respected**
  - Handle null/undefined cases
  - Use optional chaining (`?.`)
  - Use nullish coalescing (`??`)

### Error Handling
- [ ] **Proper exception types**
  - Use HttpException subclasses
  - Custom exceptions extend HttpException
  - Include error codes/messages

- [ ] **Try-catch blocks minimal**
  - Catch specific exceptions
  - Re-throw when appropriate
  - Log errors before re-throwing

### Code Style
- [ ] **ESLint passes with no warnings**
  - Run `pnpm lint` before committing
  - Fix all warnings, not just errors
  - No `eslint-disable` comments without justification

- [ ] **Prettier formatting applied**
  - Run `pnpm format` before committing
  - No manual formatting overrides
  - Consistent code style across codebase

---

## 📝 Documentation

### Code Comments
- [ ] **Public APIs documented**
  - JSDoc comments for exported functions
  - Parameter descriptions
  - Return value descriptions
  - Examples for complex APIs

- [ ] **Complex logic explained**
  - Why, not what (code shows what)
  - Algorithm references
  - Performance considerations

### Changelog
- [ ] **CHANGELOG.md updated for user-facing changes**
  - Follow Keep a Changelog format
  - Include version number
  - Categorize: Added, Changed, Fixed, Removed

---

## 🚀 CI/CD

### Pre-Merge Verification
- [ ] **All CI/CD workflows passing**
  - Foundation Health Check ✅
  - Security Pipeline ✅
  - Development Pipeline ✅
  - Testing Pipeline ✅
  - Build Pipeline ✅

- [ ] **Test count matches expectations**
  - Backend unit tests: ~1334
  - Integration tests: ~62-64
  - Web tests: ~175
  - Total: ~1571+

- [ ] **No skipped tests without justification**
  - `.skip` or `.only` removed
  - Flaky tests fixed, not disabled
  - Document why tests are intentionally skipped

### Deployment Safety
- [ ] **Feature flags for risky changes**
  - Large refactorings behind flags
  - New integrations can be toggled
  - Rollback plan documented

---

## 🐛 Common Issues to Avoid

Based on incident reports and code reviews:

### RateLimitGuard Anti-Patterns (v0.4.7 Incident)
- ❌ Hardcoded `new Redis()` in constructor
- ❌ `onModuleDestroy()` managing shared resource
- ❌ Integration tests can't mock guard dependencies
- ✅ Use `@Inject('default')` for Redis
- ✅ Let RedisModule manage lifecycle
- ✅ Provide mocks via TestingModule

### Database Connection Leaks
- ❌ Creating connections without cleanup
- ❌ Not using connection pools
- ✅ Use TypeORM DataSource properly
- ✅ Close connections in `afterEach` hooks

### Test Isolation Issues
- ❌ Shared mutable state between tests
- ❌ Tests depending on execution order
- ✅ Reset mocks in `afterEach`
- ✅ Each test creates own test data

---

## 📊 Review Process

### For Reviewers
1. **Read the PR description** - Understand intent
2. **Check CI/CD status** - All green before reviewing code
3. **Review changed files** - Use this checklist
4. **Test locally if needed** - Complex changes warrant local testing
5. **Provide constructive feedback** - Suggest improvements, not just problems
6. **Approve when ready** - All checklist items satisfied

### For Authors
1. **Self-review with this checklist** - Before requesting review
2. **Respond to all comments** - Address or discuss
3. **Update based on feedback** - Make requested changes
4. **Re-request review** - After making changes
5. **Merge when approved** - Squash if needed for clean history

---

## 🔄 Continuous Improvement

This checklist is a living document. When incidents occur or patterns emerge:

1. **Document the issue** - Create incident report
2. **Update checklist** - Add prevention item
3. **Update PR template** - Remind authors
4. **Share learnings** - Team discussion

**Last Incident**: RateLimitGuard DI Issue (v0.4.7)
**Items Added**: Dependency Injection section

---

**Maintained by**: MoneyWise Development Team
**Questions**: See CONTRIBUTING.md or ask in #development

🤖 Generated with [Claude Code](https://claude.com/claude-code)
