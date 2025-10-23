import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { Group } from '../../group/entity/group.entity';
import { Expense } from '../../expense/entity/expense.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 50, default: 'info' })
  type: string;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @ManyToOne(() => Group, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'group_id' })
  group?: Group;

  @Column({ type: 'uuid', nullable: true })
  group_id?: string;

  @ManyToOne(() => Expense, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'expense_id' })
  expense?: Expense;

  @Column({ type: 'uuid', nullable: true })
  expense_id?: string;

  @CreateDateColumn()
  created_at: Date;
}
