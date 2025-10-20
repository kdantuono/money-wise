#!/bin/bash
# Level 7: Path Filters & Trigger Validation
# Checks that path filters reference valid paths
#
# Phase 1 Enhancement:
#   ✅ Exit-code based validation (SWE-Factory)
#   ✅ TRAIL error taxonomy (LOGIC type)
#   ✅ Trace collection for diagnostics
#   ✅ Standardized reporting functions

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

# Initialize tracing
init_trace_collection 7

echo -e "${YELLOW}🔍 LEVEL 7: Path Filters & Trigger Validation${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
ERRORS=0

# Start timing this level
TIMER_START=$(start_timer)

for file in "$WORKFLOW_DIR"/*.yml; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    display_path=$(get_display_path "$file")

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
              echo -e "${RED}❌ LOGIC ERROR: Path filter references non-existent path: $path_clean${NC}"

              record_trace 7 "invalid-path-filter" "blocking" "L" \
                "$display_path" "on.push.paths" \
                "Path filter references non-existent directory: $path_clean" \
                "Use valid directory path or remove this filter"

              ERRORS=$((ERRORS + 1))
            fi
          fi
        fi
      done <<< "$PATHS"
    fi
  fi
done

echo ""

# End timing
TIMER_END=$(end_timer $TIMER_START)

if [ $ERRORS -gt 0 ]; then
  report_blocking 7 "Found $ERRORS invalid path filter(s)" \
    "Update paths to reference existing directories. Invalid paths prevent workflow triggers"
  exit $EXIT_BLOCKING
fi

report_success 7 "All path filters reference valid locations"
exit $EXIT_SUCCESS
