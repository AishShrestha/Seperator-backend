import { Group } from '../../group/entity/group.entity';
import { User } from '../../user/entity/user.entity';
import { Notification } from '../../notification/entity/notification.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ExpensePayment } from './expensePayment.entity';
import { ExpenseShare } from './expenseShare.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  group_id: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  created_by_user: User;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Group, (group) => group.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @OneToMany(() => ExpensePayment, (payment) => payment.expense)
  payments: ExpensePayment[];

  @OneToMany(() => ExpenseShare, (share) => share.expense)
  shares: ExpenseShare[];

  @OneToMany(() => Notification, (notification) => notification.expense)
  notifications: Notification[];
}
