import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { HttpExceptionFilter } from './http-exception.filter';

@Catch(HttpException)
export class CustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    console.log('Filter triggered!');
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.message || 'An error occurred';
    this.logger.error(
      `Status: ${status} - Message: ${message}`,
      exception.stack,
    );
    const errorResponse = new ErrorResponseDto();
    errorResponse.statusCode = status;
    errorResponse.message = message;
    errorResponse.timestamp = new Date().toISOString();

    response.status(status).json(errorResponse);
  }
}
