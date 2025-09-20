import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './budget.entity';
import { Transaction } from '../transactions/transaction.entity';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private budgetRepository: Repository<Budget>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>
  ) {}

  async create(
    userId: string,
    createBudgetDto: CreateBudgetDto
  ): Promise<Budget> {
    const budget = this.budgetRepository.create({
      ...createBudgetDto,
      userId,
    });

    return await this.budgetRepository.save(budget);
  }

  async findAll(userId: string): Promise<Budget[]> {
    return await this.budgetRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Budget> {
    const budget = await this.budgetRepository.findOne({
      where: { id, userId },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    return budget;
  }

  async update(
    userId: string,
    id: string,
    updateBudgetDto: UpdateBudgetDto
  ): Promise<Budget> {
    const budget = await this.findOne(userId, id);

    Object.assign(budget, updateBudgetDto);

    return await this.budgetRepository.save(budget);
  }

  async remove(userId: string, id: string): Promise<void> {
    const budget = await this.findOne(userId, id);
    await this.budgetRepository.remove(budget);
  }

  async updateBudgetSpending(
    userId: string,
    budgetId: string
  ): Promise<Budget> {
    const budget = await this.findOne(userId, budgetId);

    const spent = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.category = :category', {
        category: budget.category,
      })
      .andWhere('transaction.type = :type', { type: 'expense' })
      .andWhere('transaction.date BETWEEN :startDate AND :endDate', {
        startDate: budget.startDate,
        endDate: budget.endDate,
      })
      .getRawOne();

    budget.spent = parseFloat(spent.total) || 0;

    return await this.budgetRepository.save(budget);
  }

  async getBudgetPerformance(userId: string): Promise<any[]> {
    const budgets = await this.findAll(userId);

    const performance = await Promise.all(
      budgets.map(async budget => {
        const updatedBudget = await this.updateBudgetSpending(
          userId,
          budget.id
        );
        const percentage = (updatedBudget.spent / updatedBudget.amount) * 100;

        let status = 'on_track';
        if (percentage >= 100) {
          status = 'over_budget';
        } else if (percentage >= updatedBudget.alertThreshold) {
          status = 'approaching_limit';
        }

        return {
          budgetId: updatedBudget.id,
          budgetName: updatedBudget.name,
          category: updatedBudget.category,
          allocated: updatedBudget.amount,
          spent: updatedBudget.spent,
          remaining: updatedBudget.amount - updatedBudget.spent,
          percentage,
          status,
          period: updatedBudget.period,
          startDate: updatedBudget.startDate,
          endDate: updatedBudget.endDate,
        };
      })
    );

    return performance;
  }

  async getActiveBudgets(userId: string): Promise<Budget[]> {
    const currentDate = new Date();

    return await this.budgetRepository
      .createQueryBuilder('budget')
      .where('budget.userId = :userId', { userId })
      .andWhere('budget.isActive = :isActive', { isActive: true })
      .andWhere('budget.startDate <= :currentDate', { currentDate })
      .andWhere('budget.endDate >= :currentDate', { currentDate })
      .getMany();
  }
}
