import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class ErrorResponseDto {
  @IsNumber()
  statusCode: number;

  @IsString()
  message: string;

  @IsString()
  timestamp: string;

  /** Present when validation fails; lists each constraint violation (e.g. from ValidationPipe). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errors?: string[];

  /** Present when PLAN_LIMIT_REACHED; for upgrade prompts. */
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsBoolean()
  upgrade_required?: boolean;

  @IsOptional()
  @IsString()
  current_plan?: string;
}
