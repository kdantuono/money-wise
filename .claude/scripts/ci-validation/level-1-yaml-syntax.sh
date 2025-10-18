#!/bin/bash
# Level 1: YAML Syntax Validation
# Checks all workflow YAML files for syntax errors using yamllint

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'  # No Color

echo -e "${YELLOW}🔍 LEVEL 1: YAML Syntax Validation${NC}"
echo ""

if ! command -v yamllint &> /dev/null; then
  echo -e "${RED}❌ yamllint not installed${NC}"
  echo "Install: pip install yamllint"
  exit 1
fi

WORKFLOW_DIR=".github/workflows"
if [ ! -d "$WORKFLOW_DIR" ]; then
  echo -e "${RED}❌ $WORKFLOW_DIR directory not found${NC}"
  exit 1
fi

FAILED=0
CHECKED=0

# Find all YAML workflow files
YAML_FILES=$(find "$WORKFLOW_DIR" -name "*.yml" -o -name "*.yaml" 2>/dev/null | sort)

if [ -z "$YAML_FILES" ]; then
  echo -e "${RED}❌ No YAML workflow files found${NC}"
  exit 1
fi

for file in $YAML_FILES; do
  CHECKED=$((CHECKED + 1))

  if yamllint -d "{extends: relaxed, rules: {line-length: {max: 120}}}" "$file" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} $file"
  else
    echo -e "${RED}❌ FAILED${NC}: $file"
    yamllint -d "{extends: relaxed, rules: {line-length: {max: 120}}}" "$file" 2>&1 | head -5
    FAILED=1
  fi
done

echo ""
echo "📊 Checked $CHECKED YAML files"

if [ $FAILED -eq 1 ]; then
  echo -e "${RED}❌ LEVEL 1 FAILED: Fix YAML syntax errors${NC}"
  exit 1
fi

echo -e "${GREEN}✅ LEVEL 1 PASSED: All YAML files are syntactically correct${NC}"
exit 0
