# Feature: Critical ESLint Warnings Resolution

## Date: 2025-09-21

## Author: Claude Code + User

### F1: BEFORE Implementation - Planning Document

### Requirements

- [ ] Fix all unused variable ESLint warnings (@typescript-eslint/no-unused-vars)
- [ ] Refactor syncTransactions method complexity (35 → ≤15)
- [ ] Address file length violation in plaid.service.spec.ts (553 lines → ≤500)
- [ ] Maintain code functionality while improving maintainability
- [ ] Follow MVP development standards

### Technical Approach

#### Critical Warnings Identified:
1. **Unused Variables** (8 warnings):
   - banking/plaid.service.spec.ts: 5 unused repository/service declarations
   - banking/plaid.service.ts: 3 unused parameter variables
   - security/security.service.ts: 1 unused userAgent variable

2. **Complexity Issues** (4 warnings):
   - syncTransactions method: complexity 35 (max: 15)
   - syncTransactions method: 140 lines (max: 100)
   - plaid.service.spec.ts: 553 lines (max: 500)

#### Implementation Strategy:

1. **Unused Variables**:
   - Remove unnecessary variable declarations in tests
   - Prefix intentionally unused parameters with underscore (_param)
   - Maintain API compatibility

2. **Method Complexity Refactoring**:
   - Extract helper methods from syncTransactions
   - Separate concerns: data processing, validation, database operations
   - Maintain existing public API contract

3. **File Length**:
   - Split large test file into focused test suites
   - Group related tests by functionality

### Success Criteria

- [ ] Zero ESLint unused variable warnings
- [ ] syncTransactions complexity ≤ 15
- [ ] All test files ≤ 500 lines
- [ ] No functional regressions
- [ ] All existing tests pass
- [ ] Build and type-check successful

### Risk Mitigation

- **API Breaking**: Maintain all public method signatures
- **Test Coverage**: Ensure no test logic is lost during file splits
- **Complexity Reduction**: Extract methods with clear, testable interfaces
- **Rollback Plan**: Atomic commits per fix for easy reversion

### Git Workflow

Branch: `fix/critical-eslint-warnings`
Commit Strategy: Atomic commits per warning type fixed

### Estimated Timeline

- Unused variables: 30 minutes
- Method complexity: 1 hour
- File length: 30 minutes
- Testing & validation: 30 minutes

**Total: ~2.5 hours**