#!/bin/bash
# run-e2e-local.sh - Local E2E Test Execution Automation Script
# Version: 1.0.0
# Description: Automates E2E test execution with comprehensive validation and setup

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Configuration
DEFAULT_MODE="dev"
PRODUCTION_MODE=false
HEADED_MODE=false
DEBUG_MODE=false
UI_MODE=false
PROJECT_FILTER="chromium"
TEST_PATTERN=""
UPDATE_SNAPSHOTS=false
SKIP_SETUP=false

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Run E2E tests locally with comprehensive validation and setup.

OPTIONS:
    --production         Build and run in production mode (like CI)
    --dev               Use dev servers with hot reload (default)
    --headed            Run tests in headed mode (visible browser)
    --ui                Open Playwright UI mode
    --debug             Run with Playwright debugger
    --project=BROWSER   Run specific browser (chromium/firefox/webkit)
    --test=PATTERN      Run specific test files matching pattern
    --update-snapshots  Update visual test snapshots
    --skip-setup        Skip validation and setup (faster, assumes ready)
    -h, --help          Show this help message

EXAMPLES:
    # Quick dev run (default)
    $0

    # CI-like production run
    $0 --production

    # Debug specific test
    $0 --debug --test=auth.spec.ts

    # Update visual regression snapshots
    $0 --update-snapshots --test=visual/

    # Fast re-run (skip setup validation)
    $0 --skip-setup

EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --production)
            PRODUCTION_MODE=true
            shift
            ;;
        --dev)
            PRODUCTION_MODE=false
            shift
            ;;
        --headed)
            HEADED_MODE=true
            shift
            ;;
        --ui)
            UI_MODE=true
            shift
            ;;
        --debug)
            DEBUG_MODE=true
            shift
            ;;
        --project=*)
            PROJECT_FILTER="${1#*=}"
            shift
            ;;
        --test=*)
            TEST_PATTERN="${1#*=}"
            shift
            ;;
        --update-snapshots)
            UPDATE_SNAPSHOTS=true
            shift
            ;;
        --skip-setup)
            SKIP_SETUP=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Change to project root
cd "${PROJECT_ROOT}"

