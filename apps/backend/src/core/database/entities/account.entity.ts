import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { IsEnum, IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  INVESTMENT = 'investment',
  LOAN = 'loan',
  MORTGAGE = 'mortgage',
  OTHER = 'other',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CLOSED = 'closed',
  ERROR = 'error',
}

export enum AccountSource {
  PLAID = 'plaid',
  MANUAL = 'manual',
}

@Entity('accounts')
@Index(['userId', 'status'])
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  name: string;

  @Column({
    type: 'enum',
    enum: AccountType,
  })
  @IsEnum(AccountType)
  type: AccountType;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  @IsEnum(AccountStatus)
  status: AccountStatus;

  @Column({
    type: 'enum',
    enum: AccountSource,
  })
  @IsEnum(AccountSource)
  source: AccountSource;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value)
    }
  })
  @IsNumber()
  currentBalance: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => value ? parseFloat(value) : null
    }
  })
  @IsOptional()
  @IsNumber()
  availableBalance?: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => value ? parseFloat(value) : null
    }
  })
  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  @IsString()
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  institutionName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  routingNumber?: string;

  // Plaid-specific fields
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'plaid_account_id' })
  @IsOptional()
  @IsString()
  plaidAccountId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'plaid_item_id' })
  @IsOptional()
  @IsString()
  plaidItemId?: string;

  @Column({ type: 'text', nullable: true, name: 'plaid_access_token' })
  @IsOptional()
  @IsString()
  plaidAccessToken?: string;

  @Column({ type: 'jsonb', nullable: true })
  plaidMetadata?: {
    mask?: string;
    subtype?: string;
    officialName?: string;
    persistentAccountId?: string;
  };

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  syncEnabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  syncError?: string;

  @Column({ type: 'jsonb', nullable: true })
  settings?: {
    autoSync?: boolean;
    syncFrequency?: 'daily' | 'hourly' | 'manual';
    notifications?: boolean;
    budgetIncluded?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.accounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Transaction, (transaction) => transaction.account, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  transactions: Transaction[];

  // Virtual properties
  get isPlaidAccount(): boolean {
    return this.source === AccountSource.PLAID;
  }

  get isManualAccount(): boolean {
    return this.source === AccountSource.MANUAL;
  }

  get needsSync(): boolean {
    if (!this.syncEnabled || !this.isPlaidAccount) return false;
    if (!this.lastSyncAt) return true;

    const hoursSinceSync = (Date.now() - this.lastSyncAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync >= 1; // Sync if more than 1 hour old
  }

  get displayName(): string {
    if (this.institutionName) {
      return `${this.institutionName} - ${this.name}`;
    }
    return this.name;
  }

  get maskedAccountNumber(): string {
    if (!this.accountNumber) return '';
    const last4 = this.accountNumber.slice(-4);
    return `****${last4}`;
  }
}