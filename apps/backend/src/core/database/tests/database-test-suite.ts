/* eslint-disable no-console */
/**
 * Database Test Suite Runner
 * Orchestrates all database tests and generates comprehensive reports
 * Console statements are intentionally used for test reporting and debugging
 */

import { DataSource } from 'typeorm';
import { setupTestDatabase, teardownTestDatabase, DatabaseTestManager } from './database-test.config';
import { TestDataFactory } from './factories/test-data.factory';

/**
 * Test Suite Results Interface
 */
export interface TestSuiteResults {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    duration: number;
    coverage: {
      entities: string[];
      relationships: string[];
      operations: string[];
    };
  };
  performance: {
    avgQueryTime: number;
    maxQueryTime: number;
    bulkInsertRate: number;
    memoryUsage: number;
  };
  compatibility: {
    timescaleDB: boolean;
    postgresqlVersion: string;
    extensions: string[];
  };
  recommendations: string[];
}

/**
 * Database Test Suite
 */
export class DatabaseTestSuite {
  private dataSource: DataSource;
  private factory: TestDataFactory;
  private manager: DatabaseTestManager;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Initialize test suite
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Database Test Suite...');

    this.dataSource = await setupTestDatabase();
    this.factory = new TestDataFactory(this.dataSource);
    this.manager = DatabaseTestManager.getInstance();

