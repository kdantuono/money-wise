#!/bin/bash
# LEVEL 11: Documentation Quality Validation
# Validates API documentation coverage, markdown links, and OpenAPI spec

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 LEVEL 11: Documentation Quality${NC}"
echo ""

FAILED=0
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$PROJECT_ROOT"

# Check 1: TypeDoc API Documentation Coverage
echo -e "${YELLOW}→ Checking TypeDoc API documentation coverage...${NC}"
if command -v pnpm &> /dev/null; then
  # Generate TypeDoc documentation
  if pnpm typedoc --json docs/api/documentation.json > /dev/null 2>&1; then
    # Check coverage from JSON output
    if [ -f "docs/api/documentation.json" ]; then
      COVERAGE=$(node -e "try { const d=require('./docs/api/documentation.json'); console.log(d.coveragePercent || 0); } catch(e) { console.log(0); }" 2>/dev/null || echo "0")
      THRESHOLD=80

      if (( $(echo "$COVERAGE >= $THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${GREEN}  ✅ TypeDoc coverage: ${COVERAGE}% (threshold: ${THRESHOLD}%)${NC}"
      else
        echo -e "${RED}  ❌ TypeDoc coverage below threshold: ${COVERAGE}% < ${THRESHOLD}%${NC}"
        echo -e "${YELLOW}     Run 'pnpm docs:coverage' to see detailed report${NC}"
        FAILED=$((FAILED + 1))
      fi
    else
      echo -e "${YELLOW}  ⚠️  documentation.json not found, skipping coverage check${NC}"
    fi
  else
    echo -e "${YELLOW}  ⚠️  TypeDoc generation failed, check configuration${NC}"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${RED}  ❌ pnpm not found${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Check 2: Markdown Link Validation
echo -e "${YELLOW}→ Validating markdown links...${NC}"
if command -v markdown-link-check &> /dev/null; then
  BROKEN_LINKS=0

  # Check docs directory
  if [ -d "docs" ]; then
    while IFS= read -r -d '' file; do
      if ! markdown-link-check "$file" --config .markdown-link-check.json --quiet > /dev/null 2>&1; then
        echo -e "${RED}  ❌ Broken links in: $file${NC}"
        BROKEN_LINKS=$((BROKEN_LINKS + 1))
      fi
    done < <(find docs -name "*.md" -print0 2>/dev/null)
  fi

  # Check .claude directory
  if [ -d ".claude" ]; then
    while IFS= read -r -d '' file; do
      if ! markdown-link-check "$file" --config .markdown-link-check.json --quiet > /dev/null 2>&1; then
        echo -e "${RED}  ❌ Broken links in: $file${NC}"
        BROKEN_LINKS=$((BROKEN_LINKS + 1))
      fi
    done < <(find .claude -name "*.md" -print0 2>/dev/null)
  fi

  if [ $BROKEN_LINKS -eq 0 ]; then
    echo -e "${GREEN}  ✅ All markdown links valid${NC}"
  else
    echo -e "${RED}  ❌ Found $BROKEN_LINKS file(s) with broken links${NC}"
    echo -e "${YELLOW}     Run 'pnpm docs:links' for detailed report${NC}"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${YELLOW}  ⚠️  markdown-link-check not installed, skipping${NC}"
fi
echo ""

# Check 3: OpenAPI Specification Validation
echo -e "${YELLOW}→ Validating OpenAPI specification...${NC}"
if [ -f "apps/backend/scripts/generate-openapi.ts" ]; then
  if pnpm tsx apps/backend/scripts/generate-openapi.ts > /dev/null 2>&1; then
    # Verify OpenAPI file was generated
    if [ -f "docs/api/openapi.json" ] || [ -f "docs/api/openapi.yaml" ]; then
      echo -e "${GREEN}  ✅ OpenAPI specification valid${NC}"
    else
      echo -e "${RED}  ❌ OpenAPI generation did not produce output file${NC}"
      FAILED=$((FAILED + 1))
    fi
  else
    echo -e "${RED}  ❌ OpenAPI generation failed${NC}"
    echo -e "${YELLOW}     Run 'pnpm docs:openapi' to see errors${NC}"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${YELLOW}  ⚠️  OpenAPI generator script not found, skipping${NC}"
fi
echo ""

# Final result
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ LEVEL 11: Documentation Quality PASSED${NC}"
  exit 0
else
  echo -e "${RED}❌ LEVEL 11: Documentation Quality FAILED${NC}"
  echo -e "${YELLOW}Fix documentation issues and run validation again${NC}"
  exit 1
fi
