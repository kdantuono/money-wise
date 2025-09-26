<!-- .claude/commands/urgent-bugfix.md -->
description: Rapid bug fix with comprehensive testing and validation

# Urgent Bug Fix Workflow

Implements fast, safe bug fixes with automated root cause analysis, testing, and deployment.

## Arguments
Bug description or issue number: $ARGUMENTS

## Phase 1: Rapid Issue Analysis (Auto - <2 minutes)

```bash
# If GitHub issue number provided, fetch details
if [[ "$ARGUMENTS" =~ ^[0-9]+$ ]]; then
  gh issue view "$ARGUMENTS" --json title,body,labels,comments > .claude/bug-context.json
  BUG_TITLE=$(jq -r '.title' .claude/bug-context.json)
  BUG_DESCRIPTION=$(jq -r '.body' .claude/bug-context.json)
else
  BUG_DESCRIPTION="$ARGUMENTS"
fi

# Analyze recent changes that might have caused the bug
git log --oneline --since="3 days ago" --all
git diff HEAD~10..HEAD --stat

# Check error logs and monitoring
grep -r "ERROR\|FATAL\|CRASH" logs/ 2>/dev/null | tail -20

# Search codebase for related code
rg -i "${BUG_DESCRIPTION}" --type ts --type tsx --type js
```

**Automated Root Cause Analysis:**
1. Parse bug description and error messages
2. Identify affected components/files
3. Find recent commits that touched those files
4. Analyze stack traces and logs
5. Determine bug category:
   - **Critical**: Production down, data loss risk
   - **High**: Major functionality broken
   - **Medium**: Feature degraded but workaround exists
   - **Low**: Minor UI issue or edge case

**Severity-Based Routing:**
```yaml
# Auto-determined severity routing
if severity == "critical":
  execution_mode: single_threaded_focus
  validation_level: comprehensive
  deployment_target: production_hotfix
  
elif severity == "high":
  execution_mode: fast_track
  validation_level: targeted
  deployment_target: staging_then_production
  
else:
  execution_mode: standard
  validation_level: full
  deployment_target: standard_deployment
```

## Phase 2: Hotfix Branch Creation (Auto - <30 seconds)

```bash
# Create hotfix branch from production/main
BRANCH_NAME="hotfix/issue-${ARGUMENTS}-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BRANCH_NAME" origin/main

# Or from specific production tag if needed
# git checkout -b "$BRANCH_NAME" v1.2.3

# Verify starting point is stable
pnpm run build
pnpm run test

echo "✅ Hotfix branch created: $BRANCH_NAME"
```

## Phase 3: Bug Reproduction & Test Creation (Auto - <5 minutes)

**Invoke:** `test-specialist`

**Automated Tasks:**
1. **Create Failing Test First (TDD)**
   ```typescript
   // Auto-generated failing test
   describe('Bug: $BUG_TITLE', () => {
     it('should reproduce the reported issue', async () => {
       // Reproduce exact scenario from bug report
       const result = await executeScenario(bugContext);
       
       // This should fail, confirming bug exists
       expect(result).toBe(expectedBehavior);
     });
   });
   ```

2. **Run Test to Confirm Failure**
   ```bash
   pnpm run test -- --testNamePattern="Bug: $BUG_TITLE"
   # Expected: Test fails, confirming bug reproduced
   ```

3. **Document Reproduction Steps**
   ```markdown
   ## Bug Reproduction
   - Steps: [auto-extracted from bug report]
   - Expected: [expected behavior]
   - Actual: [actual behavior]
   - Test: [test file created]
   ```

## Phase 4: Fix Implementation (Auto - <10 minutes)

**Route to Specialist Based on Bug Location:**

### If Backend Bug:
**Invoke:** `backend-specialist`

```bash
cd apps/api
# Analyze affected code
rg -A 5 -B 5 "$BUG_RELATED_CODE"
```

