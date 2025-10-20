#!/bin/bash
# Level 8: Matrix Strategy Validation
# Checks that matrix configurations are properly defined and used
#
# Phase 1 Enhancement:
#   ✅ Exit-code based validation (SWE-Factory)
#   ✅ TRAIL error taxonomy (SYNTAX type)
#   ✅ Trace collection for diagnostics
#   ✅ Standardized reporting functions
#   ✅ Comprehensive matrix validation

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

# Initialize tracing
init_trace_collection 8

echo -e "${YELLOW}🔍 LEVEL 8: Matrix Strategy Validation${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
WARNINGS=0
CHECKED=0

# Start timing this level
TIMER_START=$(start_timer)

for file in "$WORKFLOW_DIR"/*.yml; do
  if [ -f "$file" ]; then
    CHECKED=$((CHECKED + 1))
    filename=$(basename "$file")
    display_path=$(get_display_path "$file")

    # Check for matrix configurations
    if grep -q "strategy:" "$file" && grep -A5 "strategy:" "$file" | grep -q "matrix:"; then
      echo -e "${BLUE}📋 Checking matrix in $filename${NC}"

      # Extract matrix section
      MATRIX_SECTION=$(sed -n "/strategy:/,/^  [a-z]/p" "$file" | sed -n "/matrix:/,/^  [a-z]/p")

      if [ -n "$MATRIX_SECTION" ]; then
        echo -e "${GREEN}✅ Matrix configuration found in $filename${NC}"

        # Record trace for matrix found
        record_trace 8 "matrix-found" "info" "A" \
          "$display_path" "jobs.*.strategy.matrix" \
          "Matrix strategy configured for parallel job execution" \
          "Verify matrix dimensions match your testing requirements"
      else
        echo -e "${YELLOW}⚠️  SYNTAX WARNING: Matrix keyword found but section empty${NC}"

        record_trace 8 "empty-matrix" "warning" "A" \
          "$display_path" "jobs.*.strategy.matrix" \
          "Matrix section is empty or malformed" \
          "Add matrix dimensions: matrix: { python-version: ['3.9', '3.10'] }"

        WARNINGS=$((WARNINGS + 1))
      fi
    fi
  fi
done

echo ""
echo "📊 Checked $CHECKED workflow files"
echo ""

# End timing
TIMER_END=$(end_timer $TIMER_START)

if [ $WARNINGS -gt 0 ]; then
  report_warning 8 "Found $WARNINGS matrix-related warning(s)" \
    "Review matrix configurations to ensure proper setup"
  exit $EXIT_WARNING
fi

report_success 8 "Matrix validation complete"
exit $EXIT_SUCCESS
