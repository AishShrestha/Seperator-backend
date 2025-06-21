import { HttpException, HttpStatus } from '@nestjs/common';

export class UserNotVerifiedException extends HttpException {
  constructor(userId: string) {
    super(`User ${userId} is not verified`, HttpStatus.FORBIDDEN);
  }
}
