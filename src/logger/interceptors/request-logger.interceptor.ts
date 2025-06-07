import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggerInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const { method, url, query, body, ip } = request;

    const userAgent = request.headers['user-agent'] || 'Unknown';

    this.logger.log(
      `[REQUEST] ${method} ${url} - IP: ${ip}, User-Agent: ${userAgent}\nQuery: ${JSON.stringify(
        query,
      )}\nBody: ${JSON.stringify(body)}`,
    );

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        this.logger.log(`[RESPONSE] ${method} ${url} - ${duration}ms`);
      }),
    );
  }
}