**Automated Fix Strategy:**
1. Identify exact code location causing bug
2. Analyze surrounding code for context
3. Implement minimal fix (avoid scope creep)
4. Add defensive programming (guards, validation)
5. Update error handling if needed
6. Run unit tests continuously

### If Frontend Bug:
**Invoke:** `frontend-specialist`

```bash
cd apps/web
# Analyze affected components
rg -A 5 -B 5 "$BUG_RELATED_CODE"
```

**Automated Fix Strategy:**
1. Locate buggy component/hook
2. Fix logic or state management issue
3. Add null checks and error boundaries
4. Test with various inputs/edge cases
5. Verify accessibility not affected

### If Database Bug:
**Invoke:** `backend-specialist` + `devops-specialist`

**Automated Fix Strategy:**
1. Analyze query performance/correctness
2. Fix query or add missing indexes
3. Create migration if schema change needed
4. Test with production-like data volumes
5. Validate no data loss risk

## Phase 5: Continuous Validation During Fix (Auto)

```bash
# Run tests automatically after each code change
validate_fix_continuously() {
  while true; do
    # Watch for file changes
    if [ "$(git status --short)" != "" ]; then
      echo "Changes detected. Running validation..."
      
      # Run affected tests
      pnpm run test -- --testNamePattern="Bug: $BUG_TITLE"
      
      # Run related unit tests
      pnpm run test -- --findRelatedTests $(git diff --name-only)
      
      # Type check
      pnpm run type-check
      
      # Lint
      pnpm run lint --fix
      
      if [ $? -eq 0 ]; then
        echo "✅ Validation passed"
        git add .
        git commit -m "fix: incremental progress on $BUG_TITLE"
      else
        echo "❌ Validation failed, reverting..."
        git reset --hard HEAD
      fi
    fi
    sleep 2
  done
}
```

## Phase 6: Regression Testing (Auto - <5 minutes)

**Invoke:** `test-specialist`

```bash
# Run comprehensive test suite to ensure no regressions
echo "Running regression tests..."

# 1. Unit tests for affected module
pnpm run test -- apps/api/src/affected-module --coverage

# 2. Integration tests for affected APIs
pnpm run test:integration -- --grep="affected endpoints"

# 3. Related E2E tests
pnpm run test:e2e -- tests/e2e/affected-flow.spec.ts

# 4. Performance regression check
compare_performance() {
  # Measure before fix (on main branch)
  git stash
  git checkout main
  local baseline=$(measure_performance)
  
  # Measure after fix
  git checkout -
  git stash pop
  local current=$(measure_performance)
  
  # Ensure no degradation
  if [ "$current" -gt "$((baseline * 110 / 100))" ]; then
    echo "⚠️ Performance regression detected"
    return 1
  fi
}

compare_performance
```

**Auto-Validation Checklist:**
- [ ] Bug-specific test now passes ✅
- [ ] All related tests pass
- [ ] No new test failures
- [ ] Performance maintained
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Build successful

## Phase 7: Security Impact Analysis (Auto - <3 minutes)

**Invoke:** `security-specialist`

```bash
# Quick security check for the fix
echo "Analyzing security impact..."

# 1. Check if fix touches security-sensitive code
security_sensitive_check() {
  # Authentication/Authorization
  git diff HEAD~1 | grep -i "auth\|token\|password\|session" && {
    echo "⚠️ Security-sensitive code modified. Running deep scan..."
    run_security_audit_on_fix
  }
  
  # Input handling
  git diff HEAD~1 | grep -i "input\|param\|query\|body" && {
    echo "⚠️ Input handling modified. Validating sanitization..."
    check_input_validation
  }
  
  # Database queries
  git diff HEAD~1 | grep -i "query\|sql\|prisma\|db" && {
    echo "⚠️ Database code modified. Checking for injection..."
    check_sql_injection_risk
  }
}

security_sensitive_check

# 2. Run security scan on changed files
pnpm audit
pnpm run security:scan -- --files-changed

# 3. Verify no new vulnerabilities introduced
echo "✅ Security validated"
```

