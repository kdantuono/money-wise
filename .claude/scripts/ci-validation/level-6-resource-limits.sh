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

    # Extract jobs section (everything between "jobs:" and next top-level section or EOF)
    jobs_section=$(sed -n '/^jobs:/,/^[a-z]/p' "$file" | head -n -1)

    # Get two-space indented items in jobs section (potential job names)
    # Exclude known non-job keywords: env, permissions, strategy, defaults, concurrency, outputs, if, runs
    all_items=$(echo "$jobs_section" | grep -E "^  [a-zA-Z0-9_-]+:" | sed 's/^  \([^:]*\):.*/\1/')

    JOBS=$(echo "$all_items" | grep -v -E "^(env|permissions|strategy|defaults|concurrency|outputs|if|runs|needs)$")

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
  echo -e "${RED}❌ BLOCKING ERROR: Found $WARNINGS jobs without timeout-minutes${NC}"
  echo "ZERO TOLERANCE: All jobs MUST have explicit timeout-minutes"
  echo "Add: timeout-minutes: 15  (adjust as needed for your jobs)"
  echo ""
  echo "Why? Hanging jobs exhaust resources and block workflows for all developers."
  exit 1
fi

echo -e "${GREEN}✅ LEVEL 6 PASSED: All jobs have timeout-minutes configured${NC}"
exit 0
