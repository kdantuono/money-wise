import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction } from './transaction.entity';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
} from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>
  ) {}

  async create(
    userId: string,
    createTransactionDto: CreateTransactionDto
  ): Promise<Transaction> {
    const transaction = this.transactionRepository.create({
      ...createTransactionDto,
      userId,
      tags: createTransactionDto.tags || [],
    });

    return await this.transactionRepository.save(transaction);
  }

  async findAll(
    userId: string,
    query: TransactionQueryDto
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const { category, type, startDate, endDate, page = 1, limit = 10 } = query;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId });

    if (category) {
      queryBuilder.andWhere('transaction.category = :category', { category });
    }

    if (type) {
      queryBuilder.andWhere('transaction.type = :type', { type });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'transaction.date BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        }
      );
    }

    queryBuilder
      .orderBy('transaction.date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [transactions, total] = await queryBuilder.getManyAndCount();

    return { transactions, total };
  }

  async findOne(userId: string, id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async update(
    userId: string,
    id: string,
    updateTransactionDto: UpdateTransactionDto
  ): Promise<Transaction> {
    const transaction = await this.findOne(userId, id);

    Object.assign(transaction, updateTransactionDto);

    return await this.transactionRepository.save(transaction);
  }

  async remove(userId: string, id: string): Promise<void> {
    const transaction = await this.findOne(userId, id);
    await this.transactionRepository.remove(transaction);
  }

  async getTransactionsByCategory(
    userId: string,
    period?: string
  ): Promise<any[]> {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.category', 'category')
      .addSelect('SUM(transaction.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('transaction.userId = :userId', { userId })
      .groupBy('transaction.category')
      .orderBy('total', 'DESC');

    if (period) {
      const startDate = new Date();
      if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      query.andWhere('transaction.date >= :startDate', { startDate });
    }

    return await query.getRawMany();
  }

  async getMonthlyTrends(userId: string, months: number = 12): Promise<any[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return await this.transactionRepository
      .createQueryBuilder('transaction')
      .select("DATE_TRUNC('month', transaction.date)", 'month')
      .addSelect(
        "SUM(CASE WHEN transaction.type = 'income' THEN transaction.amount ELSE 0 END)",
        'income'
      )
      .addSelect(
        "SUM(CASE WHEN transaction.type = 'expense' THEN transaction.amount ELSE 0 END)",
        'expenses'
      )
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.date >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('month', transaction.date)")
      .orderBy('month', 'ASC')
      .getRawMany();
  }
}
