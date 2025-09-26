import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Account } from './account.entity';
import { Category } from './category.entity';

export enum TransactionStatus {
  PENDING = 'pending',
  POSTED = 'posted',
  CLEARED = 'cleared',
  CANCELLED = 'cancelled',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'date' })
  transactionDate: Date;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.POSTED,
  })
  status: TransactionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // External integrations
  @Column({ type: 'varchar', length: 255, nullable: true })
  plaidTransactionId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  merchantName: string | null;

  @Column({ type: 'json', nullable: true })
  plaidMetadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Foreign keys
  @Column('uuid')
  accountId: string;

  @Column('uuid')
  categoryId: string;

  // Relationships
  @ManyToOne(() => Account, (account) => account.transactions)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @ManyToOne(() => Category, (category) => category.transactions)
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}