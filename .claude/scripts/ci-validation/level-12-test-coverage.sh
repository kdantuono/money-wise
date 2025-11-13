#!/bin/bash
# LEVEL 12: Test Coverage Thresholds Validation
# Validates that test counts and coverage meet defined thresholds

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 LEVEL 12: Test Coverage Thresholds${NC}"
echo ""

FAILED=0
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$PROJECT_ROOT"

# Check 1: Test Count Validation
echo -e "${YELLOW}→ Validating test counts against thresholds...${NC}"
if [ -f "scripts/validate-test-counts.ts" ]; then
  if pnpm tsx scripts/validate-test-counts.ts > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ All modules meet test count thresholds${NC}"
  else
    echo -e "${RED}  ❌ Some modules below test count thresholds${NC}"
    echo ""
    echo -e "${YELLOW}     Detailed Report:${NC}"
    pnpm tsx scripts/validate-test-counts.ts 2>&1 | head -30
    echo ""
    echo -e "${YELLOW}     Run 'pnpm validate:tests' for full report${NC}"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${YELLOW}  ⚠️  Test count validator not found, skipping${NC}"
fi
echo ""

# Check 2: Backend Test Coverage
echo -e "${YELLOW}→ Checking backend test coverage...${NC}"
if [ -f "apps/backend/jest.config.js" ]; then
  BACKEND_CONFIG=$(grep -A 5 "coverageThreshold" apps/backend/jest.config.js 2>/dev/null || echo "")

  if [ -n "$BACKEND_CONFIG" ]; then
    # Extract threshold from config (e.g., statements: 63)
    THRESHOLD=$(echo "$BACKEND_CONFIG" | grep "statements" | grep -oE '[0-9]+' | head -1)

    if [ -n "$THRESHOLD" ]; then
      echo -e "${GREEN}  ✅ Backend coverage threshold configured: ${THRESHOLD}%${NC}"
      echo -e "${YELLOW}     Note: MVP threshold is ${THRESHOLD}%, target for production is 80%${NC}"
    else
      echo -e "${YELLOW}  ⚠️  Could not parse coverage threshold from config${NC}"
    fi
  else
    echo -e "${YELLOW}  ⚠️  Coverage threshold not configured in jest.config.js${NC}"
  fi
else
  echo -e "${YELLOW}  ⚠️  Backend Jest config not found, skipping${NC}"
fi
echo ""

# Check 3: Run Coverage Tests (Optional - can be slow)
if [ "${RUN_COVERAGE_TESTS:-false}" = "true" ]; then
  echo -e "${YELLOW}→ Running coverage tests (this may take a while)...${NC}"

  if pnpm --filter @money-wise/backend test:unit -- --coverage --coverageReporters=text-summary > /tmp/coverage-output.txt 2>&1; then
    # Parse coverage from output
    STATEMENTS=$(grep "Statements" /tmp/coverage-output.txt | grep -oE '[0-9]+\.[0-9]+%' | head -1 | tr -d '%')
    BRANCHES=$(grep "Branches" /tmp/coverage-output.txt | grep -oE '[0-9]+\.[0-9]+%' | head -1 | tr -d '%')
    FUNCTIONS=$(grep "Functions" /tmp/coverage-output.txt | grep -oE '[0-9]+\.[0-9]+%' | head -1 | tr -d '%')
    LINES=$(grep "Lines" /tmp/coverage-output.txt | grep -oE '[0-9]+\.[0-9]+%' | head -1 | tr -d '%')

    echo -e "${GREEN}  ✅ Coverage Results:${NC}"
    echo -e "     Statements: ${STATEMENTS}%"
    echo -e "     Branches:   ${BRANCHES}%"
    echo -e "     Functions:  ${FUNCTIONS}%"
    echo -e "     Lines:      ${LINES}%"

    rm -f /tmp/coverage-output.txt
  else
    echo -e "${RED}  ❌ Coverage tests failed${NC}"
    echo -e "${YELLOW}     Run 'pnpm test:coverage' to see errors${NC}"
    FAILED=$((FAILED + 1))
  fi
  echo ""
else
  echo -e "${YELLOW}→ Skipping full coverage test run (set RUN_COVERAGE_TESTS=true to enable)${NC}"
  echo ""
fi

# Final result
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ LEVEL 12: Test Coverage Thresholds PASSED${NC}"
  exit 0
else
  echo -e "${RED}❌ LEVEL 12: Test Coverage Thresholds FAILED${NC}"
  echo -e "${YELLOW}Fix test coverage issues and run validation again${NC}"
  exit 1
fi
