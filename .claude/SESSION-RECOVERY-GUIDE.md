# Session Recovery Quick Start

## 🎯 Problem Solved

**Before**: Starting a new Claude Code session meant losing your todo list and context about what you were working on.

**After**: One command restores everything automatically.

## ⚡ Usage

At the start of **every new session**, simply run:

```bash
/resume-work
```

That's it! The command will automatically:
1. ✅ Find your last todo file
2. ✅ Restore your complete todo list with all statuses
3. ✅ Show recent git activity
4. ✅ Display recent documentation changes
5. ✅ Provide a clear "next action" suggestion

## 📊 What Gets Restored

### Todo List
- All completed tasks (✅)
- Tasks in progress (🔄)
- Pending tasks (⏳)
- Original structure and phases

### Work Context
- **Git**: Last 5 commits, current branch, pending changes
- **Docs**: Recent documentation updates (last 3 days)
- **Board**: Active items on GitHub project board (if applicable)
- **Code**: Summary of changes since last commit

### Actionable Output
```markdown
## 📍 Session Recovery Complete

**Last Session**: Oct 11, 2025 20:50
**Project**: money-wise

### ✅ What Was Completed
- P.2.1: Write Family Tests - TDD
- P.2.2: Implement PrismaFamilyService
- P.2.3: Remove TypeORM Family Code
- P.2.4: Verify Family Migration Complete

### 🔄 What Was In Progress
PHASE 2: Core Entities Migration (24h, 12 tasks)

### 📋 What's Next
P.2.5: Write User Tests - TDD (2h)

### 💡 Suggested Next Action
Continue TDD by writing comprehensive tests for User entity
before implementing PrismaUserService.

### 📓 Daily Context
**Case A** — Same-day end-of-prior-session carry.
Resume from today's 🔄 Tomorrow: "riprendere da Sprint 1.5 wizard step 3 implementation"
**Alignment check**: ✅ Aligned — in_progress todo matches daily carry-over
**Today daily**: ~/vault/moneywise/daily/2026-04-19.md (Tomorrow populated at 23:42 last session close)
```

## 🏗️ Architecture

### How It Works

The command is a **declarative automation script** that instructs Claude to:

```mermaid
graph TD
    A[/resume-work invoked] --> B[Find most recent todo file]
    B --> C[Read & parse JSON]
    C --> D[Recreate todos via TodoWrite]
    D --> E[Gather git context]
    D --> F[Check recent docs]
    D --> G[Check project board]
    E --> H[Synthesize summary]
    F --> H
    G --> H
    H --> I[Present to user]
```

### Why It Works

Claude Code slash commands are **expanded prompts**:
- The `.md` file contains instructions for Claude
- When invoked, Claude executes those instructions
- Uses available tools (Read, Bash, TodoWrite, etc.)
- Fully automated, no manual steps required

## 🛠️ Technical Details

### File Locations
- **Command definition**: `.claude/commands/resume-work.md`
- **Global version**: `~/.claude/commands/resume-work.md`
- **Todo storage**: `~/.claude/todos/*.json`

### Discovery Algorithm
```bash
# Finds most recent non-empty todo file
find ~/.claude/todos/ -name "*.json" -type f -size +100c \
  -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2
```

**Why >100 bytes?** Excludes empty session files (just `[]`)

### Error Handling
The command gracefully handles:
- ✅ No recent todos found (>3 days old)
- ✅ Corrupted JSON files
- ✅ Missing git repository
- ✅ No project board configured

## 🎨 Customization

### Modify Recovery Window
Edit the command file to change how far back it looks:

```bash
# Change -3 to your preferred number of days
find docs/ -name "*.md" -type f -mtime -3
```

### Add Custom Context
Add new steps to gather project-specific context:

```yaml
### Step 6.5: Check Custom Metrics
Execute:
  pnpm test:coverage
  docker compose ps
  grep "TODO" -r apps/ --include="*.ts"
```

### Adjust Output Format
Modify the synthesis template in Step 6 to match your preferences.

## 🔄 Workflow Integration

### Best Practices

1. **Always start with `/resume-work`**
   - Makes it a habit
   - Ensures continuity
   - Prevents duplicate work

2. **Review the summary before continuing**
   - Verify the context is accurate
   - Check if priorities changed
   - Confirm next action makes sense

3. **Update CLAUDE.md if workflow changes**
   - Document any customizations
   - Share with team if applicable

### Integration with Other Commands

```bash
# Start session with full context
/resume-work

# Then continue with specific work
/epic:execute authentication
# or
/feature add-export
# or
/fix 123
```

## 📝 Example Session

```markdown
User: /resume-work

Claude:
[Automatically executes all steps]

## 📍 Session Recovery Complete

**Last Session**: Oct 11, 2025 20:50

### ✅ Completed
- Phase 1: All 5 Prisma setup tasks
- Phase 2: Family entity migration (4 tasks)

### 🔄 In Progress
PHASE 2: Core Entities Migration

### 📋 Next Up
P.2.5: Write User Tests - TDD (2h)

### 🔍 Recent Activity
- Branch: feature/epic-1.5-completion
- Last Commit: docs(prisma): P.2.7/P.2.8 scope analysis
- 3 files changed, 127 insertions(+), 45 deletions(-)

### 💡 Next Action
Begin TDD cycle for User entity by writing comprehensive
unit tests in `apps/backend/__tests__/unit/core/database/prisma/services/user.service.spec.ts`

---

User: Perfect! Let's continue with P.2.5

Claude: [Immediately knows context and continues work]
```

## 🚀 Future Enhancements

Potential improvements to consider:

1. **Session Duration Tracking**: Calculate time spent in last session
2. **Velocity Metrics**: Show completion rate trends
3. **Smart Suggestions**: AI-powered next action based on patterns
4. **Multi-Project Support**: Handle context across multiple projects
5. **Team Sync**: Share session context with team members

## 📚 References

- Command definition: `.claude/commands/resume-work.md`
- Command registry: `.claude/commands/README.md`
- Claude Code docs: https://docs.claude.com/claude-code
- Project workflow: `CLAUDE.md`

---

**Version**: 1.0.0
**Created**: Oct 11, 2025
**Last Updated**: Oct 11, 2025
