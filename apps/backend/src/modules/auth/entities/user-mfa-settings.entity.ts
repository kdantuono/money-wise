import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user.entity';

@Entity('user_mfa_settings')
export class UserMfaSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ nullable: true, type: 'text' })
  totpSecret: string;

  @Column({ type: 'jsonb', nullable: true })
  backupCodes: string[];

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  recoveryEmail: string;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, user => user.mfaSettings)
  @JoinColumn({ name: 'userId' })
  user: User;
}
