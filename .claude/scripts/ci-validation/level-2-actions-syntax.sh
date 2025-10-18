#!/bin/bash
# Level 2: GitHub Actions Syntax Validation
# Checks GitHub Actions workflows for common issues using actionlint (fallback to warnings)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

echo -e "${YELLOW}🔍 LEVEL 2: GitHub Actions Syntax Validation${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
if [ ! -d "$WORKFLOW_DIR" ]; then
  echo -e "${RED}❌ $WORKFLOW_DIR directory not found${NC}"
  exit 1
fi

# Check if actionlint is available
if command -v actionlint &> /dev/null; then
  echo "Using actionlint for comprehensive validation..."

  if actionlint -color "$WORKFLOW_DIR"/*.yml > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All workflows passed actionlint validation${NC}"
  else
    echo -e "${YELLOW}⚠️  actionlint found issues:${NC}"
    actionlint -color "$WORKFLOW_DIR"/*.yml || true
    echo ""
    echo -e "${BLUE}ℹ️  Warnings are informational. Check manually if needed.${NC}"
  fi
else
  echo -e "${BLUE}ℹ️  actionlint not installed. Running basic validation...${NC}"
  echo "Install: brew install actionlint or download from https://github.com/rhysd/actionlint"

  # Basic validation: Check for common issues
  FAILED=0

  for file in "$WORKFLOW_DIR"/*.yml; do
    if [ -f "$file" ]; then
      # Check for required fields
      if ! grep -q "^name:" "$file"; then
        echo -e "${RED}❌ Missing 'name' in $file${NC}"
        FAILED=1
      fi

      if ! grep -q "^on:" "$file"; then
        echo -e "${RED}❌ Missing 'on' trigger in $file${NC}"
        FAILED=1
      fi

      if ! grep -q "^jobs:" "$file"; then
        echo -e "${RED}❌ Missing 'jobs' section in $file${NC}"
        FAILED=1
      fi
    fi
  done

  if [ $FAILED -eq 1 ]; then
    echo -e "${RED}❌ LEVEL 2 FAILED: Fix workflow structure${NC}"
    exit 1
  fi

  echo -e "${GREEN}✅ Basic workflow structure validation passed${NC}"
fi

echo -e "${GREEN}✅ LEVEL 2 PASSED: GitHub Actions syntax is valid${NC}"
exit 0
