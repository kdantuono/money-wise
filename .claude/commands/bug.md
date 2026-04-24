<!-- .claude/commands/bug.md -->
description: Autonomous GitHub bug resolution — single command takes issue → agent → branch → fix → PR → auto-merge lifecycle loop

# /bug — Autonomous Bug Resolution

Takes a GitHub issue number and drives the full lifecycle autonomously: triage → agent routing → branch setup → fix implementation → PR creation → review+CI monitoring → auto-merge. **No user confirmation between steps** (matches MoneyWise autonomous continuation rule — see `~/vault/moneywise/memory/feedback_autonomous_continuation.md`; vault is the single source of truth for `feedback_*` memories, not this repo).

## Arguments

Issue number: `$ARGUMENTS` (e.g., `/bug 458`)

## When NOT to use

- **Epic features** (multi-PR, new modules): use `/full-feature` instead.
- **Security-critical with uncertain fix**: triage manually + consult security-specialist first.
- **Unlabeled vague issue** (no reproduction steps, no affected area): comment on issue asking for clarification; don't spawn agent on guesswork.
- **Migration-touching fix**: tier-1 confirm required (MANDATORY per `~/vault/moneywise/memory/feedback_autonomous_continuation.md` migration exception).

## Step 1 — Fetch & Triage (autonomous)

```bash
gh issue view $ARGUMENTS --json number,title,body,labels,assignees,comments
```

**Extract:**
- Title + body + labels
- Reproduction steps / expected vs actual
- Affected files hinted in body (paths, component names)

**Keyword routing (priority order):**

| Keywords in title/body | Primary agent | Notes |
|------------------------|---------------|-------|
| `security`, `auth`, `xss`, `sql`, `rls`, `leak`, `CVE`, `vulnerability` | `security-specialist` | Sensitive context, extra caution |
| `database`, `migration`, `rls`, `supabase`, `schema`, `postgres` | `database-specialist` + `supabase-specialist` pair | Tier-1 confirm required for migration |
| `edge function`, `deno`, `webhook`, `categorize`, `detect-transfer`, `detect-bnpl` | `supabase-specialist` | Deno runtime specifics |
| `test`, `coverage`, `flaky`, `e2e`, `playwright`, `vitest` | `test-specialist` | TDD focus, test credibility |
| `ui`, `button`, `form`, `wizard`, `theme`, `dashboard`, `component`, `react`, `tailwind` | `frontend-specialist` | Default for UI bugs |
| `performance`, `bundle`, `latency`, `slow`, `memory` | `frontend-specialist` + `quality-evolution-specialist` pair | Quality debt |
| `ci`, `github actions`, `pipeline`, `workflow` | `cicd-pipeline-agent` | Infra scope |
| `deploy`, `vercel`, `edge functions` + deploy | `devops-specialist` | Deploy scope |
| `analytics`, `posthog`, `sentry`, `tracing` | `analytics-specialist` | Observability scope |
| None of above | `general-purpose` | Fallback triage agent |

## Step 2 — Pre-flight concurrency check

```bash
git fetch origin
git checkout develop
git pull --ff-only origin develop

# Init state file if missing (first invocation per machine)
STATE_DIR=".claude/orchestration/state"
STATE_FILE="$STATE_DIR/bugs-active.json"
mkdir -p "$STATE_DIR"
[ -f "$STATE_FILE" ] || echo '{"bugs": []}' > "$STATE_FILE"
```

**Read** `.claude/orchestration/state/bugs-active.json` — check for overlapping `paths_touched_predicted`:

```json
{
  "bugs": [
    {
      "issue": 456,
      "branch": "fix/issue-456-onboarding-orphan-and-visual",
      "agent_id": "abc...",
      "paths_touched_predicted": ["apps/web/src/components/onboarding/**"],
      "start_ts": "2026-04-20T10:00:00Z",
      "status": "in_progress"
    }
  ]
}
```

**Conflict rules (single source of truth for status on initial append):**

