import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Budget } from '../budgets/budget.entity';
import { Account } from './account.entity';
import { PlaidAccount } from '../banking/entities/plaid-account.entity';
import { UserMfaSettings } from './entities/user-mfa-settings.entity';
import { UserSession } from './entities/user-session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 'USD', length: 3 })
  preferredCurrency: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Transaction, transaction => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => Budget, budget => budget.user)
  budgets: Budget[];

  @OneToMany(() => Account, account => account.user)
  accounts: Account[];

  @OneToMany(() => PlaidAccount, plaidAccount => plaidAccount.user)
  plaidAccounts: PlaidAccount[];

  @OneToOne(() => UserMfaSettings, mfaSettings => mfaSettings.user)
  mfaSettings: UserMfaSettings;

  @OneToMany(() => UserSession, session => session.user)
  sessions: UserSession[];
}