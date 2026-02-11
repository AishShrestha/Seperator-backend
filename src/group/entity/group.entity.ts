import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Expense } from '../../expense/entity/expense.entity';
import { Notification } from '../../notification/entity/notification.entity';
import { GroupMember } from './group-member.entity';

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

  @OneToMany(() => GroupMember, (member) => member.group)
  members: GroupMember[];

  @OneToMany(() => Notification, (notification) => notification.group)
  notifications: Notification[];
}
