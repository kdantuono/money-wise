# Bundle Analysis Guide

This guide explains how to analyze and optimize the Next.js bundle size for the MoneyWise web application.

## Quick Start

To analyze the bundle size, run:

```bash
pnpm run analyze
```

This will:
1. Build the Next.js application with the `ANALYZE=true` flag
2. Generate interactive HTML reports showing bundle composition
3. Open the reports in your default browser

## Understanding the Reports

The bundle analyzer generates two reports:

### 1. Client Bundle Analysis
- **File**: `.next/analyze/client.html`
- **Shows**: What gets sent to the browser
- **Focus on**: Large dependencies, duplicate code, unnecessary imports

### 2. Server Bundle Analysis  
- **File**: `.next/analyze/server.html`
- **Shows**: Server-side rendering bundle
- **Focus on**: API route dependencies, server utilities

## Optimization Strategies

### 1. Identify Large Dependencies
Look for:
- Large npm packages that could be replaced with lighter alternatives
- Unused portions of libraries (use tree-shaking)
- Duplicate dependencies (check for version conflicts)

### 2. Code Splitting
Implement dynamic imports for:
- Heavy components (charts, editors, etc.)
- Route-specific code
- Third-party widgets

Example:
```typescript
// Before
import HeavyChart from '@/components/HeavyChart';

// After - lazy load
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <Spinner />,
});
```

### 3. Check for Common Issues
- **Moment.js**: Replace with `date-fns` (smaller, tree-shakeable)
- **Lodash**: Import specific functions: `import debounce from 'lodash/debounce'`
- **Icons**: Use icon tree-shaking from `lucide-react`
- **Polyfills**: Remove unnecessary polyfills for modern browsers

### 4. Bundle Size Limits

The CI/CD pipeline enforces bundle size limits:
- **Total bundle**: < 50 MB (only `.next/static` and `.next/server`)
- **Individual chunks**: Aim for < 250 KB per chunk
- **First Load JS**: Keep under 100 KB for good performance

## CI/CD Integration

The bundle size is automatically checked in the quality gates workflow:

```yaml
# .github/workflows/quality-gates.yml
- name: Check bundle size
  run: |
    cd apps/web
    BUNDLE_SIZE=$(du -sb .next/static .next/server 2>/dev/null | awk '{sum+=$1} END {print sum}')
    # Fails if > 50 MB
```

**Note**: CI/CD uses a simple size check for speed. The bundle analyzer is for **development debugging only**.

## Best Practices

### When to Run Analysis
- ✅ Before adding a new large dependency
- ✅ When optimizing performance
- ✅ During code reviews for major features
- ✅ When bundle size limits are exceeded in CI/CD

### When NOT to Run
- ❌ In CI/CD pipelines (too slow, use `du -sb` instead)
- ❌ For every build (only when debugging)
- ❌ In production deployments

### Tips for Better Analysis
1. **Compare changes**: Run analyzer before and after optimizations
2. **Focus on client bundle**: Server bundle doesn't affect page load
3. **Check First Load JS**: This impacts Time to Interactive (TTI)
4. **Look for patterns**: Multiple similar chunks might indicate splitting issues

## Troubleshooting

### Analyzer doesn't open automatically
Manually open the HTML files:
```bash
open apps/web/.next/analyze/client.html
open apps/web/.next/analyze/server.html
```

### Build fails with ANALYZE=true
Make sure dependencies are installed:
```bash
pnpm install
```

### Large server bundle but small client bundle
This is usually fine - server bundles don't affect user experience.

## Further Reading

- [Next.js Bundle Analysis](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer)
- [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Next.js Performance Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)
