#!/bin/bash
# Setup Git Hooks for ZERO TOLERANCE Validation
# Installs pre-push hook that validates CI/CD workflows before allowing push

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"
PRE_PUSH_HOOK="$HOOKS_DIR/pre-push"
VALIDATION_SCRIPT="$REPO_ROOT/.claude/scripts/validate-ci.sh"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Git Hooks Setup - ZERO TOLERANCE     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

ACTION=${1:-install}

if [ "$ACTION" = "uninstall" ]; then
  echo -e "${YELLOW}Removing git hooks...${NC}"

  if [ -f "$PRE_PUSH_HOOK" ]; then
    rm -f "$PRE_PUSH_HOOK"
    echo -e "${GREEN}✅ Pre-push hook removed${NC}"
  else
    echo -e "${YELLOW}ℹ️  No pre-push hook found${NC}"
  fi

  exit 0
fi

if [ ! -d "$HOOKS_DIR" ]; then
  echo -e "${RED}❌ .git/hooks directory not found${NC}"
  echo "Make sure you're in the repository root: $REPO_ROOT"
  exit 1
fi

if [ ! -f "$VALIDATION_SCRIPT" ]; then
  echo -e "${RED}❌ Validation script not found: $VALIDATION_SCRIPT${NC}"
  exit 1
fi

echo -e "${BLUE}Creating pre-push hook...${NC}"
echo ""

# Create pre-push hook
cat > "$PRE_PUSH_HOOK" << 'EOF'
#!/bin/bash
# Pre-push hook: ZERO TOLERANCE CI/CD Validation
# Blocks any push that fails validation

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get the repository root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VALIDATION_SCRIPT="$REPO_ROOT/.claude/scripts/validate-ci.sh"

if [ ! -f "$VALIDATION_SCRIPT" ]; then
  echo -e "${RED}❌ Validation script not found${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}🚨 ZERO TOLERANCE: Running local CI/CD validation before push...${NC}"
echo ""

# Run validation levels 1-8 (pre-push validation)
if ! bash "$VALIDATION_SCRIPT" 8 pre-push; then
  echo ""
  echo -e "${RED}❌ Validation failed - PUSH BLOCKED${NC}"
  echo "Fix the errors above and try pushing again."
  echo ""
  echo "To bypass (emergencies only): git push --no-verify"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ All validations passed - Proceeding with push${NC}"
echo ""

exit 0
EOF

chmod +x "$PRE_PUSH_HOOK"

echo -e "${GREEN}✅ Pre-push hook created: $PRE_PUSH_HOOK${NC}"
echo ""
echo -e "${BLUE}Hook features:${NC}"
echo "  - Runs validation levels 1-8 automatically"
echo "  - Blocks push if any validation fails"
echo "  - Can be bypassed with: git push --no-verify"
echo ""
echo -e "${YELLOW}Testing hook installation...${NC}"

# Verify hook is executable
if [ -x "$PRE_PUSH_HOOK" ]; then
  echo -e "${GREEN}✅ Hook is executable${NC}"
else
  echo -e "${YELLOW}⚠️  Hook is not executable${NC}"
  chmod +x "$PRE_PUSH_HOOK"
  echo -e "${GREEN}✅ Fixed${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Git Hooks Setup Complete!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}What's next:${NC}"
echo "1. Git hooks are now active for this repository"
echo "2. All pushes will run validation automatically"
echo "3. Read MANDATORY_LOCAL_VALIDATION.md for details"
echo ""
echo -e "${YELLOW}Test it:${NC}"
echo "  Try: git push (should run validation before pushing)"
echo ""
echo -e "${YELLOW}Disable (if needed):${NC}"
echo "  ./.claude/scripts/setup-git-hooks.sh uninstall"
echo ""
