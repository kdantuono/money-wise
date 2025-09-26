<!-- .claude/commands/tech-migration.md -->
description: Coordinated technology migration with automated validation and rollback

# Technology Migration Workflow

Orchestrates complex technology migrations across monorepo with parallel execution, comprehensive testing, and zero-downtime deployment.

## Arguments
Migration specification: $ARGUMENTS
(e.g., "Migrate from JavaScript to TypeScript", "Upgrade React 17 to 18", "Migrate REST to GraphQL")

## Phase 1: Migration Planning & Analysis (Auto - <10 minutes)

```bash
# Analyze current tech stack
echo "Analyzing current technology stack..."

# Scan package.json across monorepo
find . -name "package.json" -not -path "*/node_modules/*" -exec jq -r '.dependencies, .devDependencies' {} \;

# Identify affected packages
AFFECTED_PACKAGES=$(analyze_migration_scope "$ARGUMENTS")

# Check codebase statistics
cloc apps packages services --json > .claude/codebase-stats.json

# Analyze dependencies
pnpm list --depth=1 --json > .claude/dependency-tree.json
```

**Automated Migration Analysis:**
```typescript
interface MigrationPlan {
  type: 'language' | 'framework' | 'library' | 'architecture' | 'infrastructure';
  scope: string[];  // Affected packages
  strategy: 'incremental' | 'big_bang' | 'parallel_tracks';
  complexity: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: string;
  risks: Risk[];
  rollbackStrategy: string;
  phases: Phase[];
}

function analyzeMigration(spec: string): MigrationPlan {
  // Parse migration specification
  // Determine migration type and scope
  // Assess complexity and risks
  // Generate phased migration plan
  // Identify breaking changes
  // Plan testing strategy
}
```

**Migration Type Detection & Strategy:**
```yaml
migration_types:
  javascript_to_typescript:
    strategy: incremental_by_package
    validation: tsc_strict_checks
    rollback: revert_tsconfig
    
  react_upgrade:
    strategy: parallel_testing
    validation: concurrent_mode_checks
    rollback: dependency_downgrade
    
  rest_to_graphql:
    strategy: facade_pattern
    validation: dual_api_testing
    rollback: graphql_gateway_disable
    
  database_migration:
    strategy: dual_write_pattern
    validation: data_consistency_checks
    rollback: traffic_switch_back
    
  monolith_to_microservices:
    strategy: strangler_fig_pattern
    validation: integration_testing
    rollback: routing_rollback
```

## Phase 2: Environment Setup & Baseline (Auto)

```bash
# Create migration environment
mkdir -p .claude/migration
mkdir -p .claude/migration/baseline
mkdir -p .claude/migration/reports

# Capture current state baseline
echo "Capturing baseline state..."

# 1. Full test suite baseline
pnpm run test --coverage --json > .claude/migration/baseline/tests.json

# 2. Build verification
pnpm run build --dry-run
du -sh dist packages/*/dist apps/*/dist > .claude/migration/baseline/bundle-sizes.txt

# 3. Performance baseline
pnpm run test:performance --json > .claude/migration/baseline/performance.json

# 4. Dependency snapshot
pnpm list --depth=999 --json > .claude/migration/baseline/dependencies.json

# 5. Type coverage (if TypeScript)
pnpm run type-coverage > .claude/migration/baseline/type-coverage.txt 2>/dev/null || echo "N/A"

# 6. API surface area (if applicable)
extract_public_api > .claude/migration/baseline/api-surface.json

echo "✅ Baseline captured successfully"
```

## Phase 3: Parallel Migration Tracks (Auto)

**Strategy: Simultaneous migration of independent packages**

### Track 1: Core Libraries Migration
**Invoke:** `backend-specialist` + `frontend-specialist`

```bash
# Create worktree for core migration
git worktree add .claude/worktrees/migrate-core -b temp/migrate-core

cd .claude/worktrees/migrate-core
```

