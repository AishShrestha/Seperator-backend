import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.message;
    console.log(`Filter triggered: ${status} - ${message}`);
    // Log the error details
    this.logger.error(
      `Status: ${status} - Message: ${message}`,
      exception.stack,
    );

    console.log('Error logged');

    const errorResponse = new ErrorResponseDto();
    errorResponse.statusCode = status;
    errorResponse.message = message || 'Internal Server Error';
    errorResponse.timestamp = new Date().toISOString();

    response.status(status).json(errorResponse);
  }
}
