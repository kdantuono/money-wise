# GitHub Pages Branch Setup for Benchmarks

## Purpose
The `gh-pages` branch is used by `benchmark-action/github-action-benchmark@v1` to store historical performance benchmark data.

## Issue
The benchmark action was failing with:
```
fatal: couldn't find remote ref gh-pages
```

## Solution

### Option 1: Create gh-pages Branch Manually

```bash
# Clone the repository
git clone https://github.com/kdantuono/money-wise.git
cd money-wise

# Create orphan gh-pages branch
git checkout --orphan gh-pages

# Remove all files
git rm -rf .

# Create README
cat > README.md << 'EOF'
# Benchmark Data Storage

This branch stores performance benchmark data for github-action-benchmark.

The benchmark action uses this branch to:
- Store historical performance metrics
- Track performance trends over time
- Alert on performance regressions

## Usage

This branch is automatically managed by the CI/CD pipeline. Do not make manual changes.
EOF

# Commit and push
git add README.md
git commit -m "Initialize gh-pages branch for benchmark storage"
git push origin gh-pages
```

### Option 2: Skip gh-pages Requirement (Temporary Solution - IMPLEMENTED)

If you don't need historical benchmark data comparison, you can skip the gh-pages fetch by adding `skip-fetch-gh-pages: true` to the workflow:

```yaml
- name: Store benchmark results
  uses: benchmark-action/github-action-benchmark@v1
  with:
    tool: 'customBiggerIsBetter'
    output-file-path: apps/backend/performance-results.json
    github-token: ${{ secrets.GITHUB_TOKEN }}
    auto-push: false
    skip-fetch-gh-pages: true  # Skip gh-pages requirement
    comment-on-alert: true
    alert-threshold: '110%'
    fail-on-alert: false
```

**Note**: This disables historical comparison and trending, but allows the pipeline to pass.

## Current Implementation

The workflow has been updated to use `skip-fetch-gh-pages: true` as a temporary solution. This allows the benchmark job to complete successfully without requiring the gh-pages branch.

To enable full benchmark functionality with historical data:
1. Create the gh-pages branch using Option 1 above
2. Remove the `skip-fetch-gh-pages: true` line from `.github/workflows/quality-gates.yml`
3. Update `auto-push: true` to automatically save benchmark data to gh-pages

## Performance Results Format

The benchmark action expects JSON in the following format for `customBiggerIsBetter` tool:

```json
[
  {
    "name": "Test Name",
    "unit": "ops/sec",
    "value": 1000
  }
]
```

The workflow has been updated to generate this format when performance tests are skipped.
