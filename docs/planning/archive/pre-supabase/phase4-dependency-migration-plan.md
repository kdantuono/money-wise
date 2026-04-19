# Phase 4: Technology Stack Audit & Dependency Migration Plan

> **Status**: Planning Complete | **Priority**: Post-MVP | **Effort**: 2-3 sprints
> **Created**: 2025-11-29 | **Last Updated**: 2025-11-29

## Executive Summary

Comprehensive dependency audit and migration strategy for MoneyWise, addressing deprecation warnings, security vulnerabilities, and long-term maintainability. This phase follows MVP completion (Phases 1-3) and focuses on technical debt reduction.

---

## 1. Current Stack Analysis

### 1.1 Core Framework Versions

| Framework | Current | Latest Stable | Status | Action |
|-----------|---------|---------------|--------|--------|
| **Next.js** | 15.4.7 | 15.x | ✅ Current | Monitor |
| **NestJS** | 10.0.0 | 10.x | ✅ Current | Monitor |
| **React** | 18.3.1 | 18.3.1 | ✅ Current | Monitor |
| **TypeScript** | 5.1.3-5.3.3 | 5.7.x | 🟡 Fragmented | Standardize |
| **Prisma** | 6.18.0 | 6.x | ✅ Current | Monitor |
| **Node.js** | >=18.0.0 | 22.x LTS | 🟡 Upgrade path | Plan for 20.x |

### 1.2 Build Tooling Versions

| Tool | Current | Latest | Risk Level | Notes |
|------|---------|--------|------------|-------|
| **Vite** | 5.4.21 (pinned) | 6.x | 🟡 CJS Deprecated | ESM migration needed |
| **Vitest** | 1.0.4 | 2.x | 🟡 Major update | Coordinate with Vite |
| **Turbo** | 1.11.2 | 2.x | 🟢 Stable | Optional upgrade |
| **pnpm** | 8.15.1 | 9.x | 🟢 Stable | Optional upgrade |

### 1.3 Identified Issues from Dashboard Implementation

```
❌ The CJS build of Vite's Node API is deprecated
❌ baseline-browser-mapping data is over two months old
⚠️ React act() warning in tests (test configuration issue)
```

---

## 2. Dependency Risk Assessment

### 2.1 🔴 CRITICAL - Requires Immediate Action

| Package | Current | Status | Impact | Migration Path |
|---------|---------|--------|--------|----------------|
| **react-query** | 3.39.3 | EOL/Deprecated | High | Migrate to `@tanstack/react-query` v5 |
| **@radix-ui/react-form** | 0.0.3 | Alpha | Medium | Avoid heavy usage, monitor for stable |

