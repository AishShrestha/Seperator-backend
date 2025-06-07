import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';
import { ErrorResponseDto } from '../dto/error-response.dto';

@Catch()
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    if (exception instanceof ValidationError) {
      console.log('Filter triggered!');

      const response = host.switchToHttp().getResponse<Response>();
      const errorResponse = new ErrorResponseDto();
      errorResponse.statusCode = 400;
      errorResponse.message = 'Validation failed';
      errorResponse.timestamp = new Date().toISOString();
      // console.log(`Filter triggered: ${errorResponse.statusCode} - ${errorResponse.message}`);

      response.status(400).json(errorResponse);
    }
  }
}
