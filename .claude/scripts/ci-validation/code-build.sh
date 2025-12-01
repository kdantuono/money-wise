#!/bin/bash
# Code Validation: Build Check
# Verifies that both backend and web apps can build successfully
#
# This mirrors: the build job from .github/workflows/ci-cd.yml

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

echo -e "${YELLOW}🏗️ CODE CHECK: Build Verification${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${RED}❌ Dependencies not installed${NC}"
  echo "Run: pnpm install"
  exit 1
fi

FAILED=0

# Build backend
echo "Building backend..."
if pnpm --filter @money-wise/backend build 2>&1; then
  echo -e "${GREEN}✅ Backend build passed${NC}"
else
  echo -e "${RED}❌ Backend build failed${NC}"
  FAILED=1
fi

echo ""

# Build web
echo "Building web app..."
if pnpm --filter @money-wise/web build 2>&1; then
  echo -e "${GREEN}✅ Web build passed${NC}"
else
  echo -e "${RED}❌ Web build failed${NC}"
  FAILED=1
fi

echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All builds passed${NC}"
  exit 0
else
  echo -e "${RED}❌ Build verification failed${NC}"
  echo "Fix build errors before pushing."
  exit 1
fi
