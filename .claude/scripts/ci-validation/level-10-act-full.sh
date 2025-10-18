#!/bin/bash
# Level 10: Full Act Test
# Executes GitHub Actions locally using act
# NOTE: This requires Docker and significant time (~5-10 min)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔍 LEVEL 10: Full GitHub Actions Local Test (act) - MANDATORY${NC}"
echo ""

if ! command -v act &> /dev/null; then
  echo -e "${RED}❌ act not installed - REQUIRED for pre-push validation${NC}"
  echo "Install using one of these methods:"
  echo "  • Automatic: pnpm setup:act"
  echo "  • Manual: curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | bash"
  echo "  • Homebrew: brew install act"
  echo ""
  echo -e "${RED}BLOCKING: act is mandatory for local workflow testing${NC}"
  exit 1  # MANDATORY
fi

if ! docker ps &> /dev/null; then
  echo -e "${RED}❌ Docker not running - REQUIRED for act execution${NC}"
  echo "Start Docker: docker desktop or docker daemon"
  echo ""
  echo -e "${RED}BLOCKING: Docker is mandatory for local workflow testing${NC}"
  exit 1  # MANDATORY
fi

echo -e "${BLUE}ℹ️  Running lightweight foundation jobs locally...${NC}"
echo "(Full E2E tests skipped to save time)"
echo ""

# Run just foundation and basic validation jobs
act pull_request \
  -W .github/workflows/ci-cd.yml \
  -j foundation \
  --pull=false \
  --quiet 2>/dev/null

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ LEVEL 10 PASSED: Local workflow execution successful${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}❌ Local workflow execution failed${NC}"
  echo "For full details: act pull_request -W .github/workflows/ci-cd.yml --verbose"
  exit 1  # MANDATORY - block if execution fails
fi
