# Progressive Merge Protocol

## Overview
Defines the strategy for merging task branches progressively up to main.

## Merge Hierarchy
```
task/* → story/* → epic/* → dev → main
```

## Merge Rules

### Task → Story Merge
```yaml
Trigger: Task marked complete
Pre-conditions:
  - All task tests passing
  - Code coverage met (>85%)
  - No linting errors
  
Process:
  1. Run task-level validation
  2. Create merge commit (no squash)
  3. Run story-level integration tests
  4. If pass: Delete task branch
  5. If fail: Rollback and alert
  
Commit Message:
  feat(scope): merge task/[id] into story/[id]
  
  Task: [description]
  Points: [X]
  Duration: [time]
  
  Co-authored-by: [agent] <agent@moneywise.ai>
```

### Story → Epic Merge
```yaml
Trigger: All story tasks complete
Pre-conditions:
  - All story integration tests passing
  - API contracts validated
  - Database migrations tested
  
Process:
  1. Verify all tasks merged
  2. Run full story test suite
  3. Check for conflicts with other stories
  4. Merge with epic branch
  5. Run epic-level E2E tests
  
Rollback Strategy:
  - Keep story branch for 24h after merge
  - Quick revert if issues found
```

### Epic → Dev Merge
```yaml
Trigger: All epic stories complete
Pre-conditions:
  - Full E2E test suite passing
  - Performance benchmarks met
  - Security scan clean
  - Documentation updated
  
Process:
  1. Create PR for review
  2. Run complete test suite
  3. Deploy to staging
  4. Run smoke tests
  5. Merge to dev
  
Quality Gates:
  - Test coverage >85%
  - No critical vulnerabilities
  - Performance within 10% of baseline
  - All breaking changes documented
```

### Dev → Main Merge
```yaml
Trigger: Release ready
Pre-conditions:
  - Dev branch stable for 24h
  - All staging tests passing
  - Product owner approval
  - Rollback plan prepared
  
Process:
  1. Create release PR
  2. Run production validation
  3. Tag release version
  4. Merge to main
  5. Deploy to production
  6. Run production smoke tests
  
Post-merge:
  - Monitor error rates
  - Check performance metrics
  - Validate critical flows
```

## Conflict Resolution

### Automatic Resolution
```yaml
Auto-resolvable:
  - package-lock.json: Regenerate
  - Generated files: Rebuild
  - Whitespace: Format and accept
  - Import order: Sort and accept
  
Process:
  1. Detect conflict type
  2. Apply resolution strategy
  3. Validate resolution
  4. Continue merge
```

### Semi-Automatic Resolution
```yaml
Requires confirmation:
  - Simple logic conflicts
  - Non-breaking API changes
  - Database migration order
  
Process:
  1. AI suggests resolution
  2. Human reviews suggestion
  3. Confirm or modify
  4. Apply and validate
```

### Manual Resolution Required
```yaml
Must escalate:
  - Business logic conflicts
  - Breaking API changes
  - Complex migration conflicts
  - Security-sensitive code
  
Process:
  1. Pause merge
  2. Alert developers
  3. Provide conflict analysis
  4. Wait for manual resolution
  5. Resume after fix
```

## Rollback Procedures

### Immediate Rollback (Critical)
```bash
# For critical issues in production
git revert -m 1 HEAD --no-edit
git push origin main
# Deploy reverted version immediately
```

### Standard Rollback
```bash
# For non-critical issues
git checkout -b rollback/[issue]
git revert [merge-commit]
# Test rollback
npm test
# Create PR for rollback
gh pr create --title "Rollback: [issue]"
```

### Checkpoint System
```yaml
Checkpoints created:
  - Before each merge
  - After successful merge
  - Before deployment
  
Retention:
  - Task checkpoints: 1 day
  - Story checkpoints: 3 days
  - Epic checkpoints: 1 week
  - Release checkpoints: Forever
```

## Merge Validation

### Pre-merge Checks
```bash
#!/bin/bash
# Run before any merge
validate_merge() {
  npm run lint || return 1
  npm run type-check || return 1
  npm run test || return 1
  npm run build || return 1
  npm audit --audit-level=moderate || return 1
}
```

### Post-merge Validation
```bash
#!/bin/bash
# Run after merge complete
verify_merge() {
  # Check no files left behind
  git status --porcelain
  
  # Verify build works
  npm run build
  
  # Run smoke tests
  npm run test:smoke
  
  # Check for dependency issues
  npm ls
}
```

## Merge Metrics

Track for optimization:
- Time from task complete to story merge
- Number of rollbacks per epic
- Conflict frequency by code area
- Auto-resolution success rate
- Average time to resolve conflicts

## Special Cases

### Hotfix Merges
```yaml
Path: hotfix/* → main → dev
Priority: Immediate
Validation: Minimal (smoke tests only)
```

### Documentation-Only Changes
```yaml
Path: docs/* → main
Validation: Spelling and link checks only
```

### Dependency Updates
```yaml
Path: deps/* → dev
Validation: Full test suite + security scan
Special: Check for breaking changes