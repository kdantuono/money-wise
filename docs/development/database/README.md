# Database Documentation

**Last Updated**: October 18, 2025
**Database**: PostgreSQL with Prisma ORM
**Version**: Prisma v6.17.1+

---

## Quick Start

### Setup
1. Install dependencies: `pnpm install`
2. Configure `.env.local` with `DATABASE_URL`
3. Run migrations: `pnpm db:migrate`
4. Generate Prisma Client: `pnpm db:generate`

### Common Commands
```bash
# View database schema and manage
pnpm db:studio          # Launch Prisma Studio (UI)

# Create and run migrations
pnpm db:migrate         # Run all pending migrations
pnpm db:migrate:dev     # Create migration after schema changes
pnpm db:migrate:reset   # Reset to fresh state (dev only)

# Generate Prisma Client
pnpm db:generate        # After schema.prisma changes

# Validation
pnpm db:validate        # Check schema syntax
```

---

## 📚 Documentation

- [`schema-reference.md`](./schema-reference.md) - Current Prisma schema documentation
- [`migration-guide.md`](./migration-guide.md) - How to create and manage migrations

---

## 🏗️ Architecture

### Current ORM
- **Tool**: Prisma
- **Database**: PostgreSQL
- **Client**: Auto-generated from `prisma/schema.prisma`
- **Migrations**: Using Prisma migrate (`prisma/migrations/`)

### Key Features
✅ Type-safe database access
✅ Auto-generated types from schema
✅ Declarative migrations
✅ Transaction support
✅ Connection pooling

---

## 📋 Schema Organization

The Prisma schema (`prisma/schema.prisma`) contains:

**Core Models**:
- User - User accounts and profiles
- Account - Financial accounts (checking, savings, etc.)
- Transaction - Individual transactions
- Category - Transaction categories
- Budget - Budget tracking

**Supporting Models**:
- Session - Session management
- VerificationToken - Email verification
- PasswordReset - Password reset tokens
- AuditLog - System audit trail

---

## 🔗 Related Documentation

- [`../../development/setup.md`](../setup.md) - Full development setup
- [`../../planning/critical-path.md`](../../planning/critical-path.md) - Project tasks
- [`../../migration/TYPEORM-PRISMA-PATTERNS.md`](../../migration/TYPEORM-PRISMA-PATTERNS.md) - Historical migration patterns

---

## 🆘 Troubleshooting

### Connection Issues
```bash
# Test connection
pnpm db:validate

# Check environment
echo $DATABASE_URL
```

### Schema Issues
```bash
# Reset migrations (dev only - DESTRUCTIVE)
pnpm db:migrate:reset

# Generate types from current schema
pnpm db:generate
```

### Type Errors
```bash
# Regenerate Prisma Client
rm -rf node_modules/.prisma
pnpm db:generate
```

---

**See also**: [`../../DOCUMENTATION-GUIDE.md`](../../DOCUMENTATION-GUIDE.md) for navigation

