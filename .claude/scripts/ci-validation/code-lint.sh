#!/bin/bash
# Code Validation: ESLint Check
# Runs the same lint that CI/CD runs in the development job
#
# This mirrors: pnpm lint from .github/workflows/ci-cd.yml

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

echo -e "${YELLOW}📋 CODE CHECK: ESLint Validation${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${RED}❌ Dependencies not installed${NC}"
  echo "Run: pnpm install"
  exit 1
fi

# Run lint
echo "Running ESLint validation..."
if pnpm lint 2>&1; then
  echo ""
  echo -e "${GREEN}✅ ESLint validation passed${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}❌ ESLint validation failed${NC}"
  echo "Fix the linting errors shown above before pushing."
  echo ""
  echo "Tip: Run 'pnpm lint:fix' to auto-fix some issues."
  exit 1
fi
