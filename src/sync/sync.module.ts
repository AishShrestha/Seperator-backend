import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { PlanModule } from '../plan/plan.module';
import { StripeModule } from '../stripe/stripe.module';
import { AdminGuard } from '../common/guards/admin.guard';

@Module({
  imports: [PlanModule, StripeModule],
  controllers: [SyncController],
  providers: [SyncService, AdminGuard],
})
export class SyncModule {}
