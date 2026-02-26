import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { hash, compare } from 'bcryptjs';

@Injectable()
export class PasswordService {
  async generate(rawPassword: string) {
    return await hash(rawPassword, 10);
  }

  async compare(requestPassword: string, hash: string): Promise<boolean> {
    return await compare(requestPassword, hash);
  }

  /**
   * Hash a reset token for secure storage (one-way, not for comparison with plain text later).
   * Used to store password reset tokens in the database.
   */
  hashResetToken(plainToken: string): string {
    return createHash('sha256').update(plainToken).digest('hex');
  }
}
