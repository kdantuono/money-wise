#!/bin/bash
# run-e2e-docker.sh - Run E2E tests using Docker Compose (same as CI)
# This script exactly replicates what CI does, but locally for faster debugging.
#
# Usage: ./run-e2e-docker.sh [options]
#
# Options:
#   --headed      Run with browser visible
#   --debug       Run with Playwright inspector
#   --ui          Run with Playwright UI mode
#   --filter      Run specific test file(s)
#   --shard N/M   Run specific shard (e.g., 1/8)
#   --rebuild     Force rebuild of Docker containers
#   --down        Stop containers after tests
#   --skip-build  Skip container rebuild (use existing)
#   --logs        Show Docker container logs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default options
HEADED=""
DEBUG=""
UI_MODE=""
FILTER=""
SHARD=""
REBUILD=false
STOP_AFTER=false
SKIP_BUILD=false
SHOW_LOGS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --headed)
      HEADED="--headed"
      shift
      ;;
    --debug)
      DEBUG="--debug"
      shift
      ;;
    --ui)
      UI_MODE="--ui"
      shift
      ;;
    --filter)
      FILTER="$2"
      shift 2
      ;;
    --shard)
      SHARD="--shard=$2"
      shift 2
      ;;
    --rebuild)
      REBUILD=true
      shift
      ;;
    --down)
      STOP_AFTER=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --logs)
      SHOW_LOGS=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --headed      Run with browser visible"
      echo "  --debug       Run with Playwright inspector"
      echo "  --ui          Run with Playwright UI mode"
      echo "  --filter STR  Run specific test file(s)"
      echo "  --shard N/M   Run specific shard (e.g., 1/8)"
      echo "  --rebuild     Force rebuild of Docker containers"
      echo "  --down        Stop containers after tests"
      echo "  --skip-build  Skip container rebuild (use existing)"
      echo "  --logs        Show Docker container logs"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MoneyWise Docker E2E Test Runner${NC}"
echo -e "${BLUE}  (Replicates CI environment locally)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$PROJECT_ROOT"

# Step 1: Start Docker Compose E2E services
echo -e "${YELLOW}Step 1: Starting Docker Compose E2E environment...${NC}"

if [ "$REBUILD" = true ]; then
  echo -e "${YELLOW}  Rebuilding containers (--rebuild flag)...${NC}"
  docker compose -f docker-compose.e2e.yml down -v 2>/dev/null || true
  docker compose -f docker-compose.e2e.yml build --no-cache
fi

if [ "$SKIP_BUILD" = false ]; then
  docker compose -f docker-compose.e2e.yml up -d --build
else
  echo -e "${YELLOW}  Skipping build (--skip-build flag)...${NC}"
  docker compose -f docker-compose.e2e.yml up -d
fi

# Step 2: Wait for services to be healthy
echo ""
echo -e "${YELLOW}Step 2: Waiting for services to be healthy...${NC}"

TIMEOUT=300
ELAPSED=0
while true; do
  BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' moneywise-backend-e2e 2>/dev/null || echo "starting")
  FRONTEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' moneywise-frontend-e2e 2>/dev/null || echo "starting")

  if [ "$BACKEND_HEALTH" = "healthy" ] && [ "$FRONTEND_HEALTH" = "healthy" ]; then
    echo -e "${GREEN}  All containers healthy!${NC}"
    break
  fi

  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${RED}  Timeout waiting for containers to be healthy${NC}"
    echo -e "${YELLOW}  Backend: $BACKEND_HEALTH, Frontend: $FRONTEND_HEALTH${NC}"
    echo -e "${YELLOW}  Showing last 50 lines of logs:${NC}"
    docker compose -f docker-compose.e2e.yml logs --tail=50
    exit 1
  fi

  printf "\r  Backend: %-10s Frontend: %-10s (%ds)" "$BACKEND_HEALTH" "$FRONTEND_HEALTH" "$ELAPSED"
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

# Verify HTTP endpoints
echo ""
echo -e "${YELLOW}Step 3: Verifying HTTP endpoints...${NC}"

for i in {1..30}; do
  if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}  Backend API: healthy${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}  Backend API: not responding after 30s${NC}"
    exit 1
  fi
  sleep 1
done

for i in {1..30}; do
  if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}  Frontend: healthy${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}  Frontend: not responding after 30s${NC}"
    exit 1
  fi
  sleep 1
