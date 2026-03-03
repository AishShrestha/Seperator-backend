import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionHistory } from './entity/subscription-history.entity';
import { SubscriptionHistoryService } from './subscription-history.service';

/**
 * Standalone module for subscription history tracking.
 * No dependencies on User/Subscription modules to avoid circular imports.
 */
@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionHistory])],
  providers: [SubscriptionHistoryService],
  exports: [SubscriptionHistoryService],
})
export class SubscriptionHistoryModule {}