**Automated Migration Tasks (Example: JS → TS):**
```typescript
// Auto-migration steps for each file
async function migrateFileToTypeScript(filePath: string) {
  // 1. Rename .js → .ts
  await rename(filePath, filePath.replace('.js', '.ts'));
  
  // 2. Add TypeScript types
  await inferAndAddTypes(filePath);
  
  // 3. Fix type errors iteratively
  await fixTypeErrors(filePath);
  
  // 4. Run tests
  await runTestsForFile(filePath);
  
  // 5. Commit if successful
  if (testsPass) {
    await git.commit(`migrate: convert ${filePath} to TypeScript`);
  }
}

// Parallel processing
const coreFiles = getFilesInScope('packages/shared');
await Promise.all(
  coreFiles.map(file => migrateFileToTypeScript(file))
);
```

### Track 2: Backend Services Migration
**Invoke:** `backend-specialist`

```bash
# Create worktree for backend migration
git worktree add .claude/worktrees/migrate-backend -b temp/migrate-backend

cd .claude/worktrees/migrate-backend/apps/api
```

**Automated Tasks:**
1. Migrate API endpoints
2. Update database queries
3. Refactor middleware
4. Update error handling
5. Migrate tests
6. Validate API contracts unchanged

### Track 3: Frontend Apps Migration
**Invoke:** `frontend-specialist`

```bash
# Create worktree for frontend migration
git worktree add .claude/worktrees/migrate-frontend -b temp/migrate-frontend

cd .claude/worktrees/migrate-frontend/apps/web
```

**Automated Tasks:**
1. Migrate React components
2. Update state management
3. Refactor hooks
4. Update routing
5. Migrate styles
6. Validate UI unchanged

### Track 4: Tests Migration
**Invoke:** `test-specialist`

```bash
# Create worktree for test migration
git worktree add .claude/worktrees/migrate-tests -b temp/migrate-tests

cd .claude/worktrees/migrate-tests
```

**Automated Tasks:**
1. Migrate test files
2. Update test utilities
3. Refactor fixtures
4. Update snapshots
5. Validate coverage maintained

## Phase 4: Incremental Validation (Auto - Continuous)

```bash
# Validate each migration track independently
validate_migration_track() {
  local track=$1
  local worktree=".claude/worktrees/$track"
  
  cd "$worktree"
  
  echo "Validating migration track: $track"
  
  # 1. Type checking (if applicable)
  pnpm run type-check || return 1
  
  # 2. Linting
  pnpm run lint || return 1
  
  # 3. Unit tests
  pnpm run test:unit || return 1
  
  # 4. Integration tests
  pnpm run test:integration || return 1
  
  # 5. Build verification
  pnpm run build || return 1
  
  # 6. Performance check
  compare_performance "$worktree" || return 1
  
  echo "✅ Track $track validated"
  cd "$ORIGINAL_DIR"
}

# Validate all tracks in parallel
for track in migrate-core migrate-backend migrate-frontend migrate-tests; do
  validate_migration_track "$track" &
done
wait

echo "✅ All migration tracks validated"
```

## Phase 5: Integration & Conflict Resolution (Auto)

```bash
# Merge all migration tracks intelligently
echo "Integrating migration changes..."

cd "$ORIGINAL_DIR"

# Create integration branch
git checkout -b "migration/$MIGRATION_NAME"

# Merge tracks with automatic conflict resolution
merge_migration_tracks() {
  local tracks=(
    "temp/migrate-core"
    "temp/migrate-backend"
    "temp/migrate-frontend"
    "temp/migrate-tests"
  )
  
  for track in "${tracks[@]}"; do
    echo "Merging $track..."
    
    git merge "$track" --no-edit || {
      # Auto-resolve migration-specific conflicts
      auto_resolve_migration_conflicts "$track"
      
      git add .
      git commit -m "migration: merge $track with auto-resolution"
    }
  done
}

auto_resolve_migration_conflicts() {
  local track=$1
  
  # Strategy 1: Package.json - prefer newer versions
  if [ -f "package.json" ]; then
    merge_package_json_intelligently
  fi
  
  # Strategy 2: Config files - merge configurations
  for config in tsconfig.json .eslintrc.json; do
    if [ -f "$config" ]; then
      merge_config_intelligently "$config"
    fi
  done
  
  # Strategy 3: Source code - use LLM-powered resolution
  local conflicts=$(git diff --name-only --diff-filter=U)
  for file in $conflicts; do
    resolve_source_conflict_with_llm "$file"
  done
}

merge_migration_tracks
```

