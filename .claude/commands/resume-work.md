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
```

---

## ⚙️ Error Handling

- If no recent todos found (>3 days old): Report "No recent session found" and offer to check git/docs anyway
- If todo file is corrupted: Skip todo restoration but continue with context gathering
- If git commands fail: Continue with available data

---

## 🎯 Success Criteria

✅ Todo list restored from last session
✅ Work context gathered and presented
✅ Clear next action identified
✅ User can immediately continue working

---

**NOTE**: This command executes automatically. No user confirmation required for any step.
