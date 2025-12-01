#!/bin/bash
# Code Validation: TypeScript Compilation Check
# Runs the same typecheck that CI/CD runs in the development job
#
# This mirrors: pnpm typecheck from .github/workflows/ci-cd.yml

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

echo -e "${YELLOW}🔧 CODE CHECK: TypeScript Compilation${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${RED}❌ Dependencies not installed${NC}"
  echo "Run: pnpm install"
  exit 1
fi

# Run typecheck
echo "Running TypeScript compilation check..."
if pnpm typecheck 2>&1; then
  echo ""
  echo -e "${GREEN}✅ TypeScript compilation passed${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}❌ TypeScript compilation failed${NC}"
  echo "Fix the type errors shown above before pushing."
  exit 1
fi
