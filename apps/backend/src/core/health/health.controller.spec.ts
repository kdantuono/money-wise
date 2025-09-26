/**
 * Health Controller Unit Tests
 * Demonstrates comprehensive unit testing patterns
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { ConfigService } from '@nestjs/config';

describe('HealthController', () => {
  let controller: HealthController;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue({
        APP_VERSION: '0.1.0',
        NODE_ENV: 'test',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    configService = module.get(ConfigService);
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
          },
          redis: {
            status: 'ok',
          },
        },
      });
    });

    it('should include database response time', async () => {
      const result = await controller.getDetailedHealth();

      expect(result.services.database.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getReadiness', () => {
    it('should return readiness status', () => {
      const result = controller.getReadiness();

      expect(result).toEqual({
        status: 'ready',
        timestamp: expect.any(String),
      });
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