**react-query Migration Details:**
- Package renamed from `react-query` to [`@tanstack/react-query`](https://www.npmjs.com/package/@tanstack/react-query)
- v3 → v4: Query keys must be Arrays (was String or Array)
- v4 → v5: QueryClient API changes, suspense defaults
- [Official Migration Guide v3→v4](https://tanstack.com/query/v4/docs/framework/react/guides/migrating-to-react-query-4)
- Codemod available: `npx jscodeshift -t ./transforms/query-keys.js`

### 2.2 🟡 MODERATE - Scheduled Migration

| Package | Current | Target | Breaking Changes | Effort |
|---------|---------|--------|------------------|--------|
| **Vite** | 5.4.21 | 6.x → 7.x | ESM-only in v7, CJS deprecated in v5/v6 | Medium |
| **Vitest** | 1.0.4 | 2.x | Config structure changes | Medium |
| **TypeScript** | 5.1-5.3 mixed | 5.3.3 unified | None (patch alignment) | Low |
| **@types/node** | 20.3-24.6 mixed | 20.9.0 unified | None (type definitions) | Low |
| **Tailwind CSS** | 3.3.2-3.3.6 mixed | 3.4.x | Minor utility changes | Low |

### 2.3 🟢 SAFE - Patch/Minor Updates

| Category | Packages | Action |
|----------|----------|--------|
| **Sentry** | All @sentry/* | ✅ Already at 10.27.0 |
| **Testing Library** | @testing-library/* | Update to latest patch |
| **Radix UI** | @radix-ui/react-* | Update to latest minor |
| **Lucide Icons** | lucide-react | Update to latest |
| **Date Utils** | date-fns | Update to v3.x when ready |

---

## 3. Security Vulnerabilities

### 3.1 Current pnpm Overrides (Security Patches)

```json
{
  "overrides": {
    "ip": "npm:@webpod/ip@^0.6.1",      // IP validation vulnerability
    "semver": "^7.6.3",                  // ReDoS vulnerability
    "esbuild": ">=0.25.0",               // Build tool security
    "webpack-dev-server": "^5.2.1",      // Dev server security
    "validator": "^13.15.20",            // Input validation
    "send": "^0.19.0",                   // Static file serving
    "tmp": "^0.2.4",                     // Temp file handling
    "vite": "~5.4.21"                    // Pinned for stability
  }
}
```

### 3.2 npm Audit Recommendations

Run before migration:
```bash
pnpm audit --fix
pnpm audit --audit-level=moderate
```

### 3.3 npm Token Migration (Required by Dec 9, 2025)
> ⚠️ npm classic token creation is now disabled. Migrate to trusted publishing or granular access tokens.

---

## 4. Migration Sequence

### Phase 4.1: Quick Wins (1-2 days)

**Objective**: Fix immediate warnings without breaking changes

| Task | File Changes | Risk |
|------|--------------|------|
| Rename vitest.config.ts → vitest.config.mts | 1 file | 🟢 None |
| Update baseline-browser-mapping | `pnpm update` | 🟢 None |
| Fix React act() warnings in tests | Test files | 🟢 None |
| Standardize TypeScript to 5.3.3 | All package.json | 🟢 None |
| Standardize @types/node to 20.9.0 | All package.json | 🟢 None |

**Commands:**
```bash
# Fix Vite ESM warning
mv apps/web/vitest.config.ts apps/web/vitest.config.mts

# Update browser mapping
pnpm add -D baseline-browser-mapping@latest --filter @money-wise/web

# Standardize TypeScript
pnpm add -D typescript@5.3.3 -w
```

### Phase 4.2: react-query → TanStack Query (3-5 days)

**Objective**: Migrate from deprecated react-query v3 to @tanstack/react-query v5

**Affected Files:**
- `apps/web/package.json`
- `apps/web/src/hooks/useDashboardStats.ts` (new in Dashboard stream)
- All components using `useQuery`, `useMutation`
- `QueryClientProvider` setup

**Migration Steps:**
1. Install new packages:
   ```bash
   pnpm remove react-query --filter @money-wise/web
   pnpm add @tanstack/react-query @tanstack/react-query-devtools --filter @money-wise/web
   ```

2. Run codemod:
   ```bash
   npx jscodeshift --extensions=ts,tsx --transform=./node_modules/@tanstack/react-query/codemods/v4/replace-import.js ./apps/web/src
   ```

3. Update QueryClient initialization:
   ```typescript
   // Before (v3)
   const queryClient = new QueryClient()

   // After (v5)
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 5 * 60 * 1000,
         gcTime: 10 * 60 * 1000, // renamed from cacheTime
       },
     },
   })
   ```

4. Update query key format:
   ```typescript
   // Before (v3)
   useQuery('dashboard-stats', fetchStats)

   // After (v5)
   useQuery({
     queryKey: ['dashboard-stats'],
     queryFn: fetchStats,
   })
   ```

**Rollback Strategy:**
- Keep react-query v3 in a separate branch until migration verified
- Feature flag to toggle between implementations if needed

### Phase 4.3: Vite ESM Migration (2-3 days)

**Objective**: Prepare for Vite 7.x ESM-only future

**Step 1: Config File Migration**
```bash
# Rename config files to ESM
mv apps/web/vitest.config.ts apps/web/vitest.config.mts
```

**Step 2: Upgrade Vite (when ready)**
```bash
# Remove override, upgrade to latest
pnpm remove vite --filter @money-wise/web
pnpm add -D vite@latest --filter @money-wise/web
```

**Step 3: Update vite-tsconfig-paths if needed**
```bash
pnpm add -D vite-tsconfig-paths@latest --filter @money-wise/web
```

**Breaking Changes to Handle:**
- `strictRequires` defaults to `true` in v6
- JSON handling changes (new `json.stringify: 'auto'`)
- PostCSS config loading requires `tsx` or `jiti`

### Phase 4.4: Coordinated Testing Updates (2-3 days)

**Objective**: Align testing stack across monorepo

| Package | Current | Target | Scope |
|---------|---------|--------|-------|
| Vitest | 1.0.4 | 2.x | web |
| @vitest/ui | 1.0.4 | 2.x | web |
| @vitest/coverage-v8 | 1.0.4 | 2.x | web |
| Jest | 29.7.0 | 29.7.0 | backend, types, utils |
| ts-jest | 29.1.1-29.4.4 | 29.4.4 | all |

**Note**: Don't mix Jest and Vitest versions in the same test run.

---

## 5. Deliverables

### 5.1 DEPENDENCY_AUDIT.md (Template)

```markdown
# MoneyWise Dependency Audit Report
Generated: [DATE]

## Summary
- Total Dependencies: 150+
- Critical Issues: 2
- Moderate Issues: 5
- Low Risk Updates: 20+

## Critical Issues
[Detailed findings...]

## Security Vulnerabilities
[npm audit results...]

## Version Matrix
[Full version comparison table...]
```

### 5.2 MIGRATION_PLAN.md (Template)

```markdown
# MoneyWise Dependency Migration Plan
Version: 1.0 | Target Completion: [DATE]

## Phase 1: Quick Wins
- [ ] ESM config migration
- [ ] TypeScript standardization
- [ ] Browser mapping update

## Phase 2: react-query Migration
- [ ] Install @tanstack/react-query
- [ ] Run codemods
- [ ] Update QueryClient
- [ ] Update all hooks
- [ ] Remove react-query v3

## Phase 3: Build Tool Updates
- [ ] Vite upgrade
- [ ] Vitest upgrade
- [ ] Verify all tests pass

## Rollback Procedures
[Step-by-step rollback for each phase...]
```

### 5.3 Updated Lock Files

After migration:
```bash
pnpm install --frozen-lockfile  # Verify lock file integrity
pnpm dedupe                      # Remove duplicate packages
pnpm audit                       # Verify no new vulnerabilities
```

---

## 6. Acceptance Criteria

- [ ] All deprecation warnings resolved
- [ ] Zero high/critical npm audit vulnerabilities
- [ ] All tests passing (unit, integration, E2E)
- [ ] TypeScript version unified across monorepo
- [ ] react-query migrated to @tanstack/react-query v5
- [ ] Vite ESM configuration complete
- [ ] DEPENDENCY_AUDIT.md delivered
- [ ] MIGRATION_PLAN.md delivered
- [ ] Lock files updated and committed

---

## 7. Risk Mitigation

### 7.1 Testing Strategy

```bash
# Before each migration step
pnpm test:unit
pnpm test:integration
pnpm build

# After migration
pnpm test:e2e
```

### 7.2 Rollback Checkpoints

| Checkpoint | Git Tag | Restore Command |
|------------|---------|-----------------|
| Pre-Phase 4.1 | `pre-dep-migration` | `git checkout pre-dep-migration` |
| Post Quick Wins | `phase4.1-complete` | `git checkout phase4.1-complete` |
| Post react-query | `phase4.2-complete` | `git checkout phase4.2-complete` |
| Post Vite ESM | `phase4.3-complete` | `git checkout phase4.3-complete` |

### 7.3 Feature Flags (Optional)

```typescript
// config/features.ts
export const FEATURES = {
  USE_TANSTACK_QUERY: process.env.USE_TANSTACK_QUERY === 'true',
};
```

---

## 8. Timeline & Resources

### Estimated Effort

| Phase | Days | Complexity | Dependencies |
|-------|------|------------|--------------|
| 4.1 Quick Wins | 1-2 | Low | None |
| 4.2 react-query | 3-5 | Medium | Phase 4.1 |
| 4.3 Vite ESM | 2-3 | Medium | Phase 4.1 |
| 4.4 Testing Stack | 2-3 | Medium | Phase 4.3 |
| Documentation | 1-2 | Low | All phases |
| **Total** | **9-15 days** | | |

### Recommended Execution

```
Week 1: Phase 4.1 (Quick Wins) + Phase 4.2 Start
Week 2: Phase 4.2 Complete + Phase 4.3 Start
Week 3: Phase 4.3 Complete + Phase 4.4 + Documentation
```

---

## 9. References

### Official Documentation
- [Vite CJS Deprecation Guide](https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated)
- [Vite v5 to v6 Migration](https://v6.vite.dev/guide/migration)
- [TanStack Query v4 Migration](https://tanstack.com/query/v4/docs/framework/react/guides/migrating-to-react-query-4)
- [@tanstack/react-query npm](https://www.npmjs.com/package/@tanstack/react-query)

### Security Resources
- [npm Security Advisory](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [Socket.dev Package Analysis](https://socket.dev/npm/package/@tanstack/react-query)

### Discussion Threads
- [React Query v3 to v4 Migration Discussion](https://github.com/TanStack/query/discussions/3273)
- [Stack Overflow: TanStack vs react-query](https://stackoverflow.com/questions/73664195/what-is-difference-between-tanstack-react-query-and-react-query)

---

## 10. Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Deprecation warnings | 3+ | 0 | Build output |
| npm audit high/critical | Unknown | 0 | `pnpm audit` |
| TypeScript versions | 3 | 1 | package.json |
| @types/node versions | 5+ | 1 | package.json |
| Test suite pass rate | 100% | 100% | CI/CD |
| Build time | Baseline | ≤ Baseline | CI metrics |

---

*Document generated as part of MoneyWise MVP Phase 4 planning.*