- **Overlap detected** (same file tree branch): append entry with `status: "queued"` + `blocked_by: [N]` (serial queue). Create `CronCreate` every 10 min checking if blocker status=`merged` → on match, transition entry to `status: "in_progress"` + spawn agent.
- **Disjoint paths**: append entry with `status: "in_progress"` + spawn agent immediately (no queue).

Status lifecycle in `bugs-active.json`: `queued` → `in_progress` → `pr_open` → `merging` → `merged` (or `failed`).

## Step 3 — Branch setup

```bash
ISSUE_NUM=$ARGUMENTS
TITLE_SLUG=$(gh issue view $ISSUE_NUM --json title --jq '.title' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | cut -c1-40 | sed 's/-$//')
BRANCH="fix/issue-$ISSUE_NUM-$TITLE_SLUG"

git checkout -b "$BRANCH"
```

**DO NOT** use worktree isolation by default (see `~/vault/moneywise/memory/feedback_agent_orchestration.md` — subagent sandbox rules). Exception: tasks >2h may opt-in via `scripts/bootstrap-worktree.sh`.

## Step 4 — Spawn specialist agent (background)

Pre-compute before spawn:

```bash
ISSUE_URL=$(gh issue view "$ISSUE_NUM" --json url --jq '.url')
REPO_ROOT=$(git rev-parse --show-toplevel)
```

```
Agent({
  subagent_type: <from Step 1 routing>,
  run_in_background: true,
  name: `bug-${ISSUE_NUM}-agent`,
  prompt: `
TASK: Fix GitHub issue #${ISSUE_NUM}.

Full issue: ${ISSUE_URL}
Fetch with: gh issue view ${ISSUE_NUM} --json body,title,labels

BRANCH: ${BRANCH} (already created + checked out)
REPO: ${REPO_ROOT}

PROCEDURE (TDD):
1. Read issue + related files
2. Identify root cause (confirm with user in issue body)
3. Write failing test(s) — commit with "test: ..." prefix
4. Implement minimal fix — commit with "fix(<scope>): ... — refs #${ISSUE_NUM}"
5. Run pnpm --filter @money-wise/web test / typecheck / lint → all green
6. git push origin ${BRANCH}
7. gh pr create --base develop --title "fix(<scope>): <summary> (closes #${ISSUE_NUM})"

RULES:
- DO NOT invoke any Skill tool.
- DO NOT spawn other agents.
- DO NOT skip hooks (no --no-verify).
- DO NOT touch files outside scope (predicted paths: <FROM STEP 2>).
- Use Co-Authored-By in final commit: "Claude Opus 4.7 (1M context) <noreply@anthropic.com>".
- If blocked (test fails you can't fix, spec ambiguous, migration conflict): commit WIP + open DRAFT PR + return with "BLOCKED: <reason>".

RETURN ≤200 words: files changed, tests added, commit SHAs, PR URL, blocker if any.
  `
})
```

Budget agent: ~2h. If exceeds 2h30m, agent expected to commit WIP + draft PR.

## Step 5 — Wait completion + local validation

Wait for background agent completion notification.

**On completion:**
```bash
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
./.claude/scripts/validate-ci.sh 8
```

**If red**: SendMessage to agent with validation logs → agent fixes → repushes. Max 2 retry loops, then tier-1 escalation (PushNotification user).

## Step 6 — PR lifecycle loop (MANDATORY per user rule)

After agent creates PR:

```
CronCreate({
  schedule: "*/5 * * * *",  // every 5 min
  durable: true,
  triggerId: "pr-lifecycle-${ISSUE_NUM}",
  prompt: `
Check PR status for issue #${ISSUE_NUM} branch ${BRANCH}:
- gh pr view --json number,state,reviewDecision,statusCheckRollup
- Copilot review state (CHANGES_REQUESTED requires fix cycle)
- CI/CD rollup state (FAILURE requires fix cycle)

ACTIONS (usa i valori esatti di \`gh pr view --json reviewDecision,state,statusCheckRollup\`):
- If reviewDecision == "APPROVED" (o "" = no review required) + all CI green + (5+ min since last push): apply 'auto-merge' label
  → JSON path: \`gh pr view N --json reviewDecision,statusCheckRollup --jq '{decision: .reviewDecision, failed: [.statusCheckRollup[] | select(.conclusion=="FAILURE")]}'\`
- If reviewDecision == "CHANGES_REQUESTED": read inline comments (\`gh api repos/.../pulls/N/comments\`), classify (must-fix/nice-to-have/wrong), commit fix if must-fix + trigger @copilot re-review
- If any statusCheckRollup entry has conclusion == "FAILURE": read logs (\`gh run view <id> --log-failed\`), spawn fix or escalate
- If state == "MERGED": CronDelete self + update entry in bugs-active.json (status=merged + merge_sha) + daily note entry + cleanup local branch
- Else (pending CI, UNSTABLE, BLOCKED): log status + wait next tick
  `
})
```

Buffer rule 5-min: wait at least 5 min after last commit push before applying auto-merge label (Copilot may re-review). Documented in `~/vault/moneywise/memory/feedback_auto_merge_label_timing.md`.

## Step 7 — Cleanup post-merge

Cron detects MERGED state:

```bash
# CronDelete self
# Update bugs-active.json: remove entry
# Clean local branch
git checkout develop
git pull origin develop
git branch -d "$BRANCH"

