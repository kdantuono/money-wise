/**
 * Health Controller Unit Tests
 * Demonstrates comprehensive unit testing patterns
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '@/core/health/health.controller';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRedis: any;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue({
        APP_VERSION: '0.1.0',
        NODE_ENV: 'test',
      }),
    };

    mockDataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ health: 1 }]),
      driver: {
        master: {
          pool: {
            totalCount: 10,
            idleCount: 5,
            waitingCount: 0,
          },
        },
      },
    } as any;

    mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
      info: jest.fn().mockResolvedValue('redis_version:7.0.0\r\n'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: 'default',
          useValue: mockRedis,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return basic health status', () => {
      const result = controller.getHealth();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: '0.1.0',
        environment: 'test',
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
        },
      });
    });

    it('should return consistent timestamp format', () => {
      const result = controller.getHealth();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return positive uptime', () => {
      const result = controller.getHealth();

      expect(result.uptime).toBeGreaterThan(0);
    });

    it('should return memory usage', () => {
      const result = controller.getHealth();

      expect(result.memory.used).toBeGreaterThan(0);
      expect(result.memory.total).toBeGreaterThan(0);
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health with services status', async () => {
      const result = await controller.getDetailedHealth();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: '0.1.0',
        environment: 'test',
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
        },
        services: {
          database: {
            status: 'ok',
            responseTime: expect.any(Number),
            details: expect.any(Object),
          },
          redis: {
            status: 'ok',
            responseTime: expect.any(Number),
            details: expect.any(Object),
          },
        },
      });
    });

    it('should include database response time', async () => {
      const result = await controller.getDetailedHealth();

      expect(result.services.database.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should include connection pool stats', async () => {
      const result = await controller.getDetailedHealth();

      expect(result.services.database.details).toEqual({
        pool: {
          total: 10,
          idle: 5,
          waiting: 0,
        },
      });
    });

    it('should include Redis version', async () => {
      const result = await controller.getDetailedHealth();

      expect(result.services.redis.details).toEqual({
        version: '7.0.0',
      });
    });
  });

  describe('getReadiness', () => {
    it('should return readiness status when all services are healthy', async () => {
      const result = await controller.getReadiness();

      expect(result).toEqual({
        status: 'ready',
        timestamp: expect.any(String),
        checks: {
          database: true,
          redis: true,
        },
      });
    });

    it('should throw 503 when database is not ready', async () => {
      Object.defineProperty(mockDataSource, 'isInitialized', {
        value: false,
        writable: true,
      });

      await expect(controller.getReadiness()).rejects.toThrow();
    });

    it('should throw 503 when Redis is not ready', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.getReadiness()).rejects.toThrow();
    });
  });

  describe('getLiveness', () => {
    it('should return liveness status', () => {
      const result = controller.getLiveness();

      expect(result).toEqual({
        status: 'alive',
        timestamp: expect.any(String),
      });
    });
  });
});