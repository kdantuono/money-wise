import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionCategory } from '../entities/transaction-category.entity';
import { TransactionMLPrediction } from '../entities/transaction-ml-prediction.entity';
import { Transaction } from '../../transactions/transaction.entity';
import { TransactionMLModel } from '../models/transaction-ml-model';

@Injectable()
export class MLCategorizationService {
  constructor(
    @InjectRepository(TransactionCategory)
    private categoryRepository: Repository<TransactionCategory>,
    @InjectRepository(TransactionMLPrediction)
    private predictionRepository: Repository<TransactionMLPrediction>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private mlModel: TransactionMLModel,
  ) {}

  async categorizeTransaction(transactionId: string): Promise<TransactionMLPrediction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId }
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const prediction = await this.mlModel.predict(transaction);

    // Find the category by name first
    let category = await this.categoryRepository.findOne({
      where: { name: prediction.categoryId }
    });

    // If category doesn't exist, create it
    if (!category) {
      category = this.categoryRepository.create({
        name: prediction.categoryId,
        isSystemCategory: true,
        isActive: true
      });
      category = await this.categoryRepository.save(category);
    }

    const mlPrediction = this.predictionRepository.create({
      transactionId,
      predictedCategoryId: category.id,
      confidenceScore: prediction.confidence,
      predictionModel: prediction.modelVersion,
      features: prediction.features,
    });

    return await this.predictionRepository.save(mlPrediction);
  }

  async getCategories(): Promise<TransactionCategory[]> {
    return await this.categoryRepository.find();
  }

  async getTransactionPredictions(userId: string): Promise<TransactionMLPrediction[]> {
    return await this.predictionRepository
      .createQueryBuilder('prediction')
      .innerJoin('transaction', 't', 't.id = prediction.transactionId')
      .where('t.userId = :userId', { userId })
      .getMany();
  }
}