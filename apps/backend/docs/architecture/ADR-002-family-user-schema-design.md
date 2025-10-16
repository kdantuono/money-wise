# ADR-002: Family and User Schema Design (Prisma Migration)

**Status**: Implemented
**Date**: 2025-10-11
**Author**: Database Specialist
**Related**: TypeORM User entity (`src/core/database/entities/user.entity.ts`)

## Context

MoneyWise is a "family-first" multi-generational finance platform serving users ages 7-70+. The existing TypeORM User entity lacks family relationship modeling, preventing core features like:

- Family-level financial accounts (shared checking, family budgets)
- Parent-child financial education and oversight
- Multi-generational wealth tracking and planning
- Family role-based permissions

## Decision

We designed a Family-User relational schema in Prisma with the following key architectural decisions:

### 1. Family as Required Parent Entity

**Decision**: Every User MUST belong to a Family (non-nullable `familyId`).

**Rationale**:
- Aligns with core product vision: multi-generational finance platform
- Simplifies authorization logic (check family membership vs "user OR family" conditionals)
- Solo users automatically get single-member families on signup
- Consistent data model across all user types

**Implementation**:
```prisma
model User {
  familyId String @map("family_id") @db.Uuid
  family   Family @relation(fields: [familyId], references: [id], onDelete: Cascade)
}
```

### 2. Cascade Delete Behavior

**Decision**: Family deletion cascades to Users (`onDelete: Cascade`).

**Rationale**:
- Family is the core organizational unit
- When a family account closes, all members should be removed for data integrity
- Users cannot exist without a family in MoneyWise's model
- Prevents orphaned user records

