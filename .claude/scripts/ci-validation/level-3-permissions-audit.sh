#!/bin/bash
# Level 3: Workflow Permissions Audit
# Checks if workflows have correct permission configurations

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

echo -e "${YELLOW}🔍 LEVEL 3: Permissions Audit${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
if [ ! -d "$WORKFLOW_DIR" ]; then
  echo -e "${RED}❌ $WORKFLOW_DIR directory not found${NC}"
  exit 1
fi

ISSUES=0

for file in "$WORKFLOW_DIR"/*.yml; do
  if [ -f "$file" ]; then
    echo -e "${BLUE}📋 Checking: $(basename "$file")${NC}"

    # Check if file creates PR comments
    if grep -q "createComment\|issues.*comment\|github-script" "$file"; then
      # This job creates PR comments - needs pull-requests: write
      if ! grep -q "pull-requests:.*write" "$file"; then
        # Check if it's scoped to specific jobs only
        if ! grep -A20 "permissions:" "$file" | grep -q "pull-requests:.*write"; then
          echo -e "${YELLOW}⚠️  Creates PR comments but missing 'pull-requests: write' permission${NC}"
          echo "   Consider adding to permissions block:"
          echo "   permissions:"
          echo "     pull-requests: write"
          ISSUES=$((ISSUES + 1))
        fi
      fi
    fi

    # Check if file uploads artifacts but no permissions defined
    if grep -q "upload-artifact\|upload.*.action" "$file"; then
      if ! grep -q "^permissions:" "$file"; then
        echo -e "${YELLOW}⚠️  Uses artifacts but no permissions block defined${NC}"
        ISSUES=$((ISSUES + 1))
      fi
    fi

    # Check if file writes security events (CodeQL, etc.)
    if grep -q "semgrep\|codeql\|trivy" "$file"; then
      if ! grep -q "security-events:.*write" "$file"; then
        echo -e "${YELLOW}⚠️  Uses security tools but missing 'security-events: write' permission${NC}"
        ISSUES=$((ISSUES + 1))
      fi
    fi
  fi
done

echo ""
if [ $ISSUES -gt 0 ]; then
  echo -e "${YELLOW}⚠️  LEVEL 3 PASSED with $ISSUES warnings${NC}"
  echo "These are not blocking issues, but should be reviewed."
  exit 0  # Warnings only, not failures
fi

echo -e "${GREEN}✅ LEVEL 3 PASSED: Permissions are correctly configured${NC}"
exit 0
