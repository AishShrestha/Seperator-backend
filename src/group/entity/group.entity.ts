import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Expense } from '../../expense/entity/expense.entity';
import { User } from '../../user/entity/user.entity';
import { Notification } from '../../notification/entity/notification.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', unique: true })
  invite_code: string;

  @OneToMany(() => Expense, (expense) => expense.group)
  expenses: Expense[];

  @ManyToMany(() => User, (user) => user.groups)
  @JoinTable({ name: 'group_users' })
  users: User[];

  @OneToMany(() => Notification, (notification) => notification.group)
  notifications: Notification[];
}
