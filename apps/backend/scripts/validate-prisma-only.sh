#!/bin/bash
################################################################################
# Prisma-Only Validation Script
#
# Purpose: Validate that TypeORM has been completely removed and Prisma is working
# Author: System Architect (Claude Code)
# Date: 2025-10-13
#
# Usage:
#   ./scripts/validate-prisma-only.sh
#
# Exit Codes:
#   0 - All checks passed (Prisma-only environment)
#   1 - Validation failed (TypeORM remnants or Prisma issues)
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0

# Logging
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_pass() {
  echo -e "${GREEN}[PASS]${NC} $1"
  ((PASSED++))
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((FAILED++))
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check function
check() {
  local description=$1
  local command=$2

  log_info "Checking: $description"

  if eval "$command" > /dev/null 2>&1; then
    log_pass "$description"
    return 0
  else
    log_fail "$description"
    return 1
  fi
}

# Main validation
main() {
  echo "========================================="
  echo "  Prisma-Only Environment Validation"
  echo "========================================="
  echo ""

  # Check we're in the right directory
  if [ ! -f "apps/backend/package.json" ]; then
    log_fail "Must run from repository root (money-wise/)"
    exit 1
  fi

  log_info "Starting validation checks..."
  echo ""

  # Test 1: TypeORM dependencies removed
  log_info "Test 1: TypeORM dependencies removed from package.json"
  if ! grep -q '"typeorm"' apps/backend/package.json && \
     ! grep -q '"@nestjs/typeorm"' apps/backend/package.json; then
    log_pass "TypeORM dependencies not found in package.json"
  else
    log_fail "TypeORM dependencies still present in package.json"
    grep '"typeorm"\|"@nestjs/typeorm"' apps/backend/package.json
  fi
  echo ""

  # Test 2: TypeORM imports removed from src/
  log_info "Test 2: TypeORM imports removed from source code"
  TYPEORM_IMPORTS=$(grep -r "import.*typeorm\|from ['\""]typeorm['\"]" apps/backend/src --exclude-dir=archive 2>/dev/null || true)
  if [ -z "$TYPEORM_IMPORTS" ]; then
    log_pass "No TypeORM imports in src/ (excluding archive)"
  else
    log_fail "TypeORM imports still found:"
    echo "$TYPEORM_IMPORTS"
  fi
  echo ""

  # Test 3: @nestjs/typeorm imports removed
  log_info "Test 3: @nestjs/typeorm imports removed"
  NESTJS_TYPEORM=$(grep -r "@nestjs/typeorm" apps/backend/src --exclude-dir=archive 2>/dev/null || true)
  if [ -z "$NESTJS_TYPEORM" ]; then
    log_pass "No @nestjs/typeorm imports in src/"
  else
    log_fail "@nestjs/typeorm imports still found:"
    echo "$NESTJS_TYPEORM"
  fi
  echo ""

  # Test 4: TypeORM migrations archived
  log_info "Test 4: TypeORM migrations archived"
  if [ -d "apps/backend/src/core/database/migrations/archive/typeorm" ] && \
     [ -f "apps/backend/src/core/database/migrations/archive/typeorm/README.md" ]; then
    ARCHIVED_COUNT=$(find apps/backend/src/core/database/migrations/archive/typeorm -name "*.ts" | wc -l)
    if [ "$ARCHIVED_COUNT" -ge 3 ]; then
      log_pass "TypeORM migrations archived ($ARCHIVED_COUNT files)"
    else
      log_fail "TypeORM migrations archive incomplete (expected 3+, found $ARCHIVED_COUNT)"
    fi
  else
    log_fail "TypeORM migrations archive not found"
  fi
  echo ""

  # Test 5: Prisma schema exists
  log_info "Test 5: Prisma schema exists and is valid"
  if [ -f "apps/backend/prisma/schema.prisma" ]; then
    cd apps/backend
    if pnpm prisma validate > /dev/null 2>&1; then
      log_pass "Prisma schema is valid"
    else
      log_fail "Prisma schema validation failed"
    fi
    cd ../..
  else
    log_fail "Prisma schema not found at apps/backend/prisma/schema.prisma"
  fi
  echo ""

  # Test 6: Prisma migrations exist
  log_info "Test 6: Prisma migrations exist"
  MIGRATION_COUNT=$(find apps/backend/prisma/migrations -type d -name "20*" 2>/dev/null | wc -l)
  if [ "$MIGRATION_COUNT" -gt 0 ]; then
    log_pass "Prisma migrations found ($MIGRATION_COUNT migrations)"
  else
    log_fail "No Prisma migrations found"
  fi
  echo ""

  # Test 7: Prisma Client generated
  log_info "Test 7: Prisma Client generated"
  if [ -d "apps/backend/node_modules/.prisma/client" ]; then
    log_pass "Prisma Client generated"
  else
    log_warning "Prisma Client not generated (run: pnpm prisma:generate)"
    log_info "Attempting to generate..."
    cd apps/backend
    if pnpm prisma:generate > /dev/null 2>&1; then
      log_pass "Prisma Client generated successfully"
    else
      log_fail "Prisma Client generation failed"
    fi
    cd ../..
  fi
  echo ""

  # Test 8: PrismaService exists
  log_info "Test 8: PrismaService exists in codebase"
  if [ -f "apps/backend/src/core/database/prisma/prisma.service.ts" ]; then
    log_pass "PrismaService found"
  else
    log_fail "PrismaService not found at expected location"
  fi
  echo ""

  # Test 9: Test suite uses Prisma
  log_info "Test 9: Test suite uses Prisma mocks"
  PRISMA_TESTS=$(find apps/backend/__tests__/unit/core/database/prisma -name "*.spec.ts" 2>/dev/null | wc -l)
  if [ "$PRISMA_TESTS" -ge 8 ]; then
    log_pass "Prisma test suite found ($PRISMA_TESTS test files)"
  else
    log_fail "Incomplete Prisma test suite (expected 8+, found $PRISMA_TESTS)"
  fi
  echo ""

  # Test 10: TypeScript compilation
  log_info "Test 10: TypeScript compilation (zero errors)"
  cd apps/backend
  if pnpm typecheck > /dev/null 2>&1; then
    log_pass "TypeScript compilation succeeded"
  else
    log_fail "TypeScript compilation failed"
  fi
  cd ../..
  echo ""

  # Test 11: Prisma service tests pass
  log_info "Test 11: Prisma service tests pass"
  cd apps/backend
  if pnpm test:unit -- --testPathPattern='prisma/services' --silent > /dev/null 2>&1; then
    log_pass "Prisma service tests passed"
  else
    log_fail "Prisma service tests failed"
  fi
  cd ../..
  echo ""

  # Test 12: Database connection scripts updated
  log_info "Test 12: Database scripts use Prisma Migrate"
  if grep -q "prisma migrate" apps/backend/package.json; then
    log_pass "package.json uses Prisma Migrate scripts"
  else
    log_warning "package.json may still reference TypeORM scripts"
  fi
  echo ""

  # Test 13: Coverage meets threshold
  log_info "Test 13: Code coverage meets 85% threshold"
  cd apps/backend
  COVERAGE_OUTPUT=$(pnpm test:unit -- --coverage --coverageReporters=json-summary --testPathPattern='prisma/services' --silent 2>&1 || true)
  if echo "$COVERAGE_OUTPUT" | grep -q "jest-coverage-summary"; then
    COVERAGE=$(echo "$COVERAGE_OUTPUT" | grep -oP '"lines":\{"total":\d+,"covered":\d+,"skipped":\d+,"pct":\K\d+\.\d+' | head -1)
    if [ -n "$COVERAGE" ]; then
      if (( $(echo "$COVERAGE >= 85" | bc -l) )); then
        log_pass "Code coverage: ${COVERAGE}% (above 85% threshold)"
      else
        log_fail "Code coverage: ${COVERAGE}% (below 85% threshold)"
      fi
    else
      log_warning "Could not parse coverage percentage"
    fi
  else
    log_warning "Coverage report not available (run: pnpm test:coverage)"
  fi
  cd ../..
  echo ""

  # Summary
  echo "========================================="
  echo "  Validation Summary"
  echo "========================================="
  echo ""
  echo -e "${GREEN}Passed:${NC} $PASSED checks"
  if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed:${NC} $FAILED checks"
    echo ""
    echo "❌ Validation FAILED - TypeORM removal incomplete"
    exit 1
  else
    echo -e "${GREEN}Failed:${NC} 0 checks"
    echo ""
    echo "✅ Validation PASSED - Environment is Prisma-only"
    exit 0
  fi
}

# Run main
main