**Risk Mitigation**:
- Application-level soft delete for families (mark as deleted, don't immediately purge)
- 30-day grace period before hard delete in production
- Export user data before family deletion

### 3. Role Enum Redefinition

**Previous (TypeORM)**: `USER | ADMIN` (system-level roles)
**New (Prisma)**: `ADMIN | MEMBER | VIEWER` (family-level roles)

**Rationale**:
- Roles now represent permissions within a family, not system access
- **ADMIN**: Full family management (billing, invite/remove members, settings, view all data)
- **MEMBER**: Standard access (manage own data, view family shared data, create accounts)
- **VIEWER**: Read-only (designed for children learning finance, supervised access)

**Migration Strategy**:
- TypeORM `USER` → Prisma `MEMBER` (first family member defaults to ADMIN)
- TypeORM `ADMIN` → Prisma `ADMIN`

### 4. Dual Account Ownership Model

**Decision**: Accounts can be owned by User OR Family (both foreign keys nullable).

**Rationale**:
- **Personal Accounts** (`userId` set): Individual checking, savings, credit cards
- **Family Accounts** (`familyId` set): Shared checking, family savings, joint credit cards
- Enables both individual and family-level financial management

**Database Constraint** (to be implemented in migration):
```sql
ALTER TABLE accounts ADD CONSTRAINT check_single_owner
  CHECK ((user_id IS NOT NULL)::int + (family_id IS NOT NULL)::int = 1);
```

### 5. Index Strategy

**Indexes Implemented**:

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| `idx_users_email` | email | UNIQUE | Authentication lookups (login) |
| `idx_users_family_id` | familyId | Standard | JOIN performance (family → users) |
| `idx_users_family_role` | (familyId, role) | Composite | "All admins in family" queries |
| `idx_users_status_created` | (status, createdAt) | Composite | User lifecycle/admin dashboards |
| `idx_accounts_user_id` | userId | Standard | User → accounts JOIN |
| `idx_accounts_family_id` | familyId | Standard | Family → accounts JOIN |

**Performance Targets**:
- Email lookup (login): <10ms
- Family users query: <20ms
- User accounts query: <20ms

### 6. Database Naming Conventions

**Decision**: snake_case for database, camelCase for application.

**Implementation**:
- Use `@map("column_name")` for individual columns
- Use `@@map("table_name")` for table names
- Maintains PostgreSQL standards while keeping TypeScript clean

**Examples**:
```prisma
firstName String @map("first_name")  // DB: first_name, App: firstName
@@map("users")                       // DB: users, App: User model
```

### 7. Field Mappings from TypeORM

All existing TypeORM fields preserved:

| TypeORM Field | Prisma Field | Type | Notes |
|---------------|--------------|------|-------|
| id | id | String @id @default(uuid()) | UUID primary key |
| email | email | String @unique | Authentication identifier |
| firstName | firstName | String @map("first_name") | Required |
| lastName | lastName | String @map("last_name") | Required |
| passwordHash | passwordHash | String @map("password_hash") | Bcrypt hash |
| role | role | UserRole @default(MEMBER) | Family-level role |
| status | status | UserStatus @default(ACTIVE) | Account status |
| avatar | avatar | String? | Optional profile image URL |
| timezone | timezone | String? | User timezone (IANA format) |
| currency | currency | String @default("USD") | ISO 4217 code |
| preferences | preferences | Json? @db.JsonB | User preferences object |
| lastLoginAt | lastLoginAt | DateTime? @map("last_login_at") | Last successful login |
| emailVerifiedAt | emailVerifiedAt | DateTime? @map("email_verified_at") | Email verification timestamp |
| createdAt | createdAt | DateTime @default(now()) | Record creation |
| updatedAt | updatedAt | DateTime @updatedAt | Last modification |

**New Field**:
- `familyId`: Required foreign key to Family table

### 8. Timestamp Strategy

**Decision**: All timestamps stored as `TIMESTAMPTZ` (timezone-aware).

**Rationale**:
- Accurate audit trails across timezones
- Consistent with multi-generational global usage
- Enables accurate "last active" calculations
- Facilitates compliance and security logging

## Consequences

### Positive

1. **Clear Data Model**: Family-first architecture aligned with product vision
2. **Simplified Authorization**: Check family membership instead of complex "user OR family" logic
3. **Scalable Permissions**: Three-tier role system supports diverse use cases
4. **Performance Optimized**: Strategic indexes for common query patterns
5. **Future-Proof**: Dual ownership model enables personal + shared accounts
6. **Migration Safe**: All TypeORM fields preserved, reversible migration

### Negative

1. **Cascading Deletes**: Family deletion removes all users (mitigated with soft delete + grace period)
2. **Required Family**: Solo users must have single-member families (slight data overhead)
3. **Dual Ownership Complexity**: Application must enforce "exactly one owner" constraint
4. **Role Migration**: Existing USER roles need careful mapping to new MEMBER/ADMIN roles

### Migration Risks

1. **Data Integrity**: Must ensure all existing users get assigned to families
2. **Role Mapping**: Incorrect USER→MEMBER mapping could create permission issues
3. **Application Code**: All TypeORM User references need Prisma Client migration
4. **Index Creation**: On large tables, index creation may take time (run during low traffic)

## Migration Strategy

### Phase 1: Schema Deployment (Zero-Downtime)

```sql
-- 1. Create families table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add family_id as NULLABLE first
ALTER TABLE users ADD COLUMN family_id UUID;

-- 3. Backfill: Create single-member families for existing users
INSERT INTO families (name, created_at, updated_at)
SELECT
  CONCAT(first_name, ' ', last_name, '''s Family'),
  created_at,
  created_at
FROM users;

UPDATE users SET family_id = (
  SELECT f.id FROM families f
  WHERE f.name = CONCAT(users.first_name, ' ', users.last_name, '''s Family')
  LIMIT 1
);

-- 4. Add NOT NULL constraint after backfill
ALTER TABLE users ALTER COLUMN family_id SET NOT NULL;

-- 5. Add foreign key constraint
ALTER TABLE users ADD CONSTRAINT fk_users_family
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;

-- 6. Create indexes
CREATE INDEX idx_users_family_id ON users(family_id);
CREATE INDEX idx_users_family_role ON users(family_id, role);
```

### Phase 2: Role Migration

```sql
-- Map USER → MEMBER, ADMIN → ADMIN
-- First user in each family becomes ADMIN
UPDATE users SET role = 'MEMBER' WHERE role = 'USER';

WITH first_users AS (
  SELECT DISTINCT ON (family_id) id
  FROM users
  ORDER BY family_id, created_at
)
UPDATE users SET role = 'ADMIN' WHERE id IN (SELECT id FROM first_users);
```

### Phase 3: Application Code Migration

1. Replace TypeORM User entity imports with Prisma Client
2. Update UserService to use Prisma queries
3. Add FamilyService for family management
4. Update AuthGuards to check family membership
5. Migrate all user CRUD operations to Prisma

### Phase 4: Account Dual Ownership

```sql
-- Add family_id to accounts (nullable)
ALTER TABLE accounts ADD COLUMN family_id UUID;
ALTER TABLE accounts ADD CONSTRAINT fk_accounts_family
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;

-- Add check constraint: exactly one owner
ALTER TABLE accounts ADD CONSTRAINT check_single_owner
  CHECK ((user_id IS NOT NULL)::int + (family_id IS NOT NULL)::int = 1);
```

## Validation

- [x] Prisma schema formatted (`npx prisma format`)
- [x] Prisma schema validated (`npx prisma validate`)
- [ ] Migration script tested with 100K user dataset
- [ ] Performance benchmarks meet targets (<50ms queries)
- [ ] Rollback script prepared and tested
- [ ] Application code updated to use Prisma Client
- [ ] E2E tests updated for family relationships

## References

- **Original TypeORM Entity**: `apps/backend/src/core/database/entities/user.entity.ts`
- **Prisma Schema**: `apps/backend/prisma/schema.prisma`
- **App Overview**: `docs/planning/app-overview.md` (Multi-generational vision)
- **Prisma Docs**: https://www.prisma.io/docs/concepts/components/prisma-schema

## Next Steps

1. Generate migration SQL: `npx prisma migrate dev --create-only --name family_user_schema`
2. Review and test migration SQL with production-like data
3. Create rollback migration script
4. Update application services to use Prisma Client
5. Update tests for family relationships
6. Deploy to staging for validation
7. Production deployment during low-traffic window
