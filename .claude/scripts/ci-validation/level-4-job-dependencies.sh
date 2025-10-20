#!/bin/bash
# Level 4: Job Dependency Graph Validation
# Checks that all job dependencies reference existing jobs
#
# Phase 1 Enhancement:
#   ✅ Exit-code based validation (SWE-Factory)
#   ✅ TRAIL error taxonomy (LOGIC type)
#   ✅ Trace collection for diagnostics
#   ✅ Standardized reporting functions

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

# Initialize tracing
init_trace_collection 4

echo -e "${YELLOW}🔍 LEVEL 4: Job Dependency Graph Validation${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
ERRORS=0

# Start timing this level
TIMER_START=$(start_timer)

for file in "$WORKFLOW_DIR"/*.yml; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    display_path=$(get_display_path "$file")

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
              echo -e "${RED}❌ LOGIC ERROR: In $filename:${NC}"
              echo -e "${RED}   Job '$job' needs '$need_clean' which doesn't exist${NC}"
              echo -e "${RED}   Available jobs: $(echo "$JOB_NAMES" | tr '\n' ',' | sed 's/,/, /g')${NC}"

              record_trace 4 "missing-dependency" "blocking" "L" \
                "$display_path" "jobs.$job" \
                "Job dependency references non-existent job: $need_clean" \
                "Use one of existing jobs: $(echo "$JOB_NAMES" | tr '\n' ', ')"

              ERRORS=$((ERRORS + 1))
            fi
          done
        fi
      fi
    done <<< "$JOB_NAMES"
  fi
done

echo ""

# End timing
TIMER_END=$(end_timer $TIMER_START)

if [ $ERRORS -gt 0 ]; then
  report_blocking 4 "Found $ERRORS invalid job dependency reference(s)" \
    "Update dependencies to reference existing jobs"
  exit $EXIT_BLOCKING
fi

report_success 4 "All job dependencies are valid"
exit $EXIT_SUCCESS
