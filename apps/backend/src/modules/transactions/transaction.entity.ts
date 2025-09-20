import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Account } from '../auth/account.entity';
import { TransactionType } from '@money-wise/types';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  accountId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column()
  category: string;

  @Column({ nullable: true })
  subcategory: string;

  @Column()
  description: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ nullable: true })
  merchantName: string;

  @Column({ default: false })
  isRecurring: boolean;

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column('text', { array: true, default: [] })
  attachments: string[];

  // Multi-currency support fields
  @Column({ default: 'USD', length: 3 })
  originalCurrency: string;

  @Column('decimal', { precision: 15, scale: 8, default: 1.0 })
  exchangeRate: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  originalAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.transactions)
  user: User;

  @ManyToOne(() => Account, account => account.transactions)
  account: Account;
}