## Phase 8: Staging Deployment & Smoke Test (Auto - <5 minutes)

```bash
# Deploy to staging for final validation
echo "Deploying to staging..."

# Build production bundle
pnpm run build

# Deploy to staging environment
if [ "$SEVERITY" = "critical" ]; then
  # Critical bugs: Deploy to isolated staging slot
  deploy_to_staging_slot "hotfix-$(date +%s)"
else
  # Normal staging deployment
  deploy_to_staging
fi

# Wait for deployment
wait_for_deployment_ready

# Automated smoke tests
run_smoke_tests() {
  # 1. Health check
  curl -f https://staging.myapp.com/health || return 1
  
  # 2. Critical paths
  pnpm run test:smoke -- --env=staging
  
  # 3. Bug-specific verification
  verify_bug_fixed_in_staging
  
  # 4. Monitor errors for 2 minutes
  monitor_staging_errors --duration=2m
}

run_smoke_tests || {
  echo "❌ Staging validation failed. Rolling back..."
  rollback_staging_deployment
  exit 1
}

echo "✅ Staging validation successful"
```

## Phase 9: Production Deployment (Auto or Approval-Based)

```yaml
# Deployment strategy based on severity
deployment_strategy:
  critical:
    type: immediate_hotfix
    approval: auto_approved
    rollback: automatic_on_error
    
  high:
    type: fast_track
    approval: single_approval_required
    rollback: automatic_on_error
    
  medium/low:
    type: standard_release
    approval: standard_process
    rollback: manual
```

```bash
# For critical bugs: Auto-deploy to production
if [ "$SEVERITY" = "critical" ]; then
  echo "🚨 Critical bug fix - Auto-deploying to production..."
  
  # Blue-green deployment for zero downtime
  deploy_to_production_blue_green() {
    # Deploy to blue environment
    deploy_to_slot "production-blue"
    
    # Verify health
    verify_production_health "production-blue" || {
      echo "❌ Health check failed on blue"
      return 1
    }
    
    # Switch traffic (gradual rollout)
    switch_traffic_gradually "production-blue" || {
      echo "❌ Traffic switch failed, rolling back..."
      rollback_traffic
      return 1
    }
    
    # Monitor for errors (5 minutes)
    monitor_production_errors --duration=5m --threshold=0.01 || {
      echo "❌ Error rate elevated, rolling back..."
      rollback_traffic
      return 1
    }
    
    echo "✅ Production deployment successful"
  }
  
  deploy_to_production_blue_green
else
  echo "Creating deployment PR for approval..."
  # Create PR for normal deployment process
fi
```

## Phase 10: Post-Deployment Monitoring (Auto - 15 minutes)

```bash
# Automated monitoring after deployment
monitor_production() {
  local start_time=$(date +%s)
  local duration=900  # 15 minutes
  
  while [ $(($(date +%s) - start_time)) -lt $duration ]; do
    # Check error rate
    local error_rate=$(get_error_rate)
    if (( $(echo "$error_rate > 0.01" | bc -l) )); then
      echo "🚨 Elevated error rate: $error_rate"
      trigger_rollback
      break
    fi
    
    # Check performance
    local p95_latency=$(get_p95_latency)
    if (( $(echo "$p95_latency > 1000" | bc -l) )); then
      echo "⚠️ Performance degradation detected"
      alert_team
    fi
    
    # Check specific bug is fixed
    verify_bug_fixed_in_production || {
      echo "❌ Bug still present in production"
      trigger_rollback
      break
    }
    
    sleep 30
  done
  
  echo "✅ Monitoring complete. Deployment stable."
}

monitor_production
```

## Phase 11: Documentation & Communication (Auto)

