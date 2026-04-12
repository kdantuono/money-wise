# Marker Convention

> Standard format for TODO, FIXME, and HACK markers across the MoneyWise codebase.

## Format

```
// TODO(<owner>, <YYYY-MM-DD>, <issue>): description
// FIXME(<owner>, <YYYY-MM-DD>, <issue>): description
// HACK(<owner>, <YYYY-MM-DD>, <issue>): description
```

### Examples

```typescript
// TODO(kdantuono, 2026-04-12, #350): replace mock with real SaltEdge sandbox
// FIXME(kdantuono, 2026-04-12, #351): auth guard not redirecting unauthenticated users
// HACK(kdantuono, 2026-04-12, #352): workaround for Prisma connection pool exhaustion
```

### Fields

| Field | Required | Description |
|---|---|---|
| `owner` | Yes | GitHub username of the person responsible |
| `date` | Yes | ISO 8601 date when the marker was added |
| `issue` | Recommended | GitHub issue number (e.g., `#350`) |
| `description` | Yes | What needs to be done and why |

## Marker Types

| Marker | Meaning | Urgency |
|---|---|---|
| `TODO` | Work that needs to be done | Normal |
| `FIXME` | Known bug or incorrect behavior | High |
| `HACK` | Intentional workaround that should be replaced | High |

## Compliance

### Compliant markers

A marker is **compliant** if it matches the format `TODO(<owner>, <date>, ...)` (with at minimum owner and date).

### Walked-away markers

A **walked-away** marker is a bare `TODO`, `FIXME`, or `HACK` without the structured format:
```
// TODO: fix this later        ← walked-away (no owner, date, or issue)
// FIXME - broken              ← walked-away
// TODO(tier0): needs mock     ← partially compliant (has category, missing date)
```

### Stale markers

A marker is **stale** if its date is more than 90 days old and the referenced issue is still open.

## Enforcement

- `scripts/lint-markers.sh` scans `apps/` and `packages/` for compliance
- Walked-away count is tracked against a baseline in `.claude/quality/marker-baseline.txt`
- New code should use compliant markers; walked-away markers in existing code are tolerated up to the baseline
- The baseline should decrease over time as markers are converted or resolved

## Transition Plan

1. **Phase 0** (current): Establish baseline count of walked-away markers
2. **Phase 1**: All new markers must be compliant (enforced in code review)
3. **Phase 2**: Convert highest-impact walked-away markers during refactoring
4. **Phase 3**: Reduce baseline to zero; add pre-commit enforcement
