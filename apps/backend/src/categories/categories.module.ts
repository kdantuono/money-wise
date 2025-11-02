import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoryService } from '../core/database/prisma/services/category.service';
import { PrismaService } from '../core/database/prisma/prisma.service';

/**
 * Categories Module
 * Provides category management functionality for transaction categorization
 */
@Module({
  controllers: [CategoriesController],
  providers: [CategoryService, PrismaService],
  exports: [CategoryService],
})
export class CategoriesModule {}
