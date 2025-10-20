#!/bin/bash
# Level 7: Path Filters & Trigger Validation
# Checks that path filters reference valid paths

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔍 LEVEL 7: Path Filters & Trigger Validation${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
WARNINGS=0

for file in "$WORKFLOW_DIR"/*.yml; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")

    # Check for paths in push/pull_request triggers
    if grep -q "paths:" "$file"; then
      echo -e "${BLUE}📋 Checking paths in $filename${NC}"

      # Extract path filters (basic check)
      PATHS=$(grep -A5 "paths:" "$file" | grep -E "^\s+-" | sed 's/.*- //')

      while IFS= read -r path; do
        if [ -n "$path" ]; then
          # Remove quotes
          path_clean=$(echo "$path" | sed "s/'//g" | sed 's/"//g')
          # Remove glob patterns for basic validation
          base_path=$(echo "$path_clean" | sed 's/\*\*.*$//' | sed 's/\*$//')

          # Only check if path doesn't start with . or *
          if [[ ! "$base_path" =~ ^\. ]] && [[ "$base_path" != "" ]] && [[ ! "$base_path" =~ ^\* ]]; then
            if [ ! -e "$base_path" ]; then
              echo -e "${YELLOW}⚠️  Path filter references potentially non-existent path: $path_clean${NC}"
              WARNINGS=$((WARNINGS + 1))
            fi
          fi
        fi
      done <<< "$PATHS"
    fi
  fi
done

echo ""
if [ $WARNINGS -gt 0 ]; then
  echo -e "${RED}❌ BLOCKING ERROR: Found $WARNINGS invalid path filters${NC}"
  echo "ZERO TOLERANCE: All path filters MUST reference existing directories"
  echo "Invalid paths prevent workflow triggers from ever firing."
  exit 1
fi

echo -e "${GREEN}✅ LEVEL 7 PASSED: All path filters reference valid locations${NC}"
exit 0
