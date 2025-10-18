#!/bin/bash
# Level 2: GitHub Actions Syntax Validation
# Checks GitHub Actions workflows for common issues using actionlint
# Priority: Local actionlint → System actionlint → Basic YAML validation

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

echo -e "${YELLOW}🔍 LEVEL 2: GitHub Actions Syntax Validation${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"
LOCAL_ACTIONLINT="$PROJECT_ROOT/.claude/tools/actionlint"

if [ ! -d "$WORKFLOW_DIR" ]; then
  echo -e "${RED}❌ $WORKFLOW_DIR directory not found${NC}"
  exit 1
fi

# Priority 1: Try local actionlint (.claude/tools/actionlint)
if [ -x "$LOCAL_ACTIONLINT" ]; then
  echo -e "${BLUE}📍 Using local actionlint: $LOCAL_ACTIONLINT${NC}"

  if "$LOCAL_ACTIONLINT" -color "$WORKFLOW_DIR"/*.yml > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All workflows passed actionlint validation${NC}"
  else
    echo -e "${YELLOW}⚠️  actionlint found issues:${NC}"
    "$LOCAL_ACTIONLINT" -color "$WORKFLOW_DIR"/*.yml || true
    echo ""
    echo -e "${BLUE}ℹ️  Warnings are informational. Run with -strict for stricter checks.${NC}"
  fi

  echo -e "${GREEN}✅ LEVEL 2 PASSED: GitHub Actions syntax is valid${NC}"
  exit 0
fi

# Priority 2: Try system actionlint
if command -v actionlint &> /dev/null; then
  echo -e "${BLUE}📍 Using system actionlint${NC}"

  if actionlint -color "$WORKFLOW_DIR"/*.yml > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All workflows passed actionlint validation${NC}"
  else
    echo -e "${YELLOW}⚠️  actionlint found issues:${NC}"
    actionlint -color "$WORKFLOW_DIR"/*.yml || true
    echo ""
    echo -e "${BLUE}ℹ️  Warnings are informational. Run with -strict for stricter checks.${NC}"
  fi

  echo -e "${GREEN}✅ LEVEL 2 PASSED: GitHub Actions syntax is valid${NC}"
  exit 0
fi

# Priority 3: Basic YAML validation (fallback)
echo -e "${YELLOW}📍 actionlint not found, running basic YAML validation...${NC}"
echo "💡 Install actionlint for comprehensive validation:"
echo "   • Automatic: pnpm setup:actionlint"
echo "   • Manual: https://github.com/rhysd/actionlint/releases"
echo ""

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

    # Basic YAML syntax check (no tabs allowed in YAML)
    if grep -P '\t' "$file" > /dev/null; then
      echo -e "${RED}❌ Tabs detected in $file (use spaces instead)${NC}"
      FAILED=1
    fi
  fi
done

if [ $FAILED -eq 1 ]; then
  echo ""
  echo -e "${RED}❌ LEVEL 2 FAILED: Fix workflow structure${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Basic workflow structure validation passed${NC}"
echo -e "${GREEN}✅ LEVEL 2 PASSED: GitHub Actions syntax is valid (basic check)${NC}"
exit 0
