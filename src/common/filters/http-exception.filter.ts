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
    const res = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const { message, errors } = this.getExceptionMessageAndErrors(exception);

    this.logger.error(`Status: ${status} - Message: ${message}`, exception.stack);

    const errorResponse = new ErrorResponseDto();
    errorResponse.statusCode = status;
    errorResponse.message = message || 'Internal Server Error';
    errorResponse.timestamp = new Date().toISOString();
    if (errors?.length) {
      errorResponse.errors = errors;
    }

    res.status(status).json(errorResponse);
  }

  /**
   * Extracts the specific error message from the exception.
   * NestJS uses exception.message for the exception name (e.g. "Bad Request Exception");
   * the actual message is in getResponse().
   */
  private getExceptionMessageAndErrors(
    exception: HttpException,
  ): { message: string; errors?: string[] } {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return { message: response };
    }
    if (Array.isArray(response)) {
      const messages = response.map((m) => (typeof m === 'string' ? m : String(m)));
      return { message: messages.join('; '), errors: messages };
    }

    const body = response as { message?: string | string[] };
    if (body.message === undefined || body.message === null) {
      return { message: exception.message };
    }
    if (Array.isArray(body.message)) {
      return {
        message: body.message.join('; '),
        errors: body.message,
      };
    }
    return { message: body.message };
  }
}