# ============================================================================
# PHASE 1: VALIDATION (Pre-flight checks)
# ============================================================================
if [ "$SKIP_SETUP" = false ]; then
    log_section "PHASE 1: Environment Validation"

    # Check Docker daemon
    log_info "Checking Docker daemon..."
    if ! docker ps > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    log_success "Docker daemon is running"

    # Check/start Docker services
    log_info "Checking Docker services (PostgreSQL + Redis)..."
    if ! docker compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        log_info "Starting Docker services..."
        docker compose -f docker-compose.dev.yml up -d
        sleep 10
    fi

    # Verify service health
    log_info "Verifying PostgreSQL health..."
    for i in {1..10}; do
        if docker exec postgres-dev pg_isready -U postgres > /dev/null 2>&1; then
            log_success "PostgreSQL is healthy"
            break
        fi
        if [ $i -eq 10 ]; then
            log_error "PostgreSQL failed to become healthy"
            exit 1
        fi
        sleep 2
    done

    log_info "Verifying Redis health..."
    if ! docker exec redis-dev redis-cli ping > /dev/null 2>&1; then
        log_error "Redis is not responding"
        exit 1
    fi
    log_success "Redis is healthy"

    # Check port availability
    log_info "Checking port availability..."
    PORTS_IN_USE=()
    if lsof -i :3000 > /dev/null 2>&1; then
        PORTS_IN_USE+=("3000 (frontend)")
    fi
    if lsof -i :3001 > /dev/null 2>&1; then
        PORTS_IN_USE+=("3001 (backend)")
    fi

    if [ ${#PORTS_IN_USE[@]} -gt 0 ]; then
        log_warning "Ports already in use: ${PORTS_IN_USE[*]}"
        log_info "Will attempt to reuse existing servers..."
    else
        log_success "Ports 3000 and 3001 are available"
    fi

    # Check dependencies
    log_info "Checking dependencies..."
    if [ ! -d "node_modules" ] || [ ! -d "apps/backend/node_modules" ] || [ ! -d "apps/web/node_modules" ]; then
        log_warning "Dependencies not fully installed. Running pnpm install..."
        pnpm install
    fi
    log_success "Dependencies are installed"

    # Check Playwright browsers
    log_info "Checking Playwright browsers..."
    if [ ! -d "$HOME/.cache/ms-playwright" ]; then
        log_info "Installing Playwright chromium browser..."
        cd apps/web && npx playwright install chromium
        cd "${PROJECT_ROOT}"
    fi
    log_success "Playwright browsers are installed"
fi

# ============================================================================
# PHASE 2: SETUP (Prepare environment)
# ============================================================================
if [ "$SKIP_SETUP" = false ]; then
    log_section "PHASE 2: Environment Setup"

    # Copy test environment configuration
    log_info "Configuring test environment..."
    cp apps/backend/.env.test apps/backend/.env

    # Fix PORT to 3001 (E2E tests expect this)
    sed -i 's/^PORT=.*/PORT=3001/' apps/backend/.env
    log_success "Test environment configured"

    # Generate Prisma Client if needed
    log_info "Checking Prisma Client..."
    if [ ! -d "apps/backend/generated/prisma" ]; then
        log_info "Generating Prisma Client..."
        cd apps/backend && pnpm prisma:generate
        cd "${PROJECT_ROOT}"
    fi
    log_success "Prisma Client is ready"

    # Apply database migrations
    log_info "Applying database migrations..."
    cd apps/backend && pnpm db:migrate > /dev/null 2>&1
    cd "${PROJECT_ROOT}"
    log_success "Database migrations applied"

    # Build applications in production mode
    if [ "$PRODUCTION_MODE" = true ]; then
        log_info "Building applications for production..."
        log_info "Building backend..."
        pnpm build:backend
        log_info "Building web..."
        pnpm build:web
        log_success "Applications built successfully"
    fi
fi

# ============================================================================
# PHASE 3: EXECUTION (Run tests)
# ============================================================================
log_section "PHASE 3: Running E2E Tests"

# Build Playwright command
PLAYWRIGHT_CMD="npx playwright test"

# Add project filter
PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --project=$PROJECT_FILTER"

# Add test pattern if specified
if [ -n "$TEST_PATTERN" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $TEST_PATTERN"
fi

# Add mode flags
if [ "$HEADED_MODE" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --headed"
fi

if [ "$UI_MODE" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --ui"
fi

if [ "$DEBUG_MODE" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --debug"
fi

if [ "$UPDATE_SNAPSHOTS" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --update-snapshots"
fi

# Add reporter for better output
PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --reporter=list"

# Run tests based on mode
cd apps/web

if [ "$PRODUCTION_MODE" = true ]; then
    log_info "Running tests in PRODUCTION mode (CI-like)..."
    log_info "Tests will use built applications (dist/ and .next/)"

    # Use Playwright's webServer config to manage servers
    # CI mode configuration is in playwright.config.ts
    CI=true $PLAYWRIGHT_CMD
else
    log_info "Running tests in DEV mode..."
    log_info "Tests will use dev servers with hot reload"

    # Check if servers are already running
    BACKEND_RUNNING=false
    FRONTEND_RUNNING=false

    if lsof -i :3001 > /dev/null 2>&1; then
        BACKEND_RUNNING=true
        log_info "Backend already running on port 3001"
    fi

    if lsof -i :3000 > /dev/null 2>&1; then
        FRONTEND_RUNNING=true
        log_info "Frontend already running on port 3000"
    fi

    if [ "$BACKEND_RUNNING" = true ] && [ "$FRONTEND_RUNNING" = true ]; then
        # Both servers running - skip Playwright's webServer startup
        log_info "Using existing servers..."
        SKIP_WEBSERVER=true $PLAYWRIGHT_CMD
    else
        # Let Playwright manage server startup
        log_info "Playwright will start dev servers automatically..."
        $PLAYWRIGHT_CMD
    fi
fi

TEST_EXIT_CODE=$?

cd "${PROJECT_ROOT}"

# ============================================================================
# PHASE 4: REPORTING (Results)
# ============================================================================
log_section "PHASE 4: Test Results"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_success "All E2E tests passed! ✅"
    echo ""
    log_info "HTML Report: apps/web/playwright-report/index.html"
    log_info "View with: npx playwright show-report"
    echo ""
    exit 0
else
    log_error "Some E2E tests failed ❌"
    echo ""
    log_info "HTML Report: apps/web/playwright-report/index.html"
    log_info "View with: npx playwright show-report"
    log_info "Debug failed tests: $0 --debug --test=<test-file>"
    echo ""
    exit 1
fi