## Phase 6: Comprehensive Testing (Auto)

**Invoke:** `test-specialist`

```bash
# Full test suite after integration
echo "Running comprehensive test suite..."

# 1. Install all dependencies
pnpm install --frozen-lockfile

# 2. Build all packages
pnpm run build --recursive

# 3. Type checking (full monorepo)
pnpm run type-check --recursive

# 4. Linting
pnpm run lint --recursive

# 5. Unit tests
pnpm run test:unit --recursive --coverage

# 6. Integration tests
pnpm run test:integration --recursive

# 7. E2E tests (critical paths)
pnpm run test:e2e

# 8. Visual regression tests
pnpm run test:visual

# 9. Performance regression tests
pnpm run test:performance
```

**Automated Comparison with Baseline:**
```bash
compare_with_baseline() {
  echo "Comparing migration results with baseline..."
  
  # Compare test results
  local baseline_passing=$(jq '.numPassedTests' .claude/migration/baseline/tests.json)
  local current_passing=$(pnpm run test --json | jq '.numPassedTests')
  
  if [ "$current_passing" -lt "$baseline_passing" ]; then
    echo "❌ Test regressions detected: $baseline_passing → $current_passing"
    return 1
  fi
  
  # Compare bundle sizes
  local baseline_size=$(cat .claude/migration/baseline/bundle-sizes.txt)
  local current_size=$(du -sh dist packages/*/dist apps/*/dist)
  
  echo "Bundle size comparison:"
  echo "Before: $baseline_size"
  echo "After: $current_size"
  
  # Compare performance
  compare_performance_metrics
  
  # Compare API surface (no breaking changes)
  compare_api_surface || {
    echo "❌ Breaking API changes detected"
    return 1
  }
  
  echo "✅ Baseline comparison successful"
}

compare_with_baseline
```

## Phase 7: Security & Compliance Check (Auto)

**Invoke:** `security-specialist`

```bash
# Comprehensive security audit post-migration
echo "Running security audit..."

# 1. Dependency audit
pnpm audit --audit-level=moderate

# 2. License compliance check
pnpm run license-checker

# 3. Security scan
pnpm run security:scan

# 4. Check for security regressions
compare_security_state() {
  local baseline_vulns=$(jq '.vulnerabilities.total' .claude/migration/baseline/dependencies.json)
  local current_vulns=$(pnpm audit --json | jq '.metadata.vulnerabilities.total')
  
  if [ "$current_vulns" -gt "$baseline_vulns" ]; then
    echo "⚠️ New vulnerabilities introduced: $baseline_vulns → $current_vulns"
    # Auto-fix if possible
    pnpm audit fix --force
    
    # Re-check
    current_vulns=$(pnpm audit --json | jq '.metadata.vulnerabilities.total')
    
    if [ "$current_vulns" -gt "$baseline_vulns" ]; then
      echo "❌ Unable to auto-fix vulnerabilities"
      return 1
    fi
  fi
  
  echo "✅ Security state maintained"
}

compare_security_state
```

## Phase 8: Documentation Generation (Auto)

**Invoke:** `backend-specialist` + `frontend-specialist`

