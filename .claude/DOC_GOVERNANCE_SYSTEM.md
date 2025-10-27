# 📋 Documentation Governance System

**Status**: ✅ **Active and Enforced**
**Last Updated**: October 23, 2025
**Mechanism**: Pre-commit hook (automatic, non-blocking)

---

## Overview

This is an **automatic documentation governance system** that ensures markdown files stay organized without requiring manual intervention.

### How It Works

```
You (Claude) create ANY .md file
    ↓
[git add file.md]
[git commit -m "message"]
    ↓
┌─ PRE-COMMIT HOOK ──────────┐
│ Detects markdown files     │
│ Checks against rules       │
│ Auto-moves violations      │
│ Stages changes             │
│ Continues commit           │
└────────────────────────────┘
    ↓
Commit succeeds with files in correct location
```

**Key Feature**: Hook **never blocks** commits, it **auto-fixes and continues**.

---

## Rules File

**Location**: `.claude/rules/markdown.rules`

### Whitelisted (Root-Level Allowed)
```
✅ README.md
✅ FRONTEND_HANDOFF.md
✅ CHANGELOG.md
✅ CONTRIBUTING.md
✅ LICENSE.md
```

### Auto-Move Patterns
```
*ANALYSIS*.md        → docs/archive/
*SUMMARY*.md         → docs/archive/
*PROGRESS*.md        → docs/archive/
*EXECUTIVE*.md       → docs/archive/
*SESSION*.md         → .claude/sessions/
*TEMPORARY*.md       → docs/archive/
*WIP*.md             → docs/archive/
*MILESTONE*.md       → docs/archive/
*SWAGGER*.md         → docs/archive/
*STATUS*.md          → docs/archive/
*RECOVERY*.md        → .claude/sessions/
*IMPLEMENTATION*.md  → docs/archive/
```

---

## The Hook Script

**Location**: `.claude/scripts/auto-fix-doc-governance.sh`

**What It Does**:
1. Runs before every commit
2. Scans staged markdown files
3. Compares filenames against rules
4. Auto-moves violations to correct location
5. Stages the moves
6. Continues commit normally

**Exit Code**: Always `0` (never blocks)

---

## Directory Structure

```
PROJECT ROOT/
├── README.md                    ✅ Whitelisted
├── FRONTEND_HANDOFF.md         ✅ Whitelisted
├── CHANGELOG.md                ✅ Whitelisted
├── CONTRIBUTING.md             ✅ Whitelisted
├── LICENSE.md                  ✅ Whitelisted
│
├── docs/
│   ├── INDEX.md                (Navigation hub)
│   ├── DOCUMENTATION_STRUCTURE.md
│   ├── SKIPPED_TESTS_DOCUMENTATION.md
│   ├── planning/               (Roadmaps, specs)
│   ├── development/            (Setup, progress)
│   ├── architecture/           (ADRs, patterns)
│   └── archive/                (Historical work - AUTO-MOVED HERE)
│
├── .claude/
│   ├── CLAUDE.md               (Project instructions)
│   ├── rules/
│   │   └── markdown.rules       (Governance rules - update this)
│   ├── scripts/
│   │   └── auto-fix-doc-governance.sh  (The hook)
│   ├── sessions/               (Session notes - AUTO-MOVED HERE)
│   ├── commands/
│   ├── agents/
│   └── ...
```

---

## How to Use (For AI/Claude)

### When Creating Documentation

1. **Check the rules** (or trust the hook):
   - Essential docs → `docs/planning/`, `docs/development/`, etc.
   - Intermediate analysis → Will be auto-moved to `docs/archive/`
   - Session notes → Will be auto-moved to `.claude/sessions/`

2. **Generate anywhere** (hook will fix):
   - Even if you put a file in the root by mistake
   - Hook catches it at commit time
   - Auto-moves to correct location

3. **Trust the system**:
   - Don't worry about organization
   - Hook handles it automatically
   - No manual consolidation needed

### Examples

```bash
# ❌ Wrong (but will be auto-fixed):
touch ANALYSIS-README.md
git add ANALYSIS-README.md
git commit -m "docs: Add analysis"
↓
[Hook auto-moves to docs/archive/]
Commit succeeds ✅

# ✅ Right:
touch docs/planning/feature-x-spec.md
git add docs/planning/feature-x-spec.md
git commit -m "docs: Add feature X spec"
↓
[No action needed]
Commit succeeds ✅
```

