#!/bin/bash
# Level 3: Workflow Permissions Audit
# Checks if workflows have correct permission configurations
#
# Phase 1 Enhancement:
#   ✅ Exit-code based validation (SWE-Factory)
#   ✅ TRAIL error taxonomy (ACCESS type)
#   ✅ Trace collection for diagnostics
#   ✅ Standardized reporting functions
#   ✅ Warning-level issues (non-blocking)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

# Initialize tracing
init_trace_collection 3

echo -e "${YELLOW}🔍 LEVEL 3: Permissions Audit${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
WARNINGS=0
CHECKED=0

# Start timing this level
TIMER_START=$(start_timer)

if [ ! -d "$WORKFLOW_DIR" ]; then
  echo -e "${RED}❌ CONFIGURATION ERROR: $WORKFLOW_DIR directory not found${NC}"
  record_trace 3 "workflow-directory" "blocking" "L" \
    "$WORKFLOW_DIR" "filesystem" \
    "Required workflows directory does not exist" \
    "Create: mkdir -p $WORKFLOW_DIR"
  exit $EXIT_BLOCKING
fi

for file in "$WORKFLOW_DIR"/*.yml; do
  if [ -f "$file" ]; then
    CHECKED=$((CHECKED + 1))
    filename=$(basename "$file")
    display_path=$(get_display_path "$file")

    echo -e "${BLUE}📋 Checking: $filename${NC}"

    # Check if file creates PR comments
    if grep -q "createComment\|issues.*comment\|github-script" "$file"; then
      # This job creates PR comments - needs pull-requests: write
      if ! grep -q "pull-requests:.*write" "$file"; then
        # Check if it's scoped to specific jobs only
        if ! grep -A20 "permissions:" "$file" | grep -q "pull-requests:.*write"; then
          echo -e "${YELLOW}⚠️  ACCESS WARNING: Creates PR comments but missing 'pull-requests: write' permission${NC}"
          echo "   Suggestion: Add to permissions block:"
          echo "   permissions:"
          echo "     pull-requests: write"

          record_trace 3 "missing-pr-permission" "warning" "A" \
            "$display_path" "permissions" \
            "Workflow creates PR comments but lacks 'pull-requests: write' permission" \
            "Add: pull-requests: write to permissions block"

          WARNINGS=$((WARNINGS + 1))
        fi
      fi
    fi

    # Check if file uploads artifacts but no permissions defined
    if grep -q "upload-artifact\|upload.*.action" "$file"; then
      if ! grep -q "^permissions:" "$file"; then
        echo -e "${YELLOW}⚠️  ACCESS WARNING: Uses artifacts but no permissions block defined${NC}"

        record_trace 3 "missing-permissions-block" "warning" "A" \
          "$display_path" "permissions" \
          "Workflow uploads artifacts but has no explicit permissions configuration" \
          "Add permissions block with appropriate scopes"

        WARNINGS=$((WARNINGS + 1))
      fi
    fi

    # Check if file writes security events (CodeQL, etc.)
    if grep -q "semgrep\|codeql\|trivy" "$file"; then
      if ! grep -q "security-events:.*write" "$file"; then
        echo -e "${YELLOW}⚠️  ACCESS WARNING: Uses security tools but missing 'security-events: write' permission${NC}"

        record_trace 3 "missing-security-permission" "warning" "A" \
          "$display_path" "permissions" \
          "Workflow runs security tools but lacks 'security-events: write' permission" \
          "Add: security-events: write to permissions block"

        WARNINGS=$((WARNINGS + 1))
      fi
    fi
  fi
done

echo ""
echo "📊 Checked $CHECKED YAML files"
echo ""

# End timing
TIMER_END=$(end_timer $TIMER_START)

if [ $WARNINGS -gt 0 ]; then
  report_warning 3 "Found $WARNINGS permission-related warnings" \
    "Review and add missing permissions for better security posture"
  exit $EXIT_WARNING
fi

report_success 3 "Permissions are correctly configured"
exit $EXIT_SUCCESS
