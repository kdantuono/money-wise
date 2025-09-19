import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { TransactionMLPrediction } from './transaction-ml-prediction.entity';
import { User } from '../../auth/user.entity';

@Entity('transaction_categories')
export class TransactionCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  parentCategoryId: string;

  @Column({ length: 7, default: '#6b7280' })
  colorCode: string;

  @Column({ default: '📄' })
  icon: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isSystemCategory: boolean;

  @Column({ nullable: true })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  user: User;

  @ManyToOne(() => TransactionCategory, category => category.subCategories, { nullable: true })
  parentCategory: TransactionCategory;

  @OneToMany(() => TransactionCategory, category => category.parentCategory)
  subCategories: TransactionCategory[];

  @OneToMany(() => TransactionMLPrediction, prediction => prediction.predictedCategory)
  predictions: TransactionMLPrediction[];

  @OneToMany(() => TransactionMLPrediction, prediction => prediction.userCategory)
  userCorrections: TransactionMLPrediction[];
}