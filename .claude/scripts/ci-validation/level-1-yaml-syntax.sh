#!/bin/bash
# Level 1: YAML Syntax Validation
# Checks all workflow YAML files for syntax errors using yamllint
#
# Phase 1 Enhancement:
#   ✅ Exit-code based validation (SWE-Factory)
#   ✅ TRAIL error taxonomy (SYNTAX type)
#   ✅ Trace collection for diagnostics
#   ✅ Standardized reporting functions
#   ✅ Dependency checking with proper exit codes

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

# Initialize tracing
init_trace_collection 1

echo -e "${YELLOW}🔍 LEVEL 1: YAML Syntax Validation${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"
ERRORS=0
CHECKED=0

# Start timing this level
TIMER_START=$(start_timer)

# Check for yamllint dependency
if ! command_exists yamllint; then
  echo -e "${RED}❌ DEPENDENCY ERROR: yamllint not installed${NC}"
  echo -e "${RED}   Install: pip install yamllint${NC}"
  echo ""

  # Record dependency error trace
  record_trace 1 "yamllint-dependency" "dependency" "A" \
    "$WORKFLOW_DIR" "system" \
    "yamllint tool not found in PATH" \
    "Install: pip install yamllint"

  exit $EXIT_DEPENDENCY
fi

# Check for workflows directory
if [ ! -d "$WORKFLOW_DIR" ]; then
  echo -e "${RED}❌ CONFIGURATION ERROR: $WORKFLOW_DIR directory not found${NC}"
  echo ""

  record_trace 1 "workflow-directory" "blocking" "L" \
    "$WORKFLOW_DIR" "filesystem" \
    "Required workflows directory does not exist" \
    "Create: mkdir -p $WORKFLOW_DIR"

  exit $EXIT_BLOCKING
fi

# Find all YAML workflow files
YAML_FILES=$(find "$WORKFLOW_DIR" -name "*.yml" -o -name "*.yaml" 2>/dev/null | sort)

if [ -z "$YAML_FILES" ]; then
  echo -e "${RED}❌ CONFIGURATION ERROR: No YAML workflow files found${NC}"
  echo ""

  record_trace 1 "no-workflows" "blocking" "L" \
    "$WORKFLOW_DIR" "filesystem" \
    "No YAML workflow files (.yml/.yaml) found in workflows directory" \
    "Create workflow files in $WORKFLOW_DIR"

  exit $EXIT_BLOCKING
fi

# Validate each YAML file
for file in $YAML_FILES; do
  CHECKED=$((CHECKED + 1))
  display_path=$(get_display_path "$file")

  if yamllint -d "{extends: relaxed, rules: {line-length: {max: 120}}}" "$file" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} $display_path"
  else
    ERRORS=$((ERRORS + 1))

    # Extract first error line for trace
    error_line=$(yamllint -d "{extends: relaxed, rules: {line-length: {max: 120}}}" "$file" 2>&1 | head -1)

    # Record TRAIL trace (Type-A = SYNTAX error)
    record_trace 1 "yaml-syntax" "blocking" "A" \
      "$display_path" "file" \
      "YAML syntax error: $error_line" \
      "Run: yamllint $display_path (to see all errors)"

    # Display error with context
    echo -e "${RED}❌ SYNTAX ERROR: $display_path${NC}"
    echo -e "${RED}   Issue: YAML syntax violation${NC}"
    yamllint -d "{extends: relaxed, rules: {line-length: {max: 120}}}" "$file" 2>&1 | sed 's/^/   /'
    echo ""
  fi
done

echo ""
echo "📊 Checked $CHECKED YAML files"
echo ""

# End timing
TIMER_END=$(end_timer $TIMER_START)

if [ $ERRORS -gt 0 ]; then
  report_blocking 1 "Found $ERRORS YAML file(s) with syntax errors" \
    "Fix YAML syntax errors shown above"
  exit $EXIT_BLOCKING
fi

report_success 1 "All $CHECKED YAML files are syntactically correct"
exit $EXIT_SUCCESS
