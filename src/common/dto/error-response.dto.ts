import { IsNumber, IsString } from 'class-validator';

export class ErrorResponseDto {
  @IsNumber()
  statusCode: number;

  @IsString()
  message: string;

  @IsString()
  timestamp: string;
}
