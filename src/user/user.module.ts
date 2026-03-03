import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { AuthService } from './services/auth/auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { UserService } from './services/user/user.service';
import { PasswordService } from './services/password/password.service';
import { JwtService } from './services/jwt/jwt.service';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './services/auth/strategies/jwt/jwt.strategy';
import { AppCacheModule } from '../app-cache/app-cache.module';
import { PlanModule } from '../plan/plan.module';
import { StripeModule } from '../stripe/stripe.module';
import { RegistrationService } from './services/registration/registration.service';
import { Subscription } from '../subscription/entity/subscription.entity';
import { SubscriptionHistoryModule } from '../subscription/subscription-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Subscription]),
    ConfigModule,
    AppCacheModule,
    PlanModule,
    StripeModule,
    SubscriptionHistoryModule,
  ],
  controllers: [UserController],
  providers: [AuthService, UserService, PasswordService, JwtService, JwtStrategy, RegistrationService],
  exports: [UserService],
})
export class UserModule {}
