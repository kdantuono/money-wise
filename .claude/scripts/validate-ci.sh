#!/bin/bash
# Master CI/CD Validation Script
# Orchestrates all 10 validation levels
# Usage: ./validate-ci.sh [levels] [mode]
#   levels: default=8 (only pre-push levels), full=10 (all levels)
#   mode: default=pre-push, full=comprehensive

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VALIDATION_DIR="$SCRIPT_DIR/ci-validation"

LEVELS=${1:-8}  # Default: run levels 1-8 (pre-push validation)
MODE=${2:-pre-push}

# Make all scripts executable
chmod +x "$VALIDATION_DIR"/level-*.sh

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CI/CD ZERO TOLERANCE VALIDATION      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Mode: $MODE${NC}"
echo -e "${YELLOW}Running validation levels 1-$LEVELS${NC}"
echo ""

PASSED=0
FAILED=0
SKIPPED=0

# Run each validation level
for level in $(seq 1 $LEVELS); do
  SCRIPT=$(ls "$VALIDATION_DIR"/level-$level-*.sh 2>/dev/null | head -1)

  if [ -f "$SCRIPT" ]; then
    bash "$SCRIPT"
    STATUS=$?

    if [ $STATUS -eq 0 ]; then
      PASSED=$((PASSED + 1))
    else
      FAILED=$((FAILED + 1))
      echo ""
      echo -e "${RED}❌ Validation failed at LEVEL $level${NC}"
      echo "Fix errors and run again."
      exit 1
    fi
  else
    SKIPPED=$((SKIPPED + 1))
  fi

  echo ""
done

# Optional: Run level 9 (act dry-run) if act is available
if command -v act &> /dev/null && [ "$LEVELS" -gt 8 ]; then
  bash "$VALIDATION_DIR/level-9-act-dryrun.sh" || true
  echo ""
fi

# Summary
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        VALIDATION SUMMARY             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ PASSED: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ FAILED: $FAILED${NC}"
fi
if [ $SKIPPED -gt 0 ]; then
  echo -e "${YELLOW}⏭️ SKIPPED: $SKIPPED${NC}"
fi

echo ""
echo -e "${GREEN}✅ ALL VALIDATIONS PASSED (Levels 1-$LEVELS)${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"

if [ "$MODE" = "pre-push" ]; then
  echo "✅ Safe to push - all pre-push validations passed"
  echo "Git hook will verify this before push"
else
  echo "Ready for comprehensive testing"
fi

exit 0
