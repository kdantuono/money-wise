#!/bin/bash
# Level 6: Timeout & Resource Limits Validation
# Checks that jobs have appropriate timeout values

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔍 LEVEL 6: Timeout & Resource Limits Validation${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
WARNINGS=0

for file in "$WORKFLOW_DIR"/*.yml; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")

    # Check each job for timeout-minutes
    JOBS=$(grep -E "^  [a-zA-Z0-9_-]+:" "$file" | grep -v "outputs:" | sed 's/^  \([^:]*\):.*/\1/')

    while IFS= read -r job; do
      if [ -n "$job" ]; then
        # Check if this job has timeout-minutes
        if ! sed -n "/^  $job:/,/^  [a-z]/p" "$file" | grep -q "timeout-minutes:"; then
          echo -e "${YELLOW}⚠️  Job '$job' in $filename has no timeout-minutes${NC}"
          WARNINGS=$((WARNINGS + 1))
        fi
      fi
    done <<< "$JOBS"
  fi
done

echo ""
if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $WARNINGS jobs without timeout-minutes${NC}"
  echo "Add: timeout-minutes: 15  (adjust as needed)"
fi

echo -e "${GREEN}✅ LEVEL 6 PASSED: Resource limits check complete${NC}"
exit 0
