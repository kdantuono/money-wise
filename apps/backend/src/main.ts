import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { AppConfig } from './core/config/app.config';
import { MonitoringInterceptor } from './core/monitoring/monitoring.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Create NestJS application
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Get configuration service
    const configService = app.get(ConfigService);
    const appConfig = configService.get<AppConfig>('app');

    // Get monitoring service for interceptor
    const { MonitoringService } = await import('./core/monitoring/monitoring.service');
    const monitoringService = app.get(MonitoringService);

    // Global monitoring interceptor
    app.useGlobalInterceptors(new MonitoringInterceptor(monitoringService));

    // Validate configuration
    if (!appConfig) {
      throw new Error('Application configuration not found');
    }

    // Security middleware
    app.use(helmet());

    // Compression middleware
    app.use(compression());

    // CORS configuration
    app.enableCors({
      origin: appConfig.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        validateCustomDecorators: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // API prefix
    const apiPrefix = appConfig.API_PREFIX || 'api';
    app.setGlobalPrefix(apiPrefix);

    // Swagger documentation setup
    if (appConfig.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle(appConfig.APP_NAME || 'MoneyWise Backend')
        .setDescription('MoneyWise Personal Finance Management API')
        .setVersion(appConfig.APP_VERSION || '0.1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
          },
          'JWT-auth',
        )
        .addTag('Health', 'Health check endpoints')
        .addTag('Auth', 'Authentication and authorization')
        .addTag('Users', 'User management')
        .addTag('Transactions', 'Transaction management')
        .addTag('Budgets', 'Budget management')
        .addTag('Categories', 'Category management')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
        },
        customSiteTitle: 'MoneyWise API Documentation',
      });

      logger.log(`Swagger documentation available at: http://localhost:${appConfig.PORT}/${apiPrefix}/docs`);
    }

    // Start the application
    const port = appConfig.PORT || 3001;
    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
    logger.log(`🏥 Health check available at: http://localhost:${port}/${apiPrefix}/health`);
    logger.log(`🌍 Environment: ${appConfig.NODE_ENV}`);
    logger.log(`📊 Process ID: ${process.pid}`);

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  const logger = new Logger('SIGTERM');
  logger.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  const logger = new Logger('SIGINT');
  logger.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

bootstrap();