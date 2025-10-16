/**
 * Database Configuration Tests
 *
 * Tests validation and configuration of PostgreSQL/TimescaleDB settings
 */
import { validate } from 'class-validator';
import { DatabaseConfig } from './database.config';
import databaseConfig from './database.config';

describe('DatabaseConfig', () => {
  let config: DatabaseConfig;
  const originalEnv = process.env;

  beforeEach(() => {
    config = new DatabaseConfig();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('DB_HOST validation', () => {
    it('should accept valid host strings', async () => {
      const validHosts = [
        'localhost',
        'db.example.com',
        '192.168.1.1',
        'postgres-server',
        'db-cluster.region.rds.amazonaws.com',
      ];

      for (const host of validHosts) {
        config.DB_HOST = host;
        config.DB_PORT = 5432;
        config.DB_USERNAME = 'postgres';
        config.DB_PASSWORD = 'password123';
        config.DB_NAME = 'testdb';
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'DB_HOST')).toBeUndefined();
      }
    });

    it('should reject non-string host', async () => {
      // @ts-expect-error Testing invalid type
      config.DB_HOST = 123;
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_HOST')).toBeDefined();
    });

    it('should require DB_HOST', async () => {
      // @ts-expect-error Testing missing required field
      config.DB_HOST = undefined;
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_HOST')).toBeDefined();
    });
  });

  describe('DB_PORT validation', () => {
    it('should accept valid port numbers', async () => {
      const validPorts = [1, 5432, 5433, 6543, 65535];

      for (const port of validPorts) {
        config.DB_HOST = 'localhost';
        config.DB_PORT = port;
        config.DB_USERNAME = 'postgres';
        config.DB_PASSWORD = 'password123';
        config.DB_NAME = 'testdb';
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'DB_PORT')).toBeUndefined();
      }
    });

    it('should reject port below 1', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 0;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';
      const errors = await validate(config);
      const portError = errors.find(e => e.property === 'DB_PORT');
      expect(portError).toBeDefined();
      expect(portError?.constraints?.min).toContain('DB_PORT must be at least 1');
    });

    it('should reject port above 65535', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 70000;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';
      const errors = await validate(config);
      const portError = errors.find(e => e.property === 'DB_PORT');
      expect(portError).toBeDefined();
      expect(portError?.constraints?.max).toContain('DB_PORT must not exceed 65535');
    });

    it('should reject non-number port', async () => {
      config.DB_HOST = 'localhost';
      // @ts-expect-error Testing invalid type
      config.DB_PORT = '5432';
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_PORT')).toBeDefined();
    });
  });

  describe('DB_USERNAME validation', () => {
    it('should accept valid usernames', async () => {
      const validUsernames = [
        'postgres',
        'admin',
        'db_user',
        'app-user',
        'user123',
      ];

      for (const username of validUsernames) {
        config.DB_HOST = 'localhost';
        config.DB_PORT = 5432;
        config.DB_USERNAME = username;
        config.DB_PASSWORD = 'password123';
        config.DB_NAME = 'testdb';
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'DB_USERNAME')).toBeUndefined();
      }
    });

    it('should require DB_USERNAME', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      // @ts-expect-error Testing missing required field
      config.DB_USERNAME = undefined;
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_USERNAME')).toBeDefined();
    });
  });

  describe('DB_PASSWORD validation', () => {
    it('should accept passwords meeting minimum length', async () => {
      const validPasswords = [
        'password',
        'password123',
        'very-long-secure-password-with-symbols!@#',
        'P@ssw0rd!',
      ];

      for (const password of validPasswords) {
        config.DB_HOST = 'localhost';
        config.DB_PORT = 5432;
        config.DB_USERNAME = 'postgres';
        config.DB_PASSWORD = password;
        config.DB_NAME = 'testdb';
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'DB_PASSWORD')).toBeUndefined();
      }
    });

    it('should reject passwords shorter than 8 characters', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'short';
      config.DB_NAME = 'testdb';
      const errors = await validate(config);
      const passwordError = errors.find(e => e.property === 'DB_PASSWORD');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.minLength).toContain(
        'DB_PASSWORD must be at least 8 characters'
      );
    });

    it('should require DB_PASSWORD', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      // @ts-expect-error Testing missing required field
      config.DB_PASSWORD = undefined;
      config.DB_NAME = 'testdb';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_PASSWORD')).toBeDefined();
    });
  });

  describe('DB_NAME validation', () => {
    it('should accept valid database names', async () => {
      const validNames = [
        'moneywise',
        'test_db',
        'app-db',
        'production',
        'db123',
      ];

      for (const name of validNames) {
        config.DB_HOST = 'localhost';
        config.DB_PORT = 5432;
        config.DB_USERNAME = 'postgres';
        config.DB_PASSWORD = 'password123';
        config.DB_NAME = name;
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'DB_NAME')).toBeUndefined();
      }
    });

    it('should require DB_NAME', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      // @ts-expect-error Testing missing required field
      config.DB_NAME = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_NAME')).toBeDefined();
    });
  });

  describe('DB_SCHEMA validation', () => {
    it('should accept valid schema names', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';
      config.DB_SCHEMA = 'custom_schema';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_SCHEMA')).toBeUndefined();
    });

    it('should use default schema when not provided', () => {
      const newConfig = new DatabaseConfig();
      expect(newConfig.DB_SCHEMA).toBe('public');
    });

    it('should accept undefined schema (optional)', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';
      config.DB_SCHEMA = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_SCHEMA')).toBeUndefined();
    });
  });

  describe('DB_SYNCHRONIZE validation', () => {
    it('should accept boolean values', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';

      config.DB_SYNCHRONIZE = true;
      let errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_SYNCHRONIZE')).toBeUndefined();

      config.DB_SYNCHRONIZE = false;
      errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_SYNCHRONIZE')).toBeUndefined();
    });

    it('should reject non-boolean values', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';
      // @ts-expect-error Testing invalid type
      config.DB_SYNCHRONIZE = 'true';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_SYNCHRONIZE')).toBeDefined();
    });

    it('should accept undefined synchronize (optional)', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';
      config.DB_SYNCHRONIZE = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_SYNCHRONIZE')).toBeUndefined();
    });
  });

  describe('DB_LOGGING validation', () => {
    it('should accept boolean values', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';

      config.DB_LOGGING = true;
      let errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_LOGGING')).toBeUndefined();

      config.DB_LOGGING = false;
      errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_LOGGING')).toBeUndefined();
    });

    it('should reject non-boolean values', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';
      // @ts-expect-error Testing invalid type
      config.DB_LOGGING = 'false';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_LOGGING')).toBeDefined();
    });

    it('should accept undefined logging (optional)', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';
      config.DB_LOGGING = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'DB_LOGGING')).toBeUndefined();
    });
  });

  describe('databaseConfig factory function', () => {
    it('should read configuration from environment variables', () => {
      process.env.DB_HOST = 'production-db.example.com';
      process.env.DB_PORT = '5433';
      process.env.DB_USERNAME = 'app_user';
      process.env.DB_PASSWORD = 'secure_password';
      process.env.DB_NAME = 'production_db';
      process.env.DB_SCHEMA = 'app_schema';
      process.env.DB_SYNCHRONIZE = 'true';
      process.env.DB_LOGGING = 'true';

      const config = databaseConfig();

      expect(config).toEqual({
        DB_HOST: 'production-db.example.com',
        DB_PORT: 5433,
        DB_USERNAME: 'app_user',
        DB_PASSWORD: 'secure_password',
        DB_NAME: 'production_db',
        DB_SCHEMA: 'app_schema',
        DB_SYNCHRONIZE: true,
        DB_LOGGING: true,
      });
    });

    it('should use defaults when environment variables are not set', () => {
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_USERNAME;
      delete process.env.DB_PASSWORD;
      delete process.env.DB_NAME;
      delete process.env.DB_SCHEMA;
      delete process.env.DB_SYNCHRONIZE;
      delete process.env.DB_LOGGING;

      const config = databaseConfig();

      expect(config).toEqual({
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USERNAME: 'postgres',
        DB_PASSWORD: undefined,
        DB_NAME: 'moneywise',
        DB_SCHEMA: 'public',
        DB_SYNCHRONIZE: false,
        DB_LOGGING: false,
      });
    });

    it('should parse DB_PORT as integer', () => {
      process.env.DB_PORT = '5432';
      const config = databaseConfig();
      expect(config.DB_PORT).toBe(5432);
      expect(typeof config.DB_PORT).toBe('number');
    });

    it('should handle invalid DB_PORT gracefully', () => {
      process.env.DB_PORT = 'invalid';
      const config = databaseConfig();
      expect(config.DB_PORT).toBe(5432); // Falls back to default
    });

    it('should parse boolean flags correctly', () => {
      process.env.DB_SYNCHRONIZE = 'true';
      process.env.DB_LOGGING = 'false';
      const config = databaseConfig();
      expect(config.DB_SYNCHRONIZE).toBe(true);
      expect(config.DB_LOGGING).toBe(false);
    });

    it('should treat non-true strings as false for boolean flags', () => {
      process.env.DB_SYNCHRONIZE = 'yes';
      process.env.DB_LOGGING = '1';
      const config = databaseConfig();
      expect(config.DB_SYNCHRONIZE).toBe(false);
      expect(config.DB_LOGGING).toBe(false);
    });
  });

  describe('Complete configuration validation', () => {
    it('should validate a complete valid configuration', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'secure_password';
      config.DB_NAME = 'moneywise';
      config.DB_SCHEMA = 'public';
      config.DB_SYNCHRONIZE = false;
      config.DB_LOGGING = true;

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should validate minimal required configuration', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 5432;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'password123';
      config.DB_NAME = 'testdb';

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should collect multiple validation errors', async () => {
      config.DB_HOST = 'localhost';
      config.DB_PORT = 0;
      config.DB_USERNAME = 'postgres';
      config.DB_PASSWORD = 'short';
      config.DB_NAME = 'testdb';
      // @ts-expect-error Testing invalid types
      config.DB_SYNCHRONIZE = 'invalid';
      // @ts-expect-error Testing invalid types
      config.DB_LOGGING = 123;

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThanOrEqual(4);
      const errorProperties = errors.map(e => e.property);
      expect(errorProperties).toContain('DB_PORT');
      expect(errorProperties).toContain('DB_PASSWORD');
      expect(errorProperties).toContain('DB_SYNCHRONIZE');
      expect(errorProperties).toContain('DB_LOGGING');
    });
  });
});