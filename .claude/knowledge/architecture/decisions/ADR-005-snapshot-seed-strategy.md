# ADR-005: Snapshot Seed Strategy for Development

## Status

**Proposed** - To be implemented after SaltEdge integration is complete

## Context

During development, we need to balance two needs:

1. **Active integration work**: Need real SaltEdge connection flow to test/debug
2. **Post-integration work**: Need fast dev startup with pre-populated data for transactions, analytics, budgets

Currently, seeding fake accounts/transactions creates unrealistic data that doesn't match real SaltEdge responses and can mask integration issues.

## Decision

Implement a **Snapshot Seed** strategy with demo mode support.

### Phase 1: Minimal Auth Seed (Implemented)

- `db:seed` or `db:seed:auth` - Creates only:
  - Test Family
  - test@example.com user (verified, ADMIN)
  - member@example.com user (verified, MEMBER)
- No accounts, transactions, categories, or budgets
- Developer connects via real SaltEdge flow

### Phase 2: Snapshot Seed (Future)

#### Snapshot Creation

```bash
pnpm db:snapshot
```

This command will:
1. Export current database state for test user to JSON
2. Store in `apps/backend/src/database/seeds/snapshots/`
3. Include: BankConnections, Accounts, Transactions, Categories

#### Snapshot Restoration

```bash
pnpm db:seed:snapshot
```

This command will:
1. Create auth seed (family + users)
2. Import snapshot data
3. Mark connections as `DEMO_MODE`

### Demo Mode Connection Behavior

```typescript
// BankConnection status enum addition
enum ConnectionStatus {
  ACTIVE,
  INACTIVE,
  ERROR,
  DEMO_MODE  // NEW - indicates seeded/non-functional connection
}

// UI behavior for DEMO_MODE:
// - Hide "Sync" and "Refresh" buttons
// - Show "Demo Data" badge
// - Disable reconnection flow
// - All read operations work normally
```

### Directory Structure

```
apps/backend/src/database/seeds/
├── index.ts              # Main seed (auth only)
├── auth-seed.ts          # Minimal auth seed logic
├── demo-seed.ts          # Full demo data (for screenshots/demos)
├── snapshot-seed.ts      # Snapshot restoration logic
└── snapshots/
    └── default.json      # Default snapshot file
```

## Consequences

### Positive

- Fast dev startup for transaction/analytics work
- Real data structure from actual SaltEdge responses
- Clear separation of concerns (auth vs data)
- No API errors from fake connections (demo mode disables sync)
- Predictable test data across team members

### Negative

- Need to re-snapshot if schema changes significantly
- Sync features disabled in demo mode (acceptable tradeoff)
- Snapshot files may contain stale data patterns

### Neutral

- Developers choose their workflow:
  - Real SaltEdge: `db:seed` (auth only) + manual connection
  - Fast startup: `db:seed:snapshot` (includes demo data)

## Implementation Checklist

When implementing this ADR:

- [ ] Refactor current seed to `auth-seed.ts` (minimal)
- [ ] Keep current full seed as `demo-seed.ts`
- [ ] Add `DEMO_MODE` to ConnectionStatus enum
- [ ] Create snapshot export command
- [ ] Create snapshot import command
- [ ] Update UI to handle DEMO_MODE connections
- [ ] Add "Demo Data" badge component
- [ ] Update package.json scripts
- [ ] Document in README

## Trigger Condition

Implement this when:
- SaltEdge integration is feature-complete and stable
- Team starts intensive work on transactions/analytics/budgets
- Repeated manual connection becomes friction

## Related

- SaltEdge integration documentation
- Database seed scripts
- Development environment setup
