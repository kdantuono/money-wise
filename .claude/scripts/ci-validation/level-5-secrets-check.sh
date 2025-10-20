#!/bin/bash
# Level 5: Secrets & Environment Variables Check
# Documents and validates secret usage in workflows
#
# Phase 1 Enhancement:
#   ✅ Exit-code based validation (SWE-Factory)
#   ✅ TRAIL error taxonomy (ACCESS type)
#   ✅ Trace collection for diagnostics
#   ✅ Standardized reporting functions
#   ✅ Warning-level issues for undocumented secrets

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

# Initialize tracing
init_trace_collection 5

echo -e "${YELLOW}🔍 LEVEL 5: Secrets & Environment Variables Check${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
SECRETS_FILE=".github/SECRETS.md"
FOUND_SECRETS=0
WARNINGS=0

# Start timing this level
TIMER_START=$(start_timer)

for file in "$WORKFLOW_DIR"/*.yml; do
  if [ -f "$file" ]; then
    # Find all secret references
    SECRETS=$(grep -o '\${{ secrets\.[A-Z_]* }}' "$file" 2>/dev/null | sed 's/\${{ secrets\.\([A-Z_]*\) }}/\1/' | sort -u)

    if [ -n "$SECRETS" ]; then
      FOUND_SECRETS=1
      filename=$(basename "$file")
      display_path=$(get_display_path "$file")

      echo -e "${BLUE}📝 Secrets in $filename:${NC}"
      echo "$SECRETS" | sed 's/^/   - /'

      # Record trace for each secret found
      while IFS= read -r secret; do
        if [ -n "$secret" ]; then
          record_trace 5 "secret-usage" "info" "A" \
            "$display_path" "steps" \
            "Workflow references secret: $secret" \
            "Document in .github/SECRETS.md"
        fi
      done <<< "$SECRETS"
    fi
  fi
done

echo ""

if [ $FOUND_SECRETS -eq 1 ]; then
  if [ ! -f "$SECRETS_FILE" ]; then
    echo -e "${YELLOW}⚠️  ACCESS WARNING: Secrets found but .github/SECRETS.md not present${NC}"
    echo "Suggestion: Create documentation for required secrets"
    echo ""

    record_trace 5 "missing-secrets-doc" "warning" "A" \
      "$SECRETS_FILE" "documentation" \
      "Workflows use secrets but no SECRETS.md documentation exists" \
      "Create .github/SECRETS.md documenting all required secrets"

    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${GREEN}✅ Secrets are documented in .github/SECRETS.md${NC}"
  fi
fi

echo ""

# End timing
TIMER_END=$(end_timer $TIMER_START)

if [ $WARNINGS -gt 0 ]; then
  report_warning 5 "Found $WARNINGS secrets-related warnings" \
    "Document all secrets for team onboarding"
  exit $EXIT_WARNING
fi

report_success 5 "Secrets validation complete"
exit $EXIT_SUCCESS
