import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionCategory } from '../entities/transaction-category.entity';

@Injectable()
export class CategorySeederService {
  constructor(
    @InjectRepository(TransactionCategory)
    private categoryRepository: Repository<TransactionCategory>,
  ) {}

  async seedCategories(): Promise<void> {
    const existingCategories = await this.categoryRepository.count();

    if (existingCategories > 0) {
      return; // Categories already seeded
    }

    const defaultCategories = [
      { name: 'Food & Dining', description: 'Restaurants, groceries, and food delivery' },
      { name: 'Transportation', description: 'Gas, public transit, rideshares, and vehicle expenses' },
      { name: 'Shopping', description: 'General merchandise and retail purchases' },
      { name: 'Entertainment', description: 'Movies, concerts, streaming services, and recreation' },
      { name: 'Bills & Utilities', description: 'Rent, utilities, phone, and other regular bills' },
      { name: 'Healthcare', description: 'Medical expenses, pharmacy, and health insurance' },
      { name: 'Travel', description: 'Hotels, flights, and vacation expenses' },
      { name: 'Education', description: 'Tuition, books, and educational materials' },
      { name: 'Personal Care', description: 'Haircuts, cosmetics, and personal hygiene' },
      { name: 'Income', description: 'Salary, freelance work, and other income sources' },
      { name: 'Transfer', description: 'Account transfers and payments' },
      { name: 'Other', description: 'Miscellaneous transactions' },
    ];

    for (const category of defaultCategories) {
      const newCategory = this.categoryRepository.create(category);
      await this.categoryRepository.save(newCategory);
    }
  }

  async getCategories(): Promise<TransactionCategory[]> {
    return await this.categoryRepository.find();
  }
}