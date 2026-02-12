import { Module } from '@nestjs/common';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { Group } from './entity/group.entity';
import { GroupMember } from './entity/group-member.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupRolesGuard } from './guards/group-roles.guard';
import { Expense } from '../expense/entity/expense.entity';
import { ExpenseShare } from '../expense/entity/expenseShare.entity';
import { ExpensePayment } from '../expense/entity/expensePayment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, Expense, ExpenseShare, ExpensePayment]),
  ],
  controllers: [GroupController],
  providers: [GroupService, GroupRolesGuard],
  exports: [GroupService, GroupRolesGuard, TypeOrmModule],
})
export class GroupModule {}
