import { IsNumber, IsUUID, Min, Max } from 'class-validator';

export class SharePercentageItemDto {
  @IsUUID()
  user_id: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}
