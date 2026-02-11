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
import { ExpenseCategory } from './expenseCategory.entity';
import { SplitType } from '../enums/split-type.enum';

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

  @ManyToOne(() => ExpenseCategory, (category) => category.expenses, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: ExpenseCategory;

  @Column({ type: 'uuid', nullable: true })
  category_id: string;

  @Column({
    type: 'enum',
    enum: SplitType,
    default: SplitType.EQUAL,
  })
  split_type: SplitType;

  @OneToMany(() => ExpensePayment, (payment) => payment.expense)
  payments: ExpensePayment[];

  @OneToMany(() => ExpenseShare, (share) => share.expense)
  shares: ExpenseShare[];

  @OneToMany(() => Notification, (notification) => notification.expense)
  notifications: Notification[];
}
