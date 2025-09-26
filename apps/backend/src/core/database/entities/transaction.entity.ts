import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { IsString, IsNumber, IsEnum, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { Account } from './account.entity';
import { Category } from './category.entity';

export enum TransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum TransactionStatus {
  PENDING = 'pending',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

export enum TransactionSource {
  PLAID = 'plaid',
  MANUAL = 'manual',
  IMPORT = 'import',
}

@Entity('transactions')
@Index(['accountId', 'date'])
@Index(['categoryId', 'date'])
@Index(['status', 'date'])
@Index(['plaidTransactionId'], { unique: true, where: 'plaid_transaction_id IS NOT NULL' })
@Index(['amount', 'date'])
@Index(['merchantName', 'date'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  accountId: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  @IsNumber()
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  @IsEnum(TransactionType)
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.POSTED,
  })
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @Column({
    type: 'enum',
    enum: TransactionSource,
  })
  @IsEnum(TransactionSource)
  source: TransactionSource;

  @Column({ type: 'date' })
  @IsDateString()
  date: Date;

  @Column({ type: 'timestamp', nullable: true })
  authorizedDate?: Date;

  @Column({ type: 'varchar', length: 500 })
  @IsString()
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  merchantName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  originalDescription?: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  @IsString()
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  reference?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  checkNumber?: string;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isPending: boolean;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isRecurring: boolean;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isHidden: boolean;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  includeInBudget: boolean;

  // Plaid-specific fields
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'plaid_transaction_id' })
  @IsOptional()
  @IsString()
  plaidTransactionId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'plaid_account_id' })
  @IsOptional()
  @IsString()
  plaidAccountId?: string;

  @Column({ type: 'jsonb', nullable: true })
  plaidMetadata?: {
    categoryId?: string[];
    categoryConfidenceLevel?: string;
    transactionCode?: string;
    transactionType?: string;
    locationId?: string;
    merchantEntityId?: string;
    paymentChannel?: string;
    authorizedDateTime?: string;
    personalFinanceCategory?: {
      primary?: string;
      detailed?: string;
      confidence_level?: string;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  location?: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    lat?: number;
    lon?: number;
    storeNumber?: string;
  };

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  attachments?: {
    id: string;
    filename: string;
    mimetype: string;
    size: number;
    url: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  splitDetails?: {
    isParent?: boolean;
    parentId?: string;
    splits?: {
      amount: number;
      categoryId?: string;
      description?: string;
    }[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Account, (account) => account.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @ManyToOne(() => Category, (category) => category.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  category?: Category;

  // Virtual properties
  get isExpense(): boolean {
    return this.type === TransactionType.DEBIT && this.amount > 0;
  }

  get isIncome(): boolean {
    return this.type === TransactionType.CREDIT && this.amount > 0;
  }

  get displayAmount(): number {
    // For expense transactions, show as negative
    if (this.type === TransactionType.DEBIT) {
      return -Math.abs(this.amount);
    }
    return Math.abs(this.amount);
  }

  get formattedAmount(): string {
    const absAmount = Math.abs(this.amount);
    const sign = this.type === TransactionType.DEBIT ? '-' : '+';
    return `${sign}$${absAmount.toFixed(2)}`;
  }

  get displayDescription(): string {
    return this.merchantName || this.description;
  }

  get isPlaidTransaction(): boolean {
    return this.source === TransactionSource.PLAID;
  }

  get isManualTransaction(): boolean {
    return this.source === TransactionSource.MANUAL;
  }

  get daysSinceTransaction(): number {
    const today = new Date();
    const transactionDate = new Date(this.date);
    const diffTime = Math.abs(today.getTime() - transactionDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get isSplit(): boolean {
    return this.splitDetails?.isParent || !!this.splitDetails?.parentId;
  }

  get needsCategorization(): boolean {
    return !this.categoryId && this.amount !== 0;
  }
}