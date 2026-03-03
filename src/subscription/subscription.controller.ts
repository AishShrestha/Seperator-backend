import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth/jwt-auth.guard';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { AttachPaymentMethodDto } from './dto/attach-payment-method.dto';

@ApiTags('subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('payment-methods')
  @ApiOperation({
    summary: 'Attach payment method (post-signup)',
    description:
      'Attach a payment method to the user\'s Stripe customer. Frontend creates PaymentMethod via Stripe Elements. Backend attaches it and sets as default for future invoices. Webhooks update subscription state.',
  })
  @ApiBody({ type: AttachPaymentMethodDto })
  async attachPaymentMethod(
    @Req() req: { user: { id: string } },
    @Body() dto: AttachPaymentMethodDto,
  ) {
    return this.subscriptionService.attachPaymentMethod(
      req.user.id,
      dto.paymentMethodId,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create subscription for a plan' })
  @ApiBody({ type: CreateSubscriptionDto })
  async create(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateSubscriptionDto,
  ) {
    const subscription = await this.subscriptionService.createSubscription(
      req.user.id,
      dto.planSlug,
      dto.paymentMethodId,
    );
    return {
      message: 'Subscription created successfully',
      subscription,
    };
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current active subscription' })
  async getCurrent(@Req() req: { user: { id: string } }) {
    const subscription = await this.subscriptionService.getCurrentSubscription(
      req.user.id,
    );
    return {
      message: 'Subscription retrieved successfully',
      subscription: subscription ?? null,
    };
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get subscription history',
    description:
      'Returns audit log of subscription events (created, plan changes, cancellations).',
  })
  async getHistory(@Req() req: { user: { id: string } }) {
    const history = await this.subscriptionService.getSubscriptionHistory(
      req.user.id,
    );
    return {
      message: 'Subscription history retrieved successfully',
      history,
    };
  }

  @Patch('plan')
  @ApiOperation({ summary: 'Upgrade or downgrade subscription plan' })
  @ApiBody({ type: ChangePlanDto })
  async changePlan(
    @Req() req: { user: { id: string } },
    @Body() dto: ChangePlanDto,
  ) {
    const subscription = await this.subscriptionService.changePlan(
      req.user.id,
      dto.planSlug,
    );
    return {
      message: 'Plan changed successfully',
      subscription,
    };
  }

  @Patch('cancel')
  @ApiOperation({ summary: 'Cancel subscription (immediate or at period end)' })
  @ApiBody({ type: CancelSubscriptionDto })
  async cancel(
    @Req() req: { user: { id: string } },
    @Body() dto: CancelSubscriptionDto,
  ) {
    const subscription = await this.subscriptionService.cancelSubscription(
      req.user.id,
      dto.atPeriodEnd ?? true,
    );
    return {
      message: dto.atPeriodEnd
        ? 'Subscription will cancel at period end'
        : 'Subscription canceled',
      subscription,
    };
  }
}
