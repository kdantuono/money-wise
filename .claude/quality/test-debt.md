# Test Technical Debt Tracking

**Created**: December 3, 2025
**Purpose**: Track packages requiring test coverage and enforce accountability

---

## Overview

This document tracks packages that currently lack proper test coverage. These have been explicitly excluded from the global `passWithNoTests: false` enforcement to prevent CI failures while debt is being addressed.

---

## Package Status

| Priority | Package | Status | Reason | Action Required | Effort |
|----------|---------|--------|--------|-----------------|--------|
| **Skip** | `@money-wise/types` | Intentional Skip | Pure TypeScript types, no runtime logic | None - types are validated by tsc | N/A |
| **P2** | `@money-wise/utils` | Empty Placeholder | Package exists but has no code yet | Add tests when code is added | TBD |
| **P1** | `@money-wise/ui` | Needs Tests | Has UI components without tests | Write component tests | ~3 days |

---

## Detailed Analysis

### `@money-wise/types`

**Status**: Intentional Skip - No Tests Needed

```
packages/types/src/
└── index.ts (TypeScript interfaces and types only)
```

**Rationale**: This package contains only TypeScript type definitions. Types are:
- Validated at compile time by TypeScript
- Have no runtime behavior to test
- Cannot be executed (pure type erasure)

**Decision**: Permanent skip. No tests will ever be needed for pure type definitions.

---

### `@money-wise/utils`

**Status**: Empty Placeholder - Defer Until Code Added

```
packages/utils/src/
└── index.ts (export {})  // Empty placeholder
```

**Current State**: The package exists for future utility functions but currently contains no code.

**When to Add Tests**:
- When financial calculation helpers are added (currency formatting, etc.)
- When date manipulation utilities are added
- When validation helpers are added

**Test Requirements When Code is Added**:
- 100% coverage for any financial calculations (money handling = critical)
- Edge case coverage for boundary conditions
- Input validation tests

---

### `@money-wise/ui`

**Status**: P1 Priority - Tests Required

```
packages/ui/src/
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── ... (Radix-based components)
└── index.ts
```

**What Needs Testing**:
- Component rendering (snapshot or structural)
- User interactions (click handlers, form inputs)
- Accessibility compliance (ARIA attributes)
- Style variant coverage

**Test Stack**:
- Jest + React Testing Library (already configured in devDependencies)
- @testing-library/jest-dom for assertions
- @testing-library/user-event for interactions

**Estimated Effort**: 3 days for initial coverage

---

## Progress Tracking

### Completed
- [x] Identified all packages without tests (Dec 3, 2025)
- [x] Classified each package by priority
- [x] Created explicit skip scripts for CI compliance

### In Progress
- [ ] None currently

### Backlog
- [ ] Write UI component tests when P1 is prioritized
- [ ] Add utils tests when code is added to the package

---

## Enforcement Mechanism

The following changes ensure no silent test failures:

1. **Base Config**: `jest.config.base.js` has `passWithNoTests: false`
2. **Package Scripts**: Each package has explicit handling:
   - `types`: Echo skip message + exit 0
   - `utils`: Echo skip message + exit 0 (until code added)
   - `ui`: Echo debt tracking message + exit 0 (until P1 addressed)

---

## Review Schedule

| Date | Action |
|------|--------|
| +2 weeks | Review if utils has code → add tests |
| +4 weeks | Start P1: UI component tests |
| +6 weeks | Target 80% coverage across all testable packages |

---

## Contact

For questions about test debt prioritization, see:
- `.claude/context/hotfix-tech-debt-phase4-analysis.md`
- `docs/planning/phase4.5-major-version-upgrades.md`
