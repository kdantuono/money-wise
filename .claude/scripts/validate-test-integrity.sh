#!/bin/bash
# Test Integrity Validation Script
# Ensures tests are properly discovered and passing after removing silent failure patterns
#
# Usage: ./.claude/scripts/validate-test-integrity.sh
#
# See: .claude/quality/test-debt.md for technical debt tracking
# See: docs/TEST_POLICY.md for test policy rules

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

# Exclusion patterns for phantom detection (directories to ignore)
EXCLUDE_DIRS="node_modules|dist|coverage|\.next|out|tests-disabled|build"

# ──────────────────────────────────────────────
# PHASE 0: Phantom Test Detection
# Compare filesystem test files vs runner discovery
# Any file on disk that the runner does NOT discover is a phantom
# ──────────────────────────────────────────────

echo "PHASE 0: Phantom Test Detection"
echo "-------------------------------------------"

detect_phantoms() {
    local app=$1
    local runner=$2
    local app_dir="apps/$app"
    local phantoms=0

    echo -n "  $app ($runner): "

    # Find all test files on disk (excluding known non-test directories)
    local fs_tests
    fs_tests=$(find "$app_dir" \
        -type f \( -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.test.js' -o -name '*.test.jsx' \
                   -o -name '*.spec.ts' -o -name '*.spec.tsx' -o -name '*.spec.js' -o -name '*.spec.jsx' \) \
        | grep -Ev "$EXCLUDE_DIRS" \
        | sort)

    local fs_count
    fs_count=$(echo "$fs_tests" | grep -c '.' || echo "0")

    # Get runner-discovered tests
    local runner_tests
    if [ "$runner" = "jest" ]; then
        runner_tests=$(cd "$app_dir" && npx jest --listTests 2>/dev/null | sort || true)
    elif [ "$runner" = "vitest" ]; then
        # Vitest --list outputs test names not paths; use --reporter=json to get file paths
        runner_tests=$(cd "$app_dir" && npx vitest run --list 2>/dev/null | grep -E '\.(test|spec)\.(ts|tsx|js|jsx)$' | sort || true)
    fi

    local runner_count
    runner_count=$(echo "$runner_tests" | grep -c '.' || echo "0")

    # Normalize paths for comparison
    local fs_normalized
    fs_normalized=$(echo "$fs_tests" | sed "s|^$app_dir/||" | sort)

    local runner_normalized
    if [ "$runner" = "jest" ]; then
        # Jest outputs absolute paths — strip to relative
        runner_normalized=$(echo "$runner_tests" | sed "s|.*/apps/$app/||" | sort)
    else
        runner_normalized=$(echo "$runner_tests" | sed "s|^$app_dir/||" | sort)
    fi

    # Find phantoms: files on disk but NOT in runner output
    local phantom_list
    phantom_list=$(comm -23 <(echo "$fs_normalized") <(echo "$runner_normalized") 2>/dev/null || true)

    if [ -n "$phantom_list" ] && [ "$(echo "$phantom_list" | grep -c '.')" -gt 0 ]; then
        phantoms=$(echo "$phantom_list" | grep -c '.')
        echo -e "${RED}FAIL${NC} — $phantoms phantom(s) detected (disk: $fs_count, runner: $runner_count)"
        echo "$phantom_list" | while read -r f; do
            echo -e "    ${RED}phantom${NC}: $app_dir/$f"
        done
        FAILURES=$((FAILURES + 1))
    else
        echo -e "${GREEN}OK${NC} — 0 phantoms (disk: $fs_count, runner: $runner_count)"
    fi
}

detect_phantoms "backend" "jest"
detect_phantoms "web" "vitest"

echo ""

# ──────────────────────────────────────────────
# PHASE 1: Test Discovery Verification
# ──────────────────────────────────────────────

echo "PHASE 1: Test Discovery Verification"
echo "-------------------------------------------"

# Function to check test discovery
check_test_discovery() {
    local app=$1
    local pattern=$2
    local runner=$3

    echo -n "Checking $app test discovery... "

    if [ "$runner" = "jest" ]; then
        count=$(cd "apps/$app" && npx jest --listTests 2>/dev/null | grep -c "$pattern" || echo "0")
    elif [ "$runner" = "vitest" ]; then
        count=$(cd "apps/$app" && npx vitest run --list 2>/dev/null | grep -c "$pattern" || echo "0")
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

check_test_discovery "backend" "\.spec\.ts" "jest"
check_test_discovery "web" "\.test\." "vitest"

echo ""

# ──────────────────────────────────────────────
# PHASE 2: Package Skip Scripts
# ──────────────────────────────────────────────

echo "PHASE 2: Package Skip Scripts"
echo "-------------------------------------------"

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

check_package_scripts "types"
check_package_scripts "utils"
check_package_scripts "ui"

echo ""

# ──────────────────────────────────────────────
# PHASE 3: Run Actual Tests
# ──────────────────────────────────────────────

echo "PHASE 3: Run Actual Tests"
echo "-------------------------------------------"

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

run_tests "backend" "test:unit"
run_tests "web" "test"

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
