# Phase 5: Tailwind CSS v4 Migration Plan

**Status**: Planning  
**Priority**: Medium  
**Estimated Effort**: 5-9 hours  
**Target Date**: TBD

---

## Executive Summary

Migrate MoneyWise web app from Tailwind CSS v3.3.6 to v4.1.17. Tailwind v4 introduces a CSS-first configuration approach, built-in PostCSS handling, and several breaking changes. This plan outlines the migration strategy, risk assessment, and implementation steps.

---

## Current State Inventory

### Dependencies
| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| `tailwindcss` | 3.3.6 | 4.1.17 | Major version upgrade |
| `@tailwindcss/postcss` | N/A | 4.1.17 | New PostCSS plugin package |
| `postcss` | 8.4.32 | 8.4.32 | No change (compatible) |
| `autoprefixer` | 10.4.22 | ❌ Remove | Now built into Tailwind v4 |
| `tailwindcss-animate` | 1.0.7 | ⚠️ Replace | Incompatible with v4 |
| `tailwind-merge` | 2.1.0 | 2.1.0 | Compatible |
| `clsx` | ✅ | ✅ | Compatible |

### Codebase Metrics
- **UI Components**: 6 shadcn-style components (~622 lines)
- **`cn()` utility calls**: 39 instances
- **`@apply` directives**: 0 (excellent!)
- **Radix UI primitives**: 8 packages (avatar, dialog, dropdown, icons, label, navigation, slot, toast)
- **CSS Variables**: 17 design tokens (light/dark theme)
- **Custom animations**: `accordion-down`, `accordion-up`, `fade-in` (via `tailwindcss-animate`)

---

## Breaking Changes & Migration Requirements

### Critical Changes

#### 1. **Plugin Incompatibility**
- **Issue**: `tailwindcss-animate@1.0.7` peer dependency requires `tailwindcss >=3.0.0`
- **Impact**: Plugin will not load with v4
- **Solution**: Migrate to `tailwind-animate@0.2.10` (v4-compatible fork)
  - Same API, same class names
  - Published by `@nrjdalal`, actively maintained
  - Alternative: `tw-animate-css@1.4.0` by `@wombosvideo`

#### 2. **Import Syntax**
```diff
- @tailwind base;
- @tailwind components;
- @tailwind utilities;
+ @import "tailwindcss";
```

#### 3. **PostCSS Configuration**
```diff
// postcss.config.cjs
module.exports = {
  plugins: {
-   'postcss-import': {},
-   tailwindcss: {},
-   autoprefixer: {},
+   '@tailwindcss/postcss': {},
  },
}
```

#### 4. **Config Migration**
- Move `tailwind.config.js` theme to CSS using `@theme` directive
- Container customization now uses `@utility` instead of config options

#### 5. **Utility Renames**
| Old (v3) | New (v4) | Usage Count | Auto-fixable |
|----------|----------|-------------|--------------|
| `shadow-sm` | `shadow-xs` | ~5-10 | ✅ Yes |
| `shadow` | `shadow-sm` | ~10-15 | ✅ Yes |
| `rounded-sm` | `rounded-xs` | ~3-5 | ✅ Yes |
| `rounded` | `rounded-sm` | ~8-12 | ✅ Yes |
| `outline-none` | `outline-hidden` | ~2-4 | ✅ Yes |
| `ring` (3px) | `ring-3` | ~1-2 | ⚠️ Review |

### Non-Breaking Changes
- Default border color changes from `gray-200` to `currentColor` (may need explicit colors)
- Ring default width 3px → 1px (specify `ring-3` where needed)
- Hover variant now requires `@media (hover: hover)` (better mobile UX)

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| **Visual regressions** | 🟡 Medium | Shadow/radius scale changes; thorough visual QA |
| **Animation breaking** | 🟡 Medium | Replace plugin with compatible fork |
| **Border color changes** | 🟢 Low | Add explicit colors where needed |
| **Build errors** | 🟢 Low | Upgrade tool handles most cases |
| **Browser support** | 🟢 Low | Safari 16.4+, Chrome 111+, Firefox 128+ (all met) |

---

## Migration Strategy

### Phase 5.1: Preparation (0.5 hours)
1. Create feature branch `feature/tailwind-v4`
2. Backup current working state
3. Document current visual state (screenshots)
4. Review upgrade tool capabilities

