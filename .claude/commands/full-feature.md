<!-- .claude/commands/full-feature.md -->
description: End-to-end feature implementation with orchestrated agent coordination

# Complete Feature Development Workflow

Implements a complete feature from requirements to production-ready code using orchestrated multi-agent automation.

## Arguments
Feature specification: $ARGUMENTS

## Phase 1: Requirement Analysis & Planning (Auto)

```bash
# Analyze monorepo structure and current state
RUN `find apps packages services -type d -maxdepth 2`
RUN `git log --oneline -n 10`
RUN `pnpm ls --depth=0 --json`
```

**Automatic Analysis:**
1. Parse feature specification and extract technical requirements
2. Identify affected monorepo packages (apps/web, apps/api, packages/*)
3. Determine agent assignments and execution strategy
4. Map dependencies between components
5. Generate implementation plan with task breakdown

**Output Plan Structure:**
```yaml
feature: [Feature Name]
affected_packages:
  - apps/api (backend)
  - apps/web (frontend)
  - packages/shared (types/utilities)

execution_strategy: sequential_with_parallel_sections

task_breakdown:
  phase_1_backend:
    agent: backend-specialist
    tasks:
      - Design API endpoints
      - Create database schema/migrations
      - Implement business logic
      - Add input validation
      - Write unit tests
    dependencies: []
    
  phase_2_frontend:
    agent: frontend-specialist  
    tasks:
      - Create UI components
      - Implement state management
      - Integrate with API
      - Add loading/error states
      - Write component tests
    dependencies: [phase_1_backend]
    
  phase_3_integration:
    agent: test-specialist
    tasks:
      - Create E2E tests
      - Test complete user flows
      - Validate edge cases
      - Performance testing
    dependencies: [phase_1_backend, phase_2_frontend]
    
  phase_4_security:
    agent: security-specialist
    tasks:
      - Security audit
      - Vulnerability scan
      - Input validation review
      - Authorization checks
    dependencies: [phase_1_backend, phase_2_frontend]
```

## Phase 2: Backend Implementation (Auto)

**Invoke:** `backend-specialist`

**Execution Context:**
```bash
cd apps/api
pnpm install
```

**Automated Tasks:**
1. **API Design**
   - Define RESTful endpoints or GraphQL schema
   - Create request/response types (TypeScript)
   - Define validation schemas (Zod)
   - Document with OpenAPI/Swagger

2. **Database Layer**
   - Create Prisma schema or TypeORM entities
   - Generate and test migrations
   - Add indexes for performance
   - Implement repository pattern

3. **Business Logic**
   - Implement service layer with business rules
   - Add error handling and logging
   - Implement caching strategy (Redis)
   - Add rate limiting

4. **Testing**
   - Unit tests for services (Jest)
   - Integration tests for API endpoints (Supertest)
   - Mock external dependencies
   - Achieve 80%+ coverage

**Auto-Validation:**
```bash
pnpm run --filter=@myapp/api lint
pnpm run --filter=@myapp/api type-check
pnpm run --filter=@myapp/api test
pnpm run --filter=@myapp/api build
```

## Phase 3: Frontend Implementation (Auto)

**Invoke:** `frontend-specialist`

**Execution Context:**
```bash
cd apps/web
pnpm install
```

**Automated Tasks:**
1. **Component Development**
   - Create React components with TypeScript
   - Implement responsive design (Tailwind)
   - Add loading skeletons
   - Implement error boundaries

2. **State Management**
   - Set up API integration (React Query/SWR)
   - Implement optimistic updates
   - Add client-side caching
   - Handle error states

3. **Accessibility**
   - Semantic HTML structure
   - ARIA labels and roles
   - Keyboard navigation
   - Screen reader support

4. **Testing**
   - Component tests (React Testing Library)
   - Integration tests for user flows
   - Visual regression tests
   - Accessibility tests (axe-core)

**Auto-Validation:**
```bash
pnpm run --filter=@myapp/web lint
pnpm run --filter=@myapp/web type-check
pnpm run --filter=@myapp/web test
pnpm run --filter=@myapp/web build
```

## Phase 4: Shared Packages Update (Parallel - If Needed)

**Invoke:** `backend-specialist` + `frontend-specialist` (parallel)

**Execution Context:**
```bash
# Create parallel worktrees for shared package updates
git worktree add .claude/worktrees/shared-types -b temp/shared-types
cd .claude/worktrees/shared-types/packages/shared
```

**Automated Tasks:**
1. Update TypeScript types/interfaces
2. Add utility functions if needed
3. Update package version
4. Run tests across dependent packages
5. Build and verify no breaking changes

## Phase 5: End-to-End Testing (Auto)

**Invoke:** `test-specialist`

**Execution Context:**
```bash
cd apps/web
pnpm install
```

**Automated Tasks:**
1. **E2E Test Creation**
   - Write Playwright tests for complete user flows
   - Test critical paths (happy path + edge cases)
   - Cross-browser testing (Chromium, Firefox, WebKit)
   - Mobile responsive testing

2. **Test Execution**
   ```bash
   pnpm run test:e2e --project=chromium
   pnpm run test:e2e --project=firefox
   pnpm run test:e2e --project=webkit
   ```

3. **Performance Testing**
   - Measure Core Web Vitals
   - API response time benchmarks
   - Load testing (Artillery)
   - Memory leak detection

**Auto-Validation:**
- All E2E tests pass
- Performance benchmarks met (LCP <2.5s, FID <100ms, CLS <0.1)
- No console errors during tests
- Visual regression tests pass

## Phase 6: Security Audit (Auto)

**Invoke:** `security-specialist`

**Automated Tasks:**
1. **Dependency Audit**
   ```bash
   pnpm audit --audit-level=high
   pnpm run security:scan
   ```

2. **Code Security Review**
   - Input validation check
   - SQL injection prevention
   - XSS vulnerability scan
   - CSRF protection verification
   - Authentication/authorization review

3. **OWASP Top 10 Validation**
   - Run automated security tests
   - Check security headers
   - Verify encryption (at rest/in transit)
   - Review error message exposure

4. **Auto-Fix Security Issues**
   - Update vulnerable dependencies
   - Add missing security headers
   - Fix detected vulnerabilities
   - Apply security best practices

**Auto-Validation:**
- No high/critical vulnerabilities
- All security tests pass
- Security headers configured
- Secrets not exposed

## Phase 7: Documentation (Auto)

**Invoke:** `backend-specialist` + `frontend-specialist`

**Automated Tasks:**
1. **API Documentation**
   - Generate OpenAPI/Swagger docs
   - Add endpoint examples
   - Document authentication
   - Add rate limiting info

2. **Component Documentation**
   - Generate Storybook stories
   - Add usage examples
   - Document props/types
   - Add accessibility notes

3. **Integration Guides**
   - Update README files
   - Add migration guides (if breaking changes)
   - Document environment variables
   - Add troubleshooting section

## Phase 8: Integration & Deployment Prep (Auto)

```bash
# Ensure all packages build together
pnpm run build --recursive

# Run full test suite
pnpm run test --recursive

# Run E2E tests
pnpm run test:e2e

# Generate coverage report
pnpm run test:coverage

# Build production bundles
pnpm run build:prod

# Generate deployment artifacts
pnpm run package
```

**Auto-Validation Checklist:**
- [ ] All tests pass (unit, integration, E2E)
- [ ] Build successful for all packages
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Coverage meets threshold (80%+)
- [ ] Security scan clean
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] No breaking changes (or documented)

## Phase 9: Commit & PR Creation (Auto)

```bash
# Stage all changes
git add .

# Generate comprehensive commit message
git commit -m "feat: [Feature Name]

## Implementation Summary
- Backend: [List of changes]
- Frontend: [List of changes]
- Tests: [Coverage stats]
- Security: [Audit results]

## Affected Packages
- apps/api
- apps/web
- packages/shared

## Performance Impact
- Bundle size: [change]
- API response time: [benchmark]
- LCP: [metric]

## Breaking Changes
- [None / List of breaking changes]

Co-Authored-By: backend-specialist <orchestrator@claude.ai>
Co-Authored-By: frontend-specialist <orchestrator@claude.ai>
Co-Authored-By: test-specialist <orchestrator@claude.ai>
Co-Authored-By: security-specialist <orchestrator@claude.ai>"

# Push to remote
git push -u origin $(git branch --show-current)

# Create PR with comprehensive details
gh pr create \
  --title "feat: [Feature Name]" \
  --body "$(cat <<EOF
## 🎯 Feature Overview
[Feature description from $ARGUMENTS]

## 📦 Changes by Package
### Backend (apps/api)
- [List of changes]

### Frontend (apps/web)
- [List of changes]

### Shared (packages/shared)
- [List of changes]

## ✅ Testing
- Unit Tests: [passed/total] ✅
- Integration Tests: [passed/total] ✅
- E2E Tests: [passed/total] ✅
- Coverage: [percentage]% ✅

## 🔒 Security
- Dependency Audit: ✅ Clean
- Security Scan: ✅ No issues
- OWASP Top 10: ✅ Validated

## ⚡ Performance
- Bundle Size: [size] ([change from baseline])
- LCP: [metric] ✅
- API Response Time: [p95] ✅

## 📚 Documentation
- [x] API documentation updated
- [x] Component documentation added
- [x] README updated
- [x] Migration guide (if needed)

## 🚀 Deployment Checklist
- [x] All tests passing
- [x] Security validated
- [x] Performance benchmarks met
- [x] Documentation complete
- [ ] Staging deployment verified
- [ ] Production deployment ready
EOF
)" \
  --assignee @me \
  --label "feature,ready-for-review,auto-generated"

# Output PR URL
gh pr view --web
```

## Success Metrics

**Automated Success Report:**
```markdown
# Feature Implementation Report

## Execution Summary
- ⏱️ Duration: [time]
- 👥 Agents Involved: 4 (backend, frontend, test, security)
- 📝 Files Changed: [count]
- ✅ Tests Added: [count]

## Quality Metrics
- Coverage: [percentage]%
- Security: ✅ Clean
- Performance: ✅ Met all benchmarks
- Accessibility: ✅ WCAG 2.1 AA compliant

## Next Steps (Auto-Scheduled)
- [ ] Merge to develop branch
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production (with approval)
```

---

**IMPORTANT: This workflow executes fully automatically with NO manual confirmations. All validation, testing, and integration happens autonomously. Only critical blockers will halt execution and require intervention.**