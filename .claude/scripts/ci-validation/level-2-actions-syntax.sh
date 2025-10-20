#!/bin/bash
# Level 2: GitHub Actions Syntax Validation
# Checks GitHub Actions workflows for common issues using actionlint
# Priority: Local actionlint → System actionlint → Basic YAML validation
#
# Phase 1 Enhancement:
#   ✅ Exit-code based validation (SWE-Factory)
#   ✅ TRAIL error taxonomy (SYNTAX type)
#   ✅ Trace collection for diagnostics
#   ✅ Standardized reporting functions
#   ✅ Graceful fallback validation

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

# Initialize tracing
init_trace_collection 2

echo -e "${YELLOW}🔍 LEVEL 2: GitHub Actions Syntax Validation${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"
LOCAL_ACTIONLINT="$PROJECT_ROOT/.claude/tools/actionlint"

ERRORS=0
CHECKED=0

# Start timing this level
TIMER_START=$(start_timer)

if [ ! -d "$WORKFLOW_DIR" ]; then
  echo -e "${RED}❌ CONFIGURATION ERROR: $WORKFLOW_DIR directory not found${NC}"
  record_trace 2 "workflow-directory" "blocking" "L" \
    "$WORKFLOW_DIR" "filesystem" \
    "Required workflows directory does not exist" \
    "Create: mkdir -p $WORKFLOW_DIR"
  exit $EXIT_BLOCKING
fi

# Priority 1: Try local actionlint (.claude/tools/actionlint)
if [ -x "$LOCAL_ACTIONLINT" ]; then
  echo -e "${BLUE}📍 Using local actionlint: $LOCAL_ACTIONLINT${NC}"

  if "$LOCAL_ACTIONLINT" -color "$WORKFLOW_DIR"/*.yml > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All workflows passed actionlint validation${NC}"
    report_success 2 "GitHub Actions syntax is valid"
    exit $EXIT_SUCCESS
  else
    echo -e "${RED}❌ SYNTAX ERRORS: actionlint found issues:${NC}"
    "$LOCAL_ACTIONLINT" -color "$WORKFLOW_DIR"/*.yml || true
    echo ""

    # Record trace
    record_trace 2 "github-actions-syntax" "blocking" "A" \
      "$WORKFLOW_DIR" "workflows" \
      "GitHub Actions workflow syntax errors detected by actionlint" \
      "Review errors above and fix workflow syntax"

    ERRORS=$((ERRORS + 1))
    report_blocking 2 "GitHub Actions syntax errors detected" \
      "Fix syntax errors shown above"
    exit $EXIT_BLOCKING
  fi
fi

# Priority 2: Try system actionlint
if command_exists actionlint; then
  echo -e "${BLUE}📍 Using system actionlint${NC}"

  if actionlint -color "$WORKFLOW_DIR"/*.yml > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All workflows passed actionlint validation${NC}"
    report_success 2 "GitHub Actions syntax is valid"
    exit $EXIT_SUCCESS
  else
    echo -e "${RED}❌ SYNTAX ERRORS: actionlint found issues:${NC}"
    actionlint -color "$WORKFLOW_DIR"/*.yml || true
    echo ""

    record_trace 2 "github-actions-syntax" "blocking" "A" \
      "$WORKFLOW_DIR" "workflows" \
      "GitHub Actions workflow syntax errors detected by actionlint" \
      "Review errors above and fix workflow syntax"

    ERRORS=$((ERRORS + 1))
    report_blocking 2 "GitHub Actions syntax errors detected" \
      "Fix syntax errors shown above"
    exit $EXIT_BLOCKING
  fi
fi

# Priority 3: Basic YAML validation (fallback)
echo -e "${YELLOW}📍 actionlint not found, running basic YAML validation (fallback)...${NC}"
echo "💡 Install actionlint for comprehensive validation:"
echo "   • Automatic: pnpm setup:actionlint"
echo "   • Manual: https://github.com/rhysd/actionlint/releases"
echo ""

for file in "$WORKFLOW_DIR"/*.yml; do
  if [ -f "$file" ]; then
    CHECKED=$((CHECKED + 1))
    display_path=$(get_display_path "$file")

    # Check for required fields
    if ! grep -q "^name:" "$file"; then
      echo -e "${RED}❌ SYNTAX ERROR: Missing 'name' in $display_path${NC}"
      record_trace 2 "missing-name" "blocking" "A" \
        "$display_path" "root" \
        "Missing required 'name' field at root level" \
        "Add: name: My Workflow"
      ERRORS=$((ERRORS + 1))
    fi

    if ! grep -q "^on:" "$file"; then
      echo -e "${RED}❌ SYNTAX ERROR: Missing 'on' trigger in $display_path${NC}"
      record_trace 2 "missing-trigger" "blocking" "A" \
        "$display_path" "root" \
        "Missing required 'on' trigger configuration" \
        "Add: on: push (or other trigger)"
      ERRORS=$((ERRORS + 1))
    fi

    if ! grep -q "^jobs:" "$file"; then
      echo -e "${RED}❌ SYNTAX ERROR: Missing 'jobs' section in $display_path${NC}"
      record_trace 2 "missing-jobs" "blocking" "A" \
        "$display_path" "root" \
        "Missing required 'jobs' section" \
        "Add: jobs: { ... }"
      ERRORS=$((ERRORS + 1))
    fi

    # Basic YAML syntax check (no tabs allowed in YAML)
    if grep -P '\t' "$file" > /dev/null 2>&1; then
      echo -e "${RED}❌ SYNTAX ERROR: Tabs detected in $display_path (use spaces)${NC}"
      record_trace 2 "tabs-in-yaml" "blocking" "A" \
        "$display_path" "formatting" \
        "YAML files must use spaces, not tabs" \
        "Replace tabs with spaces (2 spaces per level recommended)"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

echo ""
echo "📊 Checked $CHECKED YAML files (basic validation mode)"
echo ""

# End timing
TIMER_END=$(end_timer $TIMER_START)

if [ $ERRORS -gt 0 ]; then
  report_blocking 2 "Found $ERRORS YAML structure error(s)" \
    "Fix syntax errors shown above. Consider installing actionlint for better validation"
  exit $EXIT_BLOCKING
fi

report_success 2 "GitHub Actions syntax is valid (basic check)"
exit $EXIT_SUCCESS