---

## How to Modify Rules

**To update what gets auto-moved**:

1. Edit `.claude/rules/markdown.rules`
2. Add/remove patterns in the `auto_move` section
3. Commit the changes
4. New pattern applies to next commits

```yaml
# Example: Add new pattern
auto_move:
  "*DRAFT*.md": "docs/archive/"      # New pattern
  "*ANALYSIS*.md": "docs/archive/"   # Existing
```

**This allows for flexibility as project needs evolve.**

---

## Current State

**Consolidation Completed**: ✅
- 30 orphan markdown files moved to `docs/archive/`
- Whitelisted files preserved in root
- Pre-commit hook integrated and active

**Future Commits**:
- Any markdown I generate will be automatically organized
- Zero manual intervention needed
- Repository stays clean automatically

---

## Technical Details

### Hook Execution

```bash
# Called by .husky/pre-commit
./.claude/scripts/auto-fix-doc-governance.sh

# Checks:
# 1. Get staged markdown files
# 2. For each file in root:
#    - Check if whitelisted
#    - If not, determine destination
#    - Use git mv to move
#    - Stage the move
# 3. Report what was moved
# 4. Exit with 0 (never fails)
```

### Performance

- **Time**: < 1 second (only checks .md files)
- **Impact**: Negligible on commit time
- **Failures**: None (hook is fail-safe)

---

## When Rules Change

If rules need to change mid-project:

```bash
# 1. Update .claude/rules/markdown.rules
# 2. Commit the rules change
# 3. Next commits use new rules
# 4. Optional: manually consolidate existing files
```

---

## Verification

**To verify the system is working**:

```bash
# Check that hook is integrated
cat .husky/pre-commit | grep auto-fix-doc-governance
# Should show: ./.claude/scripts/auto-fix-doc-governance.sh

# Check that rules file exists
cat .claude/rules/markdown.rules
# Should show governance rules

# Check that script is executable
ls -la .claude/scripts/auto-fix-doc-governance.sh
# Should show: -rwxr-xr-x (executable)
```

**To test the hook**:

```bash
# Create a test violation
touch TEST_ANALYSIS.md
git add TEST_ANALYSIS.md
git commit -m "test"

# Hook should auto-move it
ls docs/archive/TEST_ANALYSIS.md
# Should exist ✅

# Clean up
git reset HEAD~1
rm docs/archive/TEST_ANALYSIS.md
```

---

## Benefits

| Aspect | Benefit |
|--------|---------|
| **Automatic** | No manual work needed |
| **Non-blocking** | Never fails commits |
| **Transparent** | User sees what was moved |
| **Self-enforcing** | Every commit reinforces pattern |
| **Fail-safe** | Works even if rules are wrong |
| **Maintainable** | Single rules file to update |
| **Discoverable** | Clear rules in `.claude/rules/` |

---

## What Happens to Old Files

**30 markdown files** were consolidated in the initial setup:

```
docs/archive/  (30 files moved)
├── ANALYSIS-README.md
├── ANALYSIS_INDEX.md
├── BACKEND_ANALYSIS_REPORT.md
├── CODEBASE_STRUCTURE_OVERVIEW.md
├── EXECUTIVE_SUMMARY_PHASE_4.md
├── EXECUTIVE-SUMMARY-20251022.md
├── MILESTONE2-ANALYSIS.md
├── SESSION-*.md
├── SWAGGER-VERIFICATION-COMPLETE.md
└── (20 more historical files)
```

**These are preserved** for historical reference but won't accumulate new files. Going forward:
- New intermediate work automatically goes to `docs/archive/`
- Session notes automatically go to `.claude/sessions/`
- Root stays clean

---

## Summary

✅ **Documentation governance is now automatic**

```
Before: Manual consolidation needed
After:  Hook auto-fixes every commit

Before: Files scattered randomly
After:  Files organized by pattern

Before: Entropy increases over time
After:  Order automatically maintained
```

**The system is self-reinforcing**: As I (Claude) generate files, they automatically go to the right place. Over time, the repository naturally stays organized without manual effort.

---

**System Active**: October 23, 2025
**Status**: ✅ **Fully Operational**
