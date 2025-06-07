import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { pino, Logger, LoggerOptions } from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { ASYNC_STORAGE } from 'src/global/constants';
import { ConfigService } from '@nestjs/config';
import { AppEnv } from 'src/services/app-config/configTypes';

@Injectable()
export class AppLoggerService implements LoggerService {
  private logger: Logger;

  constructor(
    @Inject(ASYNC_STORAGE)
    private readonly asyncStorage: AsyncLocalStorage<Map<string, string>>,
    private readonly configService: ConfigService,
  ) {
    const logLevel = configService.get<string>('logLevel') ?? 'info';
    const appEnv = configService.get<AppEnv>('appEnv');

    const loggerConfig: LoggerOptions = {
      level: logLevel,
      ...(appEnv === AppEnv.DEV && {
        transport: {
          target: 'pino-pretty',
        },
      }),
    };

    this.logger = pino(loggerConfig);
  }

  log(message: any, context?: string): void {
    this.writeLog('info', message, context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.writeLog('error', message, context);
    if (trace) {
      this.logger.error({ traceId: this.getTraceId() }, trace);
    }
  }

  warn(message: any, context?: string): void {
    this.writeLog('warn', message, context);
  }

  // --- Private Helper Methods ---

  private writeLog(
    level: 'info' | 'error' | 'warn' | 'debug',
    message: any,
    context?: string,
  ) {
    const traceId = this.getTraceId();
    const formattedMessage = this.formatMessage(message, context);
    this.logger[level]({ traceId }, formattedMessage);
  }

  private getTraceId(): string | undefined {
    return this.asyncStorage.getStore()?.get('traceId');
  }

  private formatMessage(message: any, context?: string): string {
    return context ? `[${context}] ${message}` : String(message);
  }
}
