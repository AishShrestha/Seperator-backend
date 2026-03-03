import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionWebhookLog } from '../subscription/entity/subscription-webhook-log.entity';
import { Subscription } from '../subscription/entity/subscription.entity';
import { User } from '../user/entity/user.entity';
import { Plan } from '../plan/entity/plan.entity';
import { SubscriptionHistoryModule } from '../subscription/subscription-history.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      SubscriptionWebhookLog,
      Subscription,
      User,
      Plan,
    ]),
    SubscriptionHistoryModule,
  ],
  controllers: [StripeController],
  providers: [StripeService, StripeWebhookService],
  exports: [StripeService],
})
export class StripeModule {}