done

# Step 4: Create test users (exactly like CI)
# NOTE: Test password can be overridden via E2E_TEST_PASSWORD env var
# This is ONLY for local E2E testing - never use in production/staging
echo ""
echo -e "${YELLOW}Step 4: Creating E2E test users...${NC}"

# Use env var or default test password
TEST_PASSWORD="${E2E_TEST_PASSWORD:-SecureTest#2025!}"

# Create shard users (0-7)
for i in $(seq 0 7); do
  EMAIL="e2e-shard-${i}@moneywise.test"
  RESPONSE=$(curl -sf -X POST http://localhost:3001/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$TEST_PASSWORD\",\"firstName\":\"E2E\",\"lastName\":\"Shard$i\"}" 2>&1 || echo "exists_or_error")

  if echo "$RESPONSE" | grep -q "already exists"; then
    echo -e "  ${YELLOW}$EMAIL (already exists)${NC}"
  elif echo "$RESPONSE" | grep -q "exists_or_error"; then
    echo -e "  ${YELLOW}$EMAIL (exists or registered)${NC}"
  else
    echo -e "  ${GREEN}$EMAIL (created)${NC}"
  fi
done

# Show logs if requested
if [ "$SHOW_LOGS" = true ]; then
  echo ""
  echo -e "${YELLOW}=== Docker Compose Logs ===${NC}"
  docker compose -f docker-compose.e2e.yml logs --tail=100
fi

# Step 5: Install Playwright browsers (if needed)
echo ""
echo -e "${YELLOW}Step 5: Checking Playwright installation...${NC}"
cd apps/web

# Check if browsers are installed
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo -e "${YELLOW}  Installing Playwright browsers...${NC}"
  pnpm exec playwright install chromium
else
  echo -e "${GREEN}  Playwright browsers already installed${NC}"
fi

# Step 6: Run E2E tests
echo ""
echo -e "${YELLOW}Step 6: Running E2E tests...${NC}"

# Build test command
TEST_CMD="pnpm exec playwright test"

if [ -n "$HEADED" ]; then
  TEST_CMD="$TEST_CMD $HEADED"
fi

if [ -n "$DEBUG" ]; then
  TEST_CMD="$TEST_CMD $DEBUG"
fi

if [ -n "$UI_MODE" ]; then
  TEST_CMD="$TEST_CMD $UI_MODE"
fi

if [ -n "$FILTER" ]; then
  TEST_CMD="$TEST_CMD $FILTER"
fi

if [ -n "$SHARD" ]; then
  TEST_CMD="$TEST_CMD $SHARD"
fi

echo -e "${BLUE}  Command: $TEST_CMD${NC}"
echo ""

# Set environment for tests (same as CI)
export PLAYWRIGHT_BASE_URL=http://localhost:3000
export CI=false

# Run tests
set +e
$TEST_CMD
TEST_EXIT_CODE=$?
set -e

cd "$PROJECT_ROOT"

# Step 7: Cleanup (if requested)
echo ""
if [ "$STOP_AFTER" = true ]; then
  echo -e "${YELLOW}Step 7: Stopping Docker containers...${NC}"
  docker compose -f docker-compose.e2e.yml down
else
  echo -e "${YELLOW}Step 7: Containers still running${NC}"
  echo -e "  ${BLUE}To stop:      docker compose -f docker-compose.e2e.yml down${NC}"
  echo -e "  ${BLUE}To view logs: docker compose -f docker-compose.e2e.yml logs -f${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}   E2E Tests PASSED${NC}"
else
  echo -e "${RED}   E2E Tests FAILED (exit code: $TEST_EXIT_CODE)${NC}"
fi
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  View test report:  cd apps/web && pnpm exec playwright show-report"
echo -e "  View traces:       cd apps/web && pnpm exec playwright show-trace"
echo -e "  Run single test:   ./.claude/scripts/run-e2e-docker.sh --filter 'smoke.spec.ts'"
echo -e "  Debug mode:        ./.claude/scripts/run-e2e-docker.sh --debug"
echo -e "  UI mode:           ./.claude/scripts/run-e2e-docker.sh --ui"
echo -e "  Re-run (fast):     ./.claude/scripts/run-e2e-docker.sh --skip-build"
echo ""

exit $TEST_EXIT_CODE
