#!/bin/bash
# Level 6: Timeout & Resource Limits Validation
# Checks that jobs have appropriate timeout values
#
# Phase 1 Enhancement:
#   ✅ Exit-code based validation (SWE-Factory)
#   ✅ TRAIL error taxonomy (Resource type)
#   ✅ Trace collection for diagnostics
#   ✅ Standardized reporting functions

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

# Initialize tracing
init_trace_collection 6

echo -e "${YELLOW}🔍 LEVEL 6: Timeout & Resource Limits Validation${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
ERRORS=0

# Start timing this level
TIMER_START=$(start_timer)

for file in "$WORKFLOW_DIR"/*.yml; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    display_path=$(get_display_path "$file")

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
          ERRORS=$((ERRORS + 1))

          # Record TRAIL trace (Type-R = Resource error)
          record_trace 6 "timeout-minutes" "blocking" "R" \
            "$display_path" "jobs.$job" \
            "Job '$job' has no timeout-minutes (RISK: Hanging job could waste $86.40+ per incident)" \
            "Add: timeout-minutes: 35  (adjust as needed for job complexity)"

          # Display error with context
          echo -e "${RED}❌ RESOURCE ERROR: Job '$job' in $filename${NC}"
          echo -e "${RED}   Issue: No timeout-minutes configured${NC}"
          echo -e "${RED}   Risk: Hanging job could run 360 minutes = $86.40 GitHub billing cost${NC}"
          echo -e "${RED}   Fix: Add timeout-minutes: 35  (adjust as needed)${NC}"
          echo ""
        fi
      fi
    done <<< "$JOBS"
  fi
done

echo ""

# End timing
TIMER_END=$(end_timer $TIMER_START)

if [ $ERRORS -gt 0 ]; then
  report_blocking 6 "Found $ERRORS jobs without timeout-minutes" \
    "Add timeout-minutes to all jobs"
  exit $EXIT_BLOCKING
fi

report_success 6 "All jobs have timeout-minutes configured"
exit $EXIT_SUCCESS
