import { Injectable } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtService {
  constructor(private readonly configService: ConfigService) {}

  signAccessToken(payload: string | Buffer | object): string {
    console.log("signing access token with payload:", payload);
    const result =  sign(payload, this.configService.get('jwtSecret') as string, {
      expiresIn: '15m', // Short-lived access token
    });
    console.log("access token:", result);
    return result;
  }

  signRefreshToken(payload: string | Buffer | object): string {
    const result = sign(payload, this.configService.get('jwtRefreshSecret') as string, {
      expiresIn: '7d', // Long-lived refresh token
    });
    console.log("refresh token:", result);
    return result;
  }

  verifyAccessToken(token: string): any {
    return verify(token, this.configService.get('jwtSecret') as string);
  }

  verifyRefreshToken(token: string): any {
    return verify(token, this.configService.get('jwtRefreshSecret') as string);
  }

  // Keep for backwards compatibility
  sign(payload: string | Buffer | object): string {
    return this.signAccessToken(payload);
  }
}
