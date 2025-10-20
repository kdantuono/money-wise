#!/bin/bash

# Documentation Validation Script
# Validates MoneyWise documentation for quality and consistency
# Usage: ./validate-docs.sh

set -euo pipefail

DOCS_DIR="docs"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 MoneyWise Documentation Validation${NC}"
echo "=================================================="
echo ""

ISSUES=0
WARNINGS=0

# Check 1: Markdown files exist
echo -e "${BLUE}📝 Check 1: Finding Markdown Files${NC}"
MD_COUNT=$(find "$DOCS_DIR" -name "*.md" -type f 2>/dev/null | wc -l)
echo "Found $MD_COUNT markdown files"
echo ""

# Check 2: Required headers
echo -e "${BLUE}📋 Check 2: Document Headers${NC}"
while IFS= read -r file; do
    if grep -q "^# " "$file"; then
        echo -e "${GREEN}✓${NC} $file has title"
    else
        echo -e "${YELLOW}⚠${NC}  $file missing title"
        ((WARNINGS++))
    fi
done < <(find "$DOCS_DIR" -name "*.md" -type f 2>/dev/null | head -20)
echo ""

# Check 3: Large files
echo -e "${BLUE}📊 Check 3: Document Size${NC}"
find "$DOCS_DIR" -name "*.md" -type f 2>/dev/null | while read file; do
    LINES=$(wc -l < "$file")
    if [[ $LINES -gt 1000 ]]; then
        echo -e "${YELLOW}⚠${NC}  $file has $LINES lines (large document)"
    fi
done
echo ""

# Check 4: TODO comments
echo -e "${BLUE}📌 Check 4: Unresolved TODOs${NC}"
TODO_COUNT=$(grep -r "TODO\|FIXME" "$DOCS_DIR" 2>/dev/null | wc -l || echo "0")
if [[ $TODO_COUNT -gt 0 ]]; then
    echo -e "${YELLOW}⚠${NC}  Found $TODO_COUNT TODO/FIXME comments"
    ((WARNINGS+=$TODO_COUNT))
else
    echo -e "${GREEN}✓${NC} No unresolved TODOs"
fi
echo ""

# Summary
echo "=================================================="
echo -e "${BLUE}📊 Validation Summary${NC}"
echo "=================================================="
echo "Total files: $MD_COUNT"
echo "Issues: $ISSUES"
echo "Warnings: $WARNINGS"
echo ""

if [[ $ISSUES -gt 0 ]]; then
    echo -e "${RED}❌ Validation FAILED${NC}"
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}⚠${NC}  Validation PASSED with warnings"
    exit 0
else
    echo -e "${GREEN}✅ Validation PASSED${NC}"
    exit 0
fi
