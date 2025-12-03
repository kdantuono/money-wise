#!/bin/bash
# Test Integrity Validation Script
# Ensures tests are properly discovered and passing after removing silent failure patterns
#
# Usage: ./.claude/scripts/validate-test-integrity.sh
#
# See: .claude/quality/test-debt.md for technical debt tracking

set -e

echo "=========================================="
echo "    Test Integrity Validation"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# Function to check test discovery
check_test_discovery() {
    local app=$1
    local pattern=$2
    local runner=$3

    echo -n "Checking $app test discovery... "

    if [ "$runner" = "jest" ]; then
        count=$(cd "apps/$app" && pnpm test:unit -- --listTests 2>/dev/null | grep -c "$pattern" || echo "0")
    elif [ "$runner" = "vitest" ]; then
        count=$(cd "apps/$app" && pnpm test -- --list 2>/dev/null | grep -c "$pattern" || echo "0")
    fi

    if [ "$count" -gt 0 ]; then
        echo -e "${GREEN}OK${NC} (found $count test files)"
        return 0
    else
        echo -e "${RED}FAIL${NC} (no tests discovered)"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

# Function to run tests
run_tests() {
    local app=$1
    local cmd=$2

    echo ""
    echo "Running $app tests..."
    echo "-------------------------------------------"

    if cd "apps/$app" && pnpm $cmd; then
        echo -e "${GREEN}PASS${NC}: $app tests"
        cd - > /dev/null
        return 0
    else
        echo -e "${RED}FAIL${NC}: $app tests"
        cd - > /dev/null
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

# Function to check package skip scripts
check_package_scripts() {
    local pkg=$1

    echo -n "Checking $pkg explicit skip... "

    if cd "packages/$pkg" && pnpm test 2>&1 | grep -q "Skip\|TECH DEBT"; then
        echo -e "${GREEN}OK${NC} (explicit skip configured)"
        cd - > /dev/null
        return 0
    else
        echo -e "${YELLOW}WARN${NC} (check package.json scripts)"
        cd - > /dev/null
        return 0
    fi
}

echo "PHASE 1: Test Discovery Verification"
echo "-------------------------------------------"

# Check backend test discovery
check_test_discovery "backend" "\.spec\.ts" "jest"

# Check web test discovery
check_test_discovery "web" "\.test\." "vitest"

echo ""
echo "PHASE 2: Package Skip Scripts"
echo "-------------------------------------------"

check_package_scripts "types"
check_package_scripts "utils"
check_package_scripts "ui"

echo ""
echo "PHASE 3: Run Actual Tests"
echo "-------------------------------------------"

# Run backend unit tests
run_tests "backend" "test:unit"

# Run web unit tests
run_tests "web" "test:unit"

echo ""
echo "=========================================="
echo "    Validation Summary"
echo "=========================================="

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}All test integrity checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run integration tests: pnpm test:integration"
    echo "  2. Validate CI locally: ./.claude/scripts/validate-ci.sh 8"
    echo "  3. Push and monitor CI"
    exit 0
else
    echo -e "${RED}$FAILURES check(s) failed${NC}"
    echo ""
    echo "Please fix the issues above before pushing."
    exit 1
fi
