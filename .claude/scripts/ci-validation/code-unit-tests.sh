#!/bin/bash
# Code Validation: Unit Tests
# Runs the same unit tests that CI/CD runs in the testing job
#
# This mirrors: pnpm test:unit from .github/workflows/ci-cd.yml

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

echo -e "${YELLOW}🧪 CODE CHECK: Unit Tests${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${RED}❌ Dependencies not installed${NC}"
  echo "Run: pnpm install"
  exit 1
fi

# Set test environment variables (matching CI/CD)
export NODE_ENV=test
export JWT_ACCESS_SECRET=test-jwt-access-secret-minimum-32-characters-long-for-testing-purposes
export JWT_REFRESH_SECRET=test-jwt-refresh-secret-minimum-32-characters-long-different-from-access

# Check if Prisma client is generated (required for backend tests)
if [ ! -d "apps/backend/generated" ]; then
  echo "Generating Prisma client..."
  pnpm --filter @money-wise/backend exec prisma generate 2>/dev/null || true
fi

# Run unit tests
echo "Running unit tests..."
if pnpm test:unit 2>&1; then
  echo ""
  echo -e "${GREEN}✅ Unit tests passed${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}❌ Unit tests failed${NC}"
  echo "Fix the failing tests before pushing."
  exit 1
fi