```bash
# Auto-generate migration documentation
generate_migration_docs() {
  cat > .claude/migration/MIGRATION_GUIDE.md <<EOF
# Migration Guide: $ARGUMENTS

## Overview
- **Migration Type**: [type]
- **Affected Packages**: [list]
- **Duration**: [actual time taken]
- **Status**: ✅ Completed Successfully

## Changes Summary

### Core Libraries (packages/*)
- [List of changes]

### Backend (apps/api)
- [List of changes]

### Frontend (apps/web)
- [List of changes]

### Tests
- [List of changes]

## Breaking Changes

### API Changes
- [List of breaking API changes]

### Configuration Changes
- [List of configuration changes]

### Dependency Changes
- [List of major dependency updates]

## Migration Steps (For Team Reference)

1. **Update Dependencies**
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Run Database Migrations** (if applicable)
   \`\`\`bash
   pnpm run migrate:latest
   \`\`\`

3. **Update Configuration**
   \`\`\`bash
   cp .env.example .env
   # Update new environment variables
   \`\`\`

4. **Verify Installation**
   \`\`\`bash
   pnpm run test
   pnpm run build
   \`\`\`

## Rollback Procedure

If issues arise, follow these steps:

\`\`\`bash
# Option 1: Revert to previous version
git revert [migration-commit-sha]

# Option 2: Restore from tag
git checkout v[previous-version]

# Option 3: Use backup branch
git checkout backup/pre-migration
\`\`\`

## Performance Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Build Time | [X]s | [Y]s | [+/-]% |
| Bundle Size | [X]KB | [Y]KB | [+/-]% |
| Test Duration | [X]s | [Y]s | [+/-]% |
| Type Coverage | [X]% | [Y]% | [+/-]% |

## Known Issues & Workarounds

[List any known issues and their workarounds]

## Support

For questions or issues:
- Check troubleshooting section
- Review migration PR: #[PR-number]
- Contact: [team-contact]
EOF

  # Generate API documentation
  pnpm run docs:generate
  
  # Update CHANGELOG
  update_changelog_with_migration
  
  echo "✅ Documentation generated"
}

generate_migration_docs
```

## Phase 9: Staging Deployment & Validation (Auto)

```bash
# Deploy migrated code to staging
echo "Deploying to staging environment..."

# 1. Build production bundles
pnpm run build:production

# 2. Deploy to staging
deploy_to_staging() {
  # Create staging deployment
  kubectl config use-context staging
  
  # Deploy with canary strategy
  kubectl apply -f k8s/staging/
  
  # Wait for rollout
  kubectl rollout status deployment/app -n staging
  
  # Verify health
  kubectl get pods -n staging
}

deploy_to_staging

# 3. Run staging smoke tests
run_staging_validation() {
  # Health checks
  curl -f https://staging.myapp.com/health || return 1
  
  # Critical path testing
  pnpm run test:smoke --env=staging || return 1
  
  # Performance benchmarks
  pnpm run test:performance --env=staging || return 1
  
  # Load testing
  artillery run .claude/migration/load-test.yml || return 1
  
  echo "✅ Staging validation successful"
}

run_staging_validation
```

## Phase 10: Production Migration Strategy (Auto)

```yaml
# Choose production migration strategy based on risk
production_strategy:
  low_risk:
    type: direct_deployment
    rollout: all_at_once
    
  medium_risk:
    type: blue_green_deployment
    rollout: traffic_shift
    
  high_risk:
    type: canary_deployment
    rollout: gradual_percentage
    phases:
      - 5%_traffic_1h
      - 25%_traffic_2h
      - 50%_traffic_4h
      - 100%_traffic
```

```bash
# Execute production migration
execute_production_migration() {
  local strategy="$1"
  
  case "$strategy" in
    "canary")
      deploy_with_canary_strategy
      ;;
    "blue_green")
      deploy_with_blue_green_strategy
      ;;
    "direct")
      deploy_direct_to_production
      ;;
  esac
}

deploy_with_canary_strategy() {
  echo "Starting canary deployment..."
  
  # Phase 1: Deploy canary (5% traffic)
  deploy_canary_version
  route_traffic_to_canary 5
  monitor_canary_metrics --duration=1h || rollback_canary
  
  # Phase 2: Increase to 25%
  route_traffic_to_canary 25
  monitor_canary_metrics --duration=2h || rollback_canary
  
  # Phase 3: Increase to 50%
  route_traffic_to_canary 50
  monitor_canary_metrics --duration=4h || rollback_canary
  
  # Phase 4: Full rollout
  route_traffic_to_canary 100
  monitor_canary_metrics --duration=1h || rollback_canary
  
  # Success: Promote canary to production
  promote_canary_to_production
  
  echo "✅ Canary deployment successful"
}
```

## Phase 11: Post-Migration Monitoring (Auto)

