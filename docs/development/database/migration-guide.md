# Database Migration Guide

**Last Updated**: October 18, 2025
**Status**: Comprehensive Guide
**Tool**: Prisma Migrate

---

## Quick Reference

### Create a New Migration
```bash
# After modifying prisma/schema.prisma
pnpm db:migrate:dev --name descriptive_name
```

### Run Pending Migrations
```bash
pnpm db:migrate
```

### Reset Database (Development Only)
```bash
# ⚠️ DESTRUCTIVE - ONLY IN DEVELOPMENT
pnpm db:migrate:reset
```

---

## Workflow

### 1. Plan Changes
Review what needs to change in the schema and why.

### 2. Update Schema
Edit `prisma/schema.prisma`:
```prisma
// Example: Add new field
model User {
  // ... existing fields
  phoneNumber String? // NEW
}
```

### 3. Create Migration
```bash
pnpm db:migrate:dev --name add_phone_number_to_users
```

This:
- Generates SQL migration in `prisma/migrations/`
- Applies it to dev database
- Regenerates Prisma Client types

### 4. Review Migration
```bash
# Check generated SQL
ls -la prisma/migrations/
cat prisma/migrations/*/migration.sql
```

### 5. Commit Changes
```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add phone number field to users"
```

---

## Migration Files

Location: `prisma/migrations/`

Each migration contains:
- **Timestamp**: Creation time (e.g., `20251018_add_field`)
- **SQL**: Database changes (`migration.sql`)
- **Metadata**: Version info (`_prisma_migrations` table)

### Migration File Structure
```
prisma/migrations/
├── 20251018120000_initial_schema/
│   └── migration.sql
├── 20251018130000_add_field/
│   └── migration.sql
└── migration_lock.toml
```

---

## Common Tasks

### Add a Column
```prisma
model User {
  id          String
  email       String
  +newField   String    // ADD THIS LINE
  createdAt   DateTime
}
```

```bash
pnpm db:migrate:dev --name add_new_field_to_users
```

### Remove a Column
```prisma
model User {
  id          String
  email       String
  -oldField   String    // REMOVE THIS LINE (or comment out)
  createdAt   DateTime
}
```

```bash
pnpm db:migrate:dev --name remove_old_field_from_users
```

### Make Field Optional/Required
```prisma
// Before: required
model User {
  phoneNumber String
}

// After: optional
model User {
  phoneNumber String?
}
```

```bash
pnpm db:migrate:dev --name make_phone_optional
```

### Add Unique Constraint
```prisma
model User {
  email String @unique  // Add unique
}
```

### Add Index
```prisma
model Transaction {
  id          String
  date        DateTime
  categoryId  String

  @@index([categoryId])  // Add index
}
```

### Create New Model
```prisma
model NewModel {
  id        String    @id @default(cuid())
  name      String
  userId    String

  user      User      @relation(fields: [userId], references: [id])
}
```

```bash
pnpm db:migrate:dev --name create_new_model
```

---

## Troubleshooting

### Migration Stuck or Failed

**Option 1: View Recent Migrations**
```bash
# In psql
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 5;
```

**Option 2: Retry Migration**
```bash
pnpm db:migrate:resolve --rolled-back migration_name
pnpm db:migrate
```

**Option 3: Reset (Development Only)**
```bash
# ⚠️ DESTRUCTIVE
pnpm db:migrate:reset
```

### Schema Drift
If database schema doesn't match `schema.prisma`:

```bash
# Detect drift
pnpm db:validate

# Force reconciliation (development)
pnpm db:migrate:reset
```

### Type Generation Issues
```bash
# Regenerate Prisma Client
pnpm db:generate

# Clear cache
rm -rf node_modules/.prisma
pnpm db:generate
```

---

## Best Practices

### ✅ DO
- Use descriptive migration names
- Create small, focused migrations (one change per migration)
- Test migrations locally first
- Commit migrations with schema changes
- Use Prisma Studio to verify changes: `pnpm db:studio`

### ❌ DON'T
- Manually edit migration SQL (regenerate instead)
- Skip migrations or apply selectively
- Use `reset` in production (destructive!)
- Create migrations without testing
- Make breaking changes without planning

---

## Production Considerations

### Applying Migrations
```bash
# Production environment
pnpm db:migrate
```

### Zero-Downtime Migrations
For large tables, Prisma handles common operations safely:
- Adding columns (safe)
- Adding constraints (safe)
- Removing columns (consider soft deletes first)
- Renaming columns (use temporary column strategy)

### Rollback Strategy
Prisma doesn't support `rollback`. Instead:
1. Create a new migration to undo changes
2. Use git history if needed to recreate database

```bash
# Example: undo a change
# Create opposite migration
pnpm db:migrate:dev --name undo_previous_change
```

---

## Migration Naming Convention

Follow this pattern:
```
verb_resource_descriptor

Examples:
- add_email_to_users
- remove_deprecated_field
- create_transactions_table
- add_unique_constraint_on_email
- rename_column_to_better_name
```

---

## Performance

### Index Strategies
```prisma
// Single column index
@@index([userId])

// Composite index
@@index([userId, createdAt])

// Unique constraint (also an index)
@@unique([email])
```

### Large Table Migrations
For tables with millions of rows:
1. Create index in background (long operations)
2. Test on production replica first
3. Consider scheduled maintenance window

---

## Related Documentation

- [`README.md`](./README.md) - Database overview
- [`schema-reference.md`](./schema-reference.md) - Current schema
- [`../../development/setup.md`](../setup.md) - Development setup
- [`../../migration/TYPEORM-PRISMA-PATTERNS.md`](../../migration/TYPEORM-PRISMA-PATTERNS.md) - Migration patterns from TypeORM

---

**Version**: Prisma v6.17.1+
**Status**: Current as of October 18, 2025

