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
export class CustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CustomExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const { message, errors } = this.getMessageAndErrors(exception);
    const messageText = message || 'An error occurred';

    this.logger.error(`Status: ${status} - Message: ${messageText}`, exception.stack);

    const errorResponse = new ErrorResponseDto();
    errorResponse.statusCode = status;
    errorResponse.message = messageText;
    errorResponse.timestamp = new Date().toISOString();
    if (errors?.length) {
      errorResponse.errors = errors;
    }

    response.status(status).json(errorResponse);
  }

  private getMessageAndErrors(
    exception: HttpException,
  ): { message: string; errors?: string[] } {
    const res = exception.getResponse();
    if (typeof res === 'string') return { message: res };
    if (Array.isArray(res)) {
      const messages = res.map((m) => (typeof m === 'string' ? m : String(m)));
      return { message: messages.join('; '), errors: messages };
    }
    const body = res as { message?: string | string[] };
    if (body.message == null) return { message: exception.message };
    if (Array.isArray(body.message)) {
      return { message: body.message.join('; '), errors: body.message };
    }
    return { message: body.message };
  }
}