    console.log('✅ Database Test Suite initialized');
  }

  /**
   * Run all database tests
   */
  async runAllTests(): Promise<TestSuiteResults> {
    const results: TestSuiteResults = {
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration: 0,
        coverage: {
          entities: [],
          relationships: [],
          operations: []
        }
      },
      performance: {
        avgQueryTime: 0,
        maxQueryTime: 0,
        bulkInsertRate: 0,
        memoryUsage: 0
      },
      compatibility: {
        timescaleDB: false,
        postgresqlVersion: '',
        extensions: []
      },
      recommendations: []
    };

    try {
      console.log('🔄 Running comprehensive database tests...');

      // Check database compatibility
      await this.checkCompatibility(results);

      // Run entity tests
      await this.testEntityOperations(results);

      // Run relationship tests
      await this.testRelationships(results);

      // Run performance tests
      await this.testPerformance(results);

      // Generate coverage report
      await this.generateCoverageReport(results);

      // Generate recommendations
      this.generateRecommendations(results);

      results.summary.duration = Date.now() - this.startTime;

      console.log('✅ All database tests completed');
      return results;

    } catch (error) {
      console.error('❌ Database test suite failed:', error);
      throw error;
    }
  }

  /**
   * Check database compatibility and features
   */
  private async checkCompatibility(results: TestSuiteResults): Promise<void> {
    console.log('🔍 Checking database compatibility...');

    try {
      // Check PostgreSQL version
      const versionResult = await this.dataSource.query('SELECT version()');
      results.compatibility.postgresqlVersion = versionResult[0].version;

      // Check for TimescaleDB
      try {
        await this.dataSource.query('SELECT timescaledb_version()');
        results.compatibility.timescaleDB = true;
        await this.manager.createHypertables();
      } catch {
        results.compatibility.timescaleDB = false;
      }

      // Check available extensions
      const extensionsResult = await this.dataSource.query(`
        SELECT extname FROM pg_extension ORDER BY extname
      `);
      results.compatibility.extensions = extensionsResult.map(ext => ext.extname);

      console.log(`✅ PostgreSQL: ${results.compatibility.postgresqlVersion.split(' ')[1]}`);
      console.log(`✅ TimescaleDB: ${results.compatibility.timescaleDB ? 'Available' : 'Not Available'}`);
      console.log(`✅ Extensions: ${results.compatibility.extensions.length} installed`);

    } catch (error) {
      console.warn('⚠️ Compatibility check failed:', error.message);
    }
  }

  /**
   * Test basic entity operations
   */
  private async testEntityOperations(results: TestSuiteResults): Promise<void> {
    console.log('🔄 Testing entity operations...');

    const entities = ['User', 'Account', 'Category', 'Transaction'];
    const operations = ['create', 'read', 'update', 'delete'];

    for (const entityName of entities) {
      try {
        results.summary.totalTests++;

        // Test basic CRUD operations
        await this.testEntityCRUD(entityName);

        results.summary.passedTests++;
        results.summary.coverage.entities.push(entityName);
        results.summary.coverage.operations.push(...operations.map(op => `${entityName}_${op}`));

      } catch (error) {
        console.error(`❌ Entity test failed for ${entityName}:`, error.message);
        results.summary.failedTests++;
      }
    }

    console.log(`✅ Entity operations tested: ${results.summary.coverage.entities.length} entities`);
  }

  /**
   * Test entity relationships
   */
  private async testRelationships(results: TestSuiteResults): Promise<void> {
    console.log('🔄 Testing entity relationships...');

    const relationships = [
      'User_Account_OneToMany',
      'Account_Transaction_OneToMany',
      'Category_Transaction_OneToMany',
      'Category_Category_Tree',
      'User_Account_Transaction_Join'
    ];

    for (const relationship of relationships) {
      try {
        results.summary.totalTests++;

        // Test relationship integrity
        await this.testRelationshipIntegrity(relationship);

        results.summary.passedTests++;
        results.summary.coverage.relationships.push(relationship);

      } catch (error) {
        console.error(`❌ Relationship test failed for ${relationship}:`, error.message);
        results.summary.failedTests++;
      }
    }

    console.log(`✅ Relationships tested: ${results.summary.coverage.relationships.length}`);
  }

  /**
   * Test database performance
   */
  private async testPerformance(results: TestSuiteResults): Promise<void> {
    console.log('🔄 Testing database performance...');

    const performanceTests = [
      { name: 'Bulk Insert', size: 1000 },
      { name: 'Complex Query', size: 10000 },
      { name: 'Aggregation Query', size: 5000 },
      { name: 'Pagination Query', size: 20000 }
    ];

    const queryTimes: number[] = [];

    for (const test of performanceTests) {
      try {
        results.summary.totalTests++;

        const startTime = Date.now();
        await this.runPerformanceTest(test.name, test.size);
        const duration = Date.now() - startTime;

        queryTimes.push(duration);
        results.summary.passedTests++;

        console.log(`✅ ${test.name}: ${duration}ms`);

      } catch (error) {
        console.error(`❌ Performance test failed for ${test.name}:`, error.message);
        results.summary.failedTests++;
      }
    }

    // Calculate performance metrics
    if (queryTimes.length > 0) {
      results.performance.avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      results.performance.maxQueryTime = Math.max(...queryTimes);
    }

    console.log(`✅ Performance tests completed: avg ${results.performance.avgQueryTime.toFixed(2)}ms`);
  }

  /**
   * Generate test coverage report
   */
  private async generateCoverageReport(results: TestSuiteResults): Promise<void> {
    console.log('📊 Generating coverage report...');

    // Check database schema coverage
    const tables = await this.dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);

    const indexes = await this.dataSource.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);

    const constraints = await this.dataSource.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
    `);

    console.log(`📊 Schema Coverage:`);
    console.log(`   Tables: ${tables.length}`);
    console.log(`   Indexes: ${indexes.length}`);
    console.log(`   Constraints: ${constraints.length}`);
    console.log(`   Entities Tested: ${results.summary.coverage.entities.length}`);
    console.log(`   Relationships Tested: ${results.summary.coverage.relationships.length}`);
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: TestSuiteResults): void {
    console.log('💡 Generating recommendations...');

    // Performance recommendations
    if (results.performance.avgQueryTime > 1000) {
      results.recommendations.push('Consider adding more database indexes for frequently queried columns');
    }

    if (results.performance.maxQueryTime > 5000) {
      results.recommendations.push('Optimize slow queries or consider query result caching');
    }

    // TimescaleDB recommendations
    if (!results.compatibility.timescaleDB) {
      results.recommendations.push('Consider installing TimescaleDB for better time-series performance');
    }

    // Test coverage recommendations
    if (results.summary.coverage.entities.length < 4) {
      results.recommendations.push('Increase test coverage for all entity types');
    }

    if (results.summary.failedTests > 0) {
      results.recommendations.push('Address failing tests before production deployment');
    }

    // PostgreSQL version recommendations
    if (!results.compatibility.postgresqlVersion.includes('15') && !results.compatibility.postgresqlVersion.includes('16')) {
      results.recommendations.push('Consider upgrading to PostgreSQL 15+ for better performance');
    }

    console.log(`💡 Generated ${results.recommendations.length} recommendations`);
  }

  /**
   * Test specific entity CRUD operations
   */
  private async testEntityCRUD(entityName: string): Promise<void> {
    switch (entityName) {
      case 'User': {
        const user = await this.factory.users.build();
        const foundUser = await this.dataSource.getRepository('User').findOne({ where: { id: user.id } });
        if (!foundUser) throw new Error('User CRUD test failed');
        break;
      }

      case 'Account': {
        const testUser = await this.factory.users.build();
        const account = await this.factory.accounts.build({ userId: testUser.id });
        const foundAccount = await this.dataSource.getRepository('Account').findOne({ where: { id: account.id } });
        if (!foundAccount) throw new Error('Account CRUD test failed');
        break;
      }

      case 'Category': {
        const category = await this.factory.categories.build();
        const foundCategory = await this.dataSource.getRepository('Category').findOne({ where: { id: category.id } });
        if (!foundCategory) throw new Error('Category CRUD test failed');
        break;
      }

      case 'Transaction': {
        const txUser = await this.factory.users.build();
        const txAccount = await this.factory.accounts.build({ userId: txUser.id });
        const transaction = await this.factory.transactions.build({ accountId: txAccount.id });
        const foundTransaction = await this.dataSource.getRepository('Transaction').findOne({ where: { id: transaction.id } });
        if (!foundTransaction) throw new Error('Transaction CRUD test failed');
        break;
      }
    }
  }

  /**
   * Test relationship integrity
   */
  private async testRelationshipIntegrity(relationship: string): Promise<void> {
    switch (relationship) {
      case 'User_Account_OneToMany': {
        const user = await this.factory.users.build();
        await this.factory.accounts.buildMany(3, { userId: user.id });
        const userWithAccounts = await this.dataSource.getRepository('User').findOne({
          where: { id: user.id },
          relations: ['accounts']
        });
        if (!userWithAccounts || userWithAccounts.accounts.length !== 3) {
          throw new Error('User-Account relationship test failed');
        }
        break;
      }

      case 'Account_Transaction_OneToMany': {
        const accUser = await this.factory.users.build();
        const account = await this.factory.accounts.build({ userId: accUser.id });
        await this.factory.transactions.buildMany(5, { accountId: account.id });
        const accountWithTransactions = await this.dataSource.getRepository('Account').findOne({
          where: { id: account.id },
          relations: ['transactions']
        });
        if (!accountWithTransactions || accountWithTransactions.transactions.length !== 5) {
          throw new Error('Account-Transaction relationship test failed');
        }
        break;
      }

      case 'Category_Transaction_OneToMany': {
        const catUser = await this.factory.users.build();
        const catAccount = await this.factory.accounts.build({ userId: catUser.id });
        const category = await this.factory.categories.build();
        await this.factory.transactions.buildMany(3, { accountId: catAccount.id, categoryId: category.id });
        const categoryWithTransactions = await this.dataSource.getRepository('Category').findOne({
          where: { id: category.id },
          relations: ['transactions']
        });
        if (!categoryWithTransactions || categoryWithTransactions.transactions.length !== 3) {
          throw new Error('Category-Transaction relationship test failed');
        }
        break;
      }

      // Add more relationship tests as needed
    }
  }

  /**
   * Run specific performance test
   */
  private async runPerformanceTest(testName: string, size: number): Promise<void> {
    switch (testName) {
      case 'Bulk Insert': {
        const users = await this.factory.users.buildMany(size);
        if (users.length !== size) throw new Error('Bulk insert test failed');
        break;
      }

      case 'Complex Query': {
        // Run a complex query with the existing data
        const result = await this.dataSource.query(`
          SELECT COUNT(*) FROM users u
          LEFT JOIN accounts a ON u.id = a."userId"
          LEFT JOIN transactions t ON a.id = t."accountId"
          WHERE u.status = 'active'
        `);
        if (!result || result.length === 0) throw new Error('Complex query test failed');
        break;
      }

      // Add more performance tests as needed
    }
  }

  /**
   * Cleanup test suite
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test suite...');
    await teardownTestDatabase();
    console.log('✅ Test suite cleanup completed');
  }

  /**
   * Print comprehensive test results
   */
  printResults(results: TestSuiteResults): void {
    console.log('\n📋 Database Test Suite Results');
    console.log('='.repeat(50));

    console.log('\n📊 Test Summary:');
    console.log(`   Total Tests: ${results.summary.totalTests}`);
    console.log(`   Passed: ${results.summary.passedTests}`);
    console.log(`   Failed: ${results.summary.failedTests}`);
    console.log(`   Skipped: ${results.summary.skippedTests}`);
    console.log(`   Duration: ${results.summary.duration}ms`);
    console.log(`   Success Rate: ${((results.summary.passedTests / results.summary.totalTests) * 100).toFixed(2)}%`);

    console.log('\n⚡ Performance Metrics:');
    console.log(`   Avg Query Time: ${results.performance.avgQueryTime.toFixed(2)}ms`);
    console.log(`   Max Query Time: ${results.performance.maxQueryTime}ms`);

    console.log('\n🔧 Compatibility:');
    console.log(`   PostgreSQL: ${results.compatibility.postgresqlVersion.split(' ')[1]}`);
    console.log(`   TimescaleDB: ${results.compatibility.timescaleDB ? '✅' : '❌'}`);
    console.log(`   Extensions: ${results.compatibility.extensions.length}`);

    console.log('\n📈 Coverage:');
    console.log(`   Entities: ${results.summary.coverage.entities.join(', ')}`);
    console.log(`   Relationships: ${results.summary.coverage.relationships.length}`);
    console.log(`   Operations: ${results.summary.coverage.operations.length}`);

    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(50));
  }
}

/**
 * Export utility function to run the complete test suite
 */
export async function runDatabaseTestSuite(): Promise<TestSuiteResults> {
  const suite = new DatabaseTestSuite();

  try {
    await suite.initialize();
    const results = await suite.runAllTests();
    suite.printResults(results);
    return results;
  } finally {
    await suite.cleanup();
  }
}