import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entity/expense.entity';
import { ExpensePayment } from './entity/expensePayment.entity';
import { ExpenseShare } from './entity/expenseShare.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, ExpensePayment, ExpenseShare])],
  controllers: [ExpenseController],
  providers: [ExpenseService],
})
export class ExpenseModule {}
