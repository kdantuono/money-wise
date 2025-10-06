#!/bin/bash

# EPIC-1.5 Parallel Execution Script
# This script orchestrates the parallel development of EPIC-1.5 stories

echo "🚀 EPIC-1.5 Infrastructure & Quality Foundation - Orchestration Starting"
echo "========================================================================="

# Configuration
EPIC_BRANCH="epic/1.5-infrastructure"
PROJECT_ID="PVT_kwHOADnPXc4BDdMt"
OWNER="kdantuono"
REPO="money-wise"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Current State:${NC}"
echo "  - STORY-1.5.1: In Progress (feat/code-quality-cleanup)"
echo "  - STORY-1.5.2: In Review (merged to epic)"
echo "  - STORY-1.5.3: Ready to Start"
echo "  - STORY-1.5.4: Blocked by 1.5.1"
echo "  - STORY-1.5.5: Ready to Start"
echo "  - STORY-1.5.6: Blocked by 1.5.1"
echo "  - STORY-1.5.7: Ready to Start (soft dependency)"
echo ""

# Function to create feature branch
create_feature_branch() {
    local BRANCH_NAME=$1
    local STORY_ID=$2

    echo -e "${YELLOW}Creating branch: ${BRANCH_NAME}${NC}"
    git checkout $EPIC_BRANCH
    git pull origin $EPIC_BRANCH
    git checkout -b $BRANCH_NAME
    git push -u origin $BRANCH_NAME
    echo -e "${GREEN}✓ Branch ${BRANCH_NAME} created${NC}"
}

# Function to update project board
update_board_status() {
    local ITEM_ID=$1
    local STATUS=$2

    echo -e "${YELLOW}Updating board status for ${ITEM_ID} to ${STATUS}${NC}"
    # Note: Field IDs need to be fetched from the project
    # gh project item-edit --project-id $PROJECT_ID --id $ITEM_ID --field-id STATUS_FIELD --single-select-option-id $STATUS_ID
}

echo -e "${BLUE}🎯 Phase 1: Launch Parallel Stories (3 concurrent)${NC}"
echo "=================================================="
echo ""

# STORY-1.5.3: Documentation
echo -e "${GREEN}📚 STORY-1.5.3: Documentation Consolidation${NC}"
echo "Agent: documentation-specialist"
echo "Branch: feat/documentation-architecture"
echo "Context: .claude/context/tasks/story-1.5.3-documentation.md"
echo "Commands to execute:"
echo "  git checkout epic/1.5-infrastructure"
echo "  git checkout -b feat/documentation-architecture"
echo "  git push -u origin feat/documentation-architecture"
echo ""

# STORY-1.5.5: Claude Cleanup
echo -e "${GREEN}🧹 STORY-1.5.5: .claude/ Directory Cleanup${NC}"
echo "Agent: quality-evolution-specialist"
echo "Branch: feat/claude-organization"
echo "Context: .claude/context/tasks/story-1.5.5-claude-cleanup.md"
echo "Commands to execute:"
echo "  git checkout epic/1.5-infrastructure"
echo "  git checkout -b feat/claude-organization"
echo "  git push -u origin feat/claude-organization"
echo ""

# STORY-1.5.7: Testing Infrastructure
echo -e "${GREEN}🧪 STORY-1.5.7: Testing Infrastructure${NC}"
echo "Agent: qa-testing-engineer"
echo "Branch: feat/test-infrastructure"
echo "Context: .claude/context/tasks/story-1.5.7-testing-infrastructure.md"
echo "Commands to execute:"
echo "  git checkout epic/1.5-infrastructure"
echo "  git checkout -b feat/test-infrastructure"
echo "  git push -u origin feat/test-infrastructure"
echo ""

echo -e "${BLUE}📋 Agent Launch Commands:${NC}"
echo "========================================="
echo ""

echo "1. Launch documentation-specialist for STORY-1.5.3:"
echo -e "${YELLOW}claude-code --agent documentation-specialist --context .claude/context/tasks/story-1.5.3-documentation.md${NC}"
echo ""

echo "2. Launch quality-evolution-specialist for STORY-1.5.5:"
echo -e "${YELLOW}claude-code --agent quality-evolution-specialist --context .claude/context/tasks/story-1.5.5-claude-cleanup.md${NC}"
echo ""

echo "3. Launch qa-testing-engineer for STORY-1.5.7:"
echo -e "${YELLOW}claude-code --agent qa-testing-engineer --context .claude/context/tasks/story-1.5.7-testing-infrastructure.md${NC}"
echo ""

echo -e "${BLUE}🔄 Phase 2: Monitor & Coordinate${NC}"
echo "================================="
echo ""
echo "Monitor progress with:"
echo "  gh pr list --base epic/1.5-infrastructure"
echo "  gh project item-list 3 --owner kdantuono"
echo ""

echo -e "${BLUE}⏳ Phase 3: After STORY-1.5.1 Completion${NC}"
echo "========================================"
echo ""
echo "Launch blocked stories:"
echo "  - STORY-1.5.4: Configuration Management (devops-engineer)"
echo "  - STORY-1.5.6: Project Structure (architect)"
echo ""

echo -e "${BLUE}✅ Phase 4: Epic Completion${NC}"
echo "============================"
echo ""
echo "When all stories are merged to epic/1.5-infrastructure:"
echo "1. Create PR from epic/1.5-infrastructure to develop"
echo "2. Run full test suite"
echo "3. Merge to develop"
echo "4. Update project board: move all stories to Done"
echo "5. Delete feature branches"
echo ""

echo -e "${GREEN}🎉 Orchestration plan ready!${NC}"