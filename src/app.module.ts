import { MiddlewareConsumer, Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { getConfig } from './services/app-config/configuration';
import { AppCacheModule } from './app-cache/app-cache.module';
import { LoggerModule } from './logger/logger.module';
import { AsyncStorageMiddleware } from './global/middleware/async-storage/async-storage.middleware';
import { GlobalModule } from './global/global.module';
import { HealthModule } from './health/health.module';
import { GroupModule } from './group/group.module';
import { ExpenseModule } from './expense/expense.module';
import { SettlementModule } from './settlement/settlement.module';
import { NotificationModule } from './notification/notification.module';
import { PlanModule } from './plan/plan.module';
import { StripeModule } from './stripe/stripe.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    GlobalModule,
    ConfigModule.forRoot({
      cache: true,
      load: [getConfig],
    }),
    DbModule,
    AppCacheModule,
    UserModule,
    ConfigModule,
    LoggerModule,
    HealthModule,
    GroupModule,
    ExpenseModule,
    SettlementModule,
    NotificationModule,
    PlanModule,
    StripeModule,
    SyncModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AsyncStorageMiddleware).forRoutes('{*splat}');
  }
}
