#!/bin/bash
# Level 5: Secrets & Environment Variables Check
# Documents and validates secret usage in workflows

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔍 LEVEL 5: Secrets & Environment Variables Check${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
SECRETS_FILE=".github/SECRETS.md"
FOUND_SECRETS=0

for file in "$WORKFLOW_DIR"/*.yml; do
  if [ -f "$file" ]; then
    # Find all secret references
    SECRETS=$(grep -o '\${{ secrets\.[A-Z_]* }}' "$file" 2>/dev/null | sed 's/\${{ secrets\.\([A-Z_]*\) }}/\1/' | sort -u)

    if [ -n "$SECRETS" ]; then
      FOUND_SECRETS=1
      echo -e "${BLUE}📝 Secrets in $(basename "$file"):${NC}"
      echo "$SECRETS" | sed 's/^/   - /'
    fi
  fi
done

echo ""
if [ $FOUND_SECRETS -eq 1 ]; then
  if [ ! -f "$SECRETS_FILE" ]; then
    echo -e "${YELLOW}⚠️  Secrets found but .github/SECRETS.md not present${NC}"
    echo "Consider creating documentation for required secrets"
  else
    echo -e "${GREEN}✅ Secrets are documented in .github/SECRETS.md${NC}"
  fi
fi

echo -e "${GREEN}✅ LEVEL 5 PASSED: Secrets validation complete${NC}"
exit 0
