import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Transaction } from '../../transactions/transaction.entity';
import { TransactionCategory } from './transaction-category.entity';
import { MLFeatures } from '@money-wise/types';

@Entity('transaction_ml_predictions')
@Index(['transactionId'])
@Index(['predictedCategoryId'])
@Index(['isUserCorrected'])
@Index(['createdAt'])
export class TransactionMLPrediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  transactionId: string;

  @Column()
  predictedCategoryId: string;

  @Column('decimal', { precision: 3, scale: 2 })
  confidenceScore: number;

  @Column({ default: 'v1.0' })
  predictionModel: string;

  @Column({ default: false })
  isUserCorrected: boolean;

  @Column({ nullable: true })
  userCategoryId: string;

  @Column('jsonb')
  features: MLFeatures;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Transaction, transaction => transaction.id)
  transaction: Transaction;

  @ManyToOne(() => TransactionCategory, category => category.predictions)
  predictedCategory: TransactionCategory;

  @ManyToOne(() => TransactionCategory, category => category.userCorrections, {
    nullable: true,
  })
  userCategory: TransactionCategory;
}
