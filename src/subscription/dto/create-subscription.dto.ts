import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  planSlug: string;

  /** Required for paid plans. Optional for free plan. */
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}
