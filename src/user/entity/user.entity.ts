import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Expense } from '../../expense/entity/expense.entity';
import { ExpensePayment } from '../../expense/entity/expensePayment.entity';
import { ExpenseShare } from '../../expense/entity/expenseShare.entity';
import { Notification } from '../../notification/entity/notification.entity';
import { GroupMember } from '../../group/entity/group-member.entity';
import { UserRole } from '../enums/user-role.enum';

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
    name: 'role',
    type: 'varchar',
    length: 20,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    name: 'password',
    select: false,
  })
  password: string;

  @Column({
    name: 'avatar',
    nullable: true,
  })
  avatar: string;

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

  @Column({
    name: 'password_reset_token',
    type: 'varchar', 
    nullable: true,
    select: false,
  })
  passwordResetToken: string | null;
  
  @Column({
    name: 'password_reset_token_expires_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  passwordResetTokenExpiresAt: Date | null;

  @OneToMany(() => Expense, (expense) => expense.created_by_user)
  created_expenses: Expense[];

  @OneToMany(() => GroupMember, (membership) => membership.user)
  groupMemberships: GroupMember[];

  @OneToMany(() => ExpensePayment, (payment) => payment.user)
  expense_payments: ExpensePayment[];

  @OneToMany(() => ExpenseShare, (share) => share.user)
  expense_shares: ExpenseShare[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}
