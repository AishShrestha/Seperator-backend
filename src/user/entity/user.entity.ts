import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany } from 'typeorm';
import { Expense } from '../../expense/entity/expense.entity';
import { Group } from '../../group/entity/group.entity';
import { ExpensePayment } from '../../expense/entity/expensePayment.entity';
import { ExpenseShare } from '../../expense/entity/expenseShare.entity';
import { Notification } from '../../notification/entity/notification.entity';

@Entity({
  name: 'users',
})
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({
    name: 'password',
    select: false,
  })
  password: string;

  @Column({
    name: 'refresh_token',
    nullable: true,
    select: false,
  })
  refreshToken: string;

  @Column({
    name: 'refresh_token_expires_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  refreshTokenExpiresAt: Date;

  @OneToMany(() => Expense, (expense) => expense.created_by_user)
  created_expenses: Expense[];

  @ManyToMany(() => Group, (group) => group.users)
  groups: Group[];

  @OneToMany(() => ExpensePayment, (payment) => payment.user)
  expense_payments: ExpensePayment[];

  @OneToMany(() => ExpenseShare, (share) => share.user)
  expense_shares: ExpenseShare[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}
