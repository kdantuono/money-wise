# Feature Workflow

## Overview
Standard workflow for implementing single features without epic orchestration.

## Feature Types

| Type | Complexity | Duration | Agents | Branch |
|------|------------|----------|--------|--------|
| Simple | Low | <4 hours | 1-2 | feature/* |
| Standard | Medium | 4-8 hours | 2-3 | feature/* |
| Complex | High | 1-2 days | 3-4 | feature/* or epic/* |

## Workflow Phases

## Phase 1: Feature Analysis

### Trigger
```bash
claude "/feature [description]"
# Or
claude "Implement [feature description]"
```

### Analysis Steps
1. **Parse requirements** - Extract functional needs
2. **Identify scope** - Backend, frontend, or full-stack
3. **Assess complexity** - Simple, standard, or complex
4. **Select agents** - Based on scope

### Scope Detection
```yaml
backend_indicators: [API, endpoint, service, database]
frontend_indicators: [UI, component, page, form]
fullstack_indicators: [feature, functionality, system]
```

## Phase 2: Branch Creation

### Naming Convention
```bash
feature/[descriptive-name]
# Examples:
feature/transaction-export
feature/dark-mode
feature/email-notifications
```

### Branch Creation
```bash
git checkout main
git pull origin main
git checkout -b feature/[name]
```

## Phase 3: Implementation

### Backend-Only Feature
```yaml
sequence:
  1. database_specialist: Schema changes if needed
  2. backend_specialist: API implementation
  3. test_specialist: Unit & integration tests
  
validation:
  - API tests pass
  - Swagger docs updated
  - No breaking changes
```

### Frontend-Only Feature
```yaml
sequence:
  1. frontend_specialist: Component implementation
  2. frontend_specialist: State management
  3. test_specialist: Component & E2E tests
  
validation:
  - Component tests pass
  - Accessibility validated
  - Responsive design verified
```

### Full-Stack Feature
```yaml
sequence:
  1. database_specialist: Schema design
  2. backend_specialist: API endpoints
  3. frontend_specialist: UI components
  4. test_specialist: Full test suite
  
parallel_possible:
  - Backend & Frontend after schema done
  - Testing can start per component
```

## Phase 4: Development Standards

### Code Quality
```yaml
required:
  - TypeScript strict mode
  - No any types
  - Proper error handling
  - Input validation
  - Logging configured
  
automated_checks:
  - ESLint pass
  - Prettier formatted
  - Type checking clean
  - Tests passing
```

### Commit Strategy
```bash
# Atomic commits per logical unit
git add src/components/NewComponent.tsx
git commit -m "feat(ui): add NewComponent"

git add src/api/new-endpoint.ts
git commit -m "feat(api): add new endpoint"

git add tests/
git commit -m "test: add feature tests"
```

## Phase 5: Testing

### Test Requirements
```yaml
unit_tests:
  coverage: ">85%"
  location: __tests__/
  framework: Jest
  
integration_tests:
  coverage: "All API endpoints"
  location: tests/integration/
  framework: Supertest
  
e2e_tests:
  coverage: "Critical paths"
  location: tests/e2e/
  framework: Playwright
```

### Test Execution
```bash
# Run all tests
npm test

# Run specific test type
npm run test:unit
npm run test:integration
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Phase 6: Documentation

### Required Documentation
```yaml
code_documentation:
  - JSDoc for public APIs
  - README for complex features
  - Inline comments for logic
  
api_documentation:
  - Swagger/OpenAPI specs
  - Request/response examples
  - Error codes documented
  
user_documentation:
  - Feature description
  - Usage examples
  - Configuration options
```

## Phase 7: Pull Request

### PR Creation
```bash
git push -u origin feature/[name]

gh pr create \
  --title "feat: [description]" \
  --body "$(cat .github/pull_request_template.md)" \
  --assignee @me \
  --label "feature"
```

### PR Template
```markdown
## Description
Brief description of the feature

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing done

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes
```

## Phase 8: Review & Merge

### Review Process
1. **Automated checks** - CI/CD pipeline
2. **Code review** - Team member review
3. **Testing** - Manual verification
4. **Approval** - Required approvals met

### Merge Strategy
```bash
# After approval
git checkout dev
git pull origin dev
git merge --no-ff feature/[name]
git push origin dev

# Delete feature branch
git branch -d feature/[name]
git push origin --delete feature/[name]
```

## Quick Feature Examples

### Example 1: Add CSV Export
```bash
claude "/feature add CSV export for transactions"

# Agents selected: backend, test
# Branch: feature/transaction-csv-export
# Duration: ~3 hours
```

### Example 2: Dark Mode
```bash
claude "/feature implement dark mode toggle"

# Agents selected: frontend, test
# Branch: feature/dark-mode
# Duration: ~4 hours
```

### Example 3: Email Notifications
```bash
claude "/feature add email notifications for budget alerts"

# Agents selected: backend, frontend, test
# Branch: feature/email-notifications
# Duration: ~6 hours
```

## Error Recovery

### Common Issues
| Issue | Solution |
|-------|----------|
| Merge conflicts | Rebase on target branch |
| Test failures | Fix and re-run tests |
| Build errors | Check dependencies |
| Lint errors | Run auto-fix |

### Rollback Procedure
```bash
# If feature causes issues
git revert -m 1 [merge-commit]
git push

# Or reset if not pushed
git reset --hard origin/dev
```

## Best Practices

1. **Keep features small** - Single responsibility
2. **Test early** - Write tests first when possible
3. **Commit often** - Atomic commits
4. **Document as you go** - Don't leave for later
5. **Review your own code** - Before requesting review
6. **Clean up** - Remove debug code and comments
7. **Verify locally** - Test before pushing