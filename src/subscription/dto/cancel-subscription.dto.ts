import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CancelSubscriptionDto {
  /** If true, cancel at period end. If false, cancel immediately. Default: true */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  atPeriodEnd?: boolean = true;
}