# Update daily note: append "✅ /bug #${ISSUE_NUM} closed in <merge-sha>"
```

## bugs-active.json schema

Path: `.claude/orchestration/state/bugs-active.json` (gitignored).

```json
{
  "bugs": [
    {
      "issue": 456,
      "branch": "fix/issue-456-onboarding-orphan-and-visual",
      "agent": "frontend-specialist",
      "agent_id": "a62337192545feac8",
      "paths_touched_predicted": [
        "apps/web/src/components/onboarding/**",
        "apps/web/src/services/onboarding.client.ts",
        "apps/web/src/services/onboarding-plan.client.ts"
      ],
      "start_ts": "2026-04-20T00:00:00Z",
      "status": "in_progress",
      "blocked_by": null,
      "pr_url": null,
      "merge_sha": null
    }
  ]
}
```

**Status lifecycle**: `queued` → `in_progress` → `pr_open` → `merging` → `merged` (or `failed`).

**Fail-safe**: stale entry (> 4h in_progress) auto-cleaned by separate cron coordinator (every 30 min).

## Anti-patterns

- **DO NOT** use `/bug` for >1 issue at once. Run `/bug 458` + `/bug 459` as separate calls; each handles its own concurrency check.
- **DO NOT** manually edit `bugs-active.json` while a `/bug` is in flight. Race condition with cron.
- **DO NOT** cross-branch cherrypick between active `/bug` branches. Let them land sequentially via merge queue.
- **DO NOT** skip PR lifecycle loop setup (user rule: MANDATORY).

## Success criteria

- Issue closed via merged PR
- `auto-merge` label applied only after Copilot approve + CI green + 5 min buffer
- `bugs-active.json` cleaned
- Daily note updated
- CronCreate auto-deleted

## Related references

Le memorie `feedback_*.md` vivono nel vault Obsidian (non nel repo). Path:
`~/vault/moneywise/memory/` (symlink'd a `~/.claude/projects/<project-id>/memory/`).
Vedi CLAUDE.md § "Knowledge Vault (Obsidian)" per setup.

- `~/vault/moneywise/memory/feedback_autonomous_continuation.md` — autonomy rule (non stop mid-phase)
- `~/vault/moneywise/memory/feedback_pr_lifecycle_loop_workflow.md` — CronCreate post-PR mandatory
- `~/vault/moneywise/memory/feedback_auto_merge_label_timing.md` — 5-min buffer post-push
- `~/vault/moneywise/memory/feedback_agent_orchestration.md` — agent spawn policy (bypassPermissions, no-worktree default)
- `~/vault/moneywise/memory/feedback_branch_discipline.md` — branch naming convention
- `~/vault/moneywise/memory/feedback_ci_checkpoints.md` — CI verification gates
- `~/vault/moneywise/memory/feedback_copilot_re_review_ping.md` — trigger re-review post-fix push
