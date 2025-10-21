# Database Seeding Guide

This directory contains database seeding scripts for MoneyWise development and testing.

## Overview

The seed script (`index.ts`) populates the development database with realistic demo data to enable rapid testing and feature development without manual data entry.

## What Gets Seeded

### Demo Family
- **Name:** Smith Family
- **Purpose:** Multi-user household for testing family-level features

### Users (2)
1. **John Smith (ADMIN)**
   - Email: `john.smith@demo.moneywise.app`
   - Password: `demo123`
   - Role: ADMIN (full family management)

2. **Emma Smith (MEMBER)**
   - Email: `emma.smith@demo.moneywise.app`
   - Password: `demo123`
   - Role: MEMBER (standard access)

### Accounts (4)
- **Chase Checking:** $5,432.50 (primary account)
- **Chase Savings:** $12,850.00 (savings account)
- **Chase Freedom Unlimited:** -$842.35 (credit card with $5,000 limit)
- **Vanguard 401(k):** $87,500.00 (investment account)

### Transaction Categories (20)
- **Income:** Salary, Freelance, Investment Income, Refunds
- **Expense:** Groceries, Restaurants, Gas, Public Transit, Utilities, Internet, Phone, Movies, Gaming, Subscriptions, Healthcare
- **Transfer:** Account Transfers

### Transactions (100)
- 6 salary transactions (biweekly)
- 12 grocery store visits
- 15 restaurant transactions
- 10 gas station purchases
- 20 coffee/cafe transactions
- 37 subscription and other expenses

**Date Range:** Last 90 days from today

**Transaction Types:**
- 40% POSTED transactions (cleared)
- 10% PENDING transactions (recent)
- Realistic merchant names and amounts

### Budgets (3)
- **Groceries:** $800/month (active)
- **Gas:** $400/month (active)
- **Entertainment:** $300/month (active)

Budget alerts configured at: 50%, 75%, 90% of limit

## Prerequisites

### System Requirements
- Node.js 18+ (check: `node --version`)
- pnpm 8+ (check: `pnpm --version`)
- PostgreSQL 15+ running (check: `docker-compose ps`)

### Required Files
- `.env` file configured with `DATABASE_URL`
- Prisma client generated (automatic on install)
- Database migrations applied

### Verification Checklist
```bash
# 1. Database running?
docker-compose -f docker-compose.dev.yml ps

# 2. Prisma client generated?
ls -la apps/backend/generated/prisma/client

# 3. Migrations applied?
pnpm db:migrate:dev --help
```

## Usage

### Quick Seed (One Command)

From the `apps/backend` directory:

```bash
pnpm db:seed
```

### Detailed Steps

1. **Ensure database is running:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Generate Prisma client:**
   ```bash
   pnpm prisma:generate
   ```

3. **Apply migrations:**
   ```bash
   pnpm db:migrate:dev
   ```

4. **Run seed script:**
   ```bash
   cd apps/backend
   pnpm db:seed
   ```

### Expected Output

```
🌱 MoneyWise Database Seeding Started
==========================================

🧹 Cleaning up existing seed data...
   ✅ Cleanup complete

👨‍👩‍👧‍👦 Creating demo family...
   ✅ Created family: "Smith Family" (ID: uuid)

👤 Creating users...
   ✅ Created admin: John Smith (john.smith@demo.moneywise.app)
   ✅ Created member: Emma Smith (emma.smith@demo.moneywise.app)

📂 Creating transaction categories...
   ✅ Created 20 categories

🏦 Creating accounts...
   ✅ Created 4 accounts

💳 Creating transactions (100 realistic transactions)...
   ✅ Created 100 transactions

💰 Creating budgets...
   ✅ Created 3 budgets

✅ Database seeding completed successfully!

📊 Seeding Summary:
   Family: Smith Family
   Users: 2 users created
   Accounts: 4 accounts
   Categories: 20 categories
   Transactions: 100 transactions
   Budgets: 3 budgets

🚀 Ready to test! You can now:
   1. Start the app: pnpm dev
   2. Log in with: john.smith@demo.moneywise.app / demo123
   3. View transactions and reports
```

## Troubleshooting

### Error: "DATABASE_URL not found"

**Cause:** Environment variables not configured

**Solution:**
```bash
# Copy env template
cp .env.example .env

# Edit .env with your database URL
nano .env

# Or use defaults if running locally
# DATABASE_URL="postgresql://postgres:password@localhost:5432/moneywise"
```

### Error: "Table does not exist"

**Cause:** Migrations not applied

**Solution:**
```bash
pnpm db:migrate:dev
```

### Error: "Cannot find module 'generated/prisma'"

**Cause:** Prisma client not generated

**Solution:**
```bash
pnpm prisma:generate
```

