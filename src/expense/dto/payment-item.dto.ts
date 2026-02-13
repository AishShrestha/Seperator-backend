import { IsNumber, IsUUID, Min } from 'class-validator';

export class PaymentItemDto {
  @IsUUID()
  user_id: string;

  @IsNumber()
  @Min(0.01, { message: 'amount_paid must be greater than 0' })
  amount_paid: number;
}
