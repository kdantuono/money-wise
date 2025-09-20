import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MLCategorizationService } from './services/ml-categorization.service';
import { MLCategorizationController } from './controllers/ml-categorization.controller';
import { TransactionCategory } from './entities/transaction-category.entity';
import { TransactionMLPrediction } from './entities/transaction-ml-prediction.entity';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionMLModel } from './models/transaction-ml-model';
import { CategorySeederService } from './services/category-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionCategory,
      TransactionMLPrediction,
      Transaction,
    ]),
  ],
  controllers: [MLCategorizationController],
  providers: [
    MLCategorizationService,
    TransactionMLModel,
    CategorySeederService,
  ],
  exports: [MLCategorizationService, CategorySeederService],
})
export class MLCategorizationModule {}
