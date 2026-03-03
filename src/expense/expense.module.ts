import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entity/expense.entity';
import { ExpensePayment } from './entity/expensePayment.entity';
import { ExpenseShare } from './entity/expenseShare.entity';
import { ExpenseCategory } from './entity/expenseCategory.entity';
import { Group } from '../group/entity/group.entity';
import { GroupMember } from '../group/entity/group-member.entity';
import { PlanLimitModule } from '../plan-limit/plan-limit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Expense,
      ExpensePayment,
      ExpenseShare,
      ExpenseCategory,
      Group,
      GroupMember,
    ]),
    PlanLimitModule,
  ],
  controllers: [ExpenseController],
  providers: [ExpenseService],
})
export class ExpenseModule {}
