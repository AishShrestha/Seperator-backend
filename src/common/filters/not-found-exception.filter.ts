import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';

@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    // console.log('Filter triggered!');
    const response = host.switchToHttp().getResponse<Response>();
    const errorResponse = new ErrorResponseDto();
    errorResponse.statusCode = 404;
    errorResponse.message = exception.message || 'Not Found';
    errorResponse.timestamp = new Date().toISOString();

    response.status(404).json(errorResponse);
  }
}
