import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaFamilyService } from './services/family.service';

/**
 * PrismaModule - Global module for Prisma database services
 *
 * ARCHITECTURAL DECISIONS:
 * - @Global decorator: Makes PrismaService available everywhere without imports
 * - Single PrismaService instance: Singleton pattern ensures one connection pool
 * - Exports all Prisma services: PrismaService + domain services (Family, User, etc.)
 *
 * RATIONALE FOR @Global:
 * - PrismaService is fundamental infrastructure used across all modules
 * - Avoids repetitive imports in every feature module
 * - Simplifies dependency injection in services
 *
 * USAGE:
 * ```typescript
 * // In AppModule (or CoreModule)
 * @Module({
 *   imports: [PrismaModule],
 *   // ...
 * })
 * export class AppModule {}
 *
 * // In any service (no additional imports needed)
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly prisma: PrismaService) {}
 * }
 * ```
 *
 * LIFECYCLE:
 * - Module initialization: PrismaService.onModuleInit() connects to database
 * - Module destruction: PrismaService.onModuleDestroy() closes connection
 * - Automatic lifecycle management by NestJS
 *
 * TESTING:
 * - In unit tests: Mock PrismaService using jest-mock-extended
 * - In e2e tests: Use real PrismaService with test database
 * - See __tests__/unit/core/database/prisma/services/family.service.spec.ts
 */
@Global()
@Module({
  providers: [PrismaService, PrismaFamilyService],
  exports: [PrismaService, PrismaFamilyService],
})
export class PrismaModule {}
