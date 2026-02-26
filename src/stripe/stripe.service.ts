/**
 * Stripe Service
 *
 * Syncs subscription plans (products + prices) with Stripe.
 * Used by sync flow: Config → DB → Stripe.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeConfig } from '../services/app-config/configTypes';

/** Parameters for ensuring a Stripe product and price exist */
export interface EnsureProductAndPriceParams {
  productName: string;
  planSlug: string;
  amount: number; // in cents (e.g. 999 = $9.99)
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  existingProductId?: string | null; // from DB; used to avoid duplicate products
  existingPriceId?: string | null; // from DB; validated or replaced if mismatch
}

/** Result of ensureProductAndPrice - Stripe IDs to persist in DB */
export interface EnsureProductAndPriceResult {
  productId: string;
  priceId: string;
}

/**
 * Stripe integration service.
 * Handles product/price sync for subscription plans (config-first flow).
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;

  /** Initializes Stripe client from config if STRIPE_SECRET_KEY is set */
  constructor(private readonly configService: ConfigService) {
    const stripeConfig = this.configService.get<StripeConfig>('stripe');
    console.log("stripe configuration",stripeConfig)
    const secretKey = stripeConfig?.secretKey;
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });
    }
  }

  /**
   * Ensures a Stripe product and price exist for the given plan.
   * Idempotent: reuses existing product/price when they match config.
   * Stripe prices are immutable; creates a new price if amount/currency/interval change.
   *
   * @returns productId and priceId to store in plans table
   */
  async ensureProductAndPrice(
    params: EnsureProductAndPriceParams,
  ): Promise<EnsureProductAndPriceResult> {
    
    this.assertStripeConfigured();

    const interval = params.billingCycle === 'monthly' ? 'month' : 'year';
    const productId = await this.resolveOrCreateProduct(params);
    const priceId = await this.resolveOrCreatePrice({
      productId,
      planSlug: params.planSlug,
      amount: params.amount,
      currency: params.currency,
      interval,
      existingPriceId: params.existingPriceId,
    });

    return { productId, priceId };
  }

  /** Throws if Stripe client is not initialized (missing STRIPE_SECRET_KEY) */
  private assertStripeConfigured(): void {
    
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
    }
  }

  /**
   * Resolves product: by existing ID, by plan_slug metadata, or creates new.
   * Order: DB ID → Stripe search → create
   */
  private async resolveOrCreateProduct(
    params: EnsureProductAndPriceParams,
  ): Promise<string> {
    if (params.existingProductId) {
      const product = await this.stripe!.products.retrieve(
        params.existingProductId,
      );
      return product.id;
    }

    const existing = await this.findProductByPlanSlug(params.planSlug);
    if (existing) return existing.id;

    return this.createProduct(params.productName, params.planSlug);
  }

  /** Searches Stripe products by metadata.plan_slug */
  private async findProductByPlanSlug(planSlug: string): Promise<Stripe.Product | null> {
    const { data } = await this.stripe!.products.search({
      query: `metadata['plan_slug']:'${planSlug}'`,
    });
    return data[0] ?? null;
  }

  /** Creates a new Stripe product with plan_slug in metadata */
  private async createProduct(
    name: string,
    planSlug: string,
  ): Promise<string> {
    const product = await this.stripe!.products.create({
      name,
      metadata: { plan_slug: planSlug },
    });
    this.logger.log(`Created Stripe product: ${product.id} for ${planSlug}`);
    return product.id;
  }

  /**
   * Resolves price: validates existing, or finds matching, or creates new.
   * If existingPriceId doesn't match config, creates new (Stripe prices are immutable).
   */
  private async resolveOrCreatePrice(params: {
    productId: string;
    planSlug: string;
    amount: number;
    currency: string;
    interval: 'month' | 'year';
    existingPriceId?: string | null;
  }): Promise<string> {
    if (params.existingPriceId) {
      const price = await this.stripe!.prices.retrieve(params.existingPriceId);
      if (this.isPriceMatching(price, params)) return price.id;
      this.logger.log(
        `Price mismatch for ${params.planSlug}: creating new recurring price`,
      );
    }

    const existingPrice = await this.findMatchingPrice(params);
    if (existingPrice) return existingPrice.id;

    return this.createRecurringPrice(params);
  }

  /** Checks if a Stripe price matches expected amount, currency, and interval */
  private isPriceMatching(
    price: Stripe.Price,
    params: { amount: number; currency: string; interval: string },
  ): boolean {
    return (
      (price.unit_amount ?? 0) === params.amount &&
      price.currency === params.currency &&
      price.recurring?.interval === params.interval
    );
  }

  /** Lists product prices and returns first match for amount/currency/interval */
  private async findMatchingPrice(params: {
    productId: string;
    amount: number;
    currency: string;
    interval: string;
  }): Promise<Stripe.Price | null> {
    const { data } = await this.stripe!.prices.list({
      product: params.productId,
      active: true,
    });
    return (
      data.find((p) =>
        this.isPriceMatching(p, {
          amount: params.amount,
          currency: params.currency,
          interval: params.interval,
        }),
      ) ?? null
    );
  }

  /** Creates a new recurring price (month or year interval) */
  private async createRecurringPrice(params: {
    productId: string;
    planSlug: string;
    amount: number;
    currency: string;
    interval: 'month' | 'year';
  }): Promise<string> {
    const price = await this.stripe!.prices.create({
      product: params.productId,
      unit_amount: params.amount,
      currency: params.currency,
      recurring: { interval: params.interval },
    });
    this.logger.log(`Created Stripe price: ${price.id} for ${params.planSlug}`);
    return price.id;
  }

  /** Returns true if Stripe client is initialized (STRIPE_SECRET_KEY set) */
  isConfigured(): boolean {
    return this.stripe !== null;
  }
}
