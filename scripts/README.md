# MoneyWise Scripts Directory

This directory contains development and operational scripts organized by category for better maintainability.

## Directory Structure

```
scripts/
├── dev/           # Development utilities
├── ci/            # Continuous Integration scripts
├── testing/       # Test-related scripts
├── monitoring/    # Monitoring and logging scripts
└── README.md      # This file
```

## Categories

### 📚 Development (`dev/`)
Scripts for local development and database management:
- `health-check.sh` - Health check for services
- `reset-db.sh` - Reset database to clean state
- `seed-data.sh` - Seed database with sample data
- `setup.sh` - Initial project setup

### 🔄 Continuous Integration (`ci/`)
Scripts used in CI/CD pipelines:
- `docs-validate.js` - Validate documentation

### 🧪 Testing (`testing/`)
Scripts for test execution and reporting:
- `coverage-report.js` - Generate test coverage reports

### 📊 Monitoring (`monitoring/`)
Scripts for monitoring and alerting:
- `test-sentry-integration.ts` - Test Sentry error reporting

## Usage

All scripts should be executable and include proper error handling and help text.

### Running Scripts

```bash
# Development scripts
make health      # Run health check
make db-reset    # Reset database
make db-seed     # Seed database

# Or directly
./scripts/dev/health-check.sh
./scripts/dev/reset-db.sh
```

### Adding New Scripts

1. Choose the appropriate category directory
2. Add the script with proper shebang and documentation
3. Make it executable: `chmod +x script-name.sh`
4. Update this README if adding a new category

## Best Practices

- ✅ Use descriptive names
- ✅ Include help text (`--help` flag)
- ✅ Add error handling
- ✅ Use consistent exit codes
- ✅ Document dependencies
- ❌ Don't put scripts in root `/scripts` directory