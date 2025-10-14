/**
 * Test Data Factory
 * Re-exports from the Prisma-based test data factory
 * @deprecated Import directly from src/core/database/tests/factories/test-data.factory.ts or prisma-test-data.factory.ts
 */

// Re-export the TypeORM legacy factory (still used by some tests during migration)
export { TestDataFactory } from '../../../../../src/core/database/tests/factories/test-data.factory';

// Also export the Prisma factory for tests that have migrated
export { PrismaTestDataFactory } from '../../../../../src/core/database/tests/factories/prisma-test-data.factory';
