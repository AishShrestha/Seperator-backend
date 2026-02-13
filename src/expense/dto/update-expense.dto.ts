import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SplitType } from '../enums/split-type.enum';
import { PaymentItemDto } from './payment-item.dto';
import { SharePercentageItemDto } from './share-percentage-item.dto';
import { ShareExactItemDto } from './share-exact-item.dto';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'total_amount must be greater than 0' })
  total_amount: number;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsEnum(SplitType)
  split_type: SplitType;

  /** Required for all split types: who paid how much; must sum to total_amount. */
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one payment is required' })
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  payments: PaymentItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SharePercentageItemDto)
  share_percentages?: SharePercentageItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShareExactItemDto)
  share_exact?: ShareExactItemDto[];
}
