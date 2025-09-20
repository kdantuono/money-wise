import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';

import { PlaidAccount } from './plaid-account.entity';

@Entity('plaid_transactions')
@Index('idx_plaid_transaction_account', ['plaidAccountId'])
@Index('idx_plaid_transaction_date', ['date'])
@Index('idx_plaid_transaction_plaid_id', ['plaidTransactionId'])
export class PlaidTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plaid_account_id', type: 'uuid' })
  plaidAccountId: string;

  @Column({ name: 'plaid_transaction_id', unique: true })
  plaidTransactionId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'authorized_date', type: 'date', nullable: true })
  authorizedDate: Date;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'merchant_name', nullable: true })
  merchantName: string;

  @Column({ name: 'account_owner', nullable: true })
  accountOwner: string;

  @Column({ type: 'jsonb', nullable: true })
  category: string[];

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ name: 'subcategory', type: 'jsonb', nullable: true })
  subcategory: string[];

  @Column({ name: 'transaction_type', nullable: true })
  transactionType: string;

  @Column({ name: 'transaction_code', nullable: true })
  transactionCode: string;

  @Column({ name: 'iso_currency_code', default: 'USD' })
  isoCurrencyCode: string;

  @Column({ name: 'unofficial_currency_code', nullable: true })
  unofficialCurrencyCode: string;

  @Column({ name: 'is_pending', default: false })
  isPending: boolean;

  @Column({ type: 'jsonb', nullable: true })
  location: Record<string, any>;

  @Column({ name: 'payment_meta', type: 'jsonb', nullable: true })
  paymentMeta: Record<string, any>;

  @Column({ name: 'personal_finance_category', type: 'jsonb', nullable: true })
  personalFinanceCategory: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => PlaidAccount, account => account.transactions)
  plaidAccount: PlaidAccount;
}
