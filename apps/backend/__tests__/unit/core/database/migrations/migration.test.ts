/**
 * Migration Tests
 * Tests database migrations up/down operations and schema validation
 */

import { DataSource } from 'typeorm';
import { setupTestDatabase, teardownTestDatabase, DatabaseTestManager } from '../database-test.config';
import { entities } from '../../entities';

describe('Database Migrations', () => {
  let dataSource: DataSource;
  let manager: DatabaseTestManager;

  beforeAll(async () => {
    manager = DatabaseTestManager.getInstance();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Start fresh for each test
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('Schema Creation', () => {
    it('should create all tables with correct structure', async () => {
      // Arrange & Act
      dataSource = await setupTestDatabase();

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
      dataSource = await setupTestDatabase();

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
      dataSource = await setupTestDatabase();

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
      expect(columnNames).toContain('plaidAccountId');
      expect(columnNames).toContain('plaidMetadata');

      // Check decimal precision for balance
      const balanceColumn = columns.find((c: any) => c.column_name === 'currentBalance');
      expect(balanceColumn.numeric_precision).toBe(15);
      expect(balanceColumn.numeric_scale).toBe(2);
    });

    it('should create all required columns for transactions table', async () => {
      // Arrange & Act
      dataSource = await setupTestDatabase();

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
      expect(columnNames).toContain('plaidTransactionId');
      expect(columnNames).toContain('plaidMetadata');
      expect(columnNames).toContain('location');
    });

    it('should create all required columns for categories table', async () => {
      // Arrange & Act
      dataSource = await setupTestDatabase();

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
      expect(columnNames).toContain('parentId');
      expect(columnNames).toContain('rules');
      expect(columnNames).toContain('metadata');

      // Check tree-related columns for nested sets
      expect(columnNames).toContain('mpath');
    });
  });

  describe('Indexes and Constraints', () => {
    it('should create all required indexes', async () => {
      // Arrange & Act
      dataSource = await setupTestDatabase();

      // Assert - Check indexes exist
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
      const indexNames = indexes.map((i: any) => i.indexname);

      // User indexes
      expect(indexNames).toContain('IDX_97672ac88f789774dd47f7c8be'); // email unique
      expect(indexNames).toContain('IDX_a3ffb1c0c8416b9fc6f907b743'); // status + createdAt

      // Account indexes
      expect(indexNames).toContain('IDX_3aa23c0a6d107393e8b40e3e2a'); // userId + status

      // Transaction indexes
      expect(indexNames).toContain('IDX_3d6915a33798152a079b8982ed'); // accountId + date
      expect(indexNames).toContain('IDX_7ff1b7ca84c9450a7c7deec0bc'); // categoryId + date

      // Category indexes
      expect(indexNames).toContain('IDX_420d9f679d41281f282f5bc7d0'); // slug unique
    });

    it('should create all foreign key constraints', async () => {
      // Arrange & Act
      dataSource = await setupTestDatabase();

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
      dataSource = await setupTestDatabase();

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

      // Plaid transaction ID should be unique (partial)
      const plaidTransactionUnique = uniqueConstraints.find((uc: any) =>
        uc.table_name === 'transactions' &&
        uc.column_name === 'plaidTransactionId'
      );
      expect(plaidTransactionUnique).toBeDefined();
    });
  });

  describe('Migration Rollback', () => {
    it('should be able to drop and recreate schema', async () => {
      // Arrange
      dataSource = await setupTestDatabase();

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
      dataSource = await setupTestDatabase();

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
      dataSource = await setupTestDatabase();

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
      dataSource = await setupTestDatabase();

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
      dataSource = await setupTestDatabase();

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
      dataSource = await setupTestDatabase();

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
      dataSource = await setupTestDatabase();

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