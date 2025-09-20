import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';

import { User } from '../../auth/user.entity';

import { PlaidTransaction } from './plaid-transaction.entity';

@Entity('plaid_accounts')
@Index('idx_plaid_account_user', ['userId'])
@Index('idx_plaid_account_institution', ['institutionId'])
export class PlaidAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'plaid_account_id', unique: true })
  plaidAccountId: string;

  @Column({ name: 'plaid_item_id' })
  plaidItemId: string;

  @Column({ name: 'access_token' })
  accessToken: string;

  @Column({ name: 'institution_id' })
  institutionId: string;

  @Column({ name: 'institution_name' })
  institutionName: string;

  @Column({ name: 'account_name' })
  accountName: string;

  @Column({ name: 'account_type' })
  accountType: string;

  @Column({ name: 'account_subtype', nullable: true })
  accountSubtype: string;

  @Column({
    name: 'current_balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  currentBalance: number;

  @Column({
    name: 'available_balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  availableBalance: number;

  @Column({ name: 'currency_code', default: 'USD' })
  currencyCode: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_sync_at', type: 'timestamp', nullable: true })
  lastSyncAt: Date;

  @Column({ name: 'cursor', nullable: true })
  cursor: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.plaidAccounts)
  user: User;

  @OneToMany(() => PlaidTransaction, transaction => transaction.plaidAccount)
  transactions: PlaidTransaction[];
}
