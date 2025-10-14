# Bundle Analyzer Setup

The `@next/bundle-analyzer` plugin has been configured to help analyze and optimize bundle sizes during development.

## Usage

Run bundle analysis:
```bash
pnpm run analyze
```

This will build the app and automatically open interactive HTML reports in your browser showing:
- Client bundle composition (what users download)
- Server bundle composition (SSR code)
- Individual chunk sizes
- Dependency relationships

## Reports Location

Reports are generated at:
- `.next/analyze/client.html` - Client-side bundle
- `.next/analyze/server.html` - Server-side bundle

## Documentation

See [docs/bundle-analysis.md](./docs/bundle-analysis.md) for:
- Detailed usage instructions
- Optimization strategies
- Best practices
- Troubleshooting

## CI/CD Integration

**Note**: The bundle analyzer is for **development use only**. CI/CD continues to use the simple `du -sb` approach for fast, reliable bundle size checks. This is intentional to keep the pipeline fast.

## Configuration

The analyzer is configured in `next.config.mjs`:
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
```

It only runs when `ANALYZE=true` is set, so it doesn't affect normal builds.
