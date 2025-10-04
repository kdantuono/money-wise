# Migration Archive

This folder contains backup/archived migrations that should NOT be executed by TypeORM.

## Why Archive?

These BACKUP migrations have been superseded by consolidated migrations and would cause conflicts if executed:

- **BACKUP_1758926681909-InitialSchema.ts** - Original initial schema migration
- **BACKUP_1759002732450-FixInitialSchema.ts** - Schema fix migration (caused enum "already exists" errors)

## Current Active Migration

The active, consolidated migration is:
- **1760000000000-ConsolidatedCompleteSchema.ts** - Complete schema with all fixes integrated

## DO NOT DELETE

These files are kept for:
1. **Audit trail** - Understanding schema evolution history
2. **Rollback reference** - If needed to understand what was changed
3. **Documentation** - Schema development progression

## TypeORM Loading

TypeORM migration glob pattern (`migrations/*{.ts,.js}`) does NOT recurse into subdirectories, so files in this `archive/` folder will NOT be loaded or executed.

---

**Last Updated:** 2025-10-02
**Reason:** Moved to fix CI test failures (enum type "already exists" errors)
