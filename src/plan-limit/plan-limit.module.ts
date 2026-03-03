import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../expense/entity/expense.entity';
import { Group } from '../group/entity/group.entity';
import { GroupMember } from '../group/entity/group-member.entity';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PlanLimitService } from './plan-limit.service';
import { PlanLimitGuard } from './guards/plan-limit.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, Group, GroupMember]),
    SubscriptionModule,
  ],
  providers: [PlanLimitService, PlanLimitGuard],
  exports: [PlanLimitService, PlanLimitGuard],
})
export class PlanLimitModule {}
