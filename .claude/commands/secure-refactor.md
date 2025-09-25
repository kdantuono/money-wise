<!-- .claude/commands/secure-refactor.md -->
description: Safe refactoring with automated testing and security validation

# Secure Refactoring Workflow

Performs comprehensive code refactoring with continuous validation, zero-regression guarantee, and security audit.

## Arguments
Refactoring scope: $ARGUMENTS

## Phase 1: Pre-Refactoring Analysis (Auto)

```bash
# Capture current state baseline
RUN `git rev-parse HEAD > .claude/refactor-baseline.txt`
RUN `pnpm run test --coverage --json > .claude/coverage-before.json`
RUN `pnpm run build --dry-run`
RUN `pnpm ls --depth=0 --json > .claude/deps-before.json`

# Analyze affected code
RUN `find . -name "*.ts" -o -name "*.tsx" | wc -l`
RUN `git log --oneline --since="1 month ago" -- $AFFECTED_FILES`
```

**Automated Analysis:**
1. Identify all files in refactoring scope
2. Detect dependencies and imports
3. Find all test files related to scope
4. Map public API surface area
5. Detect potential breaking changes
6. Generate refactoring safety plan

**Safety Plan Output:**
```yaml
refactoring_scope: $ARGUMENTS
affected_packages:
  - [list of monorepo packages]
  
risk_assessment:
  breaking_changes: [low/medium/high]
  test_coverage: [percentage]%
  external_dependencies: [list]
  
refactoring_strategy:
  approach: [incremental/comprehensive]
  parallel_tracks: [number]
  rollback_points: [list]
  
validation_strategy:
  - Capture test baseline
  - Run tests after each change
  - Compare performance benchmarks
  - Validate no behavior changes
  - Security scan for new vulnerabilities
```

## Phase 2: Test Baseline Capture (Auto)

**Invoke:** `test-specialist`

```bash
# Create comprehensive test baseline
echo "Capturing test baseline..."

# Run all test suites
pnpm run test:unit --coverage --json > .claude/tests-baseline-unit.json
pnpm run test:integration --json > .claude/tests-baseline-integration.json
pnpm run test:e2e --json > .claude/tests-baseline-e2e.json

# Performance baseline
pnpm run test:performance --json > .claude/perf-baseline.json

# Capture snapshots
pnpm run test -u
git add -A
git commit -m "test: capture baseline snapshots before refactoring"

# Security baseline
pnpm audit --json > .claude/security-baseline.json
```

**Baseline Validation:**
- All tests currently passing: ✅
- Coverage percentage: [X]%
- Performance benchmarks: [recorded]
- Security issues: [count]

## Phase 3: Incremental Refactoring (Auto)

**Execution Strategy:**
- **If risk=low**: Single comprehensive refactoring
- **If risk=medium**: 3-5 incremental steps with validation
- **If risk=high**: 10+ micro-refactorings with continuous validation

### Refactoring Patterns (Automated)

#### Pattern 1: Extract Function/Module
```typescript
// Auto-refactoring: Extract reusable logic
// BEFORE: Duplicated code in multiple files
// AFTER: Centralized utility function

// Agent automatically:
// 1. Identifies duplicated code patterns
// 2. Extracts to shared utility
// 3. Updates all call sites
// 4. Runs tests to verify behavior unchanged
```

#### Pattern 2: Type System Improvement
```typescript
// Auto-refactoring: Strengthen types
// BEFORE: any, unknown types
// AFTER: Strict TypeScript types

// Agent automatically:
// 1. Analyzes data flow
// 2. Infers precise types
// 3. Adds type guards
// 4. Validates with tsc --strict
```

#### Pattern 3: Architectural Patterns
```typescript
// Auto-refactoring: Apply design patterns
// BEFORE: Tightly coupled code
// AFTER: Dependency injection, interfaces

// Agent automatically:
// 1. Identifies coupling points
// 2. Introduces abstractions
// 3. Applies SOLID principles
// 4. Maintains behavior compatibility
```

### Parallel Refactoring Tracks (For Low-Risk Changes)

**Track 1: Backend Refactoring**
```bash
# Create worktree
git worktree add .claude/worktrees/refactor-backend -b temp/refactor-backend

cd .claude/worktrees/refactor-backend
```

**Invoke:** `backend-specialist`

**Automated Tasks:**
1. Refactor services layer
2. Improve error handling
3. Optimize database queries
4. Clean up unused code
5. Run tests after each change

**Track 2: Frontend Refactoring**
```bash
# Create worktree
git worktree add .claude/worktrees/refactor-frontend -b temp/refactor-frontend

cd .claude/worktrees/refactor-frontend
```

**Invoke:** `frontend-specialist`

**Automated Tasks:**
1. Refactor React components
2. Improve state management
3. Optimize re-renders
4. Extract reusable hooks
5. Run tests after each change

**Track 3: Test Refactoring**
```bash
# Create worktree
git worktree add .claude/worktrees/refactor-tests -b temp/refactor-tests

cd .claude/worktrees/refactor-tests
```