```bash
# Auto-generate bug fix documentation
cat > .claude/HOTFIX_REPORT.md <<EOF
# Hotfix Report: $BUG_TITLE

## Bug Summary
- **Issue**: $ARGUMENTS
- **Severity**: $SEVERITY
- **Root Cause**: [auto-identified cause]
- **Fix Applied**: [description of fix]

## Timeline
- Reported: [timestamp]
- Analysis: [duration]
- Fix Implemented: [duration]
- Deployed to Staging: [timestamp]
- Deployed to Production: [timestamp]
- Total Resolution Time: [total duration]

## Testing
- Bug Reproduction Test: ✅ Created and validated
- Unit Tests: ✅ All passing
- Integration Tests: ✅ No regressions
- E2E Tests: ✅ Critical paths validated
- Security: ✅ No vulnerabilities introduced

## Deployment
- Staging: ✅ Deployed and validated
- Production: ✅ Deployed successfully
- Monitoring: ✅ No issues detected (15 min)

## Prevention
- Added test coverage for this scenario
- Improved error handling in affected code
- Added monitoring alerts for similar issues

## Related PRs
- Hotfix PR: #[auto-created PR number]
- Test PR: #[auto-created PR number]
EOF

# Notify team
notify_team_of_hotfix "$BUG_TITLE"

# Update issue status
if [[ "$ARGUMENTS" =~ ^[0-9]+$ ]]; then
  gh issue comment "$ARGUMENTS" --body "$(cat .claude/HOTFIX_REPORT.md)"
  gh issue close "$ARGUMENTS"
fi
```

## Phase 12: Commit & PR (Auto)

```bash
# Commit fix with detailed information
git add .
git commit -m "fix($SEVERITY): $BUG_TITLE

Root Cause: [auto-identified]
Fix: [description]

- Added test to reproduce bug
- Implemented minimal fix
- Validated no regressions
- Deployed to production

Resolves #$ARGUMENTS

Testing:
✅ Bug-specific test passes
✅ All related tests pass  
✅ No performance regression
✅ Security validated
✅ Production deployment successful

Monitoring:
✅ Error rate normal
✅ Performance normal
✅ Bug confirmed fixed

Co-Authored-By: test-specialist <orchestrator@claude.ai>
Co-Authored-By: security-specialist <orchestrator@claude.ai>"

# Push
git push -u origin "$BRANCH_NAME"

# Create PR (for documentation purposes)
gh pr create \
  --title "fix($SEVERITY): $BUG_TITLE" \
  --body "$(cat .claude/HOTFIX_REPORT.md)" \
  --label "hotfix,$SEVERITY,deployed" \
  --assignee @me

# Merge immediately if critical
if [ "$SEVERITY" = "critical" ]; then
  gh pr merge --auto --squash
fi
```

## Rollback Procedure (Auto - If Needed)

```bash
# Automatic rollback on failure
emergency_rollback() {
  echo "🚨 Initiating emergency rollback..."
  
  # 1. Revert production deployment
  revert_production_deployment
  
  # 2. Verify old version stable
  verify_production_health "previous-version"
  
  # 3. Notify team
  alert_team_rollback_occurred
  
  # 4. Create incident report
  create_incident_report
  
  echo "✅ Rollback complete"
}
```

## Success Metrics (Auto-Reported)

```markdown
# Bug Fix Success Report

## Resolution Metrics
- 🎯 Total Time to Resolution: [X] minutes
- ⚡ Time to Production: [X] minutes
- ✅ Zero Regressions
- 🔒 Security Validated

## Testing Coverage
- Bug Reproduction: ✅ Test added
- Unit Tests: [passed/total]
- Integration Tests: [passed/total]
- E2E Tests: [passed/total]

## Deployment Status
- Staging: ✅ Deployed & validated
- Production: ✅ Deployed successfully
- Monitoring: ✅ Stable for 15+ minutes

## Prevention Measures
- Test coverage improved
- Monitoring alerts added
- Documentation updated
```

---

**CRITICAL: This workflow prioritizes speed for urgent bugs while maintaining safety through automated testing and monitoring. Rollback is automatic on any production issues.**