### Error: "Connection refused localhost:5432"

**Cause:** PostgreSQL not running

**Solution:**
```bash
# Start Docker services
docker-compose -f docker-compose.dev.yml up -d

# Verify postgres is running
docker-compose ps | grep postgres
```

### Error: "Duplicate key value violates unique constraint"

**Cause:** Seed data already exists

**Solution:** The script has cleanup built-in. Either:
1. Just run again (it will clean automatically)
2. Manually reset the database:
   ```bash
   pnpm prisma:reset
   ```

### Script runs but doesn't create data

**Cause:** Running in production mode

**Solution:** Ensure NODE_ENV is NOT set to 'production'
```bash
# Check current NODE_ENV
echo $NODE_ENV

# Should be empty or 'development'
NODE_ENV=development pnpm db:seed
```

## Customization

### Modify Demo Data

Edit `index.ts` to customize:

1. **Change passwords:**
   - Generate new bcrypt hash: `bcrypt.hash('newpassword', 10)`
   - Replace `DEMO_PASSWORD_HASH` constant

2. **Modify account balances:**
   - Edit `createAccounts()` function
   - Update amounts in `currentBalance` field

3. **Add more transactions:**
   - Edit `createTransactions()` function
   - Increase loop counts or add new merchants

4. **Change budget amounts:**
   - Edit `createBudgets()` function
   - Modify amount fields

5. **Customize family/user names:**
   - Edit `SEED_FAMILY_NAME` and `SEED_USER_EMAILS` constants
   - Update user creation functions

### Example: Add More Transactions

```typescript
// In createTransactions(), add new merchant pattern:
for (let i = 0; i < 25; i++) {
  const amounts = [/* custom amounts */];
  transactions.push({
    accountId: checkingAccount.id,
    amount: parseDecimal(amounts[i % amounts.length]),
    // ... rest of transaction data
  });
}
```

## Advanced Usage

### Reset and Reseed Database

```bash
# Fully reset and reseed
pnpm prisma:reset

# Or step-by-step
pnpm db:migrate:reset    # Drop and recreate schema
pnpm db:seed             # Populate with demo data
```

### Seed Specific Environment

```bash
# Development (default)
NODE_ENV=development pnpm db:seed

# Test environment
NODE_ENV=test pnpm db:seed
```

### View Seeded Data

After seeding, browse data with Prisma Studio:

```bash
pnpm prisma:studio
```

This opens a web UI at `http://localhost:5555` to browse all created data.

## Technical Details

### Idempotent Seeding

The script is **idempotent** - safe to run multiple times:

1. **Cleanup phase:** Deletes any existing seed data first
2. **Detection:** Identifies seed data by email pattern
3. **Isolation:** Seed data never conflicts with user data

### Production Safety

The script **refuses to run in production**:

```typescript
if (process.env.NODE_ENV === 'production') {
  throw new Error('Seeding is not allowed in production!');
}
```

This prevents accidental data corruption.

### Decimal Precision

All financial amounts use `Prisma.Decimal` for exact precision:

```typescript
// Prevents floating-point errors
// 0.1 + 0.2 = 0.30000000000000004 (wrong)
// Decimal('0.1') + Decimal('0.2') = Decimal('0.3') (correct)
currentBalance: new Prisma.Decimal('5432.50')
```

### Cascade Deletes

The cleanup uses Prisma CASCADE relationships:

```
Delete User
  → Cascade delete Accounts
    → Cascade delete Transactions
    → Cascade delete UserAchievements
  → Cascade delete PasswordHistory
  → Cascade delete AuditLogs
```

This ensures no orphaned data.

## Performance

**Typical Seeding Time:** 2-5 seconds

**Breakdown:**
- Cleanup: ~0.5s
- Family/Users: ~0.5s
- Categories: ~0.5s
- Accounts: ~0.3s
- Transactions: ~1.5s (100 transactions)
- Budgets: ~0.3s

## Best Practices

1. **Always verify database is running first**
   ```bash
   docker-compose ps
   ```

2. **Reseed between feature tests**
   ```bash
   pnpm db:seed
   ```

3. **Use Prisma Studio to inspect data**
   ```bash
   pnpm prisma:studio
   ```

4. **Keep seed data realistic**
   - Use actual merchant names
   - Maintain realistic transaction amounts
   - Spread transactions over time

5. **Document custom seed data**
   - Add comments explaining non-standard data
   - Include rationale for specific amounts/patterns

## Future Enhancements

Planned improvements:

- [ ] Faker.js integration for more realistic variations
- [ ] Configurable seeding (environment variables for amounts, dates)
- [ ] Multi-family seeding option
- [ ] Performance seeding mode (minimal data for speed)
- [ ] Selective seeding (only seed specific entities)
- [ ] Seed data exports for regression testing