**Invoke:** `test-specialist`

**Automated Tasks:**
1. Improve test coverage
2. Remove flaky tests
3. Add missing edge cases
4. Optimize test performance
5. Validate all tests pass

## Phase 4: Continuous Validation (Auto)

**After Each Refactoring Step:**

```bash
validate_refactoring_step() {
  local step_name=$1
  
  echo "Validating refactoring step: $step_name"
  
  # 1. Type checking
  pnpm run type-check || {
    echo "❌ Type check failed"
    rollback_step "$step_name"
    return 1
  }
  
  # 2. Linting
  pnpm run lint || {
    echo "❌ Lint failed"
    rollback_step "$step_name"
    return 1
  }
  
  # 3. Unit tests
  pnpm run test:unit || {
    echo "❌ Unit tests failed"
    rollback_step "$step_name"
    return 1
  }
  
  # 4. Integration tests
  pnpm run test:integration || {
    echo "❌ Integration tests failed"
    rollback_step "$step_name"
    return 1
  }
  
  # 5. Build verification
  pnpm run build || {
    echo "❌ Build failed"
    rollback_step "$step_name"
    return 1
  }
  
  # 6. Compare with baseline
  compare_with_baseline "$step_name" || {
    echo "❌ Baseline validation failed"
    rollback_step "$step_name"
    return 1
  }
  
  echo "✅ Step validated successfully"
  git add .
  git commit -m "refactor($step_name): validated and committed"
}

compare_with_baseline() {
  local step_name=$1
  
  # Compare test results
  local baseline_tests=$(jq '.numTotalTests' .claude/tests-baseline-unit.json)
  local current_tests=$(pnpm run test:unit --json | jq '.numTotalTests')
  
  if [ "$current_tests" -lt "$baseline_tests" ]; then
    echo "❌ Test count decreased: $baseline_tests -> $current_tests"
    return 1
  fi
  
  # Compare coverage
  local baseline_coverage=$(jq '.total.lines.pct' .claude/coverage-before.json)
  local current_coverage=$(pnpm run test:coverage --json | jq '.total.lines.pct')
  
  if (( $(echo "$current_coverage < $baseline_coverage" | bc -l) )); then
    echo "⚠️ Coverage decreased: $baseline_coverage% -> $current_coverage%"
    # Allow small decrease (< 2%) but warn
    if (( $(echo "$baseline_coverage - $current_coverage > 2" | bc -l) )); then
      return 1
    fi
  fi
  
  # Compare performance (if available)
  if [ -f ".claude/perf-baseline.json" ]; then
    compare_performance_metrics
  fi
  
  return 0
}

rollback_step() {
  local step_name=$1
  echo "⏪ Rolling back step: $step_name"
  git reset --hard HEAD^
  git clean -fd
}
```

## Phase 5: Security Validation (Auto)

**Invoke:** `security-specialist`

```bash
# Run comprehensive security audit after refactoring
echo "Running security validation..."

# 1. Dependency audit
pnpm audit --audit-level=moderate
pnpm outdated

# 2. Security scan
pnpm run security:scan

# 3. Code security analysis
security_analyze_refactored_code() {
  # Check for new attack surfaces
  # Validate input sanitization unchanged
  # Verify authentication/authorization logic
  # Check for new information leaks
}

# 4. Compare with security baseline
diff_security_state() {
  local baseline_vulns=$(jq '.metadata.vulnerabilities.total' .claude/security-baseline.json)
  local current_vulns=$(pnpm audit --json | jq '.metadata.vulnerabilities.total')
  
  if [ "$current_vulns" -gt "$baseline_vulns" ]; then
    echo "❌ New security vulnerabilities introduced!"
    echo "Baseline: $baseline_vulns | Current: $current_vulns"
    return 1
  fi
  
  echo "✅ Security state maintained or improved"
  return 0
}

diff_security_state || {
  echo "Refactoring introduced security issues. Investigating..."
  # Auto-fix if possible
  fix_security_issues_automatically
}
```

## Phase 6: Performance Validation (Auto)

**Invoke:** `test-specialist`

```bash
# Compare performance metrics
echo "Validating performance impact..."

# Run performance benchmarks
pnpm run test:performance --json > .claude/perf-after.json

# Compare key metrics
compare_performance() {
  # API response times
  local baseline_p95=$(jq '.api.p95' .claude/perf-baseline.json)
  local current_p95=$(jq '.api.p95' .claude/perf-after.json)
  
  # Frontend metrics
  local baseline_lcp=$(jq '.frontend.lcp' .claude/perf-baseline.json)
  local current_lcp=$(jq '.frontend.lcp' .claude/perf-after.json)
  
  # Bundle size
  local baseline_bundle=$(jq '.bundle.size' .claude/perf-baseline.json)
  local current_bundle=$(jq '.bundle.size' .claude/perf-after.json)
  
  # Validate no regression (allow 5% tolerance)
  validate_metric "API p95" "$baseline_p95" "$current_p95" 1.05
  validate_metric "LCP" "$baseline_lcp" "$current_lcp" 1.05
  validate_metric "Bundle" "$baseline_bundle" "$current_bundle" 1.05
}

validate_metric() {
  local name=$1
  local baseline=$2
  local current=$3
  local threshold=$4
  
  if (( $(echo "$current > $baseline * $threshold" | bc -l) )); then
    echo "⚠️ $name regressed: $baseline -> $current"
    return 1
  else
    echo "✅ $name: $baseline -> $current (OK)"
    return 0
  fi
}

compare_performance
```

