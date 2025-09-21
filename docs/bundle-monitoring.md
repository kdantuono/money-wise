# Bundle Size Monitoring Guide

## Overview

MoneyWise MVP implements comprehensive bundle size monitoring to prevent performance regressions and maintain optimal load times.

## Quick Commands

```bash
# Analyze web application bundle with visual output
npm run analyze:web

# Check bundle sizes against limits
npm run size-check

# Analyze why bundles are large
npm run size-why

# Generate dependency analysis
npm run analyze:deps
```

## Bundle Analysis

### Visual Bundle Analysis

```bash
# Start with analysis enabled
npm run analyze:web
```

This will:
1. Build the web application
2. Generate detailed bundle analysis
3. Open interactive visualization in browser
4. Show tree-shaking opportunities

### Size Limit Checks

Current performance budgets:
- **Main App Bundle**: 250 KB (gzipped)
- **Index Page**: 50 KB (gzipped)
- **Dashboard Page**: 100 KB (gzipped)

### Understanding Results

**Bundle Composition**:
- `_app.js` - Main application framework and shared dependencies
- `index.js` - Landing page specific code
- `dashboard.js` - Dashboard page specific code
- `chunks/` - Shared code split across pages

## Performance Budgets

### Current Targets

| Bundle Type | Size Limit | Current Status |
|-------------|------------|----------------|
| Main Bundle | 250 KB     | 🔍 Monitoring  |
| Page Bundles| 50-100 KB  | 🔍 Monitoring  |
| CSS Bundle  | 30 KB      | 🔍 Monitoring  |

### Threshold Levels

- 🟢 **Green**: <80% of budget (optimal)
- 🟡 **Yellow**: 80-95% of budget (attention needed)
- 🔴 **Red**: >95% of budget (action required)
- 🚨 **Critical**: Over budget (blocks deployment)

## CI/CD Integration

### Automated Checks

Every pull request automatically:
1. ✅ Analyzes bundle size changes
2. ✅ Compares against performance budgets
3. ✅ Comments on PR with size impact
4. ✅ Blocks merge if over budget

### Manual Override

For exceptional cases:
```bash
# Skip size check (use sparingly)
git commit -m "feat: critical feature [skip-size-check]"
```

## Optimization Guidelines

### Bundle Splitting Best Practices

1. **Dynamic Imports for Large Components**
   ```javascript
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     loading: () => <div>Loading...</div>
   });
   ```

2. **Route-Based Code Splitting**
   ```javascript
   // Automatic with Next.js pages/
   pages/
     dashboard/
       index.js    // Split automatically
       analytics.js // Split automatically
   ```

3. **Library Chunking**
   ```javascript
   // Separate vendor chunks automatically handled
   // Large libraries automatically split
   ```

### Common Issues & Solutions

**Issue**: Large main bundle
```bash
# Identify heavy dependencies
npm run size-why

# Solution: Dynamic imports for heavy features
const ChartLibrary = dynamic(() => import('recharts'));
```

**Issue**: Duplicate dependencies
```bash
# Check for duplicates
npm ls --depth=0

# Solution: Add to bundler optimization
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  }
}
```

**Issue**: CSS bloat
```bash
# Purge unused CSS
npm install @tailwindcss/typography

# Configure purging in tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  // ... rest of config
}
```

## Monitoring & Alerts

### Real-time Monitoring

- **PR Comments**: Automatic size impact analysis
- **GitHub Actions**: Continuous monitoring
- **Local Development**: Run checks before commits

### Historical Tracking

```bash
# Track size changes over time
npm run analyze:deps > bundle-analysis/$(date +%Y-%m-%d).json

# Compare with previous builds
npm run size-check --json > current-sizes.json
```

## Troubleshooting

### Common Commands

```bash
# Full clean and rebuild
npm run reset && npm run build:web

# Detailed bundle analysis
ANALYZE=true npm run build:web

# Check specific file sizes
ls -la apps/web/.next/static/chunks/pages/

# Memory issues during build
NODE_OPTIONS="--max-old-space-size=4096" npm run build:web
```

### Bundle Analysis Issues

**Problem**: Analysis fails to start
```bash
# Solution: Clear .next directory
rm -rf apps/web/.next
npm run build:web
```

**Problem**: Memory errors during analysis
```bash
# Solution: Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=8192" npm run analyze:web
```

**Problem**: Size limits too strict/loose
```bash
# Solution: Update size-limit config in package.json
"size-limit": [
  {
    "name": "Bundle Name",
    "path": "path/to/bundle",
    "limit": "NEW_LIMIT KB"
  }
]
```

## Performance Impact

### Target Metrics

- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Time to Interactive**: <3.0s
- **Total Blocking Time**: <100ms

### Bundle Size vs Performance

| Bundle Size | Load Time (3G) | Performance Grade |
|-------------|----------------|-------------------|
| <300 KB     | <2s           | A+ Excellent      |
| 300-500 KB  | 2-3s          | A Good            |
| 500-750 KB  | 3-4s          | B Fair            |
| >750 KB     | >4s           | C Poor            |

## Best Practices

### Development Workflow

1. **Before Major Changes**: Run `npm run size-check`
2. **During Development**: Use `npm run dev` (optimized)
3. **Before Commit**: Run `npm run analyze:web` for large features
4. **PR Review**: Check automated size comments

### Code Review Guidelines

- ✅ Review bundle size impact in PR comments
- ✅ Question large dependency additions
- ✅ Suggest dynamic imports for heavy components
- ✅ Verify tree-shaking effectiveness

### Continuous Optimization

- 🔄 Monthly bundle analysis reviews
- 🔄 Quarterly performance budget adjustments
- 🔄 Regular dependency audit and updates
- 🔄 Performance monitoring integration

---

**Goal**: Maintain fast, performant application through proactive bundle size monitoring and optimization.