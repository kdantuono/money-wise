#!/bin/bash
# Level 4: Job Dependency Graph Validation
# Checks that all job dependencies reference existing jobs

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔍 LEVEL 4: Job Dependency Graph Validation${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
FAILED=0

for file in "$WORKFLOW_DIR"/*.yml; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")

    # Extract job names from jobs: section
    JOB_NAMES=$(grep -E "^  [a-zA-Z0-9_-]+:" "$file" | grep -v "outputs:" | sed 's/^  \([^:]*\):.*/\1/' | sort -u)

    # Check each job for 'needs' references
    while IFS= read -r job; do
      if [ -n "$job" ]; then
        # Look for this job's needs (handles both array and scalar formats)
        # Format 1: needs: [job1, job2, ...]
        # Format 2: needs: job
        NEEDS_LINE=$(sed -n "/^  $job:/,/^  [a-zA-Z0-9_-]/p" "$file" | grep -E "^\s+needs:" | head -1)

        if [ -n "$NEEDS_LINE" ]; then
          # Handle both array format and scalar format
          if echo "$NEEDS_LINE" | grep -q '\['; then
            # Array format: needs: [job1, job2]
            NEEDS=$(echo "$NEEDS_LINE" | sed 's/.*needs: \[\(.*\)\].*/\1/' | tr ',' '\n')
          else
            # Scalar format: needs: job
            NEEDS=$(echo "$NEEDS_LINE" | sed 's/.*needs: \(.*\)/\1/')
          fi

          echo "$NEEDS" | while IFS= read -r need; do
            # Clean job name from needs
            need_clean=$(echo "$need" | sed "s/'//g" | sed 's/"//g' | tr -d '[:space:]')

            if [ -n "$need_clean" ] && ! echo "$JOB_NAMES" | grep -q "^$need_clean$"; then
              echo -e "${RED}❌ In $filename:${NC}"
              echo "   Job '$job' needs '$need_clean' which doesn't exist"
              FAILED=1
            fi
          done
        fi
      fi
    done <<< "$JOB_NAMES"
  fi
done

echo ""
if [ $FAILED -eq 1 ]; then
  echo -e "${RED}❌ LEVEL 4 FAILED: Fix job dependency issues${NC}"
  exit 1
fi

echo -e "${GREEN}✅ LEVEL 4 PASSED: All job dependencies are valid${NC}"
exit 0
