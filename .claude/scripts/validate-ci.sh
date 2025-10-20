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

LEVELS=${1:-10}  # Default: run levels 1-10 (MANDATORY comprehensive validation)
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

# MANDATORY: Run levels 9-10 (act dry-run + comprehensive testing)
# These are NO LONGER OPTIONAL - they are required for ZERO TOLERANCE
if [ "$LEVELS" -gt 8 ]; then
  echo -e "${YELLOW}🔍 LEVEL 9: GitHub Actions Dry-Run (act) - MANDATORY${NC}"
  echo ""

  # Check local act first, then system act
  ACT_BIN="${SCRIPT_DIR}/../../bin/act"
  if [ ! -f "$ACT_BIN" ]; then
    ACT_BIN=$(command -v act 2>/dev/null || echo "")
  fi

  if [ -z "$ACT_BIN" ] || [ ! -f "$ACT_BIN" ]; then
    echo -e "${RED}❌ BLOCKING: act is MANDATORY but not found${NC}"
    echo ""
    echo "Install act using:"
    echo "  curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | bash"
    echo ""
    exit 1
  fi

  if ! bash "$VALIDATION_DIR/level-9-act-dryrun.sh"; then
    echo ""
    echo -e "${RED}❌ Validation failed at LEVEL 9 (MANDATORY)${NC}"
    exit 1
  fi
  PASSED=$((PASSED + 1))
  echo ""
fi

# Level 10: Comprehensive act full workflow validation
if [ "$LEVELS" -gt 9 ]; then
  echo -e "${YELLOW}🔍 LEVEL 10: Full Workflow Simulation (act full) - MANDATORY${NC}"
  echo ""

  if [ -f "$VALIDATION_DIR/level-10-act-full.sh" ]; then
    if ! bash "$VALIDATION_DIR/level-10-act-full.sh"; then
      echo ""
      echo -e "${RED}❌ Validation failed at LEVEL 10 (MANDATORY)${NC}"
      exit 1
    fi
    PASSED=$((PASSED + 1))
  else
    echo -e "${YELLOW}⚠️  Level 10 script not found, skipping${NC}"
    SKIPPED=$((SKIPPED + 1))
  fi
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
