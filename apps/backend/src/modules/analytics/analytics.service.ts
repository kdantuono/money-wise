import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Budget } from '../budgets/budget.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Budget)
    private budgetRepository: Repository<Budget>,
  ) {}

  async getDashboardOverview(userId: string): Promise<any> {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // Get current month transactions
    const monthlyTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.date >= :startDate', { startDate: currentMonth })
      .andWhere('transaction.date < :endDate', { endDate: nextMonth })
      .getMany();

    const totalIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netIncome = totalIncome - totalExpenses;

    // Get top categories
    const categorySpending = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.category', 'category')
      .addSelect('SUM(transaction.amount)', 'amount')
      .addSelect('COUNT(*)', 'transactionCount')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.type = :type', { type: 'expense' })
      .andWhere('transaction.date >= :startDate', { startDate: currentMonth })
      .andWhere('transaction.date < :endDate', { endDate: nextMonth })
      .groupBy('transaction.category')
      .orderBy('amount', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      transactionCount: monthlyTransactions.length,
      topCategories: categorySpending,
    };
  }

  async getSpendingTrends(userId: string, months: number = 6): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DATE_TRUNC(\'month\', transaction.date)', 'month')
      .addSelect('SUM(CASE WHEN transaction.type = \'income\' THEN transaction.amount ELSE 0 END)', 'income')
      .addSelect('SUM(CASE WHEN transaction.type = \'expense\' THEN transaction.amount ELSE 0 END)', 'expenses')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.date >= :startDate', { startDate })
      .andWhere('transaction.date <= :endDate', { endDate })
      .groupBy('DATE_TRUNC(\'month\', transaction.date)')
      .orderBy('month', 'ASC')
      .getRawMany();
  }

  async getCategoryAnalytics(userId: string, period: string = 'month'): Promise<any[]> {
    const startDate = new Date();
    if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate.setMonth(startDate.getMonth() - 3);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const categoryData = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.category', 'category')
      .addSelect('SUM(transaction.amount)', 'amount')
      .addSelect('COUNT(*)', 'transactionCount')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.type = :type', { type: 'expense' })
      .andWhere('transaction.date >= :startDate', { startDate })
      .groupBy('transaction.category')
      .orderBy('amount', 'DESC')
      .getRawMany();

    const totalSpending = categoryData.reduce((sum, cat) => sum + Number(cat.amount), 0);

    return categoryData.map(cat => ({
      ...cat,
      percentage: totalSpending > 0 ? (Number(cat.amount) / totalSpending) * 100 : 0,
    }));
  }
}