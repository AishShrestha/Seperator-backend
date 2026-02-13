import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

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
}
