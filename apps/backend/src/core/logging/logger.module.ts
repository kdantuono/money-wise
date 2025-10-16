import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './logger.service';

/**
 * Global Logger Module
 *
 * Provides the LoggerService as a global injectable service
 * Available throughout the application without explicit imports
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
