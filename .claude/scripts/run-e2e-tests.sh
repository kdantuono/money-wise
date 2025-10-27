#!/bin/bash

###############################################################################
# E2E Test Runner for MoneyWise Staging
#
# Purpose: Execute Playwright E2E test suite against staging environment
# Usage: ./run-e2e-tests.sh [--local] [--staging] [--production] [--headed]
###############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-staging}"  # Default to staging
HEADED="${2:---}"           # Default to headless

# Environment URLs
LOCAL_URL="http://localhost:3000"
STAGING_URL="https://staging.moneywise.app"
PRODUCTION_URL="https://moneywise.app"

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Parse environment argument
case "${ENVIRONMENT}" in
    --local)
        BASE_URL="$LOCAL_URL"
        ENV_NAME="Local"
        ;;
    --staging)
        BASE_URL="$STAGING_URL"
        ENV_NAME="Staging"
        ;;
    --production)
        BASE_URL="$PRODUCTION_URL"
        ENV_NAME="Production"
        ;;
    *)
        BASE_URL="$STAGING_URL"
        ENV_NAME="Staging (default)"
        ;;
esac

# Parse headed argument
if [ "$HEADED" = "--headed" ]; then
    HEADED_FLAG="--headed"
else
    HEADED_FLAG=""
fi

###############################################################################
# Main E2E Test Execution
###############################################################################

print_header "MoneyWise E2E Test Suite"
echo ""
print_info "Environment:    $ENV_NAME"
print_info "Base URL:       $BASE_URL"
print_info "Mode:           $([ -n "$HEADED_FLAG" ] && echo "Headed (visible)" || echo "Headless")"
echo ""

# Set environment variable for Playwright
export PLAYWRIGHT_BASE_URL="$BASE_URL"

# Optional: Skip web server startup if using existing servers
if [ "$ENVIRONMENT" != "--local" ]; then
    export SKIP_WEBSERVER="true"
fi

print_header "Running E2E Tests"
echo ""

# Run Playwright tests
if pnpm --filter @money-wise/web exec playwright test $HEADED_FLAG; then
    print_success "All E2E tests passed!"
    TEST_RESULT=0
else
    print_error "E2E tests failed!"
    TEST_RESULT=1
fi

echo ""
print_header "Test Results"
echo ""

# Check for test results
if [ -f "apps/web/test-results/results.json" ]; then
    print_success "Test results generated"
    print_info "HTML Report: apps/web/test-results/index.html"
    print_info "JSON Report: apps/web/test-results/results.json"
    print_info "JUnit Report: apps/web/test-results/results.xml"
else
    print_warning "Test results file not found"
fi

echo ""
print_header "Test Summary"
echo ""

# Parse and display test results
if [ -f "apps/web/test-results/results.json" ]; then
    # Count tests
    TOTAL_TESTS=$(grep -c '"name":' apps/web/test-results/results.json || echo "Unknown")
    PASSED=$(grep '"status":"passed"' apps/web/test-results/results.json | wc -l || echo "Unknown")
    FAILED=$(grep '"status":"failed"' apps/web/test-results/results.json | wc -l || echo "Unknown")

    echo "Total Tests:    $TOTAL_TESTS"
    echo "Passed:         $PASSED"
    echo "Failed:         $FAILED"
else
    echo "Run tests to generate summary"
fi

echo ""
print_header "Next Steps"
echo ""

if [ $TEST_RESULT -eq 0 ]; then
    print_success "All tests passed! Ready for next phase"
    echo ""
    echo "Next: PHASE 5.3 - Set up monitoring and logging"
else
    print_error "Tests failed - review results before proceeding"
    echo ""
    echo "1. Check test-results/index.html for detailed failure info"
    echo "2. Review test logs and screenshots"
    echo "3. Fix issues and re-run tests"
fi

exit $TEST_RESULT
