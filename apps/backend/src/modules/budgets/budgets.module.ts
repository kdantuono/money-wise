import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Transaction } from '../transactions/transaction.entity';

import { Budget } from './budget.entity';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';


@Module({
  imports: [TypeOrmModule.forFeature([Budget, Transaction])],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
