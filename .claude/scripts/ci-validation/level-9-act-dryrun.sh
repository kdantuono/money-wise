#!/bin/bash
# Level 9: Act Dry-Run (GitHub Actions Local Simulation)
# Tests GitHub Actions locally using act - DRY RUN (list only, don't execute)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔍 LEVEL 9: GitHub Actions Dry-Run (act)${NC}"
echo ""

if ! command -v act &> /dev/null; then
  echo -e "${YELLOW}⚠️  act not installed - skipping dry-run${NC}"
  echo "Install: curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | bash"
  echo "Or: brew install act"
  echo ""
  echo -e "${BLUE}ℹ️  This is optional for pre-push validation${NC}"
  exit 0  # Not blocking
fi

if ! docker ps &> /dev/null; then
  echo -e "${YELLOW}⚠️  Docker not running - skipping act dry-run${NC}"
  echo "Start Docker and try again."
  exit 0  # Not blocking
fi

echo "Running dry-run for main workflow..."
act pull_request --list -W .github/workflows/ci-cd.yml

echo ""
echo -e "${GREEN}✅ LEVEL 9: Act dry-run ready (execution optional)${NC}"
exit 0
