import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { User } from '../../auth/user.entity';
import { MLCategorizationService } from '../services/ml-categorization.service';
import { CategorySeederService } from '../services/category-seeder.service';

@Controller('ml-categorization')
@UseGuards(JwtAuthGuard)
export class MLCategorizationController {
  constructor(
    private mlCategorizationService: MLCategorizationService,
    private categorySeederService: CategorySeederService,
  ) {}

  @Get('categories')
  async getCategories() {
    return await this.mlCategorizationService.getCategories();
  }

  @Post('categorize/:transactionId')
  async categorizeTransaction(
    @Param('transactionId') transactionId: string,
    @GetUser() user: User,
  ) {
    return await this.mlCategorizationService.categorizeTransaction(transactionId);
  }

  @Get('predictions')
  async getUserPredictions(@GetUser() user: User) {
    return await this.mlCategorizationService.getTransactionPredictions(user.id);
  }

  @Post('seed-categories')
  async seedCategories() {
    await this.categorySeederService.seedCategories();
    return { message: 'Categories seeded successfully' };
  }
}