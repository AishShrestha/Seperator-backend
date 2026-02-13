import { IsNumber, IsUUID, Min } from 'class-validator';

export class ShareExactItemDto {
  @IsUUID()
  user_id: string;

  @IsNumber()
  @Min(0, { message: 'amount must be 0 or greater' })
  amount: number;
}
