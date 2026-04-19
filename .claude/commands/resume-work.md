# Resume Work - Automatic Session Recovery

**DESCRIPTION**: Automatically recovers your last work session by loading todos, analyzing recent activity, and providing context about where you left off.

---

## 🤖 AUTOMATED EXECUTION PROTOCOL

**Execute ALL steps sequentially without asking for permission:**

### Step 1: Discover Last Session

```bash
# Find the most recent non-empty todo file (>100 bytes to exclude empty sessions)
find ~/.claude/todos/ -name "*.json" -type f -size +100c -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2
```

Store the filepath for the next steps.

### Step 2: Load Previous Todos

Read the todo file identified in Step 1 using the Read tool.

Parse the JSON structure to understand:
- Total number of todos
- How many completed vs pending vs in_progress
- What phase/epic was active
- What specific task was in_progress

### Step 2.5: Read Daily Notes + Reconcile with Todo

**Purpose**: Integrate daily notes (canonical session transfer mechanism per `~/vault/moneywise/memory/feedback_daily_notes_management.md`) with todo restoration from Step 2. Reconciliation detects divergence between daily `🔄 Tomorrow` (single source of truth) and last `in_progress` todo task.

**Compute dates (local timezone, ISO 8601)**:

```bash
today=$(date -I)
yesterday=$(date -I -d 'yesterday')
```

Rationale: `date -I` uses system local TZ, resolves late-night timezone shift automatically.

**Read today's daily**:

```bash
today_path="$HOME/vault/moneywise/daily/${today}.md"

if [[ -f "$today_path" ]]; then
  today_exists=true
  # Check if 🔄 Tomorrow section has content (not just header)
  tomorrow_lines=$(sed -n '/^## 🔄 Tomorrow/,/^## /p' "$today_path" | sed '1d;$d' | grep -c '^-')
  today_has_tomorrow=$([[ $tomorrow_lines -gt 0 ]] && echo true || echo false)
else
  today_exists=false
  today_has_tomorrow=false
fi
```

**Read yesterday's daily** (for carry-over):

```bash
yesterday_path="$HOME/vault/moneywise/daily/${yesterday}.md"

if [[ -f "$yesterday_path" ]]; then
  yesterday_tomorrow=$(sed -n '/^## 🔄 Tomorrow/,/^## /p' "$yesterday_path" | sed '1d;$d')
else
  yesterday_tomorrow=""
fi
```

**Identify in_progress task from Step 2**: extract first todo where `status == "in_progress"` from the JSON loaded in Step 2. May be `null` if no task is in progress.

**Reconciliation — 4-case matrix**:

| Case | today_exists | today_has_tomorrow | yesterday_tomorrow | Verdict |
|------|:-:|:-:|:-:|---|
| **A** — Same-day end-of-prior-session carry | ✓ | ✓ | any | `✅ Same-day carry. Resume from: <today Tomorrow text>` |
| **B** — Same-day mid-session continuation | ✓ | ✗ | n/a | `ℹ️ Same-day continuation (mid-day session). Source: today 📝 Log last entry + in_progress todo` — **NOT F5 failure** |
| **C** — New day, yesterday carry-over | ✗ | n/a | present | `🌅 New day. Carry-over da ieri Tomorrow: <yesterday text>`. Today daily missing — **create deferred** a first trigger event (do NOT auto-create here) |
| **D** — Vault gap / fresh clone / >24h idle | ✗ | n/a | absent | `🆕 Vault gap. Fallback to todo-only recovery. Grep last 3 daily (if any) for Dead-end context.` |

**Alignment check** (applies to Case A and Case C when `in_progress_task` exists):

Compare `in_progress_task.content` keyword overlap with the daily Tomorrow text (case A: today; case C: yesterday).

- **Aligned** (≥2 tokens overlap normalized lowercase): no flag, proceed
- **Diverging** (0-1 tokens overlap): add `⚠️ Divergence: daily says <daily_text>, todo says <todo_content>. Prioritize daily (single-source rule per feedback_daily_notes_management.md).`
- **No in_progress_task**: skip alignment check, still show carry-over

**Store the verdict + carry-over text for Step 5 synthesis**. Do NOT print here; Step 5 is the single output synthesis point.

**Important guardrails**:

- Do NOT auto-create today's daily in this step (conflicts with in-flight discipline F9 "append-only mandatory" in feedback_daily_notes_management.md). Template creation is deferred to first trigger event or user manual intervention.
- Do NOT treat empty same-day Tomorrow as F5 failure (Case B is legitimate mid-day session before `🔄 Tomorrow` is written at last-session-of-day close).
- If `~/vault/moneywise/daily/` directory itself is missing (fresh clone before vault mount): short-circuit to Case D with message "⚠️ Vault not mounted at ~/vault/moneywise/ — daily integration skipped. Ensure vault sync before next session."

### Step 3: Recreate Todo List

Use the TodoWrite tool to restore the EXACT todo list from the previous session.

Preserve all statuses:
- ✅ completed tasks stay completed
- 🔄 in_progress tasks stay in_progress
- ⏳ pending tasks stay pending

### Step 4: Gather Work Context

Execute these commands in parallel to gather context:

```bash
# Check recent git activity
git log --oneline -5
git branch --show-current
git status --short

# Check recent documentation changes
find docs/ -name "*.md" -type f -mtime -3 -exec ls -lth {} + 2>/dev/null | head -5

# Check for recent code changes
git diff --stat HEAD~1..HEAD 2>/dev/null
```

### Step 5: Synthesize & Present Summary

Create a structured summary:

```markdown
## 📍 Session Recovery Complete

**Last Session**: [DATE/TIME from file timestamp]
**Session Duration**: [Calculate from file modification times if possible]

### ✅ What Was Completed
[List completed todos from the loaded session]

### 🔄 What Was In Progress
[Identify the task that was marked in_progress]

### 📋 What's Next
[First pending task + brief description]

### 🔍 Recent Activity
- **Branch**: [current branch]
- **Last Commit**: [most recent commit message]
- **Recent Changes**: [summary of git diff stat]

### 💡 Suggested Next Action
[Based on the in_progress or next pending task, suggest the specific next step]

### 📓 Daily Context
[Verdict from Step 2.5: one of Case A/B/C/D with carry-over text or fallback note]
[Alignment check result if applicable: ✅ aligned, ⚠️ divergence, or skipped]
[Today daily status: exists / missing (deferred create) / vault unavailable]
```

---

## ⚙️ Error Handling

- If no recent todos found (>3 days old): Report "No recent session found" and offer to check git/docs anyway
- If todo file is corrupted: Skip todo restoration but continue with context gathering
- If git commands fail: Continue with available data
- If `~/vault/moneywise/` directory is missing (fresh clone, vault not mounted): short-circuit Step 2.5 to Case D with "Vault not mounted" message, continue with todo-only recovery
- If daily markdown is malformed (no `## 🔄 Tomorrow` header found): treat as Case B (same-day continuation); do not attempt frontmatter repair
- If timezone edge case at day-boundary (00:00-00:15 local): `date -I` already handles, no special case needed

---

## 🎯 Success Criteria

✅ Todo list restored from last session
✅ Work context gathered and presented
✅ Today's daily read (or marked missing with deferred-create note); yesterday's `🔄 Tomorrow` extracted for carry-over
✅ Reconciliation verdict computed (Case A/B/C/D) with optional alignment check daily↔todo
✅ Clear next action identified (prioritizing daily single-source rule over todo if divergent)
✅ User can immediately continue working

---

**NOTE**: This command executes automatically. No user confirmation required for any step.