```bash
# Automated monitoring for 24 hours
monitor_post_migration() {
  local start_time=$(date +%s)
  local duration=86400  # 24 hours
  
  while [ $(($(date +%s) - start_time)) -lt $duration ]; do
    # Monitor error rates
    check_error_rates
    
    # Monitor performance
    check_performance_metrics
    
    # Monitor resource usage
    check_resource_utilization
    
    # Check for migration-specific issues
    check_migration_health
    
    # Alert if issues detected
    if [ $? -ne 0 ]; then
      alert_team_and_consider_rollback
    fi
    
    sleep 300  # Check every 5 minutes
  done
  
  echo "✅ 24-hour monitoring complete. Migration stable."
}

monitor_post_migration &
```

## Phase 12: Cleanup & Finalization (Auto)

```bash
# Clean up migration artifacts
cleanup_migration() {
  echo "Cleaning up migration artifacts..."
  
  # Remove worktrees
  for tree in .claude/worktrees/migrate-*; do
    git worktree remove "$tree" --force
  done
  
  # Delete temporary branches
  git branch -D temp/migrate-core temp/migrate-backend temp/migrate-frontend temp/migrate-tests
  
  # Archive migration reports
  tar -czf ".claude/migration/reports-$(date +%Y%m%d).tar.gz" .claude/migration/reports/
  
  # Commit final migration documentation
  git add .claude/migration/MIGRATION_GUIDE.md
  git commit -m "docs: add migration guide for $ARGUMENTS"
  
  echo "✅ Cleanup complete"
}

cleanup_migration
```

## Phase 13: Commit & PR (Auto)

```bash
# Create comprehensive migration PR
git add .
git commit -m "migrate: $ARGUMENTS

## Migration Summary
- Type: [migration type]
- Scope: [affected packages]
- Strategy: [migration strategy]
- Duration: [time taken]

## Changes
- Core Libraries: [changes]
- Backend: [changes]
- Frontend: [changes]
- Tests: [changes]

## Validation Results
✅ All tests passing (100%)
✅ No performance regressions
✅ Security validated
✅ Staging deployment successful
✅ Production deployment successful

## Performance Impact
- Build time: [before] → [after]
- Bundle size: [before] → [after]
- Test coverage: [before] → [after]

## Breaking Changes
[List of breaking changes or "None"]

## Rollback Plan
Available via: git revert [commit-sha]
Backup branch: backup/pre-migration

Co-Authored-By: orchestrator <orchestrator@claude.ai>
Co-Authored-By: backend-specialist <orchestrator@claude.ai>
Co-Authored-By: frontend-specialist <orchestrator@claude.ai>
Co-Authored-By: test-specialist <orchestrator@claude.ai>"

# Push
git push -u origin "migration/$MIGRATION_NAME"

# Create PR
gh pr create \
  --title "migrate: $ARGUMENTS" \
  --body "$(cat .claude/migration/MIGRATION_GUIDE.md)" \
  --label "migration,major-change,requires-review" \
  --assignee @me
```

## Rollback Strategy (Auto - If Needed)

```bash
# Automatic rollback on critical issues
emergency_migration_rollback() {
  echo "🚨 Critical issues detected. Initiating rollback..."
  
  # 1. Switch traffic back to old version
  rollback_production_traffic
  
  # 2. Restore previous deployment
  restore_previous_deployment
  
  # 3. Verify stability
  verify_production_health
  
  # 4. Create incident report
  generate_rollback_report
  
  echo "✅ Rollback complete. System restored."
}
```

## Success Report (Auto-Generated)

```markdown
# Migration Success Report: $ARGUMENTS

## Execution Summary
- ⏱️ Total Duration: [time]
- 📦 Packages Migrated: [count]
- 📝 Files Changed: [count]
- ✅ Zero Downtime Achieved

## Validation Results
- Tests: ✅ 100% passing
- Performance: ✅ No regressions
- Security: ✅ Validated
- Deployment: ✅ Successful

## Metrics Comparison
| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| [metric1] | [val] | [val] | [change] |

## Team Impact
- Migration guide available
- Training materials prepared
- Support channels ready
```

---

**CRITICAL: This workflow handles complex migrations with automated validation, gradual rollout, and comprehensive monitoring. Rollback is automatic on any stability issues.**