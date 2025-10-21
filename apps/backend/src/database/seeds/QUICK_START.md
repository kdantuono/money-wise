# Quick Start: Database Seeding

Get started with seeded demo data in 5 minutes.

## TL;DR

```bash
# From moneywise root
docker-compose -f docker-compose.dev.yml up -d
cd apps/backend
pnpm db:seed

# Login credentials
# Email: john.smith@demo.moneywise.app
# Password: demo123
```

## Step-by-Step

### 1️⃣ Start Database (30 seconds)

```bash
# From repository root
docker-compose -f docker-compose.dev.yml up -d

# Verify running
docker-compose ps | grep postgres
```

### 2️⃣ Run Seed Script (1-2 minutes)

```bash
# From apps/backend
cd apps/backend
pnpm db:seed
```

### 3️⃣ Start Development Server

```bash
# From repository root
pnpm dev
```

Open http://localhost:3000 and login with demo credentials.

## Demo Credentials

| Field | Value |
|-------|-------|
| Email | john.smith@demo.moneywise.app |
| Password | demo123 |
| Role | Admin |

### Additional User

| Field | Value |
|-------|-------|
| Email | emma.smith@demo.moneywise.app |
| Password | demo123 |
| Role | Member |

## Demo Data Summary

| Entity | Count | Details |
|--------|-------|---------|
| Family | 1 | Smith Family |
| Users | 2 | Admin + Member |
| Accounts | 4 | Checking, Savings, CC, Investment |
| Categories | 20 | Income, Expense, Transfer |
| Transactions | 100 | 3-month history |
| Budgets | 3 | Groceries, Gas, Entertainment |

### Account Balances

| Account | Balance |
|---------|---------|
| Chase Checking | $5,432.50 |
| Chase Savings | $12,850.00 |
| Chase Freedom Unlimited | -$842.35 |
| Vanguard 401(k) | $87,500.00 |

## Common Tasks

### View Seeded Data

```bash
pnpm prisma:studio
```

Opens http://localhost:5555

### Reset and Reseed

```bash
pnpm prisma:reset
```

### Reseed Only

```bash
# Clears seed data and recreates it
pnpm db:seed
```

### Check Database Connection

```bash
# Verify Prisma client
pnpm prisma:validate

# Test connection
pnpm prisma:studio
```

## Troubleshooting

### Database connection error

```bash
# Ensure database is running
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker-compose ps
```

### "Table does not exist"

```bash
# Apply migrations
pnpm db:migrate:dev

# Then seed
pnpm db:seed
```

### "Cannot find module 'generated/prisma'"

```bash
# Generate Prisma client
pnpm prisma:generate

# Then seed
pnpm db:seed
```

### Port already in use

```bash
# For port 5432 (PostgreSQL)
# Either stop the service using it or:
docker-compose down
docker-compose -f docker-compose.dev.yml up -d

# For port 3000 (Next.js)
# Kill the process: lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

## What's Seeded

### Realistic Transactions
- 6 salary deposits (biweekly)
- 12 grocery store visits
- 15 restaurant purchases
- 10 gas station charges
- 20+ coffee shop visits
- 37 subscription charges

**Date range:** Last 90 days

### Transaction Status
- 90% POSTED (cleared)
- 10% PENDING (recent)

### Categories
- 4 Income categories
- 14 Expense categories
- 2 Transfer categories

### Budgets Active This Month
- Groceries: $800 budget
- Gas: $400 budget  
- Entertainment: $300 budget

## Next Steps

1. **Explore dashboard:** View accounts and transactions
2. **Check budgets:** See budget vs actual spending
3. **Review categories:** Browse categorized transactions
4. **Create report:** Generate financial reports
5. **Customize:** Edit seed data (see README.md)

## Development Workflow

```bash
# Development cycle
1. pnpm dev                    # Start app
2. Make code changes          # Edit code
3. Test in browser            # http://localhost:3000
4. Run tests                  # pnpm test
5. pnpm db:seed              # Reset demo data
6. Repeat testing
```

## Performance Tips

- Seeding takes 2-5 seconds
- Database queries take <100ms typically
- Use Prisma Studio to inspect data visually
- Check backend logs for query performance

## Notes

- ✅ Safe to run multiple times (idempotent)
- ✅ Won't run in production (safety guard)
- ✅ Automatically cleans up old seed data
- ✅ Uses Prisma Decimal for exact precision
- ✅ Realistic merchant names and amounts

## See Also

- Full documentation: [README.md](./README.md)
- Prisma docs: https://pris.ly/d/
- MoneyWise dev guide: [ENVIRONMENT-SETUP.md](../ENVIRONMENT-SETUP.md)
