import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CreateSettlementDto {
  @IsUUID()
  @IsNotEmpty()
  group_id: string;

  @IsUUID()
  @IsNotEmpty()
  payee_id: string;


  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsNumber()
  @Min(0.01, { message: 'amount must be greater than 0' })
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
