import {
  Controller,
  Post,
  Req,
  RawBodyRequest,
  Headers,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeConfig } from '../services/app-config/configTypes';

/**
 * Stripe webhook controller. Uses raw body - configure raw body middleware
 * for this route in main.ts before json() middleware.
 */
@ApiExcludeController()
@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly webhookService: StripeWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('Webhook received without raw body - ensure raw body middleware is configured');
      throw new BadRequestException('Webhook requires raw body');
    }

    const stripeConfig = this.configService.get<StripeConfig>('stripe');
    const webhookSecret = stripeConfig?.webhookSecret;
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      throw new BadRequestException('Webhook not configured');
    }

    let event: Stripe.Event;
    try {
      event = Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Webhook signature verification failed: ${message}`);
      throw new BadRequestException(`Webhook signature verification failed: ${message}`);
    }

    await this.webhookService.handleEvent(event);
    return { received: true };
  }
}
