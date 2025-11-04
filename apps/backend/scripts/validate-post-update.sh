#!/bin/bash
# Post-Update Validation Script
# Purpose: Comprehensive validation after Prisma and Node.js updates
# Usage: ./scripts/validate-post-update.sh [--skip-integration]

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SKIP_INTEGRATION=false
BASELINE_COVERAGE=65.55
BASELINE_TEST_COUNT=1397

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-integration)
      SKIP_INTEGRATION=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔍 Post-Update Validation Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Baseline: Prisma 6.17.1, Node.js 20.3.1"
echo "Expected: 1397 tests, 65.55% coverage"
echo ""

# Validation step counter
STEP=0
FAILED_STEPS=()

run_step() {
  STEP=$((STEP + 1))
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Step ${STEP}: $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

pass_step() {
  echo -e "${GREEN}✅ $1 - PASSED${NC}"
}

fail_step() {
  echo -e "${RED}❌ $1 - FAILED${NC}"
  FAILED_STEPS+=("$1")
}

warn_step() {
  echo -e "${YELLOW}⚠️  $1 - WARNING${NC}"
}

# ============================================================================
# STEP 1: Clean Artifacts
# ============================================================================
run_step "Cleaning build artifacts"
rm -rf dist coverage generated || true
pass_step "Clean artifacts"

# ============================================================================
# STEP 2: Node.js Version Check
# ============================================================================
run_step "Checking Node.js version"
NODE_VERSION=$(node --version)
echo "Current Node.js version: $NODE_VERSION"

if [[ "$NODE_VERSION" == v22.* ]]; then
  pass_step "Node.js version (v22.x detected)"
elif [[ "$NODE_VERSION" == v20.* ]]; then
  warn_step "Node.js version (Still on v20.x - update pending?)"
else
  fail_step "Node.js version (Expected v22.x or v20.x, got $NODE_VERSION)"
fi

# ============================================================================
# STEP 3: Prisma Client Generation
# ============================================================================
run_step "Generating Prisma Client"

if pnpm prisma generate > /tmp/prisma-generate.log 2>&1; then
  pass_step "Prisma Client generation"

  # Verify generated files exist
  if [ -d "generated/prisma" ] && [ -f "generated/prisma/index.js" ]; then
    pass_step "Prisma Client files verified"
  else
    fail_step "Prisma Client files missing"
    cat /tmp/prisma-generate.log
  fi
else
  fail_step "Prisma Client generation"
  cat /tmp/prisma-generate.log
  exit 1
fi

# ============================================================================
# STEP 4: Prisma Schema Validation
# ============================================================================
run_step "Validating Prisma schema"

if pnpm prisma validate > /tmp/prisma-validate.log 2>&1; then
  pass_step "Prisma schema validation"
else
  fail_step "Prisma schema validation"
  cat /tmp/prisma-validate.log
  exit 1
fi

# ============================================================================
# STEP 5: TypeScript Type Checking
# ============================================================================
run_step "TypeScript type checking"

if pnpm typecheck > /tmp/typecheck.log 2>&1; then
  pass_step "TypeScript compilation"
else
  fail_step "TypeScript compilation"
  echo ""
  echo "Type errors found:"
  cat /tmp/typecheck.log
  exit 1
fi

# ============================================================================
# STEP 6: Build Application
# ============================================================================
run_step "Building application"

if pnpm build > /tmp/build.log 2>&1; then
  pass_step "Application build"

  # Verify dist directory
  if [ -d "dist" ] && [ -f "dist/main.js" ]; then
    pass_step "Build artifacts verified"
  else
    fail_step "Build artifacts missing"
    cat /tmp/build.log
  fi
else
  fail_step "Application build"
  cat /tmp/build.log
  exit 1
fi

# ============================================================================
# STEP 7: Unit Tests
# ============================================================================
run_step "Running unit tests"

START_TIME=$(date +%s)
if pnpm test:unit > /tmp/unit-tests.log 2>&1; then
  END_TIME=$(date +%s)
  ELAPSED=$((END_TIME - START_TIME))

  # Extract test counts
  TEST_PASSED=$(grep -oP '\d+(?= passed)' /tmp/unit-tests.log | tail -1)
  TEST_FAILED=$(grep -oP '\d+(?= failed)' /tmp/unit-tests.log | tail -1 || echo "0")
  TEST_SKIPPED=$(grep -oP '\d+(?= skipped)' /tmp/unit-tests.log | tail -1 || echo "0")

  echo "Tests: $TEST_PASSED passed, $TEST_FAILED failed, $TEST_SKIPPED skipped"
  echo "Execution time: ${ELAPSED}s"

  if [ "$TEST_FAILED" -eq "0" ]; then
    pass_step "Unit tests (${TEST_PASSED} passed)"

    # Check test count
    if [ "$TEST_PASSED" -ge "$BASELINE_TEST_COUNT" ]; then
      pass_step "Test count (${TEST_PASSED} >= ${BASELINE_TEST_COUNT} baseline)"
    else
      warn_step "Test count decreased (${TEST_PASSED} < ${BASELINE_TEST_COUNT} baseline)"
    fi
  else
    fail_step "Unit tests (${TEST_FAILED} failures)"
    grep -A 10 "FAIL" /tmp/unit-tests.log || true
  fi
else
  fail_step "Unit tests execution"
  tail -50 /tmp/unit-tests.log
  exit 1
fi

# ============================================================================
# STEP 8: Test Coverage
# ============================================================================
run_step "Checking test coverage"

if pnpm test:coverage:unit > /tmp/coverage.log 2>&1; then
  pass_step "Coverage generation"

  # Extract coverage metrics
  if [ -f "coverage/coverage-summary.json" ]; then
    COVERAGE_STATEMENTS=$(jq -r '.total.statements.pct' coverage/coverage-summary.json)
    COVERAGE_BRANCHES=$(jq -r '.total.branches.pct' coverage/coverage-summary.json)
    COVERAGE_FUNCTIONS=$(jq -r '.total.functions.pct' coverage/coverage-summary.json)
    COVERAGE_LINES=$(jq -r '.total.lines.pct' coverage/coverage-summary.json)

    echo "Coverage Metrics:"
    echo "  Statements: ${COVERAGE_STATEMENTS}%"
    echo "  Branches:   ${COVERAGE_BRANCHES}%"
    echo "  Functions:  ${COVERAGE_FUNCTIONS}%"
    echo "  Lines:      ${COVERAGE_LINES}%"

    # Compare to baseline
    if (( $(echo "$COVERAGE_STATEMENTS >= $BASELINE_COVERAGE" | bc -l) )); then
      pass_step "Coverage maintained (${COVERAGE_STATEMENTS}% >= ${BASELINE_COVERAGE}% baseline)"
    else
      DIFF=$(echo "$BASELINE_COVERAGE - $COVERAGE_STATEMENTS" | bc -l)
      warn_step "Coverage decreased by ${DIFF}% (${COVERAGE_STATEMENTS}% < ${BASELINE_COVERAGE}%)"
    fi
  else
    fail_step "Coverage summary file not found"
  fi
else
  fail_step "Coverage generation"
  tail -50 /tmp/coverage.log
fi

# ============================================================================
# STEP 9: Integration Tests (Optional)
# ============================================================================
if [ "$SKIP_INTEGRATION" = false ]; then
  run_step "Running integration tests"

  # Check if Docker services are running
  if docker compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo "Docker services detected (PostgreSQL, Redis)"

    if pnpm test:integration > /tmp/integration-tests.log 2>&1; then
      pass_step "Integration tests"
    else
      fail_step "Integration tests"
      tail -50 /tmp/integration-tests.log
    fi
  else
    warn_step "Docker services not running - skipping integration tests"
    echo "To run integration tests:"
    echo "  docker compose -f docker-compose.dev.yml up -d"
    echo "  pnpm test:integration"
  fi
else
  echo -e "${YELLOW}⏭️  Integration tests skipped (--skip-integration flag)${NC}"
fi

# ============================================================================
# STEP 10: Database Connectivity Check
# ============================================================================
run_step "Checking database connectivity"

if [ -f ".env" ] || [ -f ".env.test" ]; then
  # Try to connect to database
  if docker compose -f docker-compose.dev.yml ps | grep -q "postgres.*Up"; then
    echo "PostgreSQL service is running"

    # Test connection with Prisma
    if pnpm prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
      pass_step "Database connectivity"
    else
      warn_step "Database connectivity (could not connect)"
    fi
  else
    warn_step "PostgreSQL service not running"
  fi
else
  warn_step "No .env file found - cannot test database connectivity"
fi

# ============================================================================
# STEP 11: Critical Test Suites Validation
# ============================================================================
run_step "Validating critical test suites"

CRITICAL_TESTS=(
  "auth-security.service.spec.ts"
  "user.service.spec.ts"
  "family.service.spec.ts"
  "account.service.spec.ts"
  "transaction.service.spec.ts"
  "budget.service.spec.ts"
)

CRITICAL_PASSED=true
for test in "${CRITICAL_TESTS[@]}"; do
  if grep -q "$test.*PASS" /tmp/unit-tests.log; then
    echo "  ✓ $test"
  else
    echo "  ✗ $test"
    CRITICAL_PASSED=false
  fi
done

if [ "$CRITICAL_PASSED" = true ]; then
  pass_step "All critical test suites passed"
else
  fail_step "Some critical test suites failed"
fi

# ============================================================================
# STEP 12: Performance Baseline Check
# ============================================================================
run_step "Checking performance baseline"

BASELINE_TIME=60  # 60 seconds baseline for 1397 tests
if [ -n "$ELAPSED" ]; then
  if [ "$ELAPSED" -le "$((BASELINE_TIME + 10))" ]; then
    pass_step "Performance within baseline (${ELAPSED}s <= ${BASELINE_TIME}s + 10s tolerance)"
  else
    DIFF=$((ELAPSED - BASELINE_TIME))
    warn_step "Performance degraded by ${DIFF}s (${ELAPSED}s > ${BASELINE_TIME}s baseline)"
  fi
fi

# ============================================================================
# Final Summary
# ============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📊 Validation Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ ${#FAILED_STEPS[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ ALL VALIDATION STEPS PASSED${NC}"
  echo ""
  echo "Summary:"
  echo "  - Node.js: $NODE_VERSION"
  echo "  - Tests: $TEST_PASSED passed, $TEST_FAILED failed, $TEST_SKIPPED skipped"
  echo "  - Coverage: ${COVERAGE_STATEMENTS}% statements"
  echo "  - Execution: ${ELAPSED}s"
  echo ""
  echo -e "${GREEN}🎉 Update validation successful!${NC}"
  exit 0
else
  echo -e "${RED}❌ VALIDATION FAILED${NC}"
  echo ""
  echo "Failed steps:"
  for step in "${FAILED_STEPS[@]}"; do
    echo -e "  ${RED}✗${NC} $step"
  done
  echo ""
  echo "Review logs in /tmp/ for details:"
  echo "  - /tmp/prisma-generate.log"
  echo "  - /tmp/typecheck.log"
  echo "  - /tmp/build.log"
  echo "  - /tmp/unit-tests.log"
  echo "  - /tmp/coverage.log"
  echo ""
  echo -e "${RED}🚨 Update validation failed - review errors above${NC}"
  exit 1
fi
