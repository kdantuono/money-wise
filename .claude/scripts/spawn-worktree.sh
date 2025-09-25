#!/bin/bash
# Spawn Git Worktrees for Parallel Development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

EPIC_NAME="$1"

if [ -z "$EPIC_NAME" ]; then
    echo -e "${RED}Error: Epic name required${NC}"
    echo "Usage: $0 <epic-name>"
    exit 1
fi

WORK_DIR=".claude/work/$EPIC_NAME"
STATE_FILE=".claude/orchestration/state/epics/$EPIC_NAME.json"

echo -e "${GREEN}🌳 Creating worktrees for Epic: $EPIC_NAME${NC}"

# Verify epic exists
if [ ! -f "$STATE_FILE" ]; then
    echo -e "${RED}Error: Epic state not found. Run epic initialization first.${NC}"
    exit 1
fi

# Create base work directory
mkdir -p "$WORK_DIR"

# Create epic branch if doesn't exist
if ! git show-ref --verify --quiet "refs/heads/epic/$EPIC_NAME"; then
    echo -e "${YELLOW}Creating epic branch: epic/$EPIC_NAME${NC}"
    git checkout -b "epic/$EPIC_NAME"
    git checkout -
fi

# Read stories from state (simplified parsing)
STORIES=$(grep -o '"story_[^"]*"' "$STATE_FILE" | tr -d '"' || echo "")

if [ -z "$STORIES" ]; then
    echo -e "${YELLOW}No stories found in epic state. Creating default structure.${NC}"
    STORIES="story_1 story_2 story_3"
fi

# Create worktree for each story
for story in $STORIES; do
    STORY_DIR="$WORK_DIR/$story"
    STORY_BRANCH="story/$EPIC_NAME-$story"
    
    if [ ! -d "$STORY_DIR" ]; then
        echo -e "${GREEN}  📁 Creating worktree for story: $story${NC}"
        git worktree add "$STORY_DIR" -b "$STORY_BRANCH" "epic/$EPIC_NAME"
        
        # Install dependencies in worktree
        if [ -f "$STORY_DIR/package.json" ]; then
            echo -e "${YELLOW}    Installing dependencies...${NC}"
            (cd "$STORY_DIR" && npm install --silent)
        fi
        
        # Create task worktrees (3 tasks per story by default)
        for task_num in 1 2 3; do
            TASK_DIR="$STORY_DIR/task_$task_num"
            TASK_BRANCH="task/$EPIC_NAME-$story-task_$task_num"
            
            echo -e "${GREEN}    📂 Creating worktree for task: task_$task_num${NC}"
            (cd "$STORY_DIR" && git worktree add "$TASK_DIR" -b "$TASK_BRANCH")
            
            # Copy .env if exists
            if [ -f ".env" ]; then
                cp .env "$TASK_DIR/.env"
            fi
        done
    else
        echo -e "${YELLOW}  ⚠️  Worktree already exists for story: $story${NC}"
    fi
done

# Create monitoring file
cat > "$WORK_DIR/status.json" << EOF
{
  "epic": "$EPIC_NAME",
  "created_at": "$(date -Iseconds)",
  "worktrees": $(git worktree list | grep -c "$EPIC_NAME"),
  "status": "ready"
}
EOF

# Verify worktrees
echo -e "\n${GREEN}✅ Worktrees created successfully:${NC}"
git worktree list | grep "$EPIC_NAME" | while read -r line; do
    echo "  $line"
done

echo -e "\n${GREEN}📊 Summary:${NC}"
echo "  - Epic branch: epic/$EPIC_NAME"
echo "  - Stories: $(echo $STORIES | wc -w)"
echo "  - Total worktrees: $(git worktree list | grep -c "$EPIC_NAME")"
echo "  - Work directory: $WORK_DIR"

echo -e "\n${GREEN}Next steps:${NC}"
echo "  1. Review decomposition in: $STATE_FILE"
echo "  2. Execute with: claude '/epic:execute $EPIC_NAME'"
echo "  3. Monitor progress with: ./monitor-epic.sh $EPIC_NAME"