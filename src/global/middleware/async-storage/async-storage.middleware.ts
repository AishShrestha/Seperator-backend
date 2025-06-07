// assign a unique trace ID to each incoming request and store it in an AsyncLocalStorage context for the duration of the request's lifecycle.

import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ASYNC_STORAGE } from '../../constants';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class AsyncStorageMiddleware implements NestMiddleware {
  constructor(
    @Inject(ASYNC_STORAGE)
    private readonly asyncStorage: AsyncLocalStorage<Map<string, string>>,
  ) {}

  use(req: any, res: any, next: () => void) {
    const traceId = req.headers['x-request-id'] || randomUUID();
    const store = new Map().set('traceId', traceId);
    this.asyncStorage.run(store, () => {
      next();
    });
  }
}