### Phase 5.2: Automated Migration (1 hour)
```bash
# In apps/web directory
npx @tailwindcss/upgrade@latest
```

**Expected Output**:
- `globals.css`: `@tailwind` → `@import "tailwindcss"`
- `postcss.config.cjs`: Updated to use `@tailwindcss/postcss`
- `package.json`: Dependencies updated
- `tailwind.config.js`: Migrated to CSS-first (partial)
- Template files: Utility renames applied

**Manual Review Required**:
- Container configuration
- Custom keyframes
- Plugin replacement

### Phase 5.3: Plugin Migration (1-2 hours)
```bash
# Remove incompatible plugin
pnpm remove tailwindcss-animate

# Install v4-compatible replacement
pnpm add -D tailwind-animate@^0.2.10
```

**Config Update**:
```diff
// tailwind.config.js or CSS
- plugins: [require("tailwindcss-animate")],
+ plugins: [require("tailwind-animate")],
```

**Validation**:
- Test all animation classes: `animate-in`, `animate-out`, `fade-in`, `slide-in-from-*`
- Verify accordion animations (`accordion-down`, `accordion-up`)
- Check Radix Dialog/Toast animations

### Phase 5.4: Container Migration (0.5 hours)
```css
/* apps/web/app/globals.css */
@import "tailwindcss";

@utility container {
  margin-inline: auto;
  padding-inline: 2rem;
  max-width: 1400px;
}
```

### Phase 5.5: Visual Regression Testing (1-2 hours)
- [ ] Homepage layout
- [ ] Dashboard cards (shadows, borders)
- [ ] Button styles (rings on focus)
- [ ] Input fields (borders, focus states)
- [ ] Modals/Dialogs (animations)
- [ ] Toast notifications
- [ ] Mobile responsive breakpoints
- [ ] Dark mode theme

### Phase 5.6: Edge Case Fixes (1-2 hours)
- Explicit border colors where `currentColor` doesn't work
- Ring width adjustments (`ring` → `ring-3`)
- Any gradient or transform issues

---

## Implementation Checklist

### Pre-Migration
- [ ] Create `feature/tailwind-v4` branch
- [ ] Document current state (screenshots)
- [ ] Review upgrade tool docs

### Migration
- [ ] Run `npx @tailwindcss/upgrade`
- [ ] Review automated changes
- [ ] Replace `tailwindcss-animate` with `tailwind-animate`
- [ ] Migrate container config to `@utility`
- [ ] Update `package.json` dependencies

### Testing
- [ ] Build passes (`pnpm run build`)
- [ ] Lint passes (`pnpm run lint`)
- [ ] All pages render correctly
- [ ] Animations work (accordion, dialogs, toasts)
- [ ] Dark mode works
- [ ] Mobile responsive

### Finalization
- [ ] Commit changes with detailed message
- [ ] Push to remote
- [ ] Create PR with before/after screenshots
- [ ] Request review
- [ ] Merge to main

---

## Rollback Plan

If critical issues arise:
1. Revert branch: `git reset --hard origin/main`
2. Stay on Tailwind v3.x until issues resolved
3. Document blockers for future attempt

---

## Success Criteria

✅ Build completes without errors  
✅ All visual components match v3 appearance  
✅ Animations work correctly  
✅ No console errors or warnings  
✅ Bundle size doesn't increase significantly  
✅ CI/CD pipeline passes

---

## Dependencies & Prerequisites

- **Requires**: ESLint 9 migration (Phase 4.9) complete ✅
- **Blocks**: None (can be done independently)
- **Follow-up**: Mobile app styling (separate effort)

---

## Resources

- [Tailwind v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [tailwind-animate GitHub](https://github.com/nrjdalal/tailwind-animate)
- [tw-animate-css Alternative](https://github.com/Wombosvideo/tw-animate-css)
- [Tailwind v4 Browser Requirements](https://tailwindcss.com/docs/upgrade-guide#browser-requirements)

---

## Notes

- The official upgrade tool handles ~80% of the migration automatically
- `tailwindcss-animate` is the only incompatible dependency (easy replacement available)
- Zero `@apply` usage makes migration cleaner
- CSS-first config is more aligned with v4 philosophy

---

**Last Updated**: 2025-12-01  
**Author**: GitHub Copilot  
**Status**: Ready for execution
