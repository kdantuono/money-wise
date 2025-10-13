/**
 * Migration Tests
 * Tests database migrations up/down operations and schema validation
 */

import { DataSource } from 'typeorm';
import { setupTestDatabase, teardownTestDatabase, DatabaseTestManager } from '@/core/database/tests/database-test.config';
import { entities } from '../../generated/prisma';

describe('Database Migrations', () => {
  let dataSource: DataSource;
  let manager: DatabaseTestManager;

  beforeAll(async () => {
    // Start container ONCE for all tests - reuse across test suite
    manager = DatabaseTestManager.getInstance();
    dataSource = await manager.start();
  }, 120000); // 2 min timeout for initial container start

  afterAll(async () => {
    // Cleanup ONCE after all tests complete
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Just clean data between tests - reuse same container
    await manager.clean();
  });

  afterEach(async () => {
    // No need to destroy DataSource between tests
  });

  describe('Schema Creation', () => {
    it('should create all tables with correct structure', async () => {
      // Arrange & Act
      // DataSource already initialized in beforeAll

      // Assert - Check all expected tables exist
      const tableQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      const tables = await dataSource.query(tableQuery);
      const tableNames = tables.map((t: any) => t.table_name);

      expect(tableNames).toContain('users');
      expect(tableNames).toContain('accounts');
      expect(tableNames).toContain('categories');
      expect(tableNames).toContain('transactions');
    });

    it('should create all required columns for users table', async () => {
      // Arrange & Act
      // DataSource already initialized in beforeAll

      // Assert - Check users table structure
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;

      const columns = await dataSource.query(columnsQuery);
      const columnNames = columns.map((c: any) => c.column_name);

      // Required columns
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('firstName');
      expect(columnNames).toContain('lastName');
      expect(columnNames).toContain('passwordHash');
      expect(columnNames).toContain('role');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('currency');
      expect(columnNames).toContain('preferences');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');

      // Check specific column properties
      const emailColumn = columns.find((c: any) => c.column_name === 'email');
      expect(emailColumn.is_nullable).toBe('NO');

      const preferencesColumn = columns.find((c: any) => c.column_name === 'preferences');
      expect(preferencesColumn.data_type).toBe('jsonb');
    });

    it('should create all required columns for accounts table', async () => {
      // Arrange & Act
      // DataSource already initialized in beforeAll

      // Assert - Check accounts table structure
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_name = 'accounts'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;

      const columns = await dataSource.query(columnsQuery);
      const columnNames = columns.map((c: any) => c.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('type');
      expect(columnNames).toContain('currentBalance');
      expect(columnNames).toContain('plaid_account_id'); // Explicit snake_case mapping
      expect(columnNames).toContain('plaidMetadata'); // JSONB column

      // Check decimal precision for balance
      const balanceColumn = columns.find((c: any) => c.column_name === 'currentBalance');
      expect(balanceColumn.numeric_precision).toBe(15);
      expect(balanceColumn.numeric_scale).toBe(2);
    });

    it('should create all required columns for transactions table', async () => {
      // Arrange & Act
      // DataSource already initialized in beforeAll

      // Assert - Check transactions table structure
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'transactions'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;

      const columns = await dataSource.query(columnsQuery);
      const columnNames = columns.map((c: any) => c.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('accountId');
      expect(columnNames).toContain('categoryId');
      expect(columnNames).toContain('amount');
      expect(columnNames).toContain('type');
      expect(columnNames).toContain('date');
      expect(columnNames).toContain('description');
      expect(columnNames).toContain('plaid_transaction_id'); // Explicit snake_case mapping
      expect(columnNames).toContain('plaidMetadata'); // JSONB column
      expect(columnNames).toContain('location');
    });

    it('should create all required columns for categories table', async () => {
      // Arrange & Act
      // DataSource already initialized in beforeAll

      // Assert - Check categories table structure
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'categories'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;

      const columns = await dataSource.query(columnsQuery);
      const columnNames = columns.map((c: any) => c.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('slug');
      expect(columnNames).toContain('type');
      expect(columnNames).toContain('parentId'); // TreeParent uses camelCase
      expect(columnNames).toContain('rules');
      expect(columnNames).toContain('metadata');

      // Check tree-related columns for nested sets (nsleft, nsright for nested-set strategy)
      expect(columnNames).toContain('nsleft');
      expect(columnNames).toContain('nsright');
    });
  });

  describe('Indexes and Constraints', () => {
    it('should create all required indexes', async () => {
      // Arrange & Act
      // DataSource already initialized in beforeAll

      // Assert - Check indexes exist by definition (not hash, which depends on column names)
      const indexQuery = `
        SELECT
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `;

      const indexes = await dataSource.query(indexQuery);
      const indexDefs = indexes.map((i: any) => ({ table: i.tablename, def: i.indexdef }));

      // User indexes
      const userEmailIndex = indexDefs.find(i => i.table === 'users' && i.def.includes('email'));
      expect(userEmailIndex).toBeDefined();

      const userStatusIndex = indexDefs.find(i => i.table === 'users' && i.def.includes('status') && i.def.includes('createdAt'));
      expect(userStatusIndex).toBeDefined();

      // Account indexes
      const accountUserIdIndex = indexDefs.find(i => i.table === 'accounts' && i.def.includes('userId') && i.def.includes('status'));
      expect(accountUserIdIndex).toBeDefined();

      // Transaction indexes
      const transactionAccountIndex = indexDefs.find(i => i.table === 'transactions' && i.def.includes('accountId') && i.def.includes('date'));
      expect(transactionAccountIndex).toBeDefined();

      const transactionCategoryIndex = indexDefs.find(i => i.table === 'transactions' && i.def.includes('categoryId') && i.def.includes('date'));
      expect(transactionCategoryIndex).toBeDefined();

      // Category indexes
      const categorySlugIndex = indexDefs.find(i => i.table === 'categories' && i.def.includes('slug') && i.def.includes('UNIQUE'));
      expect(categorySlugIndex).toBeDefined();

      // Transaction partial unique index
      const plaidTransactionIndex = indexDefs.find(i => i.table === 'transactions' && i.def.includes('plaid_transaction_id') && i.def.includes('UNIQUE'));
      expect(plaidTransactionIndex).toBeDefined();
    });

    it('should create all foreign key constraints', async () => {
      // Arrange & Act
      // DataSource already initialized in beforeAll

      // Assert - Check foreign key constraints
      const fkQuery = `
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `;

      const foreignKeys = await dataSource.query(fkQuery);

      // Should have FK from accounts to users
      const accountUserFK = foreignKeys.find((fk: any) =>
        fk.table_name === 'accounts' &&
        fk.foreign_table_name === 'users'
      );
      expect(accountUserFK).toBeDefined();
      expect(accountUserFK.column_name).toBe('userId');

      // Should have FK from transactions to accounts
      const transactionAccountFK = foreignKeys.find((fk: any) =>
        fk.table_name === 'transactions' &&
        fk.foreign_table_name === 'accounts'
      );
      expect(transactionAccountFK).toBeDefined();
      expect(transactionAccountFK.column_name).toBe('accountId');

      // Should have FK from transactions to categories
      const transactionCategoryFK = foreignKeys.find((fk: any) =>
        fk.table_name === 'transactions' &&
        fk.foreign_table_name === 'categories'
      );
      expect(transactionCategoryFK).toBeDefined();
      expect(transactionCategoryFK.column_name).toBe('categoryId');
    });

    it('should create unique constraints', async () => {
      // Arrange & Act
      // DataSource already initialized in beforeAll

      // Assert - Check unique constraints
      const uniqueQuery = `
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `;

      const uniqueConstraints = await dataSource.query(uniqueQuery);

      // Users email should be unique
      const userEmailUnique = uniqueConstraints.find((uc: any) =>
        uc.table_name === 'users' &&
        uc.column_name === 'email'
      );
      expect(userEmailUnique).toBeDefined();

      // Categories slug should be unique
      const categorySlugUnique = uniqueConstraints.find((uc: any) =>
        uc.table_name === 'categories' &&
        uc.column_name === 'slug'
      );
      expect(categorySlugUnique).toBeDefined();

      // Note: plaid_transaction_id uniqueness is enforced via partial unique INDEX,
      // not a UNIQUE CONSTRAINT, so we don't check it here (see index tests above)
    });
  });

  describe('Migration Rollback', () => {
    it('should be able to drop and recreate schema', async () => {
      // Arrange
      // DataSource already initialized in beforeAll

      // Verify tables exist
      let tables = await dataSource.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      expect(tables.length).toBeGreaterThan(0);

      // Act - Drop schema and recreate
      await dataSource.dropDatabase();
      await dataSource.synchronize();

      // Assert - Tables should exist again
      tables = await dataSource.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      expect(tables.length).toBeGreaterThan(0);
    });

    it('should handle schema changes gracefully', async () => {
      // Arrange
      // DataSource already initialized in beforeAll

      // Simulate schema change by adding a column
      await dataSource.query(
        "ALTER TABLE users ADD COLUMN test_column VARCHAR(255)"
      );

      // Verify column was added
      let columns = await dataSource.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'test_column'
      `);
      expect(columns.length).toBe(1);

      // Act - Sync schema (should remove extra column)
      await dataSource.synchronize(true); // dropBeforeSync = true

      // Assert - Extra column should be gone
      columns = await dataSource.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'test_column'
      `);
      expect(columns.length).toBe(0);
    });
  });

  describe('Data Type Validation', () => {
    it('should validate JSONB columns work correctly', async () => {
      // Arrange
      // DataSource already initialized in beforeAll

      // Act - Insert data with JSONB
      await dataSource.query(`
        INSERT INTO users (
          id, email, "firstName", "lastName", "passwordHash",
          preferences, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          'test@example.com',
          'Test',
          'User',
          'hashedpassword',
          '{"theme": "dark", "notifications": {"email": true}}',
          NOW(),
          NOW()
        )
      `);

      // Assert - Query JSONB data
      const result = await dataSource.query(`
        SELECT preferences->>'theme' as theme,
               preferences->'notifications'->>'email' as email_notifications
        FROM users
        WHERE email = 'test@example.com'
      `);

      expect(result[0].theme).toBe('dark');
      expect(result[0].email_notifications).toBe('true');
    });

    it('should validate enum constraints', async () => {
      // Arrange
      // DataSource already initialized in beforeAll

      // Act & Assert - Valid enum value should work
      await expect(
        dataSource.query(`
          INSERT INTO users (
            id, email, "firstName", "lastName", "passwordHash",
            role, status, "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(),
            'admin@example.com',
            'Admin',
            'User',
            'hashedpassword',
            'admin',
            'active',
            NOW(),
            NOW()
          )
        `)
      ).resolves.not.toThrow();

      // Invalid enum value should fail
      await expect(
        dataSource.query(`
          INSERT INTO users (
            id, email, "firstName", "lastName", "passwordHash",
            role, status, "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(),
            'invalid@example.com',
            'Invalid',
            'User',
            'hashedpassword',
            'invalid_role',
            'active',
            NOW(),
            NOW()
          )
        `)
      ).rejects.toThrow();
    });

    it('should validate decimal precision for monetary values', async () => {
      // Arrange
      // DataSource already initialized in beforeAll

      // Create user and account first
      const userResult = await dataSource.query(`
        INSERT INTO users (
          id, email, "firstName", "lastName", "passwordHash", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          'test@example.com',
          'Test',
          'User',
          'hashedpassword',
          NOW(),
          NOW()
        ) RETURNING id
      `);

      const userId = userResult[0].id;

      // Act - Insert account with high precision balance
      await dataSource.query(`
        INSERT INTO accounts (
          id, "userId", name, type, status, source, "currentBalance", currency, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          $1,
          'Test Account',
          'checking',
          'active',
          'manual',
          123.456789,
          'USD',
          NOW(),
          NOW()
        )
      `, [userId]);

      // Assert - Check precision is maintained
      const result = await dataSource.query(
        'SELECT "currentBalance" FROM accounts WHERE "userId" = $1',
        [userId]
      );

      // Should be rounded to 2 decimal places
      expect(parseFloat(result[0].currentBalance)).toBe(123.46);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large schema operations efficiently', async () => {
      // Arrange
      // DataSource already initialized in beforeAll

      const startTime = Date.now();

      // Act - Create and drop multiple indexes
      for (let i = 0; i < 5; i++) {
        await dataSource.query(`
          CREATE INDEX test_index_${i} ON transactions (amount, date)
          WHERE amount > ${i * 100}
        `);
      }

      for (let i = 0; i < 5; i++) {
        await dataSource.query(`DROP INDEX IF EXISTS test_index_${i}`);
      }

      const duration = Date.now() - startTime;

      // Assert - Should complete in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should validate entity metadata matches database schema', async () => {
      // Arrange
      // DataSource already initialized in beforeAll

      // Act - Get entity metadata and compare with actual schema
      for (const entity of entities) {
        const metadata = dataSource.getMetadata(entity);
        const tableName = metadata.tableName;

        // Check table exists
        const tableExists = await dataSource.query(`
          SELECT 1 FROM information_schema.tables
          WHERE table_name = $1 AND table_schema = 'public'
        `, [tableName]);

        expect(tableExists.length).toBe(1);

        // Check column count matches
        const dbColumns = await dataSource.query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
        `, [tableName]);

        const entityColumns = metadata.columns.length;

        // Allow for some flexibility due to TypeORM generated columns
        expect(parseInt(dbColumns[0].count)).toBeGreaterThanOrEqual(entityColumns - 2);
      }
    });
  });
});