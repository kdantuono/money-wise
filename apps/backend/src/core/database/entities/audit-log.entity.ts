import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditEventType {
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGIN_LOCKED = 'login_locked',
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_DELETED = 'account_deleted',
  ACCOUNT_SUSPENDED = 'account_suspended',
  ACCOUNT_REACTIVATED = 'account_reactivated',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
}

@Entity('audit_logs')
@Index(['userId', 'eventType', 'createdAt'])
@Index(['eventType', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({
    type: 'enum',
    enum: AuditEventType,
  })
  eventType: AuditEventType;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    passwordStrength?: number;
    failureReason?: string;
    lockoutDuration?: number;
    resetTokenExpiry?: string;
    [key: string]: unknown;
  };

  @Column({ type: 'boolean', default: false })
  isSecurityEvent: boolean;

  @CreateDateColumn()
  createdAt: Date;
}