## Phase 7: Integration & Final Validation (Auto)

```bash
# Merge all refactoring tracks
echo "Integrating refactoring changes..."

# Switch back to main branch
cd "$ORIGINAL_DIR"

# Merge all temporary branches
for branch in temp/refactor-backend temp/refactor-frontend temp/refactor-tests; do
  git merge "$branch" --no-edit || {
    # Auto-resolve conflicts intelligently
    auto_resolve_refactor_conflicts "$branch"
    git add .
    git commit -m "refactor: merge $branch with conflict resolution"
  }
done

# Final comprehensive validation
echo "Running final validation suite..."

# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Full build
pnpm run build --recursive

# 3. All tests
pnpm run test --recursive

# 4. E2E tests
pnpm run test:e2e

# 5. Performance validation
pnpm run test:performance

# 6. Security audit
pnpm audit

# 7. Coverage check
pnpm run test:coverage

# Generate refactoring report
generate_refactoring_report
```

## Phase 8: Documentation Update (Auto)

**Invoke:** `backend-specialist` + `frontend-specialist`

```bash
# Auto-update documentation to reflect refactoring
update_documentation() {
  # 1. Update inline code documentation
  # 2. Update API documentation
  # 3. Update architecture diagrams
  # 4. Add migration guide if needed
  # 5. Update CHANGELOG.md
}

# Generate refactoring summary
cat > .claude/REFACTORING_SUMMARY.md <<EOF
# Refactoring Summary: $ARGUMENTS

## Changes Made
- [List of refactored components]
- [Architectural improvements]
- [Code quality improvements]

## Validation Results
- Tests: All passing ✅
- Coverage: [before]% → [after]%
- Performance: No regression ✅
- Security: No new issues ✅

## Breaking Changes
- [None / List of breaking changes]

## Migration Guide
- [Steps for dependent code if needed]
EOF
```

## Phase 9: Commit & PR (Auto)

```bash
# Commit with detailed refactoring info
git add .
git commit -m "refactor: $ARGUMENTS

## Refactoring Summary
- Improved code maintainability
- Enhanced type safety
- Optimized performance
- Maintained 100% backward compatibility

## Validation Results
✅ All tests passing (100%)
✅ Coverage maintained: [percentage]%
✅ Performance: No regression
✅ Security: No new vulnerabilities
✅ Build successful

## Files Changed: [count]
- Backend: [files]
- Frontend: [files]
- Tests: [files]

Co-Authored-By: backend-specialist <orchestrator@claude.ai>
Co-Authored-By: frontend-specialist <orchestrator@claude.ai>
Co-Authored-By: test-specialist <orchestrator@claude.ai>
Co-Authored-By: security-specialist <orchestrator@claude.ai>"

# Push
git push -u origin $(git branch --show-current)

# Create PR
gh pr create \
  --title "refactor: $ARGUMENTS" \
  --body "$(cat .claude/REFACTORING_SUMMARY.md)" \
  --label "refactoring,safe-merge,zero-regression" \
  --assignee @me

# Cleanup worktrees
git worktree remove .claude/worktrees/refactor-backend
git worktree remove .claude/worktrees/refactor-frontend  
git worktree remove .claude/worktrees/refactor-tests
```

## Rollback Strategy (Auto - If Needed)

```bash
# If any critical issue detected, automatic rollback
emergency_rollback() {
  echo "🚨 Critical issue detected. Initiating rollback..."
  
  # Restore from baseline
  local baseline=$(cat .claude/refactor-baseline.txt)
  git reset --hard "$baseline"
  git clean -fd
  
  # Verify restoration
  pnpm run test
  
  echo "✅ Rollback complete. System restored to baseline."
}
```

## Success Report (Auto-Generated)

```markdown
# Secure Refactoring Report

## Summary
- 🎯 Scope: $ARGUMENTS
- ⏱️ Duration: [time]
- 📝 Files Refactored: [count]
- ✅ Zero Regressions

## Quality Improvements
- Code Quality: [metric]
- Type Safety: [improved areas]
- Test Coverage: [before]% → [after]%
- Performance: [improvements]

## Validation Results
- ✅ All tests passing
- ✅ Coverage maintained/improved
- ✅ Performance maintained/improved
- ✅ Security validated
- ✅ Build successful

## Risk Assessment
- Risk Level: [low/medium/high]
- Mitigation: [strategies applied]
- Rollback: [available/tested]
```

---

**CRITICAL: This workflow prioritizes safety above all. Every step is validated before proceeding. Automatic rollback occurs on any regression.**