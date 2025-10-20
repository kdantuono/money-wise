#!/bin/bash
# Level 9: Act Dry-Run (GitHub Actions Local Simulation)
# Tests GitHub Actions locally using act - DRY RUN (list only, don't execute)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔍 LEVEL 9: GitHub Actions Dry-Run (act) - MANDATORY${NC}"
echo ""

# Determine act path - check local first, then system
ACT_PATH=""
if [ -f "./.claude/tools/act" ]; then
  ACT_PATH="./.claude/tools/act"
elif command -v act &> /dev/null; then
  ACT_PATH="act"
else
  echo -e "${RED}❌ act not installed - REQUIRED for pre-push validation${NC}"
  echo "Install using one of these methods:"
  echo "  • Automatic: pnpm setup:act"
  echo "  • Manual: curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | bash"
  echo "  • Homebrew: brew install act"
  echo ""
  echo -e "${RED}BLOCKING: act is mandatory for local workflow simulation${NC}"
  exit 1  # MANDATORY - block if not installed
fi

if ! docker ps &> /dev/null; then
  echo -e "${RED}❌ Docker not running - REQUIRED for act simulation${NC}"
  echo "Start Docker daemon and try again."
  exit 1  # MANDATORY - block if Docker not running
fi

echo "Running dry-run for main workflow..."
"$ACT_PATH" pull_request --list -W .github/workflows/ci-cd.yml

echo ""
echo -e "${GREEN}✅ LEVEL 9 PASSED: Act dry-run validation complete${NC}"
exit 0
