#!/bin/bash
# Emergency Rollback Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parameters
TARGET="$1"
ROLLBACK_TO="${2:-auto}"

if [ -z "$TARGET" ]; then
    echo -e "${RED}Error: Rollback target required${NC}"
    echo "Usage: $0 <branch|commit|tag> [rollback-to]"
    echo ""
    echo "Examples:"
    echo "  $0 main                    # Rollback main to last checkpoint"
    echo "  $0 feature/broken auto     # Auto-detect last good commit"
    echo "  $0 dev abc123              # Rollback dev to specific commit"
    exit 1
fi

echo -e "${RED}🚨 EMERGENCY ROLLBACK INITIATED${NC}"
echo -e "${YELLOW}Target: $TARGET${NC}"

# Save current state before rollback
BACKUP_TAG="rollback-backup-$(date +%s)"
echo -e "${BLUE}Creating backup tag: $BACKUP_TAG${NC}"
git tag "$BACKUP_TAG"

# Function to find last good commit
find_last_good_commit() {
    local branch=$1
    
    # Look for checkpoint tags
    local checkpoint=$(git tag -l "checkpoint-*" --sort=-creatordate | head -1)
    if [ -n "$checkpoint" ]; then
        echo "$checkpoint"
        return
    fi
    
    # Look for last passing CI commit
    local last_good=$(git log --format="%H" -n 20 | while read commit; do
        # Check if this commit passed tests
        if git show "$commit" | grep -q "Tests: All passing"; then
            echo "$commit"
            break
        fi
    done)
    
    if [ -n "$last_good" ]; then
        echo "$last_good"
        return
    fi
    
    # Default to HEAD~1
    echo "HEAD~1"
}

# Determine rollback target
if [ "$ROLLBACK_TO" = "auto" ]; then
    echo -e "${YELLOW}Auto-detecting rollback point...${NC}"
    ROLLBACK_TO=$(find_last_good_commit "$TARGET")
    echo -e "${GREEN}Found rollback point: $ROLLBACK_TO${NC}"
fi

# Perform rollback based on target type
if git show-ref --verify --quiet "refs/heads/$TARGET"; then
    # Rolling back a branch
    echo -e "${YELLOW}Rolling back branch: $TARGET${NC}"
    
    git checkout "$TARGET"
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}Stashing uncommitted changes...${NC}"
        git stash push -m "Rollback stash $(date +%s)"
    fi
    
    # Determine rollback method
    echo -e "${BLUE}Choose rollback method:${NC}"
    echo "  1) Soft rollback (preserve history with revert)"
    echo "  2) Hard rollback (rewrite history)"
    echo -n "Selection [1]: "
    read -r METHOD
    METHOD=${METHOD:-1}
    
    if [ "$METHOD" = "1" ]; then
        # Soft rollback with revert
        echo -e "${GREEN}Performing soft rollback...${NC}"
        
        if git merge-base --is-ancestor "$ROLLBACK_TO" HEAD; then
            # Create revert commit
            git revert --no-edit HEAD..."$ROLLBACK_TO"
            git commit -m "rollback: emergency revert to $ROLLBACK_TO

Rollback initiated at: $(date -Iseconds)
Reason: Emergency rollback requested
Backup tag: $BACKUP_TAG"
        else
            echo -e "${RED}Error: Cannot revert to non-ancestor commit${NC}"
            exit 1
        fi
        
    else
        # Hard rollback
        echo -e "${RED}⚠️  Performing hard rollback (destructive!)${NC}"
        echo -n "Type 'CONFIRM' to proceed: "
        read -r CONFIRM
        
        if [ "$CONFIRM" = "CONFIRM" ]; then
            git reset --hard "$ROLLBACK_TO"
            echo -e "${GREEN}✅ Hard reset complete${NC}"
            
            # Force push if remote branch exists
            if git ls-remote --exit-code origin "$TARGET" > /dev/null 2>&1; then
                echo -e "${YELLOW}Force pushing to remote...${NC}"
                git push --force-with-lease origin "$TARGET"
            fi
        else
            echo -e "${RED}Rollback cancelled${NC}"
            exit 1
        fi
    fi
    
elif git rev-parse --verify "$TARGET" > /dev/null 2>&1; then
    # Rolling back to a specific commit/tag
    echo -e "${YELLOW}Rolling back to commit/tag: $TARGET${NC}"
    git reset --hard "$TARGET"
    
else
    echo -e "${RED}Error: Invalid target '$TARGET'${NC}"
    exit 1
fi

# Run validation tests
echo -e "${GREEN}Running validation tests...${NC}"
if [ -f "package.json" ]; then
    npm install
    npm run test || true
    npm run build || true
fi

# Clean up worktrees if needed
echo -e "${YELLOW}Cleaning up worktrees...${NC}"
git worktree prune

# Generate rollback report
REPORT_FILE=".claude/orchestration/state/rollback-report-$(date +%s).md"
mkdir -p "$(dirname "$REPORT_FILE")"

cat > "$REPORT_FILE" << EOF
# Rollback Report

## Summary
- **Date**: $(date -Iseconds)
- **Target**: $TARGET
- **Rolled back to**: $ROLLBACK_TO
- **Backup tag**: $BACKUP_TAG
- **Method**: ${METHOD:-hard}

## Pre-rollback State
\`\`\`
$(git log --oneline -n 10)
\`\`\`

## Post-rollback State
\`\`\`
$(git log --oneline -n 5)
\`\`\`

## Validation Results
- Tests: $(npm test 2>&1 | grep -q "passing" && echo "✅ Passing" || echo "❌ Failing")
- Build: $(npm run build 2>&1 | grep -q "success" && echo "✅ Success" || echo "❌ Failed")

## Recovery Steps
1. To undo this rollback: \`git reset --hard $BACKUP_TAG\`
2. To view backup: \`git show $BACKUP_TAG\`
3. To delete backup: \`git tag -d $BACKUP_TAG\`
EOF

echo -e "${GREEN}✅ Rollback complete!${NC}"
echo -e "${BLUE}Report saved to: $REPORT_FILE${NC}"
echo ""
echo -e "${YELLOW}Recovery options:${NC}"
echo "  - Undo rollback: git reset --hard $BACKUP_TAG"
echo "  - View changes: git diff $BACKUP_TAG HEAD"
echo "  - Delete backup: git tag -d $BACKUP_TAG"