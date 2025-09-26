import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Exclude } from 'class-transformer';
import { Account } from './account.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['status', 'createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @IsEmail()
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @MinLength(2)
  firstName: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @MinLength(2)
  lastName: string;

  @Column({ type: 'varchar', length: 255 })
  @Exclude()
  @MinLength(8)
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  @IsEnum(UserStatus)
  status: UserStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  avatar?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  @IsOptional()
  @IsString()
  timezone?: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  @IsString()
  currency: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      categories?: boolean;
      budgets?: boolean;
    };
  };

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Account, (account) => account.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  accounts: Account[];

  // Virtual properties
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null;
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }
}