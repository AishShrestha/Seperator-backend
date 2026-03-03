import { IsNotEmpty, IsString } from 'class-validator';

export class AttachPaymentMethodDto {
  /** Stripe PaymentMethod ID (pm_xxx) - created by frontend via Stripe Elements */
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}
