import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { IsString, IsBoolean, IsOptional, IsEnum, IsHexColor } from 'class-validator';
import { Transaction } from './transaction.entity';

export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Entity('categories')
@Tree('nested-set')
@Index(['type', 'status'])
@Index(['parentId', 'status'])
@Index(['slug'], { unique: true })
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @IsString()
  slug: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({
    type: 'enum',
    enum: CategoryType,
  })
  @IsEnum(CategoryType)
  type: CategoryType;

  @Column({
    type: 'enum',
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  @IsEnum(CategoryStatus)
  status: CategoryStatus;

  @Column({ type: 'varchar', length: 7, nullable: true })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  icon?: string;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isDefault: boolean;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isSystem: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  rules?: {
    keywords?: string[];
    merchantPatterns?: string[];
    amountRanges?: {
      min?: number;
      max?: number;
    }[];
    autoAssign?: boolean;
    confidence?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    budgetEnabled?: boolean;
    monthlyLimit?: number;
    goalAmount?: number;
    taxDeductible?: boolean;
    businessExpense?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Tree relations
  @TreeChildren({ cascade: true })
  children: Category[];

  @TreeParent({ onDelete: 'CASCADE' })
  parent: Category;

  @Column({ type: 'uuid', nullable: true })
  parentId: string;

  // Transaction relations
  @OneToMany(() => Transaction, (transaction) => transaction.category)
  transactions: Transaction[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === CategoryStatus.ACTIVE;
  }

  get hasChildren(): boolean {
    return this.children && this.children.length > 0;
  }

  get isTopLevel(): boolean {
    return !this.parentId;
  }

  get fullPath(): string {
    // This would need to be computed with a proper tree query
    // For now, just return the name
    return this.name;
  }

  get transactionCount(): number {
    return this.transactions?.length || 0;
  }

  // Static methods for default categories
  static getDefaultCategories(): Partial<Category>[] {
    return [
      // Income categories
      {
        name: 'Salary',
        slug: 'income-salary',
        type: CategoryType.INCOME,
        color: '#22c55e',
        icon: 'briefcase',
        isDefault: true,
        isSystem: true,
      },
      {
        name: 'Freelance',
        slug: 'income-freelance',
        type: CategoryType.INCOME,
        color: '#22c55e',
        icon: 'laptop',
        isDefault: true,
        isSystem: true,
      },
      {
        name: 'Investments',
        slug: 'income-investments',
        type: CategoryType.INCOME,
        color: '#22c55e',
        icon: 'trending-up',
        isDefault: true,
        isSystem: true,
      },

      // Expense categories
      {
        name: 'Food & Dining',
        slug: 'expense-food-dining',
        type: CategoryType.EXPENSE,
        color: '#ef4444',
        icon: 'utensils',
        isDefault: true,
        isSystem: true,
      },
      {
        name: 'Transportation',
        slug: 'expense-transportation',
        type: CategoryType.EXPENSE,
        color: '#ef4444',
        icon: 'car',
        isDefault: true,
        isSystem: true,
      },
      {
        name: 'Shopping',
        slug: 'expense-shopping',
        type: CategoryType.EXPENSE,
        color: '#ef4444',
        icon: 'shopping-bag',
        isDefault: true,
        isSystem: true,
      },
      {
        name: 'Entertainment',
        slug: 'expense-entertainment',
        type: CategoryType.EXPENSE,
        color: '#ef4444',
        icon: 'film',
        isDefault: true,
        isSystem: true,
      },
      {
        name: 'Bills & Utilities',
        slug: 'expense-bills-utilities',
        type: CategoryType.EXPENSE,
        color: '#ef4444',
        icon: 'receipt',
        isDefault: true,
        isSystem: true,
      },
      {
        name: 'Healthcare',
        slug: 'expense-healthcare',
        type: CategoryType.EXPENSE,
        color: '#ef4444',
        icon: 'heart',
        isDefault: true,
        isSystem: true,
      },

      // Transfer categories
      {
        name: 'Account Transfer',
        slug: 'transfer-account',
        type: CategoryType.TRANSFER,
        color: '#3b82f6',
        icon: 'repeat',
        isDefault: true,
        isSystem: true,
      },
    ];
  }
}