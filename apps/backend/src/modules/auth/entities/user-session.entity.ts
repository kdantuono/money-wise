import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../user.entity';

@Entity('user_sessions')
@Index(['sessionToken'], { unique: true })
@Index(['userId', 'isActive'])
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ unique: true })
  sessionToken: string;

  @Column({ nullable: true })
  deviceFingerprint: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  location: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  lastActivityAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, user => user.sessions)
  @JoinColumn({ name: 'userId' })
  user: User;
}
