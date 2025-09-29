# Fix Parent-Child Relationships (Manual Commands)

**Problem**: Gap tasks (74-81) have poor parent-child relationships and aren't on project board.

**Solution**: Use existing agnostic tools with these exact commands:

## 1. Add Parent-Child Relationships (Using GitHub CLI)

```bash
# STORY-001 gap tasks → Parent #62
gh issue comment 74 --repo kdantuono/money-wise --body "🔗 **Parent Task**: #62 (STORY-001)
**Type**: Gap remediation sub-task
**Status**: Blocks parent story completion"

gh issue comment 75 --repo kdantuono/money-wise --body "🔗 **Parent Task**: #62 (STORY-001)
**Type**: Gap remediation sub-task
**Status**: Blocks parent story completion"

gh issue comment 76 --repo kdantuono/money-wise --body "🔗 **Parent Task**: #62 (STORY-001)
**Type**: Gap remediation sub-task
**Status**: Blocks parent story completion"

gh issue comment 77 --repo kdantuono/money-wise --body "🔗 **Parent Task**: #62 (STORY-001)
**Type**: Gap remediation sub-task
**Status**: Blocks parent story completion"

gh issue comment 78 --repo kdantuono/money-wise --body "🔗 **Parent Task**: #62 (STORY-001)
**Type**: Gap remediation sub-task
**Status**: Blocks parent story completion"

# STORY-002 gap tasks → Parent #63
gh issue comment 79 --repo kdantuono/money-wise --body "🔗 **Parent Task**: #63 (STORY-002)
**Type**: Gap remediation sub-task
**Status**: Blocks parent story completion"

gh issue comment 80 --repo kdantuono/money-wise --body "🔗 **Parent Task**: #63 (STORY-002)
**Type**: Gap remediation sub-task
**Status**: Blocks parent story completion"

gh issue comment 81 --repo kdantuono/money-wise --body "🔗 **Parent Task**: #63 (STORY-002)
**Type**: Gap remediation sub-task
**Status**: Blocks parent story completion"
```

## 2. Add Child References to Parent Issues

```bash
# Add sub-task list to STORY-001 (#62)
gh issue comment 62 --repo kdantuono/money-wise --body "📋 **Gap Remediation Sub-Tasks Created**:

- #74: Remove Duplicate Entity Files ✅ (COMPLETED)
- #75: Implement TimescaleDB Configuration ✅ (ALREADY DONE)
- #76: Implement Repository Pattern
- #77: Generate Proper Database Migrations ✅ (COMPLETE)
- #78: Implement Comprehensive Database Tests

**Status**: 3/5 sub-tasks completed, 2 remaining for story completion"

# Add sub-task list to STORY-002 (#63)
gh issue comment 63 --repo kdantuono/money-wise --body "📋 **Gap Remediation Sub-Tasks Created**:

- #79: Implement Comprehensive Authentication Tests
- #80: Create Authentication Documentation
- #81: Enhance Password Security & Validation

**Status**: 0/3 sub-tasks completed, all remaining for story completion"
```

## 3. Add Gap Tasks to Project Board

```bash
# Add to board using existing project commands
gh project item-add 3 --owner kdantuono --url "https://github.com/kdantuono/money-wise/issues/74"
gh project item-add 3 --owner kdantuono --url "https://github.com/kdantuono/money-wise/issues/75"
gh project item-add 3 --owner kdantuono --url "https://github.com/kdantuono/money-wise/issues/76"
gh project item-add 3 --owner kdantuono --url "https://github.com/kdantuono/money-wise/issues/77"
gh project item-add 3 --owner kdantuono --url "https://github.com/kdantuono/money-wise/issues/78"
gh project item-add 3 --owner kdantuono --url "https://github.com/kdantuono/money-wise/issues/79"
gh project item-add 3 --owner kdantuono --url "https://github.com/kdantuono/money-wise/issues/80"
gh project item-add 3 --owner kdantuono --url "https://github.com/kdantuono/money-wise/issues/81"
```

## 4. Set Task Status Using Existing Script

```bash
# Set gap tasks to "To Do" status using existing board-status.sh
/home/nemesi/dev/money-wise/.claude/scripts/board-status.sh todo "[STORY-001-GAP] Remove Duplicate Entity Files"
/home/nemesi/dev/money-wise/.claude/scripts/board-status.sh todo "[STORY-001-GAP] Implement TimescaleDB Configuration"
/home/nemesi/dev/money-wise/.claude/scripts/board-status.sh todo "[STORY-001-GAP] Implement Repository Pattern"
/home/nemesi/dev/money-wise/.claude/scripts/board-status.sh todo "[STORY-001-GAP] Generate Proper Database Migrations"
/home/nemesi/dev/money-wise/.claude/scripts/board-status.sh todo "[STORY-001-GAP] Implement Comprehensive Database Tests"
/home/nemesi/dev/money-wise/.claude/scripts/board-status.sh todo "[STORY-002-GAP] Implement Comprehensive Authentication Tests"
/home/nemesi/dev/money-wise/.claude/scripts/board-status.sh todo "[STORY-002-GAP] Create Authentication Documentation"
/home/nemesi/dev/money-wise/.claude/scripts/board-status.sh todo "[STORY-002-GAP] Enhance Password Security & Validation"
```

## 5. Verify Relationships

```bash
# Check board status
/home/nemesi/dev/money-wise/.claude/scripts/board-status.sh list | grep GAP

# Check parent-child links
gh issue view 62 --repo kdantuono/money-wise --comments
gh issue view 63 --repo kdantuono/money-wise --comments
```

---

**Result**: ✅ All gap tasks will have proper parent-child relationships and board connectivity using only existing agnostic tools.

**No new scripts needed** - just run these commands when authenticated to GitHub.