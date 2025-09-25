#!/bin/bash
# Progressive Merge with Auto-Rollback

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SOURCE_BRANCH="$1"
TARGET_BRANCH="$2"
EPIC_NAME="${3:-unknown}"

if [ -z "$SOURCE_BRANCH" ] || [ -z "$TARGET_BRANCH" ]; then
    echo -e "${RED}Error: Source and target branches required${NC}"
    echo "Usage: $0 <source-branch> <target-branch> [epic-name]"
    exit 1
fi

echo -e "${GREEN}🔄 Progressive Merge: $SOURCE_BRANCH → $TARGET_BRANCH${NC}"

# Save checkpoint for rollback
CHECKPOINT="checkpoint-$(date +%s)"
git tag "$CHECKPOINT"
echo -e "${YELLOW}Checkpoint created: $CHECKPOINT${NC}"

# Function to rollback
rollback() {
    echo -e "${RED}❌ Rolling back to checkpoint...${NC}"
    git reset --hard "$CHECKPOINT"
    git tag -d "$CHECKPOINT" 2>/dev/null || true
    exit 1
}

# Trap errors for automatic rollback
trap rollback ERR

# Switch to target branch
echo -e "${GREEN}Switching to $TARGET_BRANCH...${NC}"
git checkout "$TARGET_BRANCH"

# Attempt merge
echo -e "${GREEN}Merging $SOURCE_BRANCH...${NC}"
if git merge --no-ff "$SOURCE_BRANCH" -m "feat: merge $SOURCE_BRANCH into $TARGET_BRANCH

Automated progressive merge for epic: $EPIC_NAME
Source: $SOURCE_BRANCH
Target: $TARGET_BRANCH
Timestamp: $(date -Iseconds)

Co-authored-by: orchestrator <orchestrator@moneywise.ai>"; then
    echo -e "${GREEN}✅ Merge successful${NC}"
else
    # Handle merge conflicts
    echo -e "${YELLOW}⚠️ Merge conflict detected${NC}"
    
    # Check if conflicts are auto-resolvable
    CONFLICTS=$(git diff --name-only --diff-filter=U)
    echo "Conflicted files:"
    echo "$CONFLICTS"
    
    # Simple auto-resolution for package-lock.json
    if echo "$CONFLICTS" | grep -q "package-lock.json"; then
        echo -e "${YELLOW}Auto-resolving package-lock.json...${NC}"
        rm package-lock.json
        npm install
        git add package-lock.json
    fi
    
    # Check if all conflicts resolved
    if [ -z "$(git diff --name-only --diff-filter=U)" ]; then
        echo -e "${GREEN}✅ Conflicts auto-resolved${NC}"
        git commit -m "fix: auto-resolve merge conflicts"
    else
        echo -e "${RED}❌ Cannot auto-resolve conflicts${NC}"
        git merge --abort
        rollback
    fi
fi

# Run validation tests
echo -e "${GREEN}🧪 Running validation tests...${NC}"

# Check if we're in a monorepo with npm workspaces
if [ -f "package.json" ]; then
    # Run tests based on branch type
    if [[ "$TARGET_BRANCH" == task/* ]]; then
        echo "Running unit tests..."
        npm run test:unit || rollback
    elif [[ "$TARGET_BRANCH" == story/* ]]; then
        echo "Running unit and integration tests..."
        npm run test:unit || rollback
        npm run test:integration || rollback
    elif [[ "$TARGET_BRANCH" == epic/* ]]; then
        echo "Running full test suite..."
        npm run test || rollback
    fi
    
    # Run linting
    echo "Running linter..."
    npm run lint || rollback
    
    # Build check
    echo "Verifying build..."
    npm run build || rollback
fi

# If all tests pass, clean up source branch
echo -e "${GREEN}✅ All validations passed${NC}"

# Delete source branch and remove worktree if it's a task branch
if [[ "$SOURCE_BRANCH" == task/* ]]; then
    echo -e "${YELLOW}Cleaning up task branch...${NC}"
    git branch -d "$SOURCE_BRANCH" 2>/dev/null || true
    
    # Find and remove associated worktree
    WORKTREE_PATH=$(git worktree list | grep "$SOURCE_BRANCH" | awk '{print $1}' || true)
    if [ -n "$WORKTREE_PATH" ]; then
        echo "Removing worktree: $WORKTREE_PATH"
        git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
    fi
fi

# Update epic state
STATE_DIR=".claude/orchestration/state"
if [ -d "$STATE_DIR" ]; then
    echo "$(date -Iseconds): Merged $SOURCE_BRANCH → $TARGET_BRANCH" >> "$STATE_DIR/merge.log"
fi

# Remove checkpoint
git tag -d "$CHECKPOINT" 2>/dev/null || true

echo -e "${GREEN}✨ Progressive merge complete!${NC}"
echo "  Source: $SOURCE_BRANCH"
echo "  Target: $TARGET_BRANCH"
echo "  Tests: All passing ✅"
echo "  Build: Success ✅"

# Check if we should trigger next merge
if [[ "$TARGET_BRANCH" == story/* ]]; then
    # Check if all tasks for this story are complete
    STORY_NAME=$(echo "$TARGET_BRANCH" | sed 's/story\///')
    REMAINING_TASKS=$(git branch -r | grep "task/$STORY_NAME" | wc -l)
    
    if [ "$REMAINING_TASKS" -eq 0 ]; then
        echo -e "${YELLOW}All tasks complete for story. Ready to merge to epic.${NC}"
    fi
fi