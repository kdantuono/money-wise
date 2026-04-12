# Test Policy

> Canonical rules for what counts as a test, how tests must be discovered, and how to quarantine failures.

## Definitions

### What Is a Test File?

A file is a **test file** if and only if:

1. Its name matches `*.test.{ts,tsx,js,jsx}` or `*.spec.{ts,tsx,js,jsx}`
2. It lives under a path covered by the runner's `testMatch` / `include` patterns
3. It is **not** excluded by `testPathIgnorePatterns` / `exclude`
4. The runner **actually discovers and executes** it (verified via `--listTests` / `--list`)

A file that matches naming conventions but is never executed is a **phantom test** — a credibility liability.

### What Is NOT a Test File?

- Schema definitions (e.g., `openapi.schema.ts`) regardless of naming
- Configuration files
- Type declaration files (`.d.ts`)
- Files inside `node_modules/`, `dist/`, `coverage/`, `.next/`, `out/`

## Discovery Rules

1. **Every test file must be discovered by its runner.** No exceptions.
2. Backend (Jest): `testMatch` in `apps/backend/jest.config.js` governs discovery.
3. Web (Vitest): `include`/`exclude` in `apps/web/vitest.config.mts` governs discovery.
4. Run `--listTests` (Jest) or `--list` (Vitest) to verify discovery after any config change.
5. The phantom detection script (`.claude/scripts/validate-test-integrity.sh` PHASE 0) compares filesystem test files against runner discovery — any delta is a hard failure.

## Quarantine Rules

### Allowed quarantine methods

| Method | When to use | Tracking |
|---|---|---|
| `it.skip('TODO(tier0): reason')` | Individual test with a real failure | Must include reason |
| `describe.skip(...)` | Entire suite fails (e.g., compile error) | Must have `// TODO(tier0):` comment above |
| `test.fixme(...)` | Playwright E2E test with known broken behavior | Must have `// FIXME(tier0):` comment above |
| `tests-disabled/` directory | Long-term quarantine (file moved out of discovery) | Must track in `.claude/quality/test-debt.md` |

### Prohibited

- `expect(true).toBe(true)` — tautology assertions that always pass
- `expect(a || b).toBe(true)` — disjunctive assertions that weaken the contract
- `expect(a || true).toBe(true)` — vacuous assertions
- Commenting out test bodies while leaving the `it()` shell
- Removing test files without tracking the removal

### `.skip` Requirements

Every `.skip` or `.fixme` must:

1. Include a reason: `it.skip('TODO(tier0): env mock not matching production mode')`
2. Reference a tracked issue when one exists
3. Be auditable via `grep -rn '\.skip\|\.fixme'`

## Stale Test Detection

- Tests quarantined for > 90 days without progress are escalated
- The marker lint script (`scripts/lint-markers.sh`) tracks stale TODO markers
- `.claude/quality/test-debt.md` is the canonical ledger of quarantined tests

## Enforcement

- `validate-test-integrity.sh` runs phantom detection (PHASE 0) and test execution
- Pre-push validation (`.claude/scripts/validate-ci.sh`) includes test integrity checks
- CI pipeline enforces coverage thresholds (backend: 70/65/72/70 S/B/F/L)
