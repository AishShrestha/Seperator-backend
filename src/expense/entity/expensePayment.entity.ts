import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Expense } from './expense.entity';
import { User } from '../../user/entity/user.entity';

@Entity('expense_payments')
export class ExpensePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Expense, (expense) => expense.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expense_id' })
  expense: Expense;

  @Column({ type: 'uuid' })
  expense_id: string;

  @ManyToOne(() => User, (user) => user.expense_payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount_paid: number;
}
